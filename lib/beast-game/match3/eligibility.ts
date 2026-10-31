/** 出手資格：只有主屬性（card.element）與消除顏色相同的我方神獸會攻擊。不看 subElement／attackElements。 */
import type { BeastElement } from '../elements';

export interface Match3Fighter { id: string; element: BeastElement; attack: number; hp: number }

/** 玩家目前選取且有資格的神獸優先攻擊（排在第一位）。 */
export function eligibleAttackers<T extends Pick<Match3Fighter, 'element' | 'hp'> & { id?: string }>(team: readonly T[], element: BeastElement, selectedId?: string | null): T[] {
  const list = team.filter((f) => f.element === element && f.hp > 0);
  if (!selectedId) return list;
  const i = list.findIndex((f) => f.id === selectedId);
  if (i <= 0) return list;
  return [list[i], ...list.slice(0, i), ...list.slice(i + 1)];
}
