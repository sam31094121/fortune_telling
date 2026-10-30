/**
 * 拖曳連珠：手指／滑鼠一顆顆拖過相鄰（上下左右）的同色珠，放開才發動。
 * 未滿 3 顆取消；4 顆以上在放開的格子生成魔法珠（威力＝顆數）；剛好 5 顆觸發五珠技。
 * 魔法珠存在獨立的 MagicGrid（0＝普通珠，>0＝魔法珠威力），盤面型別不變。純邏輯。
 */
import type { BeastElement } from '../elements';
import { MAGIC_ORB_MIN_LENGTH, MAGIC_ORB_SPAWN_ENABLED, MATCH3_MIN_RUN, SKILL5_LENGTH, normalPower } from './config';
import { cloneBoard, generateBoard, inBounds, isAdjacent, randomOrb, type Board, type Cell, type Rng } from './board';
import { findGroups, type MatchGroup } from './match';
import type { CascadeStep } from './cascade';

export type MagicGrid = number[][];
export const emptyMagic = (b: Board): MagicGrid => b.map((row) => row.map(() => 0));
const key = (p: Cell) => p.r * 1000 + p.c;

/** 拖曳中：這格能不能接在路徑後面（相鄰、同色、沒走過）。 */
export function canExtend(b: Board, path: readonly Cell[], p: Cell): boolean {
  if (!inBounds(b, p)) return false;
  if (path.length === 0) return true;
  const last = path[path.length - 1];
  if (!isAdjacent(last, p)) return false;
  if (b[p.r][p.c] !== b[path[0].r][path[0].c]) return false;
  return !path.some((q) => q.r === p.r && q.c === p.c);
}

export function isValidPath(b: Board, path: readonly Cell[]): boolean {
  if (path.length === 0) return false;
  for (let i = 0; i < path.length; i++) if (!canExtend(b, path.slice(0, i), path[i])) return false;
  return true;
}

/** 盤面上有沒有任何一組 3 顆以上相連的同色珠（＝至少一步可拖）。 */
export function largestDragChain(b: Board): number {
  const seen = new Set<number>(); let best = 0;
  for (let r = 0; r < b.length; r++) for (let c = 0; c < b[0].length; c++) {
    if (seen.has(r * 1000 + c)) continue;
    let n = 0; const st: Cell[] = [{ r, c }]; seen.add(r * 1000 + c);
    while (st.length) { const p = st.pop()!; n++;
      for (const q of [{ r: p.r + 1, c: p.c }, { r: p.r - 1, c: p.c }, { r: p.r, c: p.c + 1 }, { r: p.r, c: p.c - 1 }]) {
        if (inBounds(b, q) && !seen.has(key(q)) && b[q.r][q.c] === b[r][c]) { seen.add(key(q)); st.push(q); }
      } }
    best = Math.max(best, n);
  }
  return best;
}
export const hasDragMove = (b: Board) => largestDragChain(b) >= MATCH3_MIN_RUN;

/** 有效盤面：沒有現成直線、至少一步可拖。 */
/**
 * 無步可走時洗盤，但魔法珠原地保留（位置、顏色、威力都不變）；只重洗普通珠。
 * 保證洗完至少有一步可拖、且沒有現成直線三消。
 */
export function reshuffleKeepMagic(board: Board, magic: MagicGrid, rng: Rng): { board: Board; magic: MagicGrid } {
  const rows = board.length, cols = board[0].length;
  const keep = magic.map((row) => row.slice());
  let last: Board = board;
  for (let i = 0; i < 300; i++) {
    const b = generateBoard(rng, rows, cols);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (keep[r][c] > 0) b[r][c] = board[r][c];
    last = b;
    if (findGroups(b).length === 0 && hasDragMove(b)) return { board: b, magic: keep };
  }
  return { board: last, magic: keep };
}

export function generateDragBoard(rng: Rng, rows?: number, cols?: number): Board {
  for (let i = 0; i < 100; i++) { const b = generateBoard(rng, rows, cols); if (hasDragMove(b)) return b; }
  throw new Error('match3: 無法生成可拖曳盤面');
}

export interface MagicSpawn { r: number; c: number; element: BeastElement; power: number }
export interface MagicTrigger { r: number; c: number; element: BeastElement; power: number; chain: number }
/** 一段消除裡的一組；power＝普通顆數（上限 10）＋組內魔法珠威力（不設上限）。 */
export interface DragGroup extends MatchGroup { power: number; magic?: boolean; magicPower?: number; skill5?: boolean }
export interface DragStep extends CascadeStep { groups: DragGroup[]; magicAfter: MagicGrid }
export interface DragResult {
  valid: boolean;
  reason?: 'short' | 'path';
  board: Board; magic: MagicGrid; steps: DragStep[];
  chainLength: number; element: BeastElement | null;
  magicSpawn: MagicSpawn | null; skill5: boolean; magicTriggered: MagicTrigger[]; reshuffled: boolean;
}

function collapseBoth(b: Board, m: MagicGrid, cleared: Set<number>, rng: Rng): { board: Board; magic: MagicGrid } {
  const rows = b.length, cols = b[0].length; const nb = cloneBoard(b); const nm = m.map((x) => x.slice());
  for (let c = 0; c < cols; c++) {
    const keep: Array<[BeastElement, number]> = [];
    for (let r = rows - 1; r >= 0; r--) if (!cleared.has(r * 1000 + c)) keep.push([b[r][c], m[r][c]]);
    for (let r = rows - 1, i = 0; r >= 0; r--, i++) { if (i < keep.length) { nb[r][c] = keep[i][0]; nm[r][c] = keep[i][1]; } else { nb[r][c] = randomOrb(rng); nm[r][c] = 0; } }
  }
  return { board: nb, magic: nm };
}

function scoreGroup(g: MatchGroup, m: MagicGrid, chain: number, triggers: MagicTrigger[]): DragGroup {
  let magicPower = 0, magicCells = 0;
  for (const p of g.cells) if (m[p.r]?.[p.c] > 0) { magicPower += m[p.r][p.c]; magicCells++; triggers.push({ r: p.r, c: p.c, element: g.element, power: m[p.r][p.c], chain }); }
  const out: DragGroup = { ...g, power: normalPower(g.size - magicCells) + magicPower };
  if (magicCells) { out.magic = true; out.magicPower = magicPower; }
  return out;
}

export function resolveDrag(board: Board, path: readonly Cell[], rng: Rng, magicIn?: MagicGrid, maxChains = 50): DragResult {
  const magic0 = magicIn ?? emptyMagic(board);
  const fail = (reason: 'short' | 'path'): DragResult => ({ valid: false, reason, board, magic: magic0, steps: [], chainLength: path.length, element: null, magicSpawn: null, skill5: false, magicTriggered: [], reshuffled: false });
  if (!isValidPath(board, path)) return fail('path');
  if (path.length < MATCH3_MIN_RUN) return fail('short');
  const element = board[path[0].r][path[0].c];
  const n = path.length;
  const triggers: MagicTrigger[] = [];
  const skill5 = n === SKILL5_LENGTH;
  const g1 = scoreGroup({ element, cells: path.map((p) => ({ r: p.r, c: p.c })), size: n, longest: n, runs: [n] }, magic0, 1, triggers);
  if (skill5) g1.skill5 = true;
  const cleared = new Set(path.map(key));
  let spawn: MagicSpawn | null = null;
  const m1 = magic0.map((x) => x.slice());
  path.forEach((p) => { m1[p.r][p.c] = 0; });
  if (MAGIC_ORB_SPAWN_ENABLED && n >= MAGIC_ORB_MIN_LENGTH) {
    const end = path[n - 1]; cleared.delete(key(end)); m1[end.r][end.c] = n;
    spawn = { r: end.r, c: end.c, element, power: n };
  }
  let { board: b, magic: m } = collapseBoth(board, m1, cleared, rng);
  if (spawn) { // 找出魔法珠掉落後的位置（同欄往下）
    for (let r = b.length - 1; r >= 0; r--) if (m[r][spawn.c] === n && b[r][spawn.c] === element) { spawn = { ...spawn, r }; break; }
  }
  const steps: DragStep[] = [{ chain: 1, groups: [g1], boardAfter: cloneBoard(b), magicAfter: m.map((x) => x.slice()) }];
  for (let chain = 2; chain <= maxChains; chain++) {
    const groups = findGroups(b); if (groups.length === 0) break;
    const scored = groups.map((g) => scoreGroup(g, m, chain, triggers));
    const cl = new Set<number>(); groups.forEach((g) => g.cells.forEach((p) => cl.add(key(p))));
    const mm = m.map((x) => x.slice()); cl.forEach((k) => { mm[Math.floor(k / 1000)][k % 1000] = 0; });
    ({ board: b, magic: m } = collapseBoth(b, mm, cl, rng));
    steps.push({ chain, groups: scored, boardAfter: cloneBoard(b), magicAfter: m.map((x) => x.slice()) });
  }
  let reshuffled = false;
  if (!hasDragMove(b)) { const rs = reshuffleKeepMagic(b, m, rng); b = rs.board; m = rs.magic; reshuffled = true; }
  return { valid: true, board: b, magic: m, steps, chainLength: n, element, magicSpawn: spawn, skill5, magicTriggered: triggers, reshuffled };
}
