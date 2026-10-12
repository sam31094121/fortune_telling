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

// 手機捏合放大之後，單指拖動是在「移動放大的畫面」，不能再拿去推太極時軸、更不能 preventDefault，
// 否則客戶放大後怎麼左右、上下拖都被吃掉（2026-10-12 客戶回報）。
function isPinchZoomed() {
  return (window.visualViewport?.scale ?? 1) > 1.02;
}

/** 主頁第一畫面：整頁滾輪／單指直滑對應太極時軸；不改版面。 */
export function useTaijiFirstScreenScroll(journeyRef: TaijiJourneyRef, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const pageY = () => window.scrollY || document.documentElement.scrollTop || 0;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    // 讓 CSS 知道目前是放大狀態：放大時太極球也要放行拖動與縮放（見 TaijiSystem.module.css）。
    const markZoom = () => {
      if (isPinchZoomed()) root.setAttribute?.('data-pinch-zoomed', '');
      else root.removeAttribute?.('data-pinch-zoomed');
    };
    markZoom();
    viewport?.addEventListener('resize', markZoom);

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      if (isPinchZoomed()) return;
      if (isEditableTarget(event.target)) return;
      const unit = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 80 : event.deltaY;
      const intent = unit > 0 ? 'deeper' : 'shallower';
      if (!shouldDriveTaijiFromPageScroll(pageY(), journeyRef.current.target, intent)) return;
      event.preventDefault();
      nudgeJourneyTarget(journeyRef.current, clampStep(unit * TAIJI_WHEEL_DEPTH_GAIN));
    };

    let lastX = 0;
    let lastY = 0;
    let tracking = false;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isEditableTarget(event.target) || isPinchZoomed()) {
        tracking = false;
        return;
      }
      tracking = true;
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      if (isPinchZoomed()) {
        tracking = false;
        return;
      }
      const x = event.touches[0].clientX;
      const y = event.touches[0].clientY;
      const dx = lastX - x;
      const dy = lastY - y;
      lastX = x;
      lastY = y;
      if (Math.abs(dy) < 0.4) return;
      // 橫向拖動為主：是手指在左右移動畫面，不是在推時軸，放行給瀏覽器。
      if (Math.abs(dx) > Math.abs(dy)) return;
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
      viewport?.removeEventListener('resize', markZoom);
      root.removeAttribute?.('data-pinch-zoomed');
    };
  }, [journeyRef, enabled]);
}
