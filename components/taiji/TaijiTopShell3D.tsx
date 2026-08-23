'use client';

/**
 * 首頁最上方空殼卡片 · 三層立體太極系統
 *
 * 第一層：太極 → 兩儀 → 四象 → 八卦（完整呈現）
 * 第二層：五顆行星（空風水火地）獨立軌道
 * 第三層：空間能量場包覆並釋放光芒
 *
 * 只在支援 WebGL 且非 reduced-motion 時掛載；否則卡片維持原空殼樣式。
 */

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/* 圖案全面換新（2026-08-13 依業主檔案）：改掛 TaijiSystem V2（R3F 版）。
   舊 TaijiWebGL3D 保留原檔未刪，要回退時把下面這行換回 './TaijiWebGL3D' 即可。 */
const TaijiSystem = dynamic(() => import('@/components/TaijiSystem'), { ssr: false });

export default function TaijiTopShell3D({
  textureUrl,
  videoUrl,
}: {
  textureUrl?: string;
  videoUrl?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const webgl = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const compact = window.matchMedia?.('(max-width: 768px), (pointer: coarse)')?.matches;
      const limitedDevice = Boolean(
        (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4)
        || (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4),
      );

      // 首屏互動優先：低功耗裝置保留靜態外框，其他裝置在瀏覽器空檔才載入 3D。
      if (!webgl || reduced || (compact && limitedDevice)) return;

      const start = () => setReady(true);
      const canUseIdleCallback = typeof window.requestIdleCallback === 'function';
      const handle = canUseIdleCallback
        ? window.requestIdleCallback(start, { timeout: 1800 })
        : window.setTimeout(start, 900);
      return () => {
        if (canUseIdleCallback) window.cancelIdleCallback(handle as number);
        else window.clearTimeout(handle as number);
      };
    } catch {
      setReady(false);
    }
  }, []);

  if (!ready) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-[28px]">
      <TaijiSystem textureUrl={textureUrl ?? '/taiji.png'} videoUrl={videoUrl} />
    </div>
  );
}
