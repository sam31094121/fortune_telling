'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const FEATURE_KEYS = {
  home: 'home',
  personality: 'personality',
  matching: 'matching',
  number: 'number',
  music: 'music',
  iching: 'iching',
  karma: 'karma',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

const INITIAL_DISPLAY_COUNT = 1_010_128;
const FRONTEND_INCREMENT_INTERVAL_MS = 1000;
const BACKEND_SYNC_INTERVAL_MS = 15_000;
const MAX_VISIBLE_CATCH_UP_INCREMENT = 600;

type StoredCounter = {
  displayCount: number;
  updatedAt: number;
};

interface VisitorResponse {
  ok?: boolean;
  displayCount?: number;
}

function getStorageKey(featureKey: FeatureKey) {
  return `feature-visitor-counter:${featureKey}:v1`;
}

function isSafeDisplayCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= INITIAL_DISPLAY_COUNT;
}

function readStoredDisplayCount(featureKey: FeatureKey) {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(featureKey));
    if (!rawValue) return null;

    const stored = JSON.parse(rawValue) as Partial<StoredCounter>;
    if (!isSafeDisplayCount(stored.displayCount) || typeof stored.updatedAt !== 'number') return null;

    const elapsedIntervals = Math.max(
      0,
      Math.floor((Date.now() - stored.updatedAt) / FRONTEND_INCREMENT_INTERVAL_MS),
    );

    return stored.displayCount + Math.min(elapsedIntervals, MAX_VISIBLE_CATCH_UP_INCREMENT);
  } catch {
    return null;
  }
}

function writeStoredDisplayCount(featureKey: FeatureKey, displayCount: number) {
  if (typeof window === 'undefined' || !isSafeDisplayCount(displayCount)) return;

  try {
    window.localStorage.setItem(
      getStorageKey(featureKey),
      JSON.stringify({ displayCount, updatedAt: Date.now() } satisfies StoredCounter),
    );
  } catch {
    // Some mobile browsers block localStorage in private mode; the live counter still works in memory.
  }
}

function createVisitId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export default function FeatureVisitorCounter({
  featureKey,
  className = '',
  trackWhenVisible = false,
}: {
  featureKey: FeatureKey;
  className?: string;
  trackWhenVisible?: boolean;
}) {
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const cardRef = useRef<HTMLElement>(null);
  const didRecord = useRef(false);
  const visitId = useRef<string | null>(null);

  const commitDisplayCount = useCallback(
    (nextDisplayCount: number | ((currentCount: number) => number)) => {
      setDisplayCount((currentCount) => {
        const requestedCount =
          typeof nextDisplayCount === 'function' ? nextDisplayCount(currentCount) : nextDisplayCount;
        const safeRequestedCount = isSafeDisplayCount(requestedCount) ? requestedCount : currentCount;
        const nextCount = Math.max(currentCount, safeRequestedCount);

        writeStoredDisplayCount(featureKey, nextCount);
        return nextCount;
      });
    },
    [featureKey],
  );

  useEffect(() => {
    const storedDisplayCount = readStoredDisplayCount(featureKey);

    if (storedDisplayCount !== null) {
      commitDisplayCount(storedDisplayCount);
    }
  }, [commitDisplayCount, featureKey]);

  useEffect(() => {
    let lastTickAt = Date.now();

    function applyElapsedIncrement() {
      const now = Date.now();
      const elapsedIntervals = Math.floor((now - lastTickAt) / FRONTEND_INCREMENT_INTERVAL_MS);

      if (elapsedIntervals <= 0) return;

      lastTickAt += elapsedIntervals * FRONTEND_INCREMENT_INTERVAL_MS;
      commitDisplayCount((currentCount) => currentCount + Math.min(elapsedIntervals, MAX_VISIBLE_CATCH_UP_INCREMENT));
    }

    const intervalId = window.setInterval(applyElapsedIncrement, FRONTEND_INCREMENT_INTERVAL_MS);

    function handlePageVisible() {
      if (document.visibilityState === 'visible') {
        applyElapsedIncrement();
      }
    }

    document.addEventListener('visibilitychange', handlePageVisible);
    window.addEventListener('focus', applyElapsedIncrement);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handlePageVisible);
      window.removeEventListener('focus', applyElapsedIncrement);
    };
  }, [commitDisplayCount]);

  useEffect(() => {
    const controller = new AbortController();

    async function syncDisplayCount() {
      try {
        const response = await fetch(`/api/visitor/record?featureKey=${encodeURIComponent(featureKey)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = (await response.json()) as VisitorResponse;
        const nextDisplayCount = data.displayCount;

        if (response.ok && data.ok && isSafeDisplayCount(nextDisplayCount)) {
          commitDisplayCount(nextDisplayCount);
        }
      } catch {
        // The in-browser timer keeps the counter visibly moving even when a sync request fails.
      }
    }

    void syncDisplayCount();
    const intervalId = window.setInterval(syncDisplayCount, BACKEND_SYNC_INTERVAL_MS);
    window.addEventListener('focus', syncDisplayCount);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncDisplayCount);
    };
  }, [commitDisplayCount, featureKey]);

  useEffect(() => {
    const controller = new AbortController();

    async function recordFeatureVisit() {
      if (didRecord.current) return;
      didRecord.current = true;
      visitId.current ??= createVisitId();

      try {
        const response = await fetch('/api/visitor/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureKey, visitId: visitId.current }),
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = (await response.json()) as VisitorResponse;
        const nextDisplayCount = data.displayCount;

        if (response.ok && data.ok && isSafeDisplayCount(nextDisplayCount)) {
          commitDisplayCount(nextDisplayCount);
        }
      } catch {
        // The browser-side timer keeps the counter moving when the record API is unavailable.
      }
    }

    if (!trackWhenVisible || typeof IntersectionObserver === 'undefined' || !cardRef.current) {
      void recordFeatureVisit();
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            void recordFeatureVisit();
            observer.disconnect();
          }
        },
        { threshold: 0.5 },
      );
      observer.observe(cardRef.current);

      return () => {
        observer.disconnect();
        controller.abort();
      };
    }

    return () => controller.abort();
  }, [commitDisplayCount, featureKey, trackWhenVisible]);

  return (
    <aside
      ref={cardRef}
      data-visitor-counter={featureKey}
      className={`inline-flex w-fit flex-col rounded-2xl border border-amber-300/30 bg-white/[0.08] px-[18px] py-[14px] text-[color:var(--text-main)] shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl ${className}`}
      aria-label="目前瀏覽人數"
    >
      <div className="text-[13px] text-[color:var(--text-main)] opacity-75">目前瀏覽人數</div>
      <div className="mt-1 text-2xl font-bold tracking-[0.05em] text-amber-300" aria-live="polite">
        {displayCount.toLocaleString('zh-TW')}
      </div>
    </aside>
  );
}
