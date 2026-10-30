/**
 * 五元素顯示色盤（v0.8 動效組）——只供畫面使用，不含任何戰鬥數值。
 * 風 #54d9ad、空 #bd97ff、水 #68b9ff、火 #ff747a、地 #efca77（沿用 v0.7）。
 */
export const BEAD_ELEMENTS = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'] as const;
export type BeadElement = (typeof BEAD_ELEMENTS)[number];

export const ELEMENT_PALETTE: Record<BeadElement, string> = {
  AIR: '#54d9ad',
  SPACE: '#bd97ff',
  WATER: '#68b9ff',
  FIRE: '#ff747a',
  EARTH: '#efca77',
};

export const ELEMENT_LABEL: Record<BeadElement, string> = {
  AIR: '風',
  SPACE: '空',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};

/** 魔珠外觀：規格未核准前一律關閉。 */
export const MAGIC_BEAD_VISUALS_ENABLED = false as const;

/**
 * 視覺強度上限：連線長度不設上限（10 顆以上皆可），
 * 但畫面強度只算到 10 顆，超過 10 顆一律播 10 顆的效果。
 * 這只是「畫面強度」夾值，真正傷害由引擎計算，不在這裡。
 */
export const MOTION_POWER_CAP = 10;
export const MOTION_POWER_MIN = 3;

export function effectivePower(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.min(Math.floor(count), MOTION_POWER_CAP);
}

/** 0..1：3 顆 = 0，10 顆（含以上）= 1。 */
export function powerRatio(count: number): number {
  const p = effectivePower(count);
  return Math.max(0, (p - MOTION_POWER_MIN) / (MOTION_POWER_CAP - MOTION_POWER_MIN));
}

/** 連鎖強度（與連線長度分開的維度），只影響畫面；第 5 連鎖以上視覺同第 5 連鎖。 */
export function cascadeScale(cascadeStep: number): number {
  const s = Math.max(1, Math.min(Math.floor(cascadeStep) || 1, 5));
  return 1 + (s - 1) * 0.18;
}

/**
 * 魔珠（顯示用規則，2026-10-29 使用者更新）：
 * 連線 N ≥ 4 顆 → 生成一顆魔珠，強度 magicPower = N，「不設上限」（12 連 → 12）。
 * 10 顆上限只套用在一般連線攻擊（effectivePower），不套用在魔珠。
 * 真正傷害由引擎計算；這裡只決定畫面。
 */
export const MAGIC_BEAD_MIN = 4;
export function magicPowerFor(count: number): number {
  if (!Number.isFinite(count)) return 0;
  const n = Math.floor(count);
  return n >= MAGIC_BEAD_MIN ? n : 0;
}
/** 魔珠光暈強度 0..1：隨 N 持續增加（對數成長，不會封頂成固定值）。 */
export function magicGlow(power: number): number {
  if (power < MAGIC_BEAD_MIN) return 0;
  return 1 - 1 / Math.log2(power);
}

/**
 * 五珠技：剛好 5 顆同色連線才觸發（4 顆、6 顆都不算）。
 * 與一般攻擊（3+，畫面上限 10）、魔珠（4+，magicPower=N）分開。
 * 示範用預設數值在 lib/beast-game/motion-demo-config.ts（可調整的預設值，非正式引擎數值）。
 */
export const SKILL5_COUNT = 5;
export function skill5For(count: number): boolean {
  return Math.floor(count) === SKILL5_COUNT;
}

/** 事件欄位 magic / magicPower / skill5 皆可省略；缺少時視為一般特效。 */
export function normalizeBeadEvent<T extends { element: BeadElement; count: number; cascadeStep?: number; eligible?: boolean; magic?: boolean; magicPower?: number; skill5?: boolean }>(ev: T) {
  const mp = typeof ev.magicPower === 'number' && Number.isFinite(ev.magicPower) ? Math.max(0, Math.floor(ev.magicPower)) : 0;
  return { ...ev, cascadeStep: typeof ev.cascadeStep === 'number' && ev.cascadeStep >= 1 ? ev.cascadeStep : 1, eligible: ev.eligible !== false, magic: ev.magic === true, magicPower: mp, skill5: ev.skill5 === true };
}
