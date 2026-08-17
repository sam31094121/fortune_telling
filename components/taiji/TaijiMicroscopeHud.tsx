'use client';

/**
 * 【太極顯微鏡｜HUD】（2026-08-17）
 *
 * 真顯微鏡的操作面板：倍率讀數、物鏡轉盤（六段）、行程滑桿、比例尺、內部渲染解析度。
 * 自己用 rAF 讀 magRef 更新，不把倍率灌進 React state——
 * 3D 那棵樹一幀都不會因為 HUD 而重繪。
 */

import { useEffect, useRef, useState } from 'react';
import {
  MAG_TIERS,
  formatMag,
  magFromU,
  tierForU,
  uFromMag,
  type MagRef,
} from './taijiMagnifier';
import styles from './TaijiMicroscopeHud.module.css';

export default function TaijiMicroscopeHud({
  magRef,
  canvasRef,
}: {
  magRef: MagRef;
  canvasRef: { current: HTMLElement | null };
}) {
  const [u, setU] = useState(0);
  const [backing, setBacking] = useState('');
  const lastRef = useRef(-1);

  useEffect(() => {
    let raf = 0;
    let sampleAt = 0;
    const tick = (now: number) => {
      const value = magRef.current.current;
      if (Math.abs(value - lastRef.current) > 0.0015) {
        lastRef.current = value;
        setU(value);
      }
      // 內部渲染解析度：每秒抓一次就好
      if (now - sampleAt > 1000) {
        sampleAt = now;
        const canvas = canvasRef.current?.querySelector('canvas');
        if (canvas) setBacking(`${canvas.width}×${canvas.height}`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [magRef, canvasRef]);

  const mag = magFromU(u);
  const tier = tierForU(u);
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();
  const formatLens = (value: number) => {
    if (value >= 1_000_000) return `${value / 1_000_000}M`;
    if (value >= 1000) return `${value / 1000}k`;
    return value;
  };

  return (
    /* 注意：這裡刻意用 <aside> 而不是 <div>——
       TaijiSystem.module.css 有一條 `.sphereWrapper > div { position: relative; z-index: 1 }`
       是給 R3F canvas 容器用的，權重比本模組的 .hud 高，會把面板從 absolute 打回 relative
       （面板會掉到卡片外面）。換成非 div 元素就從根本繞開，不必動到核心樣式、也不用 !important。 */
    <aside className={`${styles.hud} ${u > 0.02 ? styles.hudActive : ''}`} aria-label="太極顯微鏡">
      <div className={styles.readout}>
        <span className={styles.mag}>{formatMag(mag)}</span>
        <span className={styles.tier}>{tier.label}</span>
        <span className={styles.detail}>{tier.detail}</span>
        <span className={styles.scale}>
          <i className={styles.scaleBar} aria-hidden="true" />
          {tier.scale}
        </span>
        {backing && <span className={styles.res}>內部渲染 {backing}</span>}
      </div>

      <div className={styles.sliderWrap} onPointerDown={stop} onPointerMove={stop}>
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(u * 1000)}
          aria-label="放大倍率"
          onChange={(event) => {
            magRef.current.target = Number(event.target.value) / 1000;
          }}
        />
      </div>

      <div className={styles.turret} onPointerDown={stop}>
        {MAG_TIERS.map((item) => {
          const active = tier.key === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`${styles.lens} ${active ? styles.lensActive : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                magRef.current.target = uFromMag(item.mag);
              }}
            >
              {formatLens(item.mag)}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
