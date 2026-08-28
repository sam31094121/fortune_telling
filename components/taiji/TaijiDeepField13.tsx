'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 第 13～24 層深潛路線。
 * 第 13 層是深場轉場門；之後每層都沿同一條鏡頭路線遞進到第 24 層終幕。
 */
export const DEEP_STORY_ROADMAP = [
  ['13', '透明膜內壁', '撞入透明細胞膜，外界全貌消失，只剩膜面與遠方粒子。'],
  ['14', '雙核鎖定', '膜面退場，兩顆反向自旋的核質突然佔據畫面兩端。'],
  ['15', '相位絲內景', '雙核退到視野外，鏡頭沿唯一留下的相位絲高速深入。'],
  ['16', '粒子門', '相位絲塌縮成源點，再裂解為沒有硬邊界的光子門。'],
  ['17', '雙生粒子', '門後只出現兩個相依波包，尚未形成可見通道。'],
  ['18', '糾纏光橋', '波包縮到角落，雙螺旋光橋撐滿整個視野。'],
  ['19', '單波包內景', '鎖定其中一顆放大到滿版，另一顆只剩邊緣回應。'],
  ['20', '量子塌縮', '整片波包瞬間收斂成中央兩點與短距離相位脈衝。'],
  ['21', '事件視界', '相位脈衝被黑暗核心反向吞入，所有光線向內收束。'],
  ['22', '白洞噴發', '吸入方向完全反轉，光子從中心大幅向外爆發。'],
  ['23', '雙旋流重組', '冷暖兩股粒子分離成互補旋流，尚未出現太極輪廓。'],
  ['24', '量子太極', '兩股旋流以粒子與光子的相位糾纏生成全新透明太極。'],
] as const;

type TaijiDeepField13Props = {
  active: boolean;
  step: number;
};

const PARTICLE_COUNT = 280;
const THRESHOLD_SPIRAL_COUNT = 360;

/* 同一組霧與光子，分 12 個鏡頭調度。沒有新增幾何或 draw call。 */
/* 不放行星、星雲或大片霧面。遠景與近景都只由同一批光子／粒子構成；
   差別只在鏡頭放大後的尺寸、密度與自轉速度。 */
const DEEP_CUTS = [
  { mist: 0, inner: 0, particles: 0.14, size: 0.11, scale: 1.72, drift: 0.012, mistColor: '#527aa7', innerColor: '#f4d58a' },
  { mist: 0, inner: 0, particles: 0.88, size: 0.024, scale: 0.72, drift: 0.085, mistColor: '#9fc4e8', innerColor: '#c9c9d6' },
  { mist: 0, inner: 0, particles: 0.3, size: 0.094, scale: 1.66, drift: 0.16, mistColor: '#8d7fbe', innerColor: '#6a5acd' },
  { mist: 0, inner: 0, particles: 1, size: 0.016, scale: 0.42, drift: 0.22, mistColor: '#62557f', innerColor: '#fff6dc' },
  { mist: 0, inner: 0, particles: 0.31, size: 0.028, scale: 1.16, drift: 0.008, mistColor: '#4d5564', innerColor: '#5a5a5a' },
  { mist: 0, inner: 0, particles: 0.42, size: 0.035, scale: 1.21, drift: 0.039, mistColor: '#8b4c3f', innerColor: '#ff6a3d' },
  { mist: 0, inner: 0, particles: 0.55, size: 0.040, scale: 1.26, drift: 0.051, mistColor: '#bfc7d3', innerColor: '#fff6dc' },
  { mist: 0, inner: 0, particles: 0.48, size: 0.036, scale: 1.31, drift: 0.046, mistColor: '#f5d987', innerColor: '#fff2a8' },
  { mist: 0, inner: 0, particles: 0.46, size: 0.034, scale: 1.35, drift: 0.033, mistColor: '#8f72ba', innerColor: '#b388ff' },
  { mist: 0, inner: 0, particles: 0.19, size: 0.024, scale: 1.39, drift: 0.006, mistColor: '#31526e', innerColor: '#3a6ea5' },
  { mist: 0, inner: 0, particles: 0.10, size: 0.019, scale: 1.42, drift: 0.002, mistColor: '#171725', innerColor: '#1a1a2e' },
  { mist: 0, inner: 0, particles: 0.62, size: 0.043, scale: 1.48, drift: 0.055, mistColor: '#c89d48', innerColor: '#ffd76a' },
] as const;

function createDeepFieldPositions() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  let seed = 13013;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const radius = 0.38 + Math.pow(random(), 0.72) * 2.9;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(1 - random() * 2);
    const offset = index * 3;
    positions[offset] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[offset + 1] = Math.cos(phi) * radius * 0.72;
    positions[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius * 0.52 - 1.15;
  }

  return positions;
}

/* 第 13 層的鏡頭入口：兩股粒子沿相反相位捲入中心，
   讓觀者明確感到正在穿過太極，而不是只看到一片靜止霧。 */
function createThresholdSpiralPositions() {
  const positions = new Float32Array(THRESHOLD_SPIRAL_COUNT * 3);
  for (let index = 0; index < THRESHOLD_SPIRAL_COUNT; index += 1) {
    const arm = index % 2;
    const t = Math.floor(index / 2) / (THRESHOLD_SPIRAL_COUNT / 2 - 1);
    const radius = 0.14 + t * 1.95;
    const angle = t * Math.PI * 6.4 + (arm === 0 ? 0 : Math.PI);
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = Math.sin(angle) * radius * 0.68;
    positions[offset + 2] = -0.22 + Math.sin(t * Math.PI * 3) * 0.18;
  }
  return positions;
}

/* 點雲使用圓形柔邊光子貼圖，避免手機上被渲染成沒有質感的白色方塊。 */
function createSoftPhotonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Texture();
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.28, 'rgba(255,243,196,0.92)');
  gradient.addColorStop(0.72, 'rgba(164,208,255,0.28)');
  gradient.addColorStop(1, 'rgba(164,208,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 第 13 層：深場門檻。
 * 不使用軌道線或幾何圓環；只有無邊界的霧、稀疏光子與一個向內延展的深場。
 */
export default function TaijiDeepField13({ active, step }: TaijiDeepField13Props) {
  const groupRef = useRef<THREE.Group>(null);
  const mistRef = useRef<THREE.MeshBasicMaterial>(null);
  const innerMistRef = useRef<THREE.MeshBasicMaterial>(null);
  const particlesRef = useRef<THREE.PointsMaterial>(null);
  const thresholdSpiralRef = useRef<THREE.PointsMaterial>(null);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (active) setArmed(true);
  }, [active]);
  const geometry = useMemo(() => {
    if (!armed) return null;
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(createDeepFieldPositions(), 3));
    return next;
  }, [armed]);
  const thresholdSpiralGeometry = useMemo(() => {
    if (!armed) return null;
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(createThresholdSpiralPositions(), 3));
    return next;
  }, [armed]);
  const photonTexture = useMemo(() => (armed ? createSoftPhotonTexture() : null), [armed]);

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(() => () => thresholdSpiralGeometry?.dispose(), [thresholdSpiralGeometry]);
  useEffect(() => () => photonTexture?.dispose(), [photonTexture]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const frameDelta = Math.min(delta, 1 / 45);
    // 第 20 層起畫面交給黑洞／白洞的單一旋流；深場散點在此前淡出，避免變成無意義白點。
    const target = active && step >= 13 && step <= 16 ? 1 : 0;
    group.userData.presence = THREE.MathUtils.lerp(group.userData.presence ?? 0, target, Math.min(1, frameDelta * 1.45));
    const presence = group.userData.presence as number;
    group.visible = presence > 0.006;

    const t = state.clock.elapsedTime;
    const cutIndex = THREE.MathUtils.clamp(step, 13, 24) - 13;
    const cut = DEEP_CUTS[cutIndex];
    // 所有深場鏡頭都維持同一顆 3D 物體的連續自轉；不切成平面特效。
    group.rotation.y += frameDelta * (0.16 + cut.drift * 0.9);
    group.rotation.x = Math.sin(t * (0.16 + cut.drift)) * (0.09 + cut.drift * 0.32);
    group.rotation.z = Math.sin(t * (0.055 + cut.drift)) * (0.014 + cut.drift * 0.25);
    group.scale.setScalar(cut.scale + Math.sin(t * (0.15 + cut.drift)) * 0.009);

    if (mistRef.current) {
      mistRef.current.opacity = presence * cut.mist;
      mistRef.current.color.set(cut.mistColor);
    }
    if (innerMistRef.current) {
      innerMistRef.current.opacity = presence * (cut.inner + Math.sin(t * (0.18 + cut.drift)) * 0.008);
      innerMistRef.current.color.set(cut.innerColor);
    }
    if (particlesRef.current) {
      particlesRef.current.opacity = presence * cut.particles;
      particlesRef.current.size = cut.size;
      particlesRef.current.color.set(cut.innerColor);
    }
    if (thresholdSpiralRef.current) {
      /* 雙螺旋入口只屬於第 13 層；第 14 層立即換成雙核主構圖，禁止複製上一幕。 */
      const thresholdPresence = step === 13 ? presence : 0;
      thresholdSpiralRef.current.opacity = thresholdPresence * 0.92;
      thresholdSpiralRef.current.size = cut.size * 1.5;
      thresholdSpiralRef.current.color.set(step % 2 === 0 ? '#9fc4e8' : '#ffe09a');
    }
  });

  return (
    /* 深場門必須蓋過退場中的太極表面，讓第 13 層成為看得見的轉場。 */
    <group ref={groupRef} visible={false} renderOrder={9}>
      <mesh scale={[3.85, 3.15, 1.8]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial ref={mistRef} color="#d4af72" transparent opacity={0} side={THREE.BackSide} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0, -0.85]} scale={[2.25, 1.9, 1.25]}>
        <sphereGeometry args={[1, 40, 28]} />
        <meshBasicMaterial ref={innerMistRef} color="#6d7f98" transparent opacity={0} side={THREE.BackSide} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {geometry && (
        <points geometry={geometry}>
          <pointsMaterial ref={particlesRef} map={photonTexture ?? undefined} alphaTest={0.04} color="#f5dfad" transparent opacity={0} size={0.028} sizeAttenuation depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
        </points>
      )}
      {thresholdSpiralGeometry && (
        <points geometry={thresholdSpiralGeometry} rotation={[0, 0, 0.18]}>
          <pointsMaterial ref={thresholdSpiralRef} map={photonTexture ?? undefined} alphaTest={0.04} color="#ffe09a" transparent opacity={0} size={0.06} sizeAttenuation depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
        </points>
      )}
    </group>
  );
}
