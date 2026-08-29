'use client';

/**
 * 【細胞內景層｜×100,000,000 → ×1,000,000,000,000】（2026-08-19 依業主指示再深入五級）
 *
 * ×10,000,000（TaijiEntanglementCore 的終點）看到的是：波包內部浮現的還是太極。
 * 這一層接著往裡鑽，把那顆重新浮現的太極當成一層細胞膜，繼續深入：
 *
 *  ×100,000,000       細胞膜   —— 膜面浮出量子泡沫般的顆粒紋理，陰陽仍在膜上分域。
 *  ×1,000,000,000     核質場   —— 穿膜而入，內部浮現一組更小的糾纏粒子對，
 *                                每一顆自己就是一顆縮小的太極——太極生太極，自相似遞迴。
 *  ×10,000,000,000    共振絲   —— 連接那對更小粒子的相位絲線本身也在振動糾纏。
 *  ×100,000,000,000   太極源點 —— 一切收斂成同時是陰陽的奇點光源，不再可分：
 *                                其大無外，其小無內。
 *  ×1,000,000,000,000 無極之門 —— 那個「不再可分」的奇點其實是一道門檻：沒有任何幾何框架，
 *                                純粹由粒子與光子的細胞狀光暈聚成一團，門後浮現的
 *                                是完整而縮小的太極本體本身（同一張貼圖、同一顆核心），
 *                                暗示結構向下無窮遞迴，深不可測——這是收尾的懸念，不是終點。
 *                                （2026-08-21 依業主指示拿掉環狀框架：第 13 層只能是
 *                                粒子與光子構成的細胞，不能有任何硬邊界幾何。）
 *
 * 銜接規則：淡入門檻刻意早於前一段完全定格就重疊淡入，畫面才會像剪接一樣順接，不是硬切。
 * 太極核心一行不動：這一層只在 ×10,000,000 前後才存在，之前完全不掛載計算。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  TAIJI_BANDS,
  bandWeight,
  readJourneyDepth,
  sampleNumericKeyframes,
  type TaijiJourneyRef,
} from '@/lib/taiji-journey-depth';
import { type WarmRef } from './taijiMagnifier';

const NO_RAYCAST = () => null;

/* 五段的絕對數量級門檻——與前一段的收尾故意重疊 0.2~0.8 個數量級，
   讓下一段在上一段還完全可見時就已經開始淡入。 */
const MEMBRANE_IN = 6.6;
const MEMBRANE_FULL = 7.4;
const NUCLEUS_IN = 7.6;
const NUCLEUS_FULL = 8.4;
const FILAMENT_IN = 8.6;
const FILAMENT_FULL = 9.4;
const SOURCE_IN = 9.6;
const SOURCE_FULL = 10.6;
const GATE_IN = 10.4;
const GATE_FULL = 11.6;

const TAIJI_GLSL = /* glsl */ `
  float taijiField(vec2 p) {
    float halfR = 0.5;
    float eye = 0.115;
    float dUp = length(p - vec2(0.0, halfR));
    float dLo = length(p + vec2(0.0, halfR));
    float f = clamp(p.x * 6.0, -1.0, 1.0);
    f = mix(f, -1.0, smoothstep(0.0, 0.03, halfR - dUp));
    f = mix(f,  1.0, smoothstep(0.0, 0.03, halfR - dLo));
    f = mix(f,  1.0, smoothstep(0.0, 0.015, eye - dUp));
    f = mix(f, -1.0, smoothstep(0.0, 0.015, eye - dLo));
    return f;
  }
`;

const HASH_GLSL = /* glsl */ `
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
`;

/* 膜面：量子泡沫顆粒紋理，陰陽仍以太極場分域，邊界疊一層細胞狀噪點 */
const MEMBRANE_VERTEX = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vView;
  void main() {
    vPos = position;
    vNormalW = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const MEMBRANE_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uYin;
  uniform vec3 uYang;
  uniform vec3 uSpark;
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vView;
  ${TAIJI_GLSL}
  ${HASH_GLSL}

  void main() {
    vec3 n = normalize(vPos);
    float f = taijiField(n.xy);
    float half01 = f * 0.5 + 0.5;
    vec3 col = mix(uYin, uYang, half01);

    // 量子泡沫：細胞狀顆粒，緩慢呼吸
    vec3 cell = floor(n * 26.0 + uTime * 0.05);
    float foam = hash3(cell);
    float foamPulse = 0.5 + 0.5 * sin(uTime * 0.6 + foam * 20.0);

    float edge = 1.0 - smoothstep(0.0, 0.2, abs(f));
    float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vView))), 2.2);

    col = mix(col, uSpark, edge * 0.6 + foam * foamPulse * 0.18);
    float body = 0.14 + half01 * 0.22 + edge * 0.5 + fres * 0.55 + foam * foamPulse * 0.12;
    float alpha = clamp(body, 0.0, 1.4) * uReveal;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/* 核質場：每一顆自己就是一顆縮小的太極——太極生太極 */
const NUCLEUS_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSpin;
  uniform float uReveal;
  uniform vec3 uYin;
  uniform vec3 uYang;
  uniform vec3 uSpark;
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vView;
  ${TAIJI_GLSL}

  void main() {
    vec3 n = normalize(vPos);
    float f = taijiField(n.xy);
    float half01 = f * 0.5 + 0.5;
    float edge = 1.0 - smoothstep(0.0, 0.22, abs(f));
    vec3 col = mix(uYin, uYang, half01);
    col = mix(col, uSpark, edge * 0.85);

    float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vView))), 2.6);
    float shimmer = pow(0.5 + 0.5 * sin(n.y * 9.0 - uTime * 1.6 * uSpin), 5.0);

    float body = 0.1 + half01 * 0.3 + edge * 0.85 + fres * 0.5 + shimmer * 0.2;
    float alpha = clamp(body, 0.0, 1.5) * uReveal;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/* 共振絲：連接核質對的相位絲線，比外層的雙螺旋通道更細更快 */
const FILAMENT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FILAMENT_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uYin;
  uniform vec3 uYang;
  uniform vec3 uSpark;
  varying vec2 vUv;
  void main() {
    float body = 0.12 + 0.3 * pow(abs(vUv.x - 0.5) * 2.0, 2.0);
    float go = fract(uTime * 0.5);
    float signal = smoothstep(0.05, 0.0, abs(vUv.x - go));
    vec3 col = mix(uYin, uYang, vUv.x);
    col = mix(col, uSpark, signal);
    float alpha = (body * 0.6 + signal * 1.2) * uReveal;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/* 太極源點：一切收斂成同時是陰陽的奇點光源——不再有分域，只有一點純光 */
const SOURCE_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uYin;
  uniform vec3 uYang;
  uniform vec3 uSpark;
  varying vec3 vPos;
  varying vec3 vView;
  varying vec3 vNormalW;
  void main() {
    vec3 col = mix(uYin, uYang, 0.5 + 0.5 * sin(uTime * 0.35));
    float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vView))), 1.6);
    float core = 1.0 - smoothstep(0.0, 1.0, length(vPos));
    col = mix(col, uSpark, core * 0.7 + fres * 0.3);
    float body = 0.3 + core * 1.1 + fres * 0.6;
    float alpha = clamp(body, 0.0, 1.8) * uReveal;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/* 無極之門：不用任何幾何框架——純粹是一團粒子與光子構成的細胞狀光暈，
   聚在門後迷你太極周圍，用「密度」而不是「邊界線」暗示這裡有一道門檻。 */
const GATE_HALO_COUNT = 900;

function buildGateHaloGeometry() {
  const positions = new Float32Array(GATE_HALO_COUNT * 3);
  const seeds = new Float32Array(GATE_HALO_COUNT);
  let seed = 20260821;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < GATE_HALO_COUNT; i++) {
    const r = 1.05 + Math.pow(rand(), 0.7) * 0.6;
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

const GATE_HALO_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uReveal;
  varying float vSeed;
  varying float vPolarity;
  varying float vFade;
  void main() {
    vSeed = aSeed;
    vPolarity = position.y;
    vec3 p = position + normalize(position) * sin(uTime * 0.5 + aSeed * 40.0) * 0.035;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (0.9 + aSeed * 1.3) * uReveal * (70.0 / max(0.5, -mv.z));
    vFade = clamp(size / 14.0, 0.0, 1.0); // 尺寸被夾住時同步降低不透明度，避免大量點重疊後過曝
    gl_PointSize = min(size, 14.0);
  }
`;

const GATE_HALO_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uYin;
  uniform vec3 uYang;
  uniform vec3 uSpark;
  varying float vSeed;
  varying float vPolarity;
  varying float vFade;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = pow(1.0 - d * 2.0, 3.2);
    float twinkle = 0.5 + 0.5 * sin(uTime * 2.1 + vSeed * 32.0);
    vec3 col = mix(uYin, uYang, step(0.0, vPolarity));
    col = mix(col, uSpark, twinkle * 0.4);
    float alpha = glow * uReveal * vFade * (0.22 + twinkle * 0.28);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

function buildFilamentGeometry() {
  const points: THREE.Vector3[] = [];
  const segments = 160;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = -1 + t * 2;
    const swell = Math.sin(Math.PI * t);
    const angle = t * Math.PI * 14;
    points.push(new THREE.Vector3(x, Math.cos(angle) * 0.1 * swell, Math.sin(angle) * 0.1 * swell));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, segments, 0.016, 8, false);
}

const CELL_FRAMES: Record<number, {
  membrane: number;
  nuclei: number;
  filament: number;
  source: number;
  particles: number;
  membraneFill: number;
  nucleusFill: number;
  nucleusSpread: number;
  filamentFill: number;
  sourceFill: number;
  particleFill: number;
  filamentTwist: number;
}> = {
  11: { membrane: 1, nuclei: 0, filament: 0, source: 0, particles: 0.38, membraneFill: 1.16, nucleusFill: 0.04, nucleusSpread: 1, filamentFill: 0.2, sourceFill: 0.03, particleFill: 0.5, filamentTwist: 0 },
  12: { membrane: 0.42, nuclei: 0.9, filament: 0.24, source: 0, particles: 0.1, membraneFill: 0.9, nucleusFill: 0.22, nucleusSpread: 1.45, filamentFill: 0.85, sourceFill: 0.05, particleFill: 0.14, filamentTwist: 0 },
  13: { membrane: 1, nuclei: 0.12, filament: 0, source: 0, particles: 0.18, membraneFill: 1.38, nucleusFill: 0.06, nucleusSpread: 3.2, filamentFill: 0.2, sourceFill: 0.03, particleFill: 0.24, filamentTwist: 0 },
  14: { membrane: 0.04, nuclei: 1, filament: 0.18, source: 0, particles: 0.28, membraneFill: 0.3, nucleusFill: 0.42, nucleusSpread: 1.62, filamentFill: 0.55, sourceFill: 0.04, particleFill: 0.32, filamentTwist: 0 },
  15: { membrane: 0, nuclei: 0.05, filament: 2.6, source: 0.42, particles: 0.9, membraneFill: 0.2, nucleusFill: 0.1, nucleusSpread: 5.4, filamentFill: 1.05, sourceFill: 0.11, particleFill: 0.72, filamentTwist: 1 },
  16: { membrane: 0, nuclei: 0, filament: 0.06, source: 1, particles: 1, membraneFill: 0.1, nucleusFill: 0.04, nucleusSpread: 1, filamentFill: 0.3, sourceFill: 0.18, particleFill: 0.62, filamentTwist: 0 },
};

export default function TaijiCellularCore({
  journeyRef,
  warmRef,
  yinColor,
  yangColor,
  sparkColor,
  coreTexture,
  coreBumpMap,
}: {
  journeyRef: TaijiJourneyRef;
  warmRef: WarmRef;
  yinColor: string;
  yangColor: string;
  sparkColor: string;
  coreTexture?: THREE.Texture | null;
  coreBumpMap?: THREE.Texture | null;
}) {
  const [armed, setArmed] = useState(false);
  const rootRef = useRef<THREE.Group>(null);
  const membraneRef = useRef<THREE.Mesh>(null);
  const nucleusYinRef = useRef<THREE.Mesh>(null);
  const nucleusYangRef = useRef<THREE.Mesh>(null);
  const filamentRef = useRef<THREE.Mesh>(null);
  const sourceRef = useRef<THREE.Mesh>(null);
  const gateHaloRef = useRef<THREE.Points>(null);
  const gateCoreRef = useRef<THREE.Mesh>(null);
  /* coreTexture/coreBumpMap 會隨外層 LOD 從 2048 升到 4096（見 TaijiSystem 的貼圖升級效果）。
     用 ref 讀初始值、不放進下面 useMemo 的依賴陣列——避免貼圖一升級就把整組深層材質全部重建，
     那等於在使用者可能正深潛互動時重新編譯著色器，牴觸鐵律。升級改用下面的 useEffect 就地套用。 */
  const coreTextureRef = useRef(coreTexture);
  const coreBumpMapRef = useRef(coreBumpMap);
  coreTextureRef.current = coreTexture;
  coreBumpMapRef.current = coreBumpMap;

  const built = useMemo(() => {
    if (!armed) return null;
    /* 2026-08-22 效能調整：切換物鏡當下(多層同時疊加淡入淡出)會是全程最吃 GPU 的瞬間。
       這裡調的是「球面幾何的多邊形密度」，跟畫布內部渲染解析度(DPR/貼圖/陰影)是兩件事——
       那些只准往上、完全沒動；圓滑漸層球體在 64 段跟 128 段肉眼看不出差別，
       但三角形數少 4 倍，同時疊 3~5 層時明顯減輕負擔。 */
    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    const filamentGeometry = buildFilamentGeometry();

    const baseUniforms = () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uYin: { value: new THREE.Color(yinColor) },
      uYang: { value: new THREE.Color(yangColor) },
      uSpark: { value: new THREE.Color(sparkColor) },
    });

    const membraneMaterial = new THREE.ShaderMaterial({
      vertexShader: MEMBRANE_VERTEX,
      fragmentShader: MEMBRANE_FRAGMENT,
      uniforms: baseUniforms(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });

    const makeNucleusMaterial = (spin: number) =>
      new THREE.ShaderMaterial({
        vertexShader: MEMBRANE_VERTEX,
        fragmentShader: NUCLEUS_FRAGMENT,
        uniforms: { ...baseUniforms(), uSpin: { value: spin } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
      });

    const filamentMaterial = new THREE.ShaderMaterial({
      vertexShader: FILAMENT_VERTEX,
      fragmentShader: FILAMENT_FRAGMENT,
      uniforms: baseUniforms(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const sourceMaterial = new THREE.ShaderMaterial({
      vertexShader: MEMBRANE_VERTEX,
      fragmentShader: SOURCE_FRAGMENT,
      uniforms: baseUniforms(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });

    /* 無極之門：不是幾何框架，是一團粒子與光子細胞——用點雲聚在門後迷你太極周圍 */
    const gateHaloGeometry = buildGateHaloGeometry();
    const gateHaloMaterial = new THREE.ShaderMaterial({
      vertexShader: GATE_HALO_VERTEX,
      fragmentShader: GATE_HALO_FRAGMENT,
      uniforms: baseUniforms(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    /* 門後的迷你太極：直接讀取卡片最外層第 1 層的同一份貼圖，不是另外畫一顆——
       真正的碎形自我指涉，只用真實 PBR 材質（跟主球同一家族），不寫新著色器。 */
    const gateCoreMaterial = new THREE.MeshPhysicalMaterial({
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

    return {
      sphereGeometry,
      filamentGeometry,
      gateHaloGeometry,
      membraneMaterial,
      nucleusYinMaterial: makeNucleusMaterial(1),
      nucleusYangMaterial: makeNucleusMaterial(-1),
      filamentMaterial,
      sourceMaterial,
      gateHaloMaterial,
      gateCoreMaterial,
    };
  }, [armed, yinColor, yangColor, sparkColor]);

  useEffect(
    () => () => {
      built?.sphereGeometry.dispose();
      built?.filamentGeometry.dispose();
      built?.gateHaloGeometry.dispose();
      built?.membraneMaterial.dispose();
      built?.nucleusYinMaterial.dispose();
      built?.nucleusYangMaterial.dispose();
      built?.filamentMaterial.dispose();
      built?.sourceMaterial.dispose();
      built?.gateHaloMaterial.dispose();
      built?.gateCoreMaterial.dispose();
    },
    [built],
  );

  useEffect(() => {
    if (!built) return;
    // 貼圖 LOD 升級（2048→4096）就地套用到已存在的材質，不重建、不重編著色器
    built.gateCoreMaterial.map = coreTexture ?? null;
    built.gateCoreMaterial.bumpMap = coreBumpMap ?? null;
    built.gateCoreMaterial.needsUpdate = true;
  }, [built, coreTexture, coreBumpMap]);

  useFrame((state, delta) => {
    const depth = readJourneyDepth(journeyRef);
    const presence = bandWeight(
      depth,
      TAIJI_BANDS.cellular.enter,
      TAIJI_BANDS.cellular.full,
      TAIJI_BANDS.cellular.exitStart,
      TAIJI_BANDS.cellular.exitEnd,
    );
    const warming = warmRef.current.warming;
    if (!armed || !built) {
      if (warming || presence > 0.002 || journeyRef.current.target >= TAIJI_BANDS.cellular.enter) setArmed(true);
      return;
    }

    const cut = sampleNumericKeyframes(depth, CELL_FRAMES);
    const root = rootRef.current;
    const showLayer = presence > 0.002;
    if (root) {
      root.visible = showLayer || warming;
      root.scale.setScalar(showLayer ? 1 : 0.0001);
    }
    if (!showLayer) return;

    const t = state.clock.elapsedTime;
    const camera = state.camera as THREE.PerspectiveCamera;
    const halfHeight = camera.position.length() * Math.tan((camera.fov * Math.PI) / 360);
    const spin = Math.min(delta, 1 / 45) * 0.12;

    const membrane = membraneRef.current;
    if (membrane) {
      const breathe = 1 + Math.sin(t * 0.4) * 0.01;
      membrane.scale.setScalar(halfHeight * (cut.membraneFill ?? 0.95) * breathe);
      membrane.rotation.y += spin * 0.6;
    }

    const nucleusRadius = halfHeight * (cut.nucleusFill ?? 0.16);
    const nucleusCenterX = nucleusRadius * (cut.nucleusSpread ?? 1.5);
    const yin = nucleusYinRef.current;
    const yang = nucleusYangRef.current;
    if (yin) {
      yin.position.set(-nucleusCenterX, 0, 0);
      yin.scale.setScalar(nucleusRadius);
      yin.rotation.y += spin;
    }
    if (yang) {
      yang.position.set(nucleusCenterX, 0, 0);
      yang.scale.setScalar(nucleusRadius);
      yang.rotation.y -= spin;
    }

    const filament = filamentRef.current;
    if (filament) {
      const filamentFill = cut.filamentFill ?? 1;
      filament.scale.set(halfHeight * filamentFill, halfHeight * 0.42 * filamentFill, halfHeight * 0.42 * filamentFill);
      filament.rotation.z = Math.sin(t * 0.22) * 0.28 * (cut.filamentTwist ?? 0);
    }

    const source = sourceRef.current;
    if (source) {
      source.scale.setScalar(halfHeight * (cut.sourceFill ?? 0.02));
    }

    const halo = gateHaloRef.current;
    if (halo) {
      const haloRadius = halfHeight * (cut.particleFill ?? 0.04);
      halo.scale.setScalar(haloRadius);
      halo.position.set(0, 0, -halfHeight * 0.22);
      halo.rotation.y += spin * 0.4;
    }
    const gateCore = gateCoreRef.current;
    if (gateCore) {
      gateCore.scale.setScalar(0.0001);
      gateCore.position.set(0, 0, -halfHeight * 0.22);
    }

    const membraneUniforms = built.membraneMaterial.uniforms;
    membraneUniforms.uTime.value = t;
    membraneUniforms.uReveal.value = (cut.membrane ?? 0) * presence;

    const yinUniforms = built.nucleusYinMaterial.uniforms;
    const yangUniforms = built.nucleusYangMaterial.uniforms;
    yinUniforms.uTime.value = t;
    yangUniforms.uTime.value = t;
    yinUniforms.uReveal.value = (cut.nuclei ?? 0) * presence;
    yangUniforms.uReveal.value = (cut.nuclei ?? 0) * presence;

    built.filamentMaterial.uniforms.uTime.value = t;
    built.filamentMaterial.uniforms.uReveal.value = (cut.filament ?? 0) * presence;

    built.sourceMaterial.uniforms.uTime.value = t;
    built.sourceMaterial.uniforms.uReveal.value = (cut.source ?? 0) * presence;

    built.gateHaloMaterial.uniforms.uTime.value = t;
    built.gateHaloMaterial.uniforms.uReveal.value = (cut.particles ?? 0) * presence;
    built.gateCoreMaterial.opacity = 0;
  });

  if (!built) return null;

  return (
    <group ref={rootRef} visible={false} renderOrder={7}>
      <mesh ref={membraneRef} geometry={built.sphereGeometry} material={built.membraneMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={nucleusYinRef} geometry={built.sphereGeometry} material={built.nucleusYinMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={nucleusYangRef} geometry={built.sphereGeometry} material={built.nucleusYangMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={filamentRef} geometry={built.filamentGeometry} material={built.filamentMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={sourceRef} geometry={built.sphereGeometry} material={built.sourceMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <points ref={gateHaloRef} geometry={built.gateHaloGeometry} material={built.gateHaloMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={gateCoreRef} geometry={built.sphereGeometry} material={built.gateCoreMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
    </group>
  );
}
