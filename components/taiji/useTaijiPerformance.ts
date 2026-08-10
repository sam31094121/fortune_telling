'use client';

import { useEffect, useRef, useState } from 'react';

export type TaijiQuality = 'HIGH' | 'MEDIUM' | 'LOW';

export function useTaijiPerformance() {
  const [quality, setQuality] = useState<TaijiQuality>('HIGH');
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const navigatorInfo = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };

    if (reducedMotion?.matches || (navigatorInfo.deviceMemory && navigatorInfo.deviceMemory <= 2)) {
      setQuality('LOW');
    } else if ((navigatorInfo.hardwareConcurrency ?? 8) <= 4) {
      setQuality('MEDIUM');
    }

    const tick = (now: number) => {
      if (lastRef.current > 0) {
        const delta = now - lastRef.current;
        if (delta > 0) {
          const fps = 1000 / delta;
          samplesRef.current.push(fps);
          if (samplesRef.current.length > 60) samplesRef.current.shift();

          const average = samplesRef.current.reduce((sum, value) => sum + value, 0) / samplesRef.current.length;
          if (average < 30) setQuality('LOW');
          else if (average < 45) setQuality((current) => (current === 'LOW' ? current : 'MEDIUM'));
        }
      }

      lastRef.current = now;
      frameRef.current = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (frameRef.current !== null || document.hidden) return;
      lastRef.current = 0;
      frameRef.current = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      if (frameRef.current === null) return;
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return quality;
}

