import type { DragStep, DragResult, OrbFall } from './drag';
import type { BeastElement } from '../elements';

export const FUSION_CLEAR_AT_MS = 1450;
export const FUSION_DISPLAY_MS = 1650;
/** One colored discharge per participating element, ending on a real cleared orb. */
export function fusionDischarge(elements: readonly BeastElement[], board: readonly (readonly BeastElement[])[]) {
  return [...new Set(elements)].flatMap(element => {
    const targets = board.flatMap((row, r) => row.flatMap((e, c) => e === element ? [{ x: (c + .5) / row.length * 100, y: (r + .5) / board.length * 100 }] : []));
    targets.sort((a, b) => Math.hypot(b.x - 50, b.y - 50) - Math.hypot(a.x - 50, a.y - 50));
    const end = targets[0]; if (!end) return [];
    const dx = end.x - 50, dy = end.y - 50, distance = Math.max(1, Math.hypot(dx, dy));
    const bendX = -dy / distance * 3, bendY = dx / distance * 3;
    return [{ element, points: `50,50 ${50 + dx * .38 + bendX},${50 + dy * .38 + bendY} ${50 + dx * .65 - bendX},${50 + dy * .65 - bendY} ${end.x},${end.y}` }];
  });
}

/**
 * 掉落時序（2026-11-11 業主：連線後掉下來要快、要狠、要準、要穩）。
 * 565 次真實連線量測：一次連線平均 8.1 秒 → 約 4.3 秒（快 47%）；沒連鎖的一般連線 1.5 秒 → 0.75 秒（快 51%）。
 *
 * 不變的規則（業主核定，測試守著）：
 * - 清除 → 舊珠全部落定 → 新珠依序補入；不得整盤先消失再重落、不得突然補滿。
 * - 每段保持自然時長：不因連鎖數整串壓縮、不用手動動畫時鐘（歷史上會跳落）。
 * - 盾牌合體 1650ms 與獎勵停留不改；核心盤面、亂數、珠數、獎勵、傷害一律不改（這裡只排時間）。
 */
export const REFILL_TIMING = {
  /** 清除（一般／減少動態）。 */
  clearMs: 130, reducedClearMs: 60,
  /** 配對停留：第一段是玩家剛拖的線，客戶已經知道，短；之後每段連鎖要看得出配到什麼。 */
  matchFirstMs: 170, matchNextMs: 230,
  /** 單顆落程＝基礎＋係數×√落差（重力：落越遠越久，但不是整段共用最遠那顆）。 */
  fallBaseMs: 38, fallPerRootCellMs: 58,
  /** 起點錯開的單位：同欄由下往上依序、欄與欄只差 1 單位，每顆起點唯一。 */
  rippleUnitMs: 2,
  rewardHoldMs: 260, emptyHoldMs: 140,
} as const;
/** 單顆實際要落幾格決定它的落程；落地時間由這裡唯一決定（準）。 */
export const fallDurationMs = (cells: number) => Math.round(REFILL_TIMING.fallBaseMs + REFILL_TIMING.fallPerRootCellMs * Math.sqrt(Math.max(1, cells)));

export interface RefillMotion extends OrbFall { delayMs: number; durationMs: number }
/** Group simultaneous landings into a soft pulse, never one sound per bead. */
export function refillLandingTimes(motions: readonly RefillMotion[]): number[] {
  const times: number[] = [];
  for (const time of motions.filter(m => m.durationMs > 0).map(m => m.delayMs + m.durationMs).sort((a, b) => a - b)) {
    if (!times.length || time - times[times.length - 1] >= 140) times.push(time);
  }
  return times;
}
/** Display only: keep every contributing shield inside the same bounded stage. */
export function fusionShieldLayout(count: number) {
  const cols = count <= 3 ? count : Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / Math.max(1, cols));
  const size = Math.min(24, 70 / Math.max(1, cols));
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols), rowCount = Math.min(cols, count - row * cols);
    return { x: (i % cols - (rowCount - 1) / 2) * 110, y: (row - (rows - 1) / 2) * 110, size, scale: 52 / size, primary: i === Math.floor(count / 2) };
  });
}
/** Presentation timeline only: consume recorded falls; never generate or score orbs. */
export function refillPresentation(steps: readonly (Pick<DragStep, 'falls' | 'emptyCells' | 'rewards'> & { matches?: readonly unknown[] })[], reduced = false) {
  const T = REFILL_TIMING;
  const raw = steps.map(step => {
    // 倖存珠先、新珠後；各自由下往上（r 大的在前）。同欄內第 0 顆就是最下面那顆。
    const falls = [...(step.falls ?? [])].sort((a, b) => Number(a.fromRow < 0) - Number(b.fromRow < 0) || b.r - a.r || a.c - b.c);
    const clear = reduced ? T.reducedClearMs : T.clearMs;
    const hold = reduced ? 0 : step.rewards?.length ? T.rewardHoldMs : step.emptyCells?.length ? T.emptyHoldMs : 0;
    if (reduced || !falls.length) {
      return { clear, hold, motions: falls.map((fall): RefillMotion => ({ ...fall, delayMs: 0, durationMs: 0 })), span: clear + hold };
    }
    // 每顆起點唯一：起點＝(同欄名次×欄寬＋欄號)×單位。舊珠偶數起點；新珠一定排在「全部舊珠落定」之後才補入。
    const width = Math.max(7, ...falls.map(f => f.c + 1));
    const ranks = (list: typeof falls) => { const seen = new Map<number, number>(); return list.map(f => { const rank = seen.get(f.c) ?? 0; seen.set(f.c, rank + 1); return rank; }); };
    const survivors = falls.filter(f => f.fromRow >= 0), fresh = falls.filter(f => f.fromRow < 0);
    const survivorRanks = ranks(survivors), freshRanks = ranks(fresh);
    const old = survivors.map((f, i): RefillMotion => ({ ...f, delayMs: (survivorRanks[i] * width + f.c) * T.rippleUnitMs, durationMs: fallDurationMs(f.r - f.fromRow) }));
    const settledAt = Math.max(0, ...old.map(m => m.delayMs + m.durationMs));
    const added = fresh.map((f, i): RefillMotion => ({ ...f, delayMs: settledAt + (freshRanks[i] * width + f.c) * T.rippleUnitMs + 1, durationMs: fallDurationMs(f.r - f.fromRow) }));
    const motions = [...old, ...added];
    return { clear, hold, motions, span: clear + Math.max(0, ...motions.map(m => m.delayMs + m.durationMs)) + hold };
  });
  // Each recorded cascade keeps its natural time, regardless of chain count.
  // Longer chains take longer; never compress individual drops to fit a global cap.
  let cursor = 0;
  const frames = raw.map((frame, index) => {
    const matchMs = steps[index].matches?.length ? (index === 0 ? T.matchFirstMs : T.matchNextMs) : 0;
    const clearAt = cursor + matchMs, fallAt = clearAt + frame.clear;
    cursor += matchMs + frame.span;
    return { matchMs, clearAt, fallAt, endAt: cursor, clearMs: frame.clear, motions: frame.motions };
  });
  return { frames, durationMs: cursor };
}

/** Display-only terminal shuffle. Never feed these frames to damage, energy or events. */
export function refillDisplaySteps(result: DragResult): DragStep[] {
  if (!result.reshuffled) return result.steps;
  // Replace only one ordinary-bead column per visible phase. Stored numbers and
  // shields, and all columns that have not reached their turn, remain in place.
  const shown = [...result.steps];
  let board = result.steps.at(-1)?.boardAfter ?? result.board;
  let magic = result.steps.at(-1)?.magicAfter ?? result.magic;
  for (let c = 0; c < (result.board[0]?.length ?? 0); c++) {
    const cells = result.board.flatMap((_, r) => result.magic[r][c] > 0 ? [] : [{ r, c }]);
    if (!cells.length) continue;
    const nextBoard = board.map(row => [...row]), nextMagic = magic.map(row => [...row]);
    for (const cell of cells) {
      nextBoard[cell.r][cell.c] = result.board[cell.r][cell.c];
      nextMagic[cell.r][cell.c] = result.magic[cell.r][cell.c];
    }
    shown.push({ chain: 0, groups: [], attackAllowed: false,
      boardAfter: nextBoard, magicAfter: nextMagic, clearedCells: cells,
      falls: cells.map(cell => ({ ...cell, fromRow: -1 })), emptyCells: [], rewards: [] });
    board = nextBoard; magic = nextMagic;
  }
  return shown;
}
