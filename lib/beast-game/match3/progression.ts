/** 困難寶珠戰進度：三階卡池、四珠攻擊門檻與逐關增強；不修改收藏卡原始數值。 */
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
  readonly guardianCount: 0 | 1 | 2 | 3 | 4;
  readonly minChain: 4;
  /** 達到八珠後，每多過一關在原始關卡倍率上線性增加 10%。 */
  readonly strengthMultiplier: number;
  readonly hpScale: number;
  readonly attackScale: number;
  readonly simultaneous: boolean;
}

/**
 * 明列待實戰平衡的戰場轉換倍率。
 * 四獸集齊前每回合只有一張卡反擊；第十一關起由四獸存活成員同回合合擊，
 * 所以末關的單卡攻擊換算較小，不把四倍出手次數再重複放大。
 */
const STAGES: readonly Omit<ProgressionStage, 'wins' | 'strengthMultiplier' | 'guardianCount'>[] = Object.freeze([
  Object.freeze({ index: 0, label: '簡單', form: 'YOUNG', enemyCount: 5, minChain: 4, hpScale: 2, attackScale: .1, simultaneous: false }),
  Object.freeze({ index: 1, label: '中度', form: 'ADULT', enemyCount: 5, minChain: 4, hpScale: 3, attackScale: .15, simultaneous: false }),
  Object.freeze({ index: 2, label: '困難', form: 'GUARDIAN', enemyCount: 4, minChain: 4, hpScale: 4, attackScale: .075, simultaneous: true }),
]);

function normalizedWins(wins: number): number {
  if (!Number.isFinite(wins) || wins <= 0) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(wins));
}
export function progressionStage(wins: number): ProgressionStage {
  const count = normalizedWins(wins);
  const base = STAGES[count === 0 ? 0 : count < 7 ? 1 : 2];
  const guardianCount = Math.min(4, Math.max(0, count - 6)) as ProgressionStage['guardianCount'];
  // wins 5 首次八珠，wins 6 才增加 10%；線性成長，不逐關複利。
  const strengthMultiplier = 1 + Math.max(0, count - 5) * .1;
  return Object.freeze({
    ...base,
    index: Math.min(2, count) as ProgressionStage['index'],
    label: STAGES[Math.min(2, count)].label,
    guardianCount,
    simultaneous: guardianCount === 4,
    wins: count,
    minChain: 4,
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

/** Stage 8–10 introduces one guardian at a time; real adults fill the four slots. */
export function selectProgressionEnemies<C extends ProgressionCard>(pool: readonly C[], rng: Rng, wins: number): C[] {
  const stage = progressionStage(wins);
  const candidates = pool.filter(c => c.form === stage.form).slice().sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(candidates.map(c => c.id)).size !== candidates.length) throw new Error('關卡卡池含重複卡片');
  if (stage.form === 'GUARDIAN') {
    if (candidates.length !== 4) throw new Error('四大神獸卡池不完整');
    const selected = candidates.slice(0, stage.guardianCount);
    const adults = pool.filter(c => c.form === 'ADULT').slice().sort((a, b) => a.id.localeCompare(b.id));
    if (new Set(adults.map(c => c.id)).size !== adults.length || adults.length < 4 - selected.length) throw new Error('成獸補位卡池不完整');
    while (selected.length < 4) {
      const sample = rng();
      if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new Error('抽卡亂數超出範圍');
      selected.push(adults.splice(Math.floor(sample * adults.length), 1)[0]);
    }
    if (new Set(selected.map(c => c.id)).size !== selected.length) throw new Error('關卡卡池含重複卡片');
    return selected;
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
  const mixedAdult = stage.guardianCount > 0 && stage.guardianCount < 4 && card.form === 'ADULT';
  if (card.form !== stage.form && !mixedAdult) throw new Error('卡片不屬於本關卡');
  if (![card.stats.hp, card.stats.attack].every(n => Number.isFinite(n) && n > 0)) throw new Error('卡片原始數值不完整');
  const scaled = (base: number, factor: number) => Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.round(base * factor)));
  // Mixed adults retain adult scales; guardian scales are never applied twice.
  const hpScale = mixedAdult ? STAGES[1].hpScale * stage.strengthMultiplier : stage.hpScale;
  const attackScale = mixedAdult ? STAGES[1].attackScale * stage.strengthMultiplier : stage.attackScale;
  const hp = scaled(card.stats.hp, hpScale);
  return { hp, maxHp: hp, attack: scaled(card.stats.attack, attackScale), cd: 1 };
}

/** Encounter-only budgets; registry card statistics are never overwritten. */
export function progressionStrengthBudget(pool: readonly ProgressionCard[], wins: number): { attack: number; hp: number; roundAttack: number } | null {
  if (normalizedWins(wins) < 7) return null;
  const maxima = MATCH3_ORB_ELEMENTS.map(element => {
    const adults = pool.filter(c => c.form === 'ADULT' && c.element === element).map(c => progressionEnemyStats(c, 6));
    if (!adults.length) throw new Error('第七關成獸基準不完整');
    return { attack: Math.max(...adults.map(c => c.attack)), hp: Math.max(...adults.map(c => c.hp)) };
  });
  const grow = (key: 'attack' | 'hp') => {
    const base = maxima.reduce((sum, card) => sum + card[key], 0), increment = Math.max(1, Math.ceil(base * .1));
    return Math.min(Number.MAX_SAFE_INTEGER, base + (normalizedWins(wins) - 6) * increment);
  };
  const attack = grow('attack');
  return { attack, hp: grow('hp'), roundAttack: normalizedWins(wins) < 10 ? Math.ceil(attack / 4) + 1 : attack };
}
export function progressionLineupStats(cards: readonly ProgressionCard[], wins: number, pool: readonly ProgressionCard[]): { hp: number; maxHp: number; attack: number; cd: number }[] {
  const raw = cards.map(c => progressionEnemyStats(c, wins)), budget = progressionStrengthBudget(pool, wins);
  if (!budget) return raw;
  if (cards.length !== progressionStage(wins).enemyCount || new Set(cards.map(c => c.id)).size !== cards.length) throw new Error('關卡陣容不完整');
  const allocate = (key: 'attack' | 'hp') => {
    const total = raw.reduce((n, c) => n + c[key], 0), available = BigInt(budget[key] - raw.length), divisor = BigInt(total);
    const values = raw.map(c => 1 + Number(BigInt(c[key]) * available / divisor));
    const order = raw.map((c, i) => ({ i, remainder: BigInt(c[key]) * available % divisor })).sort((a, b) => a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1);
    for (let remaining = budget[key] - values.reduce((a, b) => a + b, 0), i = 0; remaining > 0; remaining--, i++) values[order[i % order.length].i]++;
    return values;
  };
  const attacks = allocate('attack'), health = allocate('hp');
  if (!progressionStage(wins).simultaneous) {
    const peak = budget.roundAttack, strongest = raw.reduce((best, card, i) => card.attack > raw[best].attack ? i : best, 0);
    let excess = 0;
    for (let i = 0; i < attacks.length; i++) { excess += Math.max(0, attacks[i] - peak); attacks[i] = Math.min(peak, attacks[i]); }
    for (let i = 0; i < attacks.length && excess > 0; i++) { const add = Math.min(excess, peak - attacks[i]); attacks[i] += add; excess -= add; }
    let missing = peak - attacks[strongest];
    for (let i = 0; i < attacks.length && missing > 0; i++) if (i !== strongest) { const take = Math.min(missing, attacks[i] - 1); attacks[i] -= take; attacks[strongest] += take; missing -= take; }
  }
  return raw.map((c, i) => ({ ...c, attack: attacks[i], hp: health[i], maxHp: health[i] }));
}
