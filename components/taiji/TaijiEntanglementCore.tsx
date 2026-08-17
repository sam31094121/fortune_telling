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
import { MAG_DECADES, smoothstep, type MagRef, type WarmRef } from './taijiMagnifier';

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

export default function TaijiEntanglementCore({
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
    const d = magRef.current.current * MAG_DECADES;
    const warming = warmRef.current.warming;
    if (!armed || !built) {
      // 暖機視窗一併把這一層的幾何與著色器準備好（見 TaijiSystem 的暖機說明）
      if (warming || d > DEEP_IN - 0.5 || magRef.current.target * MAG_DECADES > DEEP_IN - 0.5) setArmed(true);
      return;
    }

    const root = rootRef.current;
    const reveal = smoothstep(DEEP_IN, DEEP_FULL, d);
    const showDeep = reveal > 0.002;
    if (root) {
      root.visible = showDeep || warming;
      root.scale.setScalar(showDeep ? 1 : 0.0001);
    }
    if (!showDeep) return;

    const t = state.clock.elapsedTime;

    /* 連續放大：用「一顆波包佔畫面多少」來定尺寸，鏡頭不必再往前推，
       而是物體本身持續變大——這就是顯微鏡換上更高倍物鏡的手感。 */
    const camera = state.camera as THREE.PerspectiveCamera;
    const halfHeight = camera.position.length() * Math.tan((camera.fov * Math.PI) / 360);
    /* 取景校準：×1,000,000 時兩顆完整入鏡（各佔約 0.37 個半高），
       ×10,000,000 時單顆撐滿畫面但不超過 0.95——超過就會鑽進球體內部，
       變成一片沒有輪廓的糊光（實測過，那樣看不出是什麼）。 */
    const fill = Math.min(0.95, 0.16 * Math.pow(10, Math.max(0, d - 5.2) * 0.46));
    const radius = halfHeight * fill;
    const centerX = radius * 1.58; // 兩顆之間要留得下那條糾纏通道，太近就看不見了
    /* ×3,000,000 之後把鏡頭「對準其中一顆」：另一顆退到畫面邊緣，
       但通道還連著——你正對著一顆光子的內部，它的另一半仍在遠處同步著。 */
    const focus = smoothstep(6.0, 7.0, d);
    const shift = -centerX * focus;

    /* 觀測事件：每 5.2 秒一次，隨機決定哪一顆亮——但永遠一亮一暗（反相關） */
    const cycle = t % 5.2;
    const cycleIndex = Math.floor(t / 5.2);
    const outcome = Math.sin(cycleIndex * 127.1) > 0 ? 1 : -1;
    const flash = Math.exp(-cycle * 3.4) * smoothstep(5.6, 6.4, d);

    const taiji = smoothstep(6.2, 7.0, d); // 最深處，波包內部浮現太極
    /* 自轉在最深處幾乎停下來：太極浮現時要正對鏡頭讓人看清楚，
       轉太快只會看到圖案一直轉走。 */
    const spinRate = Math.min(delta, 1 / 45) * 0.22 * (1 - taiji * 0.88);

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
      yang.rotation.y -= spinRate; // 反向自轉：一顆向上、一顆向下
    }
    [bridgeARef.current, bridgeBRef.current].forEach((bridge, index) => {
      if (!bridge) return;
      bridge.position.set(shift, 0, 0);
      bridge.scale.set(centerX, radius * 0.9, radius * 0.9);
      bridge.rotation.x = index === 0 ? 0 : Math.PI; // 兩股相差半個週期＝雙螺旋
    });

    const yinUniforms = built.yinMaterial.uniforms;
    const yangUniforms = built.yangMaterial.uniforms;
    yinUniforms.uTime.value = t;
    yangUniforms.uTime.value = t;
    yinUniforms.uReveal.value = reveal;
    yangUniforms.uReveal.value = reveal;
    yinUniforms.uTaiji.value = taiji;
    yangUniforms.uTaiji.value = taiji;
    yinUniforms.uFlash.value = flash * outcome;
    yangUniforms.uFlash.value = flash * -outcome;
    built.bridgeMaterial.uniforms.uTime.value = t;
    built.bridgeMaterial.uniforms.uReveal.value = reveal;
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
