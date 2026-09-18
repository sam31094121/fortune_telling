'use client';

import { useEffect } from 'react';
import {
  TAIJI_TOUCH_DEPTH_GAIN,
  TAIJI_WHEEL_DEPTH_CAP,
  TAIJI_WHEEL_DEPTH_GAIN,
  nudgeJourneyTarget,
  shouldDriveTaijiFromPageScroll,
  type TaijiJourneyRef,
} from '@/lib/taiji-journey-depth';

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

function clampStep(value: number) {
  if (value > TAIJI_WHEEL_DEPTH_CAP) return TAIJI_WHEEL_DEPTH_CAP;
  if (value < -TAIJI_WHEEL_DEPTH_CAP) return -TAIJI_WHEEL_DEPTH_CAP;
  return value;
}

/** 主頁第一畫面：整頁滾輪／單指直滑對應太極時軸；不改版面。 */
export function useTaijiFirstScreenScroll(journeyRef: TaijiJourneyRef) {
  useEffect(() => {
    const pageY = () => window.scrollY || document.documentElement.scrollTop || 0;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      if (isEditableTarget(event.target)) return;
      const unit = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 80 : event.deltaY;
      const intent = unit > 0 ? 'deeper' : 'shallower';
      if (!shouldDriveTaijiFromPageScroll(pageY(), journeyRef.current.target, intent)) return;
      event.preventDefault();
      nudgeJourneyTarget(journeyRef.current, clampStep(unit * TAIJI_WHEEL_DEPTH_GAIN));
    };

    let lastY = 0;
    let tracking = false;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isEditableTarget(event.target)) {
        tracking = false;
        return;
      }
      tracking = true;
      lastY = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      const y = event.touches[0].clientY;
      const dy = lastY - y;
      lastY = y;
      if (Math.abs(dy) < 0.4) return;
      const intent = dy > 0 ? 'deeper' : 'shallower';
      if (!shouldDriveTaijiFromPageScroll(pageY(), journeyRef.current.target, intent)) return;
      event.preventDefault();
      nudgeJourneyTarget(journeyRef.current, clampStep(dy * TAIJI_TOUCH_DEPTH_GAIN));
    };

    const onTouchEnd = () => {
      tracking = false;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [journeyRef]);
}
