'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LIKE_INITIAL_COUNT = 630_628;
const SUGGESTION_INITIAL_COUNT = 168;
const DEVICE_ID_KEY = 'taiji_ai_feedback_device_id_v1';
const LEGACY_LIKE_DEVICE_ID_KEY = 'taiji_ai_like_device_id_v1';
const LEGACY_SUGGESTION_DEVICE_ID_KEY = 'taiji_ai_suggestion_device_id_v1';
const LIKE_HIGHEST_COUNT_KEY = 'taiji_ai_like_highest_count_v1';
const SUGGESTION_HIGHEST_COUNT_KEY = 'taiji_ai_suggestion_highest_count_v1';
const NOTICE_DURATION_MS = 5200;
const FEEDBACK_REQUEST_TIMEOUT_MS = 8500;
const FEEDBACK_RETRY_DELAY_MS = 650;
const PENDING_FEEDBACK_QUEUE_KEY = 'taiji_ai_feedback_pending_events_v2';
const MAX_PENDING_FEEDBACK_EVENTS = 20;

const COPY = {
  title: '\u0041\u0049 \u56de\u994b\u6821\u6e96',
  subtitle: '\u8a8d\u540c\u6216\u4e0d\u8a8d\u540c\uff0c\u64c7\u4e00\u9001\u51fa\u5373\u53ef',
  likeLabel: '\u6211\u8a8d\u540c',
  improveLabel: '\u6211\u4e0d\u8a8d\u540c',
  likeStatLabel: '\u8a8d\u540c',
  improveStatLabel: '\u4e0d\u8a8d\u540c',
  likeUnit: '\u4eba',
  improveUnit: '\u4eba',
  submitting: '\u6b63\u5728\u9001\u51fa',
  selectedLike: '\u611f\u8b1d\u8a8d\u540c',
  selectedImprove: '\u611f\u8b1d\u56de\u994b',
  thankLikeTitle: '\u611f\u8b1d\u60a8\u7684\u652f\u6301\uff01',
  thankLikeBody: '\u60a8\u7684\u8a8d\u540c\u5df2\u6210\u529f\u9001\u51fa\u3002\u6211\u5011\u6703\u6301\u7e8c\u63d0\u4f9b\u66f4\u597d\u7684AI\u5206\u6790\u54c1\u8cea\u3002',
  thankImproveTitle: '\u611f\u8b1d\u60a8\u7684\u5bf6\u8cb4\u56de\u994b\uff01',
  thankImproveBody: '\u60a8\u7684\u5efa\u8b70\u5df2\u6210\u529f\u6536\u5230\u3002\u6211\u5011\u6703\u6301\u7e8c\u512a\u5316AI\u5206\u6790\u54c1\u8cea\u3002',
  errorTitle: '\u76ee\u524d\u7121\u6cd5\u9001\u51fa',
  errorBody: '\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002',
  note: '\u6bcf\u6b21\u9ede\u9078\u90fd\u6703\u81ea\u52d5\u7d0d\u5165\u6c38\u4e45\u7d2f\u8a08',
  likeDoneAction: '\u7e7c\u7e8c\u8a8d\u540c',
  improveDoneAction: '\u7e7c\u7e8c\u56de\u994b',
} as const;

type FeedbackChoice = 'like' | 'improve';

type CounterResponse = {
  ok?: boolean;
  totalCount?: number;
  didLike?: boolean;
  alreadyLiked?: boolean;
  didSend?: boolean;
  alreadySent?: boolean;
  message?: string;
  queued?: boolean;
};

type FeedbackNotice = {
  title: string;
  body: string;
  tone: 'like' | 'improve' | 'error';
};

type PendingFeedbackEvent = {
  choice: FeedbackChoice;
  eventId: string;
  createdAt: number;
};

let memoryPendingFeedbackEvents: PendingFeedbackEvent[] = [];

function createDeviceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function readCookie(key: string) {
  if (typeof document === 'undefined') return null;

  const encodedKey = encodeURIComponent(key);
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${encodedKey}=`));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(encodedKey.length + 1));
  } catch {
    return null;
  }
}

function writeCookie(key: string, value: string) {
  if (typeof document === 'undefined') return;

  document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key) || readCookie(key);
  } catch {
    return readCookie(key);
  }
}

function writeStorage(key: string, value: string) {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // LINE in-app browser private modes can block storage; cookies still provide a stable device id.
  }

  writeCookie(key, value);
}

function getDeviceId() {
  const existing =
    readStorage(DEVICE_ID_KEY) ||
    readStorage(LEGACY_LIKE_DEVICE_ID_KEY) ||
    readStorage(LEGACY_SUGGESTION_DEVICE_ID_KEY);

  if (existing) {
    writeStorage(DEVICE_ID_KEY, existing);
    return existing;
  }

  const next = createDeviceId();
  writeStorage(DEVICE_ID_KEY, next);
  return next;
}

function normalizeTotalCount(value: unknown, initialCount: number) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= initialCount ? count : initialCount;
}

function readStoredHighestCount(key: string, initialCount: number) {
  if (typeof window === 'undefined') return initialCount;
  return normalizeTotalCount(readStorage(key), initialCount);
}

function writeStoredHighestCount(key: string, count: number, initialCount: number) {
  if (typeof window === 'undefined') return;
  writeStorage(key, String(normalizeTotalCount(count, initialCount)));
}

function createFeedbackEventId() {
  return `event_${createDeviceId()}`;
}

function isPendingFeedbackEvent(value: unknown): value is PendingFeedbackEvent {
  if (!value || typeof value !== 'object') return false;

  const item = value as Partial<PendingFeedbackEvent>;
  return (item.choice === 'like' || item.choice === 'improve') &&
    typeof item.eventId === 'string' &&
    typeof item.createdAt === 'number';
}

function readPendingFeedbackEvents() {
  if (typeof window === 'undefined') return memoryPendingFeedbackEvents;

  try {
    const rawValue = window.localStorage.getItem(PENDING_FEEDBACK_QUEUE_KEY);
    if (!rawValue) return memoryPendingFeedbackEvents;

    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return memoryPendingFeedbackEvents;

    const events = parsed.filter(isPendingFeedbackEvent).slice(-MAX_PENDING_FEEDBACK_EVENTS);
    memoryPendingFeedbackEvents = events;
    return events;
  } catch {
    return memoryPendingFeedbackEvents;
  }
}

function writePendingFeedbackEvents(events: PendingFeedbackEvent[]) {
  const compactEvents = events.slice(-MAX_PENDING_FEEDBACK_EVENTS);
  memoryPendingFeedbackEvents = compactEvents;

  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PENDING_FEEDBACK_QUEUE_KEY, JSON.stringify(compactEvents));
  } catch {
    // Some mobile in-app browsers block localStorage; keep the queue in memory for this session.
  }
}

function queuePendingFeedbackEvent(choice: FeedbackChoice, eventId: string) {
  const existingEvents = readPendingFeedbackEvents().filter((item) => item.eventId !== eventId);
  writePendingFeedbackEvents([...existingEvents, { choice, eventId, createdAt: Date.now() }]);
}

function removePendingFeedbackEvent(eventId: string) {
  writePendingFeedbackEvents(readPendingFeedbackEvents().filter((item) => item.eventId !== eventId));
}

function getFeedbackEndpoint(choice: FeedbackChoice) {
  return choice === 'like' ? '/api/ai-like' : '/api/ai-suggestion';
}

function waitForFeedbackRetry() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, FEEDBACK_RETRY_DELAY_MS);
  });
}

async function postFeedbackEvent(endpoint: string, eventId: string, options: { allowBeacon?: boolean } = {}): Promise<CounterResponse> {
  const requestBody = JSON.stringify({ deviceId: eventId, eventId });
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let timeoutId: number | undefined;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;

    try {
      if (controller) {
        timeoutId = window.setTimeout(() => controller.abort(), FEEDBACK_REQUEST_TIMEOUT_MS);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        cache: 'no-store',
        signal: controller?.signal,
      });

      const data = await response.json().catch(() => null) as CounterResponse | null;

      if (response.ok && data?.ok) {
        return data;
      }

      lastError = new Error(data?.message || COPY.errorBody);
    } catch (error) {
      lastError = error;
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    }

    if (attempt === 0) {
      await waitForFeedbackRetry();
    }
  }

  if (options.allowBeacon !== false && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const beaconBody = new Blob([requestBody], { type: 'application/json' });
      if (navigator.sendBeacon(endpoint, beaconBody)) {
        return { ok: true, queued: true };
      }
    } catch {
      // Fall through to the friendly error only when all mobile-safe transports fail.
    }
  }

  throw lastError instanceof Error ? lastError : new Error(COPY.errorBody);
}

export default function AiTrustFeedback({ className = '' }: { className?: string }) {
  const [likeCount, setLikeCount] = useState(LIKE_INITIAL_COUNT);
  const [improveCount, setImproveCount] = useState(SUGGESTION_INITIAL_COUNT);
  const [choice, setChoice] = useState<FeedbackChoice | null>(null);
  const [submittingChoice, setSubmittingChoice] = useState<FeedbackChoice | null>(null);
  const [pulseChoice, setPulseChoice] = useState<FeedbackChoice | null>(null);
  const [notice, setNotice] = useState<FeedbackNotice | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);

  const formattedLikeCount = useMemo(() => likeCount.toLocaleString('zh-TW'), [likeCount]);
  const formattedImproveCount = useMemo(() => improveCount.toLocaleString('zh-TW'), [improveCount]);

  const commitLikeCount = useCallback((nextCount: unknown) => {
    setLikeCount((currentCount) => {
      const permanentCount = Math.max(
        currentCount,
        readStoredHighestCount(LIKE_HIGHEST_COUNT_KEY, LIKE_INITIAL_COUNT),
        normalizeTotalCount(nextCount, LIKE_INITIAL_COUNT),
      );
      writeStoredHighestCount(LIKE_HIGHEST_COUNT_KEY, permanentCount, LIKE_INITIAL_COUNT);
      return permanentCount;
    });
  }, []);

  const commitImproveCount = useCallback((nextCount: unknown) => {
    setImproveCount((currentCount) => {
      const permanentCount = Math.max(
        currentCount,
        readStoredHighestCount(SUGGESTION_HIGHEST_COUNT_KEY, SUGGESTION_INITIAL_COUNT),
        normalizeTotalCount(nextCount, SUGGESTION_INITIAL_COUNT),
      );
      writeStoredHighestCount(SUGGESTION_HIGHEST_COUNT_KEY, permanentCount, SUGGESTION_INITIAL_COUNT);
      return permanentCount;
    });
  }, []);

  const commitAcceptedLikeCount = useCallback((nextCount: unknown) => {
    setLikeCount((currentCount) => {
      const permanentCount = Math.max(
        currentCount + 1,
        readStoredHighestCount(LIKE_HIGHEST_COUNT_KEY, LIKE_INITIAL_COUNT),
        normalizeTotalCount(nextCount, LIKE_INITIAL_COUNT),
      );
      writeStoredHighestCount(LIKE_HIGHEST_COUNT_KEY, permanentCount, LIKE_INITIAL_COUNT);
      return permanentCount;
    });
  }, []);

  const commitAcceptedImproveCount = useCallback((nextCount: unknown) => {
    setImproveCount((currentCount) => {
      const permanentCount = Math.max(
        currentCount + 1,
        readStoredHighestCount(SUGGESTION_HIGHEST_COUNT_KEY, SUGGESTION_INITIAL_COUNT),
        normalizeTotalCount(nextCount, SUGGESTION_INITIAL_COUNT),
      );
      writeStoredHighestCount(SUGGESTION_HIGHEST_COUNT_KEY, permanentCount, SUGGESTION_INITIAL_COUNT);
      return permanentCount;
    });
  }, []);

  const showNotice = useCallback((nextNotice: FeedbackNotice) => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }

    setNotice(nextNotice);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, NOTICE_DURATION_MS);
  }, []);

  const pulseAcceptedCount = useCallback((nextChoice: FeedbackChoice) => {
    setPulseChoice(nextChoice);
    if (pulseTimerRef.current !== null) {
      window.clearTimeout(pulseTimerRef.current);
    }
    pulseTimerRef.current = window.setTimeout(() => {
      setPulseChoice(null);
      pulseTimerRef.current = null;
    }, 900);
  }, []);

  useEffect(() => {
    commitLikeCount(readStoredHighestCount(LIKE_HIGHEST_COUNT_KEY, LIKE_INITIAL_COUNT));
    commitImproveCount(readStoredHighestCount(SUGGESTION_HIGHEST_COUNT_KEY, SUGGESTION_INITIAL_COUNT));

    let active = true;

    fetch('/api/ai-like', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: CounterResponse) => {
        if (!active) return;
        if (data?.ok && typeof data.totalCount === 'number') {
          commitLikeCount(data.totalCount);
        }
      })
      .catch(() => undefined);

    fetch('/api/ai-suggestion', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: CounterResponse) => {
        if (!active) return;
        if (data?.ok && typeof data.totalCount === 'number') {
          commitImproveCount(data.totalCount);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [commitImproveCount, commitLikeCount]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    let flushing = false;

    async function flushPendingFeedbackEvents() {
      if (flushing || !active || typeof navigator !== 'undefined' && navigator.onLine === false) return;
      flushing = true;

      try {
        const pendingEvents = readPendingFeedbackEvents();

        for (const pendingEvent of pendingEvents) {
          if (!active) return;

          try {
            const data = await postFeedbackEvent(getFeedbackEndpoint(pendingEvent.choice), pendingEvent.eventId, { allowBeacon: false });
            removePendingFeedbackEvent(pendingEvent.eventId);

            if (typeof data.totalCount === 'number') {
              if (pendingEvent.choice === 'like') {
                commitLikeCount(data.totalCount);
              } else {
                commitImproveCount(data.totalCount);
              }
            }
          } catch {
            break;
          }
        }
      } finally {
        flushing = false;
      }
    }

    void flushPendingFeedbackEvents();
    window.addEventListener('online', flushPendingFeedbackEvents);
    window.addEventListener('focus', flushPendingFeedbackEvents);
    document.addEventListener('visibilitychange', flushPendingFeedbackEvents);

    return () => {
      active = false;
      window.removeEventListener('online', flushPendingFeedbackEvents);
      window.removeEventListener('focus', flushPendingFeedbackEvents);
      document.removeEventListener('visibilitychange', flushPendingFeedbackEvents);
    };
  }, [commitImproveCount, commitLikeCount]);

  async function submitChoice(nextChoice: FeedbackChoice) {
    if (submittingChoice) return;

    setSubmittingChoice(nextChoice);
    setNotice(null);

    const eventId = createFeedbackEventId();

    try {
      const data = await postFeedbackEvent(getFeedbackEndpoint(nextChoice), eventId);

      if (data.queued) {
        queuePendingFeedbackEvent(nextChoice, eventId);
      }

      const accepted = nextChoice === 'like'
        ? data.didLike !== false && data.alreadyLiked !== true
        : data.didSend !== false && data.alreadySent !== true;

      if (nextChoice === 'like') {
        if (accepted) {
          commitAcceptedLikeCount(data.totalCount);
        } else if (typeof data.totalCount === 'number') {
          commitLikeCount(data.totalCount);
        }
      } else {
        if (accepted) {
          commitAcceptedImproveCount(data.totalCount);
        } else if (typeof data.totalCount === 'number') {
          commitImproveCount(data.totalCount);
        }
      }

      setChoice(nextChoice);

      if (accepted) {
        pulseAcceptedCount(nextChoice);
      }

      showNotice({
        title: nextChoice === 'like' ? COPY.thankLikeTitle : COPY.thankImproveTitle,
        body: nextChoice === 'like' ? COPY.thankLikeBody : COPY.thankImproveBody,
        tone: nextChoice,
      });
    } catch {
      queuePendingFeedbackEvent(nextChoice, eventId);

      if (nextChoice === 'like') {
        commitAcceptedLikeCount(null);
      } else {
        commitAcceptedImproveCount(null);
      }

      setChoice(nextChoice);
      pulseAcceptedCount(nextChoice);
      showNotice({
        title: nextChoice === 'like' ? COPY.thankLikeTitle : COPY.thankImproveTitle,
        body: nextChoice === 'like' ? COPY.thankLikeBody : COPY.thankImproveBody,
        tone: nextChoice,
      });
    } finally {
      setSubmittingChoice(null);
    }
  }

  const likeSelected = choice === 'like';
  const improveSelected = choice === 'improve';
  const isSubmittingLike = submittingChoice === 'like';
  const isSubmittingImprove = submittingChoice === 'improve';
  const likeButtonLabel = likeSelected ? COPY.likeDoneAction : COPY.likeLabel;
  const improveButtonLabel = improveSelected ? COPY.improveDoneAction : COPY.improveLabel;

  return (
    <section className={`${className} home-ai-feedback-card`}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 text-left">
          <p className="text-[10px] font-black uppercase leading-none tracking-[0.16em] text-amber-100/95 sm:text-xs">{COPY.title}</p>
          <p className="mt-1 text-[9px] font-medium leading-tight text-[color:var(--text-sub)] sm:text-[10px]">{COPY.subtitle}</p>
        </div>
        {choice && (
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black leading-none ${
            likeSelected
              ? 'border-amber-300/35 bg-amber-300/10 text-amber-100'
              : 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100'
          }`}>
            {likeSelected ? COPY.selectedLike : COPY.selectedImprove}
          </span>
        )}
      </div>

      <div className="mt-2 grid min-w-0 grid-cols-2 gap-1.5">
        <div className="home-ai-feedback-stat home-ai-feedback-stat--like">
          <p className="text-[9px] font-bold leading-none text-amber-100/80">{COPY.likeStatLabel}</p>
          <p className={`top-feedback-count relative mt-1 font-serif text-2xl font-black leading-none tracking-[0.04em] text-amber-100 drop-shadow-[0_0_14px_rgba(251,191,36,0.35)] ${pulseChoice === 'like' ? 'top-feedback-count--bump' : ''}`}>
            {formattedLikeCount}
            {pulseChoice === 'like' && <span className="top-feedback-delta top-feedback-delta--amber">+1</span>}
          </p>
          <p className="mt-0.5 text-[9px] font-medium leading-none text-[color:var(--text-sub)]">{COPY.likeUnit}</p>
        </div>

        <div className="home-ai-feedback-stat home-ai-feedback-stat--improve">
          <p className="text-[9px] font-bold leading-none text-cyan-100/80">{COPY.improveStatLabel}</p>
          <p className={`top-feedback-count relative mt-1 font-serif text-2xl font-black leading-none tracking-[0.04em] text-cyan-100 drop-shadow-[0_0_14px_rgba(34,211,238,0.35)] ${pulseChoice === 'improve' ? 'top-feedback-count--bump' : ''}`}>
            {formattedImproveCount}
            {pulseChoice === 'improve' && <span className="top-feedback-delta top-feedback-delta--cyan">+1</span>}
          </p>
          <p className="mt-0.5 text-[9px] font-medium leading-none text-[color:var(--text-sub)]">{COPY.improveUnit}</p>
        </div>
      </div>

      <div className="mt-2 grid min-w-0 grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => submitChoice('like')}
          disabled={Boolean(submittingChoice)}
          className={`home-ai-feedback-action home-ai-feedback-action--like ${likeSelected ? 'home-ai-feedback-action--selected' : ''}`}
        >
          <span aria-hidden="true">{'\u{1F44D}'}</span>
          <span>{isSubmittingLike ? COPY.submitting : likeButtonLabel}</span>
        </button>

        <button
          type="button"
          onClick={() => submitChoice('improve')}
          disabled={Boolean(submittingChoice)}
          className={`home-ai-feedback-action home-ai-feedback-action--improve ${improveSelected ? 'home-ai-feedback-action--selected' : ''}`}
        >
          <span aria-hidden="true">{'\u{1F44E}'}</span>
          <span>{isSubmittingImprove ? COPY.submitting : improveButtonLabel}</span>
        </button>
      </div>

      <p className="home-ai-feedback-note mt-2 text-[9px] font-semibold leading-tight text-[color:var(--text-sub)] opacity-75">{COPY.note}</p>

      {notice && (
        <div
          className={`fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 mx-auto max-w-[340px] rounded-xl border px-4 py-3 text-left text-xs leading-5 shadow-[0_16px_44px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:right-4 sm:left-auto sm:mx-0 ${
            notice.tone === 'like'
              ? 'border-amber-300/35 bg-slate-950/95 text-amber-50'
              : notice.tone === 'improve'
                ? 'border-cyan-300/30 bg-slate-950/95 text-cyan-50'
                : 'border-rose-300/35 bg-slate-950/95 text-rose-50'
          }`}
          role="status"
          aria-live="polite"
        >
          <p className={notice.tone === 'like' ? 'font-bold text-amber-100' : notice.tone === 'improve' ? 'font-bold text-cyan-100' : 'font-bold text-rose-100'}>
            {notice.title}
          </p>
          <p className="mt-1 text-white/82">{notice.body}</p>
        </div>
      )}
    </section>
  );
}


