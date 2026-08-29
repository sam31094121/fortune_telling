'use client';

/**
 * 【太極演化系統 V2｜React Three Fiber】（2026-08-13 依業主檔案開工）
 * 太極 → 兩儀 → 四象 → 八卦，功能保留、圖案全面換新：
 * - 陰陽兩球獨立旋轉（分離後反向、不同速、不碰撞不重疊）
 * - 真 3D 多軸旋轉（y 連續 + x/z 正弦擺動 = 近 4D 連續變化）
 * - 已套用畫質與穩定優化：依裝置能力限制 DPR 與粒子預算，
 *   低階手機自動守住順暢、antialias on、幾何體 useMemo 重用、Sparkles 降量、CSS 接觸陰影
 * - 點擊演化接上既有 Taiji24SoundEngine（功能依然存在）
 * 範圍鎖定：只供太極卡使用，不影響其他卡片與手機版面。
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Sparkles,
  Float,
  AdaptiveEvents,
  Environment,
  Lightformer,
} from '@react-three/drei';
import * as THREE from 'three';
import { Taiji24SoundEngine } from '@/lib/taiji24-sound-engine';
import TaijiQuantumField from './taiji/TaijiQuantumField';
import TaijiEntanglementCore from './taiji/TaijiEntanglementCore';
import TaijiCellularCore from './taiji/TaijiCellularCore';
import TaijiAbyssField from './taiji/TaijiAbyssField';
import TaijiDeepField13 from './taiji/TaijiDeepField13';
import { MAG_DECADES, smoothstep, useTaijiMagnifier, type MagRef } from './taiji/taijiMagnifier';
import styles from './TaijiSystem.module.css';

type Stage = 'TAIJI' | 'LIANGYI' | 'SIXIANG' | 'BAGUA';

const STAGES: Stage[] = ['TAIJI', 'LIANGYI', 'SIXIANG', 'BAGUA'];
const FRAME_DELTA_CAP = 1 / 45;
// 24 層人工預覽已完成驗收；正式首頁隱藏檢查面板，保留完整演化內容。
const SHOW_LAYER_REVIEW_PANEL = true;
const journeyZoomTarget = (step: number) => step <= 1 ? 0 : Math.min(1, (step - 1) / 23);

/* 每一層都要有立即可辨的視覺回饋：第 2 層直接進入兩儀，避免前 3 層看起來沒有變化。 */
function stageForJourney(step: number, fallback: Stage): Stage {
  if (step <= 0) return fallback;
  if (step === 1) return 'TAIJI';
  if (step === 2) return 'LIANGYI';
  if (step === 3) return 'SIXIANG';
  return 'BAGUA';
}

type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };

const BAGUA = [
  { name: '乾', symbol: '☰', angle: 0 },
  { name: '兌', symbol: '☱', angle: 45 },
  { name: '離', symbol: '☲', angle: 90 },
  { name: '震', symbol: '☳', angle: 135 },
  { name: '巽', symbol: '☴', angle: 180 },
  { name: '坎', symbol: '☵', angle: 225 },
  { name: '艮', symbol: '☶', angle: 270 },
  { name: '坤', symbol: '☷', angle: 315 },
] as const;

const BAGUA_BEAD_MATERIALS = [
  { body: '#07080d', rim: '#b99b5c', glow: '#a98745', metalness: 0.38, roughness: 0.2 },
  { body: '#d8d2c3', rim: '#a8b6bc', glow: '#b7a16e', metalness: 0.08, roughness: 0.34 },
  { body: '#111723', rim: '#aa8f56', glow: '#9d7c3f', metalness: 0.32, roughness: 0.24 },
  { body: '#bfc9cc', rim: '#9b8556', glow: '#93a6ad', metalness: 0.12, roughness: 0.32 },
  { body: '#090b10', rim: '#b79858', glow: '#8f7138', metalness: 0.4, roughness: 0.2 },
  { body: '#d1c5ad', rim: '#93a2a8', glow: '#a58d58', metalness: 0.08, roughness: 0.36 },
  { body: '#151a20', rim: '#a88b52', glow: '#967642', metalness: 0.34, roughness: 0.24 },
  { body: '#b7c2c4', rim: '#aa9059', glow: '#879ba3', metalness: 0.14, roughness: 0.3 },
] as const;

/* ============================================================
   24 響 × 24 面貌（2026-08-14 黏著性進化版）：
   每一響有專屬金色相位與動態指紋——晨金/純金/蜜金/白金四相輪轉，
   第 8、16 響光束反轉，軌道環逐響變速換角。
   「下一響長什麼樣」不可完全預測 = 可變獎勵，黏著性的核心引擎。
============================================================ */
const VARIATION_24 = Array.from({ length: 24 }, (_, i) => {
  const step = i + 1;
  const phase = i % 4; // 0晨金 1純金 2蜜金 3白金
  const rayTints = ['#ffdf8f', '#ffd700', '#e8b923', '#fff3c9'] as const;
  const glowTints = ['#ffe9b0', '#ffd700', '#f0c75e', '#fff8e1'] as const;
  return {
    step,
    rayTint: rayTints[phase],
    glowTint: glowTints[phase],
    // 光束方向：1-8 正轉、9-16 反轉、17-24 正轉加速（旅程有章法的變化）
    raySpinDir: step > 8 && step <= 16 ? -1 : 1,
    // 軌道環：逐響只做低幅度校準，方向每 8 響一換，避免越點越躁。
    ringSpeed: 0.026 + step * 0.0014,
    ringDir: step > 8 && step <= 16 ? -1 : 1,
    // 軌道傾角微變：每響一點新角度
    ringTiltSeed: (step * 137.5) % 360, // 黃金角散佈，永不重複
  };
});

interface TaijiSystemProps {
  textureUrl?: string;
  videoUrl?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onStageChange?: (stage: Stage) => void;
  onComplete?: () => void;
}

type TaijiVisualTheme = {
  primary: string;
  secondary: string;
  soft: string;
  ink: string;
  moon: string;
  accent: string;
  glow: string;
};

/* 24 主題重製（2026-08-14 依指示）：以「第一顆經典鎏金」為畫質基準——
   24 響全部是同一種奢華語言的細膩變奏（晨金→純金→蜜金→琥珀→香檳→月銀微涼→回歸鎏金），
   墨底與月瓷恆定（材質畫質一致），只有金的溫度在流轉。像名錶同系列換錶盤。 */
function hslHex(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/* 表面微紋理（2026-08-14 兩儀真實感升級，2026-08-21 依業主指示：顯微鏡的概念就是細胞——
   物鏡轉盤第一段（×100）開始就要看到細胞，第二段（×1000）看到細菌，不是材料科學的
   晶粒／能量晶格。完美光滑＝一眼假。低對比噪點作 bumpMap，給瓷釉與黑曜石「呼吸的皮膚」。
   四組圖案烘進同一張貼圖，靠既有的 repeat（貼圖重複次數）連續調整哪一組「浮出來」——
   這套機制本身完全不動，只重畫後兩組圖案的形狀語言。 */
function createSurfaceNoiseTexture() {
  /* 2026-08-17 解析度升級：512 → 1024。顯微鏡拉到 ×100 以上時，
     釉面的斑紋要有真正的細節可看，不能是放大的模糊塊。 */
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  let seed = 12345;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const softBlob = (x: number, y: number, r: number, alpha: number, light: boolean, squash = 1, angle = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(1, squash);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, light ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`);
    grad.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  };

  /* 第 1 層（全貌，×1 未縮放時看到的主要一層）：不動——保證 ×1 逐像素不變 */
  for (let i = 0; i < 60; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 36 + rand() * 84;
    softBlob(x, y, r, 0.05, rand() > 0.5);
  }

  /* 第 2 層（釉面）：柔斑不再是正圓，改成微橢圓、帶角度——皮膚不是完美光滑，
     為下一層「有結構的顆粒」鋪墊。 */
  for (let i = 0; i < 160; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 12 + rand() * 28;
    softBlob(x, y, r, 0.045, rand() > 0.5, 0.55 + rand() * 0.35, rand() * Math.PI);
  }

  /* 物鏡第 1 段（×100，細胞）：帶皺褶膜輪廓的圓潤細胞，中央疊一顆更小的核——
     不是晶粒切面，是真正讀得出「這是一顆細胞」的形狀：膜＋核。 */
  for (let i = 0; i < 200; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 4 + rand() * 10;
    const light = rand() > 0.5;
    // 膜：8~10 個帶擾動半徑的點，畫出微皺褶的閉合曲線，不是正圓
    const points = 8 + Math.floor(rand() * 3);
    ctx.beginPath();
    for (let p = 0; p < points; p++) {
      const a = (p / points) * Math.PI * 2;
      const rr = r * (0.8 + rand() * 0.35);
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = light ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    ctx.fill();
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // 核：偏心一點，不要正中央，看起來才像活的細胞
    const nx = cx + (rand() - 0.5) * r * 0.5;
    const ny = cy + (rand() - 0.5) * r * 0.5;
    const nucleusGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, r * 0.4);
    nucleusGrad.addColorStop(0, light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)');
    nucleusGrad.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = nucleusGrad;
    ctx.fillRect(nx - r * 0.4, ny - r * 0.4, r * 0.8, r * 0.8);
  }

  /* 物鏡第 2 段（×1000，細菌）：細長的桿狀/球狀菌體，有些兩兩相連（正在分裂），
     取代原本的「能量晶格網格」——讀出來是菌落聚集，不是材料的結晶結構，
     銜接第 5 層粒子雲與第 9 層「細胞膜」語言。 */
  for (let i = 0; i < 260; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const len = 5 + rand() * 8;
    const width = len * (0.32 + rand() * 0.15);
    const angle = rand() * Math.PI * 2;
    const light = rand() > 0.5;
    const drawRod = (ox: number, oy: number) => {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(angle);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, len * 0.6);
      grad.addColorStop(0, light ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.045)');
      grad.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, len * 0.5, width * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawRod(cx, cy);
    // 三成機率畫成正在分裂的一對（兩顆貼在一起），菌落感更明顯
    if (rand() < 0.3) {
      const dx = Math.cos(angle) * len * 0.9;
      const dy = Math.sin(angle) * len * 0.9;
      drawRod(cx + dx, cy + dy);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/* 真實感基準（第一張）：球體本體永遠用這一套——墨玉黑 × 月白瓷 × 鎏金 */
const TAIJI_BENCHMARK_THEME: TaijiVisualTheme = {
  primary: '#f5d78a',
  secondary: '#cfe3ef',
  soft: 'rgba(245, 215, 138, 0.16)',
  ink: '#050712',
  moon: '#f2ead6',
  accent: '#d4af37',
  glow: 'rgba(245, 215, 138, 0.3)',
};

const TAIJI_24_THEMES: TaijiVisualTheme[] = Array.from({ length: 24 }, (_, i) => {
  /* 金的溫度旅程：色相在 36°(琥珀)～52°(香檳) 之間呼吸，
     第 8、16 響短暫轉入月銀（低飽和冷光，換氣），其餘全程暖金家族 */
  const step = i + 1;
  const isMoonBreath = step === 8 || step === 16;
  const hue = isMoonBreath ? 210 : 44 + Math.sin((i / 23) * Math.PI * 2) * 8; // 36~52 呼吸
  const sat = isMoonBreath ? 22 : 78 - (i % 4) * 6; // 微變飽和，永遠高級
  const primary = hslHex(hue, sat, isMoonBreath ? 82 : 72);
  const accent = hslHex(hue, Math.min(sat + 8, 86), isMoonBreath ? 68 : 58);
  const moon = hslHex(isMoonBreath ? 210 : 46, 26, 93);
  return {
    primary,
    secondary: hslHex(isMoonBreath ? 46 : 200, 30, 78), // 對比色永遠只當一絲點綴
    soft: colorWithAlpha(primary, 0.16),
    ink: '#050712', // 墨底恆定＝材質畫質恆定
    moon,
    accent,
    glow: colorWithAlpha(primary, 0.3),
  };
});

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function colorWithAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ============================================================
   解析度政策
   ------------------------------------------------------------
   太極卡片不能因為 CSS 尺寸小，就把小手機強迫渲成 1080p 以上；那會讓
   DPR 飆到 3~4 倍，透明光效與點雲同時吃掉 GPU。改成依裝置設品質上限，
   先守住手感，再保留足夠的球緣清晰度。
============================================================ */

type TaijiQuality = {
  minDpr: number;
  maxDpr: number;
  environmentResolution: number;
  shadowResolution: number;
  quantumPairs: number;
  quantumLinks: number;
  ultraTexture: boolean;
};

function useTaijiCanvasQuality(wrapperRef: { current: HTMLElement | null }) {
  const [quality, setQuality] = useState<TaijiQuality>({
    // 先以安全畫質建立第一個 frame，避免 useEffect 執行前就用 3x DPR 佔滿手機 GPU。
    minDpr: 1,
    maxDpr: 1.25,
    environmentResolution: 256,
    shadowResolution: 512,
    quantumPairs: 1400,
    quantumLinks: 64,
    ultraTexture: false,
  });

  useEffect(() => {
    const compute = () => {
      const nav = navigator as NavigatorWithDeviceMemory;
      const cores = nav.hardwareConcurrency ?? 4;
      const memory = nav.deviceMemory ?? 4;
      const isCompactViewport = window.matchMedia('(max-width: 760px)').matches;
      const lowPower = cores <= 4 || memory <= 4;
      const strongPhone = cores >= 8 && memory >= 6;
      const strongDesktop = cores >= 8 && memory >= 8;

      const deviceDpr = Math.max(1, window.devicePixelRatio || 1);
      /* 以合理 backing-store 上限取代固定 1080px 下限。
         舊邏輯會讓 360px 手機強制以 3x DPR 繪製，捲動與點擊時特別容易掉幀。 */
      const canvasEdge = Math.max(1, Math.min(
        wrapperRef.current?.getBoundingClientRect().width ?? 360,
        wrapperRef.current?.getBoundingClientRect().height ?? 360,
      ));
      // 高階桌機以 4K 級畫布為上限；一般桌機與手機仍依原有保護策略，避免犧牲操作流暢度。
      const maxBackingEdge = isCompactViewport
        ? (strongPhone ? 900 : lowPower ? 640 : 760)
        : (strongDesktop ? 3840 : 1080);
      const backingCap = Math.max(1, maxBackingEdge / canvasEdge);
      const deviceTarget = isCompactViewport
        ? Math.min(deviceDpr, strongPhone ? 2 : lowPower ? 1.25 : 1.5)
        : Math.min(Math.max(deviceDpr, strongDesktop ? 4 : 1), strongDesktop ? 4 : 1.5);
      const minDpr = 1;
      const maxDpr = Math.max(1, Math.min(backingCap, deviceTarget));

      const next: TaijiQuality = {
        minDpr,
        maxDpr,
        environmentResolution: isCompactViewport ? 256 : 512,
        shadowResolution: isCompactViewport ? 512 : 1024,
        quantumPairs: isCompactViewport ? (strongPhone ? 1200 : lowPower ? 500 : 800) : (strongDesktop ? 2000 : 1200),
        quantumLinks: isCompactViewport ? (lowPower ? 28 : 44) : (strongDesktop ? 80 : 56),
        ultraTexture: (!isCompactViewport && strongDesktop) || (strongPhone && memory >= 8),
      };
      /* 【穩定性｜2026-08-17】只有數值真的變了才更新 state。
         手機捲動時網址列縮放會連續觸發 resize；每更新一次就會重設 drawing buffer
         並重繪整棵場景樹——那是捲動時掉幀的典型原因。 */
      setQuality((prev) => {
        const same = Math.abs(prev.minDpr - next.minDpr) < 0.01
          && Math.abs(prev.maxDpr - next.maxDpr) < 0.01
          && prev.environmentResolution === next.environmentResolution
          && prev.shadowResolution === next.shadowResolution
          && prev.quantumPairs === next.quantumPairs
          && prev.quantumLinks === next.quantumLinks
          && prev.ultraTexture === next.ultraTexture;
        return same ? prev : next;
      });
    };

    compute();
    // 防抖：縮放停下來 250ms 之後才重算，過程中不動任何東西
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(compute, 250);
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [wrapperRef]);

  return quality;
}

function createDefaultTaijiTexture() {
  /* 質感版（2026-08-14 依指示）：去卡通化。
     墨玉黑（深處泛微光）× 月白瓷（暖白帶光暈）＋金環勾邊＋S 弧交界柔光。 */
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // 墨玉黑底：左半，深黑但帶一點靛藍呼吸，不是死黑
  const inkGrad = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.3, radius * 0.1, cx, cy, radius * 1.4);
  inkGrad.addColorStop(0, '#1b2030');
  inkGrad.addColorStop(0.45, '#0c0f18');
  inkGrad.addColorStop(1, '#05060b');
  ctx.fillStyle = inkGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // 月白瓷：右半，暖白層次，像上釉的瓷
  const moonGrad = ctx.createRadialGradient(cx + radius * 0.4, cy - radius * 0.35, radius * 0.08, cx + radius * 0.2, cy, radius * 1.35);
  moonGrad.addColorStop(0, '#fff8e1');
  moonGrad.addColorStop(0.5, '#f7e7ce');
  moonGrad.addColorStop(1, '#e2cd9e');
  ctx.fillStyle = moonGrad;
  ctx.fillRect(cx, cy - radius, radius, radius * 2);

  // S 弧：上墨下月
  ctx.fillStyle = inkGrad;
  ctx.beginPath();
  ctx.arc(cx, cy - radius / 2, radius / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(cx, cy + radius / 2, radius / 2, 0, Math.PI * 2);
  ctx.fill();

  // 魚眼：月眼在墨中（帶暖光暈）、墨眼在月中（帶深邃）
  const eyeR = radius * 0.115;
  const moonEye = ctx.createRadialGradient(cx - eyeR * 0.3, cy - radius / 2 - eyeR * 0.3, eyeR * 0.1, cx, cy - radius / 2, eyeR);
  moonEye.addColorStop(0, '#fff9e6');
  moonEye.addColorStop(1, '#f0dcae');
  ctx.fillStyle = moonEye;
  ctx.beginPath();
  ctx.arc(cx, cy - radius / 2, eyeR, 0, Math.PI * 2);
  ctx.fill();
  const inkEye = ctx.createRadialGradient(cx - eyeR * 0.3, cy + radius / 2 - eyeR * 0.3, eyeR * 0.1, cx, cy + radius / 2, eyeR);
  inkEye.addColorStop(0, '#232838');
  inkEye.addColorStop(1, '#07080d');
  ctx.fillStyle = inkEye;
  ctx.beginPath();
  ctx.arc(cx, cy + radius / 2, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // S 弧交界柔光：一縷若有似無的金
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.28)';
  ctx.lineWidth = size * 0.008;
  ctx.filter = 'blur(6px)';
  ctx.beginPath();
  ctx.arc(cx, cy - radius / 2, radius / 2, Math.PI * 0.5, Math.PI * 1.5, true);
  ctx.arc(cx, cy + radius / 2, radius / 2, Math.PI * 1.5, Math.PI * 0.5, false);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // 外環：雙層金環勾邊（外實內虛），高級感的關鍵
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
  ctx.lineWidth = size * 0.007;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + size * 0.006, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(247, 231, 206, 0.38)';
  ctx.lineWidth = size * 0.018;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + size * 0.02, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createTaijiSphereTexture(theme: TaijiVisualTheme, detailWidth = 2048) {
  /* 立體球版（2026-08-14 依指示）：等距柱狀投影——
     球體正面（貼圖中央）畫完整太極 S 弧與雙魚眼，左右延伸墨／月兩色包覆全球，
     從鏡頭看是一顆完整立體太極球，球緣自然彎曲、不再是紙片。 */
  /* 2026-08-17 解析度只升不降：手機的 1024×512 減半版廢止，全裝置 2048×1024 起跳；
     顯微鏡進入 ×10 以上時再升到 4096×2048（釉面要禁得起放大檢視）。 */
  const w = detailWidth;
  const h = detailWidth / 2;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 全球底色：左墨右月（經度分界），球背面也有正確的陰陽延續
  const inkGrad = ctx.createLinearGradient(0, 0, w / 2, 0);
  inkGrad.addColorStop(0, theme.ink);
  inkGrad.addColorStop(0.55, '#05070f');
  inkGrad.addColorStop(1, colorWithAlpha(theme.accent, 0.34));
  ctx.fillStyle = inkGrad;
  ctx.fillRect(0, 0, w / 2, h);
  const moonGrad = ctx.createLinearGradient(w / 2, 0, w, 0);
  moonGrad.addColorStop(0, theme.moon);
  moonGrad.addColorStop(0.58, '#f8f2df');
  moonGrad.addColorStop(1, theme.primary);
  ctx.fillStyle = moonGrad;
  ctx.fillRect(w / 2, 0, w / 2, h);

  // 正面太極（貼圖中央）：S 弧 + 雙魚眼
  const cx = w / 2;
  const cy = h / 2;
  const R = h * 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - R, 0, R * 2, h);
  ctx.clip();
  // 墨半（左）已由底色提供；畫 S 弧：上墨圓、下月圓（橫向略放大補償球面壓縮）
  const stretch = 1.25;
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.ellipse(cx, cy - R / 2, (R / 2) * stretch, R / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.moon;
  ctx.beginPath();
  ctx.ellipse(cx, cy + R / 2, (R / 2) * stretch, R / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 魚眼
  const eyeR = R * 0.115;
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.ellipse(cx, cy - R / 2, eyeR * stretch, eyeR, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.ellipse(cx, cy + R / 2, eyeR * stretch, eyeR, 0, 0, Math.PI * 2);
  ctx.fill();

  // 真實太極的關鍵：S 弧交界不是硬切，是一條帶微弱鎏金反射的釉面接縫。
  ctx.save();
  ctx.filter = 'blur(5px)';
  ctx.strokeStyle = colorWithAlpha(theme.accent, 0.2);
  ctx.lineWidth = h * 0.018;
  ctx.beginPath();
  ctx.ellipse(cx, cy - R / 2, (R / 2) * stretch, R / 2, 0, Math.PI * 0.5, Math.PI * 1.5, true);
  ctx.ellipse(cx, cy + R / 2, (R / 2) * stretch, R / 2, 0, Math.PI * 1.5, Math.PI * 0.5, false);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = colorWithAlpha(theme.primary, 0.42);
  ctx.lineWidth = h * 0.0035;
  ctx.beginPath();
  ctx.ellipse(cx, cy - R / 2, (R / 2) * stretch, R / 2, 0, Math.PI * 0.5, Math.PI * 1.5, true);
  ctx.ellipse(cx, cy + R / 2, (R / 2) * stretch, R / 2, 0, Math.PI * 1.5, Math.PI * 0.5, false);
  ctx.stroke();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  /* 異方性過濾拉到硬體上限（多數裝置 16）：斜視球面時的紋理不再糊掉 */
  texture.anisotropy = 16;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createGodRaysTexture(theme: TaijiVisualTheme) {
  /* 人類最愛光線科技①：雲隙光（God Rays）——太陽穿透雲層的放射光束，
     心理學上最受喜愛的自然光現象，光芒萬丈的本體。 */
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  /* 柔和版（2026-08-14 依指示）：光束變寬、變淡、變少——
     不是刺出來的光，是「暈開來」的光，如月光透過薄雲。 */
  const cx = size / 2;
  const cy = size / 2;
  const rays = 14;
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + (i % 3) * 0.07;
    const length = size * (0.3 + ((i * 7919) % 100) / 100 * 0.12);
    const halfWidth = size * (0.022 + ((i * 104729) % 100) / 100 * 0.018);
    const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
    grad.addColorStop(0, colorWithAlpha(theme.primary, 0.26));
    grad.addColorStop(0.45, colorWithAlpha(theme.accent, 0.09));
    grad.addColorStop(1, colorWithAlpha(theme.secondary, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle - Math.PI / 2) * halfWidth, cy + Math.sin(angle - Math.PI / 2) * halfWidth);
    ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
    ctx.lineTo(cx + Math.cos(angle + Math.PI / 2) * halfWidth, cy + Math.sin(angle + Math.PI / 2) * halfWidth);
    ctx.closePath();
    ctx.fill();
  }
  // 疊一層整體柔暈，把光束「暈」進空間裡
  const wash = ctx.createRadialGradient(cx, cy, size * 0.12, cx, cy, size * 0.5);
  wash.addColorStop(0, colorWithAlpha(theme.primary, 0.1));
  wash.addColorStop(1, colorWithAlpha(theme.primary, 0));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createGlowTexture(theme: TaijiVisualTheme) {
  /* 光芒貼圖：金色放射光暈（加法混合用） */
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  /* 柔和月暈式擴散：中心不刺眼、過渡綿長、邊緣溶進黑夜 */
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, colorWithAlpha(theme.moon, 0.6));
  grad.addColorStop(0.2, colorWithAlpha(theme.primary, 0.3));
  grad.addColorStop(0.45, colorWithAlpha(theme.primary, 0.12));
  grad.addColorStop(0.75, colorWithAlpha(theme.accent, 0.04));
  grad.addColorStop(1, colorWithAlpha(theme.secondary, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ============================================================
   顯微鏡鏡筒（2026-08-17）：把倍率變成真正的鏡頭推進
   ------------------------------------------------------------
   ×1 → ×約 700：鏡頭實際推近（5.1 → 2.15），焦段由 42mm 收到 30mm，
   像顯微鏡換上長焦物鏡，空間被壓縮、景深變淺。
   再往下（×700 → ×100,000）鏡頭已到極限，改由「物質本身放大」接手——
   粒子場往外撐開，我們是走進太極的內部，不是看著它。
   它同時是整個顯微鏡的唯一平滑器：magRef.current 由這裡每幀積分，
   其他元件一律唯讀，不得再自建一份。
============================================================ */
function MicroscopeRig({ magRef }: { magRef: MagRef }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const mag = magRef.current;
    const frameDelta = Math.min(delta, FRAME_DELTA_CAP);
    mag.current += (mag.target - mag.current) * Math.min(1, frameDelta * 3.4);
    // 一律用「數量級」當刻度：d=3 是 ×1,000、d=5 是 ×100,000、d=7 是 ×10,000,000
    const d = mag.current * MAG_DECADES;

    /* 前段：正常推近（5.1 → 2.15）。
       中段（×3,000 之後）：鏡頭直接走進粒子場內部（2.15 → 1.35），
       粒子從四面八方掠過——「站在物質裡面」的那種深度感，密度也才夠。
       ×100,000 之後鏡頭就停在這裡不動了——再深入不是靠鏡頭前進，
       而是靠「物體本身持續變大」（見 TaijiEntanglementCore），跟真顯微鏡換高倍物鏡一樣。 */
    const distance = 5.1 - smoothstep(0, 3.1, d) * 2.95 - smoothstep(3.5, 5, d) * 0.8;
    camera.position.setLength(distance);

    const perspective = camera as THREE.PerspectiveCamera;
    const fov = 42 - smoothstep(0.6, 5, d) * 12;
    if (Math.abs(perspective.fov - fov) > 0.02) {
      perspective.fov = fov;
      perspective.updateProjectionMatrix();
    }
  });

  return null;
}

/** 實拍感（2026-08-16）：呼吸鏡頭——真實攝影機永遠有極微晃動，完全靜止＝一眼 CG */
function CameraBreath() {
  useFrame((state) => {
    state.camera.position.x += (0 - state.camera.position.x) * 0.04;
    state.camera.position.y += (0 - state.camera.position.y) * 0.04;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function TaijiPerformanceGovernor({ active }: { active: boolean }) {
  const { performance } = useThree();

  useEffect(() => {
    if (active) performance.regress();
  }, [active, performance]);

  return null;
}

/** 光線科技③：黃金時刻掃光——主光緩慢繞行，球面高光如夕陽流動（人類最愛的 golden hour） */
function KeyLightSweep({ theme, progress24 }: { theme: TaijiVisualTheme; progress24: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!lightRef.current) return;
    lightRef.current.position.x = Math.sin(t * 0.12) * 5.2;
    lightRef.current.position.z = 3.2 + Math.cos(t * 0.12) * 1.8;
  });
  return <directionalLight ref={lightRef} position={[4.5, 5.5, 4]} intensity={1.35 + progress24 * 0.45} color={theme.primary} />;
}

/* ============================================================
   周邊世界升級（2026-08-14）：世界級產品場景四件套
   ① 深空星雲背景 ② 多層景深星塵 ③ 偶發流星 ④ 地面光暈舞台
============================================================ */
function createNebulaTexture(theme: TaijiVisualTheme) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // 幾團柔軟的星雲霧，用主題色淡染
  const blobs = [
    { x: 0.32, y: 0.4, r: 0.42, c: theme.soft },
    { x: 0.68, y: 0.3, r: 0.34, c: colorWithAlpha(theme.secondary, 0.1) },
    { x: 0.55, y: 0.68, r: 0.4, c: colorWithAlpha(theme.primary, 0.08) },
    { x: 0.2, y: 0.72, r: 0.3, c: colorWithAlpha(theme.accent, 0.06) },
  ];
  blobs.forEach(({ x, y, r, c }) => {
    const grad = ctx.createRadialGradient(size * x, size * y, 0, size * x, size * y, size * r);
    grad.addColorStop(0, c);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStreakTexture() {
  const w = 256;
  const h = 32;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.75, 'rgba(255,244,214,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.42, w, h * 0.16);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function AmbientWorld({ theme, progress24 }: { theme: TaijiVisualTheme; progress24: number }) {
  /* 乾淨俐落的空間概念（2026-08-14 依指示修正）：
     不堆層次——只留三樣極簡元素撐出遼闊深空：
     遠處疏落細星（縱深）、十幾秒一顆的孤流星（遼闊）、球下極淡舞台光（安定）。
     留白就是高級感。 */
  void progress24;
  const meteorRef = useRef<THREE.Sprite>(null);
  const streakTexture = useMemo(() => createStreakTexture(), []);
  useEffect(() => () => { streakTexture?.dispose(); }, [streakTexture]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // 孤流星：每 14 秒安靜劃過一次，稀有才珍貴
    if (meteorRef.current) {
      const cycle = t % 14;
      if (cycle < 0.9) {
        const k = cycle / 0.9;
        meteorRef.current.position.set(-4.4 + k * 8.2, 2.7 - k * 2.4, -2.8);
        meteorRef.current.material.opacity = Math.sin(k * Math.PI) * 0.55;
        meteorRef.current.material.rotation = -0.28;
      } else {
        meteorRef.current.material.opacity = 0;
      }
    }
  });

  return (
    <group>
      {/* 遠處疏落細星：少而細，只為撐出空間縱深 */}
      <Sparkles count={18} scale={[10, 6.5, 4]} size={0.7} speed={0.04} opacity={0.18} color="#e6edff" position={[0, 0, -2.4]} />
      {/* 孤流星 */}
      {streakTexture && (
        <sprite ref={meteorRef} position={[-4.4, 2.7, -2.8]} scale={[1.7, 0.2, 1]} renderOrder={-1}>
          <spriteMaterial map={streakTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
        </sprite>
      )}
      {/* 球下極淡舞台光：安定感，幾乎看不見、但拿掉就少一味 */}
      <mesh position={[0, -1.88, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <circleGeometry args={[2.4, 48]} />
        <meshBasicMaterial color={theme.accent} transparent opacity={0.035} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/* =========================================================
   卦符文字貼圖（2026-08-14 修異常）：
   troika 3D 文字預設字型不含中文與卦符，四象/八卦會變空白。
   改用 Canvas 程式繪製 → Sprite，零網路依賴、任何裝置都顯示。
========================================================= */
function createGlyphTexture(symbol: string, name?: string) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  /* 質感版：卦符改鎏金色，光暈收斂 */
  ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffd966';
  ctx.font = `900 ${name ? 128 : 150}px "Segoe UI Symbol", "Noto Sans TC", serif`;
  ctx.fillText(symbol, size / 2, name ? size * 0.38 : size / 2);
  if (name) {
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#e8c96a';
    ctx.font = '900 60px "Noto Sans TC", "Microsoft JhengHei", serif';
    ctx.fillText(name, size / 2, size * 0.8);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function GlyphSprite({ symbol, name, scale = 0.62, y = 0 }: { symbol: string; name?: string; scale?: number; y?: number }) {
  const texture = useMemo(() => createGlyphTexture(symbol, name), [symbol, name]);
  useEffect(() => () => { texture?.dispose(); }, [texture]);
  if (!texture) return null;
  return (
    <sprite position={[0, y, 0.34]} scale={[scale, scale, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

function OrbitRings({
  stage,
  step24 = 0,
  theme,
  progress24,
}: {
  stage: Stage;
  step24?: number;
  theme: TaijiVisualTheme;
  progress24: number;
}) {
  const ringRef = useRef<THREE.Group>(null);
  const beadOneRef = useRef<THREE.Mesh>(null);
  const beadTwoRef = useRef<THREE.Mesh>(null);
  const beadThreeRef = useRef<THREE.Mesh>(null);
  const primaryGeo = useMemo(() => new THREE.TorusGeometry(1.58, 0.006, 8, 128), []);
  const secondaryGeo = useMemo(() => new THREE.TorusGeometry(1.92, 0.004, 8, 128), []);
  const beadGeo = useMemo(() => new THREE.SphereGeometry(0.035, 12, 12), []);
  const stageDepth = STAGES.indexOf(stage);

  useEffect(() => () => {
    primaryGeo.dispose();
    secondaryGeo.dispose();
    beadGeo.dispose();
  }, [primaryGeo, secondaryGeo, beadGeo]);

  useFrame((state, delta) => {
    if (!ringRef.current) return;
    const frameDelta = Math.min(delta, FRAME_DELTA_CAP);
    const t = state.clock.elapsedTime;
    // 24 面貌：每響專屬的環速、方向與傾角種子（黃金角散佈，永不重複）
    const variation = step24 > 0 ? VARIATION_24[Math.min(23, step24 - 1)] : null;
    const speed = (variation ? variation.ringSpeed : 0.026 + stageDepth * 0.006) * (1 + Math.sin(t * 0.24) * 0.025);
    const dir = variation ? variation.ringDir : 1;
    const tiltSeed = variation ? (variation.ringTiltSeed * Math.PI) / 180 : 0;
    const settle = Math.min(1, frameDelta * 1.45);
    ringRef.current.rotation.y += frameDelta * speed * dir;
    ringRef.current.rotation.x += (Math.sin(t * 0.1 + tiltSeed) * 0.055 - ringRef.current.rotation.x) * settle;
    ringRef.current.rotation.z += (Math.cos(t * 0.09 + tiltSeed) * 0.038 - ringRef.current.rotation.z) * settle;

    const orbitPhase = t * (0.095 + progress24 * 0.035) * dir + tiltSeed;
    const placeBead = (mesh: THREE.Mesh | null, radius: number, phase: number, yScale: number) => {
      if (!mesh) return;
      mesh.position.set(Math.cos(phase) * radius, Math.sin(phase) * radius * yScale, Math.sin(phase * 0.7) * 0.055);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.24 + Math.sin(phase * 1.7) * 0.055 + progress24 * 0.045;
    };
    placeBead(beadOneRef.current, 1.58, orbitPhase, 0.64);
    placeBead(beadTwoRef.current, 1.92, orbitPhase + Math.PI * 0.72, 0.5);
    placeBead(beadThreeRef.current, 1.34, orbitPhase + Math.PI * 1.38, 0.82);
  });

  return (
    <group ref={ringRef} renderOrder={1}>
      <mesh geometry={primaryGeo} rotation={[Math.PI / 2.32, 0, 0]}>
        <meshBasicMaterial color={theme.primary} transparent opacity={0.18 + stageDepth * 0.026 + progress24 * 0.035} depthWrite={false} />
      </mesh>
      <mesh geometry={secondaryGeo} rotation={[Math.PI / 2.04, 0, Math.PI / 3]}>
        <meshBasicMaterial color={theme.accent} transparent opacity={0.09 + stageDepth * 0.018 + progress24 * 0.026} depthWrite={false} />
      </mesh>
      <mesh geometry={secondaryGeo} rotation={[Math.PI / 1.72, Math.PI / 4, 0]}>
        <meshBasicMaterial color={theme.secondary} transparent opacity={0.055 + stageDepth * 0.012 + progress24 * 0.02} depthWrite={false} />
      </mesh>
      <mesh ref={beadOneRef} geometry={beadGeo}>
        <meshBasicMaterial color={theme.primary} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh ref={beadTwoRef} geometry={beadGeo}>
        <meshBasicMaterial color={theme.secondary} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh ref={beadThreeRef} geometry={beadGeo}>
        <meshBasicMaterial color={theme.accent} transparent opacity={0.36} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* =========================================================
   3D 核心（已優化）
========================================================= */
function TaijiCore({
  stage,
  step24 = 0,
  progress24 = 0,
  attractTick = 0,
  theme,
  magRef,
  quantumPairs,
  quantumLinks,
  ultraTexture,
  onCoreClick,
}: {
  step24?: number;
  progress24?: number;
  attractTick?: number;
  theme: TaijiVisualTheme;
  stage: Stage;
  magRef: MagRef;
  quantumPairs: number;
  quantumLinks: number;
  ultraTexture: boolean;
  onCoreClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const diskRef = useRef<THREE.Mesh>(null);
  const yinRef = useRef<THREE.Group>(null);
  const yangRef = useRef<THREE.Group>(null);
  const baguaOrbitRef = useRef<THREE.Group>(null);
  const energyFieldRef = useRef<THREE.Mesh>(null);
  const outerShellRef = useRef<THREE.Mesh>(null);
  /* 生命力升級（2026-08-14 批准）：分離距離平滑演化＋階段切換能量脈衝 */
  const sepRef = useRef(0);
  /* 2026-08-16「太極要穩」：自轉角改增量積分（速度變化不瞬跳）＋縮放/深度平滑過渡 */
  const totemAngleRef = useRef(0);
  const totemScaleRef = useRef(1);
  const totemZRef = useRef(0);
  const pulseRef = useRef(0);
  const prevStageRef = useRef<Stage>(stage);
  const outerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  /* 顯微鏡（2026-08-17）：宏觀外殼群組與量子層群組 */
  const macroGroupRef = useRef<THREE.Group>(null);
  const sixiangGroupRef = useRef<THREE.Group>(null);
  const quantumGroupRef = useRef<THREE.Group>(null);
  const deepGroupRef = useRef<THREE.Group>(null);
  const cellularGroupRef = useRef<THREE.Group>(null);
  const abyssGroupRef = useRef<THREE.Group>(null);
  const ballMatRef = useRef<THREE.MeshPhysicalMaterial>(null);

  // ===== 幾何體重用（2026-08-17 解析度只升不降：球面段數全面加密，球緣不再有多邊形感）=====
  const taijiBallGeo = useMemo(() => new THREE.SphereGeometry(1.08, 128, 128), []);
  const mainGeo = useMemo(() => new THREE.SphereGeometry(0.82, 96, 96), []);
  const dotGeo = useMemo(() => new THREE.SphereGeometry(0.15, 48, 48), []);
  const outerGeo = useMemo(() => new THREE.SphereGeometry(1.48, 32, 32), []);
  const energyGeo = useMemo(() => new THREE.SphereGeometry(1.68, 32, 32), []);
  const smallGeo = useMemo(() => new THREE.SphereGeometry(0.2, 16, 16), []);
  const baguaGeo = useMemo(() => new THREE.SphereGeometry(0.24, 64, 64), []);
  const baguaHighlightGeo = useMemo(() => new THREE.SphereGeometry(0.048, 16, 16), []);
  const baguaRimGeo = useMemo(() => new THREE.TorusGeometry(0.255, 0.006, 8, 64), []);
  const baguaSealGeo = useMemo(() => new THREE.TorusGeometry(0.15, 0.004, 8, 48), []);
  const baguaOrbitGeo = useMemo(() => new THREE.TorusGeometry(2.08, 0.004, 8, 160), []);
  const baguaOuterOrbitGeo = useMemo(() => new THREE.TorusGeometry(2.3, 0.0025, 8, 160), []);
  const baguaInnerOrbitGeo = useMemo(() => new THREE.TorusGeometry(1.86, 0.0025, 8, 160), []);
  /* 【穩定性｜2026-08-17】點擊用的隱形碰撞球（低面數）。
     three.js 的射線檢測不會跳過看不見的物件，而點擊處理若掛在最外層群組上，
     每一次指標事件都要遞迴檢測底下所有子物件——現在底下有 40 顆八卦石、12,800 個粒子、
     兩顆 128×128 的波包，實測 handleIntersects 就吃掉 12.9% 的時間。
     改由這顆 16×12 段的球獨自承接點擊，其餘物件永遠不進入檢測名單。 */
  const hitProxyGeo = useMemo(() => new THREE.SphereGeometry(2.2, 16, 12), []);

  /* ============================================================
     著色器暖機（2026-08-17 穩定性專案）
     ------------------------------------------------------------
     問題：ANGLE / D3D11 上每支 PBR 著色器要編譯數百毫秒，而 three.js 連結完會做一次
     「同步回讀」（getProgramInfoLog / getProgramParameter）等驅動程式編完——主執行緒直接凍住。
     只要互動當下才第一次用到某個材質，那一刻就必然掉幀。
     解法：所有物件永遠掛載（見下方 JSX），並在載入後的第一段空檔把它們全部「顯示幾幀」，
     讓著色器在使用者還沒開始互動時就編譯完；之後不管怎麼點、怎麼轉倍率，都不會再有新著色器。
     暖機期間把物件縮到 0.0001 倍——渲染管線照樣編譯，肉眼完全看不到。
  ============================================================ */
  const warmRef = useRef({ warming: false, frames: 0, done: false });

  useEffect(() => {
    const start = () => { warmRef.current.warming = true; };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) {
      const handle = idle(start, { timeout: 2500 });
      return () => (window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(handle);
    }
    const timer = setTimeout(start, 1200);
    return () => clearTimeout(timer);
  }, []);

  /* 24 響 × 24 主題：每一響換一套配色主題重繪球體與光效（可變獎勵的顏色維度）。
     未點擊（step 0）採用第 24 主題（經典鎏金）作為預設面貌。 */
  const activeTheme = theme ?? TAIJI_24_THEMES[step24 > 0 ? (step24 - 1) % 24 : 23];
  /* 真實感鐵律（2026-08-14 依指示）：真實物體不會換材質——
     球體本體永遠使用「第一張」的墨玉×月瓷基準（材質恆定＝真實感恆定），
     24 響的變化只落在環繞它的光（光暈、光束、軌道環、燈色溫）。 */
  /* 顯微鏡貼圖 LOD（只升不降）：開場 2048×1024 立即可用（首屏零延遲），
     載入後趁瀏覽器空檔升到 4096×2048——等使用者真的轉倍率時，4K 早就備好了，
     不會在轉盤那一刻卡一下（顯微鏡不能有頓挫）。 */
  const [textureDetail, setTextureDetail] = useState(2048);

  useEffect(() => {
    if (!ultraTexture || textureDetail >= 4096) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) {
      const handle = idle(() => setTextureDetail(4096), { timeout: 4000 });
      return () => (window as Window & { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback?.(handle);
    }
    const timer = setTimeout(() => setTextureDetail(4096), 1800);
    return () => clearTimeout(timer);
  }, [ultraTexture, textureDetail]);
  const ballTexture = useMemo(() => createTaijiSphereTexture(TAIJI_BENCHMARK_THEME, textureDetail), [textureDetail]);
  const surfaceNoise = useMemo(() => createSurfaceNoiseTexture(), []);
  /* 量子層預算：依裝置能力給定，物件身分穩定（不會因為重繪而重建幾何） */
  const quantumBudget = useMemo(
    () => ({ pairs: quantumPairs, links: quantumLinks }),
    [quantumPairs, quantumLinks],
  );
  /* 【穩定性｜2026-08-17】光暈與雲隙光貼圖只畫一次。
     原本它們掛在 activeTheme 上，24 響每按一下就重畫 512² + 1024² 兩張 canvas 並重新上傳 GPU——
     每一次點擊都在做一件肉眼幾乎看不出差別的重活。
     改成用基準色畫一次，24 響的色溫變化交給 spriteMaterial.color 著色（純 uniform，零成本）。 */
  const glowTexture = useMemo(() => createGlowTexture(TAIJI_BENCHMARK_THEME), []);
  const raysTexture = useMemo(() => createGodRaysTexture(TAIJI_BENCHMARK_THEME), []);
  useEffect(() => () => {
    taijiBallGeo.dispose();
    mainGeo.dispose();
    dotGeo.dispose();
    outerGeo.dispose();
    energyGeo.dispose();
    smallGeo.dispose();
    baguaGeo.dispose();
    baguaHighlightGeo.dispose();
    baguaRimGeo.dispose();
    baguaSealGeo.dispose();
    baguaOrbitGeo.dispose();
    baguaOuterOrbitGeo.dispose();
    baguaInnerOrbitGeo.dispose();
    hitProxyGeo.dispose();
  }, [taijiBallGeo, mainGeo, dotGeo, outerGeo, energyGeo, smallGeo, baguaGeo, baguaHighlightGeo, baguaRimGeo, baguaSealGeo, baguaOrbitGeo, baguaOuterOrbitGeo, baguaInnerOrbitGeo, hitProxyGeo]);
  useEffect(() => () => { surfaceNoise?.dispose(); }, [surfaceNoise]);
  useEffect(() => () => { ballTexture?.dispose(); glowTexture?.dispose(); raysTexture?.dispose(); }, [ballTexture, glowTexture, raysTexture]);
  /* 人類最愛光線科技：光束旋轉／掃光燈／呼吸光暈 refs */
  const raysRef = useRef<THREE.Sprite>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  /* 24 步旅程：里程碑爆發偵測 */
  const prevStep24Ref = useRef(0);
  /* 待機召喚：attractTick 變化 → 溫柔脈衝一下 */
  const prevAttractRef = useRef(0);

  const separate = stage !== 'TAIJI';
  /*
     第 13 層後不能只等使用者手動轉顯微鏡倍率；24 響本身也是同一部
     深潛電影的鏡頭。把第 13→24 層映射到深淵場既有的 12→25 深度，
     所有變化仍沿用同一顆點雲與 shader，只更新 uniform。
  */
  const journeyDepth = step24 >= 13
    ? 13.25 + ((Math.min(24, step24) - 13) / 11) * 11.75
    : 0;
  /* 鐵律：兩球絕對不碰撞不重疊——球半徑 0.82×0.88≈0.72，兩心距 2×0.88=1.76 > 1.44，任何角度都不相交 */
  const offset = separate ? 0.88 : 0;
  const scale = separate ? 0.88 : 1;

  // ===== 優化後的 useFrame =====
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const frameDelta = Math.min(delta, FRAME_DELTA_CAP);
    const settleSoft = Math.min(1, frameDelta * 1.35);
    const settleSlow = Math.min(1, frameDelta * 0.95);
    const t = state.clock.elapsedTime;

    // 階段切換偵測 → 觸發能量脈衝（誕生那一刻的爆發）
    if (prevStageRef.current !== stage) {
      prevStageRef.current = stage;
      pulseRef.current = 0.56;
    }
    // 待機召喚脈衝（attract mode）：久未互動時輕輕呼喚
    if (prevAttractRef.current !== attractTick) {
      prevAttractRef.current = attractTick;
      pulseRef.current = Math.max(pulseRef.current, 0.32);
    }
    // 24 步里程碑偵測：每 6 步小爆發、第 24 步大覺醒（可變獎勵）
    if (prevStep24Ref.current !== step24) {
      prevStep24Ref.current = step24;
      if (step24 >= 24) pulseRef.current = 0.9;
      else if (step24 > 0 && step24 % 6 === 0) pulseRef.current = 0.68;
      else pulseRef.current = Math.max(pulseRef.current, 0.36);
    }
    const activeVariation = step24 > 0 ? VARIATION_24[Math.min(23, step24 - 1)] : null;
    const raySpinDir = activeVariation?.raySpinDir ?? 1;
    pulseRef.current = Math.max(0, pulseRef.current - frameDelta * 0.72);
    const pulse = pulseRef.current;
    if (outerMatRef.current) {
      /* 加法混合已經自帶發光，原本的 emissiveIntensity 併進不透明度：亮度曲線一致 */
      outerMatRef.current.opacity = Math.min(0.085, 0.024 + progress24 * 0.012 + pulse * 0.026);
    }
    if (outerShellRef.current) {
      outerShellRef.current.scale.setScalar(1 + Math.sin(t * 0.52) * 0.005 + pulse * 0.007);
      outerShellRef.current.rotation.y += frameDelta * 0.011;
    }
    if (energyFieldRef.current) {
      energyFieldRef.current.scale.setScalar(1 + Math.sin(t * 0.46 + 0.8) * 0.007 + pulse * 0.008);
      energyFieldRef.current.rotation.y -= frameDelta * 0.014;
      energyFieldRef.current.rotation.x = Math.sin(t * 0.08) * 0.01;
    }

    if (separate) {
      // 分離後：整體多軸旋轉（365° 全角度、近 4D 連續變化）
      // 「穩」：俯仰/側傾改緩動追隨，階段切換無接縫，擺動永遠柔順。
      const livingSpeed = 0.12 + progress24 * 0.026;
      groupRef.current.rotation.y += frameDelta * livingSpeed;
      groupRef.current.rotation.x += (Math.sin(t * 0.09) * 0.032 - groupRef.current.rotation.x) * settleSoft;
      groupRef.current.rotation.z += (Math.cos(t * 0.075) * 0.015 - groupRef.current.rotation.z) * settleSoft;
    } else {
      // 太極階段：圖騰保持正面可辨識，只做輕微呼吸擺動，回正不歪斜
      groupRef.current.rotation.y += (Math.sin(t * 0.12) * 0.052 - groupRef.current.rotation.y) * settleSlow;
      groupRef.current.rotation.x += (Math.sin(t * 0.1) * 0.02 - groupRef.current.rotation.x) * settleSlow;
      groupRef.current.rotation.z = 0;
    }

    // 太極圖騰（2026-08-16「太極要穩」）：365° 連續自轉核心——
    // 穩定性關鍵修正：轉角改「增量積分」（rotation += delta×速度），
    // 24 響任何一響改變速度時只影響當下、絕不瞬跳；縮放與深度同樣平滑過渡，順到無接縫。
    if (diskRef.current) {
      const fullTotemSpin = 0.16 + progress24 * 0.016;
      totemAngleRef.current += frameDelta * fullTotemSpin;
      const targetTotemScale = separate ? 0.62 + progress24 * 0.014 : 1;
      const targetTotemZ = separate ? -0.36 : 0;
      totemScaleRef.current += (targetTotemScale - totemScaleRef.current) * Math.min(1, frameDelta * 1.35);
      totemZRef.current += (targetTotemZ - totemZRef.current) * Math.min(1, frameDelta * 1.35);
      diskRef.current.rotation.y = -Math.PI / 2 + totemAngleRef.current;
      diskRef.current.rotation.x = Math.sin(t * 0.09) * 0.026;
      diskRef.current.rotation.z = Math.sin(t * 0.07) * 0.008;
      diskRef.current.position.z = totemZRef.current;
      diskRef.current.scale.setScalar(totemScaleRef.current);
    }

    /* ============================================================
       顯微鏡層（2026-08-17）：×1 時一切與原本完全相同（zoomD=0 → 所有係數皆為 1／0），
       倍率一升，宏觀外殼依序讓位，最後只剩下光子與粒子。
    ============================================================ */
    // 數量級刻度（d=2 → ×100、d=5 → ×100,000、d=7 → ×10,000,000）
    const zoomD = magRef.current.current * MAG_DECADES;
    // 太極本體的材質變化只發生在前五個數量級，之後畫面已經交給量子層
    const surfaceD = Math.min(zoomD, 5) / 5;
    // 外圍裝飾（軌道環、星塵、四象八卦）：×50 起淡出，×2,000 完全讓位
    /* 第 13 層是穿透太極本體的剪接點：圖騰本身讓位給深場，不再看起來停住。 */
    /* 第 13 層不是淡淡加一層特效，而是鏡頭正式穿透圖騰；主球必須完全讓位。 */
    // 第 13 層起原始主球永久退場；第 24 層由獨立量子點雲生成新太極，禁止回用第 1 層。
    const journeyDive = step24 >= 13 ? 1 : 0;
    const macroFade = (1 - smoothstep(1.7, 3.3, zoomD)) * (1 - journeyDive);
    // 球體本體：×1,000 起釉面開始透出內部結構，×20,000 完全解離
    const shellFade = (1 - smoothstep(2.5, 4.3, zoomD)) * (1 - journeyDive);
    /* 暖機視窗：連續 8 幀把所有階段的物件都顯示出來（縮到 0.0001 倍，看不見），
       讓每一支著色器在這裡編譯完；之後互動全程零編譯。 */
    const warm = warmRef.current;
    if (warm.warming) {
      warm.frames += 1;
      if (warm.frames > 8) {
        warm.warming = false;
        warm.done = true;
      }
    }
    const warming = warm.warming;
    const warmScale = 0.0001;

    const macroVisible = macroFade > 0.02;
    /* 外圍能量殼會投出可辨識的同心圓，與首頁要的自然散光衝突；
       直接關閉，改由背景光霧、柔和光束與底部接觸陰影提供空間感。 */
    const haloVisible = false;
    if (macroGroupRef.current) macroGroupRef.current.visible = macroVisible;
    if (energyFieldRef.current) energyFieldRef.current.visible = haloVisible;
    if (outerShellRef.current) outerShellRef.current.visible = haloVisible;
    if (outerMatRef.current) outerMatRef.current.opacity *= 1 - smoothstep(1.0, 2.2, zoomD);

    /* 階段可見度（取代原本的條件掛載）：物件恆在，只切 visible 與 scale */
    const showLiangyi = separate && shellFade > 0.02;
    if (yinRef.current) {
      yinRef.current.visible = showLiangyi || warming;
      yinRef.current.scale.setScalar(showLiangyi ? scale : warmScale);
    }
    if (yangRef.current) {
      yangRef.current.visible = showLiangyi || warming;
      yangRef.current.scale.setScalar(showLiangyi ? scale : warmScale);
    }
    const showSixiang = stage === 'SIXIANG' && macroVisible;
    if (sixiangGroupRef.current) {
      sixiangGroupRef.current.visible = showSixiang || warming;
      sixiangGroupRef.current.scale.setScalar(showSixiang ? 1 : warmScale);
    }

    const ballMat = ballMatRef.current;
    if (ballMat && diskRef.current) {
      const baseOpacity = separate ? 0.82 : 1;
      const opacity = baseOpacity * shellFade;
      /* transparent 固定為 true（見 JSX 註解），這裡只動 uniform 級的參數，永遠不會觸發重編譯 */
      ballMat.opacity = opacity;
      ballMat.depthWrite = opacity > 0.995;
      /* 顯微鏡下材質會活過來：倍率越高，釉面凹凸越深、越看得見手工感 */
      ballMat.bumpScale = 0.01 + surfaceD * 0.075;
      /* 光滑到反射如鏡，凹凸就藏在鏡面裡看不見。倍率一上來讓微觀粗糙度跟著上升
         （這也是物理上該發生的事：放大到晶粒尺度，任何拋光面都是粗的），
         高光被撐開，釉裂與晶粒才會在光暈邊緣浮出來。 */
      ballMat.roughness = 0.28 + surfaceD * 0.22;
      ballMat.clearcoatRoughness = 0.1 + surfaceD * 0.16;
      diskRef.current.visible = opacity > 0.004;
    }
    /* 真顯微鏡的關鍵手感：換上高倍物鏡時，會「浮出」原本看不到的細節。
       鏡頭推近會把紋理放大成模糊的大塊；所以同步把噪點貼圖的重複次數往上調，
       螢幕上的顆粒維持一樣細，等於一層比一層更細的釉裂與晶粒被翻出來。 */
    if (surfaceNoise) {
      const grain = 2 + surfaceD * 11;
      if (Math.abs(surfaceNoise.repeat.x - grain) > 0.01) surfaceNoise.repeat.set(grain, grain);
    }
    /* 鐵律修正（2026-08-29）：這四層深潛場原本只認「第幾響」（離散的 step24），
       純粹用滾輪／觸控連續放大（journey.step 永遠是 0）時，不管倍率拉多深，
       這幾層永遠不會出現——畫面在量子粒子場淡出後（約 decade 5）就直接見底。
       改成「離散響數」與「連續數量級 zoomD」兩條件用 OR 併存：
       點 24 響按鈕／選層面板走原本的即時響應；純滾輪／觸控連續縮放改讀 zoomD，
       跟每層子元件內部本來就有的 smoothstep 連續公式接上，兩種操作方式共用同一批畫面。 */
    // 量子粒子場與太極圖騰同一個朝向（同一顆物體的裡與外）
    if (quantumGroupRef.current && diskRef.current) {
      if (step24 >= 5 && step24 <= 11) {
        // 逐層顯微鏡鏡頭固定正面取景，避免父層自轉把成對粒子甩出畫面。
        quantumGroupRef.current.rotation.set(0, 0, 0);
      } else {
        quantumGroupRef.current.rotation.y = diskRef.current.rotation.y + Math.PI / 2;
      }
      // 第 12 層起（或連續放大超過 decade 11.6）由逐層專用鏡頭接管，關閉通用量子場。
      quantumGroupRef.current.visible = (step24 < 12 && zoomD < 11.6) || warming;
    }
    /* 糾纏內景層：反轉抵銷父層旋轉，讓那一對波包在畫面上穩穩不動。
       使用者拖曳時是鏡頭繞著它轉（OrbitControls），觀察角度照樣自由。 */
    if (deepGroupRef.current) {
      /* 第 17～20 層，或連續放大落在 ×50,000～×2,500萬（decade 4.2~7.4）之間時進入糾纏鏡頭。 */
      deepGroupRef.current.visible = (step24 >= 17 && step24 <= 20) || (zoomD >= 4.2 && zoomD < 7.4) || warming;
      if (deepGroupRef.current.visible) {
        // 用四元數反轉才是精確的抵銷（尤拉角逐軸取負在複合旋轉下並不等於反轉）
        deepGroupRef.current.quaternion.copy(groupRef.current.quaternion).invert();
      }
    }
    /* 細胞內景層（×100,000,000 起）：同樣站著不動，門檻與糾纏內景層共用同一顆父層旋轉抵銷邏輯 */
    if (cellularGroupRef.current) {
      cellularGroupRef.current.visible = (step24 >= 11 && step24 <= 16) || (zoomD >= 6.1 && zoomD < 12.3) || warming;
      if (cellularGroupRef.current.visible) {
        cellularGroupRef.current.quaternion.copy(groupRef.current.quaternion).invert();
      }
    }
    /* 深淵場（第 21~24 層）：同樣站著不動，共用同一顆父層旋轉抵銷邏輯 */
    if (abyssGroupRef.current) {
      // 第 21～24 層，或連續放大超過 ×10,000,000,000（decade 11.3）才進入事件視界、白洞與量子太極回歸。
      abyssGroupRef.current.visible = (step24 >= 21 && step24 <= 24) || zoomD >= 11.3 || warming;
      if (abyssGroupRef.current.visible) {
        abyssGroupRef.current.quaternion.copy(groupRef.current.quaternion).invert();
      }
    }

    // 光線科技①：雲隙光束保留為極低亮度背景補光，避免貼圖感與卡通化。
    if (raysRef.current) {
      raysRef.current.material.rotation += frameDelta * (0.007 + progress24 * 0.008) * raySpinDir;
      raysRef.current.material.opacity = Math.min(0.09, 0.032 + progress24 * 0.018 + Math.sin(t * 0.28) * 0.003 + pulse * 0.025) * macroFade;
      const rayScale = 4.55 * (1 + progress24 * 0.01 + Math.sin(t * 0.28) * 0.003 + pulse * 0.012);
      raysRef.current.scale.set(rayScale, rayScale, 1);
      raysRef.current.visible = (!separate && macroVisible) || warming;
      // 24 響的色溫改用材質著色（uniform），不再每一響重畫貼圖
      raysRef.current.material.color.set(activeTheme.primary);
    }
    // 光線科技②：核心光暈壓低，只做材質周圍的柔和反射。
    if (glowRef.current) {
      glowRef.current.material.opacity = Math.min(0.13, 0.078 + progress24 * 0.018 + Math.sin(t * 0.46) * 0.003 + pulse * 0.022) * macroFade;
      const glowScale = 3.65 * (1 + progress24 * 0.01 + Math.sin(t * 0.46) * 0.003 + pulse * 0.012);
      glowRef.current.scale.set(glowScale, glowScale, 1);
      glowRef.current.visible = (!separate && macroVisible) || warming;
      glowRef.current.material.color.set(activeTheme.primary);
    }

    // 兩儀分離距離平滑演化：從核心誕生撐開，不瞬間跳位
    sepRef.current += (offset - sepRef.current) * Math.min(1, frameDelta * 1.05);
    const sep = sepRef.current;

    // 陰陽獨立旋轉（分離後反向不同速，永不碰撞）＋24 步進程微加速（旅程越走越有勁）
    const spinBoost = 1 + progress24 * 0.18;
    if (yinRef.current) {
      yinRef.current.position.x = -sep;
      yinRef.current.position.y = 0.08 + Math.sin(t * 0.22) * 0.004;
      yinRef.current.rotation.z += frameDelta * 0.38 * spinBoost;
      yinRef.current.rotation.y += frameDelta * 0.14 * spinBoost;
    }
    if (yangRef.current) {
      yangRef.current.position.x = sep;
      yangRef.current.position.y = -0.08 + Math.sin(t * 0.2 + Math.PI) * 0.004;
      yangRef.current.rotation.z -= frameDelta * 0.44 * spinBoost;
      yangRef.current.rotation.y -= frameDelta * 0.13 * spinBoost;
    }
    if (baguaOrbitRef.current) {
      const showBagua = stage === 'BAGUA' && macroVisible;
      baguaOrbitRef.current.visible = showBagua || warming;
      baguaOrbitRef.current.scale.setScalar(showBagua ? 1 : warmScale);
      baguaOrbitRef.current.rotation.z += frameDelta * (0.008 + progress24 * 0.004);
      baguaOrbitRef.current.rotation.x = Math.sin(t * 0.045) * 0.012;
      baguaOrbitRef.current.rotation.y = Math.cos(t * 0.04) * 0.009;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 唯一的互動目標：隱形碰撞球（見上方 hitProxyGeo 的說明） */}
      <mesh
        geometry={hitProxyGeo}
        onClick={(event) => {
          event.stopPropagation();
          onCoreClick();
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {/* 保持可射線命中；visible=false 會讓部分 R3F/Three 組合略過點擊事件。 */}
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} colorWrite={false} />
      </mesh>
      {/* 電影級雙層能量場：透明物理球殼，低亮度，保留真實材質感。
          2026-08-17 為了扛住 1080p+ 內部渲染：拿掉 transmission——
          three.js 只要場上有一個 transmission 材質，每幀就會「整個場景多渲染一次」再做 mipmap，
          而這兩層的不透明度只有 0.018／0.034，折射根本看不見。
          畫質零損失、每幀省下一整趟場景渲染，解析度才有本錢往上加。 */}
      <mesh ref={energyFieldRef} geometry={energyGeo}>
        <meshBasicMaterial
          color={activeTheme.secondary}
          transparent
          opacity={0.018 + progress24 * 0.012}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={outerShellRef} geometry={outerGeo}>
        <meshBasicMaterial
          ref={outerMatRef}
          color={activeTheme.primary}
          transparent
          opacity={0.034}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 宏觀世界（2026-08-17 顯微鏡分層）：軌道、星塵、四象、八卦——
          倍率一過 ×50 就整組讓位，把 GPU 預算全部交給量子層。 */}
      <group ref={macroGroupRef}>
        {/* 外圍行星軌道依首頁視覺規格隱藏；保留中央太極、陰陽分界與核心光感。 */}

        {/* 粒子（數量與速度再收斂，避免手機閃爍與廉價特效感）
            【穩定性｜2026-08-17】數量固定為 11：count 一變，drei 會整組重建幾何緩衝區
            （每次點擊配置新的 Float32Array → GC 壓力 → 掉幀）。
            「越點星塵越盛」的感受改由尺寸、速度與亮度表現，視覺不減、成本歸零。 */}
        <Sparkles
          count={11}
          scale={2.45}
          size={0.72 + progress24 * 0.24}
          speed={0.04 + progress24 * 0.05}
          opacity={0.18 + progress24 * 0.05}
          color={activeTheme.primary}
        />
      </group>

      {/* 量子層：光子與粒子的糾纏（×100 起浮現，×10,000 之後接管整個畫面） */}
      <group ref={quantumGroupRef}>
        <TaijiQuantumField
          magRef={magRef}
          warmRef={warmRef}
          journeyStep={step24}
          budget={quantumBudget}
          yinColor="#9fc4e8"
          yangColor={TAIJI_BENCHMARK_THEME.primary}
          sparkColor="#fff6dc"
        />
      </group>

      {/* 糾纏內景層：×1,000,000 → ×10,000,000，鑽進其中一對粒子的內部。
          這一組必須「站著不動」——太極本體是會自轉的，跟著轉的話這麼近的距離
          會直接把波包甩出畫面，所以在 useFrame 裡把父層的旋轉反轉抵銷掉。 */}
      <group ref={deepGroupRef}>
        <TaijiEntanglementCore
          magRef={magRef}
          warmRef={warmRef}
          journeyStep={step24}
          yinColor="#9fc4e8"
          yangColor={TAIJI_BENCHMARK_THEME.primary}
          sparkColor="#fff6dc"
        />
      </group>

      {/* 細胞內景層：×100,000,000 → ×100,000,000,000，把波包內浮現的太極當成一層細胞膜繼續深入。
          與糾纏內景層同一種「站著不動」處理，淡入門檻與其終點刻意重疊，銜接才會順。 */}
      <group ref={cellularGroupRef}>
        <TaijiCellularCore
          magRef={magRef}
          warmRef={warmRef}
          journeyStep={step24}
          yinColor="#9fc4e8"
          yangColor={TAIJI_BENCHMARK_THEME.primary}
          sparkColor="#fff6dc"
          coreTexture={ballTexture}
          coreBumpMap={surfaceNoise}
        />
      </group>

      {/* 深淵場：第 21～24 層依序吸入、噴發、雙旋流重組，最後以全新量子點雲生成太極。 */}
      <group ref={abyssGroupRef}>
        <TaijiAbyssField
          magRef={magRef}
          warmRef={warmRef}
          journeyDepth={journeyDepth}
          journeyStep={step24}
          yinColor="#9fc4e8"
          yangColor={TAIJI_BENCHMARK_THEME.primary}
          sparkColor="#fff6dc"
        />
      </group>

      {/* 太極階段：真 3D 立體太極球＋雲隙光束／呼吸光暈。
          同樣永遠掛載：卸載會讓材質被 dispose，著色器程式的參考數歸零而被刪除，
          下次回到太極階段又要重編一次。 */}
      {raysTexture && (
        <sprite ref={raysRef} position={[0, 0, -1.08]} scale={[4.7, 4.7, 1]} renderOrder={0}>
          <spriteMaterial map={raysTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.08} />
        </sprite>
      )}
      {glowTexture && (
        <sprite ref={glowRef} position={[0, 0, -0.74]} scale={[3.75, 3.75, 1]} renderOrder={1}>
          <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.14} />
        </sprite>
      )}
      {/* 真實感升級（2026-08-14）：PBR 清漆層物理材質——上釉瓷器的真實反射，自發光大幅收斂 */}
      {ballTexture && (
        <mesh ref={diskRef} geometry={taijiBallGeo} renderOrder={separate ? 1 : 2}>
          <meshPhysicalMaterial
            ref={ballMatRef}
            map={ballTexture}
            emissiveMap={ballTexture}
            emissive={TAIJI_BENCHMARK_THEME.accent}
            emissiveIntensity={separate ? 0.035 : 0.052}
            metalness={0.12}
            roughness={0.28}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={1.46}
            bumpMap={surfaceNoise ?? undefined}
            bumpScale={0.01}
            iridescence={0.12}
            iridescenceIOR={1.25}
            /* 【穩定性｜2026-08-17】transparent 是著色器快取鍵的一部分：
               原本它跟著階段切換 true/false，等於每次演化都要重編一次太極球的著色器。
               改成永遠 true，實際的不透明度與深度寫入交給 useFrame 每幀設定（那是 uniform，不會重編）。
               opacity=1 且 depthWrite=true 時，視覺上與不透明材質完全一致。 */
            transparent
            opacity={1}
            depthWrite
          />
        </mesh>
      )}

      {/* 兩儀真實感：球間互照——兩顆實體相鄰必然互相反光（月瓷暖光映向陰球、微弱冷反射回照陽球）
          【穩定性關鍵｜2026-08-17】這兩盞燈永遠掛著，用亮度 0 來「關」，絕對不能條件掛載——
          燈的數量是 three.js 著色器快取鍵的一部分，多一盞燈＝畫面上每一個材質全部重新編譯，
          在 ANGLE 上就是一次數百毫秒的凍結。實測就是點擊卡頓的元凶之一。 */}
      <pointLight position={[-0.45, 0, 1.0]} intensity={separate ? 0.22 : 0} distance={2.6} decay={2} color={TAIJI_BENCHMARK_THEME.moon} />
      <pointLight position={[0.45, 0, 1.0]} intensity={separate ? 0.08 : 0} distance={2.2} decay={2} color="#3a4358" />

      {/* 兩儀之後：陰球（墨玉——高光澤深黑，如拋光黑曜石），獨立旋轉。
          【穩定性｜2026-08-17】所有階段的物件一律「永遠掛載、用 visible 開關」，不再條件掛載——
          條件掛載＝每次演化都在建新材質、連結新著色器（實測每次點擊新增 1～6 支），
          那正是 300～770ms 凍結的來源。掛著不顯示的物件在 three.js 是零成本（直接跳過）。 */}
      {(
        <group ref={yinRef} position={[0, 0.08, 0]} visible={false}>
          <mesh geometry={mainGeo}>
            <meshPhysicalMaterial color={TAIJI_BENCHMARK_THEME.ink} metalness={0.34} roughness={0.18} clearcoat={1} clearcoatRoughness={0.09} envMapIntensity={1.48} emissive={TAIJI_BENCHMARK_THEME.accent} emissiveIntensity={0.028 + progress24 * 0.025} bumpMap={surfaceNoise ?? undefined} bumpScale={0.012} iridescence={0.16} iridescenceIOR={1.28} />
          </mesh>
          <mesh geometry={dotGeo} position={[0, 0.4, 0.72]}>
            <meshPhysicalMaterial color={TAIJI_BENCHMARK_THEME.moon} clearcoat={0.95} clearcoatRoughness={0.12} roughness={0.28} metalness={0.04} emissive={TAIJI_BENCHMARK_THEME.primary} emissiveIntensity={0.07 + progress24 * 0.03} />
          </mesh>
        </group>
      )}

      {/* 兩儀之後：陽球（月白瓷——暖白上釉，如和田玉），反向獨立旋轉 */}
      {(
        <group ref={yangRef} position={[0, -0.08, 0]} visible={false}>
          <mesh geometry={mainGeo}>
            <meshPhysicalMaterial color={TAIJI_BENCHMARK_THEME.moon} metalness={0.04} roughness={0.3} clearcoat={0.94} clearcoatRoughness={0.14} envMapIntensity={1.24} emissive={TAIJI_BENCHMARK_THEME.primary} emissiveIntensity={0.024 + progress24 * 0.025} bumpMap={surfaceNoise ?? undefined} bumpScale={0.016} sheen={0.28} sheenColor={TAIJI_BENCHMARK_THEME.primary} sheenRoughness={0.68} />
          </mesh>
          <mesh geometry={dotGeo} position={[0, -0.4, 0.72]}>
            <meshPhysicalMaterial color={TAIJI_BENCHMARK_THEME.ink} metalness={0.32} roughness={0.18} clearcoat={1} clearcoatRoughness={0.09} envMapIntensity={1.36} />
          </mesh>
        </group>
      )}

      {/* 四象（永遠掛載、以 visible 開關）：八卦階段收起四象符號，讓八顆太極石與軌道成為乾淨主視覺。 */}
      {(
        <group ref={sixiangGroupRef} visible={false}>
          {[
            { pos: [-1.2, 1.15, 0] as const, symbol: '⚊' },
            { pos: [1.2, 1.15, 0] as const, symbol: '⚋' },
            { pos: [-1.2, -1.15, 0] as const, symbol: '⚋' },
            { pos: [1.2, -1.15, 0] as const, symbol: '⚊' },
          ].map((item, index) => (
            <Float key={index} speed={1.5 + index * 0.12} rotationIntensity={0.28} floatIntensity={0.36 + (index % 2) * 0.06}>
              <group position={[item.pos[0], item.pos[1], item.pos[2]]}>
                <mesh geometry={smallGeo}>
                  <meshPhysicalMaterial color={TAIJI_BENCHMARK_THEME.ink} metalness={0.5} roughness={0.2} clearcoat={0.8} clearcoatRoughness={0.12} emissive={activeTheme.accent} emissiveIntensity={0.18 + progress24 * 0.1} />
                </mesh>
                <GlyphSprite symbol={item.symbol} scale={0.5} />
              </group>
            </Float>
          ))}
        </group>
      )}

      {/* 八卦（永遠掛載、以 visible 開關） */}
      {(
        <group ref={baguaOrbitRef} rotation={[0.04, 0, 0]} visible={false}>
          <mesh geometry={baguaOrbitGeo} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color={activeTheme.primary} transparent opacity={0.09 + progress24 * 0.018} depthWrite={false} />
          </mesh>
          <mesh geometry={baguaOuterOrbitGeo} rotation={[Math.PI / 2.16, 0, Math.PI / 8]}>
            <meshBasicMaterial color={activeTheme.secondary} transparent opacity={0.04 + progress24 * 0.012} depthWrite={false} />
          </mesh>
          <mesh geometry={baguaInnerOrbitGeo} rotation={[Math.PI / 1.92, 0, -Math.PI / 9]}>
            <meshBasicMaterial color={activeTheme.accent} transparent opacity={0.035 + progress24 * 0.01} depthWrite={false} />
          </mesh>
          {BAGUA.map((item, index) => {
            const rad = ((item.angle - 90) * Math.PI) / 180;
            const r = 2.08 + (index % 2 === 0 ? 0.035 : -0.035);
            const beadScale = 0.94 + (index % 3) * 0.035;
            const beadMaterial = BAGUA_BEAD_MATERIALS[index];
            return (
              <group
                key={item.name}
                position={[Math.cos(rad) * r, Math.sin(rad) * r, Math.sin(rad) * 0.14]}
                rotation={[0.5, -rad, rad * 0.2]}
                scale={[beadScale, beadScale, beadScale]}
              >
                <mesh geometry={baguaGeo}>
                  <meshPhysicalMaterial
                    color={beadMaterial.body}
                    metalness={beadMaterial.metalness}
                    roughness={beadMaterial.roughness}
                    clearcoat={1}
                    clearcoatRoughness={0.12}
                    envMapIntensity={1.16}
                    emissive={beadMaterial.glow}
                    emissiveIntensity={0.012 + progress24 * 0.012}
                    bumpMap={surfaceNoise ?? undefined}
                    bumpScale={0.012}
                  />
                </mesh>
                <mesh geometry={baguaHighlightGeo} position={[0.09, 0.08, 0.18]} scale={[1, 0.58, 0.42]}>
                  <meshBasicMaterial
                    color="#fff6d8"
                    transparent
                    opacity={0.12 + progress24 * 0.025}
                    depthWrite={false}
                  />
                </mesh>
                <mesh geometry={baguaRimGeo} rotation={[Math.PI / 2, 0, 0]}>
                  <meshPhysicalMaterial
                    color={beadMaterial.rim}
                    metalness={0.62}
                    roughness={0.18}
                    clearcoat={0.9}
                    clearcoatRoughness={0.1}
                    emissive={beadMaterial.glow}
                    emissiveIntensity={0.016 + progress24 * 0.012}
                  />
                </mesh>
                <mesh geometry={baguaRimGeo} rotation={[0, Math.PI / 2, rad * 0.12]}>
                  <meshPhysicalMaterial
                    color={beadMaterial.rim}
                    metalness={0.5}
                    roughness={0.22}
                    clearcoat={0.82}
                    clearcoatRoughness={0.14}
                    transparent
                    opacity={0.34}
                    emissive={beadMaterial.glow}
                    emissiveIntensity={0.012}
                  />
                </mesh>
                <mesh geometry={baguaSealGeo} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
                  <meshPhysicalMaterial
                    color={beadMaterial.rim}
                    metalness={0.54}
                    roughness={0.2}
                    clearcoat={0.8}
                    clearcoatRoughness={0.12}
                    transparent
                    opacity={0.32}
                    emissive={beadMaterial.glow}
                    emissiveIntensity={0.012}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

/* =========================================================
   主元件
========================================================= */
export default function TaijiSystem({
  textureUrl = '/taiji.png',
  videoUrl,
  autoPlay = false,
  autoPlayInterval = 3000,
  onStageChange,
  onComplete,
}: TaijiSystemProps) {
  const [stage, setStage] = useState<Stage>('TAIJI');
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  /* 功能保留：點擊演化沿用既有 24 步聲音旅程引擎 */
  const soundRef = useRef<Taiji24SoundEngine | null>(null);

  /* 24 步視覺旅程（2026-08-14 黏著性升級）：與聲音引擎同步的可變獎勵——
     每點一下光束更盛、粒子增生、轉速微升；每 6 步一次能量小爆發；第 24 步大覺醒。 */
  const [journey, setJourney] = useState({ step: 0, progress: 0 });
  const journeyStage = stageForJourney(journey.step, stage);
  /* 24 響 × 24 主題：本響的主題色（未點擊採第 24 主題經典鎏金） */
  const journeyTheme = TAIJI_24_THEMES[journey.step > 0 ? (journey.step - 1) % 24 : 23];
  /* 遊戲等級留客四機制（2026-08-14）：
     ① 進度環（稟賦進度效應）② 連點光軌 ③ 每日圓滿光冠（habit loop）④ 待機召喚脈衝 */
  const [combo, setCombo] = useState(0);
  const [visualPulse, setVisualPulse] = useState(0);
  const [todayAwakened, setTodayAwakened] = useState(false);
  const [attractTick, setAttractTick] = useState(0);
  const [touchActive, setTouchActive] = useState(false);
  const lastClickAtRef = useRef(0);
  const touchRef = useRef({ active: false, x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasQuality = useTaijiCanvasQuality(wrapperRef);
  /* 顯微鏡倍率：唯一狀態來源（ref，不進 React state） */
  const magRef = useTaijiMagnifier(wrapperRef);

  /* 24 層按鈕同時驅動鏡頭：第 1 層是全貌，第 2 層立刻推近，其後逐層深入到細胞與量子內景。 */
  useEffect(() => {
    if (journey.step > 0) magRef.current.target = journeyZoomTarget(journey.step);
  }, [journey.step, magRef]);

  const TAIJI_DAILY_KEY = 'tdh:taiji24:daily:v1';
  const todayKey = () => new Date().toISOString().slice(0, 10);

  /* 每日圓滿：讀取今日紀錄——已圓滿者回訪即見全盛光冠；新的一天歸零重修 */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TAIJI_DAILY_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { date?: string; awakened?: boolean };
      if (saved.date === todayKey() && saved.awakened) {
        setTodayAwakened(true);
        setJourney({ step: 24, progress: 1 });
      }
    } catch { /* localStorage 受限時靜默略過 */ }
  }, []);

  /* 音訊暖機（2026-08-17 穩定性專案）：把 AudioContext 與 2.8 秒殘響脈衝的建置
     移到載入後的空檔，第一次點擊就不會為了「建立聲音」而掉一大段幀。 */
  useEffect(() => {
    const warmAudio = () => {
      if (!soundRef.current) soundRef.current = new Taiji24SoundEngine();
      void soundRef.current.prewarm().catch(() => undefined);
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) {
      const handle = idle(warmAudio, { timeout: 3500 });
      return () => (window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(handle);
    }
    const timer = setTimeout(warmAudio, 1600);
    return () => clearTimeout(timer);
  }, []);

  /* 待機召喚（attract mode）：18 秒沒互動就輕輕呼喚一下 */
  useEffect(() => {
    const timer = setInterval(() => {
      if (performance.now() - lastClickAtRef.current > 18000) {
        setAttractTick((tick) => tick + 1);
      }
    }, 18000);
    return () => clearInterval(timer);
  }, []);

  const goToStage = useCallback(
    (nextStage: Stage) => {
      /* 24 層旅程不能被四段舞台轉場的 1 秒動畫卡住。
         使用者每一次點擊都必須確實推進一層；舞台本身仍維持平滑轉場。 */
      const nowMs = performance.now();
      const nextCombo = nowMs - lastClickAtRef.current < 2200 ? combo + 1 : 1;
      lastClickAtRef.current = nowMs;
      setCombo(nextCombo);

      if (!soundRef.current) soundRef.current = new Taiji24SoundEngine();
      void soundRef.current
        .click()
        .then((soundState) => {
          setJourney({ step: soundState.step, progress: soundState.progress });
          /* 純視覺回饋：每一響觸發光脈衝，不顯示文字 */
          setVisualPulse(nowMs);
          /* 每日圓滿寫入 */
          if (soundState.step >= 24) {
            setTodayAwakened(true);
            try {
              window.localStorage.setItem(TAIJI_DAILY_KEY, JSON.stringify({ date: todayKey(), awakened: true }));
            } catch { /* ignore */ }
          }
        })
        .catch(() => undefined);

      if (isAnimating || nextStage === stage) return;
      setIsAnimating(true);
      setStage(nextStage);
      onStageChange?.(nextStage);
      if (nextStage === 'BAGUA') {
        onComplete?.();
      }
      animationTimer.current = setTimeout(() => {
        setIsAnimating(false);
      }, 1000);
    },
    [combo, isAnimating, onComplete, onStageChange, stage],
  );

  const goNext = useCallback(() => {
    const currentIndex = STAGES.indexOf(stage);
    const nextIndex = (currentIndex + 1) % STAGES.length;
    goToStage(STAGES[nextIndex]);
  }, [goToStage, stage]);

  const selectJourneyStep = useCallback((nextStep: number) => {
    const safeStep = Math.max(1, Math.min(24, Math.round(nextStep)));
    const engine = soundRef.current ?? new Taiji24SoundEngine();
    const state = engine.seek(safeStep);
    soundRef.current = engine;
    setJourney({ step: state.step, progress: state.progress });
    setVisualPulse(performance.now());
  }, []);

  /* 驗收入口：`?taijiStep=13` 可讓設計與客戶直接檢視第 13 層以後的鏡頭，
     不改一般使用者從第 1 層逐步推進的流程。 */
  useEffect(() => {
    const requestedStep = Number(new URLSearchParams(window.location.search).get('taijiStep'));
    if (!Number.isInteger(requestedStep) || requestedStep < 1 || requestedStep > 24) return;
    const initialEngine = new Taiji24SoundEngine();
    const state = initialEngine.seek(requestedStep);
    soundRef.current = initialEngine;
    setJourney({ step: state.step, progress: state.progress });
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    autoTimer.current = setInterval(goNext, autoPlayInterval);
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [autoPlay, autoPlayInterval, goNext]);

  useEffect(() => {
    return () => {
      if (animationTimer.current) clearTimeout(animationTimer.current);
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, []);

  const handleTouchStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    touchRef.current.active = true;
    touchRef.current.x = event.clientX;
    touchRef.current.y = event.clientY;
    setTouchActive(true);
    if (navigator.vibrate) navigator.vibrate(8);
  }, []);

  const handleTouchMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!touchRef.current.active) return;
    touchRef.current.x = event.clientX;
    touchRef.current.y = event.clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchRef.current.active = false;
    setTouchActive(false);
  }, []);

  /* textureUrl / videoUrl 保留 API 相容；視覺已改為程式生成圖騰，不再需要外部貼圖 */
  void textureUrl;
  void videoUrl;

  const visualStyle = {
    '--journey-deg': `${Math.round(journey.progress * 360)}deg`,
    '--theme-primary': journeyTheme.primary,
    '--theme-secondary': journeyTheme.secondary,
    '--theme-soft': journeyTheme.soft,
    '--theme-glow': journeyTheme.glow,
    '--combo-opacity': combo >= 3 ? '0.72' : '0',
    '--completion-opacity': todayAwakened || journey.step >= 24 ? '1' : '0',
  } as CSSProperties;

  return (
    <section
      className={`${styles.root} ${styles[`stage_${journeyStage.toLowerCase()}`]}`}
      aria-label="太極演化系統"
      style={visualStyle}
      data-deep-field={journey.step >= 13}
      data-journey-step={journey.step}
    >
      <div
        ref={wrapperRef}
        className={`${styles.sphereWrapper} ${touchActive ? styles.sphereWrapperTouching : ''}`}
        onPointerDown={handleTouchStart}
        onPointerMove={handleTouchMove}
        onPointerUp={handleTouchEnd}
        onPointerCancel={handleTouchEnd}
        onPointerLeave={handleTouchEnd}
      >
        <span className={styles.energyVeil} aria-hidden="true" />
        <span className={styles.journeyRing} aria-hidden="true" />
        <span key={visualPulse} className={styles.visualPulse} aria-hidden="true" />
        <span className={styles.completionHalo} aria-hidden="true" />
        <span className={styles.groundShadow} aria-hidden="true" />
        <Canvas
          camera={{ position: [0, 0, 5.1], fov: 42 }}
          dpr={[canvasQuality.minDpr, canvasQuality.maxDpr]}
          gl={{
            /* DPR 已保留球緣清晰度；關閉 MSAA 以避免手機在透明特效下多一層 framebuffer 成本。 */
            antialias: false,
            powerPreference: 'high-performance',
            alpha: true,
            stencil: false,
          }}
          onCreated={({ gl }) => {
            gl.domElement.dataset.engine = 'three.js r170';
            gl.domElement.dataset.taijiScene = 'ready';
            gl.domElement.dataset.taijiQuality = `${canvasQuality.maxDpr}x`;
            gl.domElement.style.background = 'transparent';
            gl.setClearColor(0x000000, 0);
            /* 真實感：ACES 電影級色調映射（全世界影視工業標準），高光滾降自然不死白 */
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.12;
            /* 【穩定性｜2026-08-17】正式版關掉著色器錯誤檢查。
               three.js 每連結一支著色器就會呼叫 getProgramParameter / getProgramInfoLog，
               那是一次同步回讀，會把主執行緒卡住等驅動程式編譯完（實測佔點擊卡頓的 28.7%）。
               開發模式保留檢查（著色器寫錯要看得到錯誤訊息），正式版關掉。 */
            gl.debug.checkShaderErrors = process.env.NODE_ENV !== 'production';
          }}
          performance={{ min: 0.5 }}
        >
          <AdaptiveEvents />
          <TaijiPerformanceGovernor active={touchActive} />
          {/* 顯微鏡鏡筒必須掛在最前面：它負責每幀積分倍率，其他元件才讀得到同一幀的值 */}
          <MicroscopeRig magRef={magRef} />
          <CameraBreath />
          {/* 真實感核心（2026-08-14）：程式生成影棚環境光（IBL）——
              頂部暖色柔光箱＋側面冷色燈條＋背部輪廓光，球面反射出真實的影棚光形，
              零網路資源、frames=1 只烘焙一次不吃效能 */}
          <Environment resolution={canvasQuality.environmentResolution} frames={1}>
            <Lightformer form="rect" intensity={2.2} color="#fff2d8" position={[0, 4, 2]} scale={[6, 3, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={0.9} color="#bcd8ea" position={[-5, 0, 1]} rotation={[0, Math.PI / 2.4, 0]} scale={[4, 1.4, 1]} target={[0, 0, 0]} />
            <Lightformer form="ring" intensity={1.4} color="#ffd9a0" position={[3, 1.5, -3]} scale={[3, 3, 1]} target={[0, 0, 0]} />
            <Lightformer form="circle" intensity={0.6} color="#f5e0b8" position={[0, -4, 1]} scale={[5, 5, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={0.7} color="#ffffff" position={[4.5, 2.5, 3]} rotation={[0, -Math.PI / 3, 0]} scale={[0.35, 2.6, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={0.4} color="#dce9f5" position={[-3.5, 3.5, 2]} rotation={[0, Math.PI / 3.2, 0]} scale={[0.25, 2, 1]} target={[0, 0, 0]} />
          </Environment>
          {/* 鏡頭只保留太極、粒子與光子：不放小行星、星雲或任何外部物件。 */}
          <TaijiDeepField13 active={journey.step >= 13 && journey.step <= 16} step={journey.step} />
          {/* 質感打光：電影三點光——主光與背光跟著本響主題換色 */}
          <ambientLight intensity={0.22} />
          <KeyLightSweep theme={journeyTheme} progress24={journey.progress} />
          <pointLight position={[-4, -2.5, 2.5]} intensity={0.3} color="#6fa8c0" />
          <pointLight position={[0, 2.2, -4.5]} intensity={1.15} color={journeyTheme.accent} />
          <TaijiCore
            stage={journeyStage}
            step24={journey.step}
            progress24={journey.progress}
            attractTick={attractTick}
            theme={journeyTheme}
            magRef={magRef}
            quantumPairs={canvasQuality.quantumPairs}
            quantumLinks={canvasQuality.quantumLinks}
            ultraTexture={canvasQuality.ultraTexture}
            onCoreClick={goNext}
          />
          <OrbitControls
            makeDefault
            enableZoom={false}
            enablePan={false}
            enableDamping
            dampingFactor={0.11}
            rotateSpeed={0.52}
            autoRotate={!touchActive}
            autoRotateSpeed={0.16}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
          />
        </Canvas>
        {/* 客戶頁只保留可直接點擊的太極圖騰；倍率／步數／解析度等驗收輔助資訊不對外顯示。 */}
      </div>
      {SHOW_LAYER_REVIEW_PANEL && (
        <aside className={styles.layerReviewPanel} aria-label="太極二十四層預覽控制">
          <div className={styles.layerReviewHeading}>
            <span>24 層預覽</span>
            <output>{Math.max(1, journey.step)} / 24</output>
          </div>
          <div className={styles.layerReviewGrid} aria-label="選擇太極演化層數">
            {Array.from({ length: 24 }, (_, index) => {
              const layer = index + 1;
              const selected = Math.max(1, journey.step) === layer;
              return (
                <button
                  key={layer}
                  type="button"
                  className={selected ? styles.layerReviewButtonActive : styles.layerReviewButton}
                  aria-pressed={selected}
                  onClick={() => selectJourneyStep(layer)}
                >
                  {layer}
                </button>
              );
            })}
          </div>
        </aside>
      )}
    </section>
  );
}
