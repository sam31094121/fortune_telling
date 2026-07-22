'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const INITIAL_COUNT = 630_628;
const DEVICE_ID_KEY = 'taiji_ai_like_device_id_v1';
const LIKED_KEY = 'taiji_ai_like_done_v1';
const HIGHEST_COUNT_KEY = 'taiji_ai_like_highest_count_v1';

type LikeResponse = {
  ok?: boolean;
  totalCount?: number;
  didLike?: boolean;
  alreadyLiked?: boolean;
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
    // Some LINE in-app browser modes can block storage; the API value still protects the shared count.
  }
}

export default function AiLikeFeedback({ className = '' }: { className?: string }) {
  const [totalCount, setTotalCount] = useState(INITIAL_COUNT);
  const [liked, setLiked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const formattedCount = useMemo(() => totalCount.toLocaleString('zh-TW'), [totalCount]);

  const commitTotalCount = useCallback((nextCount: unknown) => {
    setTotalCount((currentCount) => {
      const permanentCount = Math.max(currentCount, readStoredHighestCount(), normalizeTotalCount(nextCount));
      writeStoredHighestCount(permanentCount);
      return permanentCount;
    });
  }, []);

  useEffect(() => {
    commitTotalCount(readStoredHighestCount());
  }, [commitTotalCount]);

  useEffect(() => {
    let active = true;

    setLiked(window.localStorage.getItem(LIKED_KEY) === '1');

    fetch('/api/ai-like', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: LikeResponse) => {
        if (!active) return;
        if (data?.ok && typeof data.totalCount === 'number') {
          commitTotalCount(data.totalCount);
        }
      })
      .catch(() => {
        if (active) setMessage('同步失敗');
      });

    return () => {
      active = false;
    };
  }, [commitTotalCount]);

  async function handleLike() {
    if (liked || submitting) return;

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/ai-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      const data = await response.json() as LikeResponse;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || '送出失敗');
      }

      if (typeof data.totalCount === 'number') {
        commitTotalCount(data.totalCount);
      }

      setLiked(true);
      window.localStorage.setItem(LIKED_KEY, '1');
      setMessage(data.alreadyLiked ? '此裝置已認同' : '感謝您的回饋');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '送出失敗');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={className}>
      <button
        type="button"
        onClick={handleLike}
        disabled={liked || submitting}
        className="top-feedback-action mx-auto inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[10px] font-black leading-none text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-300/18 disabled:cursor-default disabled:border-emerald-300/25 disabled:bg-emerald-300/10 disabled:text-emerald-100 sm:px-3 sm:py-1.5 sm:text-xs"
      >
        {liked ? '❤️ 已感謝支持' : submitting ? '送出中...' : '👍 我認同'}
      </button>

      <p className="mt-1.5 text-[9px] font-semibold leading-tight text-[color:var(--text-sub)] sm:text-[10px]">已有</p>
      <p className="top-feedback-count font-serif text-2xl font-black leading-none tracking-[0.04em] text-amber-100 drop-shadow-[0_0_14px_rgba(251,191,36,0.35)]">
        {formattedCount}
      </p>
      <p className="mt-1 text-[9px] font-medium leading-tight text-[color:var(--text-sub)] sm:text-[10px]">人認同本系統</p>

      {message && (
        <p className={`mt-1 text-[9px] leading-tight ${liked ? 'text-emerald-300' : 'text-amber-200'}`}>
          {message}
        </p>
      )}
    </section>
  );
}
