'use client';

/**
 * Taiji Experience Core V7｜自動效能分級
 *
 * HIGH：完整立體光影＋少量粒子
 * MEDIUM：降陰影、降粒子、降 blur（平均 FPS < 45 自動切換）
 * LOW：純 SVG + CSS Transform（平均 FPS < 30，或 reduced-motion / 低記憶體裝置）
 *
 * 所有模式功能完全一致；不得讓使用者自己處理卡頓。
 * 頁面 hidden 時暫停取樣，禁止第二個 animation loop。
 */

import { useEffect, useRef, useState } from 'react';

export type TaijiQuality = 'HIGH' | 'MEDIUM' | 'LOW';

export function useTaijiPerformance(): TaijiQuality {
  const [quality, setQuality] = useState<TaijiQuality>('HIGH');

  const frameRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 靜態降級訊號：reduced-motion 或低記憶體/低核心裝置直接 LOW
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    if (reducedMotion || (typeof deviceMemory === 'number' && deviceMemory <= 2) || (typeof cores === 'number' && cores <= 2)) {
      setQuality('LOW');
      return;
    }

    lastRef.current = performance.now();

    const tick = (now: number) => {
      const delta = now - lastRef.current;
      lastRef.current = now;

      if (delta > 0) {
        const fps = 1000 / delta;
        samplesRef.current.push(fps);
        if (samplesRef.current.length > 60) samplesRef.current.shift();

        if (samplesRef.current.length >= 30) {
          const average = samplesRef.current.reduce((sum, value) => sum + value, 0) / samplesRef.current.length;
          if (average < 30) {
            setQuality('LOW');
          } else if (average < 45) {
            setQuality((prev) => (prev === 'LOW' ? 'LOW' : 'MEDIUM'));
          }
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    const handleVisibility = () => {
      if (document.hidden) {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      } else if (!frameRef.current) {
        lastRef.current = performance.now();
        samplesRef.current = [];
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return quality;
}
