'use client';

/**
 * 【太極演化系統 V2｜React Three Fiber】（2026-08-13 依業主檔案開工）
 * 太極 → 兩儀 → 四象 → 八卦，功能保留、圖案全面換新：
 * - 陰陽兩球獨立旋轉（分離後反向、不同速、不碰撞不重疊）
 * - 真 3D 多軸旋轉（y 連續 + x/z 正弦擺動 = 近 4D 連續變化）
 * - 已套用畫質優化：太極卡 Canvas 固定 3x DPR（360px≈1080px backing store）、
 *   antialias on、幾何體 useMemo 重用、Sparkles 降量、ContactShadows frames=1
 * - 點擊演化接上既有 Taiji24SoundEngine（功能依然存在）
 * 範圍鎖定：只供太極卡使用，不影響其他卡片與手機版面。
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Sparkles,
  Float,
  ContactShadows,
  AdaptiveEvents,
  Environment,
  Lightformer,
} from '@react-three/drei';
import * as THREE from 'three';
import { Taiji24SoundEngine } from '@/lib/taiji24-sound-engine';
import styles from './TaijiSystem.module.css';

type Stage = 'TAIJI' | 'LIANGYI' | 'SIXIANG' | 'BAGUA';

const STAGES: Stage[] = ['TAIJI', 'LIANGYI', 'SIXIANG', 'BAGUA'];

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

/* 表面微紋理（2026-08-14 兩儀真實感升級）：
   完美光滑＝一眼假。低對比噪點作 bumpMap，給瓷釉與黑曜石「呼吸的皮膚」。 */
function createSurfaceNoiseTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  // 大中小三層柔和斑紋，像手工釉面的自然不均
  const layers = [
    { count: 60, rMin: 18, rMax: 60, alpha: 0.05 },
    { count: 160, rMin: 6, rMax: 20, alpha: 0.045 },
    { count: 420, rMin: 1.5, rMax: 6, alpha: 0.04 },
  ];
  let seed = 12345;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  layers.forEach(({ count, rMin, rMax, alpha }) => {
    for (let i = 0; i < count; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = rMin + rand() * (rMax - rMin);
      const light = rand() > 0.5;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, light ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`);
      grad.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
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

function createTaijiSphereTexture(theme: TaijiVisualTheme) {
  /* 立體球版（2026-08-14 依指示）：等距柱狀投影——
     球體正面（貼圖中央）畫完整太極 S 弧與雙魚眼，左右延伸墨／月兩色包覆全球，
     從鏡頭看是一顆完整立體太極球，球緣自然彎曲、不再是紙片。 */
  const w = 2048;
  const h = 1024;
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
  texture.anisotropy = 8;
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

/** 實拍感（2026-08-16）：呼吸鏡頭——真實攝影機永遠有極微晃動，完全靜止＝一眼 CG */
function CameraBreath() {
  useFrame((state) => {
    state.camera.position.x += (0 - state.camera.position.x) * 0.04;
    state.camera.position.y += (0 - state.camera.position.y) * 0.04;
    state.camera.lookAt(0, 0, 0);
  });
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
    const t = state.clock.elapsedTime;
    // 24 面貌：每響專屬的環速、方向與傾角種子（黃金角散佈，永不重複）
    const variation = step24 > 0 ? VARIATION_24[Math.min(23, step24 - 1)] : null;
    const speed = (variation ? variation.ringSpeed : 0.026 + stageDepth * 0.006) * (1 + Math.sin(t * 0.24) * 0.025);
    const dir = variation ? variation.ringDir : 1;
    const tiltSeed = variation ? (variation.ringTiltSeed * Math.PI) / 180 : 0;
    ringRef.current.rotation.y += delta * speed * dir;
    ringRef.current.rotation.x += (Math.sin(t * 0.1 + tiltSeed) * 0.055 - ringRef.current.rotation.x) * 0.028;
    ringRef.current.rotation.z += (Math.cos(t * 0.09 + tiltSeed) * 0.038 - ringRef.current.rotation.z) * 0.028;

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
  onCoreClick,
}: {
  step24?: number;
  progress24?: number;
  attractTick?: number;
  theme: TaijiVisualTheme;
  stage: Stage;
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
  const outerMatRef = useRef<THREE.MeshPhysicalMaterial>(null);

  // ===== 幾何體重用 =====
  const taijiBallGeo = useMemo(() => new THREE.SphereGeometry(1.08, 48, 48), []);
  const mainGeo = useMemo(() => new THREE.SphereGeometry(0.82, 64, 64), []);
  const dotGeo = useMemo(() => new THREE.SphereGeometry(0.15, 28, 28), []);
  const outerGeo = useMemo(() => new THREE.SphereGeometry(1.48, 32, 32), []);
  const energyGeo = useMemo(() => new THREE.SphereGeometry(1.68, 32, 32), []);
  const smallGeo = useMemo(() => new THREE.SphereGeometry(0.2, 16, 16), []);
  const baguaGeo = useMemo(() => new THREE.SphereGeometry(0.24, 32, 32), []);
  const baguaRimGeo = useMemo(() => new THREE.TorusGeometry(0.255, 0.006, 8, 64), []);
  const baguaSealGeo = useMemo(() => new THREE.TorusGeometry(0.15, 0.004, 8, 48), []);
  const baguaOrbitGeo = useMemo(() => new THREE.TorusGeometry(2.08, 0.004, 8, 160), []);
  const baguaOuterOrbitGeo = useMemo(() => new THREE.TorusGeometry(2.3, 0.0025, 8, 160), []);
  const baguaInnerOrbitGeo = useMemo(() => new THREE.TorusGeometry(1.86, 0.0025, 8, 160), []);

  /* 24 響 × 24 主題：每一響換一套配色主題重繪球體與光效（可變獎勵的顏色維度）。
     未點擊（step 0）採用第 24 主題（經典鎏金）作為預設面貌。 */
  const activeTheme = theme ?? TAIJI_24_THEMES[step24 > 0 ? (step24 - 1) % 24 : 23];
  /* 真實感鐵律（2026-08-14 依指示）：真實物體不會換材質——
     球體本體永遠使用「第一張」的墨玉×月瓷基準（材質恆定＝真實感恆定），
     24 響的變化只落在環繞它的光（光暈、光束、軌道環、燈色溫）。 */
  const ballTexture = useMemo(() => createTaijiSphereTexture(TAIJI_BENCHMARK_THEME), []);
  const surfaceNoise = useMemo(() => createSurfaceNoiseTexture(), []);
  const glowTexture = useMemo(() => createGlowTexture(activeTheme), [activeTheme]);
  const raysTexture = useMemo(() => createGodRaysTexture(activeTheme), [activeTheme]);
  useEffect(() => () => {
    taijiBallGeo.dispose();
    mainGeo.dispose();
    dotGeo.dispose();
    outerGeo.dispose();
    energyGeo.dispose();
    smallGeo.dispose();
    baguaGeo.dispose();
    baguaRimGeo.dispose();
    baguaSealGeo.dispose();
    baguaOrbitGeo.dispose();
    baguaOuterOrbitGeo.dispose();
    baguaInnerOrbitGeo.dispose();
  }, [taijiBallGeo, mainGeo, dotGeo, outerGeo, energyGeo, smallGeo, baguaGeo, baguaRimGeo, baguaSealGeo, baguaOrbitGeo, baguaOuterOrbitGeo, baguaInnerOrbitGeo]);
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
  /* 鐵律：兩球絕對不碰撞不重疊——球半徑 0.82×0.88≈0.72，兩心距 2×0.88=1.76 > 1.44，任何角度都不相交 */
  const offset = separate ? 0.88 : 0;
  const scale = separate ? 0.88 : 1;

  // ===== 優化後的 useFrame =====
  useFrame((state, delta) => {
    if (!groupRef.current) return;
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
    pulseRef.current = Math.max(0, pulseRef.current - delta * 0.72);
    const pulse = pulseRef.current;
    if (outerMatRef.current) {
      outerMatRef.current.opacity = Math.min(0.085, 0.024 + progress24 * 0.01 + pulse * 0.022);
      outerMatRef.current.emissiveIntensity = 0.1 + progress24 * 0.08 + pulse * 0.14;
    }
    if (outerShellRef.current) {
      outerShellRef.current.scale.setScalar(1 + Math.sin(t * 0.52) * 0.005 + pulse * 0.007);
      outerShellRef.current.rotation.y += delta * 0.011;
    }
    if (energyFieldRef.current) {
      energyFieldRef.current.scale.setScalar(1 + Math.sin(t * 0.46 + 0.8) * 0.007 + pulse * 0.008);
      energyFieldRef.current.rotation.y -= delta * 0.014;
      energyFieldRef.current.rotation.x = Math.sin(t * 0.08) * 0.01;
    }

    if (separate) {
      // 分離後：整體多軸旋轉（365° 全角度、近 4D 連續變化）
      // 「穩」：俯仰/側傾改緩動追隨，階段切換無接縫，擺動永遠柔順。
      const livingSpeed = 0.12 + progress24 * 0.026;
      groupRef.current.rotation.y += delta * livingSpeed;
      groupRef.current.rotation.x += (Math.sin(t * 0.09) * 0.032 - groupRef.current.rotation.x) * 0.024;
      groupRef.current.rotation.z += (Math.cos(t * 0.075) * 0.015 - groupRef.current.rotation.z) * 0.024;
    } else {
      // 太極階段：圖騰保持正面可辨識，只做輕微呼吸擺動，回正不歪斜
      groupRef.current.rotation.y += (Math.sin(t * 0.12) * 0.052 - groupRef.current.rotation.y) * 0.02;
      groupRef.current.rotation.x += (Math.sin(t * 0.1) * 0.02 - groupRef.current.rotation.x) * 0.02;
      groupRef.current.rotation.z = 0;
    }

    // 太極圖騰（2026-08-16「太極要穩」）：365° 連續自轉核心——
    // 穩定性關鍵修正：轉角改「增量積分」（rotation += delta×速度），
    // 24 響任何一響改變速度時只影響當下、絕不瞬跳；縮放與深度同樣平滑過渡，順到無接縫。
    if (diskRef.current) {
      const fullTotemSpin = 0.16 + progress24 * 0.016;
      totemAngleRef.current += delta * fullTotemSpin;
      const targetTotemScale = separate ? 0.62 + progress24 * 0.014 : 1;
      const targetTotemZ = separate ? -0.36 : 0;
      totemScaleRef.current += (targetTotemScale - totemScaleRef.current) * Math.min(1, delta * 1.35);
      totemZRef.current += (targetTotemZ - totemZRef.current) * Math.min(1, delta * 1.35);
      diskRef.current.rotation.y = -Math.PI / 2 + totemAngleRef.current;
      diskRef.current.rotation.x = Math.sin(t * 0.09) * 0.026;
      diskRef.current.rotation.z = Math.sin(t * 0.07) * 0.008;
      diskRef.current.position.z = totemZRef.current;
      diskRef.current.scale.setScalar(totemScaleRef.current);
    }

    // 光線科技①：雲隙光束保留為極低亮度背景補光，避免貼圖感與卡通化。
    if (raysRef.current) {
      raysRef.current.material.rotation += delta * (0.007 + progress24 * 0.008) * raySpinDir;
      raysRef.current.material.opacity = Math.min(0.09, 0.032 + progress24 * 0.018 + Math.sin(t * 0.28) * 0.003 + pulse * 0.025);
      const rayScale = 4.55 * (1 + progress24 * 0.01 + Math.sin(t * 0.28) * 0.003 + pulse * 0.012);
      raysRef.current.scale.set(rayScale, rayScale, 1);
    }
    // 光線科技②：核心光暈壓低，只做材質周圍的柔和反射。
    if (glowRef.current) {
      glowRef.current.material.opacity = Math.min(0.13, 0.078 + progress24 * 0.018 + Math.sin(t * 0.46) * 0.003 + pulse * 0.022);
      const glowScale = 3.65 * (1 + progress24 * 0.01 + Math.sin(t * 0.46) * 0.003 + pulse * 0.012);
      glowRef.current.scale.set(glowScale, glowScale, 1);
    }

    // 兩儀分離距離平滑演化：從核心誕生撐開，不瞬間跳位
    sepRef.current += (offset - sepRef.current) * Math.min(1, delta * 1.05);
    const sep = sepRef.current;

    // 陰陽獨立旋轉（分離後反向不同速，永不碰撞）＋24 步進程微加速（旅程越走越有勁）
    const spinBoost = 1 + progress24 * 0.18;
    if (yinRef.current) {
      yinRef.current.position.x = -sep;
      yinRef.current.position.y = 0.08 + Math.sin(t * 0.22) * 0.004;
      yinRef.current.rotation.z += delta * 0.38 * spinBoost;
      yinRef.current.rotation.y += delta * 0.14 * spinBoost;
    }
    if (yangRef.current) {
      yangRef.current.position.x = sep;
      yangRef.current.position.y = -0.08 + Math.sin(t * 0.2 + Math.PI) * 0.004;
      yangRef.current.rotation.z -= delta * 0.44 * spinBoost;
      yangRef.current.rotation.y -= delta * 0.13 * spinBoost;
    }
    if (baguaOrbitRef.current) {
      baguaOrbitRef.current.rotation.z += delta * (0.008 + progress24 * 0.004);
      baguaOrbitRef.current.rotation.x = Math.sin(t * 0.045) * 0.012;
      baguaOrbitRef.current.rotation.y = Math.cos(t * 0.04) * 0.009;
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onCoreClick();
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* 電影級雙層能量場：透明物理球殼，低亮度，保留真實材質感。 */}
      <mesh ref={energyFieldRef} geometry={energyGeo}>
        <meshPhysicalMaterial
          color={activeTheme.secondary}
          transparent
          opacity={0.018 + progress24 * 0.012}
          transmission={0.35}
          thickness={0.55}
          metalness={0.02}
          roughness={0.38}
          clearcoat={0.7}
          clearcoatRoughness={0.28}
          emissive={activeTheme.secondary}
          emissiveIntensity={0.08 + progress24 * 0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={outerShellRef} geometry={outerGeo}>
        <meshPhysicalMaterial
          ref={outerMatRef}
          color={activeTheme.primary}
          transparent
          opacity={0.034}
          transmission={0.24}
          thickness={0.42}
          metalness={0.06}
          roughness={0.26}
          clearcoat={0.82}
          clearcoatRoughness={0.22}
          emissive={activeTheme.accent}
          emissiveIntensity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 星軌：固定低成本幾何體，讓軌道存在感清楚但不卡通化 */}
      <OrbitRings stage={stage} step24={step24} theme={activeTheme} progress24={progress24} />

      {/* 粒子（數量與速度再收斂，避免手機閃爍與廉價特效感） */}
      {/* 粒子：隨 24 步旅程增生（越點星塵越盛，黏著性可變獎勵） */}
      <Sparkles
        count={(stage === 'BAGUA' ? 8 : stage === 'SIXIANG' ? 10 : 8) + Math.round(progress24 * 3)}
        scale={2.45}
        size={0.72 + progress24 * 0.18}
        speed={0.04 + progress24 * 0.05}
        opacity={0.18}
        color={activeTheme.primary}
      />

      {/* 太極階段：真 3D 立體太極球＋雲隙光束／呼吸光暈 */}
      {!separate && raysTexture && (
        <sprite ref={raysRef} position={[0, 0, -1.08]} scale={[4.7, 4.7, 1]} renderOrder={0}>
          <spriteMaterial map={raysTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.08} />
        </sprite>
      )}
      {!separate && glowTexture && (
        <sprite ref={glowRef} position={[0, 0, -0.74]} scale={[3.75, 3.75, 1]} renderOrder={1}>
          <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.14} />
        </sprite>
      )}
      {/* 真實感升級（2026-08-14）：PBR 清漆層物理材質——上釉瓷器的真實反射，自發光大幅收斂 */}
      {ballTexture && (
        <mesh ref={diskRef} geometry={taijiBallGeo} renderOrder={separate ? 1 : 2}>
          <meshPhysicalMaterial
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
            transparent={separate}
            opacity={separate ? 0.82 : 1}
            depthWrite={!separate}
          />
        </mesh>
      )}

      {/* 兩儀真實感：球間互照——兩顆實體相鄰必然互相反光（月瓷暖光映向陰球、微弱冷反射回照陽球） */}
      {separate && (
        <>
          <pointLight position={[-0.45, 0, 1.0]} intensity={0.22} distance={2.6} decay={2} color={TAIJI_BENCHMARK_THEME.moon} />
          <pointLight position={[0.45, 0, 1.0]} intensity={0.08} distance={2.2} decay={2} color="#3a4358" />
        </>
      )}

      {/* 兩儀之後：陰球（墨玉——高光澤深黑，如拋光黑曜石），獨立旋轉 */}
      {separate && (
        <group ref={yinRef} position={[0, 0.08, 0]} scale={scale}>
          <mesh geometry={mainGeo}>
            <meshPhysicalMaterial color={TAIJI_BENCHMARK_THEME.ink} metalness={0.34} roughness={0.18} clearcoat={1} clearcoatRoughness={0.09} envMapIntensity={1.48} emissive={TAIJI_BENCHMARK_THEME.accent} emissiveIntensity={0.028 + progress24 * 0.025} bumpMap={surfaceNoise ?? undefined} bumpScale={0.012} iridescence={0.16} iridescenceIOR={1.28} />
          </mesh>
          <mesh geometry={dotGeo} position={[0, 0.4, 0.72]}>
            <meshPhysicalMaterial color={TAIJI_BENCHMARK_THEME.moon} clearcoat={0.95} clearcoatRoughness={0.12} roughness={0.28} metalness={0.04} emissive={TAIJI_BENCHMARK_THEME.primary} emissiveIntensity={0.07 + progress24 * 0.03} />
          </mesh>
        </group>
      )}

      {/* 兩儀之後：陽球（月白瓷——暖白上釉，如和田玉），反向獨立旋轉 */}
      {separate && (
        <group ref={yangRef} position={[0, -0.08, 0]} scale={scale}>
          <mesh geometry={mainGeo}>
            <meshPhysicalMaterial color={TAIJI_BENCHMARK_THEME.moon} metalness={0.04} roughness={0.3} clearcoat={0.94} clearcoatRoughness={0.14} envMapIntensity={1.24} emissive={TAIJI_BENCHMARK_THEME.primary} emissiveIntensity={0.024 + progress24 * 0.025} bumpMap={surfaceNoise ?? undefined} bumpScale={0.016} sheen={0.28} sheenColor={TAIJI_BENCHMARK_THEME.primary} sheenRoughness={0.68} />
          </mesh>
          <mesh geometry={dotGeo} position={[0, -0.4, 0.72]}>
            <meshPhysicalMaterial color={TAIJI_BENCHMARK_THEME.ink} metalness={0.32} roughness={0.18} clearcoat={1} clearcoatRoughness={0.09} envMapIntensity={1.36} />
          </mesh>
        </group>
      )}

      {/* 四象（條件渲染）：八卦階段收起四象符號，讓八顆太極石與軌道成為乾淨主視覺。 */}
      {stage === 'SIXIANG' && (
        <group>
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

      {/* 八卦（條件渲染） */}
      {stage === 'BAGUA' && (
        <group ref={baguaOrbitRef} rotation={[0.04, 0, 0]}>
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
      if (isAnimating || nextStage === stage) return;
      setIsAnimating(true);
      setStage(nextStage);
      onStageChange?.(nextStage);

      /* 連點光軌：2.2 秒內連續點擊累積 */
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
      className={`${styles.root} ${styles[`stage_${stage.toLowerCase()}`]}`}
      aria-label="太極演化系統"
      style={visualStyle}
    >
      <div
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
        <Canvas
          camera={{ position: [0, 0, 5.1], fov: 42 }}
          dpr={3} // 360px CSS canvas -> 1080px backing store for this Taiji card.
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: true,
            stencil: false,
          }}
          onCreated={({ gl }) => {
            gl.domElement.dataset.engine = 'three.js r170';
            gl.domElement.dataset.taijiScene = 'ready';
            gl.domElement.style.background = 'transparent';
            gl.setClearColor(0x000000, 0);
            /* 真實感：ACES 電影級色調映射（全世界影視工業標準），高光滾降自然不死白 */
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.12;
          }}
          performance={{ min: 0.5 }}
        >
          <AdaptiveEvents />
          <CameraBreath />
          {/* 真實感核心（2026-08-14）：程式生成影棚環境光（IBL）——
              頂部暖色柔光箱＋側面冷色燈條＋背部輪廓光，球面反射出真實的影棚光形，
              零網路資源、frames=1 只烘焙一次不吃效能 */}
          <Environment resolution={512} frames={1}>
            <Lightformer form="rect" intensity={2.2} color="#fff2d8" position={[0, 4, 2]} scale={[6, 3, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={0.9} color="#bcd8ea" position={[-5, 0, 1]} rotation={[0, Math.PI / 2.4, 0]} scale={[4, 1.4, 1]} target={[0, 0, 0]} />
            <Lightformer form="ring" intensity={1.4} color="#ffd9a0" position={[3, 1.5, -3]} scale={[3, 3, 1]} target={[0, 0, 0]} />
            <Lightformer form="circle" intensity={0.6} color="#f5e0b8" position={[0, -4, 1]} scale={[5, 5, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={0.7} color="#ffffff" position={[4.5, 2.5, 3]} rotation={[0, -Math.PI / 3, 0]} scale={[0.35, 2.6, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={0.4} color="#dce9f5" position={[-3.5, 3.5, 2]} rotation={[0, Math.PI / 3.2, 0]} scale={[0.25, 2, 1]} target={[0, 0, 0]} />
          </Environment>
          {/* 周邊世界：深空星雲＋景深星塵＋流星＋地面舞台 */}
          <AmbientWorld theme={journeyTheme} progress24={journey.progress} />
          {/* 質感打光：電影三點光——主光與背光跟著本響主題換色 */}
          <ambientLight intensity={0.22} />
          <KeyLightSweep theme={journeyTheme} progress24={journey.progress} />
          <pointLight position={[-4, -2.5, 2.5]} intensity={0.3} color="#6fa8c0" />
          <pointLight position={[0, 2.2, -4.5]} intensity={1.15} color={journeyTheme.accent} />
          <TaijiCore stage={stage} step24={journey.step} progress24={journey.progress} attractTick={attractTick} theme={journeyTheme} onCoreClick={goNext} />
          <ContactShadows position={[0, -1.9, 0]} opacity={0.46} scale={7} blur={2.8} resolution={1024} far={3} frames={1} />
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
      </div>
    </section>
  );
}
