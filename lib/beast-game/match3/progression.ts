/** 困難寶珠戰進度：三階卡池、八珠門檻封頂後逐關增強；不修改收藏卡原始數值。 */
import type { BeastElement } from '../elements';
import type { Rng } from './board';
import { MATCH3_ORB_ELEMENTS } from './config';

export interface ProgressionCard {
  id: string;
  form?: string;
  element: BeastElement;
  stats: { hp: number; attack: number };
}
export interface ProgressionStage {
  /** 已通過的關數；用於保存進度，不可改存 index（卡池階段）。 */
  readonly wins: number;
  readonly index: 0 | 1 | 2;
  readonly label: '簡單' | '中度' | '困難';
  readonly form: 'YOUNG' | 'ADULT' | 'GUARDIAN';
  readonly enemyCount: 4 | 5;
  readonly minChain: 3 | 4 | 5 | 6 | 7 | 8;
  /** 達到八珠後，每多過一關在原始關卡倍率上線性增加 10%。 */
  readonly strengthMultiplier: number;
  readonly hpScale: number;
  readonly attackScale: number;
  readonly simultaneous: boolean;
}

/**
 * 明列待實戰平衡的戰場轉換倍率。
 * 前兩關每回合只有一張卡反擊；末關由四獸的存活成員在同一回合合擊，
 * 所以末關的單卡攻擊換算較小，不把四倍出手次數再重複放大。
 */
const STAGES: readonly Omit<ProgressionStage, 'wins' | 'strengthMultiplier'>[] = Object.freeze([
  Object.freeze({ index: 0, label: '簡單', form: 'YOUNG', enemyCount: 5, minChain: 3, hpScale: 2, attackScale: .1, simultaneous: false }),
  Object.freeze({ index: 1, label: '中度', form: 'ADULT', enemyCount: 5, minChain: 4, hpScale: 3, attackScale: .15, simultaneous: false }),
  Object.freeze({ index: 2, label: '困難', form: 'GUARDIAN', enemyCount: 4, minChain: 5, hpScale: 4, attackScale: .075, simultaneous: true }),
]);

function normalizedWins(wins: number): number {
  if (!Number.isFinite(wins) || wins <= 0) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(wins));
}
export function progressionStage(wins: number): ProgressionStage {
  const count = normalizedWins(wins);
  const base = STAGES[Math.min(2, count)];
  // wins 5 首次八珠，wins 6 才增加 10%；線性成長，不逐關複利。
  const strengthMultiplier = 1 + Math.max(0, count - 5) * .1;
  return Object.freeze({
    ...base,
    wins: count,
    minChain: (3 + Math.min(5, count)) as ProgressionStage['minChain'],
    strengthMultiplier,
    hpScale: base.hpScale * strengthMultiplier,
    attackScale: base.attackScale * strengthMultiplier,
  });
}

/** 由已結算勝負呼叫一次；敗局留在原關，卡池封頂但過關進度持續。 */
export function nextProgressionWins(current: number, won: boolean): number {
  const count = normalizedWins(current);
  return won && count < Number.MAX_SAFE_INTEGER ? count + 1 : count;
}

/** 前兩關五色各選一張；末關使用全部四守護獸，絕不補造第五張。 */
export function selectProgressionEnemies<C extends ProgressionCard>(pool: readonly C[], rng: Rng, wins: number): C[] {
  const stage = progressionStage(wins);
  const candidates = pool.filter(c => c.form === stage.form).slice().sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(candidates.map(c => c.id)).size !== candidates.length) throw new Error('關卡卡池含重複卡片');
  if (stage.form === 'GUARDIAN') {
    if (candidates.length !== 4) throw new Error('四大神獸卡池不完整');
    return candidates;
  }
  return MATCH3_ORB_ELEMENTS.map(element => {
    const matching = candidates.filter(c => c.element === element);
    if (!matching.length) throw new Error('關卡缺少對應屬性的卡片');
    const sample = rng();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new Error('抽卡亂數超出範圍');
    return matching[Math.floor(sample * matching.length)];
  });
}

export function progressionEnemyStats(card: ProgressionCard, wins: number): { hp: number; maxHp: number; attack: number; cd: number } {
  const stage = progressionStage(wins);
  if (card.form !== stage.form) throw new Error('卡片不屬於本關卡');
  if (![card.stats.hp, card.stats.attack].every(n => Number.isFinite(n) && n > 0)) throw new Error('卡片原始數值不完整');
  const scaled = (base: number, factor: number) => Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.round(base * factor)));
  const hp = scaled(card.stats.hp, stage.hpScale);
  return { hp, maxHp: hp, attack: scaled(card.stats.attack, stage.attackScale), cd: 1 };
}
