import policy from '../../../docs/技能戰鬥檔案/寶珠阿修羅/敗部復活.json';
import { availableFoeTarget, damageFoe, initializeAvailableFoes } from './enemies';
import type { TurnUnit, TurnFoe } from './resolve-turn';

export interface ComebackRecord { wins: number; losses: number }
export interface ComebackState { version: 1; rescue: boolean; rallies: number; boostLeft: number; strikesLeft: number }
export interface ComebackFact { kind: 'rally' | 'rescue'; id: string; before: number; after: number; actual: number; shieldAbsorbed?: number }
export const COMEBACK_POLICY = policy;
export function initialComeback(wins: number, record?: ComebackRecord): ComebackState {
  const rescue = record?.wins === wins && record.losses >= policy.rescueAfterLosses;
  return { version: 1, rescue, rallies: 0, boostLeft: 0, strikesLeft: rescue ? policy.rescueStrikes : 0 };
}
export function nextComebackRecord(wins: number, prior: ComebackRecord | undefined, outcome: 'win' | 'lose'): ComebackRecord {
  return outcome === 'win' ? { wins: wins + 1, losses: 0 } : { wins, losses: Math.min(policy.rescueAfterLosses, (prior?.wins === wins ? prior.losses : 0) + 1) };
}
export function comebackMultiplier(state?: ComebackState): number { return state?.boostLeft ? policy.attackMultiplier : 1; }
export function comebackLabel(state?: ComebackState): string {
  if (!state) return '';
  if (state.rescue) return `保底援助：有效連線觸發破陣援擊，剩餘 ${state.strikesLeft} 次。`;
  return state.rallies ? `逆境奮起已觸發；寶珠與法寶攻擊增強剩餘 ${state.boostLeft} 次。` : '本局生命不高於30%時，存活隊友可獲一次逆境援助。';
}
/** Explicit rescue strike: spends a charge and deals HP + shield damage to one available foe. */
export function rescueStrike(foes: TurnFoe[], state: ComebackState | undefined, wins: number, target: number, valid: boolean) {
  const ready = initializeAvailableFoes(foes, wins + 1);
  const index = availableFoeTarget(ready, target, wins + 1);
  if (!valid || !state?.rescue || state.strikesLeft <= 0 || index < 0) return { foes, state, facts: [] as ComebackFact[], damage: 0 };
  const before = ready[index], shield = before.skillRuntime?.shield ?? 0;
  const next = damageFoe(ready, index, before.hp + shield);
  const fact: ComebackFact = { kind: 'rescue', id: before.id, before: before.hp, after: next[index].hp, actual: before.hp - next[index].hp, shieldAbsorbed: shield - (next[index].skillRuntime?.shield ?? 0) };
  return { foes: initializeAvailableFoes(next, wins + 1), state: { ...state, strikesLeft: state.strikesLeft - 1 }, facts: [fact], damage: fact.actual };
}
/** In-battle rally only: zero-HP fighters and completed defeats are never revived. */
export function finishComeback(team: TurnUnit[], foes: TurnFoe[], state: ComebackState | undefined, consumed: boolean) {
  if (!state) return { team, state, facts: [] as ComebackFact[], message: '' };
  let next = { ...state, boostLeft: Math.max(0, state.boostLeft - (consumed ? 1 : 0)) };
  const facts: ComebackFact[] = [];
  const max = team.reduce((n, c) => n + c.maxHp, 0), hp = team.reduce((n, c) => n + c.hp, 0);
  if (hp > 0 && hp * 100 <= max * policy.criticalPercent && foes.some(c => c.hp > 0) && state.rallies < policy.normalRallies) {
    team = team.map(c => {
      if (c.hp <= 0) return c;
      const after = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * policy.rallyHealPercent / 100));
      facts.push({ kind: 'rally', id: c.id, before: c.hp, after, actual: after - c.hp });
      return { ...c, hp: after };
    });
    next = { ...next, rallies: state.rallies + 1, boostLeft: policy.boostActions };
  }
  return { team, state: next, facts, message: facts.length ? '逆境奮起：存活隊友回復35%生命上限，接下來三次寶珠或法寶攻擊增強50%。' : comebackLabel(next) };
}
