'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LIKE_INITIAL_COUNT = 630_628;
const SUGGESTION_INITIAL_COUNT = 168;
const DEVICE_ID_KEY = 'taiji_ai_feedback_device_id_v1';
const LEGACY_LIKE_DEVICE_ID_KEY = 'taiji_ai_like_device_id_v1';
const LEGACY_SUGGESTION_DEVICE_ID_KEY = 'taiji_ai_suggestion_device_id_v1';
const CHOICE_KEY = 'taiji_ai_feedback_choice_v1';
const LIKE_HIGHEST_COUNT_KEY = 'taiji_ai_like_highest_count_v1';
const SUGGESTION_HIGHEST_COUNT_KEY = 'taiji_ai_suggestion_highest_count_v1';
const NOTICE_DURATION_MS = 5200;

const COPY = {
  title: '\u0041\u0049 \u56de\u994b\u6821\u6e96',
  subtitle: '\u6bcf\u53f0\u624b\u6a5f\u4fdd\u7559\u4e00\u6b21\u6b63\u5f0f\u56de\u994b',
  likeLabel: '\u6211\u8a8d\u540c',
  improveLabel: '\u5e0c\u671b\u6539\u5584',
  likeStatLabel: '\u8a8d\u540c',
  improveStatLabel: '\u6539\u5584\u5efa\u8b70',
  likeUnit: '\u4eba',
  improveUnit: '\u5247',
  submitting: '\u9001\u51fa\u4e2d',
  selectedLike: '\u56de\u994b\u5df2\u5b8c\u6210',
  selectedImprove: '\u56de\u994b\u5df2\u5b8c\u6210',
  thankLikeTitle: '\u611f\u8b1d\u4f60\u7684\u8a8d\u540c',
  thankLikeBody: '\u4f60\u7684\u652f\u6301\u5df2\u7d2f\u8a08\u9032\u7cfb\u7d71\uff0c\u6211\u5011\u6703\u7e7c\u7e8c\u628a\u9ad4\u9a57\u505a\u5f97\u66f4\u7a69\u3001\u66f4\u6e96\u3002',
  thankImproveTitle: '\u8b1d\u8b1d\u4f60\u9858\u610f\u63d0\u9192\u6211\u5011',
  thankImproveBody: '\u4f60\u7684\u56de\u994b\u5df2\u9032\u5165\u6539\u5584\u6e05\u55ae\uff0c\u6211\u5011\u6703\u7528\u5b83\u6821\u6b63\u9ad4\u9a57\u8207\u8aaa\u660e\u3002',
  lockedTitle: '\u672c\u6b21\u56de\u994b\u5df2\u5b8c\u6210',
  lockedBody: '\u70ba\u4e86\u8b93\u6578\u64da\u66f4\u53ef\u4fe1\uff0c\u6bcf\u53f0\u624b\u6a5f\u50c5\u4fdd\u7559\u4e00\u6b21\u6b63\u5f0f\u56de\u994b\u3002',
  errorTitle: '\u66ab\u6642\u7121\u6cd5\u9001\u51fa',
  errorBody: '\u8acb\u7a0d\u5f8c\u518d\u8a66\u4e00\u6b21\uff0c\u9019\u6b21\u56de\u994b\u5c1a\u672a\u8a18\u9304\u6210\u6b63\u5f0f\u6578\u64da\u3002',
  note: '\u4e00\u53f0\u624b\u6a5f\uff0c\u4e00\u6b21\u6e05\u695a\u56de\u994b',
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
};

type FeedbackNotice = {
  title: string;
  body: string;
  tone: 'like' | 'improve' | 'error';
};

function createDeviceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // LINE in-app browser private modes can block storage; API calls still work.
  }
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

function readStoredChoice(): FeedbackChoice | null {
  const choice = readStorage(CHOICE_KEY);
  return choice === 'like' || choice === 'improve' ? choice : null;
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
    setChoice(readStoredChoice());
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

  async function submitChoice(nextChoice: FeedbackChoice) {
    if (submittingChoice) return;

    if (choice) {
      showNotice({
        title: COPY.lockedTitle,
        body: COPY.lockedBody,
        tone: choice === 'like' ? 'like' : 'improve',
      });
      return;
    }

    setSubmittingChoice(nextChoice);
    setNotice(null);

    try {
      const response = await fetch(nextChoice === 'like' ? '/api/ai-like' : '/api/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      const data = await response.json() as CounterResponse;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || COPY.errorBody);
      }

      const accepted = nextChoice === 'like'
        ? data.didLike !== false && data.alreadyLiked !== true
        : data.didSend !== false && data.alreadySent !== true;

      if (typeof data.totalCount === 'number') {
        if (nextChoice === 'like') {
          commitLikeCount(data.totalCount);
        } else {
          commitImproveCount(data.totalCount);
        }
      }

      setChoice(nextChoice);
      writeStorage(CHOICE_KEY, nextChoice);

      if (accepted) {
        pulseAcceptedCount(nextChoice);
      }

      showNotice({
        title: accepted
          ? (nextChoice === 'like' ? COPY.thankLikeTitle : COPY.thankImproveTitle)
          : COPY.lockedTitle,
        body: accepted
          ? (nextChoice === 'like' ? COPY.thankLikeBody : COPY.thankImproveBody)
          : COPY.lockedBody,
        tone: nextChoice,
      });
    } catch (error) {
      setChoice(null);
      writeStorage(CHOICE_KEY, '');
      if (nextChoice === 'like') {
        commitLikeCount(readStoredHighestCount(LIKE_HIGHEST_COUNT_KEY, LIKE_INITIAL_COUNT));
      } else {
        commitImproveCount(readStoredHighestCount(SUGGESTION_HIGHEST_COUNT_KEY, SUGGESTION_INITIAL_COUNT));
      }
      showNotice({
        title: COPY.errorTitle,
        body: error instanceof Error ? error.message : COPY.errorBody,
        tone: 'error',
      });
    } finally {
      setSubmittingChoice(null);
    }
  }

  const likeSelected = choice === 'like';
  const improveSelected = choice === 'improve';
  const isSubmittingLike = submittingChoice === 'like';
  const isSubmittingImprove = submittingChoice === 'improve';
  const feedbackLocked = Boolean(choice);

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
          disabled={Boolean(submittingChoice) || feedbackLocked}
          className={`home-ai-feedback-action home-ai-feedback-action--like ${likeSelected ? 'home-ai-feedback-action--selected' : ''}`}
        >
          <span aria-hidden="true">{'\u{1F44D}'}</span>
          <span>{isSubmittingLike ? COPY.submitting : COPY.likeLabel}</span>
        </button>

        <button
          type="button"
          onClick={() => submitChoice('improve')}
          disabled={Boolean(submittingChoice) || feedbackLocked}
          className={`home-ai-feedback-action home-ai-feedback-action--improve ${improveSelected ? 'home-ai-feedback-action--selected' : ''}`}
        >
          <span aria-hidden="true">{'\u{1F44E}'}</span>
          <span>{isSubmittingImprove ? COPY.submitting : COPY.improveLabel}</span>
        </button>
      </div>

      <p className="home-ai-feedback-note mt-2 text-[9px] font-semibold leading-none text-[color:var(--text-sub)] opacity-75">{COPY.note}</p>

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


