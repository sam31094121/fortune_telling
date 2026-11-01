/** Orb foe event adapter. Effect values and duration semantics belong to effects.ts. */
import { getSkill, type SkillDefinition, type SkillTrigger } from '../../../cards/skills';
import { playableCards } from '../registry';
import { resolveEffects, tickDurations, effectiveStat, elementBoostPercent, type BeastInstance, type EffectLogEntry } from '../effects';
import type { BeastElement } from '../elements';

export interface FoeSkillState {
  uses: Record<string, number>;
  initialized: Partial<Record<'ON_SUMMON' | 'PASSIVE', boolean>>;
  lastEvents: Partial<Record<SkillTrigger, string>>;
  shield: number;
  modifiers: BeastInstance['modifiers'];
  stunnedTurns?: number;
  elementBoosts?: BeastInstance['elementBoosts'];
}
export interface SkillFoe { id: string; element: BeastElement; hp: number; maxHp: number; attack: number; defense?: number; speed?: number; skillRuntime?: FoeSkillState }
export interface OrbSkillEvent {
  skillId: string; trigger: SkillTrigger; effects: EffectLogEntry[]; eventId?: string;
  sourceId: string; targetId: string; sourceSide?: 'ally' | 'enemy'; targetSide?: 'ally' | 'enemy'; hpBefore: number; hpAfter: number; actualDamage: number; shieldAbsorbed: number;
}
/** Presentation only: keep the final relevant skill invocation, including damage before a zero-damage status effect. */
export function orbSkillDisplay(events: readonly OrbSkillEvent[], cardId: string, side: 'ally' | 'enemy'): (OrbSkillEvent & { isTarget: boolean; displayDamage: number }) | null {
  const relevant=(e:OrbSkillEvent)=>(e.sourceId===cardId&&e.sourceSide===side)||(e.targetId===cardId&&e.targetSide===side);
  let lastIndex=events.length-1;while(lastIndex>=0&&!relevant(events[lastIndex]))lastIndex--;
  if(lastIndex<0)return null;
  const last=events[lastIndex];
  const same=(e:OrbSkillEvent)=>e.skillId===last.skillId&&e.trigger===last.trigger&&e.sourceId===last.sourceId&&e.sourceSide===last.sourceSide&&e.targetId===last.targetId&&e.targetSide===last.targetSide&&e.eventId===last.eventId;
  let group:readonly OrbSkillEvent[];
  if(last.eventId!==undefined)group=events.slice(0,lastIndex+1).filter(same);
  else {let first=lastIndex;while(first>0&&same(events[first-1]))first--;group=events.slice(first,lastIndex+1)}
  const actualDamage=group.reduce((sum,e)=>sum+e.actualDamage,0),isTarget=last.targetId===cardId&&last.targetSide===side;
  return {...last,hpBefore:group[0].hpBefore,effects:group.flatMap(e=>e.effects),actualDamage,shieldAbsorbed:group.reduce((sum,e)=>sum+e.shieldAbsorbed,0),isTarget,displayDamage:isTarget?actualDamage:0};
}
const state = (f: SkillFoe): FoeSkillState => ({ uses: { ...f.skillRuntime?.uses }, initialized: { ...f.skillRuntime?.initialized }, lastEvents: { ...f.skillRuntime?.lastEvents }, shield: f.skillRuntime?.shield ?? 0, modifiers: (f.skillRuntime?.modifiers ?? []).map(m => ({ ...m })), stunnedTurns: f.skillRuntime?.stunnedTurns ?? 0, elementBoosts: (f.skillRuntime?.elementBoosts ?? []).map(b => ({ ...b })) });
export function isMappedFoeSkill(skill: SkillDefinition): boolean {
  return skill.effects.length > 0 && skill.effects.every(e => e.type !== 'DRAW' && e.type !== 'DISCARD');
}
function instance(f: SkillFoe, runtime: FoeSkillState): BeastInstance {
  const card = playableCards().find(c => c.id === f.id);
  return { instanceId: f.id, cardId: f.id, name: card?.name ?? f.id,
    element: f.element, hp: f.hp, maxHp: f.maxHp, attack: f.attack, defense: f.defense ?? card?.stats.defense ?? 0, speed: f.speed ?? card?.stats.speed ?? 0,
    shield: runtime.shield, modifiers: runtime.modifiers, stunnedTurns: runtime.stunnedTurns ?? 0, elementBoosts: runtime.elementBoosts ?? [], defeated: f.hp <= 0 };
}
function persist<F extends SkillFoe>(f: F, beast: BeastInstance, runtime: FoeSkillState): F {
  return { ...f, hp: beast.hp, skillRuntime: { ...runtime, shield: beast.shield, modifiers: beast.modifiers, stunnedTurns: beast.stunnedTurns, elementBoosts: beast.elementBoosts } };
}
/** Shared foe/ally event adapter. No deck means an entire DRAW/DISCARD skill is inapplicable. */
export function runOrbSkillEvent<F extends SkillFoe, T extends SkillFoe = SkillFoe>(foe: F, trigger: SkillTrigger, context: { target?: T; actualDamage?: number; eventId?: string; baseAttack?: number; incomingDamageScale?: 0.5 | 1; sourceSide?: 'ally' | 'enemy'; targetSide?: 'ally' | 'enemy' } = {}) {
  const result = { source: foe, target: context.target, events: [] as OrbSkillEvent[], unsupported: [] as string[], notApplicable: [] as Array<{ skillId: string; reason: 'no_deck' | 'no_target' }>, targetActualDamage: 0 };
  if (foe.hp <= 0 || (trigger === 'ON_DAMAGED' && !(Number.isFinite(context.actualDamage) && context.actualDamage! > 0))) return result;
  if (trigger === 'ON_ATTACK' && (foe.skillRuntime?.stunnedTurns ?? 0) > 0) return result;
  const runtime = state(foe);
  const once = trigger === 'ON_SUMMON' || trigger === 'PASSIVE';
  if ((once && runtime.initialized[trigger]) || (context.eventId !== undefined && runtime.lastEvents[trigger] === context.eventId)) return result;
  if (once) runtime.initialized[trigger] = true;
  if (context.eventId !== undefined) runtime.lastEvents[trigger] = context.eventId;
  const card = playableCards().find(c => c.id === foe.id);
  const beast = instance(foe, runtime);
  const targetRuntime = context.target ? state(context.target) : null;
  const enemy = context.target && targetRuntime ? instance(context.target, targetRuntime) : null;
  const baseAttack = context.baseAttack ?? (trigger === 'ON_ATTACK' ? effectiveStat(beast, 'attack') : 0);
  for (const id of new Set(trigger === 'PASSIVE' ? card?.passive ?? [] : card?.skills ?? [])) {
    const skill = getSkill(id);
    if (!skill || skill.trigger !== trigger) continue;
    if (!isMappedFoeSkill(skill)) { result.unsupported.push(id); result.notApplicable.push({ skillId: id, reason: 'no_deck' }); continue; }
    if (skill.effects.some(e => (e.target ?? skill.targeting) === 'ENEMY') && !enemy) { result.notApplicable.push({ skillId: id, reason: 'no_target' }); continue; }
    if (skill.usesPerBattle !== undefined && (runtime.uses[id] ?? 0) >= skill.usesPerBattle) continue;
    const log: EffectLogEntry[] = [];
    for (const effect of skill.effects) {
      const target = (effect.target ?? skill.targeting) === 'ENEMY' ? enemy : beast;
      // Match battle.triggerSkills: dead opponents receive no further effects.
      if (target === enemy && target?.defeated) continue;
      const hpBefore = target?.hp ?? beast.hp, shieldBefore = target?.shield ?? beast.shield, logStart = log.length;
      if (effect.type === 'DAMAGE' && target === enemy && target && context.incomingDamageScale === 0.5) {
        // Resolve the original skill first, before guard, shield or overkill clipping.
        const probe = { ...target, hp: Number.MAX_SAFE_INTEGER, maxHp: Number.MAX_SAFE_INTEGER, shield: 0, defeated: false };
        const original: EffectLogEntry[] = [];
        resolveEffects([effect], { source: beast, target: probe, baseAttack, side: { draw: () => 0, discard: () => 0 }, log: original });
        for (const entry of original) {
          const guarded = Math.round(entry.applied * 0.5);
          const absorbed = Math.min(target.shield, guarded);
          target.shield -= absorbed;
          const before = target.hp;
          target.hp = Math.max(0, target.hp - (guarded - absorbed));
          target.defeated = target.hp === 0;
          log.push({ ...entry, applied: before - target.hp, detail: `${entry.detail}／防禦合體減半 ${guarded}${absorbed ? `／護盾吸收 ${absorbed}` : ''}${target.defeated ? '／目標陣亡' : ''}` });
        }
      } else {
        resolveEffects([effect], { source: beast, target, baseAttack, side: { draw: () => 0, discard: () => 0 }, log });
      }
      if (log.length > logStart) result.events.push({ skillId: id, trigger, eventId: context.eventId, effects: log.slice(logStart), sourceId: foe.id,
        targetId: target?.cardId ?? foe.id, sourceSide: context.sourceSide, targetSide: target === enemy ? context.targetSide : context.sourceSide, hpBefore, hpAfter: target?.hp ?? beast.hp,
        actualDamage: Math.max(0, hpBefore - (target?.hp ?? beast.hp)), shieldAbsorbed: Math.max(0, shieldBefore - (target?.shield ?? beast.shield)) });
    }
    if (!log.length) continue;
    runtime.uses[id] = (runtime.uses[id] ?? 0) + 1;
  }
  result.source = persist(foe, beast, runtime);
  if (context.target && enemy && targetRuntime) {
    result.target = persist(context.target, enemy, targetRuntime);
    result.targetActualDamage = Math.max(0, context.target.hp - enemy.hp);
  }
  return result;
}
/** Compatibility for foe-only callers; pass a target to resolve offensive skills. */
export function runFoeSkillEvent<F extends SkillFoe, T extends SkillFoe = SkillFoe>(foe: F, trigger: SkillTrigger, context: { target?: T; actualDamage?: number; eventId?: string; baseAttack?: number; incomingDamageScale?: 0.5 | 1; sourceSide?: 'ally' | 'enemy'; targetSide?: 'ally' | 'enemy' } = {}) {
  const result = runOrbSkillEvent(foe, trigger, context);
  return { ...result, foe: result.source };
}
/** Call once after this holder's ON_TURN_END, never when another holder acts. */
export function tickFoeSkillDurations<F extends SkillFoe>(foe: F): F {
  if (!foe.skillRuntime) return foe;
  const runtime = state(foe), beast = instance(foe, runtime);
  tickDurations(beast);
  return persist(foe, beast, runtime);
}
export function foeSkillAttack(foe: SkillFoe): number { return effectiveStat(instance(foe, state(foe)), 'attack'); }
export function orbSkillDefense(unit: SkillFoe): number { return effectiveStat(instance(unit, state(unit)), 'defense'); }
export function orbSkillSpeed(unit: SkillFoe): number { return effectiveStat(instance(unit, state(unit)), 'speed'); }
export function orbSkillElementBoost(unit: SkillFoe): number { return elementBoostPercent(instance(unit, state(unit)), unit.element); }
export function orbSkillCanAttack(unit: Pick<SkillFoe, 'hp' | 'skillRuntime'>): boolean { return unit.hp > 0 && !(unit.skillRuntime?.stunnedTurns! > 0); }
/** Stage gating belongs to the caller; invoke at battle initialization, before any hit. */
export function initializeFoeSkills<F extends SkillFoe>(foe: F, context: { sourceSide?: 'ally' | 'enemy' } = {}) {
  const summon = runFoeSkillEvent(foe, 'ON_SUMMON', context);
  const passive = runFoeSkillEvent(summon.foe, 'PASSIVE', context);
  return { foe: passive.foe, events: [...summon.events, ...passive.events], unsupported: [...summon.unsupported, ...passive.unsupported] };
}
/** Already-computed damage only; shield absorption does not reapply elements or defense. */
export function absorbFoeShieldDamage<F extends { hp: number; skillRuntime?: FoeSkillState }>(foe: F, amount: number) {
  const damage = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const shield = foe.skillRuntime?.shield ?? 0, absorbed = Math.min(shield, damage);
  const hp = Math.max(0, foe.hp - (damage - absorbed));
  return { foe: { ...foe, hp, ...(foe.skillRuntime ? { skillRuntime: { ...foe.skillRuntime, shield: shield - absorbed } } : {}) }, absorbed, actualDamage: foe.hp - hp };
}
