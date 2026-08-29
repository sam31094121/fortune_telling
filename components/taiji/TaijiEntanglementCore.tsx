'use client';

/**
 * 【糾纏內景層｜×1,000,000 → ×10,000,000】（2026-08-17 依業主指示再深入）
 *
 * ×100,000 看到的是「一整片成對的粒子」。再鑽進去，鎖定其中一對：
 *
 *  ×1,000,000  波包內景 —— 粒子不再是一個點，是一團駐波。
 *              表面的環紋是駐波節線，螺旋紋的行進方向就是自旋方向：
 *              左邊那顆順著轉，右邊那顆一定逆著轉，眼睛看得出來。
 *  ×10,000,000 糾纏本身 —— 兩顆之間那條雙螺旋通道是相位共用的實體，
 *              光訊號在兩端來回；每隔幾秒一次「觀測」：一顆亮起的同時，
 *              對面那顆必定同時暗下去（反相關，永遠不會同時亮）。
 *              鏡頭最後停在其中一顆的內部——而波包裡浮現的，還是太極。
 *              其大無外，其小無內：放到一千萬倍，看到的仍然是同一個東西。
 *
 * 太極核心一行不動：這一層只在 ×100,000 之後才存在，之前完全不掛載。
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

/* 純視覺層：兩顆 128×128 的球加上管狀通道，逐面射線檢測太貴，直接退出檢測名單 */
const NO_RAYCAST = () => null;

/** 這一層開始接手的數量級（×50,000 左右先預備，×1,000,000 完全成形） */
const DEEP_IN = 4.7;
const DEEP_FULL = 5.9;

/* 太極遮罩：與 CPU 端 taijiPolarity 同一套規則的 GLSL 版本。
   波包內部浮現的圖案，就是它自己。 */
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

const PACKET_VERTEX = /* glsl */ `
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

const PACKET_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSpin;      // +1 / -1：自旋方向，兩顆永遠相反
  uniform float uReveal;
  uniform float uTaiji;     // 最深處：波包內浮現太極
  uniform float uFlash;     // 觀測閃爍（一顆 +、對面 −，永遠反相關）
  uniform vec3 uColor;
  uniform vec3 uYin;
  uniform vec3 uYang;
  uniform vec3 uSpark;
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vView;
  ${TAIJI_GLSL}

  void main() {
    vec3 n = normalize(vPos);
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float lon = atan(n.z, n.x);

    // 駐波：緯度方向的節線。取高次方 → 細而亮的線，不是糊成一團的斑塊
    float standing = pow(abs(sin(lat * 13.0 - uTime * 1.35 * uSpin)), 7.0);
    // 自旋：螺旋紋沿著一個方向行進，兩顆的方向相反——自旋看得見
    float spiral = pow(0.5 + 0.5 * sin(lon * 5.0 + lat * 9.0 - uTime * 2.1 * uSpin), 4.0);
    // 邊緣輝光：波包沒有硬殼，只有機率密度的邊界
    float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vView))), 2.4);

    vec3 col = uColor;
    float body = 0.075 + standing * 0.34 + spiral * 0.3 + fres * 0.52;

    /* 最深處的答案：波包內部浮現的，還是太極。
       只染色是看不出來的（節線太強會把它洗掉）——所以直接用「亮度」畫：
       陽的一半亮起來、陰的一半沉下去，S 弧與魚眼的邊界燒成一條金線。 */
    float taijiMix = uTaiji;
    if (taijiMix > 0.001) {
      float f = taijiField(n.xy);
      float half01 = f * 0.5 + 0.5;
      float edge = 1.0 - smoothstep(0.0, 0.2, abs(f));
      vec3 inner = mix(uYin, uYang, half01);
      inner = mix(inner, uSpark, edge * 0.75);
      col = mix(col, inner, taijiMix * 0.92);
      float taijiBody = 0.05 + half01 * 0.52 + edge * 0.85 + standing * 0.12 + fres * 0.3;
      body = mix(body, taijiBody, taijiMix);
    }
    col = mix(col, uSpark, spiral * 0.22 * (1.0 - taijiMix) + max(uFlash, 0.0) * 0.5);
    body *= 1.0 + uFlash * 0.85;
    float alpha = clamp(body, 0.0, 1.6) * uReveal;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const BRIDGE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BRIDGE_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uYin;
  uniform vec3 uYang;
  uniform vec3 uSpark;
  varying vec2 vUv;

  void main() {
    // 通道本體：兩端亮、中段淡，像相位在兩顆之間被拉成一條線
    float body = 0.16 + 0.34 * pow(abs(vUv.x - 0.5) * 2.0, 2.0);
    // 兩顆訊號光子對向奔跑：糾纏不是單向傳話，是同一件事的兩端
    float go = fract(uTime * 0.22);
    float back = 1.0 - go;
    float signal = smoothstep(0.055, 0.0, abs(vUv.x - go)) + smoothstep(0.055, 0.0, abs(vUv.x - back));
    vec3 col = mix(uYin, uYang, vUv.x);
    col = mix(col, uSpark, signal);
    float alpha = (body * 0.72 + signal * 1.1) * uReveal;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

function buildBridgeGeometry() {
  /* 雙螺旋通道：沿 x 從 −1 走到 +1，中段最寬、兩端收束到粒子上 */
  const points: THREE.Vector3[] = [];
  const segments = 220;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = -1 + t * 2;
    const swell = Math.sin(Math.PI * t);
    const angle = t * Math.PI * 9;
    points.push(new THREE.Vector3(x, Math.cos(angle) * 0.17 * swell, Math.sin(angle) * 0.17 * swell));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, segments, 0.028, 8, false);
}

const ENTANGLE_FRAMES: Record<number, {
  yin: number;
  yang: number;
  bridge: number;
  fill: number;
  spread: number;
  focus: number;
  spin: number;
  flash: number;
  twist: number;
}> = {
  17: { yin: 1, yang: 1, bridge: 0.05, fill: 0.23, spread: 1.9, focus: 0, spin: 0.7, flash: 0.15, twist: 0 },
  18: { yin: 0.34, yang: 0.34, bridge: 2.8, fill: 0.16, spread: 3.7, focus: 0, spin: 1.6, flash: 0.35, twist: 1 },
  19: { yin: 0.08, yang: 1, bridge: 0.18, fill: 0.84, spread: 1.08, focus: 1, spin: 0.2, flash: 0.8, twist: 0 },
  20: { yin: 1.35, yang: 1.35, bridge: 1.8, fill: 0.14, spread: 1.75, focus: 0, spin: 3.2, flash: 2.2, twist: 0 },
};

export default function TaijiEntanglementCore({
  journeyRef,
  warmRef,
  yinColor,
  yangColor,
  sparkColor,
}: {
  journeyRef: TaijiJourneyRef;
  warmRef: WarmRef;
  yinColor: string;
  yangColor: string;
  sparkColor: string;
}) {
  const [armed, setArmed] = useState(false);
  const rootRef = useRef<THREE.Group>(null);
  const yinRef = useRef<THREE.Mesh>(null);
  const yangRef = useRef<THREE.Mesh>(null);
  const bridgeARef = useRef<THREE.Mesh>(null);
  const bridgeBRef = useRef<THREE.Mesh>(null);

  const built = useMemo(() => {
    if (!armed) return null;
    /* 高解析度球面（只准往上）：這一層的球面會佔滿整個畫面，段數不夠會看到多邊形稜線 */
    const packetGeometry = new THREE.SphereGeometry(1, 128, 128);
    const bridgeGeometry = buildBridgeGeometry();

    const makePacketMaterial = (color: string, spin: number) =>
      new THREE.ShaderMaterial({
        vertexShader: PACKET_VERTEX,
        fragmentShader: PACKET_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uSpin: { value: spin },
          uReveal: { value: 0 },
          uTaiji: { value: 0 },
          uFlash: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uYin: { value: new THREE.Color(yinColor) },
          uYang: { value: new THREE.Color(yangColor) },
          uSpark: { value: new THREE.Color(sparkColor) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        /* 只畫正面：加法混合下背面會疊上來，把太極圖案和節線洗成一片糊 */
        side: THREE.FrontSide,
      });

    const bridgeMaterial = new THREE.ShaderMaterial({
      vertexShader: BRIDGE_VERTEX,
      fragmentShader: BRIDGE_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uYin: { value: new THREE.Color(yinColor) },
        uYang: { value: new THREE.Color(yangColor) },
        uSpark: { value: new THREE.Color(sparkColor) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return {
      packetGeometry,
      bridgeGeometry,
      yinMaterial: makePacketMaterial(yinColor, 1),
      yangMaterial: makePacketMaterial(yangColor, -1),
      bridgeMaterial,
    };
  }, [armed, yinColor, yangColor, sparkColor]);

  useEffect(
    () => () => {
      built?.packetGeometry.dispose();
      built?.bridgeGeometry.dispose();
      built?.yinMaterial.dispose();
      built?.yangMaterial.dispose();
      built?.bridgeMaterial.dispose();
    },
    [built],
  );

  useFrame((state, delta) => {
    const depth = readJourneyDepth(journeyRef);
    const warming = warmRef.current.warming;
    const presence = bandWeight(
      depth,
      TAIJI_BANDS.entanglement.enter,
      TAIJI_BANDS.entanglement.full,
      TAIJI_BANDS.entanglement.exitStart,
      TAIJI_BANDS.entanglement.exitEnd,
    );
    if (!armed || !built) {
      if (warming || presence > 0.002 || journeyRef.current.target >= TAIJI_BANDS.entanglement.enter) setArmed(true);
      return;
    }

    const cut = sampleNumericKeyframes(depth, ENTANGLE_FRAMES);
    const root = rootRef.current;
    const reveal = presence;
    const showDeep = reveal > 0.002;
    if (root) {
      root.visible = showDeep || warming;
      root.scale.setScalar(showDeep ? 1 : 0.0001);
    }
    if (!showDeep) return;

    const t = state.clock.elapsedTime;
    const camera = state.camera as THREE.PerspectiveCamera;
    const halfHeight = camera.position.length() * Math.tan((camera.fov * Math.PI) / 360);
    const fill = cut.fill ?? 0.23;
    const radius = halfHeight * fill;
    const centerX = radius * (cut.spread ?? 1.9);
    const focus = cut.focus ?? 0;
    const shift = -centerX * focus;

    const cycle = t % 5.2;
    const cycleIndex = Math.floor(t / 5.2);
    const outcome = Math.sin(cycleIndex * 127.1) > 0 ? 1 : -1;
    const flash = Math.exp(-cycle * 3.4) * (cut.flash ?? 0) * presence;
    const spinRate = Math.min(delta, 1 / 45) * 0.22 * (cut.spin ?? 1);

    const yin = yinRef.current;
    const yang = yangRef.current;
    if (yin) {
      yin.position.set(-centerX + shift, 0, 0);
      yin.scale.setScalar(radius);
      yin.rotation.y += spinRate;
    }
    if (yang) {
      yang.position.set(centerX + shift, 0, 0);
      yang.scale.setScalar(radius);
      yang.rotation.y -= spinRate;
    }
    [bridgeARef.current, bridgeBRef.current].forEach((bridge, index) => {
      if (!bridge) return;
      bridge.position.set(shift, 0, 0);
      bridge.scale.set(centerX, radius * 0.9, radius * 0.9);
      bridge.rotation.x = index === 0 ? 0 : Math.PI;
      bridge.rotation.z = Math.sin(t * 0.18) * 0.45 * (cut.twist ?? 0);
    });

    const yinUniforms = built.yinMaterial.uniforms;
    const yangUniforms = built.yangMaterial.uniforms;
    yinUniforms.uTime.value = t;
    yangUniforms.uTime.value = t;
    yinUniforms.uReveal.value = reveal * (cut.yin ?? 1);
    yangUniforms.uReveal.value = reveal * (cut.yang ?? 1);
    yinUniforms.uTaiji.value = 0;
    yangUniforms.uTaiji.value = 0;
    yinUniforms.uFlash.value = flash * outcome;
    yangUniforms.uFlash.value = flash * -outcome;
    built.bridgeMaterial.uniforms.uTime.value = t;
    built.bridgeMaterial.uniforms.uReveal.value = reveal * (cut.bridge ?? 1);
  });

  if (!built) return null;

  return (
    <group ref={rootRef} visible={false} renderOrder={6}>
      <mesh ref={yinRef} geometry={built.packetGeometry} material={built.yinMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={yangRef} geometry={built.packetGeometry} material={built.yangMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={bridgeARef} geometry={built.bridgeGeometry} material={built.bridgeMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={bridgeBRef} geometry={built.bridgeGeometry} material={built.bridgeMaterial} frustumCulled={false} raycast={NO_RAYCAST} />
    </group>
  );
}
