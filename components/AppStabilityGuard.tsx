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

    const updatePerformanceMode = () => {
      const saveData = Boolean(connection?.saveData);
      const effectiveType = connection?.effectiveType ?? '';
      const slowNetwork = effectiveType === 'slow-2g' || effectiveType === '2g';
      const mobileDevice = mobileMedia.matches;
      const reducedMotion = reducedMotionMedia.matches;
      const smallScreen = window.innerWidth <= 430;
      const lowPowerDevice = mobileDevice || limitedCpu || limitedMemory || saveData || slowNetwork || reducedMotion;

      body.classList.toggle('app-mobile-device', mobileDevice);
      body.classList.toggle('app-small-screen', smallScreen);
      body.classList.toggle('app-social-browser', socialBrowser);
      body.classList.toggle('app-reduced-motion', reducedMotion);
      body.classList.toggle('app-low-power-device', lowPowerDevice);
      body.classList.toggle('app-lite-effects', lowPowerDevice || socialBrowser);
    };

    const schedulePerformanceModeUpdate = () => {
      if (resizeFrameId !== undefined) return;
      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = undefined;
        updatePerformanceMode();
      });
    };

    const updatePageVisibility = () => {
      body.classList.toggle('app-page-hidden', document.visibilityState !== 'visible');
    };

    const markScrolling = () => {
      if (!body.classList.contains('app-scrolling')) {
        body.classList.add('app-scrolling');
      }
      if (scrollIdleTimerId !== undefined) window.clearTimeout(scrollIdleTimerId);
      scrollIdleTimerId = window.setTimeout(() => {
        body.classList.remove('app-scrolling');
      }, 520);
    };

    const markTouching = () => {
      if (!body.classList.contains('app-touching')) {
        body.classList.add('app-touching');
      }
      if (touchIdleTimerId !== undefined) window.clearTimeout(touchIdleTimerId);
      touchIdleTimerId = window.setTimeout(() => {
        body.classList.remove('app-touching');
      }, 620);
    };

    const markStressMode = () => {
      if (body.classList.contains('app-stress-mode')) return;
      body.classList.add('app-stress-mode');
      body.classList.add('app-lite-effects');
      // Visual enhancements can subscribe to this signal and yield resources
      // before a long task turns into a visible interaction stall.
      window.dispatchEvent(new CustomEvent('tdh:performance-stress'));
      if (stressTimerId !== undefined) window.clearTimeout(stressTimerId);
      stressTimerId = window.setTimeout(() => {
        body.classList.remove('app-stress-mode');
        updatePerformanceMode();
      }, 5200);
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
    };

    const removeMobileMediaListener = () => {
      if (typeof mobileMedia.removeEventListener === 'function') {
        mobileMedia.removeEventListener('change', schedulePerformanceModeUpdate);
      } else {
        mobileMedia.removeListener(schedulePerformanceModeUpdate);
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

