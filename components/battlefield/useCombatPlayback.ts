'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { combatPlaybackMs } from '@/lib/beast-game/combat-presentation';
import type { Match } from '@/lib/beast-game/interactive';

/** Input lock is synchronous; presentation never changes or recalculates the match. */
export function useCombatPlayback() {
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const reset = useCallback(() => {
    clearTimeout(timer.current); locked.current = false; setPlaying(false);
  }, []);
  const begin = useCallback(() => {
    if (locked.current) return false;
    locked.current = true; setPlaying(true); return true;
  }, []);
  const play = useCallback((match: Match) => {
    clearTimeout(timer.current);
    const duration = combatPlaybackMs(match, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    timer.current = setTimeout(reset, duration);
  }, [reset]);
  useEffect(() => () => { clearTimeout(timer.current); locked.current = false; }, []);
  return { playing, begin, play, reset };
}
