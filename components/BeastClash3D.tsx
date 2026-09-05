'use client';

/**
 * 神獸決鬥・三維對撞
 * ============================================================================
 *
 * 業主定調：「牌一打開，就要有立體的畫面跑過去那邊戰鬥。」
 *
 * 【先講清楚這支做了什麼、沒做什麼】
 *
 * 做了：真的三維場景。兩張卡是三維空間裡的物件，有透視、有深度、
 *       會旋轉、會衝過去、撞擊時會震、會閃光。六十張都通用，
 *       貼圖就是各自的卡面，所以每一張衝過去的都是牠自己。
 *
 * 沒做：神獸「去背之後」的角色本體跑過去。
 *       原因是素材：public/star-beasts 的圖沒有 alpha 通道（實測 3 channels），
 *       是完整背景的插畫，不是去背的角色圖。直接丟進三維場景會變成
 *       「一塊會飛的長方形插畫」，那比現在更糟。
 *       要做到角色本體對打，需要六十張去背角色圖或六十個 3D 模型——
 *       這兩樣都得另外產出，見 docs/beast-game-skill.md〈十〉。
 *
 * 【效能紀律（太極憲章）】
 *
 * 手機優先 60FPS。所以：
 *   場上永遠只有兩張卡與一片撞擊光，不是六十個模型
 *   不開陰影、不用後製、材質只有兩張已經在手牌載過的縮圖
 *   只在交鋒階段掛載，演完就卸掉，不長期佔著 WebGL context
 *   prefers-reduced-motion 直接不掛載，交給原本的靜態版面
 *
 * 【動畫不得決定結果（規格第十二條）】
 *
 * 這支元件只接收「第幾回合、誰出手」然後演出來。
 * 它不算傷害、不判勝負、沒有任何亂數——結果在按下開始那一刻就定了。
 */

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

export type ClashSide = 'player' | 'opponent';

export interface ClashProps {
  /** 我方出戰卡的卡面圖（縮圖，手牌已經載過，不會多一次請求）。 */
  playerArt: string;
  /** 對方出戰卡的卡面圖。 */
  opponentArt: string;
  /** 這一次是誰出手。換人時卡片會從對應方向衝出去。 */
  attacker: ClashSide;
  /** 出手方的元素光色，來自 lib/beast-battle-fx 的對照表。 */
  glow: string;
  /** 每次這個值變動就重演一次衝撞。用回合序號即可。 */
  beat: number;
}

/** 卡片比例沿用正統規格 63×88，三維空間裡也不能變形。 */
const CARD_W = 1.26;
const CARD_H = 1.76;

function CardPlane({
  art,
  home,
  lunging,
  glow,
}: {
  art: string;
  home: [number, number, number];
  lunging: boolean;
  glow: string;
}) {
  const texture = useLoader(THREE.TextureLoader, art);
  const mesh = useRef<THREE.Mesh>(null);
  const progress = useRef(0);

  useFrame((_, delta) => {
    const node = mesh.current;
    if (!node) return;

    // 衝出去→撞上→彈回來。用一個 0→1→0 的行程控制，不用逐格關鍵影格。
    const target = lunging ? 1 : 0;
    progress.current += (target - progress.current) * Math.min(1, delta * (lunging ? 14 : 6));
    const t = progress.current;

    // 往對面衝：home 在自己這側，衝到中間交會。
    const direction = home[0] < 0 ? 1 : -1;
    node.position.x = home[0] + direction * t * Math.abs(home[0]) * 0.92;
    node.position.z = home[2] + t * 0.55;
    // 衝的時候壓低、微傾，看起來像撲上去而不是平移。
    node.rotation.z = direction * t * 0.34;
    node.rotation.y = direction * t * -0.5;
    const scale = 1 + t * 0.16;
    node.scale.set(scale, scale, 1);
  });

  return (
    <mesh ref={mesh} position={home}>
      <planeGeometry args={[CARD_W, CARD_H]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
      {/* 衝出去時卡緣吃到元素光，讓出手方看得出來是誰。 */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[CARD_W * 1.1, CARD_H * 1.08]} />
        <meshBasicMaterial color={glow} transparent opacity={lunging ? 0.55 : 0} />
      </mesh>
    </mesh>
  );
}

/** 撞擊閃光。用既有的 lightning-impact 圖，不另外做特效素材。 */
function Impact({ active, glow }: { active: boolean; glow: string }) {
  const texture = useLoader(THREE.TextureLoader, '/audio/taiji/lightning-impact-cc0.png');
  const mesh = useRef<THREE.Mesh>(null);
  const life = useRef(0);

  useFrame((_, delta) => {
    const node = mesh.current;
    if (!node) return;
    life.current = active ? Math.min(1, life.current + delta * 8) : Math.max(0, life.current - delta * 3.2);
    const material = node.material as THREE.MeshBasicMaterial;
    material.opacity = life.current * 0.9;
    const scale = 0.6 + life.current * 1.5;
    node.scale.set(scale, scale, 1);
    node.rotation.z += delta * 1.4;
  });

  return (
    <mesh ref={mesh} position={[0, 0, 0.6]}>
      <planeGeometry args={[2.2, 2.2]} />
      <meshBasicMaterial map={texture} color={glow} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function BeastClash3D({ playerArt, opponentArt, attacker, glow, beat }: ClashProps) {
  const [lunging, setLunging] = useState(false);
  const lastBeat = useRef(-1);

  // 減少動態時整個不掛載，交給原本的靜態版面——不是把動畫調慢，是不做。
  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);

  // 每次 beat 變動演一次：衝出去，短暫停留，收回來。
  if (beat !== lastBeat.current && !reduced) {
    lastBeat.current = beat;
    setTimeout(() => setLunging(true), 40);
    setTimeout(() => setLunging(false), 620);
  }

  if (reduced) return null;

  return (
    <div
      data-beast-clash-3d
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    >
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      >
        {/* 只有兩張卡與一片光。不是六十個模型——手機跑得動才有意義。 */}
        <CardPlane
          art={playerArt}
          home={[-1.35, -0.15, 0]}
          lunging={lunging && attacker === 'player'}
          glow={glow}
        />
        <CardPlane
          art={opponentArt}
          home={[1.35, 0.15, 0]}
          lunging={lunging && attacker === 'opponent'}
          glow={glow}
        />
        <Impact active={lunging} glow={glow} />
      </Canvas>
    </div>
  );
}
