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

/*
  底數歸零。

  這個常數原本是 1,011,500——不管實際有幾個人，畫面至少顯示這個數。
  於是 number／iching／karma 三個功能顯示「1,271,2xx 人」，
  而真實訪客是 0。認同數同理：顯示 630,674，真實 46。

  專案鐵律第一條是禁止作假。虛增的社會證明是對客戶說謊，
  不因為「別人都這樣做」而變成可以。歸零之後數字會很難看，
  但難看的真話勝過好看的假話。
*/
const MINIMUM_DISPLAY_COUNT = 0;
const BACKEND_SYNC_INTERVAL_MS = 60_000;
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

    /*
      這裡原本會依「離開了多久」把讀出來的數字往上加，最多一次加 30。

      也就是說：關掉分頁去吃個飯，回來數字自己漲了——
      而那段時間一個訪客都沒有。這是第二條捏造路徑，
      比計時器那條更難發現，因為它藏在「讀取」裡。

      現在讀到多少就是多少。
    */
    return stored.displayCount;
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

const pageLoadVisitIds = new Map<FeatureKey, string>();

function getPageLoadVisitId(featureKey: FeatureKey) {
  const existing = pageLoadVisitIds.get(featureKey);
  if (existing) return existing;

  const visitId = createVisitId();
  pageLoadVisitIds.set(featureKey, visitId);
  return visitId;
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

function getCounterSyncIntervalMs(permanent: boolean) {
  if (permanent) return 30_000;
  return isMobileOrSocialBrowser() ? 180_000 : BACKEND_SYNC_INTERVAL_MS;
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
  permanent = false,
}: {
  featureKey: FeatureKey;
  className?: string;
  trackWhenVisible?: boolean;
  deferMs?: number;
  compact?: boolean;
  permanent?: boolean;
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
        /*
          原本是 Math.max(現在的, 新來的)——數字只能往上，不能往下。

          用意大概是「不要讓客戶看到數字倒退」，但代價是：
          虛增時期存進 localStorage 的 1,085,024 永遠降不回來，
          就算伺服器已經回報真實的 1,869 也一樣。
          於是「歸真」只對新客戶生效，看過假數字的人繼續看假數字。

          伺服器才是真相來源。它說多少就是多少——**包括變少**。
        */
        const nextCount = safeRequestedCount;

        writeStoredDisplayCount(featureKey, nextCount);
        return nextCount;
      });
    },
    [featureKey, permanent],
  );

  useEffect(() => {
    const storedDisplayCount = readStoredDisplayCount(featureKey);

    if (storedDisplayCount !== null) {
      commitDisplayCount(storedDisplayCount);
    }
  }, [commitDisplayCount, featureKey]);

  /*
    這裡原本有一個「自己長大」的計時器：每 7–24 秒把顯示數字 +1，
    切回分頁還會依離開時間補算，最多一次補 30。
    也就是說沒有任何人造訪，數字也會一直往上跑。

    實測資料：number／iching／karma 三個功能顯示「1,271,2xx 人瀏覽」，
    而 visitIds 是空陣列——一個真實訪客都沒有。

    專案鐵律是禁止作假。把假的流量做成會呼吸的樣子，不是行銷手法，
    是對客戶說謊。整段連同它的常數一起刪掉：
    數字只有在後端記錄到真實造訪時才會變。
  */

  useEffect(() => {
    if (hiddenCounter) return;

    const controller = new AbortController();
    let mounted = true;
    let intervalId: number | undefined;
    let startTimerId: number | undefined;

    async function syncDisplayCount() {
      if (document.visibilityState !== 'visible') return;

      try {
        const response = await fetchVisitorRecord(`/api/visitor/record?featureKey=${encodeURIComponent(featureKey)}${permanent ? '&permanent=1' : ''}`, {
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
      intervalId = window.setInterval(syncDisplayCount, getCounterSyncIntervalMs(permanent));
    }

    const effectiveDeferMs = permanent ? 0 : getCounterStartDelayMs(deferMs);

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
  }, [commitDisplayCount, deferMs, featureKey, hiddenCounter, permanent]);

  useEffect(() => {
    if (hiddenCounter) return;

    const controller = new AbortController();
    let startTimerId: number | undefined;

    async function recordFeatureVisit() {
      if (didRecord.current) return;
      didRecord.current = true;
      visitId.current ??= permanent ? getPageLoadVisitId(featureKey) : createVisitId();

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

    const effectiveDeferMs = permanent ? 0 : getCounterStartDelayMs(deferMs);

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
  }, [commitDisplayCount, deferMs, featureKey, hiddenCounter, permanent, trackWhenVisible]);

  return (
    <aside
      ref={cardRef}
      data-visitor-counter={featureKey}
      className={`inline-flex w-fit flex-col border border-amber-300/30 bg-white/[0.08] text-[color:var(--text-main)] shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl ${compact ? 'items-center justify-center rounded-xl px-2.5 py-2 text-center' : 'rounded-2xl px-[18px] py-[14px]'} ${className}`}
      aria-label={'\u7d2f\u8a08\u700f\u89bd\u4eba\u6578'}
    >
      <div className={`visitor-counter-label ${compact ? 'text-[9px] leading-tight sm:text-[10px]' : 'text-[13px]'} font-semibold text-[color:var(--text-main)] opacity-75`}>{'\u7d2f\u8a08\u700f\u89bd\u4eba\u6578'}</div>
      <div data-visitor-counter-count className={`top-feedback-count visitor-counter-count ${compact ? 'mt-1 font-serif text-2xl leading-none' : 'mt-1 text-2xl'} font-black tracking-[0.04em] text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.28)]`} aria-live="polite">
        {displayCount === null ? '\u8f09\u5165\u4e2d' : displayCount.toLocaleString('zh-TW')}
      </div>
      {compact && (
        <div className="visitor-counter-footnote mt-1 text-[9px] font-medium leading-tight text-[color:var(--text-sub)] sm:text-[10px]">
          {'\u5373\u6642\u7d2f\u7a4d'}
        </div>
      )}
    </aside>
  );
}
