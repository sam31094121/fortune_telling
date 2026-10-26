/**
 * 神獸戰鬥動畫（純運算：不讀 Match、不決定任何結果、不用亂數）
 * ============================================================================
 *
 * 做法：以新版卡面為唯一美術母版，用專案影像流程（scripts/gen-beast-rig-poses.mjs）產出
 * 「同一隻神獸」的幾個關鍵姿勢（奔跑伸展、奔跑收腳、撲擊張嘴、咬合、落地），
 * 經黑底去背（scripts/build-beast-rig-sprites.mjs）後放在 public/beast-game/rig/<card>/。
 * 這裡只回答「第 t 時刻要疊哪幾張關鍵幀、各占多少、站在路徑哪裡、轉多少度」。
 *
 * 動畫不得決定戰鬥結果（神獸卡技能檔〈八〉規格第十二條）：本檔不匯入任何會算勝負的函式，
 * 何時播由上層依後端戰報決定，播多久是下面的固定常數。
 *
 * 目前只有白虎；青龍、朱雀、玄武之後各補一筆 BEAST_RIGS 與各自的關鍵幀即可，引擎不必改。
 */

export interface RigFrameSpec {
  /** 檔名（不含副檔名），位於 public/beast-game/rig/<dir>/ */
  id: RigFrameId;
  /** 面積正規化係數（來自 manifest.json）：讓不同姿勢的身體大小看起來一致 */
  norm: number;
}

export type RigFrameId = 'bite-close' | 'land-crouch' | 'pounce-open' | 'run-gather' | 'run-reach';

export interface BeastRig {
  cardId: string;
  /** 精靈資料夾（相對 /beast-game/rig/） */
  dir: string;
  frames: readonly RigFrameSpec[];
}

/** 白虎：數值取自 public/beast-game/rig/baihu/manifest.json（測試會核對兩邊一致）。 */
export const BAIHU_RIG: BeastRig = {
  cardId: 'beast_g_baihu',
  dir: 'baihu',
  frames: [
    { id: 'bite-close', norm: 0.9289 },
    { id: 'land-crouch', norm: 0.9356 },
    { id: 'pounce-open', norm: 1.1158 },
    { id: 'run-gather', norm: 1 },
    { id: 'run-reach', norm: 1.1538 },
  ],
};

/** 已有關鍵幀的神獸。其餘神獸沒有就維持原本的卡片衝鋒演出，不受影響。 */
export const BEAST_RIGS: Readonly<Record<string, BeastRig>> = { [BAIHU_RIG.cardId]: BAIHU_RIG };

export function rigFor(cardId: string | null | undefined): BeastRig | null {
  return cardId ? BEAST_RIGS[cardId] ?? null : null;
}

export const rigFrameUrl = (rig: BeastRig, id: RigFrameId) => `/beast-game/rig/${rig.dir}/${id}.webp`;

/* ── 時間軸 ──────────────────────────────────────────────────────────────── */

/** 一次完整出擊的總長（毫秒）：蓄勢 → 跳出卡片 → 奔跑 → 攻擊 → 返回 → 回到卡片。 */
export const RIG_STRIKE_MS = 1800;
/** 命中（咬合）時刻（毫秒）：對手受擊反應與元素特效以此對齊。 */
export const RIG_IMPACT_MS = 1120;

/** 各階段（占總長的比例，區間 [起, 迄)）。 */
export const RIG_PHASES = {
  anticipate: [0, 0.12],
  leap: [0.12, 0.28],
  run: [0.28, 0.56],
  attack: [0.56, 0.66],
  recover: [0.66, 0.9],
  settle: [0.9, 1],
} as const;

/** 原始角色卡片隱藏的區間（占總長的比例）：跳出後隱藏，回到卡片前才恢復。與 BattleArena.module.css 的 rigCardAway 同步。 */
export const RIG_CARD_HIDDEN: readonly [number, number] = [0.14, 0.9];

/** 咬合時刻在攻擊階段裡的相對位置（0..1）：下顎闔上與白閃都以它為準。 */
const IMPACT_K = (RIG_IMPACT_MS / RIG_STRIKE_MS - RIG_PHASES.attack[0]) / (RIG_PHASES.attack[1] - RIG_PHASES.attack[0]);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
const within = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));

export interface RigLayer {
  frame: RigFrameId;
  /** 此幀的不透明度 0..1（同一時刻各層加總不必為 1，由繪製端疊加） */
  alpha: number;
}

export interface RigTravel {
  /** 0＝在卡片位置，1＝在攻擊位置 */
  progress: number;
  /** 離地高度（以精靈高度為單位） */
  hop: number;
}

export interface RigFrame {
  layers: RigLayer[];
  travel: RigTravel;
  /** 整體縮放（相對於卡片高度） */
  scale: number;
  /** 往對手方向傾斜的程度 0..1（實際角度由繪製端依路徑算） */
  tilt: number;
  /** 垂直壓縮／伸展（以腳底為基準，1＝不變） */
  squash: number;
  /** 整體不透明度 */
  alpha: number;
  /** 咬合瞬間的閃光強度 0..1（只給畫面用，不影響結果） */
  flash: number;
}

/**
 * 兩個姿勢在交替奔跑時的混合比例：u 為 0..1 的步伐相位。
 * 轉換只花約 60 毫秒：不同姿勢的輪廓不同，長時間交疊會變成「重影」，所以寧可快切、不要慢溶。
 */
function gallop(u: number): number {
  const s = Math.sin(u * Math.PI * 2);
  return smooth(0.5 + s * 2.6);
}

/**
 * 第 t（0..1）時刻要疊哪些關鍵幀。純函式：同一個 t 永遠得到同一個畫面。
 *
 * 換姿勢一律用「下面的姿勢維持全不透明、上面的姿勢漸顯」的疊法（不是兩張各半透明），
 * 這樣任何一刻身體的覆蓋都是完整的，不會出現半透明的幽靈身體。
 */
export function strikeFrame(t: number): RigFrame {
  const time = clamp01(t);
  const frame: RigFrame = { layers: [], travel: { progress: 0, hop: 0 }, scale: 1, tilt: 0, squash: 1, alpha: 1, flash: 0 };
  const add = (id: RigFrameId, alpha: number) => { if (alpha > 0.001) frame.layers.push({ frame: id, alpha: clamp01(alpha) }); };
  /** 從 from 換成 to：w＝0 只有 from，w＝1 只有 to，中間 from 在下全不透明、to 在上漸顯。 */
  const cross = (from: RigFrameId, to: RigFrameId, w: number) => {
    if (w <= 0.001) add(from, 1);
    else if (w >= 0.999) add(to, 1);
    else { add(from, 1); add(to, w); }
  };

  if (time < RIG_PHASES.anticipate[1]) {
    // 蓄勢：在卡片裡蹲低、漸顯（卡面姿勢＝面朝前的蹲伏）
    const k = smooth(within(time, RIG_PHASES.anticipate));
    add('bite-close', 1);
    frame.scale = lerp(0.34, 0.42, k);
    frame.squash = lerp(1, 0.9, k);
    frame.alpha = smooth(k * 1.7);
  } else if (time < RIG_PHASES.leap[1]) {
    // 跳出卡片：從蹲伏換成騰空伸展，同時放大、離開卡片
    const k = within(time, RIG_PHASES.leap);
    const s = smooth(k);
    cross('bite-close', 'run-reach', smooth((k - 0.05) * 5));
    frame.scale = lerp(0.42, 1, s);
    frame.squash = lerp(0.9, 1.06, Math.sin(k * Math.PI * 0.5));
    frame.travel = { progress: lerp(0, 0.3, s), hop: 0.55 * Math.sin(k * Math.PI) };
    frame.tilt = 0.6 * s;
  } else if (time < RIG_PHASES.run[1]) {
    // 奔跑：收腳 ↔ 伸展交替，兩段縱躍
    const k = within(time, RIG_PHASES.run);
    const u = k * 2.5;
    const mix = gallop(u);
    const rising = gallop(u + 0.004) >= mix; // 伸展正在換進來
    if (rising) cross('run-gather', 'run-reach', mix); else cross('run-reach', 'run-gather', 1 - mix);
    frame.scale = 1;
    frame.squash = 1 + 0.035 * Math.cos(k * Math.PI * 2 * 2.5 * 2);
    frame.travel = { progress: lerp(0.3, 1, smooth(k)), hop: 0.16 * Math.abs(Math.sin(k * Math.PI * 2)) };
    frame.tilt = 1;
  } else if (time < RIG_PHASES.attack[1]) {
    // 攻擊：撲出張嘴 → 咬合落爪；咬合時刻（約 70%）由 RIG_IMPACT_MS 對齊
    const k = within(time, RIG_PHASES.attack);
    const bite = smooth((k - (IMPACT_K - 0.17)) / 0.17);
    if (k < IMPACT_K - 0.17) cross('run-reach', 'pounce-open', smooth(k * 5));
    else cross('pounce-open', 'bite-close', bite);
    frame.scale = lerp(1, 1.1, Math.sin(Math.min(1, k * 1.3) * Math.PI * 0.5));
    frame.squash = lerp(1.04, 0.95, bite);
    frame.travel = { progress: 1, hop: 0.05 * (1 - bite) };
    frame.tilt = 1;
    frame.flash = Math.max(0, 1 - Math.abs(k - IMPACT_K) / 0.14);
  } else if (time < RIG_PHASES.recover[1]) {
    // 返回：向後縱躍回到卡片，身體漸縮回卡片尺寸，姿勢由咬合換成伸展、收腳、落地
    const k = within(time, RIG_PHASES.recover);
    const s = smooth(k);
    if (k < 0.3) cross('bite-close', 'run-reach', smooth(k * 6));
    else if (k < 0.72) cross('run-reach', 'run-gather', smooth((k - 0.3) * 7));
    else cross('run-gather', 'land-crouch', smooth((k - 0.72) * 7));
    frame.scale = lerp(1, 0.55, s);
    frame.travel = { progress: lerp(1, 0.08, s), hop: 0.3 * Math.sin(k * Math.PI) };
    frame.tilt = 1 - s * 0.9;
  } else {
    // 回到卡片：落地緩衝 → 縮進卡片，淡出，交還給原始卡片
    const k = within(time, RIG_PHASES.settle);
    cross('land-crouch', 'bite-close', smooth(k * 1.6));
    frame.scale = lerp(0.55, 0.42, smooth(k));
    frame.squash = 1 - 0.1 * Math.sin(Math.min(1, k * 1.6) * Math.PI) * (1 - k);
    frame.travel = { progress: lerp(0.08, 0, smooth(k)), hop: 0 };
    frame.alpha = 1 - smooth(clamp01((k - 0.35) / 0.65));
  }
  return frame;
}
