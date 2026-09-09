'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { combatPlaybackMs } from '@/lib/beast-game/combat-presentation';
import type { Match } from '@/lib/beast-game/interactive';

/** Input lock is synchronous; presentation never changes or recalculates the match. */
export function useCombatPlayback() {
  const locked = useRef(false);
  const lockStarted = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const reset = useCallback(() => {
    clearTimeout(timer.current); locked.current = false; lockStarted.current = 0; setPlaying(false);
  }, []);
  const begin = useCallback(() => {
    if (locked.current) {
      // Stale lock: timer was throttled (background tab) — auto-release after 5 s.
      if (Date.now() - lockStarted.current > 5000) { locked.current = false; }
      else { return false; }
    }
    locked.current = true; lockStarted.current = Date.now(); setPlaying(true); return true;
  }, []);
  const play = useCallback((match: Match) => {
    clearTimeout(timer.current);
    const duration = combatPlaybackMs(match, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    timer.current = setTimeout(reset, duration);
  }, [reset]);
  // When the tab returns to foreground the animation is already done — release immediately.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible' && locked.current) reset(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reset]);
  useEffect(() => () => { clearTimeout(timer.current); locked.current = false; }, []);
  return { playing, begin, play, reset };
}
