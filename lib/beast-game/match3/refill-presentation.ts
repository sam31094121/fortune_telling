import type { DragStep, OrbFall } from './drag';
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
    const falls = [...(step.falls ?? [])].sort((a, b) => b.r - a.r || a.c - b.c);
    const stagger = reduced ? 0 : Math.min(20, 700 / Math.max(1, falls.length - 1));
    const duration = reduced || !falls.length ? 0 : 300 + Math.min(7, Math.max(...falls.map(f => f.r - f.fromRow))) * 18;
    const hold = reduced ? 0 : step.rewards?.length ? 260 : step.emptyCells?.length ? 140 : 0;
    return { clear: reduced ? 60 : 260, falls, stagger, duration, span: (reduced ? 60 : 260) + duration + Math.max(0, falls.length - 1) * stagger + hold };
  });
  const scale = Math.min(1, 5000 / Math.max(1, raw.reduce((sum, frame) => sum + frame.span, 0)));
  let cursor = 0;
  const frames = raw.map(frame => {
    const clearAt = cursor, fallAt = cursor + frame.clear * scale;
    cursor += frame.span * scale;
    return { clearAt, fallAt, endAt: cursor, clearMs: frame.clear * scale,
      motions: frame.falls.map((fall, index): RefillMotion => ({ ...fall, delayMs: index * frame.stagger * scale, durationMs: frame.duration * scale })) };
  });
  return { frames, durationMs: cursor };
}
