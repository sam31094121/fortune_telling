'use client';

/**
 * 【細胞內景層｜×100,000,000 → ×100,000,000,000】（2026-08-19 依業主指示再深入四級）
 *
 * ×10,000,000（TaijiEntanglementCore 的終點）看到的是：波包內部浮現的還是太極。
 * 這一層接著往裡鑽，把那顆重新浮現的太極當成一層細胞膜，繼續深入：
 *
 *  ×100,000,000     細胞膜   —— 膜面浮出量子泡沫般的顆粒紋理，陰陽仍在膜上分域。
 *  ×1,000,000,000   核質場   —— 穿膜而入，內部浮現一組更小的糾纏粒子對，
 *                              每一顆自己就是一顆縮小的太極——太極生太極，自相似遞迴。
 *  ×10,000,000,000  共振絲   —— 連接那對更小粒子的相位絲線本身也在振動糾纏。
 *  ×100,000,000,000 太極源點 —— 一切收斂成同時是陰陽的奇點光源，不再可分：
 *                              其大無外，其小無內，在此完全閉合、呼應回第一層的太極本體。
 *
 * 銜接規則：淡入門檻刻意早於 TaijiEntanglementCore 在 d=7 完全定格（見 MEMBRANE_IN），
 * 兩層有意重疊淡入淡出，畫面才會像剪接一樣順接，不是硬切。
 * 太極核心一行不動：這一層只在 ×10,000,000 前後才存在，之前完全不掛載計算。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAG_DECADES, smoothstep, type MagRef, type WarmRef } from './taijiMagnifier';

const NO_RAYCAST = () => null;

/* 四段的絕對數量級門檻——與 TaijiEntanglementCore 在 d=7 的收尾故意重疊 0.6~0.8 個數量級，
   讓細胞膜在「波包內浮現太極」還完全可見時就已經開始淡入。 */
const MEMBRANE_IN = 6.6;
const MEMBRANE_FULL = 7.4;
const NUCLEUS_IN = 7.6;
const NUCLEUS_FULL = 8.4;
const FILAMENT_IN = 8.6;
const FILAMENT_FULL = 9.4;
const SOURCE_IN = 9.6;
const SOURCE_FULL = 10.6;

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

export default function TaijiCellularCore({
  magRef,
  warmRef,
  yinColor,
  yangColor,
  sparkColor,
}: {
  magRef: MagRef;
  warmRef: WarmRef;
  yinColor: string;
  yangColor: string;
  sparkColor: string;
}) {
  const [armed, setArmed] = useState(false);
  const rootRef = useRef<THREE.Group>(null);
  const membraneRef = useRef<THREE.Mesh>(null);
  const nucleusYinRef = useRef<THREE.Mesh>(null);
  const nucleusYangRef = useRef<THREE.Mesh>(null);
  const filamentRef = useRef<THREE.Mesh>(null);
  const sourceRef = useRef<THREE.Mesh>(null);

  const built = useMemo(() => {
    if (!armed) return null;
    /* 高解析度球面（只准往上）：與 TaijiEntanglementCore 同規格，不因為層數增加而降規格 */
    const sphereGeometry = new THREE.SphereGeometry(1, 128, 128);
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

    return {
      sphereGeometry,
      filamentGeometry,
      membraneMaterial,
      nucleusYinMaterial: makeNucleusMaterial(1),
      nucleusYangMaterial: makeNucleusMaterial(-1),
      filamentMaterial,
      sourceMaterial,
    };
  }, [armed, yinColor, yangColor, sparkColor]);

  useEffect(
    () => () => {
      built?.sphereGeometry.dispose();
      built?.filamentGeometry.dispose();
      built?.membraneMaterial.dispose();
      built?.nucleusYinMaterial.dispose();
      built?.nucleusYangMaterial.dispose();
      built?.filamentMaterial.dispose();
      built?.sourceMaterial.dispose();
    },
    [built],
  );

  useFrame((state, delta) => {
    const d = magRef.current.current * MAG_DECADES;
    const warming = warmRef.current.warming;
    if (!armed || !built) {
      if (warming || d > MEMBRANE_IN - 0.5 || magRef.current.target * MAG_DECADES > MEMBRANE_IN - 0.5) setArmed(true);
      return;
    }

    const root = rootRef.current;
    const membraneReveal = smoothstep(MEMBRANE_IN, MEMBRANE_FULL, d);
    const showLayer = membraneReveal > 0.002;
    if (root) {
      root.visible = showLayer || warming;
      root.scale.setScalar(showLayer ? 1 : 0.0001);
    }
    if (!showLayer) return;

    const t = state.clock.elapsedTime;
    const camera = state.camera as THREE.PerspectiveCamera;
    const halfHeight = camera.position.length() * Math.tan((camera.fov * Math.PI) / 360);
    const spin = Math.min(delta, 1 / 45) * 0.12;

    // 膜：延續前一層 fill 封頂(0.95)時的視覺大小，緩慢呼吸，不做鏡頭跳動
    const membrane = membraneRef.current;
    if (membrane) {
      const breathe = 1 + Math.sin(t * 0.4) * 0.01;
      membrane.scale.setScalar(halfHeight * 0.95 * breathe);
      membrane.rotation.y += spin * 0.6;
    }

    // 核質對：穿膜而入，兩顆更小的自相似太極，隨數量級持續放大、彼此拉開
    const nucleusReveal = smoothstep(NUCLEUS_IN, NUCLEUS_FULL, d);
    const nucleusGrow = Math.min(1, Math.max(0, (d - NUCLEUS_IN) / (SOURCE_IN - NUCLEUS_IN)));
    const nucleusRadius = halfHeight * (0.16 + nucleusGrow * 0.5);
    const nucleusCenterX = nucleusRadius * 1.5;
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

    // 共振絲：連接核質對的相位絲線
    const filamentReveal = smoothstep(FILAMENT_IN, FILAMENT_FULL, d);
    const filament = filamentRef.current;
    if (filament) {
      filament.scale.set(nucleusCenterX, nucleusRadius * 0.85, nucleusRadius * 0.85);
    }

    // 太極源點：最終收斂成同時是陰陽的奇點光源
    const sourceReveal = smoothstep(SOURCE_IN, SOURCE_FULL, d);
    const source = sourceRef.current;
    if (source) {
      source.scale.setScalar(halfHeight * (0.02 + sourceReveal * 0.1));
    }

    const membraneUniforms = built.membraneMaterial.uniforms;
    membraneUniforms.uTime.value = t;
    membraneUniforms.uReveal.value = membraneReveal * (1 - sourceReveal * 0.7);

    const yinUniforms = built.nucleusYinMaterial.uniforms;
    const yangUniforms = built.nucleusYangMaterial.uniforms;
    yinUniforms.uTime.value = t;
    yangUniforms.uTime.value = t;
    yinUniforms.uReveal.value = nucleusReveal;
    yangUniforms.uReveal.value = nucleusReveal;

    built.filamentMaterial.uniforms.uTime.value = t;
    built.filamentMaterial.uniforms.uReveal.value = filamentReveal;

    built.sourceMaterial.uniforms.uTime.value = t;
    built.sourceMaterial.uniforms.uReveal.value = sourceReveal;
  });

  if (!built) return null;

  return (
    <group ref={rootRef} visible={false} renderOrder={7}>
      <mesh ref={membraneRef} geometry={built.sphereGeometry} material={built.membraneMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={nucleusYinRef} geometry={built.sphereGeometry} material={built.nucleusYinMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={nucleusYangRef} geometry={built.sphereGeometry} material={built.nucleusYangMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={filamentRef} geometry={built.filamentGeometry} material={built.filamentMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={sourceRef} geometry={built.sphereGeometry} material={built.sourceMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
    </group>
  );
}
