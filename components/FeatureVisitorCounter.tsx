'use client';

import { useEffect, useRef, useState } from 'react';

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

interface VisitorResponse {
  ok?: boolean;
  displayCount?: number;
}

export default function FeatureVisitorCounter({
  featureKey,
  className = '',
}: {
  featureKey: FeatureKey;
  className?: string;
}) {
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const didRecord = useRef(false);

  useEffect(() => {
    if (didRecord.current) return;
    didRecord.current = true;

    const controller = new AbortController();

    async function recordFeatureVisit() {
      try {
        const response = await fetch('/api/visitor/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureKey }),
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = (await response.json()) as VisitorResponse;
        const nextDisplayCount = data.displayCount;

        if (response.ok && data.ok && typeof nextDisplayCount === 'number' && Number.isSafeInteger(nextDisplayCount)) {
          setDisplayCount(nextDisplayCount);
        }
      } catch {
        // Keep the seed value visible when the counter service is unavailable.
      }
    }

    void recordFeatureVisit();

    return () => controller.abort();
  }, [featureKey]);

  return (
    <aside
      className={`w-fit rounded-2xl border border-amber-300/30 bg-white/[0.08] px-[18px] py-[14px] text-[color:var(--text-main)] shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl ${className}`}
      aria-label="目前瀏覽人數"
    >
      <div className="text-[13px] text-[color:var(--text-main)] opacity-75">目前瀏覽人數</div>
      <div className="mt-1 text-2xl font-bold tracking-[0.05em] text-amber-300" aria-live="polite">
        {displayCount.toLocaleString('zh-TW')}
      </div>
    </aside>
  );
}
