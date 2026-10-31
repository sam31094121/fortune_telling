/** 屬性分工的能量：消哪色就充哪張主屬性卡；魔法珠被消／五珠技＝對應屬性卡能量直接集滿。 */
import type { BeastElement } from '../elements';
import { ENERGY_MAX, ENERGY_PER_ORB } from './config';
import type { DragResult } from './drag';

export interface EnergyGain { element: BeastElement; gain: number; fill: boolean }

export function energyGains(res: Pick<DragResult, 'steps' | 'skill5' | 'element' | 'magicTriggered'> & Partial<Pick<DragResult, 'shieldFusion'>>): EnergyGain[] {
  const m = new Map<BeastElement, EnergyGain>();
  const at = (e: BeastElement) => { if (!m.has(e)) m.set(e, { element: e, gain: 0, fill: false }); return m.get(e)!; };
  for (const s of res.steps) {
    const consumed = res.shieldFusion && s.clearedCells ? new Set(s.clearedCells.map(p => p.r * 1000 + p.c)) : undefined;
    const counted = new Set<number>();
    for (const g of s.groups) {
      const actual = consumed ? g.cells.filter(p => { const id = p.r * 1000 + p.c; if (!consumed.has(id) || counted.has(id)) return false; counted.add(id); return true; }).length : g.size;
      if (actual) at(g.element).gain += actual * ENERGY_PER_ORB;
    }
  }
  if (!res.shieldFusion) {
    for (const t of res.magicTriggered) at(t.element).fill = true;
    if (res.skill5 && res.element) at(res.element).fill = true;
  }
  return [...m.values()];
}

export function applyEnergy(current: number, g: EnergyGain | undefined): number {
  if (!g) return current;
  return g.fill ? ENERGY_MAX : Math.min(ENERGY_MAX, current + g.gain);
}
