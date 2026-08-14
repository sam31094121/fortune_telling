'use client';

/**
 * 【太極演化系統 V2｜React Three Fiber】（2026-08-13 依業主檔案開工）
 * 太極 → 兩儀 → 四象 → 八卦，功能保留、圖案全面換新：
 * - 陰陽兩球獨立旋轉（分離後反向、不同速、不碰撞不重疊）
 * - 真 3D 多軸旋轉（y 連續 + x/z 正弦擺動 = 近 4D 連續變化）
 * - 已套用效能優化：dpr 上限 1.5、antialias off、幾何體 useMemo 重用、
 *   Sparkles 降量、ContactShadows frames=1、AdaptiveDpr/AdaptiveEvents、條件渲染四象八卦
 * - 點擊演化接上既有 Taiji24SoundEngine（功能依然存在）
 * 範圍鎖定：只供太極卡使用，不影響其他卡片與手機版面。
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Sparkles,
  Float,
  ContactShadows,
  AdaptiveDpr,
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
    // 軌道環：逐響加速，方向每 8 響一換
    ringSpeed: 0.045 + step * 0.006,
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

const TAIJI_24_THEMES: TaijiVisualTheme[] = [
  { primary: '#f7d777', secondary: '#64d9ff', soft: 'rgba(247, 215, 119, 0.24)', ink: '#060915', moon: '#fff1c8', accent: '#f5b84b', glow: 'rgba(247, 215, 119, 0.42)' },
  { primary: '#6bdcff', secondary: '#f6d27a', soft: 'rgba(107, 220, 255, 0.22)', ink: '#07101d', moon: '#e8f7ff', accent: '#38bdf8', glow: 'rgba(56, 189, 248, 0.38)' },
  { primary: '#79f2c9', secondary: '#f8d36f', soft: 'rgba(121, 242, 201, 0.2)', ink: '#06140f', moon: '#ecfff8', accent: '#34d399', glow: 'rgba(52, 211, 153, 0.36)' },
  { primary: '#ffcf87', secondary: '#7dd3fc', soft: 'rgba(255, 207, 135, 0.22)', ink: '#100915', moon: '#fff2de', accent: '#fb923c', glow: 'rgba(251, 146, 60, 0.34)' },
  { primary: '#b8c7ff', secondary: '#fde68a', soft: 'rgba(184, 199, 255, 0.22)', ink: '#090b1f', moon: '#f1f4ff', accent: '#818cf8', glow: 'rgba(129, 140, 248, 0.34)' },
  { primary: '#f9b4c7', secondary: '#ffe08a', soft: 'rgba(249, 180, 199, 0.2)', ink: '#150811', moon: '#fff0f5', accent: '#fb7185', glow: 'rgba(251, 113, 133, 0.32)' },
  { primary: '#ffe29a', secondary: '#9ee7ff', soft: 'rgba(255, 226, 154, 0.24)', ink: '#0d0a08', moon: '#fff6dc', accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.36)' },
  { primary: '#c9a7ff', secondary: '#8ff5d2', soft: 'rgba(201, 167, 255, 0.2)', ink: '#0d0719', moon: '#f6efff', accent: '#a78bfa', glow: 'rgba(167, 139, 250, 0.32)' },
  { primary: '#83e7ff', secondary: '#ffd48f', soft: 'rgba(131, 231, 255, 0.21)', ink: '#06131a', moon: '#effbff', accent: '#22d3ee', glow: 'rgba(34, 211, 238, 0.34)' },
  { primary: '#d6f5a8', secondary: '#f8c37d', soft: 'rgba(214, 245, 168, 0.19)', ink: '#0b1208', moon: '#fbfff0', accent: '#a3e635', glow: 'rgba(163, 230, 53, 0.3)' },
  { primary: '#f6c66f', secondary: '#a7f3d0', soft: 'rgba(246, 198, 111, 0.22)', ink: '#120d06', moon: '#fff1cf', accent: '#d97706', glow: 'rgba(217, 119, 6, 0.34)' },
  { primary: '#7dd3fc', secondary: '#fef3c7', soft: 'rgba(125, 211, 252, 0.2)', ink: '#06111e', moon: '#edf8ff', accent: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.34)' },
  { primary: '#f0abfc', secondary: '#bae6fd', soft: 'rgba(240, 171, 252, 0.18)', ink: '#130819', moon: '#fff0ff', accent: '#d946ef', glow: 'rgba(217, 70, 239, 0.28)' },
  { primary: '#a7f3d0', secondary: '#fcd34d', soft: 'rgba(167, 243, 208, 0.2)', ink: '#06120d', moon: '#f0fff8', accent: '#10b981', glow: 'rgba(16, 185, 129, 0.32)' },
  { primary: '#fed7aa', secondary: '#93c5fd', soft: 'rgba(254, 215, 170, 0.21)', ink: '#140d08', moon: '#fff3e7', accent: '#f97316', glow: 'rgba(249, 115, 22, 0.32)' },
  { primary: '#bfdbfe', secondary: '#fde68a', soft: 'rgba(191, 219, 254, 0.2)', ink: '#071225', moon: '#eff6ff', accent: '#60a5fa', glow: 'rgba(96, 165, 250, 0.34)' },
  { primary: '#fde68a', secondary: '#67e8f9', soft: 'rgba(253, 230, 138, 0.24)', ink: '#0e0b05', moon: '#fff7d6', accent: '#facc15', glow: 'rgba(250, 204, 21, 0.36)' },
  { primary: '#99f6e4', secondary: '#f9a8d4', soft: 'rgba(153, 246, 228, 0.18)', ink: '#061413', moon: '#eefffb', accent: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.3)' },
  { primary: '#e9d5ff', secondary: '#fde68a', soft: 'rgba(233, 213, 255, 0.18)', ink: '#10081d', moon: '#faf5ff', accent: '#c084fc', glow: 'rgba(192, 132, 252, 0.3)' },
  { primary: '#fca5a5', secondary: '#bfdbfe', soft: 'rgba(252, 165, 165, 0.18)', ink: '#150808', moon: '#fff1f1', accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.28)' },
  { primary: '#bae6fd', secondary: '#a7f3d0', soft: 'rgba(186, 230, 253, 0.2)', ink: '#07131b', moon: '#f0fbff', accent: '#38bdf8', glow: 'rgba(56, 189, 248, 0.32)' },
  { primary: '#f5d0fe', secondary: '#fef08a', soft: 'rgba(245, 208, 254, 0.18)', ink: '#13071a', moon: '#fdf4ff', accent: '#e879f9', glow: 'rgba(232, 121, 249, 0.28)' },
  { primary: '#fde68a', secondary: '#f8fafc', soft: 'rgba(253, 230, 138, 0.26)', ink: '#090806', moon: '#fff8db', accent: '#eab308', glow: 'rgba(234, 179, 8, 0.38)' },
  { primary: '#fff1b8', secondary: '#7dd3fc', soft: 'rgba(255, 241, 184, 0.3)', ink: '#050712', moon: '#fff9e8', accent: '#fbbf24', glow: 'rgba(251, 191, 36, 0.48)' },
];

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
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
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
  const cx = size / 2;
  const cy = size / 2;
  const rays = 22;
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + (i % 3) * 0.05;
    const length = size * (0.34 + ((i * 7919) % 100) / 100 * 0.14);
    const halfWidth = size * (0.008 + ((i * 104729) % 100) / 100 * 0.01);
    const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
    grad.addColorStop(0, colorWithAlpha(theme.primary, 0.52));
    grad.addColorStop(0.38, colorWithAlpha(theme.accent, 0.18));
    grad.addColorStop(1, colorWithAlpha(theme.secondary, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle - Math.PI / 2) * halfWidth, cy + Math.sin(angle - Math.PI / 2) * halfWidth);
    ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
    ctx.lineTo(cx + Math.cos(angle + Math.PI / 2) * halfWidth, cy + Math.sin(angle + Math.PI / 2) * halfWidth);
    ctx.closePath();
    ctx.fill();
  }
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
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, colorWithAlpha(theme.moon, 0.92));
  grad.addColorStop(0.25, colorWithAlpha(theme.primary, 0.44));
  grad.addColorStop(0.55, colorWithAlpha(theme.accent, 0.16));
  grad.addColorStop(1, colorWithAlpha(theme.secondary, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
  const primaryGeo = useMemo(() => new THREE.TorusGeometry(1.58, 0.006, 8, 128), []);
  const secondaryGeo = useMemo(() => new THREE.TorusGeometry(1.92, 0.004, 8, 128), []);
  const stageDepth = STAGES.indexOf(stage);

  useEffect(() => () => {
    primaryGeo.dispose();
    secondaryGeo.dispose();
  }, [primaryGeo, secondaryGeo]);

  useFrame((state, delta) => {
    if (!ringRef.current) return;
    const t = state.clock.elapsedTime;
    // 24 面貌：每響專屬的環速、方向與傾角種子（黃金角散佈，永不重複）
    const variation = step24 > 0 ? VARIATION_24[Math.min(23, step24 - 1)] : null;
    const speed = variation ? variation.ringSpeed : 0.045 + stageDepth * 0.014;
    const dir = variation ? variation.ringDir : 1;
    const tiltSeed = variation ? (variation.ringTiltSeed * Math.PI) / 180 : 0;
    ringRef.current.rotation.y += delta * speed * dir;
    ringRef.current.rotation.x += (Math.sin(t * 0.18 + tiltSeed) * 0.14 - ringRef.current.rotation.x) * 0.05;
    ringRef.current.rotation.z += (Math.cos(t * 0.13 + tiltSeed) * 0.1 - ringRef.current.rotation.z) * 0.05;
  });

  return (
    <group ref={ringRef} renderOrder={1}>
      <mesh geometry={primaryGeo} rotation={[Math.PI / 2.32, 0, 0]}>
        <meshBasicMaterial color={theme.primary} transparent opacity={0.26 + stageDepth * 0.045 + progress24 * 0.08} depthWrite={false} />
      </mesh>
      <mesh geometry={secondaryGeo} rotation={[Math.PI / 2.04, 0, Math.PI / 3]}>
        <meshBasicMaterial color={theme.accent} transparent opacity={0.15 + stageDepth * 0.028 + progress24 * 0.05} depthWrite={false} />
      </mesh>
      <mesh geometry={secondaryGeo} rotation={[Math.PI / 1.72, Math.PI / 4, 0]}>
        <meshBasicMaterial color={theme.secondary} transparent opacity={0.09 + stageDepth * 0.02 + progress24 * 0.04} depthWrite={false} />
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
  /* 生命力升級（2026-08-14 批准）：分離距離平滑演化＋階段切換能量脈衝 */
  const sepRef = useRef(0);
  const pulseRef = useRef(0);
  const prevStageRef = useRef<Stage>(stage);
  const outerMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // ===== 幾何體重用 =====
  const taijiBallGeo = useMemo(() => new THREE.SphereGeometry(1.08, 48, 48), []);
  const mainGeo = useMemo(() => new THREE.SphereGeometry(0.82, 40, 40), []);
  const dotGeo = useMemo(() => new THREE.SphereGeometry(0.15, 20, 20), []);
  const outerGeo = useMemo(() => new THREE.SphereGeometry(1.48, 32, 32), []);
  const smallGeo = useMemo(() => new THREE.SphereGeometry(0.2, 16, 16), []);
  const baguaGeo = useMemo(() => new THREE.SphereGeometry(0.24, 16, 16), []);

  /* 24 響 × 24 主題：每一響換一套配色主題重繪球體與光效（可變獎勵的顏色維度）。
     未點擊（step 0）採用第 24 主題（經典鎏金）作為預設面貌。 */
  const activeTheme = theme ?? TAIJI_24_THEMES[step24 > 0 ? (step24 - 1) % 24 : 23];
  const ballTexture = useMemo(() => createTaijiSphereTexture(activeTheme), [activeTheme]);
  const glowTexture = useMemo(() => createGlowTexture(activeTheme), [activeTheme]);
  const raysTexture = useMemo(() => createGodRaysTexture(activeTheme), [activeTheme]);
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
      pulseRef.current = 1;
    }
    // 待機召喚脈衝（attract mode）：久未互動時輕輕呼喚
    if (prevAttractRef.current !== attractTick) {
      prevAttractRef.current = attractTick;
      pulseRef.current = Math.max(pulseRef.current, 0.6);
    }
    // 24 步里程碑偵測：每 6 步小爆發、第 24 步大覺醒（可變獎勵）
    if (prevStep24Ref.current !== step24) {
      prevStep24Ref.current = step24;
      if (step24 >= 24) pulseRef.current = 1.6;
      else if (step24 > 0 && step24 % 6 === 0) pulseRef.current = 1.25;
      else pulseRef.current = Math.max(pulseRef.current, 0.55);
    }
    const activeVariation = step24 > 0 ? VARIATION_24[Math.min(23, step24 - 1)] : null;
    const raySpinDir = activeVariation?.raySpinDir ?? 1;
    pulseRef.current = Math.max(0, pulseRef.current - delta * 1.6);
    const pulse = pulseRef.current;
    if (outerMatRef.current) {
      outerMatRef.current.opacity = Math.min(0.5, 0.06 + progress24 * 0.05 + pulse * 0.22);
      outerMatRef.current.emissiveIntensity = 0.5 + progress24 * 0.6 + pulse * 1.8;
    }

    if (separate) {
      // 分離後：整體多軸旋轉（365° 全角度、近 4D 連續變化）
      groupRef.current.rotation.y += delta * 0.32;
      groupRef.current.rotation.x = Math.sin(t * 0.25) * 0.18;
      groupRef.current.rotation.z = Math.cos(t * 0.17) * 0.1;
    } else {
      // 太極階段：圖騰保持正面可辨識，只做輕微呼吸擺動，回正不歪斜
      groupRef.current.rotation.y += (Math.sin(t * 0.4) * 0.3 - groupRef.current.rotation.y) * 0.04;
      groupRef.current.rotation.x += (Math.sin(t * 0.3) * 0.12 - groupRef.current.rotation.x) * 0.04;
      groupRef.current.rotation.z = 0;
    }

    // 太極球：圖騰面朝鏡頭（球面 UV 中心在 +x，基準 -90°）＋優雅搖曳展現球面弧度＋呼吸
    if (diskRef.current) {
      diskRef.current.rotation.y = -Math.PI / 2 + Math.sin(t * 0.3) * 0.38;
      diskRef.current.rotation.x = Math.sin(t * 0.22) * 0.13;
      diskRef.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.025 + pulse * 0.06);
    }

    // 光線科技①：雲隙光束緩慢旋轉＋24 步進程增輝增速（方向隨相位反轉，越點越盛）
    if (raysRef.current) {
      raysRef.current.material.rotation += delta * (0.05 + progress24 * 0.09) * raySpinDir;
      raysRef.current.material.opacity = Math.min(0.7, 0.26 + progress24 * 0.22 + Math.sin(t * 0.8) * 0.05 + pulse * 0.4);
      const rayScale = 5.0 * (1 + progress24 * 0.1 + Math.sin(t * 0.8) * 0.02 + pulse * 0.18);
      raysRef.current.scale.set(rayScale, rayScale, 1);
    }
    // 光線科技②：核心光暈呼吸＋進程增亮（與球同頻，活的光）
    if (glowRef.current) {
      glowRef.current.material.opacity = Math.min(0.85, 0.52 + progress24 * 0.16 + Math.sin(t * 1.6) * 0.06 + pulse * 0.26);
      const glowScale = 4.4 * (1 + progress24 * 0.1 + Math.sin(t * 1.6) * 0.04 + pulse * 0.2);
      glowRef.current.scale.set(glowScale, glowScale, 1);
    }

    // 兩儀分離距離平滑演化：從核心誕生撐開，不瞬間跳位
    sepRef.current += (offset - sepRef.current) * Math.min(1, delta * 2.4);
    const sep = sepRef.current;

    // 陰陽獨立旋轉（分離後反向不同速，永不碰撞）＋24 步進程微加速（旅程越走越有勁）
    const spinBoost = 1 + progress24 * 0.7;
    if (yinRef.current) {
      yinRef.current.position.x = -sep;
      yinRef.current.rotation.z += delta * 0.9 * spinBoost;
      yinRef.current.rotation.y += delta * 0.35 * spinBoost;
    }
    if (yangRef.current) {
      yangRef.current.position.x = sep;
      yangRef.current.rotation.z -= delta * 1.15 * spinBoost;
      yangRef.current.rotation.y -= delta * 0.28 * spinBoost;
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
      {/* 外層能量球（depthWrite 關閉：發光殼不得遮擋內部太極盤；脈衝時爆發增亮） */}
      <mesh geometry={outerGeo}>
        <meshStandardMaterial
          ref={outerMatRef}
          color={activeTheme.primary}
          transparent
          opacity={0.06}
          emissive={activeTheme.accent}
          emissiveIntensity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 星軌：固定低成本幾何體，讓軌道存在感清楚但不卡通化 */}
      <OrbitRings stage={stage} step24={step24} theme={activeTheme} progress24={progress24} />

      {/* 粒子（數量與速度再收斂，避免手機閃爍與廉價特效感） */}
      {/* 粒子：隨 24 步旅程增生（越點星塵越盛，黏著性可變獎勵） */}
      <Sparkles
        count={(stage === 'BAGUA' ? 30 : stage === 'SIXIANG' ? 22 : 14) + Math.round(progress24 * 12)}
        scale={2.45}
        size={1.35 + progress24 * 0.5}
        speed={0.18 + progress24 * 0.12}
        opacity={0.5}
        color={activeTheme.primary}
      />

      {/* 太極階段：真 3D 立體太極球＋雲隙光束／呼吸光暈 */}
      {!separate && raysTexture && (
        <sprite ref={raysRef} position={[0, 0, -0.9]} scale={[5.6, 5.6, 1]} renderOrder={0}>
          <spriteMaterial map={raysTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.5} />
        </sprite>
      )}
      {!separate && glowTexture && (
        <sprite ref={glowRef} position={[0, 0, -0.6]} scale={[4.4, 4.4, 1]} renderOrder={1}>
          <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.75} />
        </sprite>
      )}
      {/* 真實感升級（2026-08-14）：PBR 清漆層物理材質——上釉瓷器的真實反射，自發光大幅收斂 */}
      {!separate && ballTexture && (
        <mesh ref={diskRef} geometry={taijiBallGeo} renderOrder={2}>
          <meshPhysicalMaterial
            map={ballTexture}
            emissiveMap={ballTexture}
            emissive={activeTheme.accent}
            emissiveIntensity={0.08}
            metalness={0.08}
            roughness={0.34}
            clearcoat={1}
            clearcoatRoughness={0.14}
            envMapIntensity={1.25}
          />
        </mesh>
      )}

      {/* 兩儀之後：陰球（墨玉——高光澤深黑，如拋光黑曜石），獨立旋轉 */}
      {separate && (
        <group ref={yinRef} position={[0, 0.08, 0]} scale={scale}>
          <mesh geometry={mainGeo}>
            <meshPhysicalMaterial color={activeTheme.ink} metalness={0.35} roughness={0.16} clearcoat={1} clearcoatRoughness={0.08} envMapIntensity={1.4} emissive={activeTheme.accent} emissiveIntensity={0.05 + progress24 * 0.06} />
          </mesh>
          <mesh geometry={dotGeo} position={[0, 0.4, 0.72]}>
            <meshPhysicalMaterial color={activeTheme.moon} clearcoat={0.9} clearcoatRoughness={0.15} roughness={0.3} metalness={0.05} emissive={activeTheme.primary} emissiveIntensity={0.18 + progress24 * 0.08} />
          </mesh>
        </group>
      )}

      {/* 兩儀之後：陽球（月白瓷——暖白上釉，如和田玉），反向獨立旋轉 */}
      {separate && (
        <group ref={yangRef} position={[0, -0.08, 0]} scale={scale}>
          <mesh geometry={mainGeo}>
            <meshPhysicalMaterial color={activeTheme.moon} metalness={0.04} roughness={0.26} clearcoat={0.85} clearcoatRoughness={0.18} envMapIntensity={1.15} emissive={activeTheme.primary} emissiveIntensity={0.04 + progress24 * 0.05} />
          </mesh>
          <mesh geometry={dotGeo} position={[0, -0.4, 0.72]}>
            <meshPhysicalMaterial color={activeTheme.ink} metalness={0.3} roughness={0.14} clearcoat={1} clearcoatRoughness={0.08} envMapIntensity={1.3} />
          </mesh>
        </group>
      )}

      {/* 四象（條件渲染） */}
      {(stage === 'SIXIANG' || stage === 'BAGUA') && (
        <group>
          {[
            { pos: [-1.2, 1.15, 0] as const, symbol: '⚊' },
            { pos: [1.2, 1.15, 0] as const, symbol: '⚋' },
            { pos: [-1.2, -1.15, 0] as const, symbol: '⚋' },
            { pos: [1.2, -1.15, 0] as const, symbol: '⚊' },
          ].map((item, index) => (
            <Float key={index} speed={1.6} rotationIntensity={0.3} floatIntensity={0.4}>
              <group position={[item.pos[0], item.pos[1], item.pos[2]]}>
                <mesh geometry={smallGeo}>
                  <meshStandardMaterial color={activeTheme.ink} metalness={0.7} roughness={0.25} emissive={activeTheme.accent} emissiveIntensity={0.42 + progress24 * 0.18} />
                </mesh>
                <GlyphSprite symbol={item.symbol} scale={0.5} />
              </group>
            </Float>
          ))}
        </group>
      )}

      {/* 八卦（條件渲染） */}
      {stage === 'BAGUA' && (
        <group>
          {BAGUA.map((item) => {
            const rad = ((item.angle - 90) * Math.PI) / 180;
            const r = 2.08;
            return (
              <Float key={item.name} speed={1.3} rotationIntensity={0.25} floatIntensity={0.35}>
                <group position={[Math.cos(rad) * r, Math.sin(rad) * r, 0]}>
                  <mesh geometry={baguaGeo}>
                    <meshStandardMaterial color={activeTheme.ink} metalness={0.7} roughness={0.25} emissive={activeTheme.accent} emissiveIntensity={0.38 + progress24 * 0.16} />
                  </mesh>
                  <GlyphSprite symbol={item.symbol} name={item.name} scale={0.66} />
                </group>
              </Float>
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
  const lastClickAtRef = useRef(0);

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
      <div className={styles.sphereWrapper}>
        <span className={styles.energyVeil} aria-hidden="true" />
        <span className={styles.journeyRing} aria-hidden="true" />
        <span key={visualPulse} className={styles.visualPulse} aria-hidden="true" />
        <span className={styles.completionHalo} aria-hidden="true" />
        <Canvas
          camera={{ position: [0, 0, 5.1], fov: 42 }}
          dpr={[1, 1.5]} // 限制最高畫質
          gl={{
            antialias: false,
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
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
          {/* 真實感核心（2026-08-14）：程式生成影棚環境光（IBL）——
              頂部暖色柔光箱＋側面冷色燈條＋背部輪廓光，球面反射出真實的影棚光形，
              零網路資源、frames=1 只烘焙一次不吃效能 */}
          <Environment resolution={256} frames={1}>
            <Lightformer form="rect" intensity={2.2} color="#fff2d8" position={[0, 4, 2]} scale={[6, 3, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={0.9} color="#bcd8ea" position={[-5, 0, 1]} rotation={[0, Math.PI / 2.4, 0]} scale={[4, 1.4, 1]} target={[0, 0, 0]} />
            <Lightformer form="ring" intensity={1.4} color="#ffd9a0" position={[3, 1.5, -3]} scale={[3, 3, 1]} target={[0, 0, 0]} />
            <Lightformer form="circle" intensity={0.6} color="#f5e0b8" position={[0, -4, 1]} scale={[5, 5, 1]} target={[0, 0, 0]} />
          </Environment>
          {/* 周邊世界：深空星雲＋景深星塵＋流星＋地面舞台 */}
          <AmbientWorld theme={journeyTheme} progress24={journey.progress} />
          {/* 質感打光：電影三點光——主光與背光跟著本響主題換色 */}
          <ambientLight intensity={0.22} />
          <KeyLightSweep theme={journeyTheme} progress24={journey.progress} />
          <pointLight position={[-4, -2.5, 2.5]} intensity={0.3} color="#6fa8c0" />
          <pointLight position={[0, 2.2, -4.5]} intensity={1.15} color={journeyTheme.accent} />
          <TaijiCore stage={stage} step24={journey.step} progress24={journey.progress} attractTick={attractTick} theme={journeyTheme} onCoreClick={goNext} />
          <ContactShadows position={[0, -1.9, 0]} opacity={0.4} scale={7} blur={2.6} far={3} frames={1} />
          <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.6} />
        </Canvas>
      </div>
    </section>
  );
}
