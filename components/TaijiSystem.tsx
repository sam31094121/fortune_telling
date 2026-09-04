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
import {
  TAIJI_BANDS,
  TAIJI_DEPTH_MAX,
  TAIJI_DEPTH_MIN,
  baguaPresence,
  bandWeight,
  cameraDistanceFromDepth,
  cameraFovFromDepth,
  createTaijiJourneyState,
  integrateJourney,
  jumpJourney,
  layerFromDepth,
  liangyiAmount,
  lerpNumber,
  macroPresence,
  progressFromDepth,
  setJourneyTarget,
  sixiangPresence,
  stageFromDepth,
  type TaijiJourneyRef,
  type TaijiMacroStage,
} from '@/lib/taiji-journey-depth';
import TaijiQuantumField from './taiji/TaijiQuantumField';
import TaijiEntanglementCore from './taiji/TaijiEntanglementCore';
import TaijiCellularCore from './taiji/TaijiCellularCore';
import TaijiAbyssField from './taiji/TaijiAbyssField';
import { useTaijiJourneyGestures } from './taiji/taijiMagnifier';
import {
  Level01FrameBinder,
  Level01TaijiMotionController,
  Level01TaijiOverlay,
  level01LivingScale,
  level01EntrancePose,
  level01ReentryPose,
  shouldTriggerLevel01Reentry,
  type Level01Pose,
  type Level01StrikeOrigin,
} from './taiji/level-01';
import styles from './TaijiSystem.module.css';
import level01Styles from './taiji/level-01/level01.module.css';
import { LEVEL01_STRIKE_IMPACT_SECONDS } from './taiji/level-01/level01.constants';

type Stage = TaijiMacroStage;

const FRAME_DELTA_CAP = 1 / 45;
type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };

// One physical route is the contract for each first-layer strike.  The live
// bolt, its retained technological trace, and its reverse return all receive
// fresh copies of these same coordinates; no second decorative path may drift
// away from the source that was actually touched.
function level01StrikeRoutePoints(origin: Level01StrikeOrigin) {
  const west = [
    new THREE.Vector3(-2.82, .02, .18), new THREE.Vector3(-2.54, .18, .58),
    new THREE.Vector3(-2.76, -.12, .08), new THREE.Vector3(-2.3, .16, .52),
    new THREE.Vector3(-2.47, -.14, .04), new THREE.Vector3(-1.92, .12, .62),
    new THREE.Vector3(-2.02, -.1, .14), new THREE.Vector3(-1.52, .14, .72),
    new THREE.Vector3(-1.37, -.12, .24), new THREE.Vector3(-1.18, .1, .78),
    new THREE.Vector3(-.82, .02, .98),
  ];
  if (origin === 'W') return west;
  if (origin === 'E') return west.map((point) => new THREE.Vector3(-point.x, point.y, point.z));
  const north = west.map((point) => new THREE.Vector3(-point.y, -point.x, point.z));
  return origin === 'N' ? north : north.map((point) => new THREE.Vector3(point.x, -point.y, point.z));
}

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
  // LEVEL_01 專屬裝飾效果（例如雷擊粒子/光子幾何）讀這個旗標降密度；
  // 不影響任何材質/貼圖解析度，「解析度只准往上」規則不受影響。
  lowPower: boolean;
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
    lowPower: false,
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
        lowPower,
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
          && prev.ultraTexture === next.ultraTexture
          && prev.lowPower === next.lowPower;
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

function JourneyRig({
  journeyRef,
  onLayerChange,
}: {
  journeyRef: TaijiJourneyRef;
  onLayerChange: (layer: number) => void;
}) {
  const { camera } = useThree();
  const lastLayerRef = useRef(layerFromDepth(journeyRef.current.current));

  useFrame((state, delta) => {
    const depth = integrateJourney(journeyRef.current, Number.isFinite(delta) ? delta : 1 / 60);
    const breath = Math.sin(state.clock.elapsedTime * 0.35) * 0.012;
    const desired = cameraDistanceFromDepth(depth) + breath;
    if (!Number.isFinite(desired) || desired < 0.4) {
      camera.position.set(0, 0, 5.1);
    } else if (camera.position.lengthSq() < 0.04) {
      camera.position.set(0, 0, desired);
    } else {
      camera.position.setLength(desired);
    }
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = cameraFovFromDepth(depth);
    if (Number.isFinite(fov) && Math.abs(perspective.fov - fov) > 0.02) {
      perspective.fov = fov;
      perspective.updateProjectionMatrix();
    }
    const layer = layerFromDepth(depth);
    if (layer !== lastLayerRef.current) {
      lastLayerRef.current = layer;
      queueMicrotask(() => onLayerChange(layer));
    }
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

function Level01SpatialLightning({ active, origin, variant, strikeId, lowPower = false }: { active: boolean; origin: Level01StrikeOrigin; variant: number; strikeId: number; lowPower?: boolean }) {
  // Kept in the render contract so a repeated click can be distinguished from
  // a held pointer by React; the live envelope itself remains frame-driven.
  void strikeId;
  const wasActiveRef = useRef(false);
  const strikeStartedAtRef = useRef(-Infinity);
  const previewStartedAtRef = useRef<number | null>(null);
  const group = useMemo(() => {
    // 低階裝置降幾何密度（弧線分段數、管截面邊數），不動任何材質/貼圖解析度，
    // 也不減少雷擊本身的股數——每一道黑粒子/白光子的形狀都還在，只是多邊形變少。
    const segmentScale = lowPower ? 0.55 : 1;
    const root = new THREE.Group();
    class LightningPolyline extends THREE.Curve<THREE.Vector3> {
      constructor(private readonly nodes: THREE.Vector3[]) { super(); }
      getPoint(t: number, target = new THREE.Vector3()) {
        const scaled = Math.max(0, Math.min(1, t)) * (this.nodes.length - 1);
        const index = Math.min(this.nodes.length - 2, Math.floor(scaled));
        return target.copy(this.nodes[index]).lerp(this.nodes[index + 1], scaled - index);
      }
    }
    const createBolt = (input: {
      points: THREE.Vector3[];
      color: number;
      opacity: number;
      radius: number;
      delay?: number;
      glow?: boolean;
      blackCore?: boolean;
      sharedRoute?: boolean;
      origin?: Level01StrikeOrigin | 'IMPACT';
      pattern?: 'core' | 'braid' | 'impact' | 'storm' | 'shell';
    }) => {
      const curve = new LightningPolyline(input.points);
      const tubularSegments = Math.max(10, Math.round(Math.max(18, input.points.length * 8) * segmentScale));
      const radialSegments = Math.max(4, Math.round((input.glow ? 7 : 6) * segmentScale));
      const geometry = new THREE.TubeGeometry(curve, tubularSegments, input.radius, radialSegments, false);
      const positions = geometry.attributes.position as THREE.BufferAttribute;
      const center = new THREE.Vector3();
      const vertex = new THREE.Vector3();
      for (let ring = 0; ring <= tubularSegments; ring += 1) {
        const progress = ring / tubularSegments;
        curve.getPointAt(progress, center);
        // The tiny lower core is the weapon muzzle: the discharge grows as it
        // travels upward, instead of looking like a bolt falling from above.
        const dominoGrowth = .24 + Math.pow(progress, .72) * 1.08;
        const livingPulse = 1 + Math.sin(progress * Math.PI * 9) * .09;
        const taper = Math.max(.2, dominoGrowth * livingPulse);
        for (let side = 0; side <= radialSegments; side += 1) {
          const index = ring * (radialSegments + 1) + side;
          vertex.fromBufferAttribute(positions, index).sub(center).multiplyScalar(taper).add(center);
          positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
        }
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      const material = new THREE.MeshBasicMaterial({
        color: input.color,
        transparent: true,
        opacity: input.opacity,
        depthWrite: false,
        blending: input.blackCore ? THREE.NormalBlending : THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      material.userData.baseOpacity = input.opacity;
      material.userData.delay = input.delay ?? 0;
      material.userData.glow = Boolean(input.glow);
      material.userData.origin = input.origin ?? 'IMPACT';
      material.userData.pattern = input.pattern ?? 'core';
      material.userData.sharedRoute = Boolean(input.sharedRoute);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.basePosition = mesh.position.clone();
      mesh.userData.baseRotation = mesh.rotation.clone();
      mesh.renderOrder = input.glow ? 7 : 9;
      root.add(mesh);
    };
    const createAftershockArc = (input: {
      radius: number;
      tube: number;
      arc: number;
      color: number;
      opacity: number;
      delay: number;
      z: number;
      rotation: [number, number, number];
    }) => {
      const geometry = new THREE.TorusGeometry(
        input.radius,
        input.tube,
        Math.max(5, Math.round(7 * segmentScale)),
        Math.max(16, Math.round(34 * segmentScale)),
        input.arc,
      );
      const positions = geometry.attributes.position as THREE.BufferAttribute;
      const vertex = new THREE.Vector3();
      for (let index = 0; index < positions.count; index += 1) {
        vertex.fromBufferAttribute(positions, index);
        const angle = Math.atan2(vertex.y, vertex.x);
        const heatWarp = 1 + Math.sin(angle * 3.7 + input.delay * 31) * .034
          + Math.sin(angle * 11.3 - input.delay * 17) * .014;
        vertex.x *= heatWarp;
        vertex.y *= heatWarp;
        vertex.z += Math.sin(angle * 7.1 + input.delay * 23) * .022;
        positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      const material = new THREE.MeshBasicMaterial({
        color: input.color,
        transparent: true,
        opacity: input.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      material.userData.baseOpacity = input.opacity;
      material.userData.delay = input.delay;
      material.userData.aftershock = true;
      material.userData.origin = 'IMPACT';
      material.userData.pattern = 'aftershock';
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = input.z;
      mesh.rotation.set(...input.rotation);
      mesh.userData.basePosition = mesh.position.clone();
      mesh.userData.baseRotation = mesh.rotation.clone();
      mesh.renderOrder = 8;
      root.add(mesh);
    };
    const leftMain = level01StrikeRoutePoints('W');
    const rightMain = level01StrikeRoutePoints('E');
    const topMain = level01StrikeRoutePoints('N');
    const bottomMain = level01StrikeRoutePoints('S');
    // Every secondary discharge grows out of the same core-to-Taiji trajectory;
    // there is no pre-drawn rail between a weapon core and the orb.
    const leftSurge = [
      leftMain[0], new THREE.Vector3(-2.94, -.16, .34), new THREE.Vector3(-2.66, .14, -.02),
      new THREE.Vector3(-2.73, -.18, .5), new THREE.Vector3(-2.31, .16, .1),
      new THREE.Vector3(-2.08, -.12, .66), new THREE.Vector3(-1.58, .1, .18),
      new THREE.Vector3(-1.25, -.08, .76), new THREE.Vector3(-.82, .02, 1.02),
    ];
    const rightSurge = leftSurge.map((point) => new THREE.Vector3(-point.x, point.y, point.z));
    const topSurge = leftSurge.map((point) => new THREE.Vector3(-point.y, -point.x, point.z));
    const bottomSurge = topSurge.map((point) => new THREE.Vector3(point.x, -point.y, point.z));
    // Photon and dark-particle discharges braid through alternating front/back
    // depth before striking opposite sides of the Taiji. This reads as one
    // entangled weapon rather than two unrelated bolts.
    const photonEntanglement = [
      leftMain[0], new THREE.Vector3(-2.28, -1.5, .22), new THREE.Vector3(-1.66, -1.18, .72),
      new THREE.Vector3(-1.14, -.86, .08), new THREE.Vector3(-.56, -.48, .88),
      new THREE.Vector3(.02, -.18, .12), new THREE.Vector3(.46, .02, 1.02), rightMain[rightMain.length - 1],
    ];
    const particleEntanglement = photonEntanglement.map((point) => new THREE.Vector3(-point.x, point.y, 1.1 - point.z * .56));
    const photonEntanglementVertical = photonEntanglement.map((point) => new THREE.Vector3(-point.y, -point.x, point.z));
    const particleEntanglementVertical = photonEntanglementVertical.map((point) => new THREE.Vector3(point.x, -point.y, 1.1 - point.z * .56));
    const leftBranchA = [leftMain[3], new THREE.Vector3(-2.7, -.58, .72), new THREE.Vector3(-2.52, -.18, .24)];
    const leftBranchB = [leftMain[6], new THREE.Vector3(-2.28, .36, .5), new THREE.Vector3(-2.05, .68, .1)];
    const rightBranchA = leftBranchA.map((point) => new THREE.Vector3(-point.x, point.y, point.z));
    const rightBranchB = leftBranchB.map((point) => new THREE.Vector3(-point.x, point.y, point.z));
    // Impact phase: after all four weapon bolts reach the orb, the charge races
    // across its near surface as a broken lightning web. Every strand begins at
    // one of the two impact points, so it reads as a consequence of the shot.
    const leftImpact = leftMain[leftMain.length - 1];
    const rightImpact = rightMain[rightMain.length - 1];
    const topImpact = topMain[topMain.length - 1];
    const bottomImpact = bottomMain[bottomMain.length - 1];
    const impactWeb = [
      [leftImpact, new THREE.Vector3(-.58, .62, 1.12), new THREE.Vector3(-.18, .92, 1.08), new THREE.Vector3(.22, .64, 1.14), rightImpact],
      [leftImpact, new THREE.Vector3(-.44, -.12, 1.2), new THREE.Vector3(-.06, -.62, 1.12), new THREE.Vector3(.42, -.28, 1.18), rightImpact],
      [topImpact, new THREE.Vector3(-.42, .5, 1.18), new THREE.Vector3(.04, .08, 1.3), new THREE.Vector3(.38, -.48, 1.16), bottomImpact],
      [topImpact, new THREE.Vector3(.46, .44, 1.14), new THREE.Vector3(-.08, -.04, 1.28), new THREE.Vector3(-.36, -.52, 1.2), bottomImpact],
      [leftImpact, new THREE.Vector3(-.72, .06, 1.16), new THREE.Vector3(-.32, .02, 1.28), new THREE.Vector3(.04, .42, 1.24)],
      [rightImpact, new THREE.Vector3(.7, .12, 1.16), new THREE.Vector3(.34, .04, 1.28), new THREE.Vector3(.02, -.42, 1.24)],
      [new THREE.Vector3(-.18, .92, 1.08), new THREE.Vector3(-.02, .48, 1.3), new THREE.Vector3(-.06, -.62, 1.12)],
      [new THREE.Vector3(.22, .64, 1.14), new THREE.Vector3(.08, .18, 1.32), new THREE.Vector3(.42, -.28, 1.18)],
    ];
    // A strike should not read as a single flat rail. These sky lanes form a
    // bounded storm volume: distant blue-violet forks fall behind the orb,
    // warmer foreground forks cross its face, and every lane is pulled toward
    // the same impact field. The deterministic offsets keep the cloud-like
    // scale without a noisy random flicker on phones.
    const stormLaneCount = lowPower ? 3 : 5;
    const stormLanes = Array.from({ length: stormLaneCount }, (_, lane) => {
      const normalized = lane / (stormLaneCount - 1);
      const x = -3.15 + normalized * 6.3;
      const depthBand = [-.72, .18, 1.08][lane % 3];
      const wobble = Math.sin(lane * 7.17) * .26;
      const startY = 3.15 + (lane % 2) * .38;
      const impactX = x * .22 + Math.sin(lane * 2.9) * .32;
      const impactY = .28 + Math.cos(lane * 5.1) * .52;
      return [
        new THREE.Vector3(x, startY, depthBand),
        new THREE.Vector3(x + wobble, 2.35, depthBand + Math.sin(lane * 1.7) * .34),
        new THREE.Vector3(x - wobble * 1.38, 1.48, depthBand - .24),
        new THREE.Vector3(x * .56 + wobble, .82, depthBand + .38),
        new THREE.Vector3(impactX, impactY, .72 + (lane % 3) * .18),
      ];
    });
    // The impact must wrap the whole Taiji, not merely paint the camera-facing
    // hemisphere. Meridian fractures and offset latitude scars build a spatial
    // lightning cage around the sphere, so a spinning Taiji keeps passing
    // through charged seams on every side.
    const shellRadius = 1.26;
    const shellPoint = (azimuth: number, elevation: number, radius = shellRadius) => new THREE.Vector3(
      Math.cos(elevation) * Math.cos(azimuth) * radius,
      Math.sin(elevation) * radius,
      Math.cos(elevation) * Math.sin(azimuth) * radius,
    );
    const shellMeridianCount = lowPower ? 3 : 4;
    const shellMeridians = Array.from({ length: shellMeridianCount }, (_, lane) => {
      const azimuth = lane * Math.PI / 2 + .18;
      return Array.from({ length: 8 }, (_, step) => {
        const progress = step / 7;
        const elevation = -1.22 + progress * 2.44;
        return shellPoint(
          azimuth + Math.sin(step * 4.3 + lane * 2.1) * .12,
          elevation,
          shellRadius + Math.sin(step * 3.7 + lane) * .045,
        );
      });
    });
    const shellLatitudes = [-.42, .42].map((elevation, lane) => (
      Array.from({ length: 10 }, (_, step) => {
        const progress = step / 9;
        const azimuth = -Math.PI + progress * Math.PI * 2;
        return shellPoint(
          azimuth,
          elevation + Math.sin(step * 5.6 + lane * 1.8) * .075,
          shellRadius + Math.cos(step * 4.1 + lane) * .035,
        );
      })
    ));
    const addLayeredBolt = (points: THREE.Vector3[], core: number, rim: number, radius: number, delay = 0, blackCore = false, origin: Level01StrikeOrigin | 'IMPACT' = 'IMPACT', pattern: 'core' | 'braid' | 'impact' | 'storm' | 'shell' = 'core', sharedRoute = false) => {
      createBolt({ points, color: rim, opacity: .2, radius: radius * 2.15, delay, glow: true, origin, pattern, sharedRoute });
      createBolt({ points, color: rim, opacity: .48, radius: radius * 1.42, delay, glow: true, origin, pattern, sharedRoute });
      createBolt({ points, color: core, opacity: .98, radius, delay, blackCore, origin, pattern, sharedRoute });
    };
    // Four cardinal emitters alternate photon / dark-particle material and
    // converge on one impact. They remain unmistakable at phone scale without
    // bringing back the level-24 satellite field.
    // Main strike colour is deliberately the inverse of its emitting point:
    // dark points throw a broad white bolt; light points throw a broad black bolt.
    addLayeredBolt(leftMain, 0xffffff, 0xeaf6ff, .19, 0, false, 'W', 'core', true);
    addLayeredBolt(rightMain, 0xffffff, 0xeaf6ff, .19, .025, false, 'E', 'core', true);
    addLayeredBolt(bottomMain, 0x010104, 0x242433, .195, .05, true, 'S', 'core', true);
    addLayeredBolt(topMain, 0x010104, 0x242433, .195, .075, true, 'N', 'core', true);
    addLayeredBolt(leftSurge, 0xffffff, 0x67e8f9, .088, .055, false, 'W');
    addLayeredBolt(rightSurge, 0xffffff, 0xfbbf24, .088, .075, false, 'E');
    addLayeredBolt(bottomSurge, 0x02020a, 0x818cf8, .092, .09, true, 'S');
    addLayeredBolt(topSurge, 0x02020a, 0x60a5fa, .092, .11, true, 'N');
    addLayeredBolt(photonEntanglement, 0xfffbea, 0x7dd3fc, .078, .17, false, 'IMPACT', 'braid');
    addLayeredBolt(particleEntanglement, 0x02030a, 0x6366f1, .08, .182, true, 'IMPACT', 'braid');
    addLayeredBolt(photonEntanglementVertical, 0xfffbea, 0xfbbf24, .078, .194, false, 'IMPACT', 'braid');
    addLayeredBolt(particleEntanglementVertical, 0x02030a, 0x6366f1, .08, .206, true, 'IMPACT', 'braid');
    addLayeredBolt(leftBranchA, 0xffffff, 0x67e8f9, .05, .065, false, 'W');
    addLayeredBolt(leftBranchB, 0xfff4b8, 0xfbbf24, .043, .1, false, 'W');
    addLayeredBolt(rightBranchA, 0xffffff, 0x67e8f9, .052, .09, false, 'E');
    addLayeredBolt(rightBranchB, 0xfff4b8, 0xfbbf24, .044, .12, false, 'E');
    impactWeb.forEach((points, index) => {
      const fromYin = index % 2 === 0;
      addLayeredBolt(
        points,
        fromYin ? 0xfffbeb : 0x060611,
        fromYin ? 0x67e8f9 : 0x818cf8,
        index < 2 ? .046 : .027,
        .17 + index * .018,
        !fromYin,
        'IMPACT',
        'impact',
      );
    });
    stormLanes.forEach((points, lane) => {
      const foreground = lane % 3 === 2;
      const nearCore = foreground ? 0xfffbeb : 0x08091e;
      const rim = foreground ? 0xfbbf24 : lane % 2 === 0 ? 0x60a5fa : 0x818cf8;
      addLayeredBolt(
        points,
        nearCore,
        rim,
        foreground ? .043 : .035,
        .018 + (lane % 5) * .028,
        !foreground,
        'IMPACT',
        'storm',
      );
    });
    [...shellMeridians, ...shellLatitudes].forEach((points, lane) => {
      const whiteHot = lane === 0;
      addLayeredBolt(
        points,
        whiteHot ? 0xfff8da : 0x090817,
        whiteHot ? 0xfbbf24 : lane % 2 === 0 ? 0x67e8f9 : 0x818cf8,
        whiteHot ? .04 : .022,
        .16 + (lane % 6) * .018,
        !whiteHot,
        'IMPACT',
        'shell',
      );
    });
    // Broken, depth-layered burn aftershock. Partial arcs avoid framing the orb
    // with a static ring while still creating a strong front/back spatial wave.
    createAftershockArc({ radius: 1.08, tube: .09, arc: Math.PI * 1.38, color: 0xa72b16, opacity: .54, delay: .285, z: .78, rotation: [.18, -.12, -.7] });
    createAftershockArc({ radius: 1.18, tube: .06, arc: Math.PI * 1.08, color: 0xd66a2c, opacity: .45, delay: .3, z: 1.08, rotation: [-.16, .2, 1.08] });
    createAftershockArc({ radius: 1.28, tube: .105, arc: Math.PI * .82, color: 0x520b08, opacity: .34, delay: .315, z: .22, rotation: [.34, -.28, 2.14] });
    createAftershockArc({ radius: 1.42, tube: .042, arc: Math.PI * .72, color: 0xe4a15d, opacity: .38, delay: .33, z: 1.34, rotation: [-.3, .38, -.08] });
    return root;
  }, [lowPower]);

  useEffect(() => () => {
    group.children.forEach((child) => {
      const bolt = child as THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
      bolt.geometry.dispose();
      bolt.material.dispose();
    });
  }, [group]);

  useFrame(({ clock }, delta) => {
    if (previewStartedAtRef.current == null) previewStartedAtRef.current = clock.elapsedTime + .16;
    if (active && !wasActiveRef.current) strikeStartedAtRef.current = clock.elapsedTime;
    wasActiveRef.current = active;
    // Review mode demonstrates the weapon once per screen mount. Repeating on
    // a timer made the scene feel noisy and could replay without user intent.
    const previewAge = clock.elapsedTime - previewStartedAtRef.current;
    const previewActive = previewAge >= 0 && previewAge < .72;
    const gestureStrikeAge = clock.elapsedTime - strikeStartedAtRef.current;
    // A phone tap is often shorter than a frame capture. Latch every accepted
    // press into one complete, bounded discharge so releasing the finger cannot
    // cut the lightning off before the customer sees the impact.
    const gestureStrikeActive = gestureStrikeAge >= 0 && gestureStrikeAge < .72;
    const striking = gestureStrikeActive || previewActive;
    const strikeAge = gestureStrikeActive ? gestureStrikeAge : previewAge;
    const envelopeAt = (age: number) => !striking || age < 0 ? 0
      : age < .055 ? 1
        : age < .105 ? .08
          : age < .19 ? .94
            : age < .28 ? .16
            : age < .62 ? .7 * (1 - (age - .28) / .34)
                : 0;
    const spatialEnvelope = envelopeAt(strikeAge);
    const patternWeights = [
      { core: 1, braid: 0, impact: .18, storm: 0, shell: 0, aftershock: 0 }, // lightning strike: one clean cut
      { core: .88, braid: .12, impact: .54, storm: 0, shell: 0, aftershock: 0 }, // dry thunder: sparse fork
      { core: 1, braid: .18, impact: .9, storm: 0, shell: 0, aftershock: .46 }, // loud thunder: violent rupture
      { core: .34, braid: .38, impact: .48, storm: 0, shell: 0, aftershock: .72 }, // peals: echoing scars
      { core: .78, braid: 0, impact: 1, storm: 0, shell: .14, aftershock: 1 }, // earth rift
      { core: .18, braid: 0, impact: .32, storm: 0, shell: .42, aftershock: .8 }, // tidal surge
      { core: .28, braid: .1, impact: .38, storm: .72, shell: 0, aftershock: .22 }, // typhoon
      { core: .42, braid: .78, impact: .34, storm: .28, shell: .12, aftershock: .18 }, // tornado
    ] as const;
    const selectedVariant = Number.isFinite(variant) ? Math.abs(Math.trunc(variant)) : 0;
    const patternWeight = patternWeights[selectedVariant % patternWeights.length] ?? patternWeights[0];
    const target = striking ? 1 : .9;
    const easing = 1 - Math.exp(-delta * (striking ? 18 : 7));
    group.scale.x += (target - group.scale.x) * easing;
    group.scale.y += (target - group.scale.y) * easing;
    group.scale.z += ((.9 + spatialEnvelope * .28) - group.scale.z) * easing;
    group.position.z = -.16 + spatialEnvelope * .34;
    // Lightning belongs to the fixed card-space weapons, not to the rotating
    // Taiji mesh. The orb may tilt or spin freely without dragging the emission
    // origin, impact point, 3D depth or short 4D distortion out of alignment.
    group.rotation.set(0, 0, 0);
    group.children.forEach((child) => {
      const bolt = child as THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
      const material = bolt.material;
      const localAge = strikeAge - Number(material.userData.delay ?? 0);
      const envelope = envelopeAt(localAge);
      const boltOrigin = material.userData.origin as Level01StrikeOrigin | 'IMPACT' | undefined;
      const isSharedRoute = Boolean(material.userData.sharedRoute);
      // The visible discharge is the one route selected by this strike event.
      // Other prebuilt geometries stay inert so they cannot masquerade as a
      // second origin or leave a mismatched after-image.
      const originWeight = isSharedRoute && boltOrigin === origin ? 1 : 0;
      const pattern = material.userData.pattern as keyof typeof patternWeight | undefined;
      const structureWeight = pattern ? patternWeight[pattern] : 1;
      material.opacity = Number(material.userData.baseOpacity ?? .5) * envelope * originWeight * structureWeight;
      if (isSharedRoute && boltOrigin === origin) {
        const count = bolt.geometry.index?.count ?? bolt.geometry.attributes.position.count;
        const travel = Math.max(0, Math.min(1, localAge / LEVEL01_STRIKE_IMPACT_SECONDS));
        bolt.geometry.setDrawRange(0, Math.max(0, Math.round(count * travel)));
      }
      const phase = Number(material.userData.delay ?? 0);
      const pulse = 1 + Math.sin((clock.elapsedTime + phase) * 72) * .09 * envelope;
      const aftershockExpansion = material.userData.aftershock
        ? .76 + Math.max(0, Math.min(1, localAge / .24)) * .52
        : 1;
      bolt.scale.set(pulse * aftershockExpansion, pulse * aftershockExpansion, pulse * aftershockExpansion);
      const baseRotation = bolt.userData.baseRotation as THREE.Euler;
      const basePosition = bolt.userData.basePosition as THREE.Vector3;
      bolt.rotation.set(baseRotation.x, baseRotation.y, baseRotation.z + Math.sin(clock.elapsedTime * 53 + phase * 41) * .018 * envelope);
      bolt.position.set(
        basePosition.x + Math.sin(clock.elapsedTime * 67 + phase * 29) * .018 * envelope,
        basePosition.y + Math.cos(clock.elapsedTime * 61 + phase * 37) * .014 * envelope,
        basePosition.z,
      );
    });
  });

  return <primitive object={group} />;
}

/* A lightning-wood trace is a single, bounded after-image laid directly over
   the incoming route. It retracts to the touched cardinal source, never along
   a separately invented surface seam. */
function Level01LightningScars({ scar, lowPower = false }: {
  scar: { id: number; origin: Level01StrikeOrigin; variant: number } | null;
  lowPower?: boolean;
}) {
  const startedAtRef = useRef<number | null>(null);
  const scarGroup = useMemo(() => {
    const root = new THREE.Group();
    if (!scar) return root;
    const { origin, variant } = scar;
    const sourceIsWhite = origin === 'N' || origin === 'S';
    const traceColor = sourceIsWhite ? 0x22d3ee : 0xa855f7;
    const traceCoreColor = sourceIsWhite ? 0xe0faff : 0xf3e8ff;
      const paths = [level01StrikeRoutePoints(origin)];
    paths.forEach((points, pathIndex) => {
        const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
        // The visible trace is deliberately technological light, not a static
        // charcoal crack: it makes both the struck route and its later return
        // to the exact source point legible at a glance.
        const geometry = new THREE.TubeGeometry(curve, lowPower ? 18 : 28, pathIndex === 0 ? .027 : .019, lowPower ? 4 : 5, false);
        const material = new THREE.MeshBasicMaterial({
          color: traceColor,
          transparent: true,
          opacity: pathIndex === 0 ? .72 : .56,
          depthWrite: false,
          depthTest: true,
          blending: THREE.NormalBlending,
          toneMapped: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = 5;
        root.add(mesh);
        const emberGeometry = new THREE.TubeGeometry(curve, lowPower ? 16 : 24, pathIndex === 0 ? .008 : .005, lowPower ? 3 : 4, false);
        const emberMaterial = new THREE.MeshBasicMaterial({
          color: traceCoreColor,
          transparent: true,
          opacity: pathIndex === 0 ? .48 : .32,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        });
        const ember = new THREE.Mesh(emberGeometry, emberMaterial);
        ember.renderOrder = 6;
        root.add(ember);
      });
    return root;
  }, [lowPower, scar]);

  useEffect(() => {
    startedAtRef.current = null;
    scarGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
      mesh.material.userData.baseOpacity = mesh.material.opacity;
      mesh.material.userData.baseColor = mesh.material.color.clone();
      mesh.geometry.setDrawRange(0, 0);
    });
  }, [scarGroup]);

  useFrame(({ clock }) => {
    if (!scar) return;
    if (startedAtRef.current == null) startedAtRef.current = clock.elapsedTime;
    const age = clock.elapsedTime - startedAtRef.current;
    // Live bolt reaches the sphere first; trace grows, remains inspectable,
    // then its endpoint travels back to the origin over the same geometry.
    const draw = age < LEVEL01_STRIKE_IMPACT_SECONDS ? 0
      : age < LEVEL01_STRIKE_IMPACT_SECONDS + .22 ? (age - LEVEL01_STRIKE_IMPACT_SECONDS) / .22
        : age < 1.29 ? 1
          : Math.max(0, 1 - (age - 1.29) / 1.12);
    const retract = age < 1.29 ? 0 : Math.min(1, (age - 1.29) / 1.12);
    // Recovery must read as technology, not a dim continuation of the charcoal
    // scar: white-node routes become electric cyan; black-node routes become
    // luminous ultraviolet. The draw range contracts toward index 0, the real
    // tapped point, so the distinct energy always returns to its own source.
    const recoveryColor = scar.origin === 'N' || scar.origin === 'S'
      ? new THREE.Color(0x22d3ee)
      : new THREE.Color(0xa855f7);
    const recoveryPulse = .72 + .28 * (Math.sin(age * 38) * .5 + .5);
    scarGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
      const count = mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count;
      mesh.geometry.setDrawRange(0, Math.max(0, Math.round(count * draw)));
      const baseColor = mesh.material.userData.baseColor as THREE.Color | undefined;
      if (baseColor) mesh.material.color.copy(baseColor).lerp(recoveryColor, retract ? .82 + .18 * recoveryPulse : 0);
      mesh.material.opacity = Number(mesh.material.userData.baseOpacity ?? .4) * draw * (retract ? .9 + .1 * recoveryPulse : 1);
    });
  });

  useEffect(() => () => {
    scarGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
  }, [scarGroup]);

  return scar ? <primitive object={scarGroup} /> : null;
}

/* Persistent layer: unlike the card-space return route above, this web is
   authored in the Taiji's local coordinates. Each accepted strike adds one
   quiet seam, so the sphere gradually remembers its own lightning without
   leaving a screen-fixed overlay behind. */
function Level01AccumulatedLightningWeb({ strikes, flashStrikeId, lowPower = false, ballWorldRef }: {
  strikes: Array<{ id: number; origin: Level01StrikeOrigin; variant: number }>;
  flashStrikeId: number;
  lowPower?: boolean;
  ballWorldRef?: { current: THREE.Mesh | null };
}) {
  const flashStartedAtRef = useRef<number | null>(null);
  const seenFlashIdRef = useRef(flashStrikeId);
  const web = useMemo(() => {
    const root = new THREE.Group();
    const originPoint: Record<Level01StrikeOrigin, THREE.Vector3> = {
      N: new THREE.Vector3(0, .88, .24), E: new THREE.Vector3(.88, 0, .24),
      S: new THREE.Vector3(0, -.88, .24), W: new THREE.Vector3(-.88, 0, .24),
    };
    const seenOrigins = new Map<Level01StrikeOrigin, number>();
    strikes.forEach((strike) => {
      const count = (seenOrigins.get(strike.origin) ?? 0) + 1;
      seenOrigins.set(strike.origin, count);
      const source = originPoint[strike.origin];
      const sign = strike.origin === 'E' || strike.origin === 'N' ? 1 : -1;
      const seed = strike.variant * 1.73 + count * .41;
      const localPaths = [
        [source, new THREE.Vector3(sign * .48, .32 + Math.sin(seed) * .16, .58), new THREE.Vector3(.06, -.1, .7), new THREE.Vector3(-sign * .4, -.44, .48)],
        [source, new THREE.Vector3(sign * .52, -.22 + Math.cos(seed) * .14, -.36), new THREE.Vector3(-.14, .36, -.62), new THREE.Vector3(-sign * .48, .16, -.28)],
      ];
      const color = strike.origin === 'N' || strike.origin === 'S' ? 0x22d3ee : 0xa855f7;
      localPaths.forEach((points, pathIndex) => {
        const guide = new THREE.CatmullRomCurve3(points, false, 'centripetal');
        const surface = guide.getPoints(lowPower ? 14 : 24).map((point) => point.normalize().multiplyScalar(1.092));
        const curve = new THREE.CatmullRomCurve3(surface, false, 'centripetal');
        const geometry = new THREE.TubeGeometry(curve, lowPower ? 16 : 24, (pathIndex === 0 ? .012 : .009) + Math.min(count, 3) * .002, lowPower ? 4 : 5, false);
        const material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: (pathIndex === 0 ? .16 : .1) + Math.min(count, 3) * .035,
          depthWrite: false,
          depthTest: true,
          blending: THREE.NormalBlending,
          toneMapped: false,
        });
        material.userData.baseOpacity = material.opacity;
        material.userData.baseColor = material.color.clone();
        const seam = new THREE.Mesh(geometry, material);
        seam.renderOrder = 4;
        root.add(seam);
      });
    });
    return root;
  }, [lowPower, strikes]);

  useFrame(({ clock }) => {
    const ball = ballWorldRef?.current;
    if (!ball) return;
    ball.getWorldPosition(web.position);
    ball.getWorldQuaternion(web.quaternion);
    ball.getWorldScale(web.scale);
    if (seenFlashIdRef.current !== flashStrikeId) {
      seenFlashIdRef.current = flashStrikeId;
      flashStartedAtRef.current = clock.elapsedTime;
    }
    const flashAge = flashStartedAtRef.current == null ? -Infinity : clock.elapsedTime - flashStartedAtRef.current;
    const flash = flashAge < LEVEL01_STRIKE_IMPACT_SECONDS ? 0
      : Math.max(0, 1 - (flashAge - LEVEL01_STRIKE_IMPACT_SECONDS) / .42);
    web.children.forEach((child) => {
      const mesh = child as THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
      const baseOpacity = Number(mesh.material.userData.baseOpacity ?? .12);
      const baseColor = mesh.material.userData.baseColor as THREE.Color | undefined;
      if (baseColor) mesh.material.color.copy(baseColor).lerp(new THREE.Color(0xe0faff), flash * .68);
      mesh.material.opacity = Math.min(.82, baseOpacity + flash * .48);
    });
  });

  useEffect(() => () => {
    web.children.forEach((child) => {
      const mesh = child as THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
  }, [web]);

  return strikes.length ? <primitive object={web} /> : null;
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

function sampleVariation(depth: number) {
  const index = Math.min(23, Math.max(0, depth - 1));
  const fromIndex = Math.floor(index);
  const toIndex = Math.min(23, fromIndex + 1);
  const mix = index - fromIndex;
  const from = VARIATION_24[fromIndex];
  const to = VARIATION_24[toIndex];
  return {
    ringSpeed: lerpNumber(from.ringSpeed, to.ringSpeed, mix),
    ringDir: lerpNumber(from.ringDir, to.ringDir, mix),
    raySpinDir: lerpNumber(from.raySpinDir, to.raySpinDir, mix),
    ringTiltSeed: lerpNumber(from.ringTiltSeed, to.ringTiltSeed, mix),
  };
}

function OrbitRings({
  journeyRef,
  theme,
}: {
  journeyRef: TaijiJourneyRef;
  theme: TaijiVisualTheme;
}) {
  const ringRef = useRef<THREE.Group>(null);
  const beadOneRef = useRef<THREE.Mesh>(null);
  const beadTwoRef = useRef<THREE.Mesh>(null);
  const beadThreeRef = useRef<THREE.Mesh>(null);
  const primaryGeo = useMemo(() => new THREE.TorusGeometry(1.58, 0.006, 8, 128), []);
  const secondaryGeo = useMemo(() => new THREE.TorusGeometry(1.92, 0.004, 8, 128), []);
  const beadGeo = useMemo(() => new THREE.SphereGeometry(0.035, 12, 12), []);

  useEffect(() => () => {
    primaryGeo.dispose();
    secondaryGeo.dispose();
    beadGeo.dispose();
  }, [primaryGeo, secondaryGeo, beadGeo]);

  useFrame((state, delta) => {
    if (!ringRef.current) return;
    const frameDelta = Math.min(delta, FRAME_DELTA_CAP);
    const t = state.clock.elapsedTime;
    const depth = journeyRef.current.current;
    const progress24 = progressFromDepth(depth);
    const variation = sampleVariation(depth);
    const speed = variation.ringSpeed * (1 + Math.sin(t * 0.24) * 0.025);
    const dir = variation.ringDir;
    const tiltSeed = (variation.ringTiltSeed * Math.PI) / 180;
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
        <meshBasicMaterial color={theme.primary} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh geometry={secondaryGeo} rotation={[Math.PI / 2.04, 0, Math.PI / 3]}>
        <meshBasicMaterial color={theme.accent} transparent opacity={0.09} depthWrite={false} />
      </mesh>
      <mesh geometry={secondaryGeo} rotation={[Math.PI / 1.72, Math.PI / 4, 0]}>
        <meshBasicMaterial color={theme.secondary} transparent opacity={0.055} depthWrite={false} />
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
  attractTick = 0,
  theme,
  journeyRef,
  quantumPairs,
  quantumLinks,
  ultraTexture,
  onCoreClick,
  level01PoseRef,
  level01ImpactActive = false,
  onLevel01Reentry,
  ballWorldRef,
}: {
  attractTick?: number;
  theme: TaijiVisualTheme;
  journeyRef: TaijiJourneyRef;
  quantumPairs: number;
  quantumLinks: number;
  ultraTexture: boolean;
  onCoreClick: () => void;
  level01PoseRef?: { current: Level01Pose };
  level01ImpactActive?: boolean;
  onLevel01Reentry?: () => void;
  /** LEVEL_01 ONLY：外部想讀球體即時世界座標時用；不影響 LEVEL_02～24 既有行為。 */
  ballWorldRef?: { current: THREE.Mesh | null };
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
  const level01LivingPulseRef = useRef({
    activationId: 0,
    burstId: 0,
    startedAt: -Infinity,
    smoothedEnergy: 0,
    cycleElapsed: 0,
    scale: 1,
  });
  const level01ImpactRef = useRef({ wasActive: false, startedAt: -Infinity });
  const prevStageRef = useRef<Stage>(stageFromDepth(journeyRef.current.current));
  const outerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  /* 顯微鏡（2026-08-17）：宏觀外殼群組與量子層群組 */
  const macroGroupRef = useRef<THREE.Group>(null);
  const sixiangGroupRef = useRef<THREE.Group>(null);
  const quantumGroupRef = useRef<THREE.Group>(null);
  const deepGroupRef = useRef<THREE.Group>(null);
  const cellularGroupRef = useRef<THREE.Group>(null);
  const abyssGroupRef = useRef<THREE.Group>(null);
  const ballMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const level01ReentryRef = useRef({ previousLayer: 1, startedAt: -1, tailAngle: 0, tailVelocity: 0 });
  const level01EntranceRef = useRef({ lastActivationId: 0, startedAt: -1 });
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const sync = () => { reducedMotionRef.current = media?.matches ?? false; };
    sync();
    media?.addEventListener?.('change', sync);
    return () => media?.removeEventListener?.('change', sync);
  }, []);

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

  const activeTheme = theme ?? TAIJI_BENCHMARK_THEME;
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
  const progress24 = progressFromDepth(journeyRef.current.current);
  const separate = liangyiAmount(journeyRef.current.current) > 0.04;
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

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const depth = journeyRef.current.current;
    const progress24 = progressFromDepth(depth);
    const layer = layerFromDepth(depth);
    const motionGamePose = layer === 1 && level01PoseRef?.current?.motionGameEnabled ? level01PoseRef.current : null;
    // First-layer game progress remains internal. It must never reveal the
    // macro evolution meshes (two forms, four symbols, bagua satellites); the
    // customer surface stays one Taiji plus the four photon/particle weapons.
    const motionSplit = 0;
    const split = Math.max(liangyiAmount(depth), motionSplit);
    const separate = split > 0.04;
    const offset = 0.88 * split;
    const scale = lerpNumber(1, 0.88, split);
    const macroFade = macroPresence(depth);
    const shellFade = macroFade;
    const surfaceD = 1 - macroFade;
    const stage = stageFromDepth(depth);
    const variation = sampleVariation(depth);
    const frameDelta = Math.min(delta, FRAME_DELTA_CAP);
    const settleSoft = Math.min(1, frameDelta * 1.35);
    const settleSlow = Math.min(1, frameDelta * 0.95);
    const t = state.clock.elapsedTime;
    const impactState = level01ImpactRef.current;
    if (layer === 1 && level01ImpactActive && !impactState.wasActive) impactState.startedAt = t;
    impactState.wasActive = level01ImpactActive;
    const level01Drive = Boolean(level01PoseRef?.current?.driving) && layer === 1;
    const entranceState = level01EntranceRef.current;
    const activationId = level01PoseRef?.current?.activationId ?? 0;
    if (layer === 1 && activationId !== entranceState.lastActivationId) {
      entranceState.lastActivationId = activationId;
      entranceState.startedAt = t;
      pulseRef.current = Math.max(pulseRef.current, 0.82);
    }
    const livingPulse = level01LivingPulseRef.current;
    const visualBurstId = level01PoseRef?.current?.visualBurstId ?? 0;
    if (layer === 1 && (activationId !== livingPulse.activationId || visualBurstId !== livingPulse.burstId)) {
      livingPulse.activationId = activationId;
      livingPulse.burstId = visualBurstId;
      livingPulse.startedAt = t;
    }
    const livingEnergyTarget = level01PoseRef?.current?.motionEnergy ?? 0;
    const livingEnergyBlend = 1 - Math.exp(-frameDelta / 0.5);
    livingPulse.smoothedEnergy += (livingEnergyTarget - livingPulse.smoothedEnergy) * livingEnergyBlend;
    const livingPeriod = 3.5 - Math.min(1, Math.max(0, livingPulse.smoothedEnergy)) * 1.2;
    livingPulse.cycleElapsed += frameDelta * (3.5 / livingPeriod);
    const entrance = level01EntrancePose(t - entranceState.startedAt, reducedMotionRef.current);
    const reentryState = level01ReentryRef.current;
    if (shouldTriggerLevel01Reentry(reentryState.previousLayer, layer) && !reducedMotionRef.current) {
      reentryState.startedAt = t;
      reentryState.tailAngle = 0;
      reentryState.tailVelocity = 0;
      onLevel01Reentry?.();
    }
    reentryState.previousLayer = layer;
    const reentry = level01ReentryPose(t - reentryState.startedAt, reducedMotionRef.current);
    if (reentry.active) {
      reentryState.tailAngle = reentry.spin;
      reentryState.tailVelocity = reentry.tailVelocity;
    } else if (Math.abs(reentryState.tailVelocity) > 0.0005 || Math.abs(reentryState.tailAngle) > 0.0005) {
      // Frame-rate-independent residual spin: this is the soft handoff from
      // the re-entry animation to the first layer's own sensor/living pose.
      reentryState.tailAngle += reentryState.tailVelocity * frameDelta;
      reentryState.tailVelocity *= Math.exp(-frameDelta * 5.2);
      if (Math.abs(reentryState.tailAngle) < 0.0005 && Math.abs(reentryState.tailVelocity) < 0.0005) {
        reentryState.tailAngle = 0;
        reentryState.tailVelocity = 0;
      }
    }

    if (prevStageRef.current !== stage) {
      prevStageRef.current = stage;
      pulseRef.current = 0.56;
    }
    if (prevAttractRef.current !== attractTick) {
      prevAttractRef.current = attractTick;
      pulseRef.current = Math.max(pulseRef.current, 0.32);
    }
    if (prevStep24Ref.current !== layer) {
      prevStep24Ref.current = layer;
      if (layer >= 24) pulseRef.current = 0.9;
      else if (layer > 0 && layer % 6 === 0) pulseRef.current = 0.68;
      else pulseRef.current = Math.max(pulseRef.current, 0.36);
    }
    const raySpinDir = variation.raySpinDir;
    pulseRef.current = Math.max(0, pulseRef.current - frameDelta * 0.72);
    const pulse = pulseRef.current;
    if (outerMatRef.current) {
      outerMatRef.current.opacity = Math.min(0.085, 0.024 + progress24 * 0.012 + pulse * 0.026) * macroFade;
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

    if (layer === 1 && entrance.active) {
      const pose = level01PoseRef?.current;
      groupRef.current.rotation.set(
        (pose?.visualEuler.x ?? 0) + entrance.rx,
        (pose?.visualEuler.y ?? 0) + entrance.ry,
        (pose?.visualEuler.z ?? 0) + entrance.rz,
      );
      groupRef.current.position.set(entrance.x, entrance.y, entrance.z);
      groupRef.current.scale.setScalar(entrance.scale);
      livingPulse.scale = entrance.scale;
    } else if (layer === 1 && reentry.active) {
      const pose = level01PoseRef?.current;
      groupRef.current.rotation.set(
        pose?.visualEuler.x ?? 0,
        (pose?.visualEuler.y ?? 0) + reentry.spin,
        pose?.visualEuler.z ?? 0,
      );
      groupRef.current.position.set(reentry.x, reentry.y, reentry.z);
      groupRef.current.scale.setScalar(1);
      livingPulse.scale = 1;
    } else if (level01Drive && level01PoseRef?.current) {
      const pose = level01PoseRef.current;
      const livingScaleTarget = level01LivingScale(livingPulse.cycleElapsed, 0, t - livingPulse.startedAt, reducedMotionRef.current);
      const livingScaleBlend = 1 - Math.exp(-frameDelta / 0.24);
      livingPulse.scale += (livingScaleTarget - livingPulse.scale) * livingScaleBlend;
      const livingScale = livingPulse.scale;
      const livingLift = reducedMotionRef.current ? 0 : ((livingScale - 0.97) / 0.07) * 0.018;
      groupRef.current.rotation.set(pose.visualEuler.x, pose.visualEuler.y + reentryState.tailAngle, pose.visualEuler.z);
      groupRef.current.position.set(pose.visualOffset.x, pose.visualOffset.y + livingLift, pose.visualOffset.z);
      groupRef.current.scale.setScalar(livingScale);
    } else if (separate) {
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.scale.setScalar(1);
      const livingSpeed = 0.12 + progress24 * 0.026;
      groupRef.current.rotation.y += frameDelta * livingSpeed;
      groupRef.current.rotation.x += (Math.sin(t * 0.09) * 0.032 - groupRef.current.rotation.x) * settleSoft;
      groupRef.current.rotation.z += (Math.cos(t * 0.075) * 0.015 - groupRef.current.rotation.z) * settleSoft;
    } else {
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.scale.setScalar(1);
      groupRef.current.rotation.y += (Math.sin(t * 0.12) * 0.052 - groupRef.current.rotation.y) * settleSlow;
      if (layer === 1 && reentryState.tailAngle !== 0) {
        groupRef.current.rotation.y += reentryState.tailAngle * settleSlow;
      }
      groupRef.current.rotation.x += (Math.sin(t * 0.1) * 0.02 - groupRef.current.rotation.x) * settleSlow;
      groupRef.current.rotation.z = 0;
    }

    // LEVEL_01 impact recoil: one short, damped displacement on lightning hit.
    // The base pose is rewritten every frame above, so the orb returns exactly
    // to its controller position when the strike finishes without residual drift.
    // The recoil begins only after the travelling bolts reach the orb. Keeping
    // this delay aligned with the impact-web delay preserves physical causality.
    const impactAge = t - impactState.startedAt - .17;
    if (layer === 1 && !reducedMotionRef.current && impactAge >= 0 && impactAge < .42) {
      const impactEnvelope = Math.exp(-impactAge * 7.2) * (1 - impactAge / .42);
      groupRef.current.position.x += Math.sin(impactAge * 78) * .075 * impactEnvelope;
      groupRef.current.position.y += Math.sin(impactAge * 53 + 1.1) * .034 * impactEnvelope;
      groupRef.current.rotation.z += Math.sin(impactAge * 74) * .045 * impactEnvelope;

      // Short "four-dimensional" peak: the stable 3D orb is briefly pulled
      // through depth and time on impact, then mathematically returns to its
      // exact base transform at the end of the same bounded window.
      const impactProgress = Math.min(1, impactAge / .42);
      const spacetimeWarp = Math.sin(impactProgress * Math.PI) ** 2 * Math.exp(-impactProgress * .45);
      groupRef.current.position.z += spacetimeWarp * .12;
      groupRef.current.scale.x *= 1 + spacetimeWarp * .038;
      groupRef.current.scale.y *= 1 - spacetimeWarp * .026;
      groupRef.current.scale.z *= 1 + spacetimeWarp * .15;
      groupRef.current.rotation.x += Math.sin(impactProgress * Math.PI * 2) * .032 * spacetimeWarp;
      groupRef.current.rotation.y -= Math.sin(impactProgress * Math.PI) * .026 * spacetimeWarp;
    }

    if (diskRef.current) {
      if (level01Drive && level01PoseRef?.current) {
        totemAngleRef.current = level01PoseRef.current.spinAngle;
        const targetTotemScale = lerpNumber(1, 0.62 + progress24 * 0.014, split);
        const targetTotemZ = -0.36 * split;
        totemScaleRef.current += (targetTotemScale - totemScaleRef.current) * Math.min(1, frameDelta * 1.35);
        totemZRef.current += (targetTotemZ - totemZRef.current) * Math.min(1, frameDelta * 1.35);
        diskRef.current.rotation.y = -Math.PI / 2 + totemAngleRef.current;
        diskRef.current.rotation.x = 0;
        diskRef.current.rotation.z = 0;
        diskRef.current.position.z = totemZRef.current;
        diskRef.current.scale.setScalar(totemScaleRef.current);
      } else {
        const fullTotemSpin = 0.16 + progress24 * 0.016;
        totemAngleRef.current += frameDelta * fullTotemSpin;
        const targetTotemScale = lerpNumber(1, 0.62 + progress24 * 0.014, split);
        const targetTotemZ = -0.36 * split;
        totemScaleRef.current += (targetTotemScale - totemScaleRef.current) * Math.min(1, frameDelta * 1.35);
        totemZRef.current += (targetTotemZ - totemZRef.current) * Math.min(1, frameDelta * 1.35);
        diskRef.current.rotation.y = -Math.PI / 2 + totemAngleRef.current;
        diskRef.current.rotation.x = Math.sin(t * 0.09) * 0.026;
        diskRef.current.rotation.z = Math.sin(t * 0.07) * 0.008;
        diskRef.current.position.z = totemZRef.current;
        diskRef.current.scale.setScalar(totemScaleRef.current);
      }
    }

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
    const haloVisible = false;
    if (macroGroupRef.current) macroGroupRef.current.visible = macroVisible;
    if (energyFieldRef.current) energyFieldRef.current.visible = haloVisible;
    if (outerShellRef.current) outerShellRef.current.visible = haloVisible;

    const showLiangyi = split > 0.04 && shellFade > 0.02;
    if (yinRef.current) {
      yinRef.current.visible = showLiangyi || warming;
      yinRef.current.scale.setScalar(showLiangyi ? scale : warmScale);
    }
    if (yangRef.current) {
      yangRef.current.visible = showLiangyi || warming;
      yangRef.current.scale.setScalar(showLiangyi ? scale : warmScale);
    }
    const showSixiang = sixiangPresence(depth) > 0.04 && macroVisible;
    if (sixiangGroupRef.current) {
      sixiangGroupRef.current.visible = showSixiang || warming;
      sixiangGroupRef.current.scale.setScalar(showSixiang ? sixiangPresence(depth) : warmScale);
    }

    const ballMat = ballMatRef.current;
    if (ballMat && diskRef.current) {
      const level01SurfaceEnergy = motionGamePose
        ? Math.max(motionGamePose.motionGame.motionMagnitude, motionGamePose.motionEnergy)
        : 0;
      const baseOpacity = lerpNumber(1, 0.82, split);
      const opacity = Number.isFinite(baseOpacity * shellFade) ? Math.min(1, Math.max(0, baseOpacity * shellFade)) : 1;
      ballMat.opacity = opacity;
      ballMat.depthWrite = opacity > 0.995;
      // LEVEL 01 surface refinement: reuse material uniforms only. Motion makes
      // the glaze read more crisply, then it eases back without extra geometry.
      ballMat.bumpScale = 0.01 + surfaceD * 0.075 + level01SurfaceEnergy * 0.007;
      // LEVEL_01_JADE_GLAZE: a softer, narrower reflection keeps the first
      // layer dimensional without making the black-jade surface look plastic.
      if (layer === 1) {
        ballMat.clearcoat = 0.72 + level01SurfaceEnergy * 0.06;
        ballMat.roughness = 0.34 + surfaceD * 0.14 - level01SurfaceEnergy * 0.03;
        ballMat.clearcoatRoughness = 0.18 + surfaceD * 0.1 - level01SurfaceEnergy * 0.012;
        ballMat.envMapIntensity = 0.94 + level01SurfaceEnergy * 0.08;
      } else {
        ballMat.clearcoat = 1;
        ballMat.roughness = 0.28 + surfaceD * 0.22 - level01SurfaceEnergy * 0.055;
        ballMat.clearcoatRoughness = 0.1 + surfaceD * 0.16 - level01SurfaceEnergy * 0.025;
        ballMat.envMapIntensity = 1.46 + level01SurfaceEnergy * 0.2;
      }
      ballMat.emissiveIntensity = (separate ? 0.035 : 0.052) + level01SurfaceEnergy * 0.018;
      diskRef.current.visible = opacity > 0.004;
      if (opacity > 0.004 && diskRef.current.scale.lengthSq() < 0.0001) {
        diskRef.current.scale.setScalar(1);
      }
    }
    if (surfaceNoise) {
      const grain = 2 + surfaceD * 11;
      if (Math.abs(surfaceNoise.repeat.x - grain) > 0.01) surfaceNoise.repeat.set(grain, grain);
    }

    const quantumWeight = bandWeight(depth, TAIJI_BANDS.quantum.enter, TAIJI_BANDS.quantum.full, TAIJI_BANDS.quantum.exitStart, TAIJI_BANDS.quantum.exitEnd);
    const cellularWeight = bandWeight(depth, TAIJI_BANDS.cellular.enter, TAIJI_BANDS.cellular.full, TAIJI_BANDS.cellular.exitStart, TAIJI_BANDS.cellular.exitEnd);
    const entangleWeight = bandWeight(depth, TAIJI_BANDS.entanglement.enter, TAIJI_BANDS.entanglement.full, TAIJI_BANDS.entanglement.exitStart, TAIJI_BANDS.entanglement.exitEnd);
    const abyssWeight = bandWeight(depth, TAIJI_BANDS.abyss.enter, TAIJI_BANDS.abyss.full, TAIJI_BANDS.abyss.exitStart, TAIJI_BANDS.abyss.exitEnd);

    if (quantumGroupRef.current && diskRef.current) {
      if (quantumWeight > 0.02) quantumGroupRef.current.rotation.set(0, 0, 0);
      else quantumGroupRef.current.rotation.y = diskRef.current.rotation.y + Math.PI / 2;
      quantumGroupRef.current.visible = quantumWeight > 0.002 || warming;
    }
    if (deepGroupRef.current) {
      deepGroupRef.current.visible = entangleWeight > 0.002 || warming;
      if (deepGroupRef.current.visible) {
        deepGroupRef.current.quaternion.copy(groupRef.current.quaternion).invert();
      }
    }
    if (cellularGroupRef.current) {
      cellularGroupRef.current.visible = cellularWeight > 0.002 || warming;
      if (cellularGroupRef.current.visible) {
        cellularGroupRef.current.quaternion.copy(groupRef.current.quaternion).invert();
      }
    }
    if (abyssGroupRef.current) {
      abyssGroupRef.current.visible = abyssWeight > 0.002 || warming;
      if (abyssGroupRef.current.visible) {
        abyssGroupRef.current.quaternion.copy(groupRef.current.quaternion).invert();
      }
    }

    if (raysRef.current) {
      raysRef.current.material.rotation += frameDelta * (0.007 + progress24 * 0.008) * raySpinDir;
      raysRef.current.material.opacity = Math.min(0.09, 0.032 + progress24 * 0.018 + Math.sin(t * 0.28) * 0.003 + pulse * 0.025) * macroFade;
      const rayScale = 4.55 * (1 + progress24 * 0.01 + Math.sin(t * 0.28) * 0.003 + pulse * 0.012);
      raysRef.current.scale.set(rayScale, rayScale, 1);
      raysRef.current.visible = (!separate && macroVisible) || warming;
      raysRef.current.material.color.set(activeTheme.primary);
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = Math.min(0.13, 0.078 + progress24 * 0.018 + Math.sin(t * 0.46) * 0.003 + pulse * 0.022) * macroFade;
      const glowScale = 3.65 * (1 + progress24 * 0.01 + Math.sin(t * 0.46) * 0.003 + pulse * 0.012);
      glowRef.current.scale.set(glowScale, glowScale, 1);
      glowRef.current.visible = (!separate && macroVisible) || warming;
      glowRef.current.material.color.set(activeTheme.primary);
    }

    sepRef.current += (offset - sepRef.current) * Math.min(1, frameDelta * 1.05);
    const sep = sepRef.current;
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
      const showBagua = baguaPresence(depth) > 0.04 && macroVisible;
      baguaOrbitRef.current.visible = showBagua || warming;
      baguaOrbitRef.current.scale.setScalar(showBagua ? baguaPresence(depth) : warmScale);
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
          opacity={0.018}
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
          size={0.72}
          speed={0.04}
          opacity={0.18}
          color={activeTheme.primary}
        />
      </group>

      {/* 量子層：光子與粒子的糾纏（×100 起浮現，×10,000 之後接管整個畫面） */}
      <group ref={quantumGroupRef}>
        <TaijiQuantumField
          journeyRef={journeyRef}
          warmRef={warmRef}
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
          journeyRef={journeyRef}
          warmRef={warmRef}
          yinColor="#9fc4e8"
          yangColor={TAIJI_BENCHMARK_THEME.primary}
          sparkColor="#fff6dc"
        />
      </group>

      {/* 細胞內景層：×100,000,000 → ×100,000,000,000，把波包內浮現的太極當成一層細胞膜繼續深入。
          與糾纏內景層同一種「站著不動」處理，淡入門檻與其終點刻意重疊，銜接才會順。 */}
      <group ref={cellularGroupRef}>
        <TaijiCellularCore
          journeyRef={journeyRef}
          warmRef={warmRef}
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
          journeyRef={journeyRef}
          warmRef={warmRef}
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
        <mesh
          ref={(node) => { diskRef.current = node; if (ballWorldRef) ballWorldRef.current = node; }}
          geometry={taijiBallGeo}
          renderOrder={separate ? 1 : 2}
        >
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
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Taiji24SoundEngine | null>(null);
  const journeyRef = useRef(createTaijiJourneyState(TAIJI_DEPTH_MIN));
  const [displayLayer, setDisplayLayer] = useState(TAIJI_DEPTH_MIN);
  const journeyStage = stageFromDepth(displayLayer);
  const journeyTheme = TAIJI_24_THEMES[displayLayer - 1];
  const [combo, setCombo] = useState(0);
  const [visualPulse, setVisualPulse] = useState(0);
  const [todayAwakened, setTodayAwakened] = useState(false);
  const [attractTick, setAttractTick] = useState(0);
  const [touchActive, setTouchActive] = useState(false);
  const [touchRebounding, setTouchRebounding] = useState(false);
  const [lightningOrigin, setLightningOrigin] = useState<Level01StrikeOrigin>('N');
  const [lightningVariant, setLightningVariant] = useState(0);
  const [lightningStrikeId, setLightningStrikeId] = useState(0);
  const [lightningScar, setLightningScar] = useState<{ id: number; origin: Level01StrikeOrigin; variant: number } | null>(null);
  const [lightningWeb, setLightningWeb] = useState<Array<{ id: number; origin: Level01StrikeOrigin; variant: number }>>([]);
  const lightningVariantRef = useRef(0);
  const lightningReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lightningScarClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchReboundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickAtRef = useRef(0);
  const touchRef = useRef({ active: false, x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showLayerReviewPanel, setShowLayerReviewPanel] = useState(false);
  const canvasQuality = useTaijiCanvasQuality(wrapperRef);
  // 第一層內部遊戲仍保持純太極與四核心；使用者明確雙指縮放時，
  // 才沿既有旅程從第一層進入第二至第二十四層。
  useTaijiJourneyGestures(wrapperRef, journeyRef);
  const level01ControllerRef = useRef<Level01TaijiMotionController | null>(null);
  if (level01ControllerRef.current == null) {
    level01ControllerRef.current = new Level01TaijiMotionController();
  }
  const level01Controller = level01ControllerRef.current;
  const level01PoseRef = useRef(level01Controller.pose);
  level01PoseRef.current = level01Controller.pose;
  // LEVEL_01 ONLY：讓魚眼閃電能讀到球體目前的即時世界座標與旋轉，不影響 LEVEL_02～24。
  const level01BallRef = useRef<THREE.Mesh | null>(null);
  const [level01Driving, setLevel01Driving] = useState(false);
  const [taijiInView, setTaijiInView] = useState(true);

  const TAIJI_DAILY_KEY = 'tdh:taiji24:daily:v1';
  const todayKey = () => new Date().toISOString().slice(0, 10);

  const markLayer = useCallback((layer: number, playSound: boolean) => {
    const next = Math.max(TAIJI_DEPTH_MIN, Math.min(TAIJI_DEPTH_MAX, Math.round(layer)));
    // 第一層是固定互動底座，不是過場目標。若只更新 target，上一層的
    // current 會在數個 frame 內慢慢回落，round() 期間仍可能回報第 2 層。
    // Explicitly selecting/returning to layer 1 must therefore clear both
    // current and target atomically, with no residual auto-transition.
    if (next === TAIJI_DEPTH_MIN) {
      jumpJourney(journeyRef.current, TAIJI_DEPTH_MIN);
      setDisplayLayer(TAIJI_DEPTH_MIN);
    } else {
      setJourneyTarget(journeyRef.current, next);
    }
    setVisualPulse(performance.now());
    if (!playSound) return;
    const engine = soundRef.current ?? new Taiji24SoundEngine();
    soundRef.current = engine;
    void engine.playLayer(next).catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TAIJI_DAILY_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { date?: string; awakened?: boolean };
      if (saved.date === todayKey() && saved.awakened) {
        setTodayAwakened(true);
        // 完成紀錄只保留成果，不再把客戶首頁切回第二十四層。
        // 審查者仍可透過 taijiStep / 面板查看完整二十四層素材。
        jumpJourney(journeyRef.current, TAIJI_DEPTH_MIN);
        setDisplayLayer(TAIJI_DEPTH_MIN);
      }
    } catch { /* localStorage 受限時靜默略過 */ }
  }, []);

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

  useEffect(() => {
    const timer = setInterval(() => {
      if (performance.now() - lastClickAtRef.current > 18000) {
        setAttractTick((tick) => tick + 1);
      }
    }, 18000);
    return () => clearInterval(timer);
  }, []);

  const advanceLayer = useCallback(() => {
    if (journeyRef.current.current >= TAIJI_DEPTH_MAX - 0.02 && journeyRef.current.target >= TAIJI_DEPTH_MAX) return;
    const currentLayer = Math.floor(journeyRef.current.current + 1e-6);
    if (currentLayer >= TAIJI_DEPTH_MAX) return;
    const nowMs = performance.now();
    const nextCombo = nowMs - lastClickAtRef.current < 2200 ? combo + 1 : 1;
    lastClickAtRef.current = nowMs;
    setCombo(nextCombo);
    const next = currentLayer + 1;
    markLayer(next, true);
    onStageChange?.(stageFromDepth(next));
    if (next >= TAIJI_DEPTH_MAX) {
      setTodayAwakened(true);
      onComplete?.();
      try {
        window.localStorage.setItem(TAIJI_DAILY_KEY, JSON.stringify({ date: todayKey(), awakened: true }));
      } catch { /* ignore */ }
    }
  }, [combo, markLayer, onComplete, onStageChange]);

  const handleCoreClick = useCallback(() => {
    if (displayLayer === 1) {
      if (level01Controller.pose.permission === 'idle') void level01Controller.armFromUserGesture();
      return;
    }
    advanceLayer();
  }, [advanceLayer, displayLayer, level01Controller]);

  const selectJourneyStep = useCallback((nextStep: number) => {
    markLayer(nextStep, true);
  }, [markLayer]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedStep = Number(params.get('taijiStep'));
    setShowLayerReviewPanel(params.get('taijiReview') === '1' || params.has('taijiStep'));
    if (!Number.isInteger(requestedStep) || requestedStep < 1 || requestedStep > 24) return;
    jumpJourney(journeyRef.current, requestedStep);
    setDisplayLayer(requestedStep);
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    autoTimer.current = setInterval(advanceLayer, autoPlayInterval);
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [autoPlay, autoPlayInterval, advanceLayer]);

  useEffect(() => {
    const controller = level01ControllerRef.current;
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
      controller?.dispose();
      if (level01ControllerRef.current === controller) level01ControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const target = wrapperRef.current;
    let inView = true;
    const syncHidden = () => level01ControllerRef.current?.setHidden(document.hidden || !inView);
    const observer = target && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
        inView = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.05);
        setTaijiInView(inView);
        syncHidden();
      }, { threshold: [0, 0.05] })
      : null;
    if (target) observer?.observe(target);
    syncHidden();
    document.addEventListener('visibilitychange', syncHidden);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', syncHidden);
    };
  }, []);

  const triggerLightning = useCallback((strikeOrigin: Level01StrikeOrigin) => {
    if (lightningReleaseTimerRef.current) clearTimeout(lightningReleaseTimerRef.current);
    if (lightningScarClearTimerRef.current) clearTimeout(lightningScarClearTimerRef.current);
    const variant = lightningVariantRef.current;
    setLightningOrigin(strikeOrigin);
    setLightningVariant(variant);
    lightningVariantRef.current = (variant + 1) % 8;
    setLightningStrikeId((id) => {
      const nextId = id + 1;
      setLightningScar({ id: nextId, origin: strikeOrigin, variant });
      // Keep a compact, session-local 3D memory of completed hits. The
      // temporary route above still clears independently after it returns.
      setLightningWeb((current) => [...current, { id: nextId, origin: strikeOrigin, variant }].slice(-12));
      return nextId;
    });
    // .17s impact arrival (the shared audio cue) + .22s traced growth + .90s inspection hold +
    // 1.12s endpoint-first retraction. State then unmounts the completed path.
    lightningScarClearTimerRef.current = setTimeout(() => {
      setLightningScar(null);
      // The temporary web is a recovery visualization, not permanent damage:
      // once its source-bound technology has returned, the Taiji is clean.
      setLightningWeb([]);
      lightningScarClearTimerRef.current = null;
    }, 2410);
    setTouchActive(true);
    // 雷網只在固定的太極表面上生長：保留既有聲音/觸覺回饋，但不以這個
    // 入雷口重新啟動感測器或任何會改變球體姿態的進場動畫。
    if (displayLayer === 1) level01Controller.playTouchReboundFeedback('press', strikeOrigin);
    lightningReleaseTimerRef.current = setTimeout(() => {
      setTouchActive(false);
      lightningReleaseTimerRef.current = null;
    }, 96);
  }, [displayLayer, level01Controller]);

  const handleTouchStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (touchReboundTimerRef.current) clearTimeout(touchReboundTimerRef.current);
    setTouchRebounding(false);
    touchRef.current.active = true;
    touchRef.current.x = event.clientX;
    touchRef.current.y = event.clientY;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const strikeOrigin: Level01StrikeOrigin = Math.abs(dx) > Math.abs(dy)
      ? (dx >= 0 ? 'E' : 'W')
      : (dy >= 0 ? 'S' : 'N');
    triggerLightning(strikeOrigin);
    if (displayLayer !== 1 && navigator.vibrate) navigator.vibrate(8);
  }, [displayLayer, triggerLightning]);

  const handleTouchMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!touchRef.current.active) return;
    touchRef.current.x = event.clientX;
    touchRef.current.y = event.clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const shouldRebound = touchRef.current.active && displayLayer === 1;
    touchRef.current.active = false;
    setTouchActive(false);
    if (shouldRebound) {
      level01Controller.playTouchReboundFeedback('release');
      setTouchRebounding(true);
      touchReboundTimerRef.current = setTimeout(() => {
        setTouchRebounding(false);
        touchReboundTimerRef.current = null;
      }, 520);
    }
  }, [displayLayer, level01Controller]);

  useEffect(() => () => {
    if (touchReboundTimerRef.current) clearTimeout(touchReboundTimerRef.current);
    if (lightningReleaseTimerRef.current) clearTimeout(lightningReleaseTimerRef.current);
    if (lightningScarClearTimerRef.current) clearTimeout(lightningScarClearTimerRef.current);
  }, []);

  /* textureUrl / videoUrl 保留 API 相容；視覺已改為程式生成圖騰，不再需要外部貼圖 */
  void textureUrl;
  void videoUrl;

  const visualStyle = {
    '--journey-deg': `${Math.round(progressFromDepth(displayLayer) * 360)}deg`,
    '--theme-primary': journeyTheme.primary,
    '--theme-secondary': journeyTheme.secondary,
    '--theme-soft': journeyTheme.soft,
    '--theme-glow': journeyTheme.glow,
    '--combo-opacity': combo >= 3 ? '0.72' : '0',
    '--completion-opacity': todayAwakened || displayLayer >= 24 ? '1' : '0',
  } as CSSProperties;

  return (
    <section
      className={`${styles.root} ${styles[`stage_${journeyStage.toLowerCase()}`]}`}
      aria-label="太極演化系統"
      style={visualStyle}
      data-deep-field={displayLayer >= 13}
      data-journey-step={displayLayer}
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
          className={`${level01Styles.taijiCanvas} ${displayLayer === 1 && touchActive ? level01Styles.taijiCanvasPressed : ''} ${displayLayer === 1 && touchRebounding ? level01Styles.taijiCanvasRebound : ''}`}
          frameloop={taijiInView ? 'always' : 'never'}
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
          <Level01FrameBinder controller={level01Controller} enabled={displayLayer === 1} />
          {displayLayer === 1 && level01Controller.pose.motionGameEnabled && (
            <>
              <Level01SpatialLightning active={touchActive} origin={lightningOrigin} variant={lightningVariant} strikeId={lightningStrikeId} lowPower={canvasQuality.lowPower} />
              <Level01LightningScars
                scar={lightningScar}
                lowPower={canvasQuality.lowPower}
              />
              <Level01AccumulatedLightningWeb
                strikes={lightningWeb}
                flashStrikeId={lightningStrikeId}
                lowPower={canvasQuality.lowPower}
                ballWorldRef={level01BallRef}
              />
            </>
          )}
          <TaijiPerformanceGovernor active={touchActive} />
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
          <ambientLight intensity={0.22} />
          {/* A bounded, in-volume scan light: it only rises during a strike,
              reads through the ceramic as a brief technological core pulse,
              then leaves the charcoal/ember scars as the dominant residue. */}
          {displayLayer === 1 && <pointLight position={[0, 0, 0.18]} color="#67e8f9" intensity={touchActive ? 1.15 : 0} distance={2.1} decay={2} />}
          <KeyLightSweep theme={journeyTheme} progress24={progressFromDepth(displayLayer)} />
          <pointLight position={[-4, -2.5, 2.5]} intensity={0.3} color="#6fa8c0" />
          <pointLight position={[0, 2.2, -4.5]} intensity={1.15} color={journeyTheme.accent} />
          <TaijiCore
            attractTick={attractTick}
            theme={journeyTheme}
            journeyRef={journeyRef}
            quantumPairs={canvasQuality.quantumPairs}
            quantumLinks={canvasQuality.quantumLinks}
            ultraTexture={canvasQuality.ultraTexture}
            onCoreClick={handleCoreClick}
            level01PoseRef={level01PoseRef}
            // Impact energy is carried by the lightning mesh itself. Keeping
            // this false prevents any recoil, scale or orientation change to
            // the fixed Taiji ball.
            level01ImpactActive={false}
            onLevel01Reentry={() => level01Controller.playReentryWhoosh()}
            ballWorldRef={level01BallRef}
          />
          <OrbitControls
            makeDefault
            enableZoom={false}
            enablePan={false}
            enableDamping
            dampingFactor={0.11}
            rotateSpeed={0.52}
            // The user may still drag to inspect the 3D sphere, but the resting
            // ball must not rotate by itself while the lightning wood accumulates.
            autoRotate={false}
            autoRotateSpeed={0.16}
            touches={{ ONE: THREE.TOUCH.ROTATE }}
          />
          <JourneyRig journeyRef={journeyRef} onLayerChange={setDisplayLayer} />
        </Canvas>
        <Level01TaijiOverlay
          controller={level01Controller}
          visible={displayLayer === 1}
          interacting={touchActive}
          onDrivingChange={setLevel01Driving}
          onStrike={triggerLightning}
        />
        {/* 客戶頁只保留可直接點擊的太極圖騰；倍率／步數／解析度等驗收輔助資訊不對外顯示。 */}
      </div>
      {showLayerReviewPanel && (
        <aside className={styles.layerReviewPanel} aria-label="太極二十四層預覽控制">
          <div className={styles.layerReviewHeading}>
            <span>24 層預覽</span>
            <output>{displayLayer} / 24</output>
          </div>
          <div className={styles.layerReviewGrid} aria-label="選擇太極演化層數">
            {Array.from({ length: 24 }, (_, index) => {
              const layer = index + 1;
              const selected = displayLayer === layer;
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
