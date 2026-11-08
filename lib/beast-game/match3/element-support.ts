import policy from '../../../docs/技能戰鬥檔案/寶珠阿修羅/五行盾牌.json';
import { ELEMENT_GENERATES, type BeastElement } from '../elements';
import type { Board, Cell } from './board';
import type { MagicGrid } from './drag';

export interface SupportFighter { id: string; element: BeastElement; hp: number; maxHp: number }
export interface HealFact { id: string; source: BeastElement | null; hpBefore: number; hpAfter: number; actual: number; reason: 'generating' | 'shield'; chain: number }
export function healSupport<T extends SupportFighter>(team: readonly T[], source: BeastElement | null, percent: number, spent: Map<string, number>, chain = 1, reason: HealFact['reason'] = 'generating') {
  const facts: HealFact[] = [];
  const next = team.map(f => {
    if (f.hp <= 0 || f.hp >= f.maxHp || source !== null && ELEMENT_GENERATES[source] !== f.element) return f;
    const used = spent.get(f.id) ?? 0;
    const budget = reason === 'generating' ? Math.max(0, policy.healing.maxPercentPerTurn - used) : percent;
    const appliedPercent = Math.min(percent, budget);
    const amount = Math.min(f.maxHp - f.hp, Math.floor(f.maxHp * appliedPercent / 100));
    spent.set(f.id, used + appliedPercent);
    if (amount <= 0) return f;
    facts.push({ id: f.id, source, hpBefore: f.hp, hpAfter: f.hp + amount, actual: amount, reason, chain });
    return { ...f, hp: f.hp + amount };
  });
  return { team: next, facts };
}
export function shieldPlan(board: Board, magic: MagicGrid, path: readonly Cell[]) {
  if (path.length < 3 || path.some(p => (magic[p.r]?.[p.c] ?? 0) < 7)) return null;
  const colors = [...new Set(path.map(p => board[p.r][p.c]))];
  const kind = colors.length === 1 ? 'same' : colors.length === 2 ? 'mixed' : colors.length === 3 ? 'three' : colors.length === 4 ? 'four' : 'five';
  return { kind, colors, ...policy.shields[kind] };
}
export const SUPPORT_POLICY = policy;
