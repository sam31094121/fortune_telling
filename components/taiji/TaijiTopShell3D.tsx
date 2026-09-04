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
  /** 3D 掛不上時的退路：太極永遠不會是一片空白。 */
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const webgl = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      /*
        只擋兩件事：瀏覽器沒有 WebGL、或客戶自己要求減少動態。

        原本這裡還有一道「低功耗裝置」判定：
          deviceMemory <= 4 || hardwareConcurrency <= 4
        它讓「所有 iPhone」都看不到太極——Safari 完全不支援 deviceMemory，
        而 hardwareConcurrency 出於指紋防護對 iPhone 全系列一律只回報 4，
        連 iPhone 15 Pro Max 也是 4。於是 compact && limitedDevice 恆成立，
        整個 iOS 被擋在門外，首屏變成空白。（2026-09-04 客訴）

        真正的效能保護本來就在 TaijiSystem 內部：依裝置設 DPR 上限與粒子預算、
        離開視野停 frameloop。那一層才是該做降級的地方——
        依太極憲章，省效能要從材質與剔除下手，不是把整個核心關掉。
      */
      if (!webgl || reduced) {
        setFallback(true);
        return;
      }

      const start = () => setReady(true);
      // Safari 至今不支援 requestIdleCallback，退路縮短到 320ms，
      // 讓 iPhone 的顯示時機與 Android 一致，不要慢半拍。
      const canUseIdleCallback = typeof window.requestIdleCallback === 'function';
      const handle = canUseIdleCallback
        ? window.requestIdleCallback(start, { timeout: 1800 })
        : window.setTimeout(start, 320);
      return () => {
        if (canUseIdleCallback) window.cancelIdleCallback(handle as number);
        else window.clearTimeout(handle as number);
      };
    } catch {
      // 偵測本身出錯也不能讓首屏開天窗。
      setFallback(true);
    }
  }, []);

  /*
    3D 還沒掛上、或掛不上時的靜態太極。
    原本這裡是 return null——註解寫著「保留靜態外框」，實際上什麼都沒有，
    客戶看到的是一個空的區塊。太極是唯一核心，任何情況下都不該消失。
  */
  if (!ready) {
    return (
      <div
        className="relative grid w-full place-items-center rounded-[28px] py-6"
        data-taiji-fallback={fallback ? 'static' : 'loading'}
      >
        <img
          src={textureUrl ?? '/taiji.png'}
          alt="太極"
          width={200}
          height={200}
          className={`h-[min(52vw,200px)] w-[min(52vw,200px)] select-none drop-shadow-[0_0_36px_rgba(148,163,255,0.35)] ${fallback ? '' : 'animate-pulse'}`}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-visible rounded-[28px]">
      <TaijiSystem textureUrl={textureUrl ?? '/taiji.png'} videoUrl={videoUrl} />
    </div>
  );
}
