/**
 * 斷風輪（五階風屬寶器）的加速連擊節奏。
 *
 * 語音「科魯」對五階寶器裡「輪／魯」最接近，故以此為科魯。
 * 只改演出時序與連擊窗，不改傷害、消耗、回合或能量公式。
 */

export const KELU_ELEMENT = 'AIR' as const;
export const KELU_VARIANT = 4;
export const KELU_NAME = '斷風輪';

/** 忙碌剛解除後，再按可接上一段連擊的時間窗。 */
export const KELU_COMBO_WINDOW_MS = 700;

/** 其他四項寶器維持的既有時序，此模組不使用，僅作對照。 */
export const OTHER_TREASURE_DAMAGE_MS = 950;
export const OTHER_TREASURE_CLEAR_MS = 1900;
export const OTHER_TREASURE_FLIGHT_MS = 1700;

export function isKeluWeapon(element: string, variant: number): boolean {
  return element === KELU_ELEMENT && variant === KELU_VARIANT;
}

export type KeluTiming = {
  /** 1 起算的連擊段數 */
  chain: number;
  /** 飛行／命中動畫時長 */
  flightMs: number;
  /** 自按下起，套用伺服端已確認的傷害（不提前套用） */
  damageAt: number;
  /** 自按下起，解除忙碌並允許再按 */
  clearAt: number;
};

const TABLE: readonly Omit<KeluTiming, 'chain'>[] = [
  { flightMs: 560, damageAt: 170, clearAt: 300 },
  { flightMs: 400, damageAt: 120, clearAt: 210 },
  { flightMs: 280, damageAt: 90, clearAt: 150 },
];

export function keluTiming(chain: number): KeluTiming {
  const step = Number.isFinite(chain) ? Math.max(1, Math.floor(chain)) : 1;
  const row = TABLE[Math.min(step, TABLE.length) - 1];
  return { chain: step, flightMs: row.flightMs, damageAt: row.damageAt, clearAt: row.clearAt };
}

export type KeluComboState = { chain: number; expiresAt: number };

export function emptyKeluCombo(): KeluComboState {
  return { chain: 0, expiresAt: 0 };
}

/**
 * 依按下時間推進連擊。窗內再按則段數 +1，否則從 1 重起。
 * expiresAt = 本次 clearAt + 連擊窗，讓玩家在剛能再按之後還接得上。
 */
export function advanceKeluCombo(
  state: KeluComboState,
  now: number,
  windowMs = KELU_COMBO_WINDOW_MS,
): { state: KeluComboState; timing: KeluTiming } {
  const chain = state.chain > 0 && now <= state.expiresAt ? state.chain + 1 : 1;
  const timing = keluTiming(chain);
  return { state: { chain, expiresAt: now + timing.clearAt + windowMs }, timing };
}
