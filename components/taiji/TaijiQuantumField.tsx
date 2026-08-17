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
import { MAG_DECADES, smoothstep, type MagRef, type WarmRef } from './taijiMagnifier';

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
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float twinkle = 0.55 + 0.45 * sin(uTime * (1.9 + aPhoton * 3.6) + aSeed * 19.7);
    vGlow = twinkle;
    vPolarity = aPolarity;
    vPhoton = aPhoton;

    float radius = uSize * (0.5 + aSeed * 0.85 + aPhoton * 0.75) * (0.75 + twinkle * 0.45);
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
  attribute float aSeed;
  attribute float aMirror;
  attribute float aT;
  varying float vT;
  varying float vSeed;
  ${WOBBLE_GLSL}

  void main() {
    vec3 p = position * uField + quantumWobble(aSeed, aMirror, uTime, uJitter);
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
    float alpha = (filament + signal * 0.9) * uReveal;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

export default function TaijiQuantumField({
  magRef,
  warmRef,
  budget,
  yinColor,
  yangColor,
  sparkColor,
}: {
  magRef: MagRef;
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
      uReveal: { value: 0 },
      uYin: { value: new THREE.Color(yinColor) },
      uYang: { value: new THREE.Color(yangColor) },
      uSpark: { value: new THREE.Color(sparkColor) },
    });
    const pointMaterial = new THREE.ShaderMaterial({
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      uniforms: { ...shared(), uSize: { value: 0.008 }, uProjScale: { value: 900 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const linkMaterial = new THREE.ShaderMaterial({
      vertexShader: LINK_VERTEX,
      fragmentShader: LINK_FRAGMENT,
      uniforms: shared(),
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
    /* 門檻一律用「數量級」：d=2 是 ×100、d=5 是 ×100,000、d=7 是 ×10,000,000。
       用絕對刻度寫，日後再往下加倍率也不會把既有的節奏整個位移。 */
    const d = magRef.current.current * MAG_DECADES;
    const warming = warmRef.current.warming;
    if (!armed || !materials) {
      /* 暖機視窗也要上場：幾何在這裡建好、著色器在這裡編好，
         使用者第一次轉倍率時就不會撞上建構與編譯的雙重停頓。 */
      if (warming || magRef.current.target * MAG_DECADES > 0.08 || d > 0.08) setArmed(true);
      return;
    }
    const pointUniforms = materials.pointMaterial.uniforms;
    const linkUniforms = materials.linkMaterial.uniforms;

    const points = pointsRef.current;
    const links = linksRef.current;
    const group = groupRef.current;

    /* 顯現節奏：×100 起微微浮現顆粒 → ×10,000 完全接管畫面。
       ×100,000 之後把舞台交給更深的糾纏內景層（粒子海退場，鏡頭鎖定其中一對）。 */
    const handover = 1 - smoothstep(5.0, 5.9, d);
    const reveal = smoothstep(2, 4, d) * handover;
    const linkReveal = smoothstep(3.3, 4.7, d) * handover;
    const visible = reveal > 0.002;
    if (group) {
      group.visible = visible || warming;
      // 暖機時縮到看不見，但渲染管線照樣會編譯這支著色器
      group.scale.setScalar(visible ? 1 : 0.0001);
    }
    if (!visible && !warming) return;

    const t = state.clock.elapsedTime;
    /* 場域膨脹只給到 1.7 倍——這是實測校正過的關鍵數字：
       粒子總數固定，場域每放大一倍，畫面內的密度就掉一個立方，
       撐到 4 倍時整個畫面只剩下二十幾顆粒子（一片空白）。
       正確作法是鏡頭「走進」粒子之間（見 MicroscopeRig 的最後一段推進），
       粒子本身只微微散開、但顆顆變大——這才是顯微鏡下該有的稠密感。 */
    const field = 1 + smoothstep(2.25, 5, d) * 0.7;
    const jitter = 0.003 + smoothstep(1.9, 5, d) * 0.075;
    /* 點大小依實際 backing store 換算，1080p / 1440p 都是正確的物理尺寸 */
    const camera = state.camera as THREE.PerspectiveCamera;
    const projScale = gl.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));

    pointUniforms.uTime.value = t;
    pointUniforms.uReveal.value = reveal;
    pointUniforms.uField.value = field;
    pointUniforms.uJitter.value = jitter;
    pointUniforms.uProjScale.value = projScale;
    /* 倍率越高，單顆粒子在畫面上越大（放大鏡的本份） */
    pointUniforms.uSize.value = 0.0075 + smoothstep(2.25, 5, d) * 0.017;

    linkUniforms.uTime.value = t;
    linkUniforms.uReveal.value = linkReveal;
    linkUniforms.uField.value = field;
    linkUniforms.uJitter.value = jitter;

    if (links) links.visible = linkReveal > 0.004 || warming;
    if (points && group) {
      // 整團粒子維持與太極圖騰同一個朝向，慢慢自轉
      group.rotation.y += Math.min(delta, 1 / 45) * 0.035;
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
