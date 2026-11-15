/** Shared permanent cultivation rules. Execute on the server; UI consumes the result. */
import 'server-only';
import { guardianOf } from '../beast-guardians';
import { getCard, playableCards } from './registry';
import { feedGain, starProgress, type FoodChainParams, type FoodChainRule, FOOD_CHAIN_V2 } from './cultivation-rules';

/** fed：v2 起記錄這個副本被餵過幾張（星級用）；舊副本沒有這欄，由收據補算。 */
export interface CultivationCopy { id: string; cardId: string; bonus: string; fed?: number }
export interface CultivationState { cards: CultivationCopy[]; protectedIds: string[] }
export interface FusionChoice { targetId: string; materialId: string }
export interface CultivationChange extends FusionChoice {
  targetCardId: string; materialCardId: string; beforeBonus: string; addedBonus: string; afterBonus: string;
  /** 以下只在 v2 收據出現；沒有 rule 的舊收據＝v1。 */
  rule?: 'v2'; inheritedBonus?: string; rawBonus?: string; capBonus?: string; capped?: boolean; fedBefore?: number; fedAfter?: number;
}
export interface FuseOptions { rule?: FoodChainRule; fedOf?: (copyId: string) => number; params?: FoodChainParams }

/** Decimal strings retain exact growth beyond Number.MAX_SAFE_INTEGER. No gameplay cap. */
export function exactBonus(value: string): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) throw new Error('培養數值無效，未扣材料。');
  return BigInt(value);
}

/** Same mansion young → adult; adult → its existing guardian. Never element matching. */
export function cultivationTarget(materialCardId: string): string | null {
  const card = getCard(materialCardId);
  if (!card) return null;
  if (card.form === 'YOUNG') return playableCards().find(c => c.form === 'ADULT' && c.mansionId === card.mansionId)?.id ?? null;
  if (card.form === 'ADULT') return guardianOf(card.id)?.cardId ?? null;
  return null;
}

export function validateCultivationState(state: CultivationState): void {
  if (!state || !Array.isArray(state.cards) || !Array.isArray(state.protectedIds)) throw new Error('共同卡庫無法讀取。');
  const ids = new Set<string>();
  for (const card of state.cards) {
    if (!card || typeof card.id !== 'string' || !card.id.trim() || card.id.length > 200 || ids.has(card.id) || !getCard(card.cardId)) throw new Error('卡片副本無法核對。');
    exactBonus(card.bonus); ids.add(card.id);
    if (card.fed !== undefined && (!Number.isSafeInteger(card.fed) || card.fed < 0)) throw new Error('卡片副本無法核對。');
  }
  if (state.protectedIds.length) requireFive(state, state.protectedIds);
}

function requireFive(state: CultivationState, ids: readonly string[]): void {
  const selected = ids.map(id => state.cards.find(c => c.id === id));
  if (ids.length !== 5 || new Set(ids).size !== 5 || selected.some(c => !c || !getCard(c.cardId)) || new Set(selected.map(c => c?.cardId)).size !== 5) {
    throw new Error('請親選五隻仍持有、卡型不同的可出戰主力。');
  }
}

function playableTypeCount(cards: readonly CultivationCopy[]): number {
  return new Set(cards.filter(c => getCard(c.cardId)).map(c => c.cardId)).size;
}

/** Replace all five in one transaction; there is no intermediate unlock operation. */
export function replaceCultivationMainTeam(state: CultivationState, ids: readonly string[]): CultivationState {
  validateCultivationState(state); requireFive(state, ids);
  return { ...state, protectedIds: [...ids] };
}

/** Pure transaction: any failed item rejects the complete batch without mutating input. */
export function fuseCultivation(state: CultivationState, choices: readonly FusionChoice[], options: FuseOptions = {}): { state: CultivationState; changes: CultivationChange[] } {
  const rule = options.rule ?? 'v1', params = options.params ?? FOOD_CHAIN_V2;
  // 2026-11-15 23:32 使用者指示：吃卡不再強制先鎖五隻主力（新玩家卡少也能強化）。
  // 已鎖定的主力仍不可當材料；若有鎖定，validate 仍核對那五隻完整有效。
  validateCultivationState(state);
  if (!Array.isArray(choices) || !choices.length) throw new Error('請選擇合體材料。');
  // 押卡闖關需要五種不同卡型：已湊滿五種的收藏不能因吃卡掉到不足五種（原規則保留）；
  // 本來就不足五種的新玩家不受此限（目標卡一定保留，不會吃光）。
  const typesBefore = playableTypeCount(state.cards);
  let cards = state.cards.map(c => ({ ...c }));
  const changes: CultivationChange[] = [];
  for (const choice of choices) {
    const target = cards.find(c => c.id === choice?.targetId), material = cards.find(c => c.id === choice?.materialId);
    if (!target || !material || target.id === material.id) throw new Error('材料或目標已不存在，未扣材料。');
    if (state.protectedIds.includes(material.id)) throw new Error('鎖定主力不能作為材料，請先整組更換主力。');
    if (cultivationTarget(material.cardId) !== target.cardId) throw new Error('幼子只能合體對應本體，本體只能合體所屬四大神獸。');
    const targetCard = getCard(target.cardId)!, materialCard = getCard(material.cardId)!;
    const before = exactBonus(target.bonus);
    // 2026-11-15 最新定案：材料消耗後不能再用；目標可用新的合法材料持續累加。
    // v1 (original): floor(material ORIGINAL attack / 10), minimum one; a trained material does not transfer its bonus; no cap.
    // v2 (food chain, 待平衡暫定值): + 50% inheritance from an eaten adult, capped at 50% of the target's face attack; five-star feed cap.
    const gain = feedGain(rule, { materialForm: materialCard.form, materialBaseAttack: materialCard.stats.attack, materialBonus: exactBonus(material.bonus), targetBaseAttack: targetCard.stats.attack, targetBonus: before }, params);
    const added = gain.added, after = before + added;
    let fedBefore = 0;
    if (rule === 'v2') {
      if (targetCard.form !== 'ADULT' && targetCard.form !== 'GUARDIAN') throw new Error('幼子只能合體對應本體，本體只能合體所屬四大神獸。');
      fedBefore = target.fed ?? options.fedOf?.(target.id) ?? 0;
      if (starProgress(targetCard.form, fedBefore, params).maxed) throw new Error('這張卡已達五星封頂，不能再吃卡，未扣材料。');
      if (added === 0n && !params.feedAtAttackCap) throw new Error('這張卡的攻擊加成已達上限，未扣材料。');
    }
    cards = cards.filter(c => c.id !== material.id).map(c => c.id === target.id ? { ...c, bonus: after.toString(), ...(rule === 'v2' ? { fed: fedBefore + 1 } : {}) } : c);
    if (typesBefore >= 5 && playableTypeCount(cards) < 5) throw new Error('合體後至少須保留五隻不同卡型可出戰神獸。');
    if (state.protectedIds.length) requireFive({ cards, protectedIds: state.protectedIds }, state.protectedIds);
    changes.push({ ...choice, targetCardId: target.cardId, materialCardId: material.cardId, beforeBonus: before.toString(), addedBonus: added.toString(), afterBonus: after.toString(),
      ...(rule === 'v2' ? { rule: 'v2' as const, inheritedBonus: gain.inherited.toString(), rawBonus: gain.raw.toString(), capBonus: gain.cap!.toString(), capped: gain.capped, fedBefore, fedAfter: fedBefore + 1 } : {}) });
  }
  return { state: { cards, protectedIds: [...state.protectedIds] }, changes };
}
