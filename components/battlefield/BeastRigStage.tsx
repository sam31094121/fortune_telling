'use client';

/**
 * 神獸戰鬥動畫舞台（只負責畫；播不播、何時播都由上層依後端戰報決定）。
 *
 * 依 lib/beast-game/beast-rig.ts 的時間軸，把同一隻神獸的幾張關鍵姿勢（跑、撲、咬、落地）
 * 疊在整個畫面層級的 2D 畫布上，沿「畫面最下方的出戰卡 → 對手卡」的路徑移動、縱躍、傾斜，並畫落地陰影。
 * 圖片只在掛載時載入一次；播放中不建立任何新資源，也不改 React 狀態。
 * 載入失敗回報 onReady(false)，上層就維持原本的卡片衝鋒演出。
 */

import { useEffect, useRef, useState } from 'react';
import { RIG_STRIKE_MS, rigFrameUrl, strikeFrame, type BeastRig, type RigFrameId } from '@/lib/beast-game/beast-rig';

type Rect = { cx: number; top: number; height: number; width: number };

export interface BeastRigGeometry {
  /** 可用寬度：精靈最寬的姿勢（奔跑伸展）不得超出它 */
  arenaWidth: number;
  /** 玩家出戰卡（畫面最下方）的位置：精靈從這裡跳出、回到這裡 */
  from: Rect;
  /** 對手卡插圖位置（精靈跑向這裡） */
  to: Rect;
}

const toRect = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, top: r.top, height: r.height, width: r.width };
};

export interface RigPlacement { x: number; y: number; unit: number; rotation: number; mirror: boolean; }

/** 站位：起點＝玩家卡面下緣偏上，終點＝對手卡面下緣；越往對手越遠，略縮小製造景深。 */
export function placeRig(geometry: BeastRigGeometry, frame: ReturnType<typeof strikeFrame>): RigPlacement {
  const progress = frame.travel.progress;
  const startX = geometry.from.cx;
  const startY = geometry.from.top + geometry.from.height * 0.8;
  const endX = geometry.to.cx;
  const endY = geometry.to.top + geometry.to.height * 0.82;
  const depth = 1 - 0.14 * progress;
  // 基準大小：最寬的姿勢（寬約 2.2 倍基準）不超過可用寬度的 70%
  const unit = geometry.arenaWidth * 0.3 * frame.scale * depth;
  const x = startX + (endX - startX) * progress;
  const base = startY + (endY - startY) * progress;
  const y = base - frame.travel.hop * unit;
  // 朝向：精靈本來面向左；對手在右邊就鏡射。往對手的方向抬頭，最多約 37 度
  const dx = endX - startX;
  const dy = endY - startY;
  const mirror = dx > 8;
  const lean = Math.atan2(-dy, Math.abs(dx) + 1); // 對手在上方時為正
  const tilt = Math.max(0, Math.min(0.65, lean * 0.7));
  return { x, y, unit, rotation: tilt * frame.tilt, mirror };
}

export default function BeastRigStage({ rig, playKey, delayMs = 0, onReady, onFrame, seek = null }: {
  rig: BeastRig;
  /** 每次出擊換一個數字（用戰局 revision）；null＝待命，不畫 */
  playKey: number | null;
  /** 這次出擊在戰報裡的起跑延遲（毫秒），與卡片衝鋒的 --action-delay 同一份 */
  delayMs?: number;
  onReady?: (ok: boolean) => void;
  /** 可選：每幀回報進度 0..1（測試與預覽頁用；不得拿來決定結果） */
  onFrame?: (t: number) => void;
  /** 預覽頁用：給 0..1 就靜態畫出那一刻（不播放、不計時）。戰場上一律不傳。 */
  seek?: number | null;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const shadow = useRef<HTMLSpanElement>(null);
  const images = useRef<Map<RigFrameId, HTMLImageElement>>(new Map());
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const [loaded, setLoaded] = useState(false);

  // 掛載：載入全部關鍵幀（一次）
  useEffect(() => {
    let cancelled = false;
    let pending = rig.frames.length;
    let failed = false;
    const map = new Map<RigFrameId, HTMLImageElement>();
    for (const spec of rig.frames) {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (cancelled) return;
        map.set(spec.id, image);
        if (--pending === 0 && !failed) { images.current = map; setLoaded(true); onReady?.(true); }
      };
      image.onerror = () => { if (!cancelled && !failed) { failed = true; onReady?.(false); } };
      image.src = rigFrameUrl(rig, spec.id);
    }
    return () => { cancelled = true; };
    // rig 與 onReady 在整個掛載期間不變
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig.dir]);

  // 舞台尺寸跟著視窗
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      size.current = { w, h, dpr };
      el.width = Math.max(1, Math.round(w * dpr));
      el.height = Math.max(1, Math.round(h * dpr));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // 畫一幀（播放與預覽共用）
  const draw = (t: number, geometry: BeastRigGeometry) => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const { w, h, dpr } = size.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const frame = strikeFrame(t);
    const place = placeRig(geometry, frame);
    const norms = new Map(rig.frames.map((f) => [f.id, f.norm] as const));
    ctx.save();
    ctx.translate(place.x, place.y);
    ctx.rotate(place.rotation * (place.mirror ? 1 : -1));
    ctx.scale(place.mirror ? -1 : 1, frame.squash);
    for (const layer of frame.layers) {
      const image = images.current.get(layer.frame);
      if (!image) continue;
      const dh = place.unit * (norms.get(layer.frame) ?? 1);
      const dw = (image.naturalWidth / image.naturalHeight) * dh;
      ctx.globalAlpha = layer.alpha * frame.alpha;
      // 腳底錨點：圖的下緣中間偏上，讓縱躍與縮放以腳為軸
      ctx.drawImage(image, -dw * 0.5, -dh * 0.92, dw, dh);
    }
    ctx.restore();
    if (frame.flash > 0) {
      // 咬合瞬間的白閃（只給畫面用）
      const fx = geometry.to.cx;
      const fy = geometry.to.top + geometry.to.height * 0.62;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, geometry.to.width * 0.9);
      g.addColorStop(0, `rgba(255,244,214,${0.7 * frame.flash})`);
      g.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (shadow.current) {
      const lift = Math.min(1, frame.travel.hop * 2.2);
      const startY = geometry.from.top + geometry.from.height * 0.7;
      const endY = geometry.to.top + geometry.to.height * 0.82;
      const base = startY + (endY - startY) * frame.travel.progress;
      const sw = place.unit * 1.25 * (1 - 0.35 * lift);
      shadow.current.style.opacity = String(0.5 * frame.alpha * (1 - 0.6 * lift));
      shadow.current.style.transform = `translate(${place.x - sw / 2}px, ${base - sw * 0.06}px)`;
      shadow.current.style.width = `${sw}px`;
      shadow.current.style.height = `${sw * 0.16}px`;
    }
  };

  // 播放：每次 playKey 換成新的數字就從頭跑一次；預覽模式只畫指定那一刻
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    clearTimeout(timer.current);
    const root = stage.current;
    if (!root || !loaded) return;

    const measure = (): BeastRigGeometry | null => {
      const mine = document.querySelector('[data-dock-card][data-active="true"] [data-card-thumbnail]') ?? document.querySelector('[data-dock-card][data-active="true"]');
      const foe = document.querySelector('[data-fighter="opponent"] [data-art-slot]');
      return mine && foe ? { arenaWidth: Math.min(window.innerWidth, 640), from: toRect(mine), to: toRect(foe) } : null;
    };
    const clear = () => {
      const el = canvas.current;
      el?.getContext('2d')?.clearRect(0, 0, el.width, el.height);
      root.dataset.rigActive = 'false';
      if (shadow.current) shadow.current.style.opacity = '0';
    };

    if (seek !== null) {
      const geometry = measure();
      if (geometry) draw(seek, geometry);
      return;
    }
    if (playKey === null) return;

    const run = () => {
      const geometry = measure();
      if (!geometry) return;
      const startedAt = performance.now();
      root.dataset.rigActive = 'true';
      const step = (now: number) => {
        const t = Math.min(1, (now - startedAt) / RIG_STRIKE_MS);
        draw(t, geometry);
        onFrame?.(t);
        if (t < 1) raf.current = requestAnimationFrame(step);
        else clear();
      };
      raf.current = requestAnimationFrame(step);
    };
    timer.current = setTimeout(run, Math.max(0, delayMs));
    return () => { cancelAnimationFrame(raf.current); clearTimeout(timer.current); clear(); };
    // draw 只讀 ref 與 rig，不放進依賴
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey, delayMs, rig, onFrame, seek, loaded]);

  return (
    <div ref={stage} data-rig-stage data-rig-active="false" aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      <span ref={shadow} data-rig-shadow
        style={{ position: 'absolute', left: 0, top: 0, opacity: 0, borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(0,0,0,.55), rgba(0,0,0,0) 70%)', willChange: 'transform, opacity' }} />
      <canvas ref={canvas} data-rig-canvas style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
