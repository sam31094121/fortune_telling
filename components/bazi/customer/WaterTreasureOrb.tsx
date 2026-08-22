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

type ProductElement = '空' | '風' | '水' | '火' | '地';
type WaterOrbVariant = 'crystal' | 'caustic' | 'luminous';

// 客戶介面固定使用「空、風、水、火、地」，但視覺保留正統五行的比例來源。
// 採用一組年輕的科技寶石色盤，但每一顆仍必須一眼看出元素本質：
// 金/空=鈦金、木/風=電光帝王綠、水=電光藍、火=鴿血紅、土/地=金絲楠木琥珀。
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

function ElementSphere({ element, released, variant, preview }: { element: ProductElement; released: boolean; variant: WaterOrbVariant; preview: boolean }) {
  const group = useRef<Group>(null);
  const surfaceMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const goldMistRef = useRef<Group>(null);
  const paleMistRef = useRef<Group>(null);
  const rimMeshRef = useRef<Mesh>(null);
  const material = ORB_MATERIAL[element];
  const mist = INNER_MIST[element];
  const isLuminousWater = element === '水' && variant === 'luminous';
  const rimColor = useMemo(() => new Color(material.emissive), [material.emissive]);
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
      goldMistRef.current.rotation.y += delta * (released ? 0.56 : 0.14);
      goldMistRef.current.rotation.z = lift * 0.25;
      goldMistRef.current.position.set(deepPosition.x, deepPosition.y, deepPosition.z);
    }
    if (paleMistRef.current) {
      paleMistRef.current.rotation.y -= delta * (released ? 0.48 : 0.12);
      paleMistRef.current.rotation.x = pull * 0.22;
      paleMistRef.current.position.set(palePosition.x, palePosition.y, palePosition.z);
    }
    // The water texture is a material language, not a blue paint layer: every
    // element receives its fine moving relief while keeping its own gemstone colour.
    reliefTexture.offset.x = (reliefTexture.offset.x + delta * (released ? 0.055 : 0.018)) % 1;
    reliefTexture.offset.y = (reliefTexture.offset.y + delta * (released ? 0.022 : 0.008)) % 1;
    if (element === '水') {
      // The colour shift stays on the 3D water surface: shallow cyan passes into deeper ocean blue.
      const tide = 0.5 + Math.sin(performance.now() / (released ? 780 : 1550)) * 0.5;
      const surface = surfaceMaterialRef.current;
      if (surface) {
        surface.color.setRGB(0.055 + tide * 0.19, 0.46 + tide * 0.29, 0.67 + tide * 0.27);
        surface.emissive.setRGB(0.02 + tide * 0.1, 0.3 + tide * 0.36, 0.47 + tide * 0.4);
        const breath = 0.5 + Math.sin(performance.now() / (released ? 510 : 1500)) * 0.5;
        surface.emissiveIntensity = released ? 0.34 + breath * 0.3 : 0.07 + breath * 0.09;
      }
    } else {
      const surface = surfaceMaterialRef.current;
      if (surface) {
        const tide = 0.5 + Math.sin(now / (released ? 720 : 1750)) * 0.5;
        // 金／空專用：深鈦金與淺金光在球面緩慢換位；其他元素也保有同樣的生命感。
        if (element === '空') {
            surface.color.setRGB(0.4 + tide * 0.42, 0.22 + tide * 0.38, 0.0 + tide * 0.09);
            surface.emissive.setRGB(0.22 + tide * 0.58, 0.1 + tide * 0.4, 0.0 + tide * 0.06);
            surface.emissiveIntensity = released ? 0.18 + tide * 0.22 : 0.05 + tide * 0.08;
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
          surface.emissiveIntensity = released ? 0.2 + tide * 0.22 : 0.05 + tide * 0.09;
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
        <sphereGeometry args={[1, 48, 48]} />
        <meshPhysicalMaterial
          ref={surfaceMaterialRef}
          color={isLuminousWater ? '#38bdf8' : material.color}
          emissive={isLuminousWater ? '#a5f3fc' : material.emissive}
          emissiveIntensity={released ? (isLuminousWater ? 0.56 : 0.32) : isLuminousWater ? 0.34 : 0.08}
          metalness={material.metalness}
          roughness={element === '水' && variant === 'caustic' ? 0.05 : element === '水' && variant === 'luminous' ? 0.07 : material.roughness}
          transmission={element === '水' && variant === 'caustic' ? 0.42 : variant === 'luminous' ? 0.56 : 0.28}
          thickness={0.72}
          ior={1.33}
          clearcoat={0.96}
          clearcoatRoughness={0.08}
          // Subtle gemstone refraction: it keeps the object refined and dimensional
          // without adding a separate icon, ring, or cartoon ornament.
          iridescence={element === '空' ? 0.12 : 0.22}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[120, 360]}
          // Keep the translucent internal mist visible through the glass sphere.
          depthWrite={false}
          map={element === '水' ? waterTexture : null}
          emissiveMap={element === '水' ? waterTexture : null}
          bumpMap={reliefTexture}
          bumpScale={element === '水' ? 0.13 : 0.075}
        />
      </mesh>
      <group ref={goldMistRef}>
        <mesh scale={[0.82, 0.38, 0.72]} rotation={[0.35, 0.7, -0.22]}>
          <sphereGeometry args={[1, 28, 28]} />
          <meshPhysicalMaterial
            color={mist.deep}
            emissive={material.emissive}
            emissiveIntensity={released ? 0.17 : 0.075}
            transparent
            opacity={preview ? 0.16 : released ? 0.11 : 0.055}
            transmission={0.92}
            roughness={0.28}
            depthWrite={false}
          />
        </mesh>
      </group>
      <group ref={paleMistRef}>
        <mesh position={[0.24, -0.2, 0.15]} scale={[0.48, 0.24, 0.56]} rotation={[-0.48, 0.25, 0.4]}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={mist.pale} transparent opacity={preview ? 0.13 : released ? 0.085 : 0.04} depthWrite={false} />
        </mesh>
      </group>
      {isLuminousWater && (
        <>
          <mesh position={[-0.3, 0.34, 0.62]} scale={0.46}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#ecfeff" transparent opacity={released ? 0.48 : 0.26} />
          </mesh>
          <mesh scale={1.025}>
            <sphereGeometry args={[1, 48, 48]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={released ? 0.11 : 0.055} side={1} />
          </mesh>
        </>
      )}
      {/* 科技感邊緣光護罩：輪廓發亮，dpr/多邊形完全沿用主球，不新增額外解析度負擔 */}
      <mesh ref={rimMeshRef} scale={1.06}>
        <sphereGeometry args={[1, 48, 48]} />
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
          count={16}
          scale={2.6}
          size={2.4}
          speed={0.3}
          opacity={0.85}
          color={material.emissive}
          noise={0.6}
        />
      )}
    </group>
  );
}

export function WaterTreasureOrb({ element, released, variant = 'luminous', preview = false }: { element: ProductElement; released: boolean; variant?: WaterOrbVariant; preview?: boolean }) {
  const material = ORB_MATERIAL[element];
  return (
    <span className={`water-treasure-orb water-treasure-orb--${element} water-treasure-orb--${variant} ${preview ? 'water-treasure-orb--preview' : ''} ${released ? 'water-treasure-orb--released' : 'water-treasure-orb--sealed'}`} aria-hidden="true">
      <Canvas
        // 客戶頁以穩定優先：首幀照常渲染，但不持續佔用 GPU 動畫迴圈。
        dpr={[1, 1.25]}
        frameloop="demand"
        camera={{ position: [0, 0, 3.2], fov: 36 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.4} />
        <pointLight
          position={[-2.2, 2.5, 3.1]}
          intensity={element === '空' ? (released ? 6 : 2.5) : (released ? 15 : 6)}
          color={element === '空' ? '#fff3cc' : element === '火' ? '#ff8ca9' : element === '風' ? '#a7ffe0' : element === '地' ? '#ffd784' : '#c8f8ff'}
        />
        <pointLight position={[2.6, -1.2, 2]} intensity={element === '空' ? (released ? 2.5 : 1.2) : (released ? 8 : 3)} color={material.light} />
        {/* 質感提升來源：HDRI 反射讓寶石表面出現真實環境高光，而不是純靠點光源硬堆。
            預覽格維持極低解析度控制成本；主要展示的一顆用稍高解析度換更好的反光細節。 */}
        <Environment preset="city" resolution={preview ? 24 : 48} />
        <ElementSphere element={element} released={released} variant={variant} preview={preview} />
      </Canvas>
    </span>
  );
}
