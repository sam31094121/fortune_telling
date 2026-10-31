/**
 * 自選 5 張出陣（同屬性可重複）。預設隊伍＝五元素各一張，可由外部傳入 teamIds 覆蓋。
 * 同屬性多張的規則（已定案）'tap-lead'：玩家點哪張，哪張就是該屬性主攻，選擇保留到點同屬性另一張為止；
 * 還沒點過＝該屬性第一張（存活）；被點的主攻倒下＝往後找下一張存活的同屬性卡（繞回開頭）。
 * 其餘同屬性卡是輔助，只拿一半能量、不集滿；隊伍沒有該屬性＝不出手。
 * 另保留 'first-attacks'（忽略點選，永遠第一張）與 'all-attack'（同屬性全員出手、能量全額）。
 */
import type { BeastElement } from '../elements';
import { TEAM_SIZE } from './config';
import { applyEnergy, type EnergyGain } from './energy';

export type SameElementRule = 'tap-lead' | 'first-attacks' | 'all-attack';
/** 同屬性規則預設值（已定案：點選主攻） */
export const DEFAULT_SAME_ELEMENT_RULE: SameElementRule = 'tap-lead';
/** 輔助（非主攻同屬性卡）的能量比例（已定案：一半） */
export const SUPPORT_ENERGY_RATIO = 0.5;

interface U { id: string; element: BeastElement; hp: number }

/** 玩家點選的主攻：屬性 → 卡 id */
export type LeadChoice = Partial<Record<BeastElement, string>>;

/** 每個屬性的主攻 id。有點選且存活＝點選的；點選的倒下＝其後下一張存活的同屬性（繞回）；沒點過＝第一張存活的。 */
export function leadIds(team: readonly U[], chosen: LeadChoice = {}): Set<string> {
  const s = new Set<string>(); const els = [...new Set(team.map((u) => u.element))];
  for (const el of els) {
    const same = team.filter((u) => u.element === el);
    const ci = chosen[el] ? same.findIndex((u) => u.id === chosen[el]) : -1;
    const start = ci < 0 ? 0 : ci;
    for (let k = 0; k < same.length; k++) { const u = same[(start + k) % same.length]; if (u.hp > 0) { s.add(u.id); break; } }
  }
  return s;
}

/** 點一張卡後的新選擇；只有同屬性 2 張以上且存活才記錄。 */
export function chooseLead(team: readonly U[], chosen: LeadChoice, id: string): LeadChoice {
  const u = team.find((x) => x.id === id);
  if (!u || u.hp <= 0 || team.filter((x) => x.element === u.element).length < 2) return chosen;
  return { ...chosen, [u.element]: id };
}

/** 依規則過濾出會出手的隊員（傳給 computeHits）。 */
export function attackingTeam<T extends U>(team: readonly T[], rule: SameElementRule = DEFAULT_SAME_ELEMENT_RULE, chosen: LeadChoice = {}): T[] {
  if (rule === 'all-attack') return team.slice();
  const lead = leadIds(team, rule === 'tap-lead' ? chosen : {}); return team.filter((u) => lead.has(u.id));
}

/** 依規則分配能量：主攻全額（含集滿），其餘同屬性卡一半、不集滿。 */
export function shareEnergy<T extends U & { energy: number }>(team: readonly T[], gains: readonly EnergyGain[], rule: SameElementRule = DEFAULT_SAME_ELEMENT_RULE, chosen: LeadChoice = {}): T[] {
  const lead = leadIds(team, rule === 'tap-lead' ? chosen : {});
  return team.map((u) => {
    const g = gains.find((x) => x.element === u.element);
    if (!g || rule === 'all-attack' || lead.has(u.id)) return { ...u, energy: applyEnergy(u.energy, g) };
    return { ...u, energy: applyEnergy(u.energy, { element: g.element, gain: Math.round(g.gain * SUPPORT_ENERGY_RATIO), fill: false }) };
  });
}

/** 外部傳入的 teamIds 是否可用：剛好 TEAM_SIZE 張、id 不重複、都在卡池內（同屬性允許）。 */
export function validTeamIds(ids: readonly string[] | null | undefined, pool: readonly string[]): ids is string[] {
  return !!ids && ids.length === TEAM_SIZE && new Set(ids).size === ids.length && ids.every((i) => pool.includes(i));
}
