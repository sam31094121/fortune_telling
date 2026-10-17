'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 換頁時把手機的放大倍率還原（2026-10-17 客戶回報：首頁放大後點進塔羅牌、易經論數字，新頁面仍是放大狀態，
 * 螢幕看不到、要兩指縮小）。手機瀏覽器在站內換頁時不會自動還原捏合倍率，所以換到另一頁、
 * 或從上一頁返回時，若倍率大於 1，就短暫把 viewport 鎖在 1 倍再放開——只是還原，不禁止客戶放大。
 * 客戶在「同一頁」自己放大的，不會被打斷（只在換頁、頁面重新顯示時才檢查）。
 */
export default function ViewportZoomReset() {
  const pathname = usePathname();

  useEffect(() => {
    const reset = () => {
      const viewport = window.visualViewport;
      if (!viewport || viewport.scale <= 1.02) return;
      const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      if (!meta) return;
      const original = meta.getAttribute('content') ?? '';
      meta.setAttribute('content', `${original}, maximum-scale=1`);
      window.setTimeout(() => meta.setAttribute('content', original), 120);
    };
    // 換頁後等新頁面畫好再還原
    const timer = window.setTimeout(reset, 60);
    window.addEventListener('pageshow', reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pageshow', reset);
    };
  }, [pathname]);

  return null;
}
