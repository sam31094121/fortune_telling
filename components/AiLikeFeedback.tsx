'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const INITIAL_COUNT = 630_628;
const DEVICE_ID_KEY = 'taiji_ai_like_device_id_v1';
const LIKED_KEY = 'taiji_ai_like_done_v1';
const HIGHEST_COUNT_KEY = 'taiji_ai_like_highest_count_v1';
const NOTICE_DURATION_MS = 5200;

const COPY = {
  alreadyLiked: '\u518d\u6b21\u8a8d\u540c',
  submitting: '\u9001\u51fa\u4e2d',
  likeAction: '\u6211\u8a8d\u540c',
  countPrefix: '\u5df2\u6709',
  countSuffix: '\u4eba\u8a8d\u540c\u672c\u7cfb\u7d71',
  sendFailed: '\u9001\u51fa\u5931\u6557\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002',
  alreadyNoticeTitle: '\u5df2\u6536\u5230\u4f60\u7684\u652f\u6301',
  thankNoticeTitle: '\u611f\u8b1d\u4f60\u7684\u8a8d\u540c',
  alreadyNoticeBody: '\u9019\u53f0\u88dd\u7f6e\u5df2\u5b8c\u6210\u8a8d\u540c\uff0c\u7e3d\u6578\u6703\u6301\u7e8c\u4fdd\u7559\u4e26\u6c38\u4e45\u7d2f\u7a4d\u3002',
  thankNoticeBody: '\u4f60\u7684\u652f\u6301\u5df2\u7d2f\u8a08\u9032\u7cfb\u7d71\uff0c\u6211\u5011\u6703\u6301\u7e8c\u628a\u9ad4\u9a57\u505a\u5f97\u66f4\u7a69\u3001\u66f4\u6e96\u3002',
  errorTitle: '\u66ab\u6642\u7121\u6cd5\u9001\u51fa',
  errorBody: '\u8acb\u7a0d\u5f8c\u518d\u8a66\u4e00\u6b21\uff0c\u4f60\u7684\u64cd\u4f5c\u5c1a\u672a\u88ab\u8a18\u9304\u3002',
} as const;

type LikeResponse = {
  ok?: boolean;
  totalCount?: number;
  didLike?: boolean;
  alreadyLiked?: boolean;
  message?: string;
};

type FeedbackNotice = {
  title: string;
  body: string;
  tone: 'success' | 'error';
};

function createDeviceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function getDeviceId() {
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
  } catch {
    // LINE in-app browser private modes can block storage reads.
  }

  const next = createDeviceId();
  try {
    window.localStorage.setItem(DEVICE_ID_KEY, next);
  } catch {
    // The API can still record the temporary device id for this request.
  }
  return next;
}

function readStoredLiked() {
  try {
    return window.localStorage.getItem(LIKED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStoredLiked() {
  try {
    window.localStorage.setItem(LIKED_KEY, '1');
  } catch {
    // The shared counter is protected by the API even when storage is blocked.
  }
}

function normalizeTotalCount(value: unknown) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= INITIAL_COUNT ? count : INITIAL_COUNT;
}

function readStoredHighestCount() {
  if (typeof window === 'undefined') return INITIAL_COUNT;

  try {
    return normalizeTotalCount(window.localStorage.getItem(HIGHEST_COUNT_KEY));
  } catch {
    return INITIAL_COUNT;
  }
}

function writeStoredHighestCount(count: number) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(HIGHEST_COUNT_KEY, String(normalizeTotalCount(count)));
  } catch {
    // LINE in-app browser private modes can block storage; the API still protects the shared count.
  }
}

export default function AiLikeFeedback({ className = '' }: { className?: string }) {
  const [totalCount, setTotalCount] = useState(INITIAL_COUNT);
  const [liked, setLiked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countPulse, setCountPulse] = useState(0);
  const [notice, setNotice] = useState<FeedbackNotice | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const countPulseTimerRef = useRef<number | null>(null);

  const formattedCount = useMemo(() => totalCount.toLocaleString('zh-TW'), [totalCount]);

  const commitTotalCount = useCallback((nextCount: unknown) => {
    setTotalCount((currentCount) => {
      const permanentCount = Math.max(currentCount, readStoredHighestCount(), normalizeTotalCount(nextCount));
      writeStoredHighestCount(permanentCount);
      return permanentCount;
    });
  }, []);

  const flashCountIncrease = useCallback(() => {
    setTotalCount((currentCount) => {
      const nextCount = Math.max(currentCount, readStoredHighestCount(), INITIAL_COUNT) + 1;
      writeStoredHighestCount(nextCount);
      return nextCount;
    });

    setCountPulse((currentPulse) => currentPulse + 1);
    if (countPulseTimerRef.current !== null) {
      window.clearTimeout(countPulseTimerRef.current);
    }
    countPulseTimerRef.current = window.setTimeout(() => {
      setCountPulse(0);
      countPulseTimerRef.current = null;
    }, 900);
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

  useEffect(() => {
    commitTotalCount(readStoredHighestCount());
  }, [commitTotalCount]);

  useEffect(() => {
    let active = true;

    setLiked(readStoredLiked());

    fetch('/api/ai-like', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: LikeResponse) => {
        if (!active) return;
        if (data?.ok && typeof data.totalCount === 'number') {
          commitTotalCount(data.totalCount);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [commitTotalCount]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
      if (countPulseTimerRef.current !== null) {
        window.clearTimeout(countPulseTimerRef.current);
      }
    };
  }, []);

  async function handleLike() {
    if (submitting) return;

    setSubmitting(true);
    setNotice(null);
    flashCountIncrease();

    try {
      const response = await fetch('/api/ai-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      const data = await response.json() as LikeResponse;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || COPY.sendFailed);
      }

      if (typeof data.totalCount === 'number') {
        commitTotalCount(data.totalCount);
      }

      setLiked(true);
      writeStoredLiked();
      showNotice({
        title: data.alreadyLiked ? COPY.alreadyNoticeTitle : COPY.thankNoticeTitle,
        body: data.alreadyLiked ? COPY.alreadyNoticeBody : COPY.thankNoticeBody,
        tone: 'success',
      });
    } catch (error) {
      showNotice({
        title: COPY.errorTitle,
        body: error instanceof Error ? error.message : COPY.errorBody,
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={className}>
      <button
        type="button"
        onClick={handleLike}
        disabled={submitting}
        className="top-feedback-action mx-auto inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[10px] font-black leading-none text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-300/18 disabled:cursor-default disabled:border-emerald-300/25 disabled:bg-emerald-300/10 disabled:text-emerald-100 sm:px-3 sm:py-1.5 sm:text-xs"
      >
        {liked ? COPY.alreadyLiked : submitting ? COPY.submitting : COPY.likeAction}
      </button>

      <p className="mt-1.5 text-[9px] font-semibold leading-tight text-[color:var(--text-sub)] sm:text-[10px]">{COPY.countPrefix}</p>
      <p className={`top-feedback-count relative font-serif text-2xl font-black leading-none tracking-[0.04em] text-amber-100 drop-shadow-[0_0_14px_rgba(251,191,36,0.35)] ${countPulse > 0 ? 'top-feedback-count--bump' : ''}`}>
        {formattedCount}
        {countPulse > 0 && <span key={countPulse} className="top-feedback-delta top-feedback-delta--amber">+1</span>}
      </p>
      <p className="mt-1 text-[9px] font-medium leading-tight text-[color:var(--text-sub)] sm:text-[10px]">{COPY.countSuffix}</p>

      {notice && (
        <div
          className={`fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 mx-auto max-w-[340px] rounded-xl border px-4 py-3 text-left text-xs leading-5 shadow-[0_16px_44px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:right-4 sm:left-auto sm:mx-0 ${
            notice.tone === 'success'
              ? 'border-emerald-300/30 bg-slate-950/95 text-emerald-50'
              : 'border-amber-300/35 bg-slate-950/95 text-amber-50'
          }`}
          role="status"
          aria-live="polite"
        >
          <p className={notice.tone === 'success' ? 'font-bold text-emerald-100' : 'font-bold text-amber-100'}>
            {notice.title}
          </p>
          <p className="mt-1 text-white/82">{notice.body}</p>
        </div>
      )}
    </section>
  );
}