'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const INITIAL_COUNT = 168;
const DEVICE_ID_KEY = 'taiji_ai_suggestion_device_id_v1';
const SENT_KEY = 'taiji_ai_suggestion_done_v1';
const HIGHEST_COUNT_KEY = 'taiji_ai_suggestion_highest_count_v1';
const NOTICE_DURATION_MS = 5600;

const COPY = {
  alreadySent: '\u5df2\u6536\u5230',
  submitting: '\u9001\u51fa\u4e2d',
  disagreeAction: '\u4e0d\u540c\u610f',
  countPrefix: '\u5df2\u6536\u5230',
  countSuffix: '\u5247\u6539\u5584\u5efa\u8b70',
  sendFailed: '\u9001\u51fa\u5931\u6557\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002',
  alreadyNoticeTitle: '\u5df2\u6536\u5230\u4f60\u7684\u63d0\u9192',
  thankNoticeTitle: '\u8b1d\u8b1d\u4f60\u9858\u610f\u63d0\u9192\u6211\u5011',
  alreadyNoticeBody: '\u9019\u53f0\u88dd\u7f6e\u5df2\u9001\u51fa\u904e\u4e00\u6b21\uff0c\u6211\u5011\u6703\u628a\u56de\u994b\u4fdd\u7559\u5728\u6539\u5584\u7d00\u9304\u4e2d\u3002',
  thankNoticeBody: '\u4f60\u7684\u56de\u994b\u5df2\u7d2f\u8a08\u9032\u6539\u5584\u6e05\u55ae\uff0c\u6211\u5011\u6703\u7528\u5b83\u6821\u6b63\u9ad4\u9a57\u8207\u8aaa\u660e\u3002',
  errorTitle: '\u66ab\u6642\u7121\u6cd5\u9001\u51fa',
  errorBody: '\u8acb\u7a0d\u5f8c\u518d\u8a66\u4e00\u6b21\uff0c\u4f60\u7684\u64cd\u4f5c\u5c1a\u672a\u88ab\u8a18\u9304\u3002',
} as const;

type SuggestionResponse = {
  ok?: boolean;
  totalCount?: number;
  didSend?: boolean;
  alreadySent?: boolean;
  message?: string;
};

type FeedbackNotice = {
  title: string;
  body: string;
  tone: 'care' | 'error';
};

function createDeviceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function getDeviceId() {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const next = createDeviceId();
  window.localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
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

export default function AiSuggestionFeedback({ className = '' }: { className?: string }) {
  const [totalCount, setTotalCount] = useState(INITIAL_COUNT);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<FeedbackNotice | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const formattedCount = useMemo(() => totalCount.toLocaleString('zh-TW'), [totalCount]);

  const commitTotalCount = useCallback((nextCount: unknown) => {
    setTotalCount((currentCount) => {
      const permanentCount = Math.max(currentCount, readStoredHighestCount(), normalizeTotalCount(nextCount));
      writeStoredHighestCount(permanentCount);
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

  useEffect(() => {
    commitTotalCount(readStoredHighestCount());
  }, [commitTotalCount]);

  useEffect(() => {
    let active = true;

    setSent(window.localStorage.getItem(SENT_KEY) === '1');

    fetch('/api/ai-suggestion', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: SuggestionResponse) => {
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
    };
  }, []);

  async function handleSend() {
    if (sent || submitting) return;

    setSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch('/api/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      const data = await response.json() as SuggestionResponse;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || COPY.sendFailed);
      }

      if (typeof data.totalCount === 'number') {
        commitTotalCount(data.totalCount);
      }

      setSent(true);
      window.localStorage.setItem(SENT_KEY, '1');
      showNotice({
        title: data.alreadySent ? COPY.alreadyNoticeTitle : COPY.thankNoticeTitle,
        body: data.alreadySent ? COPY.alreadyNoticeBody : COPY.thankNoticeBody,
        tone: 'care',
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
        onClick={handleSend}
        disabled={sent || submitting}
        className="top-feedback-action mx-auto inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[10px] font-black leading-none text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/18 disabled:cursor-default disabled:border-emerald-300/25 disabled:bg-emerald-300/10 disabled:text-emerald-100 sm:px-3 sm:py-1.5 sm:text-xs"
      >
        {sent ? COPY.alreadySent : submitting ? COPY.submitting : COPY.disagreeAction}
      </button>

      <p className="mt-1.5 text-[9px] font-semibold leading-tight text-[color:var(--text-sub)] sm:text-[10px]">{COPY.countPrefix}</p>
      <p className="top-feedback-count font-serif text-2xl font-black leading-none tracking-[0.04em] text-cyan-100 drop-shadow-[0_0_14px_rgba(34,211,238,0.35)]">
        {formattedCount}
      </p>
      <p className="mt-1 text-[9px] font-medium leading-tight text-[color:var(--text-sub)] sm:text-[10px]">{COPY.countSuffix}</p>

      {notice && (
        <div
          className={`fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 mx-auto max-w-[340px] rounded-xl border px-4 py-3 text-left text-xs leading-5 shadow-[0_16px_44px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:right-4 sm:left-auto sm:mx-0 ${
            notice.tone === 'care'
              ? 'border-cyan-300/30 bg-slate-950/95 text-cyan-50'
              : 'border-amber-300/35 bg-slate-950/95 text-amber-50'
          }`}
          role="status"
          aria-live="polite"
        >
          <p className={notice.tone === 'care' ? 'font-bold text-cyan-100' : 'font-bold text-amber-100'}>
            {notice.title}
          </p>
          <p className="mt-1 text-white/82">{notice.body}</p>
        </div>
      )}
    </section>
  );
}