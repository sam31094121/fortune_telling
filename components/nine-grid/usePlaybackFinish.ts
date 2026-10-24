'use client';
import { useEffect, useState } from 'react';
export const FINISH_MS = 600;
/** Visual closing only; never changes a playback snapshot or count. */
export function usePlaybackFinish(done: boolean, animate: boolean, run: number) {
  const [settledRun, setSettledRun] = useState<number | null>(null);
  useEffect(() => {
    setSettledRun(null);
    if (!done) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!animate || motion.matches) { setSettledRun(run); return; }
    const timer = setTimeout(() => setSettledRun(run), FINISH_MS);
    const reduce = () => { if (motion.matches) { clearTimeout(timer); setSettledRun(run); } };
    motion.addEventListener('change', reduce);
    return () => { clearTimeout(timer); motion.removeEventListener('change', reduce); };
  }, [done, animate, run]);
  return { closing: done && animate && settledRun !== run, showResult: done && (!animate || settledRun === run) };
}
