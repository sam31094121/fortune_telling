'use client';

import { useEffect } from 'react';
import { recoverFromChunkError } from '@/lib/chunk-recovery';
import { injectPerformanceCSS } from '@/lib/performance-css';

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
    const limitedCpu = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
    const limitedMemory = typeof deviceMemory === 'number' && deviceMemory <= 4;

    const updatePerformanceMode = () => {
      body.classList.toggle('app-low-power-device', mobileMedia.matches || limitedCpu || limitedMemory);
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
        mobileMedia.addEventListener('change', updatePerformanceMode);
      } else {
        mobileMedia.addListener(updatePerformanceMode);
      }
    };

    const removeMobileMediaListener = () => {
      if (typeof mobileMedia.removeEventListener === 'function') {
        mobileMedia.removeEventListener('change', updatePerformanceMode);
      } else {
        mobileMedia.removeListener(updatePerformanceMode);
      }
    };

    updatePerformanceMode();
    updatePageVisibility();
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('resize', updatePerformanceMode);
    document.addEventListener('visibilitychange', updatePageVisibility);
    addMobileMediaListener();

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('resize', updatePerformanceMode);
      document.removeEventListener('visibilitychange', updatePageVisibility);
      removeMobileMediaListener();
      body.classList.remove('app-page-hidden');
      body.classList.remove('app-low-power-device');
    };
  }, []);

  return null;
}
