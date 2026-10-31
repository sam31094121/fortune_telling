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
/** Only classifies an already validated path; stored power never replaces physical cells. */
export function isShieldFusionPath(path: readonly Cell[], magic: MagicGrid): boolean {
  return path.length >= MATCH3_MIN_RUN && path.every(p => Number.isFinite(magic[p.r]?.[p.c]) && magic[p.r][p.c] >= 7);
}

/** 普通珠算一顆；數字珠（含盾牌）採用儲存顆數，不再額外加一顆。 */
export function effectiveDragCount(path: readonly Cell[], magic: MagicGrid): number {
  return path.reduce((count, p) => {
    const stored = magic[p.r]?.[p.c] ?? 0;
    return count + (Number.isFinite(stored) && stored > 0 ? stored : 1);
  }, 0);
}

/** Validated drag preview shares the same attack gate as resolution; no board mutation. */
export function dragIntent(path: readonly Cell[], magic: MagicGrid, minimum = MATCH3_MIN_RUN, shieldMode = false): 'idle' | 'incomplete' | 'clear' | 'attack' | 'defend' {
  if (!path.length) return 'idle';
  if (path.length < MATCH3_MIN_RUN) return 'incomplete';
  if (shieldMode && isShieldFusionPath(path, magic)) return 'defend';
  return (shieldMode ? effectiveDragCount(path, magic) : path.length) >= minimum ? 'attack' : 'clear';
}

/** 拖曳中：這格能不能接在路徑後面（相鄰、同色、沒走過）。 */
export function canExtend(b: Board, path: readonly Cell[], p: Cell, diagonal = false, magic?: MagicGrid, shieldMode = false): boolean {
  if (!inBounds(b, p)) return false;
  if (path.length === 0) return true;
  const last = path[path.length - 1];
  if (!isAdjacent(last, p, diagonal)) return false;
  const sameColor = [p, ...path].every(q => inBounds(b, q) && b[q.r][q.c] === b[path[0].r][path[0].c]);
  const pureShields = shieldMode && [p, ...path].every(q => Number.isFinite(magic?.[q.r]?.[q.c]) && magic![q.r][q.c] >= 7);
  if (!sameColor && !pureShields) return false;
  if (path.some((q) => q.r === p.r && q.c === p.c)) return false;
  // Unit-grid edges can only cross away from a vertex as the two diagonals
  // of one square. Revisited vertices/overlapping edges are rejected above.
  if (diagonal && last.r !== p.r && last.c !== p.c) {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], z = path[i];
      if (a.r !== z.r && a.c !== z.c && a.r + z.r === last.r + p.r && a.c + z.c === last.c + p.c) return false;
    }
  }
  return true;
}

export function isValidPath(b: Board, path: readonly Cell[], diagonal = false, magic?: MagicGrid, shieldMode = false): boolean {
  if (path.length === 0) return false;
  for (let i = 0; i < path.length; i++) if (!canExtend(b, path.slice(0, i), path[i], diagonal, magic, shieldMode)) return false;
  return true;
}

/** 盤面上有沒有任何一組 3 顆以上相連的同色珠（＝至少一步可拖）。 */
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
export function largestDragChain(b: Board, diagonal = false): number {
  const seen = new Set<number>(); let best = 0;
  for (let r = 0; r < b.length; r++) for (let c = 0; c < b[0].length; c++) {
    if (seen.has(r * 1000 + c)) continue;
    let n = 0; const st: Cell[] = [{ r, c }]; seen.add(r * 1000 + c);
    while (st.length) { const p = st.pop()!; n++;
      for (const q of (diagonal ? N8 : N4).map(([dr, dc]) => ({ r: p.r + dr, c: p.c + dc }))) {
        if (inBounds(b, q) && !seen.has(key(q)) && b[q.r][q.c] === b[r][c]) { seen.add(key(q)); st.push(q); }
      } }
    best = Math.max(best, n);
  }
  return best;
}
export function hasDragMove(b: Board, diagonal = false, minimum = MATCH3_MIN_RUN, magic?: MagicGrid): boolean {
  // A mixed-color shield path can never become an attack. A same-color path
  // can, but only if its connected color component contains a non-shield.
  // Prune shield-only components before DFS (a full 7x7 shield board otherwise
  // has exponentially many same-color paths, none of which can attack).
  const attackStarts = new Set<number>();
  if (magic && minimum > MATCH3_MIN_RUN) {
    const seen = new Set<number>();
    for (let r = 0; r < b.length; r++) for (let c = 0; c < b[r].length; c++) {
      const start = { r, c }; if (seen.has(key(start))) continue;
      const component: Cell[] = [start]; seen.add(key(start));
      for (let i = 0; i < component.length; i++) {
        const p = component[i];
        for (const [dr, dc] of (diagonal ? N8 : N4)) {
          const q = { r: p.r + dr, c: p.c + dc };
          if (inBounds(b, q) && !seen.has(key(q)) && b[q.r][q.c] === b[r][c]) {
            seen.add(key(q)); component.push(q);
          }
        }
      }
      const nonShield = component.some(p => !Number.isFinite(magic[p.r]?.[p.c]) || magic[p.r][p.c] < 7);
      if (nonShield && component.length >= MATCH3_MIN_RUN && effectiveDragCount(component, magic) >= minimum) component.forEach(p => attackStarts.add(key(p)));
    }
  }
  const walk = (path: Cell[]): boolean => {
    const fusion = magic && isShieldFusionPath(path, magic);
    if (fusion) {
      if (minimum <= MATCH3_MIN_RUN) return true;
      if (path.some(p => b[p.r][p.c] !== b[path[0].r][path[0].c])) return false;
    } else if (path.length >= MATCH3_MIN_RUN && (magic ? effectiveDragCount(path, magic) : path.length) >= minimum) return true;
    const last = path[path.length - 1];
    return (diagonal ? N8 : N4).some(([dr, dc]) => {
      const next = { r: last.r + dr, c: last.c + dc };
      return canExtend(b, path, next, diagonal, magic, !!magic) && walk([...path, next]);
    });
  };
  return b.some((row, r) => row.some((_, c) => (!magic || minimum <= MATCH3_MIN_RUN || attackStarts.has(key({ r, c }))) && walk([{ r, c }])));
}

/** 有效盤面：沒有現成直線、至少一步可拖。 */
/**
 * 無步可走時洗盤，但魔法珠原地保留（位置、顏色、威力都不變）；只重洗普通珠。
 * 保證洗完至少有一步可拖、且沒有現成直線三消。
 */
export function reshuffleKeepMagic(board: Board, magic: MagicGrid, rng: Rng, diagonal = false, minimum = MATCH3_MIN_RUN): { board: Board; magic: MagicGrid } {
  const rows = board.length, cols = board[0].length;
  const keep = magic.map((row) => row.slice());
  let playable: Board | null = null;
  for (let i = 0; i < 300; i++) {
    const b = generateBoard(rng, rows, cols, diagonal);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (keep[r][c] > 0) b[r][c] = board[r][c];
    if (findGroups(b, diagonal).length !== 0) continue;
    if (hasDragMove(b, diagonal, minimum, keep)) return { board: b, magic: keep };
    if (hasDragMove(b, diagonal, MATCH3_MIN_RUN, keep)) playable = b;
  }
  // 攻擊門檻不足仍可三珠消除換盤；不得把完全無步可走的最後一盤交給客戶。
  if (playable) return { board: playable, magic: keep };
  if (hasDragMove(board, diagonal, MATCH3_MIN_RUN, keep)) return { board: cloneBoard(board), magic: keep };
  throw new Error('match3: 保留特殊珠時無法生成可消除盤面');
}

export function generateDragBoard(rng: Rng, rows?: number, cols?: number, diagonal = false, minimum = MATCH3_MIN_RUN): Board {
  for (let i = 0; i < 100; i++) { const b = generateBoard(rng, rows, cols, diagonal); if (hasDragMove(b, diagonal, minimum)) return b; }
  // 高關卡可以先消除三顆補珠，只有攻擊仍須達當關門檻。
  if (minimum > MATCH3_MIN_RUN) return generateDragBoard(rng, rows, cols, diagonal, MATCH3_MIN_RUN);
  throw new Error('match3: 無法生成可拖曳盤面');
}

export interface MagicSpawn { r: number; c: number; element: BeastElement; power: number }
export interface MagicTrigger { r: number; c: number; element: BeastElement; power: number; chain: number }
/** 一段消除裡的一組；power＝普通顆數（上限 10）＋組內魔法珠威力（不設上限）。 */
export interface DragGroup extends MatchGroup { power: number; magic?: boolean; magicPower?: number; skill5?: boolean }
export interface DragStep extends CascadeStep { groups: DragGroup[]; magicAfter: MagicGrid }
export interface DragResult {
  valid: boolean;
  attackAllowed: boolean;
  shieldFusion: boolean;
  reason?: 'short' | 'path';
  board: Board; magic: MagicGrid; steps: DragStep[];
  chainLength: number; effectiveLength: number; element: BeastElement | null;
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

export function resolveDrag(board: Board, path: readonly Cell[], rng: Rng, magicIn?: MagicGrid, maxChains = 50, diagonal = false, shieldMode = false, minimum = MATCH3_MIN_RUN): DragResult {
  const magic0 = magicIn ?? emptyMagic(board);
  const effectiveLength = effectiveDragCount(path, magic0);
  const fail = (reason: 'short' | 'path'): DragResult => ({ valid: false, attackAllowed: false, shieldFusion: false, reason, board, magic: magic0, steps: [], chainLength: path.length, effectiveLength, element: null, magicSpawn: null, skill5: false, magicTriggered: [], reshuffled: false });
  if (!isValidPath(board, path, diagonal, magic0, shieldMode)) return fail('path');
  if (path.length < MATCH3_MIN_RUN) return fail('short');
  const shieldFusion = shieldMode && isShieldFusionPath(path, magic0);
  const element = board[path[0].r][path[0].c];
  const n = path.length;
  const ruleLength = shieldMode ? effectiveLength : n;
  const triggers: MagicTrigger[] = [];
  const skill5 = !shieldFusion && ruleLength === SKILL5_LENGTH;
  const shieldTriggered = shieldMode && path.some(p => magic0[p.r][p.c] >= 7);
  const cells = shieldTriggered && !shieldFusion
    ? board.flatMap((row, r) => row.flatMap((e, c) => e === element ? [{ r, c }] : []))
    : path.map(p => ({ r: p.r, c: p.c }));
  const firstGroups: DragGroup[] = shieldFusion
    ? [...new Set(cells.map(p => board[p.r][p.c]))].map(e => {
      const colored = cells.filter(p => board[p.r][p.c] === e);
      return { element: e, cells: colored, size: colored.length, longest: colored.length, runs: [colored.length], power: 0 };
    })
    : [scoreGroup({ element, cells, size: cells.length, longest: n, runs: [n] }, magic0, 1, triggers)];
  if (skill5) firstGroups[0].skill5 = true;
  const cleared = new Set(cells.map(key));
  let spawn: MagicSpawn | null = null;
  const m1 = magic0.map((x) => x.slice());
  cells.forEach((p) => { m1[p.r][p.c] = 0; });
  if (!shieldTriggered && MAGIC_ORB_SPAWN_ENABLED && ruleLength >= MAGIC_ORB_MIN_LENGTH) {
    const end = path[n - 1]; cleared.delete(key(end)); m1[end.r][end.c] = ruleLength;
    spawn = { r: end.r, c: end.c, element, power: ruleLength };
  }
  let { board: b, magic: m } = collapseBoth(board, m1, cleared, rng);
  if (spawn) { // 找出魔法珠掉落後的位置（同欄往下）
    for (let r = b.length - 1; r >= 0; r--) if (m[r][spawn.c] === ruleLength && b[r][spawn.c] === element) { spawn = { ...spawn, r }; break; }
  }
  const steps: DragStep[] = [{ chain: 1, groups: firstGroups, boardAfter: cloneBoard(b), magicAfter: m.map((x) => x.slice()) }];
  for (let chain = 2; chain <= maxChains; chain++) {
    // 盾牌留待玩家再次連入；自動落珠不消耗剛獲得的獎勵。
    const groups = findGroups(b, diagonal).map(g => {
      if (!shieldMode) return g;
      const cells = g.cells.filter(p => m[p.r][p.c] < 7);
      return { ...g, cells, size: cells.length };
    }).filter(g => g.size >= MATCH3_MIN_RUN);
    if (groups.length === 0) break;
    const scored = groups.map((g) => shieldFusion ? { ...g, power: 0 } : scoreGroup(g, m, chain, triggers));
    const cl = new Set<number>(); groups.forEach((g) => g.cells.forEach((p) => cl.add(key(p))));
    const mm = m.map((x) => x.slice()); cl.forEach((k) => { mm[Math.floor(k / 1000)][k % 1000] = 0; });
    ({ board: b, magic: m } = collapseBoth(b, mm, cl, rng));
    steps.push({ chain, groups: scored, boardAfter: cloneBoard(b), magicAfter: m.map((x) => x.slice()) });
  }
  let reshuffled = false;
  if (!hasDragMove(b, diagonal, minimum, shieldMode ? m : undefined)) { const rs = reshuffleKeepMagic(b, m, rng, diagonal, minimum); b = rs.board; m = rs.magic; reshuffled = true; }
  const attackAllowed = dragIntent(path, magic0, minimum, shieldMode) === 'attack';
  steps.forEach(step => { step.attackAllowed = attackAllowed; });
  return { valid: true, attackAllowed, shieldFusion, board: b, magic: m, steps, chainLength: n, effectiveLength, element: shieldFusion ? null : element, magicSpawn: spawn, skill5, magicTriggered: triggers, reshuffled };
}
