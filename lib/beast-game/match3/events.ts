/** 對外消除事件含 { element, count, cascadeStep, eligible }（格式不變），另加 power 與選填的 magic／magicPower／skill5。
 * 其他事件：攻擊、魔珠候選（直線 4 顆以上）、魔法珠生成、魔法珠引爆、五珠技、能量。 */
import type { BeastElement } from '../elements';
import { MAGIC_ORB_MIN_LENGTH } from './config';
import type { CascadeStep } from './cascade';
import type { Match3Hit } from './damage';
import type { DragStep, MagicSpawn, MagicTrigger } from './drag';
import type { EnergyGain } from './energy';
import type { MatchGroup } from './match';

export type Match3Event =
  | { type: 'clear'; element: BeastElement; count: number; cascadeStep: number; eligible: boolean; chain: number; orbs: number; length: number; power?: number; magic?: boolean; magicPower?: number; skill5?: boolean }
  | { type: 'attack'; chain: number; attackerId: string | null; element: BeastElement; amount: number }
  | { type: 'magicOrbCandidate'; chain: number; element: BeastElement; length: number; cells: Array<{ r: number; c: number }> }
  | { type: 'magicOrbSpawn'; element: BeastElement; power: number; r: number; c: number }
  | { type: 'magicOrbTrigger'; chain: number; element: BeastElement; power: number; r: number; c: number }
  | { type: 'skill5'; element: BeastElement }
  | { type: 'energy'; element: BeastElement; gain: number; fill: boolean };

type G = MatchGroup & { power?: number; magic?: boolean; magicPower?: number; skill5?: boolean };
export interface DragExtras { magicSpawn?: MagicSpawn | null; magicTriggered?: readonly MagicTrigger[]; skill5Element?: BeastElement | null; energy?: readonly EnergyGain[] }

export function buildEvents(steps: readonly (CascadeStep & Partial<Pick<DragStep, 'rewards'>>)[], hits: readonly Match3Hit[], extras: DragExtras = {}): Match3Event[] {
  const ev: Match3Event[] = [];
  for (const s of steps) for (const g0 of s.groups) {
    const g = g0 as G;
    const eligible = hits.some((h) => h.chain === s.chain && h.element === g.element && h.attackerId !== null);
    const e: Match3Event = { type: 'clear', element: g.element, count: g.size, cascadeStep: s.chain, eligible, chain: s.chain, orbs: g.size, length: g.longest };
    if (g.power !== undefined) e.power = g.power;
    if (g.magic) { e.magic = true; e.magicPower = g.magicPower; }
    if (g.skill5) e.skill5 = true;
    ev.push(e);
    const spawnedHere = s.chain === 1 && !!extras.magicSpawn;
    if (s.rewards === undefined && !spawnedHere && g.longest >= MAGIC_ORB_MIN_LENGTH) ev.push({ type: 'magicOrbCandidate', chain: s.chain, element: g.element, length: g.longest, cells: g.cells });
  }
  if (steps.some(step => step.rewards !== undefined)) {
    for (const step of steps) for (const reward of step.rewards ?? []) ev.push({ type: 'magicOrbSpawn', ...reward });
  } else if (extras.magicSpawn) ev.push({ type: 'magicOrbSpawn', ...extras.magicSpawn });
  for (const t of extras.magicTriggered ?? []) ev.push({ type: 'magicOrbTrigger', ...t });
  if (extras.skill5Element) ev.push({ type: 'skill5', element: extras.skill5Element });
  for (const x of extras.energy ?? []) ev.push({ type: 'energy', ...x });
  for (const h of hits) ev.push({ type: 'attack', chain: h.chain, attackerId: h.attackerId, element: h.element, amount: h.amount });
  return ev;
}
