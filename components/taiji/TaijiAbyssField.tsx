'use client';

/**
 * 【深淵場｜×10,000,000,000,000 → ×10,000,000,000,000,000,000,000,000】（2026-08-21）
 *
 * 無極之門之後，一路連接到最後一段（宇宙太極，decade 25），形成一個無限循環：
 *
 *  相位潮汐→無名之境：失去固定參照，形體被一條連續的「抽象化」曲線
 *  （uAbyss）逐漸吃掉——陰陽分色慢慢被雜訊蓋過，這是誠實的視覺語言：越深，
 *  真的應該越看不清楚，不是畫得更精緻。
 *  事件視界→奇異點→白洞噴湧：黑洞意象的核心——同一顆點雲用
 *  uSuction 驅動頂點沿半徑位移，先被「吸」向中心，在奇異點附近收到最緊，
 *  再「噴」出去，時間感在此翻轉。
 *  不可定域→宇宙止境→歸零之息→迴聲初醒：噴發後歸於極低頻率的呼吸，
 *  收尾多兩段緩衝，不是直接硬切到全貌。
 *  宇宙太極（decade 25）：白洞噴出的，是縮小版的太極全貌本身——同一張貼圖、
 *  同一顆核心，呼應最一開始的太極。使用者把倍率轉回 ×1，看到的是同一顆——首尾閉合。
 *  （2026-08-22 依業主指示：核心外面不能有任何圓框——粒子與光子連宇宙都框不住，
 *  太極本體也不能被自己的收尾套一圈框，所以拿掉了原本包著它的軌道環。）
 *
 * 效能與鐵律：這麼多段深度只用一顆共用 ShaderMaterial + 一顆點雲幾何（armed 時建一次，
 * 之後只調 uniform，不因深度切換重建），加上終局只用一顆球體、沒有任何框架，
 * 全部一次建好、只切 `.visible`，不在互動中重編著色器。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAG_DECADES, smoothstep, clamp01, type MagRef, type WarmRef } from './taijiMagnifier';

const NO_RAYCAST = () => null;

/* 深淵場整體淡入：早於「無極之門」在 d=11.6 完全定格前就開始重疊 */
const ABYSS_IN = 11.8;
const ABYSS_FULL = 13.2;
/* uAbyss：貫穿 14~22 層的連續抽象化曲線（清晰 → 雜訊） */
const CLARITY_START = 13.0;
const CLARITY_END = 22.0;
/* 遙遠感（2026-08-22 依業主指示：相位潮汐→無名之境這幾段要有「越走越遠」的樓梯感，
   不能是同一團點雲只換顏色）：從相位潮汐開始，整團場慢慢縮小、退遠、變暗，
   一路退到事件視界前一刻——黑洞的引力才把它「拉回來」，變大、變近、收緊。
   這樣 11~16 層才有真正的空間推移，不是靜止不動只調參數。 */
const RECEDE_START = 13.0;
const RECEDE_END = 17.6;
/* 黑洞三段：事件視界吸入 → 奇異點收到最緊 → 白洞噴出 */
const PULL_IN = 17.6;
const PULL_PEAK = 19.3;
const HOLD_END = 20.3;
const BURST_OUT = 21.0;
const BURST_END = 22.4;
/* 第 24 段（宇宙太極，decade 25）：白洞噴回最初的太極全貌，首尾閉合。
   2026-08-21 補了「歸零之息」「迴聲初醒」兩段收尾（decade 23~24）之後，
   終局改到 decade 25 才完全成形，讓收尾多兩段呼吸感，不是直接硬切到全貌。 */
const FINALE_IN = 23.8;
const FINALE_FULL = 25.0;
/* 2026-08-22 依業主指示：13~24 段要有系統性、計劃性、故事性的意境，不能是參數平移。
   「歸零之息」（decade 23）與「迴聲初醒」（decade 24）原本只套用跟其他段一樣的通用
   脈動，沒有自己的戲——現在補上專屬的兩拍：先靜下來（屏息），再被單獨一次更強的
   回聲打破寂靜，才接得上第 24 段的全貌重現，收尾更有敘事的起承轉合。 */
const ZERO_BREATH_CENTER = 23.0;
const FIRST_ECHO_CENTER = 24.0;

/* 分場調色表：decade 13(相位潮汐) → decade 24(迴聲初醒)，一段一個顏色，CPU 端每幀
   按目前 decade 內插出當下色調，只傳一顆 vec3 uniform 進 shader——零額外 draw call、
   零額外幾何，純粹是色彩語言的「分場」，讓 12 段共用同一組點雲時仍然一眼可辨。 */
const TIER_TINTS: readonly [number, string][] = [
  [13, '#8ec5ff'], // 相位潮汐：冷藍，潮汐月光感
  [14, '#c9c9d6'], // 微光回聲：銀灰，殘影感
  [15, '#6a5acd'], // 互感之幕：靛紫，隔著一層紗
  [16, '#4b3f72'], // 靜默摺疊：深紫，空間收摺
  [17, '#5a5a5a'], // 無名之境：中性灰，無以名之
  [18, '#ff6a3d'], // 事件視界：警示橙紅，吞噬的邊界
  [19, '#ffffff'], // 奇異點：純白熾光，規則失效
  [20, '#fff2a8'], // 白洞噴湧：亮金白，噴發閃光
  [21, '#b388ff'], // 不可定域：漂移紫，抓不住中心
  [22, '#3a6ea5'], // 宇宙止境：深冷藍，極低頻呼吸
  [23, '#1a1a2e'], // 歸零之息：近黑，屏息
  [24, '#ffd76a'], // 迴聲初醒：暖金閃，破寂靜的回聲
];
const TIER_TINT_COLORS = TIER_TINTS.map(([, hex]) => new THREE.Color(hex));
const TIER_TINT_BASE_DECADE = TIER_TINTS[0][0];

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
  uniform vec3 uTierTint;
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
    // 分場調色：每一段物鏡有自己的專屬色調（CPU 端按 decade 內插好才傳進來，
    // 這裡只做一次 mix，零額外成本），像電影分場調色一樣一眼認得出「這是哪一幕」
    col = mix(col, uTierTint, 0.55);

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

  const coreTextureRef = useRef(coreTexture);
  const coreBumpMapRef = useRef(coreBumpMap);
  coreTextureRef.current = coreTexture;
  coreBumpMapRef.current = coreBumpMap;
  const tintScratchRef = useRef(new THREE.Color());

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
        uTierTint: { value: new THREE.Color(TIER_TINT_COLORS[0]) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    /* 2026-08-22 效能調整：跟 TaijiCellularCore 同樣的道理——降的是多邊形密度，
       不是內部渲染解析度／貼圖／DPR，那些維持只准往上不變。 */
    const finaleGeometry = new THREE.SphereGeometry(1, 64, 64);
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

    return { fieldGeometry, fieldMaterial, finaleGeometry, finaleCoreMaterial };
  }, [armed, yinColor, yangColor, sparkColor]);

  useEffect(
    () => () => {
      built?.fieldGeometry.dispose();
      built?.fieldMaterial.dispose();
      built?.finaleGeometry.dispose();
      built?.finaleCoreMaterial.dispose();
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

    // 分場調色：按目前 decade 在 TIER_TINT_COLORS 表裡內插，CPU 端一次 lerp，零額外 GPU 成本
    const tintFloat = clamp01((d - TIER_TINT_BASE_DECADE) / (TIER_TINT_COLORS.length - 1)) * (TIER_TINT_COLORS.length - 1);
    const tintIndex = Math.min(TIER_TINT_COLORS.length - 2, Math.floor(tintFloat));
    const tintFrac = tintFloat - tintIndex;
    const tint = tintScratchRef.current.copy(TIER_TINT_COLORS[tintIndex]).lerp(TIER_TINT_COLORS[tintIndex + 1], tintFrac);
    built.fieldMaterial.uniforms.uTierTint.value.copy(tint);

    const pull = smoothstep(PULL_IN, PULL_PEAK, d) * (1 - smoothstep(PULL_PEAK, HOLD_END, d));
    const push = smoothstep(HOLD_END, BURST_OUT, d) * (1 - smoothstep(BURST_OUT, BURST_END, d) * 0.999);
    const suction = pull - push;

    /* 遙遠感：相位潮汐開始退遠，事件視界前的引力（pull）把它拉回來——但退遠只能是
       「越看越深」，不能讀成「畫面死掉了」，所以縮小/變暗的幅度收斂很多；
       同時每跨過一個整數數量級（也就是每換一段物鏡）補一次短暫脈動——
       像剪接的一個個鏡頭切點，讓 12~16 這幾段各自有自己「發生了什麼」的瞬間，
       不是一條看不出段落的連續淡變。深不見底：這條脈動永遠不停，沒有終點。 */
    const recede = smoothstep(RECEDE_START, RECEDE_END, d) * (1 - pull);
    const nearestDecade = Math.round(d);
    const distToDecade = Math.abs(d - nearestDecade);
    const tierBeat = Math.exp(-distToDecade * 9) * smoothstep(ABYSS_FULL, ABYSS_FULL + 0.4, d);

    // 歸零之息：屏息——在這一拍把通用脈動與呼吸幅度壓到最低，畫面刻意安靜下來
    const stillness = Math.exp(-Math.pow(d - ZERO_BREATH_CENTER, 2) * 6);
    // 迴聲初醒：單獨一次比通用脈動更強的回聲，打破前一拍的寂靜，預告終局將至
    const echoPulse = Math.exp(-Math.pow(d - FIRST_ECHO_CENTER, 2) * 10);

    const field = fieldRef.current;
    if (field) {
      const fieldScale = halfHeight * (0.05 + reveal * 0.55) * (1 - recede * 0.22) * (1 + tierBeat * 0.12) * (1 - stillness * 0.28) * (1 + echoPulse * 0.22);
      field.scale.setScalar(fieldScale);
      field.rotation.y += spin * (1 + recede * 0.4) * (1 - stillness * 0.7);
    }

    built.fieldMaterial.uniforms.uTime.value = t;
    built.fieldMaterial.uniforms.uReveal.value =
      reveal * (1 - recede * 0.12) * (1 + tierBeat * 0.4) * (1 - stillness * 0.45) * (1 + echoPulse * 0.5);
    built.fieldMaterial.uniforms.uAbyss.value = abyss;
    built.fieldMaterial.uniforms.uSuction.value = suction;

    // 第 24 層：白洞噴回最初的太極全貌，首尾閉合——核心本身，沒有任何框架圍著它
    const finaleReveal = smoothstep(FINALE_IN, FINALE_FULL, d);
    const finaleCore = finaleCoreRef.current;
    if (finaleCore) {
      // 拿掉外圈軌道環之後，核心單獨撐開構圖，把原本環佔的視覺份量收回自己身上
      finaleCore.scale.setScalar(halfHeight * (0.05 + finaleReveal * 0.46));
      finaleCore.rotation.y += Math.min(delta, 1 / 45) * 0.08;
    }
    built.finaleCoreMaterial.opacity = finaleReveal;

    // 深淵場本身在終局淡出，把畫面交給重新浮現的太極全貌（疊乘遙遠感、段落脈動與歸零/回聲兩拍，不覆蓋掉它們）
    built.fieldMaterial.uniforms.uReveal.value =
      reveal * (1 - recede * 0.12) * (1 + tierBeat * 0.4) * (1 - stillness * 0.45) * (1 + echoPulse * 0.5) * (1 - finaleReveal * 0.7);
  });

  if (!built) return null;

  return (
    <group ref={rootRef} visible={false} renderOrder={8}>
      <points ref={fieldRef} geometry={built.fieldGeometry} material={built.fieldMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={finaleCoreRef} geometry={built.finaleGeometry} material={built.finaleCoreMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
    </group>
  );
}
