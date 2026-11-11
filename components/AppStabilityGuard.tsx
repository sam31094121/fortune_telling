'use client';

import { useEffect } from 'react';
import { recoverFromChunkError } from '@/lib/chunk-recovery';
import { injectPerformanceCSS } from '@/lib/performance-css';

type NetworkInformationLike = {
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
  effectiveType?: string;
  saveData?: boolean;
};

function getErrorMessage(event: ErrorEvent | PromiseRejectionEvent) {
  if ('message' in event && event.message) return event.message;
  const reason = 'reason' in event ? event.reason : undefined;
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return '';
  }
}

export default function AppStabilityGuard() {
  useEffect(() => {
    injectPerformanceCSS();

    const body = document.body;
    const mobileMedia = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    // matchMedia replaces window.innerWidth so mode updates never force a synchronous layout.
    const smallScreenMedia = window.matchMedia('(max-width: 430px)');
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    const userAgent = navigator.userAgent.toLowerCase();
    const socialBrowser = /line|fbav|fb_iab|fban|instagram|micromessenger/.test(userAgent);
    const limitedCpu = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
    const limitedMemory = typeof deviceMemory === 'number' && deviceMemory <= 4;
    let resizeFrameId: number | undefined;
    let scrollIdleTimerId: number | undefined;
    let touchIdleTimerId: number | undefined;
    let stressTimerId: number | undefined;
    let longTaskObserver: PerformanceObserver | undefined;
    let lastScrollAt = 0;
    let lastTouchAt = 0;
    // Mirror of classes this guard owns; writes only happen when a value actually changes,
    // so body never gets redundant mutations that invalidate full-page style.
    const appliedClasses = new Map<string, boolean>();
    const setBodyClass = (name: string, on: boolean) => {
      if (appliedClasses.get(name) === on && body.classList.contains(name) === on) return;
      appliedClasses.set(name, on);
      if (body.classList.contains(name) !== on) body.classList.toggle(name, on);
    };

    // 2026-11-09 perf：頁面可在 <main> 加 data-perf-quiet-body 退出 body 上的「捲動／觸控／壓力」暫態 class。
    // body class 每切一次，整頁都要重算樣式（星宿神獸頁約 1,800 個節點，CPU 4× 降速下單次約 250ms），
    // 長任務又會觸發 app-stress-mode 再切一次 class，形成回饋迴圈。這三個 class 對應的 CSS 只作用在首頁／算命卡等元素，
    // 退出的頁面上沒有受影響元素，所以畫面不變；其他頁面行為完全不變。
    const quietBody = () => document.querySelector('main[data-perf-quiet-body]') !== null;

    const updatePerformanceMode = () => {
      const saveData = Boolean(connection?.saveData);
      const effectiveType = connection?.effectiveType ?? '';
      const slowNetwork = effectiveType === 'slow-2g' || effectiveType === '2g';
      const mobileDevice = mobileMedia.matches;
      const reducedMotion = reducedMotionMedia.matches;
      const smallScreen = smallScreenMedia.matches;
      const lowPowerDevice = mobileDevice || limitedCpu || limitedMemory || saveData || slowNetwork || reducedMotion;
      const stressActive = stressTimerId !== undefined;

      setBodyClass('app-mobile-device', mobileDevice);
      setBodyClass('app-small-screen', smallScreen);
      setBodyClass('app-social-browser', socialBrowser);
      setBodyClass('app-reduced-motion', reducedMotion);
      setBodyClass('app-low-power-device', lowPowerDevice);
      // While stress mode is active, lite effects stay on (same semantics as before).
      setBodyClass('app-lite-effects', lowPowerDevice || socialBrowser || stressActive);
    };

    const schedulePerformanceModeUpdate = () => {
      if (resizeFrameId !== undefined) return;
      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = undefined;
        updatePerformanceMode();
      });
    };

    const updatePageVisibility = () => {
      setBodyClass('app-page-hidden', document.visibilityState !== 'visible');
    };

    // Idle detection keeps one timer alive per gesture instead of clear/set on every event;
    // the class is still removed 520ms / 620ms after the last event.
    const SCROLL_IDLE_MS = 520;
    const TOUCH_IDLE_MS = 620;

    const checkScrollIdle = () => {
      const remaining = lastScrollAt + SCROLL_IDLE_MS - performance.now();
      if (remaining > 1) {
        scrollIdleTimerId = window.setTimeout(checkScrollIdle, remaining);
        return;
      }
      scrollIdleTimerId = undefined;
      setBodyClass('app-scrolling', false);
    };

    const markScrolling = () => {
      if (quietBody()) return;
      lastScrollAt = performance.now();
      setBodyClass('app-scrolling', true);
      if (scrollIdleTimerId === undefined) {
        scrollIdleTimerId = window.setTimeout(checkScrollIdle, SCROLL_IDLE_MS);
      }
    };

    const checkTouchIdle = () => {
      const remaining = lastTouchAt + TOUCH_IDLE_MS - performance.now();
      if (remaining > 1) {
        touchIdleTimerId = window.setTimeout(checkTouchIdle, remaining);
        return;
      }
      touchIdleTimerId = undefined;
      setBodyClass('app-touching', false);
    };

    const markTouching = () => {
      if (quietBody()) return;
      lastTouchAt = performance.now();
      setBodyClass('app-touching', true);
      if (touchIdleTimerId === undefined) {
        touchIdleTimerId = window.setTimeout(checkTouchIdle, TOUCH_IDLE_MS);
      }
    };

    const markStressMode = () => {
      if (quietBody()) return;
      if (stressTimerId !== undefined || body.classList.contains('app-stress-mode')) return;
      stressTimerId = window.setTimeout(() => {
        stressTimerId = undefined;
        // One pass: drop stress, then lite-effects only changes if no other reason keeps it on.
        setBodyClass('app-stress-mode', false);
        updatePerformanceMode();
      }, 5200);
      setBodyClass('app-stress-mode', true);
      setBodyClass('app-lite-effects', true);
      // Visual enhancements can subscribe to this signal and yield resources
      // before a long task turns into a visible interaction stall.
      window.dispatchEvent(new CustomEvent('tdh:performance-stress'));
    };

    const handleError = (event: ErrorEvent) => {
      const message = getErrorMessage(event);
      if (recoverFromChunkError(message)) event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = getErrorMessage(event);
      if (recoverFromChunkError(message)) event.preventDefault();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        injectPerformanceCSS();
      }
      updatePerformanceMode();
      updatePageVisibility();
    };

    const handleNetworkStateChange = () => {
      schedulePerformanceModeUpdate();
    };

    const addMobileMediaListener = () => {
      if (typeof mobileMedia.addEventListener === 'function') {
        mobileMedia.addEventListener('change', schedulePerformanceModeUpdate);
      } else {
        mobileMedia.addListener(schedulePerformanceModeUpdate);
      }
      if (typeof smallScreenMedia.addEventListener === 'function') {
        smallScreenMedia.addEventListener('change', schedulePerformanceModeUpdate);
      } else {
        smallScreenMedia.addListener(schedulePerformanceModeUpdate);
      }
    };

    const removeMobileMediaListener = () => {
      if (typeof mobileMedia.removeEventListener === 'function') {
        mobileMedia.removeEventListener('change', schedulePerformanceModeUpdate);
      } else {
        mobileMedia.removeListener(schedulePerformanceModeUpdate);
      }
      if (typeof smallScreenMedia.removeEventListener === 'function') {
        smallScreenMedia.removeEventListener('change', schedulePerformanceModeUpdate);
      } else {
        smallScreenMedia.removeListener(schedulePerformanceModeUpdate);
      }
    };

    const addReducedMotionListener = () => {
      if (typeof reducedMotionMedia.addEventListener === 'function') {
        reducedMotionMedia.addEventListener('change', schedulePerformanceModeUpdate);
      } else {
        reducedMotionMedia.addListener(schedulePerformanceModeUpdate);
      }
    };

    const removeReducedMotionListener = () => {
      if (typeof reducedMotionMedia.removeEventListener === 'function') {
        reducedMotionMedia.removeEventListener('change', schedulePerformanceModeUpdate);
      } else {
        reducedMotionMedia.removeListener(schedulePerformanceModeUpdate);
      }
    };

    const addConnectionListener = () => {
      connection?.addEventListener?.('change', schedulePerformanceModeUpdate);
    };

    const removeConnectionListener = () => {
      connection?.removeEventListener?.('change', schedulePerformanceModeUpdate);
    };

    if (typeof PerformanceObserver !== 'undefined') {
      try {
        longTaskObserver = new PerformanceObserver((list) => {
          if (list.getEntries().some((entry) => entry.duration >= 90)) {
            markStressMode();
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch {
        longTaskObserver = undefined;
      }
    }

    updatePerformanceMode();
    updatePageVisibility();
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleNetworkStateChange);
    window.addEventListener('offline', handleNetworkStateChange);
    window.addEventListener('resize', schedulePerformanceModeUpdate);
    window.addEventListener('scroll', markScrolling, { passive: true });
    window.addEventListener('touchstart', markTouching, { passive: true });
    window.addEventListener('touchmove', markTouching, { passive: true });
    window.addEventListener('pointerdown', markTouching, { passive: true });
    document.addEventListener('visibilitychange', updatePageVisibility);
    addMobileMediaListener();
    addReducedMotionListener();
    addConnectionListener();

    return () => {
      if (resizeFrameId !== undefined) window.cancelAnimationFrame(resizeFrameId);
      if (scrollIdleTimerId !== undefined) window.clearTimeout(scrollIdleTimerId);
      if (touchIdleTimerId !== undefined) window.clearTimeout(touchIdleTimerId);
      if (stressTimerId !== undefined) window.clearTimeout(stressTimerId);
      longTaskObserver?.disconnect();
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleNetworkStateChange);
      window.removeEventListener('offline', handleNetworkStateChange);
      window.removeEventListener('resize', schedulePerformanceModeUpdate);
      window.removeEventListener('scroll', markScrolling);
      window.removeEventListener('touchstart', markTouching);
      window.removeEventListener('touchmove', markTouching);
      window.removeEventListener('pointerdown', markTouching);
      document.removeEventListener('visibilitychange', updatePageVisibility);
      removeMobileMediaListener();
      removeReducedMotionListener();
      removeConnectionListener();
      body.classList.remove('app-page-hidden');
      body.classList.remove('app-scrolling');
      body.classList.remove('app-touching');
      body.classList.remove('app-stress-mode');
      body.classList.remove('app-mobile-device');
      body.classList.remove('app-small-screen');
      body.classList.remove('app-social-browser');
      body.classList.remove('app-reduced-motion');
      body.classList.remove('app-low-power-device');
      body.classList.remove('app-lite-effects');
    };
  }, []);

  return null;
}

