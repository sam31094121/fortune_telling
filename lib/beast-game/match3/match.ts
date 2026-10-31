/**
 * 三消判定：找出同色 3 顆以上的直線，並把共用格子的直線（L／T／十字）合成一組。
 * 一組的顆數＝不重複格子數（交叉點只算一次）；長度＝組內最長的那條直線。
 */
import type { BeastElement } from '../elements';
import { MATCH3_MIN_RUN } from './config';

type Grid = BeastElement[][];
export interface Run { element: BeastElement; cells: Array<{ r: number; c: number }>; dir: 'row' | 'col' | 'diag' | 'anti' }
export interface MatchGroup {
  element: BeastElement;
  cells: Array<{ r: number; c: number }>;
  /** 不重複顆數 */
  size: number;
  /** 組內最長直線長度 */
  longest: number;
  runs: number[];
}

/** diagonal＝true 時另外掃「↘（diag）」與「↙（anti）」兩條斜線；預設 false＝只有橫直（中等模式行為不變）。 */
export function findRuns(b: Grid, diagonal = false): Run[] {
  const runs: Run[] = [];
  const rows = b.length, cols = b[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    let s = 0;
    for (let c = 1; c <= cols; c++) {
      if (c < cols && b[r][c] === b[r][s]) continue;
      if (c - s >= MATCH3_MIN_RUN) runs.push({ element: b[r][s], dir: 'row', cells: Array.from({ length: c - s }, (_, i) => ({ r, c: s + i })) });
      s = c;
    }
  }
  for (let c = 0; c < cols; c++) {
    let s = 0;
    for (let r = 1; r <= rows; r++) {
      if (r < rows && b[r][c] === b[s][c]) continue;
      if (r - s >= MATCH3_MIN_RUN) runs.push({ element: b[s][c], dir: 'col', cells: Array.from({ length: r - s }, (_, i) => ({ r: s + i, c })) });
      s = r;
    }
  }
  if (diagonal) for (const [dr, dc, dir] of [[1, 1, 'diag'], [1, -1, 'anti']] as const) {
    for (let r0 = 0; r0 < rows; r0++) for (let c0 = 0; c0 < cols; c0++) {
      const pr = r0 - dr, pc = c0 - dc; // 只從每條斜線的起點開始掃
      if (pr >= 0 && pr < rows && pc >= 0 && pc < cols) continue;
      const line: Array<{ r: number; c: number }> = [];
      for (let r = r0, c = c0; r >= 0 && r < rows && c >= 0 && c < cols; r += dr, c += dc) line.push({ r, c });
      let s = 0;
      for (let i = 1; i <= line.length; i++) {
        if (i < line.length && b[line[i].r][line[i].c] === b[line[s].r][line[s].c]) continue;
        if (i - s >= MATCH3_MIN_RUN) runs.push({ element: b[line[s].r][line[s].c], dir, cells: line.slice(s, i) });
        s = i;
      }
    }
  }
  return runs;
}

export function findGroups(b: Grid, diagonal = false): MatchGroup[] {
  const runs = findRuns(b, diagonal);
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const key = (p: { r: number; c: number }) => p.r * 1000 + p.c;
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
    if (runs[i].element !== runs[j].element) continue;
    const s = new Set(runs[i].cells.map(key));
    if (runs[j].cells.some((p) => s.has(key(p)))) parent[find(j)] = find(i);
  }
  const buckets = new Map<number, Run[]>();
  runs.forEach((run, i) => { const k = find(i); buckets.set(k, [...(buckets.get(k) ?? []), run]); });
  return [...buckets.values()].map((rs) => {
    const seen = new Map<number, { r: number; c: number }>();
    rs.forEach((run) => run.cells.forEach((p) => seen.set(key(p), p)));
    const cells = [...seen.values()];
    const lengths = rs.map((run) => run.cells.length);
    return { element: rs[0].element, cells, size: cells.length, longest: Math.max(...lengths), runs: lengths };
  });
}
