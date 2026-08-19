'use client';

import { useEffect, useMemo, useRef } from 'react';
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
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(createDeepFieldPositions(), 3));
    return next;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const frameDelta = Math.min(delta, 1 / 45);
    const target = active ? 1 : 0;
    group.userData.presence = THREE.MathUtils.lerp(group.userData.presence ?? 0, target, Math.min(1, frameDelta * 1.45));
    const presence = group.userData.presence as number;
    group.visible = presence > 0.006;

    const t = state.clock.elapsedTime;
    const depth = THREE.MathUtils.clamp((step - 13) / 11, 0, 1);
    group.rotation.y += frameDelta * (0.012 + depth * 0.006);
    group.rotation.z = Math.sin(t * 0.07) * 0.025;
    group.scale.setScalar(1 + Math.sin(t * 0.18) * 0.012 + depth * 0.05);

    if (mistRef.current) mistRef.current.opacity = presence * (0.11 + depth * 0.025);
    if (innerMistRef.current) innerMistRef.current.opacity = presence * (0.075 + Math.sin(t * 0.21) * 0.012);
    if (particlesRef.current) {
      particlesRef.current.opacity = presence * (0.26 + depth * 0.08);
      particlesRef.current.size = 0.028 + depth * 0.006;
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
      <points geometry={geometry}>
        <pointsMaterial ref={particlesRef} color="#f5dfad" transparent opacity={0} size={0.028} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}
