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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Sparkles,
  Float,
  ContactShadows,
  AdaptiveDpr,
  AdaptiveEvents,
} from '@react-three/drei';
import * as THREE from 'three';
import { Taiji24SoundEngine } from '@/lib/taiji24-sound-engine';
import styles from './TaijiSystem.module.css';

type Stage = 'TAIJI' | 'LIANGYI' | 'SIXIANG' | 'BAGUA';

const STAGES: Stage[] = ['TAIJI', 'LIANGYI', 'SIXIANG', 'BAGUA'];

const LABELS: Record<Stage, string> = {
  TAIJI: '太極',
  LIANGYI: '兩儀',
  SIXIANG: '四象',
  BAGUA: '八卦',
};

const STAGE_COPY: Record<Stage, string> = {
  TAIJI: '一個核心，萬象未分。',
  LIANGYI: '太極生兩儀，陰陽自然分化。',
  SIXIANG: '兩儀生四象，能量開始定位。',
  BAGUA: '四象生八卦，萬物由此展開。',
};

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

interface TaijiSystemProps {
  textureUrl?: string;
  videoUrl?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onStageChange?: (stage: Stage) => void;
  onComplete?: () => void;
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
  moonGrad.addColorStop(0, '#fffdf6');
  moonGrad.addColorStop(0.5, '#f2efe4');
  moonGrad.addColorStop(1, '#d9d4c4');
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
  moonEye.addColorStop(0, '#fffef8');
  moonEye.addColorStop(1, '#e8e2d0');
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
  ctx.strokeStyle = 'rgba(212, 175, 106, 0.22)';
  ctx.lineWidth = size * 0.008;
  ctx.filter = 'blur(6px)';
  ctx.beginPath();
  ctx.arc(cx, cy - radius / 2, radius / 2, Math.PI * 0.5, Math.PI * 1.5, true);
  ctx.arc(cx, cy + radius / 2, radius / 2, Math.PI * 1.5, Math.PI * 0.5, false);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // 外環：雙層金環勾邊（外實內虛），高級感的關鍵
  ctx.strokeStyle = 'rgba(212, 175, 106, 0.85)';
  ctx.lineWidth = size * 0.007;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + size * 0.006, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232, 204, 143, 0.3)';
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

function createTaijiSphereTexture() {
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
  inkGrad.addColorStop(0, '#05060b');
  inkGrad.addColorStop(1, '#141826');
  ctx.fillStyle = inkGrad;
  ctx.fillRect(0, 0, w / 2, h);
  const moonGrad = ctx.createLinearGradient(w / 2, 0, w, 0);
  moonGrad.addColorStop(0, '#f6f2e6');
  moonGrad.addColorStop(1, '#d8d2c0');
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
  ctx.fillStyle = '#0c0f18';
  ctx.beginPath();
  ctx.ellipse(cx, cy - R / 2, (R / 2) * stretch, R / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2eee0';
  ctx.beginPath();
  ctx.ellipse(cx, cy + R / 2, (R / 2) * stretch, R / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 魚眼
  const eyeR = R * 0.115;
  ctx.fillStyle = '#f6f2e6';
  ctx.beginPath();
  ctx.ellipse(cx, cy - R / 2, eyeR * stretch, eyeR, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0d15';
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

function createGlowTexture() {
  /* 光芒貼圖：金色放射光暈（加法混合用） */
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 240, 200, 0.85)');
  grad.addColorStop(0.25, 'rgba(232, 204, 143, 0.4)');
  grad.addColorStop(0.55, 'rgba(212, 175, 106, 0.14)');
  grad.addColorStop(1, 'rgba(212, 175, 106, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
  ctx.shadowColor = 'rgba(212, 175, 106, 0.55)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#e8cc8f';
  ctx.font = `900 ${name ? 128 : 150}px "Segoe UI Symbol", "Noto Sans TC", serif`;
  ctx.fillText(symbol, size / 2, name ? size * 0.38 : size / 2);
  if (name) {
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#d8c8a4';
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

function OrbitRings({ stage }: { stage: Stage }) {
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
    ringRef.current.rotation.y += delta * (0.045 + stageDepth * 0.014);
    ringRef.current.rotation.x = Math.sin(t * 0.18) * 0.12;
    ringRef.current.rotation.z = Math.cos(t * 0.13) * 0.08;
  });

  return (
    <group ref={ringRef} renderOrder={1}>
      <mesh geometry={primaryGeo} rotation={[Math.PI / 2.32, 0, 0]}>
        <meshBasicMaterial color="#d4af6a" transparent opacity={0.2 + stageDepth * 0.04} depthWrite={false} />
      </mesh>
      <mesh geometry={secondaryGeo} rotation={[Math.PI / 2.04, 0, Math.PI / 3]}>
        <meshBasicMaterial color="#8f7447" transparent opacity={0.12 + stageDepth * 0.025} depthWrite={false} />
      </mesh>
      <mesh geometry={secondaryGeo} rotation={[Math.PI / 1.72, Math.PI / 4, 0]}>
        <meshBasicMaterial color="#d8d1c2" transparent opacity={0.07 + stageDepth * 0.018} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* =========================================================
   3D 核心（已優化）
========================================================= */
function TaijiCore({
  stage,
  onCoreClick,
}: {
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

  /* 立體球版（2026-08-14 依指示）：太極不再是紙片圓盤，
     改為等距柱狀投影貼圖包覆的真 3D 球體＋金色光芒光暈。 */
  const ballTexture = useMemo(() => createTaijiSphereTexture(), []);
  const glowTexture = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => { ballTexture?.dispose(); glowTexture?.dispose(); }, [ballTexture, glowTexture]);

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
    pulseRef.current = Math.max(0, pulseRef.current - delta * 1.6);
    const pulse = pulseRef.current;
    if (outerMatRef.current) {
      outerMatRef.current.opacity = 0.06 + pulse * 0.22;
      outerMatRef.current.emissiveIntensity = 0.5 + pulse * 1.8;
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

    // 兩儀分離距離平滑演化：從核心誕生撐開，不瞬間跳位
    sepRef.current += (offset - sepRef.current) * Math.min(1, delta * 2.4);
    const sep = sepRef.current;

    // 陰陽獨立旋轉（分離後反向不同速，永不碰撞）
    if (yinRef.current) {
      yinRef.current.position.x = -sep;
      yinRef.current.rotation.z += delta * 0.9;
      yinRef.current.rotation.y += delta * 0.35;
    }
    if (yangRef.current) {
      yangRef.current.position.x = sep;
      yangRef.current.rotation.z -= delta * 1.15;
      yangRef.current.rotation.y -= delta * 0.28;
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
          color="#d4af6a"
          transparent
          opacity={0.045}
          emissive="#b8905a"
          emissiveIntensity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 星軌：固定低成本幾何體，讓軌道存在感清楚但不卡通化 */}
      <OrbitRings stage={stage} />

      {/* 粒子（數量與速度再收斂，避免手機閃爍與廉價特效感） */}
      <Sparkles
        count={stage === 'BAGUA' ? 30 : stage === 'SIXIANG' ? 22 : 14}
        scale={2.45}
        size={1.35}
        speed={0.18}
        opacity={0.38}
        color="#e8cc8f"
      />

      {/* 太極階段：真 3D 立體太極球（等距投影貼圖）＋金色光芒 */}
      {!separate && glowTexture && (
        <sprite position={[0, 0, -0.6]} scale={[4.4, 4.4, 1]} renderOrder={1}>
          <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.75} />
        </sprite>
      )}
      {!separate && ballTexture && (
        <mesh ref={diskRef} geometry={taijiBallGeo} renderOrder={2}>
          <meshStandardMaterial
            map={ballTexture}
            emissiveMap={ballTexture}
            emissive="#9a8a68"
            emissiveIntensity={0.22}
            metalness={0.25}
            roughness={0.38}
          />
        </mesh>
      )}

      {/* 兩儀之後：陰球（墨玉——高光澤深黑，如拋光黑曜石），獨立旋轉 */}
      {separate && (
        <group ref={yinRef} position={[0, 0.08, 0]} scale={scale}>
          <mesh geometry={mainGeo}>
            <meshStandardMaterial color="#0b0d14" metalness={0.75} roughness={0.18} emissive="#141a28" emissiveIntensity={0.25} />
          </mesh>
          <mesh geometry={dotGeo} position={[0, 0.4, 0.72]}>
            <meshStandardMaterial color="#f5f0e2" emissive="#e8dcc0" emissiveIntensity={0.45} metalness={0.2} roughness={0.25} />
          </mesh>
        </group>
      )}

      {/* 兩儀之後：陽球（月白瓷——暖白上釉，如和田玉），反向獨立旋轉 */}
      {separate && (
        <group ref={yangRef} position={[0, -0.08, 0]} scale={scale}>
          <mesh geometry={mainGeo}>
            <meshStandardMaterial color="#efe9da" metalness={0.1} roughness={0.32} emissive="#c9b98e" emissiveIntensity={0.06} />
          </mesh>
          <mesh geometry={dotGeo} position={[0, -0.4, 0.72]}>
            <meshStandardMaterial color="#0b0d14" metalness={0.6} roughness={0.2} emissive="#000000" />
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
                  <meshStandardMaterial color="#10121c" metalness={0.7} roughness={0.25} emissive="#3a3320" emissiveIntensity={0.4} />
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
                    <meshStandardMaterial color="#10121c" metalness={0.7} roughness={0.25} emissive="#3a3320" emissiveIntensity={0.35} />
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

  const goToStage = useCallback(
    (nextStage: Stage) => {
      if (isAnimating || nextStage === stage) return;
      setIsAnimating(true);
      setStage(nextStage);
      onStageChange?.(nextStage);
      if (!soundRef.current) soundRef.current = new Taiji24SoundEngine();
      void soundRef.current.click().catch(() => undefined);
      if (nextStage === 'BAGUA') {
        onComplete?.();
      }
      animationTimer.current = setTimeout(() => {
        setIsAnimating(false);
      }, 1000);
    },
    [isAnimating, onComplete, onStageChange, stage],
  );

  const goNext = useCallback(() => {
    const currentIndex = STAGES.indexOf(stage);
    const nextIndex = (currentIndex + 1) % STAGES.length;
    goToStage(STAGES[nextIndex]);
  }, [goToStage, stage]);

  const reset = useCallback(() => {
    goToStage('TAIJI');
  }, [goToStage]);

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

  const stageIndex = STAGES.indexOf(stage);

  /* textureUrl / videoUrl 保留 API 相容；視覺已改為程式生成圖騰，不再需要外部貼圖 */
  void textureUrl;
  void videoUrl;

  return (
    <section className={`${styles.root} ${styles[`stage_${stage.toLowerCase()}`]}`} aria-label="太極演化系統">
      <div className={styles.sphereWrapper}>
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
          }}
          performance={{ min: 0.5 }}
        >
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
          {/* 質感打光（2026-08-14）：電影三點光——暖金主光、冷青補光、背緣光雕出球體輪廓 */}
          <ambientLight intensity={0.32} />
          <directionalLight position={[4.5, 5.5, 4]} intensity={1.35} color="#f3e2c0" />
          <pointLight position={[-4, -2.5, 2.5]} intensity={0.4} color="#5aa8c9" />
          <pointLight position={[0, 2.2, -4.5]} intensity={0.9} color="#d4af6a" />
          <TaijiCore stage={stage} onCoreClick={goNext} />
          <ContactShadows position={[0, -1.9, 0]} opacity={0.4} scale={7} blur={2.6} far={3} frames={1} />
          <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.6} />
        </Canvas>
      </div>

      {/* 階段說明 */}
      <div className={styles.information} aria-live="polite">
        <strong>{LABELS[stage]}</strong>
        <span>{STAGE_COPY[stage]}</span>
      </div>

      {/* 進度點 */}
      <div className={styles.progress}>
        {STAGES.map((item, index) => (
          <button
            type="button"
            key={item}
            onClick={() => goToStage(item)}
            className={index === stageIndex ? styles.progressActive : styles.progressItem}
            aria-label={`切換到${LABELS[item]}`}
          />
        ))}
      </div>

      {/* 重置 */}
      <button type="button" className={styles.resetButton} onClick={reset}>
        重置演化
      </button>
    </section>
  );
}
