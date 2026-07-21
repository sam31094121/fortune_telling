'use client';

import { useEffect, useMemo, useState } from 'react';

const INITIAL_COUNT = 168;
const DEVICE_ID_KEY = 'taiji_ai_suggestion_device_id_v1';
const SENT_KEY = 'taiji_ai_suggestion_done_v1';

type SuggestionResponse = {
  ok?: boolean;
  totalCount?: number;
  didSend?: boolean;
  alreadySent?: boolean;
  message?: string;
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

export default function AiSuggestionFeedback({ className = '' }: { className?: string }) {
  const [totalCount, setTotalCount] = useState(INITIAL_COUNT);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [messageVisible, setMessageVisible] = useState(false);

  const formattedCount = useMemo(() => totalCount.toLocaleString('zh-TW'), [totalCount]);

  useEffect(() => {
    let active = true;

    setSent(window.localStorage.getItem(SENT_KEY) === '1');

    fetch('/api/ai-suggestion', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: SuggestionResponse) => {
        if (!active) return;
        if (data?.ok && typeof data.totalCount === 'number') {
          setTotalCount(data.totalCount);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  async function handleSend() {
    if (sent || submitting) return;

    setSubmitting(true);

    try {
      const response = await fetch('/api/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      const data = await response.json() as SuggestionResponse;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || '暫時無法送出');
      }

      if (typeof data.totalCount === 'number') {
        setTotalCount(data.totalCount);
      }

      setSent(true);
      window.localStorage.setItem(SENT_KEY, '1');
      setMessageVisible(true);
      window.setTimeout(() => setMessageVisible(false), 5200);
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
        {sent ? '已送出' : submitting ? '送出中...' : '👎 不同意'}
      </button>

      <p className="mt-1.5 text-[9px] font-semibold leading-tight text-[color:var(--text-sub)] sm:text-[10px]">已收到</p>
      <p className="font-serif text-2xl font-black leading-none tracking-[0.04em] text-cyan-100 drop-shadow-[0_0_14px_rgba(34,211,238,0.35)]">
        {formattedCount}
      </p>
      <p className="mt-1 text-[9px] font-medium leading-tight text-[color:var(--text-sub)] sm:text-[10px]">則改善建議</p>

      {messageVisible && (
        <div className="fixed right-4 top-20 z-50 max-w-[260px] rounded-xl border border-cyan-300/25 bg-slate-950/95 px-4 py-3 text-left text-xs leading-6 text-cyan-50 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <p className="font-semibold text-cyan-100">🙏 感謝您的寶貴回饋。</p>
          <p className="mt-1 text-cyan-50/85">我們會持續優化 AI，提供更好的分析品質。</p>
        </div>
      )}
    </section>
  );
}
