/**
 * 神獸卡遊戲｜平衡評分（Balance Score / Power Budget）
 * ============================================================================
 *
 * 規格第十九條：不得人工感覺「這隻很強」。
 * 計算＝基礎數值 ＋ 技能價值 ＋ 觸發機率 ＋ 使用成本，輸出 Power Budget，
 * 超過設定範圍就標記 BALANCE_WARNING。
 *
 * 這支檔案唯一的目的，是讓「這張卡強不強」變成一個算得出來、可以吵的數字。
 * 它不會自動改卡片——它只負責讓失衡看得見。
 */

import { getSkill, type SkillDefinition } from '../../cards/skills';
import type { EffectSpec } from './effects';
import { RARITIES, type BeastCard, type Rarity } from './schema';

/** 每一種效果每一點 value 值多少分。純傷害是基準 1。 */
const EFFECT_WEIGHT: Record<string, number> = {
  DAMAGE: 1.0,
  HEAL: 0.9,
  SHIELD: 0.95,
  BUFF_ATTACK: 1.2,
  BUFF_DEFENSE: 1.0,
  BUFF_SPEED: 0.8,
  DEBUFF_ATTACK: 1.2,
  DEBUFF_DEFENSE: 1.1,
  ELEMENT_BOOST: 0.6,
  DRAW: 12,
  DISCARD: 8,
  STUN: 22,
  REVIVE: 0.8,
};

/** 觸發時機的期望次數。整場打不到幾次的觸發，價值本來就低。 */
const TRIGGER_FREQUENCY: Record<SkillDefinition['trigger'], number> = {
  ON_ATTACK: 1.0,
  ON_TURN_START: 1.0,
  ON_TURN_END: 1.0,
  ON_DAMAGED: 0.7,
  ON_SUMMON: 0.35,
  PASSIVE: 1.0,
};

/** 稀有度的預算帶。刻意重疊很多——規格第五條：稀有度不等於絕對戰力。 */
export const RARITY_BUDGET: Record<Rarity, { min: number; max: number }> = {
  N: { min: 250, max: 340 },
  R: { min: 265, max: 365 },
  SR: { min: 280, max: 390 },
  SSR: { min: 295, max: 410 },
  UR: { min: 305, max: 430 },
};

function effectValue(effect: EffectSpec): number {
  const weight = EFFECT_WEIGHT[effect.type] ?? 1;
  const duration = effect.duration ?? 1;
  /*
    持續型效果不是線性疊加：第二回合的價值比第一回合低，而且要封頂。

    沒有封頂之前，被動技用 duration: 99 表示「整場常駐」，
    算出來的技能分是 588——比整張卡的數值分還高三倍，直接把預算炸掉。
    實測就是這樣抓到的：一張帶常駐被動的 SR 算出 869，預算帶上限才 390。
    常駐再久，實際能吃到的回合數也有限，所以邊際遞減並封在四回合。
  */
  const DURATION_CAP = 4;
  const effectiveDuration = Math.min(duration, DURATION_CAP);
  const durationFactor = effectiveDuration <= 1 ? 1 : 1 + (effectiveDuration - 1) * 0.6;
  return weight * effect.value * durationFactor;
}

export function skillValue(skill: SkillDefinition): number {
  const raw = skill.effects.reduce((sum, effect) => sum + effectValue(effect), 0);
  const frequency = TRIGGER_FREQUENCY[skill.trigger] ?? 1;
  // 使用成本：整場次數有限的招，價值要打折——不能按稀有度給無限次強招。
  const usageFactor = skill.usesPerBattle == null ? 1 : Math.min(1, 0.45 + skill.usesPerBattle * 0.2);
  return raw * frequency * usageFactor;
}

export interface BalanceReport {
  cardId: string;
  name: string;
  rarity: Rarity;
  statScore: number;
  skillScore: number;
  powerBudget: number;
  band: { min: number; max: number };
  status: 'OK' | 'BALANCE_WARNING';
  /** 超出多少。在帶內為 0。 */
  deviation: number;
  detail: string;
}

/**
 * 基礎數值分。
 *
 * hp 權重壓低是因為它不會主動贏，只會拖長；
 * attack 權重最高，因為它直接決定多少回合解決對手。
 */
export function statScoreOf(card: BeastCard): number {
  return card.stats.hp * 0.6 + card.stats.attack * 1.6 + card.stats.defense * 1.2 + card.stats.speed * 0.7;
}

export function evaluateBalance(card: BeastCard): BalanceReport {
  const statScore = statScoreOf(card);
  const skillIds = [...card.skills, ...card.passive];
  const skillScore = skillIds.reduce((sum, id) => {
    const skill = getSkill(id);
    return skill ? sum + skillValue(skill) : sum;
  }, 0);

  const powerBudget = Math.round(statScore + skillScore);
  const band = RARITY_BUDGET[card.rarity];
  const deviation = powerBudget < band.min
    ? band.min - powerBudget
    : powerBudget > band.max
      ? powerBudget - band.max
      : 0;

  return {
    cardId: card.id,
    name: card.name,
    rarity: card.rarity,
    statScore: Math.round(statScore),
    skillScore: Math.round(skillScore),
    powerBudget,
    band,
    status: deviation === 0 ? 'OK' : 'BALANCE_WARNING',
    deviation,
    detail: `數值 ${Math.round(statScore)} ＋ 技能 ${Math.round(skillScore)} ＝ ${powerBudget}`
      + `（${card.rarity} 預算帶 ${band.min}–${band.max}）`
      + (deviation === 0 ? '' : `，超出 ${deviation}`),
  };
}

/**
 * 稀有度不得直接等於戰力（規格第五條）。
 *
 * 檢查方式：把每張卡的預算按稀有度排序，如果高稀有的最低值
 * 一定大於低稀有的最高值，那就是「UR 一定打贏 R」，這條就違反了。
 */
export function rarityIsNotPower(cards: BeastCard[]): { passed: boolean; detail: string } {
  const byRarity = new Map<Rarity, number[]>();
  for (const card of cards) {
    const list = byRarity.get(card.rarity) ?? [];
    list.push(evaluateBalance(card).powerBudget);
    byRarity.set(card.rarity, list);
  }

  const present = RARITIES.filter((rarity) => (byRarity.get(rarity)?.length ?? 0) > 0);
  if (present.length < 2) {
    return { passed: true, detail: '牌庫目前只有一種稀有度，這一條暫時不適用。' };
  }

  const overlaps: string[] = [];
  for (let i = 0; i < present.length - 1; i += 1) {
    const lower = byRarity.get(present[i])!;
    const higher = byRarity.get(present[i + 1])!;
    const lowerMax = Math.max(...lower);
    const higherMin = Math.min(...higher);
    overlaps.push(`${present[i]}最高 ${lowerMax} vs ${present[i + 1]}最低 ${higherMin}`);
    if (higherMin > lowerMax) {
      return {
        passed: false,
        detail: `${present[i + 1]} 的最低戰力仍高於 ${present[i]} 的最高戰力——`
          + `稀有度變成絕對戰力了。${overlaps.join('；')}`,
      };
    }
  }

  return { passed: true, detail: `稀有度之間有重疊，戰力不由稀有度決定。${overlaps.join('；')}` };
}
