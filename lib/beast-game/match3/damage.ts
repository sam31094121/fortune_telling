/** 傷害：卡面攻擊 × BASE_RATIO × 威力倍率 × 連鎖倍率 × 克制倍率（沿用 elements.ts）。非主屬性＝0。
 * 威力＝普通顆數（上限 NORMAL_POWER_CAP）＋魔法珠威力（不設上限）；舊直線組沒有 power 時用最長直線。 */
import { elementMultiplier, type BeastElement } from '../elements';
import { BASE_RATIO, SKILL_RATIO, chainMultiplier, lengthMultiplier, normalPower } from './config';
import { eligibleAttackers, type Match3Fighter } from './eligibility';
import type { CascadeStep } from './cascade';
import type { MatchGroup } from './match';

export interface Match3Hit { attackerId: string | null; element: BeastElement; orbs: number; length: number; chain: number; amount: number; power?: number }

export function hitAmount(attack: number, length: number, chain: number, attacker: BeastElement, defender: BeastElement): number {
  return Math.round(attack * BASE_RATIO * lengthMultiplier(length) * chainMultiplier(chain) * elementMultiplier(attacker, defender));
}

/** 能量滿時發動的技能傷害。 */
export function skillAmount(attack: number, attacker: BeastElement, defender: BeastElement): number {
  return Math.round(attack * SKILL_RATIO * elementMultiplier(attacker, defender));
}

export const groupPower = (g: MatchGroup & { power?: number }) => g.power ?? normalPower(g.longest);

export function computeHits(steps: readonly CascadeStep[], team: readonly Match3Fighter[], enemyElement: BeastElement, selectedId?: string | null): Match3Hit[] {
  const hits: Match3Hit[] = [];
  for (const step of steps) for (const g of step.groups) {
    const power = groupPower(g);
    const attackers = eligibleAttackers(team, g.element, selectedId);
    if (attackers.length === 0) { hits.push({ attackerId: null, element: g.element, orbs: g.size, length: g.longest, chain: step.chain, amount: 0, power }); continue; }
    for (const f of attackers) hits.push({ attackerId: f.id, element: g.element, orbs: g.size, length: g.longest, chain: step.chain, amount: hitAmount(f.attack, power, step.chain, f.element, enemyElement), power });
  }
  return hits;
}
