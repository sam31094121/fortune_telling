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

const TaijiWebGL3D = dynamic(() => import('./TaijiWebGL3D'), { ssr: false });

export default function TaijiTopShell3D() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const webgl = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      setReady(webgl && !reduced);
    } catch {
      setReady(false);
    }
  }, []);

  if (!ready) return null;

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[28px]">
      <TaijiWebGL3D className="absolute inset-0" variant="banner" />
    </div>
  );
}
