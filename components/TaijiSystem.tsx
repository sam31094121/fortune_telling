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

  ctx.fillStyle = '#050914';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.fillStyle = '#f4f8ff';
  ctx.fillRect(cx, cy - radius, radius, radius * 2);

  ctx.fillStyle = '#050914';
  ctx.beginPath();
  ctx.arc(cx, cy - radius / 2, radius / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f4f8ff';
  ctx.beginPath();
  ctx.arc(cx, cy + radius / 2, radius / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f4f8ff';
  ctx.beginPath();
  ctx.arc(cx, cy - radius / 2, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#050914';
  ctx.beginPath();
  ctx.arc(cx, cy + radius / 2, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(191, 239, 255, 0.72)';
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
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
  ctx.shadowColor = 'rgba(126, 200, 255, 0.9)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#e6f2ff';
  ctx.font = `900 ${name ? 128 : 150}px "Segoe UI Symbol", "Noto Sans TC", serif`;
  ctx.fillText(symbol, size / 2, name ? size * 0.38 : size / 2);
  if (name) {
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#c7d8f0';
    ctx.font = '900 64px "Noto Sans TC", "Microsoft JhengHei", serif';
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
  const diskGeo = useMemo(() => new THREE.CircleGeometry(1.12, 72), []);
  const mainGeo = useMemo(() => new THREE.SphereGeometry(0.82, 40, 40), []);
  const dotGeo = useMemo(() => new THREE.SphereGeometry(0.15, 20, 20), []);
  const outerGeo = useMemo(() => new THREE.SphereGeometry(1.48, 32, 32), []);
  const smallGeo = useMemo(() => new THREE.SphereGeometry(0.2, 16, 16), []);
  const baguaGeo = useMemo(() => new THREE.SphereGeometry(0.24, 16, 16), []);

  /* 修異常（2026-08-14）：平面太極圖包到球面會整顆變黑（陰陽不分明）。
     太極階段改用「正面太極圓盤」，經典圖騰一眼可辨；
     兩儀之後改為純黑／純白雙球（各帶對比魚眼），獨立反向旋轉。 */
  const diskTexture = useMemo(() => createDefaultTaijiTexture(), []);
  useEffect(() => () => { diskTexture?.dispose(); }, [diskTexture]);

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

    // 太極盤面自轉＋呼吸（活物能量）
    if (diskRef.current) {
      diskRef.current.rotation.z -= delta * 0.55;
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
          color="#7ec8ff"
          transparent
          opacity={0.06}
          emissive="#4a9eff"
          emissiveIntensity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 粒子（數量已降低） */}
      <Sparkles
        count={stage === 'BAGUA' ? 45 : stage === 'SIXIANG' ? 30 : 22}
        scale={2.5}
        size={2}
        speed={0.45}
        opacity={0.65}
        color="#a8d4ff"
      />

      {/* 太極階段：正面經典太極圓盤（自轉＝中間那一刻的能量） */}
      {!separate && diskTexture && (
        <mesh ref={diskRef} geometry={diskGeo} renderOrder={2}>
          <meshBasicMaterial map={diskTexture} transparent side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}

      {/* 兩儀之後：陰球（墨黑＋白魚眼），獨立旋轉 */}
      {separate && (
        <group ref={yinRef} position={[0, 0.08, 0]} scale={scale}>
          <mesh geometry={mainGeo}>
            <meshStandardMaterial color="#0a0e16" metalness={0.35} roughness={0.35} emissive="#1b2434" emissiveIntensity={0.35} />
          </mesh>
          <mesh geometry={dotGeo} position={[0, 0.4, 0.72]}>
            <meshStandardMaterial color="#f4f8ff" emissive="#dbeafe" emissiveIntensity={0.7} roughness={0.2} />
          </mesh>
        </group>
      )}

      {/* 兩儀之後：陽球（皓白＋黑魚眼），反向獨立旋轉 */}
      {separate && (
        <group ref={yangRef} position={[0, -0.08, 0]} scale={scale}>
          <mesh geometry={mainGeo}>
            <meshStandardMaterial color="#f4f8ff" metalness={0.15} roughness={0.3} emissive="#93c5fd" emissiveIntensity={0.12} />
          </mesh>
          <mesh geometry={dotGeo} position={[0, -0.4, 0.72]}>
            <meshStandardMaterial color="#0a0e16" emissive="#000000" roughness={0.4} />
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
                  <meshStandardMaterial color="#0f172a" emissive="#3b82f6" emissiveIntensity={0.4} />
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
                    <meshStandardMaterial color="#0b1220" emissive="#6366f1" emissiveIntensity={0.35} />
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
          <ambientLight intensity={0.55} />
          <directionalLight position={[4, 6, 5]} intensity={1.15} color="#eaf4ff" />
          <pointLight position={[-4, -3, -4]} intensity={0.5} color="#4a9eff" />
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
