'use client';

import { useEffect } from 'react';
import {
  DESKTOP_OPT_IN_KEY,
  guessPhoneCssWidth,
  phoneViewportContent,
  shouldForcePhoneLayout,
  type PhoneLayoutSignals,
} from '@/lib/force-phone-layout';

function readSignals(): PhoneLayoutSignals {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return {
    innerWidth: window.innerWidth,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    visualWidth: window.visualViewport?.width ?? 0,
    maxTouchPoints: nav.maxTouchPoints || 0,
    pointerCoarse: window.matchMedia('(pointer: coarse)').matches,
    standalone: window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
    userAgent: nav.userAgent || '',
  };
}

function applyViewport(signals: PhoneLayoutSignals) {
  let wantsDesktop = false;
  try { wantsDesktop = window.localStorage.getItem(DESKTOP_OPT_IN_KEY) === '1'; } catch { /* 讀不到就當沒勾 */ }
  if (!shouldForcePhoneLayout(signals, wantsDesktop)) return;
  document.documentElement.setAttribute('data-force-phone', '1');
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const next = phoneViewportContent(guessPhoneCssWidth(signals));
  if (meta.getAttribute('content') !== next) meta.setAttribute('content', next);
}

/**
 * 加到主畫面／PWA 被 Chrome 開成電腦版時，把 viewport 鎖回手機寬。
 * 方向旋轉後再量一次。
 */
export default function ForcePhoneLayout() {
  useEffect(() => {
    const run = () => applyViewport(readSignals());
    run();
    window.addEventListener('orientationchange', run);
    window.visualViewport?.addEventListener('resize', run);
    return () => {
      window.removeEventListener('orientationchange', run);
      window.visualViewport?.removeEventListener('resize', run);
    };
  }, []);
  return null;
}
