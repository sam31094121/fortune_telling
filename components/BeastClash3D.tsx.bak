'use client';

/**
 * 神獸決鬥・三維對撞
 * ============================================================================
 *
 * 業主定調：「牌一打開，就要有立體的畫面跑過去那邊戰鬥。」
 *
 * 【先講清楚這支做了什麼、沒做什麼】
 *
 * 做了：三維舞台與各自的去背立繪，有位移與撞擊提示。
 *       這是既有的立繪演出，不是已驗收的六秒關節動畫。
 *
 * 做了：神獸**本體**跑過去。六十張各自有一張去背全身立繪
 *       （scripts/gen-beast-spirits.mjs 以既有插畫為底重繪並去背），
 *       翻牌後衝出去的是那隻神獸本人，不是一張卡在飛。
 *
 * 沒做：真正的多邊形 3D 模型（.glb）。這裡是三維空間中的立繪，
 *       有透視、深度、位移、光影——但轉到側面不會有厚度。
 *       要真正的模型得另外委製，見 docs/beast-game-skill.md〈八〉。
 *
 * 【效能紀律（太極憲章）】
 *
 * 手機優先 60FPS。所以：
 *   場上最多兩張本體立繪與一片撞擊光
 *   不開陰影、不用後製，素材先行預載
 *   整場保留同一個 WebGL context，閒置時按需繪製
 *   prefers-reduced-motion 直接不掛載，交給原本的靜態版面
 *
 * 【動畫不得決定結果（規格第十二條）】
 *
 * 這支元件只接收「第幾回合、誰出手」然後演出來。
 * 它不算傷害、不判勝負、沒有任何亂數——結果在按下開始那一刻就定了。
 */

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';

export type ClashSide = 'player' | 'opponent';

class CanvasBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export interface ClashProps {
  /** 我方出戰卡的卡面圖（縮圖，手牌已經載過，不會多一次請求）。 */
  playerArt: string;
  /** 對方出戰卡的卡面圖。 */
  opponentArt: string;
  /** 我方神獸的去背本體立繪。缺少時保留舞台，不替換成卡面。 */
  playerSpirit?: string | null;
  /** 對方神獸的去背本體立繪。 */
  opponentSpirit?: string | null;
  /** 這一次是誰出手。換人時卡片會從對應方向衝出去。 */
  attacker: ClashSide;
  /** 玩家元素光色，來自 lib/beast-battle-fx 的對照表。 */
  glow: string;
  /** 每次這個值變動就重演一次衝撞。用回合序號即可。 */
  beat: number;
  outcome?: 'PLAYER' | 'OPPONENT' | 'DRAW';
  /**
   * 現在是不是交鋒中。
   *
   * **這個元件必須整場常駐，靠這個旗標開關，不可以掛上去又卸掉。**
   * 每卸一次就丟掉一個 WebGL context；一場六次交鋒加重播，
   * 很快撞到瀏覽器的 context 上限，主控台開始噴
   * `THREE.WebGLRenderer: Context Lost.`，舞台從此整片空白——
   * 業主要的「本體衝過去對打」就這樣消失了（實測過）。
   * 太極憲章那條「物件永遠掛載、用開關切換」講的就是這件事。
   */
  active?: boolean;
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
  lost,
  won,
  shown,
}: {
  art: string;
  home: [number, number, number];
  lunging: boolean;
  glow: string;
  /** 是否使用本體立繪比例。 */
  spirit?: boolean;
  recoiling: boolean;
  lost?: boolean;
  won?: boolean;
  /*
    閒置時不顯示本體。

    這一段的容器在還沒交鋒時很矮，本體站上去會壓到
    「你的前鋒」與「一張一張揭・n/6」那兩行字（實測過）。
    舞台留著就有「站在台上打」的感覺，本體等交鋒再現身。
  */
  shown: boolean;
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
    const material = node.material as THREE.MeshBasicMaterial;
    material.opacity += ((lost ? 0 : 1) - material.opacity) * Math.min(1, delta * 4);
    if (lost) node.position.x -= direction * (1 - material.opacity) * 0.65;
    if (won) node.scale.multiplyScalar(1.1);
  });

  return (
    <mesh ref={mesh} position={home} visible={shown}>
      <planeGeometry args={spirit ? [SPIRIT_W, SPIRIT_H] : [CARD_W, CARD_H]} />
      {/*
        本體立繪帶 alpha，要開 transparent 才不會出現黑框；
        alphaTest 把幾乎全透明的像素直接丟掉，邊緣才不會有一圈灰。
      */}
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        transparent
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

/**
 * 格鬥舞台。
 *
 * 業主定調：「可以直接優化一張大卡片伸出的舞台（格鬥舞台的概念），
 * 用大數據去找授權現有的素材，作為舞台的概念。」
 *
 * 【為什麼要有舞台】
 *
 * 客戶審查時實測到的問題：交鋒舞台約 317×210 CSS px，
 * 但除了衝鋒那 0.6 秒之外**整片是空的**——按下一張之前一直盯著一塊黑。
 * 有地面才有「站在台上打」的感覺，沒有地面本體就是浮在虛空裡。
 *
 * 【素材沿用既有的，不另外找】
 *
 * `cc0-emerald-relief.jpg` 是專案裡本來就有的 CC0 材質（207KB），
 * WaterTreasureOrb 已經在用——載入行為驗證過，不多一個新資產。
 *
 * 【手機優先】
 *
 * 一個平面、一張既有材質、不開陰影、不用後製。
 * 舞台**常駐可見**（交鋒結束也還在），只有本體跟著交鋒開關——
 * 這樣不必為了填空白再多畫東西。
 */
function Arena() {
  const texture = useLoader(THREE.TextureLoader, '/textures/polyhaven/cc0-emerald-relief.jpg');
  const ground = useMemo(() => {
    const map = texture.clone();
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 1.4);
    map.needsUpdate = true;
    return map;
  }, [texture]);

  return (
    <group position={[0, -1.02, -0.5]}>
      {/* 地面。壓暗並半透明，讓它是舞台不是主角——本體才是主角。 */}
      <mesh rotation={[-1.28, 0, 0]}>
        <planeGeometry args={[7.4, 3.6]} />
        <meshBasicMaterial map={ground} color="#33506b" toneMapped={false} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* 台面中央的光暈，把視線收到兩隻交會的位置。用既有的撞擊光素材。 */}
      <mesh position={[0, 0.02, 0.7]} rotation={[-1.28, 0, 0]}>
        <planeGeometry args={[3.4, 1.9]} />
        <meshBasicMaterial color="#7dd3fc" toneMapped={false} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
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
  playerSpirit,
  opponentSpirit,
  attacker,
  glow,
  beat,
  outcome,
  active = true,
}: ClashProps) {
  const [lunging, setLunging] = useState(false);
  const [impact, setImpact] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    // Some mobile/automated browsers lose the GPU context without forwarding its event.
    // Keep a static view of the actual beasts visible while that context is unavailable.
    const check = () => { if (renderer.current) setContextLost(renderer.current.getContext().isContextLost()); };
    check();
    const timer = window.setInterval(check, 500);
    return () => window.clearInterval(timer);
  }, []);

  // 減少動態時整個不掛載，交給原本的靜態版面——不是把動畫調慢，是不做。
  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);

  // 每次 beat 變動演一次：衝出去，短暫停留，收回來。不在交鋒中就不演。
  useEffect(() => {
    if (reduced || !active) { setLunging(false); setImpact(false); return; }
    const start = setTimeout(() => setLunging(true), 40);
    const contact = setTimeout(() => setImpact(true), 170);
    const settle = setTimeout(() => setImpact(false), 430);
    const stop = setTimeout(() => setLunging(false), 620);
    return () => { clearTimeout(start); clearTimeout(stop); clearTimeout(contact); clearTimeout(settle); };
  }, [beat, reduced, active]);

  if (reduced) return null;

  const staticBeasts = active ? <div data-beast-static-fallback className="absolute inset-0 grid grid-cols-2 items-center gap-3 p-8" aria-label="神獸本體靜態展示">
    {[playerSpirit, opponentSpirit].map((src, index) => src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={index} src={src} alt={index === 0 ? '玩家神獸本體' : '對手神獸本體'} className="h-full max-h-full w-full min-h-0 object-contain" />
    ) : <span key={index} />)}
  </div> : null;

  return (
    <div
      data-beast-clash-3d
      data-clash-active={active ? 'yes' : 'no'}
      role="img"
      aria-label={contextLost ? '神獸本體靜態展示' : '雙方神獸本體交戰'}
      className="pointer-events-none absolute inset-0"
      /*
        整個元件常駐，絕不卸載——卸載會丟掉 WebGL context。

        **舞台一直看得見**，淡的是本體不是舞台：
        交鋒結束就整片變黑的話，客戶按下一張之前都在盯著一塊空的，
        那正是客戶審查時量到的問題。
      */
      style={{ opacity: 1, zIndex: 1 }}
    >
      {contextLost && staticBeasts}
      <CanvasBoundary fallback={staticBeasts}>
      <Canvas
        /*
          交鋒中連續算圖；閒置改成 demand——畫一次把舞台留在畫面上就停。
          用 never 的話舞台根本不會被畫出來，等於沒有舞台（手機優先 60FPS）。
        */
        frameloop={contextLost ? 'never' : active ? 'always' : 'demand'}
        style={{ visibility: contextLost ? 'hidden' : 'visible' }}
        fallback={staticBeasts}
        onCreated={({ gl }) => { renderer.current = gl; setContextLost(gl.getContext().isContextLost()); }}
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      >
        {/* 最多兩張本體立繪與一片光。 */}
        {/*
          衝過去的是神獸本體，不是卡。
          缺少立繪時保留舞台，不以卡面冒充本體。
        */}
        <Arena />
        {playerSpirit && <CardPlane
          art={playerSpirit}
          spirit={Boolean(playerSpirit)}
          home={[-1.05, -0.15, 0]}
          lunging={lunging && attacker === 'player'}
          recoiling={impact && attacker === 'opponent'}
          lost={outcome === 'OPPONENT'} won={outcome === 'PLAYER'}
          shown={active}
          glow={glow}
        />}
        {opponentSpirit && <CardPlane
          art={opponentSpirit}
          spirit={Boolean(opponentSpirit)}
          home={[1.05, 0.15, 0]}
          lunging={lunging && attacker === 'opponent'}
          recoiling={impact && attacker === 'player'}
          lost={outcome === 'PLAYER'} won={outcome === 'OPPONENT'}
          shown={active}
          glow={glow}
        />}
        <Impact active={impact} glow={glow} />
      </Canvas>
      </CanvasBoundary>
    </div>
  );
}
