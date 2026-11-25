'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { bandWeight, smoothstep } from '@/lib/taiji-journey-depth';
import { createBandFollower, followBandPresence } from '@/lib/taiji-band-follower';

/* 【百萬級｜2026-11-26 第五輪】深層背霧（煙墨→墨靛→墨）
   3D 立體三層：後景暗、霧；中景粒子主體最清楚；前景點綴。原本深層（第 5～24 段）只有加法／濾色粒子，
   加法只能變亮，畫面裡沒有比頁面底色更暗的階，暗部只剩 7～9 階（skill 56 要求 ≥40）。
   這層是放在所有粒子後面的螢幕空間圓形墨霧：外緣「煙墨」與頁底幾乎同色、往內經「墨靛」到中心「墨」，
   用一般透明混合（只會變暗，不會變白），固定種子抖色 ±0.6 色階防色帶；不加燈、不加 transmission／MSAA，只有一個全螢幕四邊形。
   出現量跟深層同一條連續深度（3.9 進場、24.6～25 退場），經 0.018／幀限速跟隨；第 1～4 段完全不畫。 */
const HAZE_ENTER = 3.9;
const HAZE_FULL = 4.95;
const HAZE_EXIT_START = 24.6;
const HAZE_EXIT_END = 25;
const HAZE_MAX_OPACITY = 0.76;
// 深淵段（21～24）粒子鋪滿畫面、本身已有黑洞暗階，背霧隨連續深度降到 0.15 倍（實測 0.62 倍時第 23 段粒子集亮度降 22.8%，超過 15%），避免把旋臂底下的柔光壓灰
const HAZE_ABYSS_SCALE = 0.15;

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec2 uResolution;
  uniform float uOpacity;
  uniform vec3 uInk;
  uniform vec3 uIndigo;
  uniform vec3 uSmoke;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 center = uResolution * 0.5;
    float radius = 0.5 * min(uResolution.x, uResolution.y);
    float r = length(gl_FragCoord.xy - center) / radius;
    // 三段墨階：0～0.45 墨→墨靛，0.45～1 墨靛→煙墨；覆蓋率外緣平滑收到 0（不畫硬邊圈）
    vec3 col = r < 0.45 ? mix(uInk, uIndigo, smoothstep(0.0, 0.45, r)) : mix(uIndigo, uSmoke, smoothstep(0.45, 1.0, r));
    // 長而平緩的覆蓋率：中心最深、往外一路淡出，不形成「黑洞圓盤」
    float cover = pow(1.0 - smoothstep(0.0, 1.18, r), 1.6);
    float alpha = uOpacity * cover;
    // 固定種子抖色（±0.6 色階），長漸層不出色帶
    float n = (hash(floor(gl_FragCoord.xy)) - 0.5) * (1.2 / 255.0);
    gl_FragColor = vec4(col + n, alpha);
  }
`;

type JourneyRef = { current: { current: number; target: number } };

export default function TaijiInkHaze({ journeyRef }: { journeyRef: JourneyRef }) {
  const { size, gl } = useThree();
  const followerRef = useRef(createBandFollower());
  const meshRef = useRef<THREE.Mesh>(null);
  const built = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uOpacity: { value: 0 },
        // 墨 #0d1020 → 墨靛 #161b33 → 煙墨 #26232f（每階相差 2～4 色階以上，色相維持冷墨靛，不偏紫不偏綠）
        uInk: { value: new THREE.Color('#0d1020').convertSRGBToLinear() },
        uIndigo: { value: new THREE.Color('#161b33').convertSRGBToLinear() },
        uSmoke: { value: new THREE.Color('#26232f').convertSRGBToLinear() },
      },
    });
    return { geometry, material };
  }, []);

  useFrame((_, delta) => {
    const journey = journeyRef.current;
    const depth = journey.current;
    // 進退場與深淵段降量都乘進目標，再整體經 0.018／幀限速跟隨（skill 56 第 3、8 條：不透明度每幀 ≤0.02）
    const abyssScale = 1 - (1 - HAZE_ABYSS_SCALE) * smoothstep(20.15, 21.15, depth);
    const target = bandWeight(depth, HAZE_ENTER, HAZE_FULL, HAZE_EXIT_START, HAZE_EXIT_END) * abyssScale;
    const presence = followBandPresence(followerRef.current, target, depth, journey.target, delta);
    const dpr = gl.getPixelRatio();
    built.material.uniforms.uResolution.value.set(size.width * dpr, size.height * dpr);
    built.material.uniforms.uOpacity.value = presence * HAZE_MAX_OPACITY;
    if (meshRef.current) meshRef.current.visible = presence > 0.0005;
  });

  return <mesh ref={meshRef} geometry={built.geometry} material={built.material} frustumCulled={false} renderOrder={-100} visible={false} />;
}
