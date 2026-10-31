/**
 * 出手結果分類（10/30 修正「我方沒有地／火屬性主卡可出手」誤報）。
 * 舊訊息只看本步總傷害 dealt>0：①卡被敵方反擊打倒（hp=0）仍說「沒有」；②傷害來自其他顏色的連鎖時，標錯屬性。
 * 這裡依「拖曳的那個顏色」各自結算，並分開「已倒下」與「隊伍沒有」。純函式，可單元測試。
 */
import type { BeastElement } from '../elements';
import type { Match3Hit } from './damage';

export type AttackOutcome =
  | { kind: 'hit'; amount: number }
  | { kind: 'ko'; names: string[] }
  | { kind: 'absent' };

export function attackOutcome(
  team: readonly { element: BeastElement; hp: number; name?: string; id?: string }[],
  hits: readonly Pick<Match3Hit, 'element' | 'amount'>[],
  element: BeastElement,
): AttackOutcome {
  const amount = hits.filter((h) => h.element === element).reduce((s, h) => s + h.amount, 0);
  if (amount > 0) return { kind: 'hit', amount };
  const same = team.filter((u) => u.element === element);
  if (same.length === 0) return { kind: 'absent' };
  if (same.every((u) => u.hp <= 0)) return { kind: 'ko', names: same.map((u) => u.name ?? u.id ?? '') };
  return { kind: 'hit', amount: 0 };
}

/** 給畫面用的一句話；label 為屬性中文（風空水火地）。 */
export function attackOutcomeText(o: AttackOutcome, label: string): string {
  if (o.kind === 'hit') return o.amount > 0 ? `，造成 ${o.amount} 點傷害` : '，未造成傷害';
  if (o.kind === 'ko') return `，我方${label}屬性卡已倒下（${o.names.join('、')}），無法出手`;
  return `，隊伍裡沒有${label}屬性主卡可出手`;
}
