/**
 * 能量技（集氣放技能）／連結攻擊：伺服端計算（rig 模式 hard45／hard45b）。
 *
 * 公式原樣搬自 1f452bb 的 Match3Board.tsx unleash()／fireLink() rig 分支，不調數值：
 * - 能量技：skillAmount(fighterEffectiveAttack(u), u.element, foe.element)，施放者能量歸 0。
 * - 連結攻擊：linkDamage(cards.map(fighterEffectiveAttack))，每張扣 LINK_ENERGY_COST。
 * - 之後 resolvePlayerCardAttack({ allowEnemyReaction: false, stage, eventId })，eventId 沿用前端原字串（playerAttackReceipts 防重送）。
 * 回傳的 foes 是權威 HP；前端只套用，擊倒交給 knockout-events.deriveServerKnockouts。
 */
import { ENERGY_MAX } from './config';
import { fighterCanAct, fighterEffectiveAttack, fighterExactAttack, skillAmount } from './damage';
import { LINK_ENERGY_COST, LINK_MIN_CARDS, linkDamage, linkProblem, type Match3Foe } from './enemies';
import { resolvePlayerCardAttack } from './player-skills';
import { progressionStage } from './progression';
import type { SkillFoe } from './skill-runtime';
import type { TurnInput } from './resolve-turn';

type Player = SkillFoe & { energy: number };

export interface CardAttackArgs<T extends Player, F extends Match3Foe> { team: readonly T[]; foes: readonly F[]; targetIndex: number; stage: number; eventId: string }

/** 能量技：與 1f452bb 前端 rig 分支同式。 */
export function resolveEnergyAttack<T extends Player, F extends Match3Foe>(args: CardAttackArgs<T, F> & { attackerId: string }) {
  const { team, foes, targetIndex, stage, eventId, attackerId } = args;
  const u = team.find(x => x.id === attackerId);
  const foe = foes[targetIndex];
  if (!u || !foe) throw new Error('invalid');
  const amt = skillAmount(fighterEffectiveAttack(u), u.element, foe.element, fighterExactAttack(u));
  const spentTeam = team.map(x => x.id === u.id ? { ...x, energy: 0 } : x);
  const applied = resolvePlayerCardAttack({ foes, team: spentTeam, targetIndex, attackerIds: [u.id], baseDamage: amt, stage, eventId, allowEnemyReaction: false });
  return { ...applied, baseDamage: amt };
}

/** 連結攻擊：與 1f452bb 前端 rig 分支同式。 */
export function resolveLinkAttack<T extends Player, F extends Match3Foe>(args: CardAttackArgs<T, F> & { linkIds: readonly string[] }) {
  const { team, foes, targetIndex, stage, eventId, linkIds } = args;
  const cards = linkIds.map(id => team.find(u => u.id === id));
  if (cards.some(c => !c) || !foes[targetIndex]) throw new Error('invalid');
  const amt = linkDamage(cards.map(c => fighterEffectiveAttack(c!)),cards.map(c=>fighterExactAttack(c!)));
  const spentTeam = team.map(u => linkIds.includes(u.id) ? { ...u, energy: u.energy - LINK_ENERGY_COST } : u);
  const applied = resolvePlayerCardAttack({ foes, team: spentTeam, targetIndex, attackerIds: cards.map(c => c!.id), baseDamage: amt, stage, eventId, allowEnemyReaction: false });
  return { ...applied, baseDamage: amt };
}

/** 路由用：驗證前端原本的發動條件後計算。條件不符一律丟錯（路由回 400，前端不套用任何結果）。 */
export function resolveCardAttackTurn(input: TurnInput) {
  if (input.mode !== 'hard45' && input.mode !== 'hard45b') throw new Error('invalid');
  if (typeof input.actionId !== 'string' || !input.actionId) throw new Error('invalid');
  if (typeof input.eventId !== 'string' || !input.eventId.length || input.eventId.length > 100) throw new Error('invalid');
  const stage = progressionStage(input.wins).wins + 1;
  const targetIndex = input.target;
  const foe = input.foes[targetIndex];
  if (!foe || !(foe.hp > 0)) throw new Error('invalid');
  if (input.action === 'energy') {
    const u = input.team.find(x => x.id === input.attackerId);
    if (!u || u.hp <= 0 || u.energy < ENERGY_MAX || !fighterCanAct(u)) throw new Error('invalid');
    const r = resolveEnergyAttack({ team: input.team, foes: input.foes, targetIndex, stage, eventId: input.eventId, attackerId: u.id });
    return { action: 'energy' as const, actionId: input.actionId, targetId: foe.id, attackerIds: [u.id], ...r };
  }
  if (input.action === 'link') {
    const ids = input.linkIds;
    if (!Array.isArray(ids) || ids.length < LINK_MIN_CARDS || ids.length > input.team.length || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new Error('invalid');
    if (linkProblem(input.team, ids) || ids.some(id => !fighterCanAct(input.team.find(u => u.id === id)!))) throw new Error('invalid');
    const r = resolveLinkAttack({ team: input.team, foes: input.foes, targetIndex, stage, eventId: input.eventId, linkIds: ids });
    return { action: 'link' as const, actionId: input.actionId, targetId: foe.id, attackerIds: [...ids], ...r };
  }
  throw new Error('invalid');
}
export type CardAttackResult = ReturnType<typeof resolveCardAttackTurn>;
