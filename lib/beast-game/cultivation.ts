/** Shared permanent cultivation rules. Execute on the server; UI consumes the result. */
import 'server-only';
import { guardianOf } from '../beast-guardians';
import { getCard, playableCards } from './registry';

export interface CultivationCopy { id: string; cardId: string; bonus: string }
export interface CultivationState { cards: CultivationCopy[]; protectedIds: string[] }
export interface FusionChoice { targetId: string; materialId: string }
export interface CultivationChange extends FusionChoice { targetCardId: string; materialCardId: string; beforeBonus: string; addedBonus: string; afterBonus: string }

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
  }
  if (state.protectedIds.length) requireFive(state, state.protectedIds);
}

function requireFive(state: CultivationState, ids: readonly string[]): void {
  const selected = ids.map(id => state.cards.find(c => c.id === id));
  if (ids.length !== 5 || new Set(ids).size !== 5 || selected.some(c => !c || !getCard(c.cardId)) || new Set(selected.map(c => c?.cardId)).size !== 5) {
    throw new Error('請親選五隻仍持有、卡型不同的可出戰主力。');
  }
}

/** Replace all five in one transaction; there is no intermediate unlock operation. */
export function replaceCultivationMainTeam(state: CultivationState, ids: readonly string[]): CultivationState {
  validateCultivationState(state); requireFive(state, ids);
  return { ...state, protectedIds: [...ids] };
}

/** Pure transaction: any failed item rejects the complete batch without mutating input. */
export function fuseCultivation(state: CultivationState, choices: readonly FusionChoice[]): { state: CultivationState; changes: CultivationChange[] } {
  validateCultivationState(state); requireFive(state, state.protectedIds);
  if (!Array.isArray(choices) || !choices.length) throw new Error('請選擇合體材料。');
  let cards = state.cards.map(c => ({ ...c }));
  const changes: CultivationChange[] = [];
  for (const choice of choices) {
    const target = cards.find(c => c.id === choice?.targetId), material = cards.find(c => c.id === choice?.materialId);
    if (!target || !material || target.id === material.id) throw new Error('材料或目標已不存在，未扣材料。');
    if (state.protectedIds.includes(material.id)) throw new Error('鎖定主力不能作為材料，請先整組更換主力。');
    if (cultivationTarget(material.cardId) !== target.cardId) throw new Error('幼子只能合體對應本體，本體只能合體所屬四大神獸。');
    // Original formula: floor(material ORIGINAL attack / 10), minimum one.
    // A trained material does not transfer its bonus; no new growth formula is introduced.
    const added = BigInt(Math.max(1, Math.floor(getCard(material.cardId)!.stats.attack / 10)));
    const before = exactBonus(target.bonus), after = before + added;
    cards = cards.filter(c => c.id !== material.id).map(c => c.id === target.id ? { ...c, bonus: after.toString() } : c);
    if (new Set(cards.filter(c => getCard(c.cardId)).map(c => c.cardId)).size < 5) throw new Error('合體後至少須保留五隻不同卡型可出戰神獸。');
    requireFive({ cards, protectedIds: state.protectedIds }, state.protectedIds);
    changes.push({ ...choice, targetCardId: target.cardId, materialCardId: material.cardId, beforeBonus: before.toString(), addedBonus: added.toString(), afterBonus: after.toString() });
  }
  return { state: { cards, protectedIds: [...state.protectedIds] }, changes };
}
