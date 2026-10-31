/** Presentation only. Clock advances after committed frames, never from an upfront timer batch. */
export interface RefillClock {
  frame(callback: (time: number) => void): number;
  cancel(id: number): void;
  visible(): boolean;
  onVisibility(callback: () => void): () => void;
}
export const browserRefillClock = (): RefillClock => ({
  frame: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id),
  visible: () => document.visibilityState !== 'hidden',
  onVisibility: callback => { document.addEventListener('visibilitychange', callback); return () => document.removeEventListener('visibilitychange', callback); },
});
export interface RefillRunnerFrame { clearAt: number; fallAt: number; endAt: number }
export interface RefillCue { at: number; kind: 'drop' | 'merge' }
const cancelled = () => new DOMException('Refill playback cancelled', 'AbortError');
function committed(commit: () => Promise<void>, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(cancelled()); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(() => { if (signal.aborted) throw cancelled(); return commit(); }).then(() => { signal.removeEventListener('abort', abort); if (signal.aborted) reject(cancelled()); else resolve(); }, error => { signal.removeEventListener('abort', abort); reject(error); });
  });
}
function visibleWait(clock: RefillClock, duration: number, signal: AbortSignal, progress?: (elapsed: number, late: boolean) => void, maxStep = 50): Promise<void> {
  return new Promise((resolve, reject) => {
    let handle: number | null = null, last: number | null = null, elapsed = 0, visualElapsed = 0;
    const clean = () => { if (handle !== null) clock.cancel(handle); unsubscribe(); signal.removeEventListener('abort', abort); };
    const abort = () => { clean(); reject(cancelled()); };
    const tick = (time: number) => {
      handle = null;
      if (!clock.visible()) { last = null; return; }
      // A long main-thread stall cannot consume the next phases before they paint.
      const delta = last === null ? 0 : Math.max(0, time - last);
      elapsed += Math.min(maxStep, delta); visualElapsed += delta;
      last = time; progress?.(elapsed, delta > 80);
      if (elapsed >= duration) { clean(); resolve(); } else handle = clock.frame(tick);
    };
    const visibility = () => { last = null; if (!clock.visible()) { if (handle !== null) clock.cancel(handle); handle = null; } else if (handle === null) handle = clock.frame(tick); };
    const unsubscribe = clock.onVisibility(visibility);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort(); else visibility();
  });
}
export async function runRefillPlayback(frames: readonly RefillRunnerFrame[], options: {
  signal: AbortSignal; clock?: RefillClock; initialDelayMs?: number;
  intro?: () => Promise<void>;
  commit: (phase: 'clear' | 'fall', index: number) => Promise<void>;
  cues?: (index: number) => readonly RefillCue[];
  cue?: (kind: RefillCue['kind']) => void;
  pause?: (paused: boolean) => void;
  begin?: (phase: 'intro' | 'clear' | 'fall', index: number) => void;
  advance?: (elapsed: number) => void;
  complete: () => void;
}): Promise<void> {
  const clock = options.clock ?? browserRefillClock();
  const unsubscribe = clock.onVisibility(() => options.pause?.(!clock.visible()));
  try {
    options.pause?.(!clock.visible());
    await visibleWait(clock, 0, options.signal);
    if (options.intro) { await committed(options.intro, options.signal); options.begin?.('intro', -1); options.pause?.(!clock.visible()); }
    await visibleWait(clock, options.initialDelayMs ?? 0, options.signal, elapsed => options.advance?.(elapsed));
    for (let i = 0; i < frames.length; i++) {
      if (options.signal.aborted) throw cancelled();
      await committed(() => options.commit('clear', i), options.signal);
      options.begin?.('clear', i);
      options.pause?.(!clock.visible());
      await visibleWait(clock, frames[i].fallAt - frames[i].clearAt, options.signal, elapsed => options.advance?.(elapsed));
      await committed(() => options.commit('fall', i), options.signal);
      options.begin?.('fall', i);
      options.pause?.(!clock.visible());
      const cues = [...(options.cues?.(i) ?? [])].sort((a, b) => a.at - b.at);
      let cursor = 0;
      await visibleWait(clock, frames[i].endAt - frames[i].fallAt, options.signal, (elapsed, late) => {
        options.advance?.(elapsed);
        let latest: RefillCue | undefined;
        while (cursor < cues.length && cues[cursor].at <= elapsed) latest = cues[cursor++];
        // No backlog burst when an expensive frame misses several cue instants.
        if (latest && !late && elapsed - latest.at <= 80 && !options.signal.aborted) options.cue?.(latest.kind);
      }, 1000 / 60);
    }
    if (!options.signal.aborted) options.complete();
  } finally { unsubscribe(); }
}
