/**
 * 九宮格靈動數字 × 姓名五格：本站交叉對照（非古法）
 * 後端運算：五格數值一律來自既有姓名學引擎（lib/nameology-engine.ts 的 buildNameologyAnalysis().grids），這裡不重算筆畫。
 * 只把五格數值的每一位數字（0 不計）放進同號格子，與生日數字並列對照；不改動生日九宮格的任何輸出。
 * 不含主命數、天賦數、八十一靈動數。
 */
import type { NineGridStudy } from './nine-grid-numbers';

export interface NameGridValue { key: string; label: string; value: number }

export interface NineGridNameOverlay {
  name: string;
  label: string;
  note: string;
  grids: NameGridValue[];
  /** 依天、人、地、外、總格順序，每一位數字一步；0 沒有格子 */
  drop: { digit: number; gridKey: string; linesLit: string[] }[];
  palaces: { digit: number; nameCount: number }[];
  /** 生日與姓名都落到的格子 */
  doubleEmphasis: number[];
  lines: { id: string; litByBirth: boolean; litWithName: boolean }[];
}

export const NAME_OVERLAY_LABEL = '本站交叉對照，非古法';
export const NAME_OVERLAY_NOTE = '姓名五格與九宮格是兩套不同系統；這裡只把五格數字的每一位放進同號格子並列對照。';

export function buildNineGridNameOverlay(study: NineGridStudy, name: string, grids: readonly NameGridValue[]): NineGridNameOverlay {
  const birth = new Map<number, number>(study.cells.map((c) => [c.digit, c.count]));
  const combined = new Map(birth);
  const nameCount = new Map<number, number>();
  for (let d = 1; d <= 9; d += 1) nameCount.set(d, 0);
  const isLit = (digits: readonly number[]) => digits.every((d) => (combined.get(d) ?? 0) > 0);
  const litNow = new Set(study.lines.filter((l) => isLit(l.digits)).map((l) => l.id));

  const drop: NineGridNameOverlay['drop'] = [];
  for (const g of grids) {
    for (const ch of String(g.value)) {
      const digit = Number(ch);
      const linesLit: string[] = [];
      if (digit > 0) {
        nameCount.set(digit, (nameCount.get(digit) ?? 0) + 1);
        combined.set(digit, (combined.get(digit) ?? 0) + 1);
        for (const line of study.lines) if (!litNow.has(line.id) && isLit(line.digits)) { litNow.add(line.id); linesLit.push(line.id); }
      }
      drop.push({ digit, gridKey: g.key, linesLit });
    }
  }

  return {
    name,
    label: NAME_OVERLAY_LABEL,
    note: NAME_OVERLAY_NOTE,
    grids: grids.map((g) => ({ key: g.key, label: g.label, value: g.value })),
    drop,
    palaces: [...nameCount.entries()].map(([digit, n]) => ({ digit, nameCount: n })),
    doubleEmphasis: [...nameCount.entries()].filter(([d, n]) => n > 0 && (birth.get(d) ?? 0) > 0).map(([d]) => d),
    lines: study.lines.map((l) => ({ id: l.id, litByBirth: l.lit, litWithName: litNow.has(l.id) })),
  };
}
