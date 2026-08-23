'use client';

import { Canvas, extend, useFrame, useLoader, type ThreeElement } from '@react-three/fiber';
import { Environment, Sparkles, shaderMaterial } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, Color, RepeatWrapping, SRGBColorSpace, TextureLoader, type Group, type Mesh, type MeshPhysicalMaterial } from 'three';

// 科技感邊緣光（Fresnel rim）：只在球體輪廓邊緣發亮，模擬「能量護罩」的視覺語言，
// 跟寶石本體的寫實材質分開處理——一個 shader 型別，5 顆元素共用，不會因切換元素
// 重新編譯 shader，只換 uniform 顏色/強度。
const RimGlowMaterial = shaderMaterial(
  { uColor: new Color('#ffffff'), uIntensity: 0.6, uPower: 2.2 },
  `varying vec3 vNormal;
   varying vec3 vViewDir;
   void main() {
     vNormal = normalize(normalMatrix * normal);
     vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
     vViewDir = normalize(-viewPosition.xyz);
     gl_Position = projectionMatrix * viewPosition;
   }`,
  `uniform vec3 uColor;
   uniform float uIntensity;
   uniform float uPower;
   varying vec3 vNormal;
   varying vec3 vViewDir;
   void main() {
     float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), uPower);
     gl_FragColor = vec4(uColor, fresnel * uIntensity);
   }`,
);

extend({ RimGlowMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    rimGlowMaterial: ThreeElement<typeof RimGlowMaterial>;
  }
}

export type ProductElement = '空' | '風' | '水' | '火' | '地';

/**
 * 五元素共用的唯一封印符资源。
 * 以 CSS、字型與向量式輪廓即時繪製，沒有低解析點陣圖；在 1080p 以上仍保持清晰。
 * 所有使用 WaterTreasureOrb 的卡片都必須由這裡呈現封印，不可各自複製或降級替換。
 */
function SharedElementSealPaper({ burning = false }: { burning?: boolean }) {
  return (
    <span className={`space-seal-paper ${burning ? 'space-seal-paper--burning' : ''}`} data-seal-resource="shared-vector-1080p-plus">
      <span className="space-seal-paper__script">敕令</span>
      <span className="space-seal-paper__mark">封</span>
      {burning && <span className="space-seal-ash" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
      </span>}
    </span>
  );
}
type WaterOrbVariant = 'crystal' | 'caustic' | 'luminous';

// 客戶介面固定使用「空、風、水、火、地」，但視覺保留正統五行的比例來源。
// 採用一組年輕的科技寶石色盤，但每一顆仍必須一眼看出元素本質：
// 金/空=鈦金、木/風=電光帝王綠、水=電光藍、火=鴿血紅、土/地=金絲楠木琥珀。
// 色相不是隨手選的：水藍／風綠／火紅同時對到全球最愛顏色調查前三名
//（2024 Ipsos／YouGov：藍 37-38%、綠 22%、紅 16%）與傳統五行色（金白·木青·水黑·火赤·土黄），
// 空／地則延續五行「金、土」的貴金屬與大地基調，走鈦金與琥珀而非死板的白／黄。
// 兩位老師只讀這張表，不能各自改色。
const ORB_MATERIAL: Record<ProductElement, { color: string; emissive: string; ring: string; light: string; metalness: number; roughness: number }> = {
  // Not flat "theme colours": every base is a deep gemstone body, with a
  // different bright vein inside it. That keeps the palette contemporary
  // without turning the treasures into neon toy balls.
  空: { color: '#443087', emissive: '#b4a2ff', ring: '#eee9ff', light: '#dfd8ff', metalness: 0.82, roughness: 0.1 },
  風: { color: '#006f4d', emissive: '#00f5a0', ring: '#c6ffe1', light: '#8dffcd', metalness: 0.22, roughness: 0.09 },
  水: { color: '#006ee6', emissive: '#00e5ff', ring: '#c2fbff', light: '#60edff', metalness: 0.1, roughness: 0.04 },
  火: { color: '#a40039', emissive: '#ff1264', ring: '#ffd2e7', light: '#ff9fc5', metalness: 0.3, roughness: 0.055 },
  地: { color: '#9b4b00', emissive: '#ffad12', ring: '#ffebb0', light: '#ffe198', metalness: 0.52, roughness: 0.1 },
};

const INNER_MIST: Record<ProductElement, { deep: string; pale: string }> = {
  空: { deep: '#5a33c6', pale: '#f1edff' },
  風: { deep: '#00996a', pale: '#c9ffb6' },
  水: { deep: '#007dff', pale: '#cffbff' },
  火: { deep: '#e6004c', pale: '#ffd1e4' },
  地: { deep: '#ee7800', pale: '#fff0a6' },
};

// 共用幾何與封印規則，但五顆解封後各有自己的內在語義；差異不是只換顏色。
// 全部變化都留在圓形外殼內，只調內核比例、霧流節奏與少量粒子，避免手機負擔與外形變形。
const ELEMENT_VISUAL_SEMANTICS: Record<ProductElement, {
  deepScale: [number, number, number];
  paleScale: [number, number, number];
  drift: number;
  sparkleCount: number;
  sparkleSize: number;
  sparkleSpeed: number;
}> = {
  空: { deepScale: [0.62, 0.55, 0.62], paleScale: [0.24, 0.2, 0.3], drift: 0.22, sparkleCount: 13, sparkleSize: 1.55, sparkleSpeed: 0.12 },
  風: { deepScale: [0.9, 0.3, 0.74], paleScale: [0.56, 0.18, 0.44], drift: 0.72, sparkleCount: 10, sparkleSize: 1.2, sparkleSpeed: 0.48 },
  水: { deepScale: [0.82, 0.4, 0.72], paleScale: [0.5, 0.26, 0.58], drift: 0.46, sparkleCount: 6, sparkleSize: 1.05, sparkleSpeed: 0.24 },
  火: { deepScale: [0.7, 0.52, 0.66], paleScale: [0.38, 0.42, 0.36], drift: 0.58, sparkleCount: 12, sparkleSize: 1.7, sparkleSpeed: 0.2 },
  地: { deepScale: [0.68, 0.62, 0.68], paleScale: [0.34, 0.28, 0.4], drift: 0.16, sparkleCount: 5, sparkleSize: 1.35, sparkleSpeed: 0.08 },
};

// 「魔珠」封印態：五顆各自是自己元素的「黑化／詛咒版」——同一支色相，飽和度與明度砍到邪氣的
// 深色調，讓封印中就隱約埋下解封後身分的伏筆，而不是五顆長得一樣。不透光、高粗糙度的詛咒石頭
// 質地維持共用（見 DEMON_TEXTURE），跟解封後透光發亮的水晶寶珠形成最大反差；解封瞬間才「裂開」
// 洗白成真正鮮明的元素玻璃球材質。
const DEMON_TEXTURE = { metalness: 0.24, roughness: 0.34, transmission: 0.12, clearcoat: 0.58, iridescence: 0 };
// 每個元素的魔珠色相必須鎖在自己天使色（ORB_MATERIAL）的同一色系上，只降飽和度／明度、
// 不換色相——這樣「解封」才是同一元素的洗白，而不是換了一顆完全無關的珠子。
const DEMON_MATERIAL: Record<ProductElement, { color: string; emissive: string }> = {
  空: { color: '#120a1c', emissive: '#5b2a86' }, // 吞噬一切的虛空黑紫（同色系：天使紫金 #b4a2ff）
  風: { color: '#04120c', emissive: '#1f6b4a' }, // 瘴氣毒綠（同色系：天使翠綠 #00f5a0，不再跑去橄欖黃綠）
  水: { color: '#04141a', emissive: '#0d6b62' }, // 深淵毒潭黑青（同色系：天使電光藍 #00e5ff）
  火: { color: '#1a0410', emissive: '#7a0f3a' }, // 焦血暗紅（同色系：天使桃紅 #ff1264，不再跑去焦橙）
  地: { color: '#140d04', emissive: '#5c3d0f' }, // 腐土黴斑黑褐（同色系：天使琥珀 #ffad12）
};
const DEMON_MIST: Record<ProductElement, { deep: string; pale: string }> = {
  空: { deep: '#2a1240', pale: '#5c2e82' },
  風: { deep: '#0a2418', pale: '#2f7a54' },
  水: { deep: '#062830', pale: '#0e6a60' },
  火: { deep: '#2e0616', pale: '#8a1244' },
  地: { deep: '#241708', pale: '#5c3d0f' },
};
const DEMON_LIGHT: Record<ProductElement, { primary: string; secondary: string }> = {
  空: { primary: '#8b2fd1', secondary: '#3a0f5c' },
  風: { primary: '#1fbf7a', secondary: '#0a4a2e' },
  水: { primary: '#14a396', secondary: '#053a35' },
  火: { primary: '#d1145a', secondary: '#4a0824' },
  地: { primary: '#7a5414', secondary: '#2e1e08' },
};

function ElementSphere({ element, released, variant, preview }: { element: ProductElement; released: boolean; variant: WaterOrbVariant; preview: boolean }) {
  const group = useRef<Group>(null);
  const surfaceMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const goldMistRef = useRef<Group>(null);
  const paleMistRef = useRef<Group>(null);
  const rimMeshRef = useRef<Mesh>(null);
  const material = ORB_MATERIAL[element];
  const mist = INNER_MIST[element];
  const semantics = ELEMENT_VISUAL_SEMANTICS[element];
  const isLuminousWater = released && element === '水' && variant === 'luminous';
  const demon = DEMON_MATERIAL[element];
  const demonMist = DEMON_MIST[element];
  const demonColorDim = useMemo(() => new Color(demon.color), [demon.color]);
  const demonColorPeak = useMemo(() => new Color(demon.emissive), [demon.emissive]);
  const rimColor = useMemo(() => new Color(released ? material.emissive : demon.emissive), [material.emissive, demon.emissive, released]);
  // CC0 source textures are used as micro-relief only. Their original colours
  // never paint over the fixed element palette, so the product remains coherent.
  const [waterTexture, windTexture, groundTexture] = useLoader(TextureLoader, [
    '/textures/cc0-y2k-water-texture.png',
    '/textures/polyhaven/cc0-emerald-relief.jpg',
    '/textures/polyhaven/cc0-fine-wood-relief.jpg',
  ]);
  const reliefTexture = element === '風' ? windTexture : element === '地' ? groundTexture : waterTexture;

  useEffect(() => {
    [waterTexture, windTexture, groundTexture].forEach((texture) => {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(1.35, 1.35);
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
    });
  }, [waterTexture, windTexture, groundTexture]);

  useFrame((_, delta) => {
    if (!group.current) return;
    // One small real 3D mesh: slow while sealed, stronger only during release.
    if (!preview) group.current.rotation.y += delta * (released ? 1.25 : 0.24);
    group.current.rotation.x = Math.sin(performance.now() / 2600) * 0.12;
    const now = performance.now();
    // Two internal volumes travel in opposing directions. Their route follows the
    // actual element: gold pulls, forest breathes, fire rises, earth settles.
    const pull = Math.sin(now / (released ? 980 : 2050));
    const lift = Math.cos(now / (released ? 1240 : 2440));
    const speed = released ? 1 : 0.42;
    const deepPosition = { x: pull * 0.18, y: lift * 0.1, z: Math.sin(now / 1720) * 0.08 };
    const palePosition = { x: -pull * 0.18, y: -lift * 0.1, z: -Math.sin(now / 1720) * 0.08 };
    if (element === '火') {
      deepPosition.x = Math.sin(now / 720) * 0.09;
      deepPosition.y = -0.2 + (Math.sin(now / 880) * 0.18 + 0.18) * speed;
      palePosition.x = Math.cos(now / 630) * 0.1;
      palePosition.y = -0.12 + (Math.sin(now / 690 + 1.1) * 0.2 + 0.2) * speed;
    } else if (element === '風') {
      deepPosition.x = Math.sin(now / 1100) * 0.23;
      deepPosition.y = Math.cos(now / 1470) * 0.09;
      palePosition.x = Math.cos(now / 1270) * 0.23;
      palePosition.y = -Math.sin(now / 1510) * 0.09;
    } else if (element === '地') {
      deepPosition.x = Math.sin(now / 2600) * 0.08;
      deepPosition.y = -0.12 + Math.cos(now / 2300) * 0.04;
      palePosition.x = -Math.sin(now / 2850) * 0.08;
      palePosition.y = 0.08 + Math.sin(now / 2550) * 0.035;
    }
    if (goldMistRef.current) {
      goldMistRef.current.rotation.y += delta * (released ? semantics.drift : 0.14);
      goldMistRef.current.rotation.z = lift * 0.25;
      goldMistRef.current.position.set(deepPosition.x, deepPosition.y, deepPosition.z);
    }
    if (paleMistRef.current) {
      paleMistRef.current.rotation.y -= delta * (released ? semantics.drift * 0.86 : 0.12);
      paleMistRef.current.rotation.x = pull * 0.22;
      paleMistRef.current.position.set(palePosition.x, palePosition.y, palePosition.z);
    }
    // The water texture is a material language, not a blue paint layer: every
    // element receives its fine moving relief while keeping its own gemstone colour.
    reliefTexture.offset.x = (reliefTexture.offset.x + delta * (released ? 0.055 : 0.018)) % 1;
    reliefTexture.offset.y = (reliefTexture.offset.y + delta * (released ? 0.022 : 0.008)) % 1;
    if (!released) {
      // 魔珠封印態：每顆元素走自己的黑化色相，脈動像被封住的東西在裡面掙扎，看不出精緻寶石感。
      const surface = surfaceMaterialRef.current;
      if (surface) {
        const dread = 0.5 + Math.sin(now / 640) * 0.5;
        surface.color.copy(demonColorDim).lerp(demonColorPeak, dread * 0.32);
        surface.emissive.copy(demonColorDim).lerp(demonColorPeak, 0.42 + dread * 0.46);
        surface.emissiveIntensity = 0.14 + dread * 0.16;
      }
    } else if (element === '水') {
      // The colour shift stays on the 3D water surface: shallow cyan passes into deeper ocean blue.
      const tide = 0.5 + Math.sin(performance.now() / 780) * 0.5;
      const surface = surfaceMaterialRef.current;
      if (surface) {
        surface.color.setRGB(0.055 + tide * 0.19, 0.46 + tide * 0.29, 0.67 + tide * 0.27);
        surface.emissive.setRGB(0.02 + tide * 0.1, 0.3 + tide * 0.36, 0.47 + tide * 0.4);
        const breath = 0.5 + Math.sin(performance.now() / 510) * 0.5;
        surface.emissiveIntensity = 0.34 + breath * 0.3;
      }
    } else {
      const surface = surfaceMaterialRef.current;
      if (surface) {
        const tide = 0.5 + Math.sin(now / 720) * 0.5;
        // 金／空專用：深鈦金與淺金光在球面緩慢換位；其他元素也保有同樣的生命感。
        if (element === '空') {
            surface.color.setRGB(0.4 + tide * 0.42, 0.22 + tide * 0.38, 0.0 + tide * 0.09);
            surface.emissive.setRGB(0.22 + tide * 0.58, 0.1 + tide * 0.4, 0.0 + tide * 0.06);
            surface.emissiveIntensity = 0.18 + tide * 0.22;
        } else {
          if (element === '火') {
            surface.color.setRGB(0.38 + tide * 0.5, 0.0 + tide * 0.1, 0.08 + tide * 0.2);
            surface.emissive.setRGB(0.48 + tide * 0.5, 0.0 + tide * 0.08, 0.14 + tide * 0.24);
          } else if (element === '風') {
            surface.color.setRGB(0.0 + tide * 0.03, 0.28 + tide * 0.38, 0.15 + tide * 0.22);
            surface.emissive.setRGB(0.0 + tide * 0.05, 0.32 + tide * 0.5, 0.1 + tide * 0.2);
          } else if (element === '地') {
            surface.color.setRGB(0.25 + tide * 0.38, 0.1 + tide * 0.25, 0.01 + tide * 0.08);
            surface.emissive.setRGB(0.22 + tide * 0.46, 0.07 + tide * 0.25, 0.0 + tide * 0.06);
          }
          surface.emissiveIntensity = 0.2 + tide * 0.22;
        }
      }
    }
    // 科技能量護罩：邊緣光強度隨呼吸節奏脈動，封印時微弱、釋放時明顯——
    // 只調 uniform，不換材質、不觸發 shader 重編譯。
    const rimMesh = rimMeshRef.current;
    if (rimMesh) {
      const rimMaterial = rimMesh.material as InstanceType<typeof RimGlowMaterial>;
      const pulse = 0.5 + Math.sin(now / (released ? 620 : 1900)) * 0.5;
      rimMaterial.uniforms.uIntensity.value = preview ? 0.28 + pulse * 0.14 : released ? 0.78 + pulse * 0.42 : 0.32 + pulse * 0.16;
    }
  });

  return (
    <group ref={group} scale={released ? 1.08 : 0.94}>
      <mesh>
        <sphereGeometry args={[1, preview ? 64 : 96, preview ? 64 : 96]} />
        <meshPhysicalMaterial
          ref={surfaceMaterialRef}
          color={released ? (isLuminousWater ? '#38bdf8' : material.color) : demon.color}
          emissive={released ? (isLuminousWater ? '#a5f3fc' : material.emissive) : demon.emissive}
          emissiveIntensity={released ? (isLuminousWater ? 0.56 : 0.32) : 0.2}
          metalness={released ? material.metalness : DEMON_TEXTURE.metalness}
          roughness={released ? (element === '水' && variant === 'caustic' ? 0.05 : element === '水' && variant === 'luminous' ? 0.07 : material.roughness) : DEMON_TEXTURE.roughness}
          transmission={released ? (element === '水' && variant === 'caustic' ? 0.42 : variant === 'luminous' ? 0.56 : 0.28) : DEMON_TEXTURE.transmission}
          thickness={0.72}
          ior={1.33}
          clearcoat={released ? 0.96 : DEMON_TEXTURE.clearcoat}
          clearcoatRoughness={0.08}
          // Subtle gemstone refraction: it keeps the object refined and dimensional
          // without adding a separate icon, ring, or cartoon ornament. The demon
          // shell has none — it is not meant to look precious yet.
          iridescence={released ? (element === '空' ? 0.12 : 0.22) : DEMON_TEXTURE.iridescence}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[120, 360]}
          // Keep the translucent internal mist visible through the glass sphere.
          depthWrite={false}
          map={released && element === '水' ? waterTexture : null}
          emissiveMap={released && element === '水' ? waterTexture : null}
          bumpMap={reliefTexture}
          bumpScale={released ? (element === '水' ? 0.13 : 0.075) : 0.11}
        />
      </mesh>
      <group ref={goldMistRef}>
        <mesh scale={semantics.deepScale} rotation={[0.35, 0.7, -0.22]}>
          <sphereGeometry args={[1, preview ? 32 : 40, preview ? 32 : 40]} />
          <meshPhysicalMaterial
            color={released ? mist.deep : demonMist.deep}
            emissive={released ? material.emissive : demon.emissive}
            emissiveIntensity={released ? 0.17 : 0.09}
            transparent
            opacity={preview ? 0.18 : released ? 0.12 : 0.1}
            transmission={0.92}
            roughness={0.28}
            depthWrite={false}
          />
        </mesh>
      </group>
      <group ref={paleMistRef}>
        <mesh position={[0.24, -0.2, 0.15]} scale={semantics.paleScale} rotation={[-0.48, 0.25, 0.4]}>
          <sphereGeometry args={[1, preview ? 28 : 36, preview ? 28 : 36]} />
          <meshBasicMaterial color={released ? mist.pale : demonMist.pale} transparent opacity={preview ? 0.15 : released ? 0.1 : 0.075} depthWrite={false} />
        </mesh>
      </group>
      {/* 內核與非對稱反射斑讓封印中的球仍讀成多層晶體，而不是平面色塊。 */}
      <mesh scale={released ? 0.58 : 0.66} rotation={[0.18, -0.42, 0.16]}>
        <sphereGeometry args={[1, preview ? 36 : 48, preview ? 36 : 48]} />
        <meshPhysicalMaterial
          color={released ? mist.deep : demonMist.deep}
          emissive={released ? material.emissive : demon.emissive}
          emissiveIntensity={released ? 0.16 : 0.11}
          transparent
          opacity={released ? 0.15 : 0.2}
          transmission={released ? 0.64 : 0.42}
          thickness={0.9}
          roughness={0.18}
          clearcoat={0.72}
          clearcoatRoughness={0.12}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-0.34, 0.38, 0.72]} scale={[0.24, 0.12, 0.08]} rotation={[0.18, 0.08, -0.55]}>
        <sphereGeometry args={[1, preview ? 28 : 36, preview ? 28 : 36]} />
        <meshBasicMaterial color={released ? mist.pale : demonMist.pale} transparent opacity={released ? 0.34 : 0.22} depthWrite={false} />
      </mesh>
      {isLuminousWater && (
        <>
          <mesh position={[-0.3, 0.34, 0.62]} scale={0.46}>
            <sphereGeometry args={[1, preview ? 36 : 48, preview ? 36 : 48]} />
            <meshBasicMaterial color="#ecfeff" transparent opacity={released ? 0.48 : 0.26} />
          </mesh>
          <mesh scale={1.025}>
            <sphereGeometry args={[1, preview ? 56 : 72, preview ? 56 : 72]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={released ? 0.11 : 0.055} side={1} />
          </mesh>
        </>
      )}
      {/* 科技感邊緣光護罩：輪廓發亮，dpr/多邊形完全沿用主球，不新增額外解析度負擔 */}
      <mesh ref={rimMeshRef} scale={1.06}>
        <sphereGeometry args={[1, preview ? 64 : 96, preview ? 64 : 96]} />
        <rimGlowMaterial
          uColor={rimColor}
          uPower={preview ? 2.6 : 2.1}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={1}
        />
      </mesh>
      {/* 能量粒子：只在寶物已釋放（非預覽格）時出現，控制多顆同框的總成本 */}
      {released && !preview && (
        <Sparkles
          count={semantics.sparkleCount}
          scale={2.6}
          size={semantics.sparkleSize}
          speed={semantics.sparkleSpeed}
          opacity={0.85}
          color={element === '空' ? '#f4f1ff' : element === '火' ? '#ffd08a' : material.emissive}
          noise={0.6}
        />
      )}
    </group>
  );
}

export function WaterTreasureOrb({ element, released, variant = 'luminous', preview = false, burnSealOnRelease = false }: { element: ProductElement; released: boolean; variant?: WaterOrbVariant; preview?: boolean; burnSealOnRelease?: boolean }) {
  const material = ORB_MATERIAL[element];
  return (
    <span className={`water-treasure-orb water-treasure-orb--${element} water-treasure-orb--${variant} ${preview ? 'water-treasure-orb--preview' : ''} ${released ? 'water-treasure-orb--released' : 'water-treasure-orb--sealed'}`} aria-hidden="true">
      {!released && <span className="water-treasure-seal-aura" />}
      {(!released || burnSealOnRelease) && <SharedElementSealPaper burning={released && burnSealOnRelease} />}
      <Canvas
        // 以 1080p／高密度手機仍清晰為準；只在需求幀渲染，避免提高解析度後常駐佔用 GPU。
        dpr={preview ? 5 : 6}
        frameloop="demand"
        camera={{ position: [0, 0, 3.2], fov: 36 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.4} />
        <pointLight
          position={[-2.2, 2.5, 3.1]}
          intensity={released ? (element === '空' ? 6 : 15) : (element === '空' ? 2.5 : 6)}
          color={released ? (element === '空' ? '#fff3cc' : element === '火' ? '#ff8ca9' : element === '風' ? '#a7ffe0' : element === '地' ? '#ffd784' : '#c8f8ff') : DEMON_LIGHT[element].primary}
        />
        <pointLight position={[2.6, -1.2, 2]} intensity={released ? (element === '空' ? 2.5 : 8) : (element === '空' ? 1.2 : 3)} color={released ? material.light : DEMON_LIGHT[element].secondary} />
        {/* 質感提升來源：HDRI 反射讓寶石表面出現真實環境高光，而不是純靠點光源硬堆。
            預覽格維持極低解析度控制成本；主要展示的一顆用稍高解析度換更好的反光細節。 */}
        <Environment preset="city" resolution={preview ? 96 : 192} />
        <ElementSphere element={element} released={released} variant={variant} preview={preview} />
      </Canvas>
    </span>
  );
}
