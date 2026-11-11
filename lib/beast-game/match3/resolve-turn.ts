/** Server turn resolver: UI receives facts, never invents healing or shield rewards. */
import { grantTreasure, treasureCatalog, type TreasureBook } from './treasures';
import { buildOrbReplay } from './replay';
import { buildEvents } from './events';
import { resolveDrag, type MagicGrid } from './drag';
import { seededRng, type Board, type Cell } from './board';
import { match3Mode, type Match3ModeId } from './config';
import { progressionStage } from './progression';
import { computeHits, endPlayerSkillTurn, fighterCanAct } from './damage';
import { attackingTeam, shareEnergy, type LeadChoice, type SameElementRule } from './team';
import { energyGains } from './energy';
import { availableFoeTarget, foeAvailable, counterPhase, chargeEnemyAttack, damageFoe, type Match3Foe } from './enemies';
import { runPlayerTurnSkills, resolvePlayerCardAttack, orderPlayerHits, recalculatePlayerHit } from './player-skills';
import type { Match3Fighter } from './eligibility';
import type { OrbSkillEvent } from './skill-runtime';
import { healSupport, shieldPlan, SUPPORT_POLICY, type HealFact } from './element-support';
import { playableCards } from '../registry';
export interface TurnUnit extends Match3Fighter { maxHp: number; energy: number; name: string; thumbnail: string }
export interface TurnFoe extends Match3Foe { name: string; thumbnail: string }
export interface TurnInput { treasures?: TreasureBook; actionId?: string; treasureGuard?: number; action?: 'treasure' | 'energy' | 'link'; treasureVariant?: number; treasureElement?: import('../elements').BeastElement; /** 能量技／連結攻擊（card-attack.ts）：施放者、連線卡、沿用前端原 eventId。 */ attackerId?: string; linkIds?: string[]; eventId?: string; board: Board; magic: MagicGrid; path: Cell[]; team: TurnUnit[]; foes: TurnFoe[]; mode: Match3ModeId; wins: number; target: number; seed: number; move: number; chosen: LeadChoice; rule: SameElementRule; attackBoost: number }
export function resolveOrbTurn(input: TurnInput) {
  const cfg = match3Mode(input.mode), hard = cfg.id !== 'medium', stage = progressionStage(input.wins), eventId = `${input.seed}:${input.move}`;
  // Validate the action before running any skills. An invalid drag cannot create healing.
  const res = resolveDrag(input.board, input.path, seededRng(input.seed), input.magic, 50, cfg.diagonal, hard, hard ? stage.minChain : 3);
  const shield = res.valid && hard ? shieldPlan(input.board, input.magic, input.path) : null;
  let team = input.team, foes = input.foes, startDamage = 0;
  const skills: OrbSkillEvent[] = [], heals: HealFact[] = [], enemyHeals: HealFact[] = [];
  if (hard && input.path.length && !res.boardShieldUpgrade) {
    const started = runPlayerTurnSkills(team, foes, 'ON_TURN_START', input.wins + 1, eventId + ':start', input.target);
    team = started.team; foes = started.foes; skills.push(...started.skillEvents); startDamage = started.actualDamage;
  }
  const target = availableFoeTarget(foes, input.target, hard ? input.wins + 1 : 0);
  const hits = res.valid && target >= 0 ? orderPlayerHits(computeHits(res.steps, attackingTeam(team, input.rule, input.chosen), foes[target].element), team) : [];
  const healBudget = new Map<string, number>();
  const actualHits: { attackerId: string; amount: number }[] = [];
  const chainFacts: { chain: number; heals: HealFact[]; damage: number }[] = [];
  let damage = 0, usedBoost = false;
  const boost = Math.max(input.attackBoost === 1.5 ? 1.5 : 1, shield?.kind === 'same' ? SUPPORT_POLICY.shields.same.attackMultiplier : 1);
  if (res.valid) for (const step of res.steps) {
    if (step.groups.length === 0) continue;
    const stepHeals: HealFact[] = [];
    // Only real matched groups heal. Clear-all shield effects are not ordinary matched beads.
    if (!shield) for (const group of step.groups) {
      if (group.size < SUPPORT_POLICY.healing.minimumBeads) continue;
      const healed = healSupport(team, group.element, Math.min(group.size, 10), healBudget, step.chain);
      team = healed.team; heals.push(...healed.facts); stepHeals.push(...healed.facts);
    }
    let stepDamage = 0;
    for (const [index, hit] of hits.entries()) {
      if (hit.chain !== step.chain || target < 0) continue;
      const actor = team.find(f => f.id === hit.attackerId);
      if (!actor || !fighterCanAct(actor) || hit.amount <= 0 || foes[target].hp <= 0) continue;
      const current = recalculatePlayerHit(hit, team, foes[target].element);
      if (current.amount <= 0) continue;
      usedBoost = true;
      if (hard) {
        const applied = resolvePlayerCardAttack({ team, foes, targetIndex: target, attackerIds: [actor.id], baseDamage: Math.round(current.amount * boost), stage: input.wins + 1, eventId: `${eventId}:orb:${index}`, allowEnemyReaction: true });
        team = applied.team; foes = applied.foes; skills.push(...applied.skillEvents); actualHits.push(...applied.actualHits); stepDamage += applied.actualDamage;
      } else {
        const before = foes[target].hp; foes = damageFoe(foes, target, Math.round(current.amount * boost));
        const actual = before - foes[target].hp; actualHits.push({ attackerId: actor.id, amount: actual }); stepDamage += actual;
      }
    }
    damage += stepDamage; chainFacts.push({ chain: step.chain, heals: stepHeals, damage: stepDamage });
  }
  if (shield && 'healPercent' in shield && shield.healPercent > 0) {
    const healed = healSupport(team, null, shield.healPercent, new Map(), 1, 'shield'); team = healed.team; heals.push(...healed.facts);
  }
  if (res.valid && !res.boardShieldUpgrade) team = shareEnergy(team, energyGains(res), input.rule, input.chosen);
  let endDamage = 0;
  if (hard && input.path.length > 0 && !res.boardShieldUpgrade) {
    const ended = runPlayerTurnSkills(team, foes, 'ON_TURN_END', input.wins + 1, eventId + ':end', target);
    team = endPlayerSkillTurn(ended.team); foes = ended.foes; skills.push(...ended.skillEvents); endDamage = ended.actualDamage;
  }
  if (hard && res.valid) foes = chargeEnemyAttack(foes, input.wins + 1, eventId);
  const beforeCounter = { team, foes };
  const guardScale = Math.min(input.treasureGuard ?? 1, shield && 'damageScale' in shield ? shield.damageScale : 1);
  const counter = input.path.length === 0 || !res.valid ? { team, foes, hits: [], skillEvents: [] } : counterPhase(team, foes, cfg.counterEvery, hard && !stage.simultaneous ? input.move : undefined, guardScale, hard ? input.wins + 1 : undefined, hard ? { turnId: eventId, energyGate: true } : undefined);
  const enemyBudget = new Map<string, number>();
  for (const h of counter.hits) {
    const source = counter.foes.find(f => f.id === h.enemyId);
    if (!source || source.hp <= 0) continue;
    const eligible = counter.foes.filter((_, i) => foeAvailable(counter.foes, i, hard ? input.wins + 1 : 0));
    const healed = healSupport(eligible, source.element, SUPPORT_POLICY.healing.enemyCounterPercent, enemyBudget);
    const updated = new Map(healed.team.map(f => [f.id, f])); counter.foes = counter.foes.map(f => updated.get(f.id) ?? f); enemyHeals.push(...healed.facts);
  }
  const nextBoost = usedBoost ? 1 : input.attackBoost;
  const source = shield?.kind === 'same' ? input.team.find(f => f.element === shield.colors[0] && actualHits.some(h => h.attackerId === f.id && h.amount > 0)) : undefined;
  const guardian = source ? playableCards().find(c => c.form === 'GUARDIAN' && c.element === source.element) : undefined;
  const summon = source && guardian ? { guardianId: guardian.id, sourceId: source.id, name: guardian.name, element: source.element } : null;
  const summarize = (facts: HealFact[], units: {id:string;name:string}[]) => [...new Set(facts.map(h=>h.id))].map(id=>({ id, name: units.find(u=>u.id===id)!.name, actual: facts.filter(h=>h.id===id).reduce((sum,h)=>sum+h.actual,0) }));
  const healingSummary = summarize(heals,input.team), enemyHealingSummary = summarize(enemyHeals,input.foes);
  const shieldGoals = (['SPACE','AIR','WATER','FIRE','EARTH'] as const).map(element=>({element,count:res.board.reduce((sum,row,r)=>sum+row.filter((e,c)=>e===element && res.magic[r][c]>=7).length,0)}));
  const replay = hard && res.valid ? buildOrbReplay(input.board, input.magic, input.path, res, cfg.diagonal) : [];
  const events = buildEvents(res.steps, hits, { magicSpawn: res.magicSpawn, magicTriggered: res.magicTriggered, skill5Element: res.skill5 ? res.element : null, energy: energyGains(res) });
  const treasure = grantTreasure(input, res);
  treasure.catalog = treasureCatalog(treasure.book,counter.team);
  const nextTreasureGuard = counter.hits.length ? 1 : input.treasureGuard ?? 1;
  return { treasure, nextTreasureGuard, replay, events, res, target, hits, actualHits, damage, startDamage, endDamage, skills, heals, enemyHeals, healingSummary, enemyHealingSummary, shieldGoals, summon, chainFacts, shield, guardScale, beforeCounter, counter, nextBoost };
}
