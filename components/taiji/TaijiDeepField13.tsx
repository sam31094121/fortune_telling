'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 第 13～24 層深潛路線。
 * 第 13 層是唯一已啟用的視覺門檻；其餘層先鎖定敘事職責，
 * 讓後續能逐層擴寫，而不回頭改動既有 1～12 層。
 */
export const DEEP_STORY_ROADMAP = [
  ['13', '深場門檻', '可觀測的太極宇宙退至背景，進入不可量測的場。'],
  ['14', '相位海', '方向與距離失去固定參考，留下陰陽的微小相位差。'],
  ['15', '微光記憶', '粒子不再是物件，而是短暫被看見的痕跡。'],
  ['16', '互感邊界', '陰陽不相撞，僅以感應改變彼此的存在。'],
  ['17', '靜默摺疊', '空間開始向內收，時間感放慢。'],
  ['18', '無名尺度', '放大不再帶來答案，只帶來更深的未知。'],
  ['19', '光子潮汐', '光不再照亮，而像深處微弱的潮汐。'],
  ['20', '陰陽回聲', '可見形體消失，只剩兩種相反而互依的回聲。'],
  ['21', '不可定域', '中心不再是一個位置，觀者無法固定它。'],
  ['22', '無限微界', '細胞與粒子的語言在此失效。'],
  ['23', '宇宙止境', '所有運動收斂為極低的呼吸。'],
  ['24', '不可穿透', '抵達人類無法穿透、只能感應的靜。'],
] as const;

type TaijiDeepField13Props = {
  active: boolean;
  step: number;
};

const PARTICLE_COUNT = 280;

/* 同一組霧與光子，分 12 個鏡頭調度。沒有新增幾何或 draw call。 */
const DEEP_CUTS = [
  { mist: 0.105, inner: 0.070, particles: 0.24, size: 0.027, scale: 1.00, drift: 0.010, mistColor: '#d4af72', innerColor: '#6d7f98' },
  { mist: 0.088, inner: 0.094, particles: 0.29, size: 0.029, scale: 1.04, drift: 0.015, mistColor: '#9fc4e8', innerColor: '#c9c9d6' },
  { mist: 0.070, inner: 0.118, particles: 0.34, size: 0.031, scale: 1.08, drift: 0.020, mistColor: '#8d7fbe', innerColor: '#6a5acd' },
  { mist: 0.058, inner: 0.132, particles: 0.38, size: 0.032, scale: 1.12, drift: 0.026, mistColor: '#62557f', innerColor: '#4b3f72' },
  { mist: 0.046, inner: 0.102, particles: 0.31, size: 0.028, scale: 1.16, drift: 0.008, mistColor: '#4d5564', innerColor: '#5a5a5a' },
  { mist: 0.062, inner: 0.082, particles: 0.42, size: 0.035, scale: 1.21, drift: 0.039, mistColor: '#8b4c3f', innerColor: '#ff6a3d' },
  { mist: 0.038, inner: 0.148, particles: 0.55, size: 0.040, scale: 1.26, drift: 0.051, mistColor: '#bfc7d3', innerColor: '#fff6dc' },
  { mist: 0.075, inner: 0.120, particles: 0.48, size: 0.036, scale: 1.31, drift: 0.046, mistColor: '#f5d987', innerColor: '#fff2a8' },
  { mist: 0.054, inner: 0.136, particles: 0.46, size: 0.034, scale: 1.35, drift: 0.033, mistColor: '#8f72ba', innerColor: '#b388ff' },
  { mist: 0.034, inner: 0.062, particles: 0.19, size: 0.024, scale: 1.39, drift: 0.006, mistColor: '#31526e', innerColor: '#3a6ea5' },
  { mist: 0.018, inner: 0.030, particles: 0.10, size: 0.019, scale: 1.42, drift: 0.002, mistColor: '#171725', innerColor: '#1a1a2e' },
  { mist: 0.085, inner: 0.154, particles: 0.62, size: 0.043, scale: 1.48, drift: 0.055, mistColor: '#c89d48', innerColor: '#ffd76a' },
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

/**
 * 第 13 層：深場門檻。
 * 不使用軌道線或幾何圓環；只有無邊界的霧、稀疏光子與一個向內延展的深場。
 */
export default function TaijiDeepField13({ active, step }: TaijiDeepField13Props) {
  const groupRef = useRef<THREE.Group>(null);
  const mistRef = useRef<THREE.MeshBasicMaterial>(null);
  const innerMistRef = useRef<THREE.MeshBasicMaterial>(null);
  const particlesRef = useRef<THREE.PointsMaterial>(null);
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

  useEffect(() => () => geometry?.dispose(), [geometry]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const frameDelta = Math.min(delta, 1 / 45);
    const target = active ? 1 : 0;
    group.userData.presence = THREE.MathUtils.lerp(group.userData.presence ?? 0, target, Math.min(1, frameDelta * 1.45));
    const presence = group.userData.presence as number;
    group.visible = presence > 0.006;

    const t = state.clock.elapsedTime;
    const cutIndex = THREE.MathUtils.clamp(step, 13, 24) - 13;
    const cut = DEEP_CUTS[cutIndex];
    group.rotation.y += frameDelta * (0.010 + cut.drift * 0.34);
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
  });

  return (
    <group ref={groupRef} visible={false} renderOrder={-2}>
      <mesh scale={[3.85, 3.15, 1.8]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial ref={mistRef} color="#d4af72" transparent opacity={0} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0, -0.85]} scale={[2.25, 1.9, 1.25]}>
        <sphereGeometry args={[1, 40, 28]} />
        <meshBasicMaterial ref={innerMistRef} color="#6d7f98" transparent opacity={0} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {geometry && (
        <points geometry={geometry}>
          <pointsMaterial ref={particlesRef} color="#f5dfad" transparent opacity={0} size={0.028} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      )}
    </group>
  );
}
