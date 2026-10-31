/** 三消盤面：生成（保證無現成連線且至少一步可走）、交換、找可走步。純邏輯。 */
import type { BeastElement } from '../elements';
import { MATCH3_COLS, MATCH3_ROWS, MATCH3_ORB_ELEMENTS } from './config';
import { findGroups } from './match';

export type Board = BeastElement[][]; // board[row][col]
export interface Cell { r: number; c: number }
export type Rng = () => number;

export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomOrb(rng: Rng): BeastElement {
  return MATCH3_ORB_ELEMENTS[Math.floor(rng() * MATCH3_ORB_ELEMENTS.length)];
}

export function cloneBoard(b: Board): Board { return b.map((row) => row.slice()); }

/** 放這顆會不會立刻和左邊兩顆或上面兩顆連成 3。 */
function makesRun(b: Board, r: number, c: number, e: BeastElement, diagonal = false): boolean {
  if (diagonal && r >= 2 && b[r - 1]?.[c - 1] === e && b[r - 2]?.[c - 2] === e) return true;
  if (diagonal && r >= 2 && b[r - 1]?.[c + 1] === e && b[r - 2]?.[c + 2] === e) return true;
  if (c >= 2 && b[r][c - 1] === e && b[r][c - 2] === e) return true;
  if (r >= 2 && b[r - 1]?.[c] === e && b[r - 2]?.[c] === e) return true;
  return false;
}

export function generateBoard(rng: Rng, rows = MATCH3_ROWS, cols = MATCH3_COLS, diagonal = false): Board {
  for (let attempt = 0; attempt < 200; attempt++) {
    const b: Board = [];
    for (let r = 0; r < rows; r++) {
      b.push([]);
      for (let c = 0; c < cols; c++) {
        let e = randomOrb(rng);
        let guard = 0;
        while (makesRun(b, r, c, e, diagonal) && guard++ < 20) e = randomOrb(rng);
        b[r].push(e);
      }
    }
    if (findGroups(b, diagonal).length === 0 && findValidMoves(b, diagonal).length > 0) return b;
  }
  throw new Error('match3: 無法生成合法盤面');
}

/** diagonal＝true 時 8 方向（含 ↗↙↖↘）都算相鄰。 */
export function isAdjacent(a: Cell, b: Cell, diagonal = false): boolean {
  const dr = Math.abs(a.r - b.r), dc = Math.abs(a.c - b.c);
  if (diagonal) return Math.max(dr, dc) === 1;
  return dr + dc === 1;
}

export function inBounds(b: Board, p: Cell): boolean {
  return p.r >= 0 && p.r < b.length && p.c >= 0 && p.c < b[0].length;
}

export function swapped(b: Board, a: Cell, d: Cell): Board {
  const n = cloneBoard(b);
  const t = n[a.r][a.c]; n[a.r][a.c] = n[d.r][d.c]; n[d.r][d.c] = t;
  return n;
}

export function findValidMoves(b: Board, diagonal = false): Array<[Cell, Cell]> {
  const out: Array<[Cell, Cell]> = [];
  for (let r = 0; r < b.length; r++) for (let c = 0; c < b[0].length; c++) {
    for (const d of [{ r, c: c + 1 }, { r: r + 1, c }]) {
      if (!inBounds(b, d) || b[r][c] === b[d.r][d.c]) continue;
      if (findGroups(swapped(b, { r, c }, d), diagonal).length > 0) out.push([{ r, c }, d]);
    }
  }
  return out;
}
