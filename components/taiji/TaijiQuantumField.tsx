'use client';

/**
 * 【太極量子層｜光子與粒子的糾纏】（2026-08-17 依業主指示開工）
 *
 * 放到 10,000 倍以上時，太極的「材質」不再是材質——它解離成一團成對的粒子。
 * 這裡的糾纏不是比喻，是幾何上真的成立：
 *   每一顆粒子 P 都有一顆對面的夥伴 -P（過中心的點對稱）。
 *   太極圖形本身就是「點對稱反相」的——P 落在陰域，-P 必定落在陽域。
 *   所以：一顆是墨（自旋向上），對面那顆必定是月（自旋向下），永遠成對、永遠相反。
 *   連量子抖動都鏡像：P 往哪抖，-P 就往反方向抖，兩顆永遠維持點對稱。
 *   這就是陰陽，也就是糾纏。
 *
 * 效能鐵律：
 * - ×1 時完全不掛載（零成本），使用者一開始轉倍率才建幾何。
 * - 全部在 GPU 上算（抖動、閃爍、糾纏訊號都寫在 shader 裡），CPU 每幀只更新 8 個 uniform。
 * - 一個 Points draw call + 一個 LineSegments draw call，就這樣。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  TAIJI_BANDS,
  bandWeight,
  readJourneyDepth,
  sampleNumericKeyframes,
  type TaijiJourneyRef,
} from '@/lib/taiji-journey-depth';
import { type WarmRef } from './taijiMagnifier';

export type QuantumBudget = {
  /** 糾纏對數（實際點數 = pairs × 2） */
  pairs: number;
  /** 畫出糾纏連線的對數 */
  links: number;
};

/**
 * 太極極性函數：回傳 +1（陽·月）或 -1（陰·墨）
 * 數學性質：f(-x, -y) === -f(x, y)（點對稱反相）——糾纏成立的根據。
 */
function taijiPolarity(x: number, y: number, radius: number) {
  const half = radius * 0.5;
  const eye = radius * 0.115;
  const upper = Math.hypot(x, y - half);
  const lower = Math.hypot(x, y + half);
  if (upper < eye) return 1; // 陰中之陽（魚眼）
  if (lower < eye) return -1; // 陽中之陰（魚眼）
  if (upper < half) return -1; // 上圓：陰
  if (lower < half) return 1; // 下圓：陽
  return x < 0 ? -1 : 1; // 左墨右月
}

const FIELD_RADIUS = 1.06;

/* 這一層純粹是視覺，永遠不該被指標事件的射線檢測掃到——
   12,800 個點做逐點檢測是每次點擊數百毫秒的等級。 */
const NO_RAYCAST = () => null;

function buildQuantumGeometry(budget: QuantumBudget) {
  const { pairs, links } = budget;
  const count = pairs * 2;
  const positions = new Float32Array(count * 3);
  const polarity = new Float32Array(count);
  const seeds = new Float32Array(count);
  const mirrors = new Float32Array(count);
  const photons = new Float32Array(count);

  // 固定亂數種子：每次重建都長一樣，不會閃爍換臉
  let seed = 20260817;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const linkPositions = new Float32Array(links * 2 * 3);
  const linkSeeds = new Float32Array(links * 2);
  const linkMirrors = new Float32Array(links * 2);
  const linkPolarity = new Float32Array(links * 2);
  const linkT = new Float32Array(links * 2);

  for (let i = 0; i < pairs; i++) {
    // 球內均勻取樣
    const r = FIELD_RADIUS * Math.cbrt(rand());
    const cosTheta = rand() * 2 - 1;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const phi = rand() * Math.PI * 2;
    const x = r * sinTheta * Math.cos(phi);
    const y = r * sinTheta * Math.sin(phi);
    const z = r * cosTheta;

    const s = rand();
    const isPhoton = rand() < 0.16 ? 1 : 0;
    const pole = taijiPolarity(x, y, FIELD_RADIUS);

    const a = i * 2;
    const b = a + 1;
    positions[a * 3] = x;
    positions[a * 3 + 1] = y;
    positions[a * 3 + 2] = z;
    positions[b * 3] = -x;
    positions[b * 3 + 1] = -y;
    positions[b * 3 + 2] = -z;
    polarity[a] = pole;
    polarity[b] = -pole; // 幾何保證：對面那顆永遠相反
    seeds[a] = s;
    seeds[b] = s; // 同一個種子＝同一個命運
    mirrors[a] = 1;
    mirrors[b] = -1; // 抖動鏡像＝糾纏
    photons[a] = isPhoton;
    photons[b] = isPhoton;

    if (i < links) {
      const la = i * 2;
      const lb = la + 1;
      linkPositions[la * 3] = x;
      linkPositions[la * 3 + 1] = y;
      linkPositions[la * 3 + 2] = z;
      linkPositions[lb * 3] = -x;
      linkPositions[lb * 3 + 1] = -y;
      linkPositions[lb * 3 + 2] = -z;
      linkSeeds[la] = s;
      linkSeeds[lb] = s;
      linkMirrors[la] = 1;
      linkMirrors[lb] = -1;
      linkPolarity[la] = pole;
      linkPolarity[lb] = -pole;
      linkT[la] = 0;
      linkT[lb] = 1;
    }
  }

  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute('aPolarity', new THREE.BufferAttribute(polarity, 1));
  pointGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  pointGeometry.setAttribute('aMirror', new THREE.BufferAttribute(mirrors, 1));
  pointGeometry.setAttribute('aPhoton', new THREE.BufferAttribute(photons, 1));
  pointGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), FIELD_RADIUS * 8);

  const linkGeometry = new THREE.BufferGeometry();
  linkGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
  linkGeometry.setAttribute('aSeed', new THREE.BufferAttribute(linkSeeds, 1));
  linkGeometry.setAttribute('aMirror', new THREE.BufferAttribute(linkMirrors, 1));
  linkGeometry.setAttribute('aPolarity', new THREE.BufferAttribute(linkPolarity, 1));
  linkGeometry.setAttribute('aT', new THREE.BufferAttribute(linkT, 1));
  linkGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), FIELD_RADIUS * 8);

  return { pointGeometry, linkGeometry };
}

/** 量子抖動：粒子與糾纏線共用同一段 GLSL，端點才會永遠黏在粒子上 */
const WOBBLE_GLSL = /* glsl */ `
  vec3 quantumWobble(float seed, float mirror, float time, float amp) {
    float s = seed * 6.2831853;
    return vec3(
      sin(time * (0.85 + seed * 1.9) + s),
      cos(time * (1.07 + seed * 1.4) + s * 1.7),
      sin(time * (0.71 + seed * 2.2) + s * 2.3)
    ) * amp * (0.45 + seed * 0.55) * mirror;
  }
`;

const POINT_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uJitter;
  uniform float uField;
  uniform float uSize;
  uniform float uProjScale;
  uniform float uSplit;
  uniform float uPhotonFocus;
  attribute float aPolarity;
  attribute float aSeed;
  attribute float aMirror;
  attribute float aPhoton;
  varying float vPolarity;
  varying float vPhoton;
  varying float vGlow;
  ${WOBBLE_GLSL}

  void main() {
    vec3 p = position * uField + quantumWobble(aSeed, aMirror, uTime, uJitter);
    p.x += aPolarity * uSplit * (0.25 + abs(p.y) * 0.15);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float twinkle = 0.55 + 0.45 * sin(uTime * (1.9 + aPhoton * 3.6) + aSeed * 19.7);
    vGlow = twinkle;
    vPolarity = aPolarity;
    vPhoton = aPhoton;

    float radius = uSize * (0.5 + aSeed * 0.85 + aPhoton * (0.75 + uPhotonFocus)) * (0.75 + twinkle * 0.45);
    gl_PointSize = clamp(radius * uProjScale / max(0.25, -mv.z), 1.0, 96.0);
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform vec3 uYin;
  uniform vec3 uYang;
  uniform vec3 uSpark;
  uniform float uReveal;
  varying float vPolarity;
  varying float vPhoton;
  varying float vGlow;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.04, d);
    float halo = pow(core, 4.0);
    vec3 col = mix(uYin, uYang, vPolarity * 0.5 + 0.5);
    col = mix(col, uSpark, halo * (0.32 + vPhoton * 0.5));
    float alpha = (core * 0.42 + halo * 1.0) * uReveal * (0.45 + vGlow * 0.65);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const LINK_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uJitter;
  uniform float uField;
  uniform float uSplit;
  attribute float aSeed;
  attribute float aMirror;
  attribute float aPolarity;
  attribute float aT;
  varying float vT;
  varying float vSeed;
  ${WOBBLE_GLSL}

  void main() {
    vec3 p = position * uField + quantumWobble(aSeed, aMirror, uTime, uJitter);
    p.x += aPolarity * uSplit * (0.25 + abs(p.y) * 0.15);
    vT = aT;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const LINK_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform vec3 uYin;
  uniform vec3 uYang;
  uniform vec3 uSpark;
  uniform float uReveal;
  uniform float uBodyBoost;
  uniform float uTime;
  varying float vT;
  varying float vSeed;

  void main() {
    /* 每一條糾纏線都通過球心，180 條疊在一起會在正中央燒出一個假的爆點。
       所以連線只在「靠近粒子的兩端」看得見（六次方衰減），中段留白；
       真正穿過中央的，只有那顆來回傳遞的糾纏訊號光子——一次一顆、細細一點，
       這樣看起來才像訊息在兩顆粒子之間跑，而不是一顆星芒。 */
    float edge = abs(vT - 0.5) * 2.0;
    float filament = pow(edge, 6.0) * 0.42;
    float travel = abs(fract(uTime * 0.14 + vSeed) * 2.0 - 1.0);
    float signal = smoothstep(0.05, 0.0, abs(vT - travel)) * (0.28 + 0.72 * edge);
    vec3 col = mix(uYin, uYang, vT);
    col = mix(col, uSpark, signal);
    float continuous = uBodyBoost * (0.035 + edge * 0.14);
    float alpha = (filament + continuous + signal * 0.9) * uReveal;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const QUANTUM_FRAMES: Record<number, {
  points: number;
  links: number;
  field: number;
  jitter: number;
  size: number;
  scale: number;
  split: number;
  photonFocus: number;
  linkBody: number;
  spin: number;
  tilt: number;
}> = {
  5: { points: 0.95, links: 0.05, field: 0.62, jitter: 0.008, size: 0.011, scale: 1, split: 0, photonFocus: 0.2, linkBody: 0, spin: 0.015, tilt: 0 },
  6: { points: 1.15, links: 0.68, field: 0.55, jitter: 0.026, size: 0.023, scale: 0.85, split: 1.8, photonFocus: 0.45, linkBody: 0.12, spin: 0.085, tilt: 0 },
  7: { points: 0.18, links: 2.8, field: 0.82, jitter: 0.046, size: 0.01, scale: 1.1, split: 0.36, photonFocus: 0.6, linkBody: 1.15, spin: 0.15, tilt: 0.3 },
  8: { points: 1.2, links: 0.03, field: 0.76, jitter: 0.086, size: 0.023, scale: 1.08, split: 0.2, photonFocus: 0.9, linkBody: 0, spin: 0.21, tilt: -0.34 },
  9: { points: 1.6, links: 0.5, field: 0.82, jitter: 0.18, size: 0.052, scale: 1.48, split: 0.12, photonFocus: 1.9, linkBody: 0.08, spin: 0.3, tilt: 0.58 },
  10: { points: 0.92, links: 0.42, field: 0.38, jitter: 0.06, size: 0.044, scale: 0.75, split: 1.7, photonFocus: 0.8, linkBody: 0.32, spin: -0.18, tilt: 0 },
  11: { points: 0.24, links: 0.16, field: 2.05, jitter: 0.04, size: 0.06, scale: 1.24, split: 1.16, photonFocus: 0.65, linkBody: 0.06, spin: 0.06, tilt: 1.05 },
};

export default function TaijiQuantumField({
  journeyRef,
  warmRef,
  budget,
  yinColor,
  yangColor,
  sparkColor,
}: {
  journeyRef: TaijiJourneyRef;
  warmRef: WarmRef;
  budget: QuantumBudget;
  yinColor: string;
  yangColor: string;
  sparkColor: string;
}) {
  /* ×1 時零成本：使用者真的開始轉倍率，才建幾何與 shader */
  const [armed, setArmed] = useState(false);
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const linksRef = useRef<THREE.LineSegments>(null);

  const built = useMemo(() => (armed ? buildQuantumGeometry(budget) : null), [armed, budget]);

  /* 材質由我們自己 new 出來，再用 material={} 掛上去——不能用 <shaderMaterial uniforms={...}>：
     R3F 會把 uniforms 這種純物件「深層合併」到材質既有的 uniforms 上，
     材質拿到的是另一份複製品；我們每幀更新的就變成一份沒人看的孤兒物件
     （症狀：uReveal 永遠是 0，粒子全透明，畫面一片空）。
     自己持有材質實例，uniforms 的身分才是確定的。 */
  const materials = useMemo(() => {
    if (!armed) return null;
    const shared = () => ({
      uTime: { value: 0 },
      uJitter: { value: 0 },
      uField: { value: 1 },
      uSplit: { value: 0 },
      uReveal: { value: 0 },
      uYin: { value: new THREE.Color(yinColor) },
      uYang: { value: new THREE.Color(yangColor) },
      uSpark: { value: new THREE.Color(sparkColor) },
    });
    const pointMaterial = new THREE.ShaderMaterial({
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      uniforms: { ...shared(), uSize: { value: 0.008 }, uProjScale: { value: 900 }, uPhotonFocus: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const linkMaterial = new THREE.ShaderMaterial({
      vertexShader: LINK_VERTEX,
      fragmentShader: LINK_FRAGMENT,
      uniforms: { ...shared(), uBodyBoost: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { pointMaterial, linkMaterial };
  }, [armed, yinColor, yangColor, sparkColor]);

  useEffect(
    () => () => {
      built?.pointGeometry.dispose();
      built?.linkGeometry.dispose();
    },
    [built],
  );

  useEffect(
    () => () => {
      materials?.pointMaterial.dispose();
      materials?.linkMaterial.dispose();
    },
    [materials],
  );

  useFrame((state, delta) => {
    const depth = readJourneyDepth(journeyRef);
    const presence = bandWeight(
      depth,
      TAIJI_BANDS.quantum.enter,
      TAIJI_BANDS.quantum.full,
      TAIJI_BANDS.quantum.exitStart,
      TAIJI_BANDS.quantum.exitEnd,
    );
    const warming = warmRef.current.warming;
    if (!armed || !materials) {
      if (warming || presence > 0.002 || journeyRef.current.target >= TAIJI_BANDS.quantum.enter) setArmed(true);
      return;
    }
    const cut = sampleNumericKeyframes(depth, QUANTUM_FRAMES);
    const pointUniforms = materials.pointMaterial.uniforms;
    const linkUniforms = materials.linkMaterial.uniforms;

    const points = pointsRef.current;
    const links = linksRef.current;
    const group = groupRef.current;

    const reveal = (cut.points ?? 0) * presence;
    const linkReveal = (cut.links ?? 0) * presence;
    const visible = reveal > 0.002;
    if (group) {
      group.visible = visible || warming;
      group.scale.setScalar(visible ? (cut.scale ?? 1) : 0.0001);
    }
    if (!visible && !warming) return;

    const t = state.clock.elapsedTime;
    const camera = state.camera as THREE.PerspectiveCamera;
    const projScale = gl.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));

    pointUniforms.uTime.value = t;
    pointUniforms.uReveal.value = reveal;
    pointUniforms.uField.value = cut.field ?? 1;
    pointUniforms.uJitter.value = cut.jitter ?? 0;
    pointUniforms.uSplit.value = cut.split ?? 0;
    pointUniforms.uProjScale.value = projScale;
    pointUniforms.uSize.value = cut.size ?? 0.011;
    pointUniforms.uPhotonFocus.value = cut.photonFocus ?? 0;

    linkUniforms.uTime.value = t;
    linkUniforms.uReveal.value = linkReveal;
    linkUniforms.uBodyBoost.value = cut.linkBody ?? 0;
    linkUniforms.uField.value = cut.field ?? 1;
    linkUniforms.uJitter.value = cut.jitter ?? 0;
    linkUniforms.uSplit.value = cut.split ?? 0;

    if (links) links.visible = linkReveal > 0.004 || warming;
    if (points && group) {
      const spin = cut.spin ?? 0;
      group.rotation.y = Math.sin(t * (0.24 + Math.abs(spin))) * spin;
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, cut.tilt ?? 0, Math.min(1, delta * 1.8));
    }
  });

  if (!built || !materials) return null;

  return (
    <group ref={groupRef} visible={false}>
      <points
        ref={pointsRef}
        geometry={built.pointGeometry}
        material={materials.pointMaterial}
        frustumCulled={false}
        raycast={NO_RAYCAST}
        renderOrder={4}
      />
      <lineSegments
        ref={linksRef}
        geometry={built.linkGeometry}
        material={materials.linkMaterial}
        frustumCulled={false}
        raycast={NO_RAYCAST}
        renderOrder={3}
      />
    </group>
  );
}
