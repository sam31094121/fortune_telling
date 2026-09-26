'use client';

import { useEffect, type RefObject } from 'react';
import { clampDepth, TAIJI_PINCH_DEPTH_GAIN, type TaijiJourneyRef } from '@/lib/taiji-journey-depth';

/** 首頁只以兩指縮放改變旅程，不註冊滾輪或單指滑動輸入。 */
export function useTaijiPinch(elementRef: RefObject<HTMLElement | null>, journeyRef: TaijiJourneyRef) {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let startDistance = 0;
    let startDepth = 1;
    const distance = () => {
      const [a, b] = Array.from(pointers.values());
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      startDistance = pointers.size === 2 ? distance() : 0;
      startDepth = journeyRef.current.target;
    };
    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size !== 2 || startDistance <= 0) return;
      const nextDistance = distance();
      if (nextDistance <= 0) return;
      journeyRef.current.target = clampDepth(startDepth + Math.log2(nextDistance / startDistance) * TAIJI_PINCH_DEPTH_GAIN);
    };
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      startDistance = pointers.size === 2 ? distance() : 0;
      startDepth = journeyRef.current.target;
    };
    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onUp);
    element.addEventListener('pointerleave', onUp);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
      element.removeEventListener('pointerleave', onUp);
    };
  }, [elementRef, journeyRef]);
}
