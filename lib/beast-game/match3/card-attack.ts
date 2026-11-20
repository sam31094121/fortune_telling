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
import { damageFoe, foeAvailable, LINK_ENERGY_COST, LINK_MIN_CARDS, linkDamage, linkProblem, type Match3Foe } from './enemies';
import { resolvePlayerCardAttack } from './player-skills';
import { progressionStage } from './progression';
import type { SkillFoe } from './skill-runtime';
import type { TurnInput } from './resolve-turn';

type Player = SkillFoe & { energy: number; orbDropCharges?: number };

export interface CardAttackArgs<T extends Player, F extends Match3Foe> { team: readonly T[]; foes: readonly F[]; targetIndex: number; stage: number; eventId: string }

/** 能量技：與 1f452bb 前端 rig 分支同式。 */
export function resolveEnergyAttack<T extends Player, F extends Match3Foe>(args: CardAttackArgs<T, F> & { attackerId: string }) {
  const { team, foes, targetIndex, stage, eventId, attackerId } = args;
  const u = team.find(x => x.id === attackerId);
  const foe = foes[targetIndex];
  if (!u || !foe) throw new Error('invalid');
  if (u.skillRuntime?.playerAttackReceipts?.includes(eventId)) throw new Error('這次攻擊已處理');
  const amt = skillAmount(fighterEffectiveAttack(u), u.element, foe.element, fighterExactAttack(u));
  const spentTeam = team.map(x => x.id === u.id ? { ...x, energy: 0 } : x);
  const applied = resolvePlayerCardAttack({ foes, team: spentTeam, targetIndex, attackerIds: [u.id], baseDamage: amt, stage, eventId, allowEnemyReaction: false });
  if ((u.orbDropCharges ?? 0) > 0) {
    const minimum = Math.min(foe.hp, Math.ceil(foe.maxHp / 2));
    const dealt = Math.max(0, foe.hp - applied.foes[targetIndex].hp);
    const missing = Math.max(0, minimum - dealt);
    if (missing) {
      const before = applied.foes[targetIndex];
      applied.foes = damageFoe(applied.foes, targetIndex, missing + (before.skillRuntime?.shield ?? 0));
      const extra = before.hp - applied.foes[targetIndex].hp;
      applied.actualDamage += extra; applied.actualHits.push({attackerId:u.id,amount:extra});
    }
    applied.foes = applied.foes.map((f,i)=>i===targetIndex && f.hp>0 ? {...f,orbDropCounterBlocked:true} : f);
    const remaining = Math.max(0,(u.orbDropCharges ?? 0)-1);
    applied.team = applied.team.map(x=>x.id===u.id ? {...x,orbDropCharges:remaining,energy:remaining > 0 ? ENERGY_MAX : 0} : x);
  }
  return { ...applied, baseDamage: amt };
}

/** Sequential original attacks; never spill charges into another target or a reserve. */
export function resolveEnergyBatch<T extends Player, F extends Match3Foe>(args: CardAttackArgs<T,F> & { attackerId:string }) {
  let team=[...args.team],foes=[...args.foes];
  const actor=team.find(u=>u.id===args.attackerId);
  const limit=Math.min(256,Math.max(1,Math.floor(actor?.orbDropCharges ?? 0)));
  const actualHits: {attackerId:string;amount:number}[]=[],skillEvents: ReturnType<typeof resolveEnergyAttack<T,F>>['skillEvents']=[];
  let actualDamage=0,baseDamage=0,strikes=0;
  for(let i=0;i<limit;i++) {
    const u=team.find(c=>c.id===args.attackerId);
    if(!u||u.hp<=0||u.energy<ENERGY_MAX||!fighterCanAct(u)||!foeAvailable(foes,args.targetIndex,args.stage)||orbOutcome(team,foes)!==null)break;
    const r=resolveEnergyAttack({...args,team,foes,eventId:i?`${args.eventId}:batch:${i}`:args.eventId});
    team=r.team;foes=r.foes;actualHits.push(...r.actualHits);skillEvents.push(...r.skillEvents);actualDamage+=r.actualDamage;baseDamage+=r.baseDamage;strikes++;
  }
  return {team,foes,actualHits,skillEvents,actualDamage,baseDamage,strikes};
}

function attackPresentation(team:readonly Player[],ids:readonly string[],targetId:string,hits:readonly {attackerId:string;amount:number}[],strikes:number) {
  return {targetId,strikes,groups:ids.map(id=>{const u=team.find(c=>c.id===id)!;return {attackerId:id,element:u.element,amount:hits.filter(h=>h.attackerId===id).reduce((sum,h)=>sum+h.amount,0)};})};
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
    const r = input.mode === 'hard45' ? resolveEnergyBatch({ team: input.team, foes: input.foes, targetIndex, stage, eventId: input.eventId, attackerId: u.id }) : {...resolveEnergyAttack({ team: input.team, foes: input.foes, targetIndex, stage, eventId: input.eventId, attackerId: u.id }),strikes:1};
    return { action: 'energy' as const, actionId: input.actionId, targetId: foe.id, attackerIds: [u.id], ...r, presentation:attackPresentation(r.team,[u.id],foe.id,r.actualHits,r.strikes), outcome: orbOutcome(r.team, r.foes) };
  }
  if (input.action === 'link') {
    const ids = input.linkIds;
    if (!Array.isArray(ids) || ids.length < LINK_MIN_CARDS || ids.length > input.team.length || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new Error('invalid');
    if (linkProblem(input.team, ids) || ids.some(id => !fighterCanAct(input.team.find(u => u.id === id)!))) throw new Error('invalid');
    const r = resolveLinkAttack({ team: input.team, foes: input.foes, targetIndex, stage, eventId: input.eventId, linkIds: ids });
    return { action: 'link' as const, actionId: input.actionId, targetId: foe.id, attackerIds: [...ids], ...r, presentation:attackPresentation(r.team,ids,foe.id,r.actualHits,1), outcome: orbOutcome(r.team, r.foes) };
  }
  throw new Error('invalid');
}
export type CardAttackResult = ReturnType<typeof resolveCardAttackTurn>;
import { orbOutcome } from './battle-outcome';
