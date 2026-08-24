'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { playElementUnsealSound } from '@/components/ElementUnsealSound';
import type { ProductElement } from '@/components/bazi/customer/WaterTreasureOrb';
import { createSealedElementTreasureRitualState, ELEMENT_TREASURE_RITUAL_MS, type ElementTreasureRitualStatus } from '@/lib/element-treasure-ritual-state';

/**
 * Unified five-element treasure rule: every feature has five sealed orbs, but
 * only the primary orb selected by that feature's own canonical calculation can
 * run the 0 / 3 / 6 / 9 / 12-second ash-unseal ritual. The other four are
 * comparison-only sealed orbs.
 */
export function useElementTreasureRitual(primaryElement: ProductElement) {
  const [status, setStatus] = useState<ElementTreasureRitualStatus>('sealed');
  const [stage, setStage] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);
  useEffect(() => {
    clearTimers();
    const sealed = createSealedElementTreasureRitualState();
    setStatus(sealed.status);
    setStage(sealed.stage);
  }, [clearTimers, primaryElement]);

  const start = useCallback(() => {
    if (status === 'opening') return;
    clearTimers();
    playElementUnsealSound(primaryElement);
    setStatus('opening');
    setStage(0);
    timersRef.current = [
      window.setTimeout(() => setStage(1), ELEMENT_TREASURE_RITUAL_MS[1]),
      window.setTimeout(() => setStage(2), ELEMENT_TREASURE_RITUAL_MS[2]),
      window.setTimeout(() => setStage(3), ELEMENT_TREASURE_RITUAL_MS[3]),
      window.setTimeout(() => {
        setStatus('released');
        setStage(null);
        timersRef.current = [];
      }, ELEMENT_TREASURE_RITUAL_MS[4]),
    ];
  }, [clearTimers, primaryElement, status]);

  const reseal = useCallback(() => {
    clearTimers();
    const sealed = createSealedElementTreasureRitualState();
    setStatus(sealed.status);
    setStage(sealed.stage);
  }, [clearTimers]);

  return { status, stage, opening: status === 'opening', released: status === 'released', start, reseal };
}
