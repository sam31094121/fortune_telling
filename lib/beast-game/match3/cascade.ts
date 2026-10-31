/** 交換後的消除→掉落→補珠→連鎖，逐段記錄。無效交換回傳 valid:false 並保持原盤。 */
import { cloneBoard, findValidMoves, generateBoard, isAdjacent, inBounds, randomOrb, swapped, type Board, type Cell, type Rng } from './board';
import { findGroups, type MatchGroup } from './match';

export interface CascadeStep { chain: number; groups: MatchGroup[]; boardAfter: Board; attackAllowed?: boolean }
export interface SwapResult { valid: boolean; board: Board; steps: CascadeStep[]; reshuffled: boolean }

export function collapse(b: Board, cleared: Set<number>, rng: Rng): Board {
  const rows = b.length, cols = b[0].length;
  const n = cloneBoard(b);
  for (let c = 0; c < cols; c++) {
    const keep: Board[number] = [];
    for (let r = rows - 1; r >= 0; r--) if (!cleared.has(r * 1000 + c)) keep.push(b[r][c]);
    for (let r = rows - 1, i = 0; r >= 0; r--, i++) n[r][c] = i < keep.length ? keep[i] : randomOrb(rng);
  }
  return n;
}

export function resolveSwap(board: Board, a: Cell, d: Cell, rng: Rng, maxChains = 50): SwapResult {
  if (!inBounds(board, a) || !inBounds(board, d) || !isAdjacent(a, d)) return { valid: false, board, steps: [], reshuffled: false };
  let b = swapped(board, a, d);
  if (findGroups(b).length === 0) return { valid: false, board, steps: [], reshuffled: false };
  const steps: CascadeStep[] = [];
  for (let chain = 1; chain <= maxChains; chain++) {
    const groups = findGroups(b);
    if (groups.length === 0) break;
    const cleared = new Set<number>();
    groups.forEach((g) => g.cells.forEach((p) => cleared.add(p.r * 1000 + p.c)));
    b = collapse(b, cleared, rng);
    steps.push({ chain, groups, boardAfter: cloneBoard(b) });
  }
  let reshuffled = false;
  if (findValidMoves(b).length === 0) { b = generateBoard(rng, b.length, b[0].length); reshuffled = true; }
  return { valid: true, board: b, steps, reshuffled };
}
