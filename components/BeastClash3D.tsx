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
 * 做了：神獸**本體**跑過去。六十張各自有一張去背全身立繪
 *       （scripts/gen-beast-spirits.mjs 以既有插畫為底重繪並去背），
 *       翻牌後衝出去的是那隻神獸本人，不是一張卡在飛。
 *
 * 沒做：真正的多邊形 3D 模型（.glb）。這裡是三維空間中的立繪，
 *       有透視、深度、位移、光影——但轉到側面不會有厚度。
 *       要真正的模型得另外委製，見 docs/beast-game-skill.md〈十〉。
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
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

export type ClashSide = 'player' | 'opponent';

export interface ClashProps {
  /** 我方出戰卡的卡面圖（縮圖，手牌已經載過，不會多一次請求）。 */
  playerArt: string;
  /** 對方出戰卡的卡面圖。 */
  opponentArt: string;
  /** 我方神獸的去背本體立繪。沒有就退回卡面。 */
  playerSpirit?: string | null;
  /** 對方神獸的去背本體立繪。 */
  opponentSpirit?: string | null;
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
/** 本體立繪是 848×1259（約 0.674），比卡片瘦長一點，用自己的比例免得變形。 */
const SPIRIT_W = 1.5;
const SPIRIT_H = 2.23;

function CardPlane({
  art,
  home,
  lunging,
  glow,
  spirit,
  recoiling,
}: {
  art: string;
  home: [number, number, number];
  lunging: boolean;
  glow: string;
  /** 有本體立繪就用本體，沒有才退回卡面。 */
  spirit?: boolean;
  recoiling: boolean;
}) {
  const texture = useLoader(THREE.TextureLoader, art);
  const mesh = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const recoil = useRef(0);

  useFrame(({ clock }, delta) => {
    const node = mesh.current;
    if (!node) return;

    // 衝出去→撞上→彈回來。用一個 0→1→0 的行程控制，不用逐格關鍵影格。
    const target = lunging ? 1 : 0;
    progress.current += (target - progress.current) * Math.min(1, delta * (lunging ? 14 : 6));
    const t = progress.current;
    recoil.current += ((recoiling ? 1 : 0) - recoil.current) * Math.min(1, delta * 12);
    const hit = recoil.current;

    // 往對面衝：home 在自己這側，衝到中間交會。
    const direction = home[0] < 0 ? 1 : -1;
    node.position.x = home[0] + direction * (t * Math.abs(home[0]) * 0.92 - hit * 0.32);
    node.position.y = home[1] + Math.sin(t * Math.PI) * 0.28 + hit * 0.08 + Math.sin(clock.elapsedTime * 3) * 0.025;
    node.position.z = home[2] + t * 0.55;
    // 衝的時候壓低、微傾，看起來像撲上去而不是平移。
    node.rotation.z = direction * (t * 0.2 - hit * 0.18);
    node.rotation.y = direction * t * -0.12;
    const scale = 1 + t * 0.16;
    node.scale.set(scale * (1 + hit * 0.06), scale * (1 - hit * 0.08), 1);
  });

  return (
    <mesh ref={mesh} position={home}>
      <planeGeometry args={spirit ? [SPIRIT_W, SPIRIT_H] : [CARD_W, CARD_H]} />
      {/*
        本體立繪帶 alpha，要開 transparent 才不會出現黑框；
        alphaTest 把幾乎全透明的像素直接丟掉，邊緣才不會有一圈灰。
      */}
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        transparent={spirit}
        alphaTest={spirit ? 0.08 : 0}
      />
      {/* 衝出去時吃到元素光，讓出手方看得出來是誰。卡面才畫光框，本體不畫（會變成方框）。 */}
      {!spirit && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[CARD_W * 1.1, CARD_H * 1.08]} />
          <meshBasicMaterial color={glow} transparent opacity={lunging ? 0.55 : 0} />
        </mesh>
      )}
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

export default function BeastClash3D({
  playerArt,
  opponentArt,
  playerSpirit,
  opponentSpirit,
  attacker,
  glow,
  beat,
}: ClashProps) {
  const [lunging, setLunging] = useState(false);
  const [impact, setImpact] = useState(false);

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
  useEffect(() => {
    if (reduced) return;
    const start = setTimeout(() => setLunging(true), 40);
    const contact = setTimeout(() => setImpact(true), 170);
    const settle = setTimeout(() => setImpact(false), 430);
    const stop = setTimeout(() => setLunging(false), 620);
    return () => { clearTimeout(start); clearTimeout(stop); clearTimeout(contact); clearTimeout(settle); };
  }, [beat, reduced]);

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
        {/*
          衝過去的是神獸本體，不是卡。
          沒有立繪（還沒生成）才退回卡面——不會開天窗。
        */}
        <CardPlane
          art={playerSpirit ?? playerArt}
          spirit={Boolean(playerSpirit)}
          home={[-1.35, -0.15, 0]}
          lunging={lunging && attacker === 'player'}
          recoiling={impact && attacker === 'opponent'}
          glow={glow}
        />
        <CardPlane
          art={opponentSpirit ?? opponentArt}
          spirit={Boolean(opponentSpirit)}
          home={[1.35, 0.15, 0]}
          lunging={lunging && attacker === 'opponent'}
          recoiling={impact && attacker === 'player'}
          glow={glow}
        />
        <Impact active={impact} glow={glow} />
      </Canvas>
    </div>
  );
}
