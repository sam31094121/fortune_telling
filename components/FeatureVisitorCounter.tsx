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

const MINIMUM_DISPLAY_COUNT = 1_011_500;
const FRONTEND_CATCH_UP_INTERVAL_MS = 18_000;
const FRONTEND_MIN_INCREMENT_DELAY_MS = 7_000;
const FRONTEND_MAX_INCREMENT_DELAY_MS = 24_000;
const BACKEND_SYNC_INTERVAL_MS = 60_000;
const MAX_VISIBLE_CATCH_UP_INCREMENT = 30;
const VISITOR_FETCH_TIMEOUT_MS = 8_000;

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
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= MINIMUM_DISPLAY_COUNT;
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
      Math.floor((Date.now() - stored.updatedAt) / FRONTEND_CATCH_UP_INTERVAL_MS),
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

function isHiddenClassName(className: string) {
  return className.split(/\s+/).includes('hidden');
}

function isMobileOrSocialBrowser() {
  if (typeof window === 'undefined') return false;

  const mobileDevice = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  const userAgent = navigator.userAgent.toLowerCase();
  const socialBrowser = /line|fbav|fb_iab|fban|instagram|micromessenger/.test(userAgent);

  return mobileDevice || socialBrowser;
}

function getCounterStartDelayMs(deferMs: number) {
  return Math.max(deferMs, isMobileOrSocialBrowser() ? 2500 : 0);
}

function getCounterSyncIntervalMs() {
  return isMobileOrSocialBrowser() ? 180_000 : BACKEND_SYNC_INTERVAL_MS;
}

function getFrontendIncrementRangeMs() {
  return isMobileOrSocialBrowser()
    ? { min: 16_000, max: 38_000, catchUp: 30_000 }
    : {
        min: FRONTEND_MIN_INCREMENT_DELAY_MS,
        max: FRONTEND_MAX_INCREMENT_DELAY_MS,
        catchUp: FRONTEND_CATCH_UP_INTERVAL_MS,
      };
}

async function fetchVisitorRecord(url: string, options: RequestInit = {}) {
  const requestController = new AbortController();
  const timeoutId = window.setTimeout(() => requestController.abort(), VISITOR_FETCH_TIMEOUT_MS);
  const parentSignal = options.signal;
  const abortRequest = () => requestController.abort();

  if (parentSignal?.aborted) {
    requestController.abort();
  }
  parentSignal?.addEventListener('abort', abortRequest, { once: true });

  try {
    return await fetch(url, {
      ...options,
      signal: requestController.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
    parentSignal?.removeEventListener('abort', abortRequest);
  }
}

export default function FeatureVisitorCounter({
  featureKey,
  className = '',
  trackWhenVisible = false,
  deferMs = 0,
  compact = false,
}: {
  featureKey: FeatureKey;
  className?: string;
  trackWhenVisible?: boolean;
  deferMs?: number;
  compact?: boolean;
}) {
  const [displayCount, setDisplayCount] = useState<number | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const didRecord = useRef(false);
  const visitId = useRef<string | null>(null);
  const hiddenCounter = isHiddenClassName(className);

  const commitDisplayCount = useCallback(
    (nextDisplayCount: number | ((currentCount: number) => number)) => {
      setDisplayCount((currentCount) => {
        const currentBaseCount = currentCount ?? MINIMUM_DISPLAY_COUNT;
        const requestedCount =
          typeof nextDisplayCount === 'function' ? nextDisplayCount(currentBaseCount) : nextDisplayCount;
        const safeRequestedCount = isSafeDisplayCount(requestedCount) ? requestedCount : currentBaseCount;
        const nextCount = Math.max(currentBaseCount, safeRequestedCount);

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
    if (hiddenCounter) return;

    let lastTickAt = Date.now();
    let timeoutId: number | undefined;

    function getNextDelay() {
      const range = getFrontendIncrementRangeMs();
      return Math.floor(range.min + Math.random() * (range.max - range.min));
    }

    function applyElapsedIncrement() {
      const now = Date.now();
      const elapsedIntervals = Math.floor((now - lastTickAt) / getFrontendIncrementRangeMs().catchUp);

      if (elapsedIntervals <= 0) return;

      lastTickAt += elapsedIntervals * getFrontendIncrementRangeMs().catchUp;
      commitDisplayCount((currentCount) => currentCount + Math.min(elapsedIntervals, MAX_VISIBLE_CATCH_UP_INCREMENT));
    }

    function scheduleNextIncrement() {
      timeoutId = window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          lastTickAt = Date.now();
          commitDisplayCount((currentCount) => currentCount + 1);
        }

        scheduleNextIncrement();
      }, getNextDelay());
    }

    function handlePageVisible() {
      if (document.visibilityState === 'visible') {
        applyElapsedIncrement();
      }
    }

    scheduleNextIncrement();
    document.addEventListener('visibilitychange', handlePageVisible);
    window.addEventListener('focus', applyElapsedIncrement);

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handlePageVisible);
      window.removeEventListener('focus', applyElapsedIncrement);
    };
  }, [commitDisplayCount, hiddenCounter]);

  useEffect(() => {
    if (hiddenCounter) return;

    const controller = new AbortController();
    let mounted = true;
    let intervalId: number | undefined;
    let startTimerId: number | undefined;

    async function syncDisplayCount() {
      if (document.visibilityState !== 'visible') return;

      try {
        const response = await fetchVisitorRecord(`/api/visitor/record?featureKey=${encodeURIComponent(featureKey)}`, {
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

    function startSync() {
      if (!mounted) return;
      void syncDisplayCount();
      intervalId = window.setInterval(syncDisplayCount, getCounterSyncIntervalMs());
    }

    const effectiveDeferMs = getCounterStartDelayMs(deferMs);

    if (effectiveDeferMs > 0) {
      startTimerId = window.setTimeout(startSync, effectiveDeferMs);
    } else {
      startSync();
    }
    window.addEventListener('focus', syncDisplayCount);

    return () => {
      mounted = false;
      controller.abort();
      if (startTimerId !== undefined) window.clearTimeout(startTimerId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
      window.removeEventListener('focus', syncDisplayCount);
    };
  }, [commitDisplayCount, deferMs, featureKey, hiddenCounter]);

  useEffect(() => {
    if (hiddenCounter) return;

    const controller = new AbortController();
    let startTimerId: number | undefined;

    async function recordFeatureVisit() {
      if (didRecord.current) return;
      didRecord.current = true;
      visitId.current ??= createVisitId();

      try {
        const response = await fetchVisitorRecord('/api/visitor/record', {
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

    const effectiveDeferMs = getCounterStartDelayMs(deferMs);

    if (!trackWhenVisible || typeof IntersectionObserver === 'undefined' || !cardRef.current) {
      if (effectiveDeferMs > 0) {
        startTimerId = window.setTimeout(() => void recordFeatureVisit(), effectiveDeferMs);
      } else {
        void recordFeatureVisit();
      }
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
        if (startTimerId !== undefined) window.clearTimeout(startTimerId);
        observer.disconnect();
        controller.abort();
      };
    }

    return () => {
      if (startTimerId !== undefined) window.clearTimeout(startTimerId);
      controller.abort();
    };
  }, [commitDisplayCount, deferMs, featureKey, hiddenCounter, trackWhenVisible]);

  return (
    <aside
      ref={cardRef}
      data-visitor-counter={featureKey}
      className={`inline-flex w-fit flex-col border border-amber-300/30 bg-white/[0.08] text-[color:var(--text-main)] shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl ${compact ? 'items-center justify-center rounded-xl px-2.5 py-2 text-center' : 'rounded-2xl px-[18px] py-[14px]'} ${className}`}
      aria-label="累計瀏覽人數"
    >
      <div className={`${compact ? 'text-[9px] leading-tight sm:text-[10px]' : 'text-[13px]'} font-semibold text-[color:var(--text-main)] opacity-75`}>累計瀏覽人數</div>
      <div className={`${compact ? 'mt-1 font-serif text-2xl leading-none' : 'mt-1 text-2xl'} font-black tracking-[0.04em] text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.28)]`} aria-live="polite">
        {displayCount === null ? '同步中' : displayCount.toLocaleString('zh-TW')}
      </div>
      {compact && (
        <div className="mt-1 text-[9px] font-medium leading-tight text-[color:var(--text-sub)] sm:text-[10px]">
          即時累積
        </div>
      )}
    </aside>
  );
}
