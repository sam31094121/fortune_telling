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
export function refillPresentation(steps: readonly Pick<DragStep, 'falls' | 'emptyCells' | 'rewards'>[], reduced = false) {
  const raw = steps.map(step => {
    const falls = [...(step.falls ?? [])].sort((a, b) => Number(a.fromRow < 0) - Number(b.fromRow < 0) || b.r - a.r || a.c - b.c);
    const stagger = reduced ? 0 : 20;
    const duration = reduced || !falls.length ? 0 : 300 + Math.min(7, Math.max(...falls.map(f => f.r - f.fromRow))) * 18;
    const hold = reduced ? 0 : step.rewards?.length ? 260 : step.emptyCells?.length ? 140 : 0;
    const survivors = falls.filter(f => f.fromRow >= 0).length;
    const spawnAt = survivors ? duration + Math.max(0, survivors - 1) * stagger : 0;
    const delays = falls.map((fall, index) => fall.fromRow < 0 ? spawnAt + (index - survivors) * stagger : index * stagger);
    return { clear: reduced ? 60 : 260, falls, delays, duration, hold, survivors, stagger, span: (reduced ? 60 : 260) + duration + Math.max(0, ...delays) + hold };
  });
  // Preserve a visible frame between beads in ordinary cascades. Extremely long
  // cascades retain the existing five-second planned budget and use smaller batches.
  const planned = (scale: number, minimumStagger: number) => raw.map(frame => {
    const duration = frame.duration * scale, stagger = reduced ? 0 : Math.max(minimumStagger, frame.stagger * scale);
    const spawnAt = frame.survivors ? duration + Math.max(0, frame.survivors - 1) * stagger : 0;
    const delays = frame.falls.map((fall, index) => fall.fromRow < 0 ? spawnAt + (index - frame.survivors) * stagger : index * stagger);
    return { ...frame, duration, delays, clear: frame.clear * scale, span: frame.clear * scale + duration + Math.max(0, ...delays) + frame.hold * scale };
  });
  const total = (frames: ReturnType<typeof planned>) => frames.reduce((sum, frame) => sum + frame.span, 0);
  let plan = planned(1, 0);
  if (total(plan) > 5000) {
    if (!reduced && total(planned(.4, 18)) <= 5000) {
      let low = .4, high = 1;
      for (let i = 0; i < 40; i++) { const mid = (low + high) / 2; if (total(planned(mid, 18)) <= 5000) low = mid; else high = mid; }
      plan = planned(low, 18);
    } else plan = planned(5000 / Math.max(1, total(plan)), 0);
  }
  let cursor = 0;
  const frames = plan.map(frame => {
    const clearAt = cursor, fallAt = cursor + frame.clear;
    cursor += frame.span;
    return { clearAt, fallAt, endAt: cursor, clearMs: frame.clear,
      motions: frame.falls.map((fall, index): RefillMotion => ({ ...fall, delayMs: frame.delays[index], durationMs: frame.duration })) };
  });
  return { frames, durationMs: cursor };
}

/** Display-only terminal shuffle. Never feed these frames to damage, energy or events. */
export function refillDisplaySteps(result: DragResult): DragStep[] {
  if (!result.reshuffled) return result.steps;
  const cells = result.board.flatMap((row, r) => row.map((_, c) => ({ r, c })));
  return [...result.steps, { chain: 0, groups: [], attackAllowed: false,
    boardAfter: result.board, magicAfter: result.magic, clearedCells: cells,
    falls: cells.map(cell => ({ ...cell, fromRow: -1 })), emptyCells: [], rewards: [] }];
}
