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

/** 各部位在這張圖上的位置（0..1，圖片座標，左上為原點）：網格變形依它決定誰轉、誰動。 */
export interface RigAnchors {
  /** 頭的中心（含鬃毛） */
  head: readonly [number, number];
  /** 頭接上脖子的支點：頭以它為軸俯仰 */
  neck: readonly [number, number];
  /** 下顎的鉸鏈：下顎以它為軸開合 */
  jaw: readonly [number, number];
  /** 前爪中心 */
  claw: readonly [number, number];
  /** 前肢肩膀：前爪以它為軸揮擊 */
  shoulder: readonly [number, number];
  /** 兩隻後爪中心（奔跑時交替划動） */
  hind: readonly [readonly [number, number], readonly [number, number]];
  /** 這張圖的下顎原本張開的程度（弧度；0＝閉口）：開合動作以它為基準 */
  jawRest: number;
}

export interface RigFrameSpec {
  /** 檔名（不含副檔名），位於 public/beast-game/rig/<dir>/ */
  id: RigFrameId;
  /** 面積正規化係數（來自 manifest.json）：讓不同姿勢的身體大小看起來一致 */
  norm: number;
  /** 部位位置（有「活體」動作的神獸才有；剛體的白虎不需要） */
  anchors?: RigAnchors;
}

export type RigFrameId = 'bite-close' | 'land-crouch' | 'pounce-open' | 'run-gather' | 'run-reach';

/**
 * 神獸的動作個性：同一條時間軸，每隻神獸用自己的力道與節奏（純數字，不含任何結果）。
 * 四大神獸各有氣勢：白虎＝伏低暴衝、撲殺；青龍＝盤旋騰空、橫掃；朱雀＝高飛俯衝；玄武＝沉重碾壓。
 */
export interface RigStyle {
  /** 蓄勢時壓低身體的程度 0..0.3 */
  windup: number;
  /** 蓄勢時往後拉的距離（路徑比例） */
  pullback: number;
  /** 跳出卡片的騰空高度（以精靈高度為單位） */
  launchHop: number;
  /** 衝刺加速指數：越大越「先慢後爆」 */
  charge: number;
  /** 衝刺中的上下起伏 */
  chargeHop: number;
  /** 衝刺步伐循環次數 */
  gait: number;
  /** 撲擊時逼近鏡頭的放大倍率 */
  pounceScale: number;
  /** 撲擊弧線高度 */
  pounceHop: number;
  /** 命中震動力道 0..1.5 */
  shake: number;
  /** 殘影強度 0..1 */
  trail: number;
  /** 撕咬力道 0..1：命中後對手卡上的爪痕與碎裂（只給畫面用） */
  rend: number;
  /** 命中後連咬的次數（白虎：把卡片咬爛撕碎） */
  bites: number;
  /** 體型倍率（相對於基準大小）：龍比虎長，要更大才有氣勢 */
  size: number;
  /** 身體波浪擺動強度 0..1（蛇形身體：由頭傳到尾的波；0＝剛體，不切條） */
  wave: number;
}

export const RIG_STYLES = {
  /** 白虎：伏低、先慢後爆、撲殺、命中頓挫 */
  baihu: { windup: 0.14, pullback: 0.06, launchHop: 0.8, charge: 1.9, chargeHop: 0.09, gait: 2, pounceScale: 1.3, pounceHop: 0.5, shake: 1, trail: 1, rend: 1, bites: 3, size: 1, wave: 0 },
  /** 青龍：盤旋騰空、弧線大、橫掃（素材到位後套用） */
  qinglong: { windup: 0.06, pullback: 0.03, launchHop: 1.1, charge: 1.2, chargeHop: 0.24, gait: 1.5, pounceScale: 1.22, pounceHop: 0.8, shake: 0.7, trail: 0.3, rend: 0.85, bites: 3, size: 1.5, wave: 1 },
  /** 朱雀：高飛俯衝、速度快、震動輕 */
  zhuque: { windup: 0.05, pullback: 0.04, launchHop: 1.3, charge: 1.1, chargeHop: 0.3, gait: 1.5, pounceScale: 1.25, pounceHop: 1, shake: 0.5, trail: 1, rend: 0.6, bites: 2, size: 1.2, wave: 0.4 },
  /** 玄武：沉重碾壓、起伏小、震動最大 */
  xuanwu: { windup: 0.1, pullback: 0.02, launchHop: 0.3, charge: 2.4, chargeHop: 0.03, gait: 1.5, pounceScale: 1.18, pounceHop: 0.22, shake: 1.5, trail: 0.4, rend: 0.5, bites: 1, size: 1.3, wave: 0.12 },
} as const satisfies Record<string, RigStyle>;

export interface BeastRig {
  cardId: string;
  /** 動作個性 */
  style: RigStyle;
  /** 精靈資料夾（相對 /beast-game/rig/） */
  dir: string;
  frames: readonly RigFrameSpec[];
}

/** 白虎：數值取自 public/beast-game/rig/baihu/manifest.json（測試會核對兩邊一致）。 */
export const BAIHU_RIG: BeastRig = {
  cardId: 'beast_g_baihu',
  dir: 'baihu',
  style: RIG_STYLES.baihu,
  frames: [
    { id: 'bite-close', norm: 0.9329 },
    { id: 'land-crouch', norm: 0.9324 },
    { id: 'pounce-open', norm: 1.1066 },
    { id: 'run-gather', norm: 1 },
    { id: 'run-reach', norm: 1.1093 },
  ],
};

/**
 * 青龍：數值取自 public/beast-game/rig/qinglong/manifest.json（測試會核對兩邊一致）。
 * 無翼東方龍：蓄勢（卡內盤伏）、飛出（伸展飛行）、突進（盤成 S 形的飛行）、撲咬（張口俯衝）、咬合（閉口獠牙）。
 * 沿用同一組姿勢名稱：run-reach＝飛行伸展、run-gather＝S 形盤飛；沒有落地幀（咬完就地散去，不需要）。
 */
export const QINGLONG_RIG: BeastRig = {
  cardId: 'beast_g_qinglong',
  dir: 'qinglong',
  style: RIG_STYLES.qinglong,
  frames: [
    { id: 'bite-close', norm: 1, anchors: { head: [0.2, 0.29], neck: [0.38, 0.36], jaw: [0.27, 0.35], claw: [0.07, 0.62], shoulder: [0.2, 0.66], hind: [[0.37, 0.82], [0.84, 0.75]], jawRest: 0 } },
    { id: 'pounce-open', norm: 0.9813, anchors: { head: [0.21, 0.3], neck: [0.38, 0.36], jaw: [0.25, 0.37], claw: [0.05, 0.62], shoulder: [0.19, 0.68], hind: [[0.37, 0.88], [0.76, 0.9]], jawRest: 0.3 } },
    { id: 'run-gather', norm: 1.2064, anchors: { head: [0.14, 0.37], neck: [0.3, 0.4], jaw: [0.17, 0.45], claw: [0.05, 0.7], shoulder: [0.15, 0.77], hind: [[0.28, 0.92], [0.58, 0.82]], jawRest: 0.18 } },
    { id: 'run-reach', norm: 1.151, anchors: { head: [0.21, 0.31], neck: [0.38, 0.38], jaw: [0.24, 0.38], claw: [0.05, 0.68], shoulder: [0.17, 0.73], hind: [[0.37, 0.9], [0.82, 0.84]], jawRest: 0.16 } },
  ],
};

/** 已有關鍵幀的神獸。其餘神獸沒有就維持原本的卡片衝鋒演出，不受影響。 */
export const BEAST_RIGS: Readonly<Record<string, BeastRig>> = { [BAIHU_RIG.cardId]: BAIHU_RIG, [QINGLONG_RIG.cardId]: QINGLONG_RIG };

export function rigFor(cardId: string | null | undefined): BeastRig | null {
  return cardId ? BEAST_RIGS[cardId] ?? null : null;
}

export const rigFrameUrl = (rig: BeastRig, id: RigFrameId) => `/beast-game/rig/${rig.dir}/${id}.webp`;

/* ── 時間軸 ──────────────────────────────────────────────────────────────── */

/** 一次完整出擊的總長（毫秒）：蓄勢 → 跳出卡片 → 衝刺 → 撲咬 → 在對手卡前散去（不再跑回來）。 */
export const RIG_STRIKE_MS = 1500;
/** 命中（咬合）時刻（毫秒）：對手受擊反應與元素特效以此對齊。 */
export const RIG_IMPACT_MS = 1120;

/** 各階段（占總長的比例，區間 [起, 迄)）。 */
export const RIG_PHASES = {
  anticipate: [0, 0.13],
  leap: [0.13, 0.27],
  run: [0.27, 0.58],
  attack: [0.58, 0.78],
  recover: [0.78, 0.95],
  settle: [0.95, 1],
} as const;

/** 原始角色卡片隱藏的區間（占總長的比例）：跳出後隱藏，回到卡片前才恢復。與 BattleArena.module.css 的 rigCardAway 同步。 */
export const RIG_CARD_HIDDEN: readonly [number, number] = [0.14, 0.8];

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
  /** 身體震動力道 0..1.5（蓄勢顫抖、命中震盪；只給畫面用） */
  shake: number;
  /** 殘影強度 0..1 */
  trail: number;
  /** 腳下揚塵強度 0..1 */
  dust: number;
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
export function strikeFrame(t: number, style: RigStyle = RIG_STYLES.baihu): RigFrame {
  const time = clamp01(t);
  const frame: RigFrame = { layers: [], travel: { progress: 0, hop: 0 }, scale: 1, tilt: 0, squash: 1, alpha: 1, flash: 0, shake: 0, trail: 0, dust: 0 };
  const add = (id: RigFrameId, alpha: number) => { if (alpha > 0.001) frame.layers.push({ frame: id, alpha: clamp01(alpha) }); };
  /** 從 from 換成 to：w＝0 只有 from，w＝1 只有 to，中間 from 在下全不透明、to 在上漸顯。 */
  const cross = (from: RigFrameId, to: RigFrameId, w: number) => {
    if (w <= 0.001) add(from, 1);
    else if (w >= 0.999) add(to, 1);
    else { add(from, 1); add(to, w); }
  };

  const easeOut = (x: number) => 1 - (1 - clamp01(x)) * (1 - clamp01(x));
  // 活體神獸（龍）的下顎由網格變形開合，咬合與連咬一律用「張口」那張當底，閉口靠下顎轉上去，不換圖
  const living = style.wave > 0;
  if (time < RIG_PHASES.anticipate[1]) {
    // 蓄勢：在卡片裡伏低、往後拉、肌肉顫抖，把力量蓄滿（卡面姿勢＝面朝前的蹲伏）
    const k = smooth(within(time, RIG_PHASES.anticipate));
    add('bite-close', 1);
    frame.scale = lerp(0.34, 0.42, k);
    frame.squash = lerp(1, 1 - style.windup, k);
    frame.alpha = smooth(k * 1.7);
    frame.travel = { progress: -style.pullback * k, hop: 0 };
    frame.shake = 0.25 * k * style.shake;
  } else if (time < RIG_PHASES.leap[1]) {
    // 爆發：一蹬就出卡片，起步最猛、騰空放大、拖出殘影
    const k = within(time, RIG_PHASES.leap);
    cross('bite-close', 'run-reach', smooth((k - 0.05) * 5));
    frame.scale = lerp(0.42, 1, easeOut(k));
    frame.squash = lerp(1 - style.windup, 1.08, Math.sin(k * Math.PI * 0.5));
    frame.travel = { progress: lerp(-style.pullback, 0.3, easeOut(k)), hop: style.launchHop * Math.sin(k * Math.PI) };
    frame.tilt = 0.6 * smooth(k);
    frame.trail = k * style.trail;
    frame.dust = (1 - k) * 0.9;
  } else if (time < RIG_PHASES.run[1]) {
    // 突進：身體壓低、先慢後爆地加速，步伐沉穩有力，腳下揚塵、殘影拖長
    const k = within(time, RIG_PHASES.run);
    const u = k * style.gait;
    const mix = gallop(u);
    const rising = gallop(u + 0.004) >= mix;
    if (rising) cross('run-gather', 'run-reach', mix); else cross('run-reach', 'run-gather', 1 - mix);
    frame.scale = lerp(1, 1.04, k);
    frame.squash = 1 + 0.04 * Math.cos(u * Math.PI * 2);
    frame.travel = { progress: lerp(0.3, 1, Math.pow(k, style.charge)), hop: style.chargeHop * Math.abs(Math.sin(u * Math.PI)) };
    frame.tilt = 1;
    frame.trail = style.trail * (0.5 + 0.5 * k);
    frame.dust = 0.7 * (1 - Math.abs(Math.sin(u * Math.PI)));
  } else if (time < RIG_PHASES.attack[1]) {
    // 撲殺：騰空逼近、張口亮爪，咬合那一刻頓住，震動與白閃一起炸開（咬合時刻由 RIG_IMPACT_MS 對齊）
    const k = within(time, RIG_PHASES.attack);
    const bite = smooth((k - (IMPACT_K - 0.17)) / 0.17);
    if (k < IMPACT_K - 0.17) cross('run-reach', 'pounce-open', smooth(k * 5));
    else if (living) add('pounce-open', 1);
    else cross('pounce-open', 'bite-close', bite);
    const approach = clamp01(k / IMPACT_K);
    frame.scale = lerp(1.04, style.pounceScale, easeOut(approach));
    frame.squash = lerp(1.06, 0.93, bite);
    frame.travel = { progress: 1, hop: k < IMPACT_K ? style.pounceHop * Math.sin(approach * Math.PI * 0.85) : 0 };
    frame.tilt = 1;
    frame.flash = Math.max(0, 1 - Math.abs(k - IMPACT_K) / 0.14);
    frame.shake = k >= IMPACT_K - 0.02 ? style.shake * Math.max(0, 1 - (k - IMPACT_K) / 0.6) : 0;
    frame.trail = style.trail * (1 - approach) * 0.6;
  } else if (time < RIG_PHASES.recover[1]) {
    // 咬完就地散去：先頓住一拍（獵物倒下的重量感），再往前壓一寸、化作光霧淡出，不跑回去
    const raw = within(time, RIG_PHASES.recover);
    const hold = 0.6;
    const k = clamp01((raw - hold) / (1 - hold));
    add(living ? 'pounce-open' : 'bite-close', 1);
    // 連咬：下顎在命中後快速開合，像要把對手整張卡咬碎（活體神獸由網格變形處理）
    if (!living && raw < hold) add('pounce-open', Math.max(0, Math.sin((raw / hold) * Math.PI * style.bites * 2)) ** 0.5 * (1 - raw / hold * 0.3));
    frame.scale = style.pounceScale * (1 + 0.05 * smooth(k));
    frame.squash = 0.93;
    frame.travel = { progress: 1, hop: 0 };
    frame.tilt = 1;
    frame.alpha = 1 - smooth(k);
    frame.shake = raw < hold ? style.shake * (0.9 - 0.5 * raw / hold) : 0;
    frame.flash = 0.35 * (1 - smooth(raw));
  } else {
    // 已散去：交還給原始卡片（此刻戰場上沒有精靈）
    add('bite-close', 1);
    frame.alpha = 0;
    frame.scale = style.pounceScale;
    frame.travel = { progress: 1, hop: 0 };
    frame.tilt = 1;
  }
  return frame;
}

/**
 * 撕咬的視覺進度（純函式，只給畫面用）：命中那一刻起，對手卡上先劃出三道爪痕，
 * 再炸出碎片。slash／shards 都是 0..1 的進度，沒命中前為 0；style.rend 是力道。
 */
export function rendFrame(t: number, style: RigStyle = RIG_STYLES.baihu): { slash: number; shards: number; power: number } {
  const since = (clamp01(t) * RIG_STRIKE_MS - RIG_IMPACT_MS) / 1000; // 命中後經過的秒數
  if (since < 0 || since > 0.62) return { slash: 0, shards: 0, power: 0 };
  return { slash: clamp01(since / 0.09), shards: clamp01(since / 0.5), power: style.rend };
}


/**
 * 蛇形身體的波浪（純函式，只給畫面用）：u＝0 在頭、1 在尾（精靈本來面向左，圖片由左到右就是頭到尾）。
 * 回傳這一條的垂直位移（以精靈高度為單位）。波由頭往尾傳，頭幾乎不動（要瞄準對手）、尾巴擺幅最大；
 * 飛行與衝刺時最強、命中頓住時收斂（頭鎖定、尾巴還在甩）、散去時漸停。
 */
export function bodyWave(t: number, u: number, style: RigStyle = RIG_STYLES.qinglong): number {
  if (style.wave <= 0) return 0;
  const time = clamp01(t);
  const sec = (time * RIG_STRIKE_MS) / 1000;
  const intensity = time < RIG_PHASES.anticipate[1] ? 0.25
    : time < RIG_PHASES.attack[0] ? 1
      : time < RIG_PHASES.recover[0] ? lerp(1, 0.55, smooth(within(time, RIG_PHASES.attack)))
        : lerp(0.55, 0.2, smooth(within(time, RIG_PHASES.recover)));
  const x = clamp01(u);
  const envelope = 0.012 + 0.2 * Math.pow(x, 1.35); // 頭穩、尾大
  const phase = Math.PI * 2 * (1.7 * x - 3.4 * sec);
  const second = 0.35 * Math.sin(Math.PI * 2 * (3.1 * x - 5.1 * sec) + 1.1); // 二次諧波：細碎的抖動，像肌肉在傳力
  return style.wave * intensity * envelope * (Math.sin(phase) + second);
}

/* ── 活體：頭、下顎、前爪、後爪、身體、尾巴各自動（網格變形；純函式，只給畫面用） ───────────── */

/** 網格密度：格子越多變形越平滑，也越吃效能（22×16 約 700 個三角形，手機上仍順） */
export const RIG_MESH = { cols: 22, rows: 16 } as const;

export interface LivingPose {
  /** 頭俯仰（弧度，正＝低頭咬下） */
  headPitch: number;
  /** 頭往前探（以精靈高度為單位） */
  headThrust: number;
  /** 下顎張開（弧度；0＝閉口） */
  jaw: number;
  /** 前爪揮擊（弧度，正＝向前下方抓） */
  clawSwing: number;
  /** 兩隻後爪上下划動（以精靈高度為單位） */
  hind: readonly [number, number];
}

const TAU = Math.PI * 2;

/** 第 t 時刻各部位的動作量。每一段都對應真實的獵殺動作：蓄勢仰頭露牙、飛行時頭穩爪伸後腳交替、撲咬時頭探下顎大張前爪抓、咬合後連咬並左右撕扯。 */
export function livingPose(t: number, style: RigStyle = RIG_STYLES.qinglong): LivingPose {
  const rest: LivingPose = { headPitch: 0, headThrust: 0, jaw: 0, clawSwing: 0, hind: [0, 0] };
  if (style.wave <= 0) return rest;
  const time = clamp01(t);
  const sec = (time * RIG_STRIKE_MS) / 1000;
  const k = style.wave; // 幅度倍率
  const out = (p: LivingPose, fade = 1): LivingPose => ({
    headPitch: p.headPitch * k * fade, headThrust: p.headThrust * k * fade, jaw: p.jaw * fade, clawSwing: p.clawSwing * k * fade,
    hind: [p.hind[0] * k * fade, p.hind[1] * k * fade],
  });
  const easeOut = (x: number) => 1 - (1 - clamp01(x)) * (1 - clamp01(x));
  if (time < RIG_PHASES.anticipate[1]) {
    // 蓄勢：頭往後仰、下顎微開露牙、前爪收起蓄力
    const a = smooth(within(time, RIG_PHASES.anticipate));
    return out({ headPitch: -0.14 * a, headThrust: -0.025 * a, jaw: 0.1 * a, clawSwing: -0.18 * a, hind: [0, 0] });
  }
  if (time < RIG_PHASES.attack[0]) {
    // 爆發與突進：頭穩穩瞄準（輕微起伏）、下顎隨呼吸開合、前爪向前探、後爪交替划動
    const a = within(time, [RIG_PHASES.leap[0], RIG_PHASES.attack[0]]);
    return out({
      headPitch: lerp(-0.1, 0.02, smooth(a * 2)) + 0.03 * Math.sin(TAU * 3 * sec),
      headThrust: 0.02 + 0.015 * Math.sin(TAU * 3 * sec),
      jaw: 0.16 + 0.1 * Math.sin(TAU * 2.4 * sec),
      clawSwing: -0.12 + 0.14 * Math.sin(TAU * 2.4 * sec + 1),
      hind: [0.04 * Math.sin(TAU * 3.4 * sec), 0.04 * Math.sin(TAU * 3.4 * sec + Math.PI)],
    });
  }
  if (time < RIG_PHASES.attack[1]) {
    // 撲咬：頭往前下探、下顎張到最大、前爪向後蓄力再猛力下抓
    const a = clamp01(within(time, RIG_PHASES.attack) / IMPACT_K);
    return out({
      headPitch: lerp(0.02, 0.22, easeOut(a)),
      headThrust: lerp(0.02, 0.07, easeOut(a)),
      jaw: lerp(0.2, 0.44, easeOut(a)),
      clawSwing: a < 0.4 ? lerp(-0.12, -0.28, a / 0.4) : lerp(-0.28, 0.5, smooth((a - 0.4) / 0.6)),
      hind: [0.02, -0.02],
    });
  }
  if (time < RIG_PHASES.recover[0] + (RIG_PHASES.recover[1] - RIG_PHASES.recover[0]) * 0.6) {
    // 連咬：下顎快速開合、頭左右撕扯、前爪輪流抓
    const raw = within(time, RIG_PHASES.recover) / 0.6;
    const chomp = Math.max(0, Math.sin(raw * Math.PI * style.bites * 2));
    return out({
      headPitch: 0.2 + 0.1 * Math.sin(TAU * 6 * sec),
      headThrust: 0.07 - 0.03 * chomp,
      jaw: 0.4 * chomp,
      clawSwing: 0.4 * Math.sin(TAU * 4.5 * sec),
      hind: [0.02, -0.02],
    });
  }
  // 散去：動作漸停
  const f = 1 - smooth(within(time, [RIG_PHASES.recover[0] + (RIG_PHASES.recover[1] - RIG_PHASES.recover[0]) * 0.6, 1]));
  return out({ headPitch: 0.15, headThrust: 0.05, jaw: 0.1, clawSwing: 0.1, hind: [0, 0] }, f);
}

const rotate = (x: number, y: number, cx: number, cy: number, a: number): [number, number] => {
  const dx = x - cx; const dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
};
const falloff = (d: number, r0: number, r1: number) => 1 - smooth((d - r0) / (r1 - r0));

/**
 * 圖上 (u,v) 這一點此刻要移到哪裡（回傳位移，單位＝精靈高度）。
 * 在像素比例下計算（寬＝aspect、高＝1），各部位只影響自己附近：
 * 頭＋下顎以脖子與下顎鉸鏈為軸轉動，前爪以肩膀為軸揮擊，後爪上下划動，身體尾巴套 bodyWave 的波。
 */
export function meshDisplace(u: number, v: number, aspect: number, anchors: RigAnchors, pose: LivingPose, t: number, style: RigStyle = RIG_STYLES.qinglong): [number, number] {
  const px = u * aspect; const py = v;
  let dx = 0; let dy = bodyWave(t, u, style);
  const at = (a: readonly [number, number]): [number, number] => [a[0] * aspect, a[1]];
  const dist = (a: [number, number]) => Math.hypot(px - a[0], py - a[1]);

  // 頭（含鬃毛）：以脖子為軸俯仰，並往前探
  const head = at(anchors.head); const neck = at(anchors.neck);
  const wh = falloff(dist(head), 0.2, 0.5);
  if (wh > 0) {
    const [rx, ry] = rotate(px, py, neck[0], neck[1], -pose.headPitch);
    dx += wh * (rx - px - pose.headThrust);
    dy += wh * (ry - py);
  }
  // 下顎：以鉸鏈為軸張開（只影響鉸鏈下方、嘴的一側）
  const hinge = at(anchors.jaw);
  const lower = smooth((py - (hinge[1] - 0.03)) / 0.07);
  const wj = falloff(Math.hypot(px - (hinge[0] - 0.1), py - (hinge[1] + 0.05)), 0.08, 0.2) * lower * smooth((hinge[0] + 0.04 - px) / 0.08);
  if (wj > 0) {
    const [rx, ry] = rotate(px, py, hinge[0], hinge[1], -(pose.jaw - anchors.jawRest));
    dx += wj * (rx - px);
    dy += wj * (ry - py);
  }
  // 前爪：以肩膀為軸向前下方揮擊
  const claw = at(anchors.claw); const shoulder = at(anchors.shoulder);
  const wc = falloff(dist(claw), 0.1, 0.27);
  if (wc > 0) {
    const [rx, ry] = rotate(px, py, shoulder[0], shoulder[1], -pose.clawSwing);
    dx += wc * (rx - px);
    dy += wc * (ry - py);
  }
  // 後爪：交替上下划動
  for (let i = 0; i < 2; i++) {
    const w = falloff(dist(at(anchors.hind[i])), 0.09, 0.22);
    dy += w * pose.hind[i];
  }
  return [dx, dy];
}

/* ── 時間感與鏡頭（純函式，只給畫面用，不影響任何戰鬥結果） ─────────────────────────────── */

/** 出擊動畫真正開始時，舞台發給聲音的視窗事件名稱（只當訊號，不帶戰鬥資料）。 */
export const RIG_STRIKE_EVENT = 'beast-rig-strike';

/** 咬合後慢動作的真實長度（毫秒）與速度：0.3 倍速約 120 毫秒，之後略加速追回，總長不變。 */
export const RIG_SLOWMO_MS = 120;
export const RIG_SLOWMO_RATE = 0.3;

/**
 * 真實時間 → 動畫時間（兩者都是 0..1 的比例）。
 * 咬合那一刻之前 1:1；咬合後 0.3 倍速慢動作約 120 毫秒（讓玩家看清那一口）；之後略加速追回，
 * 所以總長仍是 RIG_STRIKE_MS：對手受擊、元素特效、輸入鎖的時間都不用改。單調遞增、終點為 1。
 */
export function storyTime(real: number): number {
  const r = clamp01(real);
  const impact = RIG_IMPACT_MS / RIG_STRIKE_MS;
  const slowEnd = impact + RIG_SLOWMO_MS / RIG_STRIKE_MS;
  if (r <= impact) return r;
  if (r <= slowEnd) return impact + (r - impact) * RIG_SLOWMO_RATE;
  const reached = impact + (slowEnd - impact) * RIG_SLOWMO_RATE;
  return reached + (r - slowEnd) * ((1 - reached) / (1 - slowEnd));
}

export interface CameraFrame {
  /** 戰場水平／垂直震動（像素，已含方向） */
  shakeX: number;
  shakeY: number;
  /** 鏡頭放大倍率（以對手卡為中心）：撲近時慢慢推進，咬合瞬間最大，之後回彈 */
  zoom: number;
}

/** 第 t（動畫時間 0..1）時刻的鏡頭：撲近推進、咬合重震、之後回彈。震動用固定頻率正弦，不用亂數。 */
export function cameraFrame(t: number, style: RigStyle = RIG_STYLES.baihu): CameraFrame {
  const time = clamp01(t);
  const impact = RIG_IMPACT_MS / RIG_STRIKE_MS;
  const sec = (time * RIG_STRIKE_MS) / 1000;
  const push = smooth(within(time, [RIG_PHASES.run[0], impact])); // 衝刺到咬合：推進
  const after = Math.max(0, time - impact) * RIG_STRIKE_MS / 1000; // 咬合後經過的秒數
  const recoil = after > 0 ? Math.exp(-after * 12) : 0; // 回彈：咬合瞬間最強，約 0.25 秒內消失
  const zoom = 1 + 0.035 * push * (time <= impact ? 1 : Math.max(0, 1 - after * 6)) + 0.02 * recoil * style.shake;
  const amp = style.shake * 7 * recoil;
  return { shakeX: Math.sin(sec * 2 * Math.PI * 38) * amp, shakeY: Math.cos(sec * 2 * Math.PI * 31) * amp * 0.7, zoom };
}
