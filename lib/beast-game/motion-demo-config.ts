/**
 * 寶珠動效「示範」數值（可調整的預設值 TUNABLE DEFAULTS）。
 * 只給 /beast-game/motion-preview 示範頁使用；不是正式引擎數值，
 * 不讀、不改任何卡片數值或引擎設定。正式傷害一律以引擎為準。
 * 擁有者 2026-10-29：「先依邏輯推算，之後再調」。
 */
import { effectivePower, skill5For, type BeadElement } from './element-palette';

export const MOTION_DEMO_CONFIG = {
  /** 每顆有效寶珠的基礎傷害。 */
  base: 10,
  /** 每顆寶珠給同元素卡的能量。 */
  energyPerBead: 10,
  /** 能量上限；滿了可點卡發動技能。 */
  energyMax: 100,
  /** 點滿能量卡片發動技能：skillMultiplier × base。 */
  skillMultiplier: 15,
  /** 示範敵人血量。 */
  enemyHp: 600,
  /** 同元素有多張卡時：選中的卡出手拿全額能量，其他同元素卡拿這個比例（預設一半）。 */
  sameElementShare: 0.5,
  /** 出戰隊伍張數。 */
  teamSize: 5,
} as const;

export type DemoHit = { normal: number; magic: number; total: number; energy: number; fillEnergy: boolean };

/**
 * 一般攻擊 = min(N,10) × base；魔珠 = magicPower × base（不設上限）；
 * 五珠技 = 5 顆一般攻擊 + 該元素卡能量直接補滿（技能就緒）。
 */
export function demoHit(count: number, magicPower = 0, cfg = MOTION_DEMO_CONFIG): DemoHit {
  const normal = effectivePower(count) * cfg.base;
  const magic = Math.max(0, Math.floor(magicPower)) * cfg.base;
  const fillEnergy = skill5For(count);
  const energy = fillEnergy ? cfg.energyMax : effectivePower(count) * cfg.energyPerBead;
  return { normal, magic, total: normal + magic, energy, fillEnergy };
}

export function demoSkillHit(cfg = MOTION_DEMO_CONFIG): number {
  return cfg.skillMultiplier * cfg.base;
}

/** 出戰隊伍的一格：正式卡 id 與主元素。 */
export type TeamSlot = { id: string; element: BeadElement };
export type Selection = Partial<Record<BeadElement, number>>;

/** 出手卡：同元素有選中卡就用它，否則第一張同元素卡；沒有同元素卡回傳 -1（不攻擊）。魔珠、五珠技同規則。 */
export function attackerFor(team: readonly TeamSlot[], el: BeadElement, selected: Selection = {}): number {
  const idx = team.map((t, i) => (t.element === el ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return -1;
  const sel = selected[el];
  return sel !== undefined && idx.includes(sel) ? sel : idx[0];
}

/** 每格能量增量：出手卡全額（五珠技直接補滿），其他同元素卡 × sameElementShare，其餘 0。 */
export function energyGains(team: readonly TeamSlot[], el: BeadElement, selected: Selection, count: number, energyNow: readonly number[], cfg = MOTION_DEMO_CONFIG): number[] {
  const a = attackerFor(team, el, selected);
  const h = demoHit(count, 0, cfg);
  return team.map((t, i) => {
    if (a < 0 || t.element !== el) return 0;
    if (i === a) return h.fillEnergy ? Math.max(0, cfg.energyMax - (energyNow[i] ?? 0)) : h.energy;
    return Math.floor(h.energy * cfg.sameElementShare);
  });
}

/** 元素覆蓋：每個元素在隊伍中的張數。 */
export function coverage(team: readonly TeamSlot[], els: readonly BeadElement[]): Record<string, number> {
  return Object.fromEntries(els.map((e) => [e, team.filter((t) => t.element === e).length]));
}
