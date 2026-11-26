'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { bandWeight, smoothstep } from '@/lib/taiji-journey-depth';
import { createBandFollower, followBandPresence } from '@/lib/taiji-band-follower';

/* 【百萬級｜2026-11-26 第五輪】深層背霧（煙墨→墨靛→墨）
   3D 立體三層：後景暗、霧；中景粒子主體最清楚；前景點綴。原本深層（第 5～24 段）只有加法／濾色粒子，
   加法只能變亮，畫面裡沒有比頁面底色更暗的階，暗部只剩 7～9 階（skill 56 要求 ≥40）。
   這層是放在所有粒子後面的螢幕空間墨暈。第七輪（業主 2026-11-26 10:28「調低墨霧」）：原本中心最深，正好壓在粒子主體上，
   合成亮度掉 15～40%；改成只在主體外圍的一圈環形墨暈（後景暗、中景主體最亮），暗部色階由這圈漸層提供，主體下方維持頁底。
   用一般透明混合（只會變暗，不會變白），固定種子抖色 ±0.6 色階防色帶；不加燈、不加 transmission／MSAA，只有一個全螢幕四邊形。
   出現量跟深層同一條連續深度（3.9 進場、24.6～25 退場），經 0.018／幀限速跟隨；第 1～4 段完全不畫。 */
const HAZE_ENTER = 3.9;
const HAZE_FULL = 4.95;
const HAZE_EXIT_START = 24.6;
const HAZE_EXIT_END = 25;
const HAZE_MAX_OPACITY = 0.94; // 第七輪：只在外環出現，環心可以更深（0.86→0.94），中心主體完全不被壓暗；0.94 時最暗約 (3,3,5)，不到死黑
// 第六輪：深淵段（21～24）背霧改回全量（1 倍），第 22～24 段暗部 7～10 階→41～43 階；保留這個係數與連續深度混合，之後要調降不必改結構
const HAZE_ABYSS_SCALE = 1;

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
  uniform vec3 uIndigoEdge;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 center = uResolution * 0.5;
    float radius = 0.5 * min(uResolution.x, uResolution.y);
    float r = length(gl_FragCoord.xy - center) / radius;
    // 第七輪：墨霧改成「主體外圍的環形墨暈」——中心（粒子主體所在）完全不蓋，r 0.50→0.84 漸深、0.90→1.04 再淡回頁底，畫布邊緣仍是頁底色（不出方框）
    float cover = pow(smoothstep(0.40, 0.76, r) * (1.0 - smoothstep(0.90, 1.04, r)), 0.8);
    // 內側淡處偏深靛（靠頁底的那一段也分得出色階），濃處轉墨；外側直接墨色淡出，不在畫布邊緣留一圈紫線
    vec3 edge = mix(uIndigoEdge, uInk, smoothstep(0.80, 0.92, r));
    vec3 col = mix(edge, uInk, clamp(cover / 0.5, 0.0, 1.0));
    float alpha = uOpacity * cover;
    // 固定種子抖色：淡處 ±0.6 色階防色帶；環心最暗處加到約 ±2 色階，讓最深的幾階也分得開（墨色本身 ≥3 階，抖完不到死黑）
    float n = (hash(floor(gl_FragCoord.xy)) - 0.5) * ((1.2 + 3.2 * cover * cover * cover * cover) / 255.0);
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
        // 墨（環心）輸出色階 (3,3,8)：比頁底深 30 階以上又不到死黑；外緣淡處的深靛直接以輸出色階給（此著色器不做色彩空間轉換），只在覆蓋率 <0.5 時出現、實際疊上去約為頁底偏靛 3～8 階
        uInk: { value: new THREE.Vector3(3 / 255, 3 / 255, 8 / 255) },
        uIndigoEdge: { value: new THREE.Vector3(12 / 255, 14 / 255, 150 / 255) },
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
