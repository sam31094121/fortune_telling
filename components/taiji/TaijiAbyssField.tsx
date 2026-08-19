'use client';

/**
 * 【深淵場｜×10,000,000,000,000 → ×100,000,000,000,000,000,000,000】（2026-08-21 依業主指示）
 *
 * 無極之門（第 13 層）之後，一路連接到第 24 層，形成一個無限循環：
 *
 *  第 14~18 層（相位潮汐→無名之境）：失去固定參照，形體被一條連續的「抽象化」曲線
 *  （uAbyss）逐漸吃掉——陰陽分色慢慢被雜訊蓋過，這是誠實的視覺語言：越深，
 *  真的應該越看不清楚，不是畫得更精緻。
 *  第 19~21 層（事件視界→奇異點→白洞噴湧）：黑洞意象的核心——同一顆點雲用
 *  uSuction 驅動頂點沿半徑位移，先被「吸」向中心，在奇異點附近收到最緊，
 *  再「噴」出去，時間感在此翻轉。
 *  第 22~23 層（不可定域→宇宙止境）：噴發後歸於極低頻率的呼吸。
 *  第 24 層（宇宙太極）：白洞噴出的，是縮小版的太極全貌本身——同一張貼圖、
 *  同一圈軌道環，呼應第 1 層。使用者把倍率轉回 ×1，看到的是同一顆——首尾閉合。
 *
 * 效能與鐵律：十段深度只用一顆共用 ShaderMaterial + 一顆點雲幾何（armed 時建一次，
 * 之後只調 uniform，不因深度切換重建），加上第 24 層的收尾用一顆球體+一圈環，
 * 全部一次建好、只切 `.visible`，不在互動中重編著色器。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAG_DECADES, smoothstep, type MagRef, type WarmRef } from './taijiMagnifier';

const NO_RAYCAST = () => null;

/* 深淵場整體淡入：早於「無極之門」在 d=11.6 完全定格前就開始重疊 */
const ABYSS_IN = 11.8;
const ABYSS_FULL = 13.2;
/* uAbyss：貫穿 14~22 層的連續抽象化曲線（清晰 → 雜訊） */
const CLARITY_START = 13.0;
const CLARITY_END = 22.0;
/* 黑洞三段：事件視界吸入 → 奇異點收到最緊 → 白洞噴出 */
const PULL_IN = 17.6;
const PULL_PEAK = 19.3;
const HOLD_END = 20.3;
const BURST_OUT = 21.0;
const BURST_END = 22.4;
/* 第 24 層：白洞噴回最初的太極全貌，首尾閉合 */
const FINALE_IN = 21.8;
const FINALE_FULL = 23.0;

const ABYSS_PARTICLE_COUNT = 1600;

function buildAbyssGeometry() {
  const positions = new Float32Array(ABYSS_PARTICLE_COUNT * 3);
  const seeds = new Float32Array(ABYSS_PARTICLE_COUNT);
  let seed = 20260821;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < ABYSS_PARTICLE_COUNT; i++) {
    const r = 0.5 + Math.pow(rand(), 0.6) * 1.9;
    const cosTheta = rand() * 2 - 1;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const phi = rand() * Math.PI * 2;
    positions[i * 3] = r * sinTheta * Math.cos(phi);
    positions[i * 3 + 1] = r * cosTheta;
    positions[i * 3 + 2] = r * sinTheta * Math.sin(phi);
    seeds[i] = rand();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  return geo;
}

const ABYSS_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uReveal;
  uniform float uAbyss;
  uniform float uSuction;
  varying float vSeed;
  varying float vPolarity;
  varying float vAbyss;
  varying float vFade;
  void main() {
    vSeed = aSeed;
    vAbyss = uAbyss;
    vec3 dir = normalize(position);
    vPolarity = position.y;
    // 吸入收縮 / 噴出膨脹：同一顆點雲，靠半徑縮放表現黑洞→白洞
    float pull = clamp(uSuction, 0.0, 1.0);
    float push = clamp(-uSuction, 0.0, 1.0);
    float radiusScale = 1.0 - pull * 0.58 + push * 1.6;
    vec3 p = dir * length(position) * radiusScale;
    p += dir * sin(uTime * 0.4 + aSeed * 50.0) * (0.02 + uAbyss * 0.05);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (0.8 + aSeed * 1.3) * uReveal * (55.0 / max(0.5, -mv.z));
    vFade = clamp(size / 12.0, 0.0, 1.0);
    gl_PointSize = min(size, 12.0);
  }
`;

const ABYSS_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uReveal;
  uniform float uAbyss;
  uniform float uSuction;
  uniform vec3 uYin;
  uniform vec3 uYang;
  uniform vec3 uSpark;
  varying float vSeed;
  varying float vPolarity;
  varying float vAbyss;
  varying float vFade;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = pow(1.0 - d * 2.0, 3.0);

    // 清晰的陰陽分色，隨 uAbyss 逐漸被雜訊蓋過——越深越看不清楚，這是誠實的視覺語言
    float flicker = hash(vSeed * 97.0 + floor(uTime * 2.4));
    vec3 clearCol = mix(uYin, uYang, step(0.0, vPolarity));
    vec3 noiseCol = mix(uYin, uYang, flicker);
    vec3 col = mix(clearCol, noiseCol, vAbyss);

    float pulse = 0.5 + 0.5 * sin(uTime * (0.5 + vAbyss * 1.3) + vSeed * 30.0);
    float burst = clamp(abs(uSuction), 0.0, 1.0);
    col = mix(col, uSpark, burst * 0.75 + pulse * 0.12);

    float sizeFade = mix(1.0, 0.3, vAbyss);
    float alpha = glow * uReveal * vFade * sizeFade * (0.16 + pulse * 0.2 + burst * 0.55);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

export default function TaijiAbyssField({
  magRef,
  warmRef,
  yinColor,
  yangColor,
  sparkColor,
  coreTexture,
  coreBumpMap,
}: {
  magRef: MagRef;
  warmRef: WarmRef;
  yinColor: string;
  yangColor: string;
  sparkColor: string;
  /** 第 24 層「宇宙太極」收尾：直接複用卡片最外層第 1 層的貼圖，首尾閉合成同一顆核心 */
  coreTexture?: THREE.Texture | null;
  coreBumpMap?: THREE.Texture | null;
}) {
  const [armed, setArmed] = useState(false);
  const rootRef = useRef<THREE.Group>(null);
  const fieldRef = useRef<THREE.Points>(null);
  const finaleCoreRef = useRef<THREE.Mesh>(null);
  const finaleRingRef = useRef<THREE.Mesh>(null);

  const coreTextureRef = useRef(coreTexture);
  const coreBumpMapRef = useRef(coreBumpMap);
  coreTextureRef.current = coreTexture;
  coreBumpMapRef.current = coreBumpMap;

  const built = useMemo(() => {
    if (!armed) return null;
    const fieldGeometry = buildAbyssGeometry();
    const fieldMaterial = new THREE.ShaderMaterial({
      vertexShader: ABYSS_VERTEX,
      fragmentShader: ABYSS_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uAbyss: { value: 0 },
        uSuction: { value: 0 },
        uYin: { value: new THREE.Color(yinColor) },
        uYang: { value: new THREE.Color(yangColor) },
        uSpark: { value: new THREE.Color(sparkColor) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    /* 第 24 層收尾：只准往上——球體規格不低於前面幾段已用的水準 */
    const finaleGeometry = new THREE.SphereGeometry(1, 96, 96);
    const finaleCoreMaterial = new THREE.MeshPhysicalMaterial({
      map: coreTextureRef.current ?? null,
      bumpMap: coreBumpMapRef.current ?? null,
      bumpScale: 0.012,
      metalness: 0.3,
      roughness: 0.2,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.3,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const finaleRingGeometry = new THREE.TorusGeometry(1, 0.035, 24, 96);
    const finaleRingMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(sparkColor),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { fieldGeometry, fieldMaterial, finaleGeometry, finaleCoreMaterial, finaleRingGeometry, finaleRingMaterial };
  }, [armed, yinColor, yangColor, sparkColor]);

  useEffect(
    () => () => {
      built?.fieldGeometry.dispose();
      built?.fieldMaterial.dispose();
      built?.finaleGeometry.dispose();
      built?.finaleCoreMaterial.dispose();
      built?.finaleRingGeometry.dispose();
      built?.finaleRingMaterial.dispose();
    },
    [built],
  );

  useEffect(() => {
    if (!built) return;
    built.finaleCoreMaterial.map = coreTexture ?? null;
    built.finaleCoreMaterial.bumpMap = coreBumpMap ?? null;
    built.finaleCoreMaterial.needsUpdate = true;
  }, [built, coreTexture, coreBumpMap]);

  useFrame((state, delta) => {
    const d = magRef.current.current * MAG_DECADES;
    const warming = warmRef.current.warming;
    if (!armed || !built) {
      if (warming || d > ABYSS_IN - 0.5 || magRef.current.target * MAG_DECADES > ABYSS_IN - 0.5) setArmed(true);
      return;
    }

    const root = rootRef.current;
    const reveal = smoothstep(ABYSS_IN, ABYSS_FULL, d);
    const showLayer = reveal > 0.002;
    if (root) {
      root.visible = showLayer || warming;
      root.scale.setScalar(showLayer ? 1 : 0.0001);
    }
    if (!showLayer) return;

    const t = state.clock.elapsedTime;
    const camera = state.camera as THREE.PerspectiveCamera;
    const halfHeight = camera.position.length() * Math.tan((camera.fov * Math.PI) / 360);
    const spin = Math.min(delta, 1 / 45) * 0.05;

    const abyss = smoothstep(CLARITY_START, CLARITY_END, d);
    const pull = smoothstep(PULL_IN, PULL_PEAK, d) * (1 - smoothstep(PULL_PEAK, HOLD_END, d));
    const push = smoothstep(HOLD_END, BURST_OUT, d) * (1 - smoothstep(BURST_OUT, BURST_END, d) * 0.999);
    const suction = pull - push;

    const field = fieldRef.current;
    if (field) {
      const fieldScale = halfHeight * (0.05 + reveal * 0.55);
      field.scale.setScalar(fieldScale);
      field.rotation.y += spin;
    }

    built.fieldMaterial.uniforms.uTime.value = t;
    built.fieldMaterial.uniforms.uReveal.value = reveal;
    built.fieldMaterial.uniforms.uAbyss.value = abyss;
    built.fieldMaterial.uniforms.uSuction.value = suction;

    // 第 24 層：白洞噴回最初的太極全貌，首尾閉合
    const finaleReveal = smoothstep(FINALE_IN, FINALE_FULL, d);
    const finaleCore = finaleCoreRef.current;
    const finaleRing = finaleRingRef.current;
    if (finaleCore) {
      finaleCore.scale.setScalar(halfHeight * (0.05 + finaleReveal * 0.34));
      finaleCore.rotation.y += Math.min(delta, 1 / 45) * 0.08;
    }
    if (finaleRing) {
      finaleRing.scale.setScalar(halfHeight * (0.09 + finaleReveal * 0.5));
      finaleRing.rotation.x = Math.PI / 2.3;
      finaleRing.rotation.z += Math.min(delta, 1 / 45) * 0.04;
    }
    built.finaleCoreMaterial.opacity = finaleReveal;
    built.finaleRingMaterial.opacity = finaleReveal * 0.8;

    // 深淵場本身在終局淡出，把畫面交給重新浮現的太極全貌
    built.fieldMaterial.uniforms.uReveal.value = reveal * (1 - finaleReveal * 0.7);
  });

  if (!built) return null;

  return (
    <group ref={rootRef} visible={false} renderOrder={8}>
      <points ref={fieldRef} geometry={built.fieldGeometry} material={built.fieldMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={finaleCoreRef} geometry={built.finaleGeometry} material={built.finaleCoreMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={finaleRingRef} geometry={built.finaleRingGeometry} material={built.finaleRingMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
    </group>
  );
}
