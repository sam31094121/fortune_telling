import type { DragStep, OrbFall } from './drag';

export interface RefillMotion extends OrbFall { delayMs: number; durationMs: number }
/** Presentation timeline only: consume recorded falls; never generate or score orbs. */
export function refillPresentation(steps: readonly Pick<DragStep, 'falls'>[], reduced = false) {
  const raw = steps.map(step => {
    const falls = [...(step.falls ?? [])].sort((a, b) => b.r - a.r || a.c - b.c);
    const stagger = reduced ? 0 : Math.min(20, 700 / Math.max(1, falls.length - 1));
    const duration = reduced || !falls.length ? 0 : 300 + Math.min(7, Math.max(...falls.map(f => f.r - f.fromRow))) * 18;
    return { clear: reduced ? 60 : 260, falls, stagger, duration, span: (reduced ? 60 : 260) + duration + Math.max(0, falls.length - 1) * stagger };
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
