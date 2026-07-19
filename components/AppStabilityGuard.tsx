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
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    const userAgent = navigator.userAgent.toLowerCase();
    const socialBrowser = /line|fbav|fb_iab|fban|instagram|micromessenger/.test(userAgent);
    const limitedCpu = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
    const limitedMemory = typeof deviceMemory === 'number' && deviceMemory <= 4;
    let resizeFrameId: number | undefined;

    const updatePerformanceMode = () => {
      const saveData = Boolean(connection?.saveData);
      const effectiveType = connection?.effectiveType ?? '';
      const slowNetwork = effectiveType === 'slow-2g' || effectiveType === '2g';
      const mobileDevice = mobileMedia.matches;
      const lowPowerDevice = mobileDevice || limitedCpu || limitedMemory || saveData || slowNetwork;

      body.classList.toggle('app-mobile-device', mobileDevice);
      body.classList.toggle('app-social-browser', socialBrowser);
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
        body.classList.remove('app-page-hidden');
      }
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

    const addConnectionListener = () => {
      connection?.addEventListener?.('change', schedulePerformanceModeUpdate);
    };

    const removeConnectionListener = () => {
      connection?.removeEventListener?.('change', schedulePerformanceModeUpdate);
    };

    updatePerformanceMode();
    updatePageVisibility();
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('resize', schedulePerformanceModeUpdate);
    document.addEventListener('visibilitychange', updatePageVisibility);
    addMobileMediaListener();
    addConnectionListener();

    return () => {
      if (resizeFrameId !== undefined) window.cancelAnimationFrame(resizeFrameId);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('resize', schedulePerformanceModeUpdate);
      document.removeEventListener('visibilitychange', updatePageVisibility);
      removeMobileMediaListener();
      removeConnectionListener();
      body.classList.remove('app-page-hidden');
      body.classList.remove('app-mobile-device');
      body.classList.remove('app-social-browser');
      body.classList.remove('app-low-power-device');
      body.classList.remove('app-lite-effects');
    };
  }, []);

  return null;
}
