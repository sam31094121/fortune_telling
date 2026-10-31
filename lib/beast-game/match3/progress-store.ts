import { progressionStage } from './progression';

export type Match3ProgressOwner = 'self' | 'guest' | null;
const SELF_KEY = 'match3-hard-progress-self-v1';
const GUEST_KEY = 'match3-hard-progress-guest-v1';
const LEGACY_KEY = 'match3-hard-progress';
const memory = { self: 0, guest: 0, legacy: 0 };
// A failed guest reset must not resurrect the preceding guest on the next read.
let guestResetPending = false;
const slot = (owner: Match3ProgressOwner) => owner ?? 'legacy';
const key = (owner: Match3ProgressOwner) => owner === 'self' ? SELF_KEY : owner === 'guest' ? GUEST_KEY : LEGACY_KEY;
const storage = (owner: Match3ProgressOwner) => owner === 'self' ? window.localStorage : window.sessionStorage;
const normalize = (wins: number) => progressionStage(wins).wins;
function storedWins(raw: string | null): number {
  return raw !== null && /^\d+(?:\.\d+)?$/.test(raw.trim()) ? normalize(Number(raw)) : 0;
}

/** Browser-only progress: never infer ownership from the old unlabelled value. */
export function readMatch3Progress(owner: Match3ProgressOwner): number {
  if (typeof window === 'undefined') return 0;
  const id = slot(owner);
  if (owner === 'guest' && guestResetPending) return memory.guest;
  try { memory[id] = Math.max(memory[id], storedWins(storage(owner).getItem(key(owner)))); }
  catch { /* Storage unavailable: retain this page's progress. */ }
  return memory[id];
}

/** False means persistence failed; the current page still retains its progress. */
export function saveMatch3Progress(owner: Match3ProgressOwner, wins: number): boolean {
  if (typeof window === 'undefined') return false;
  const id = slot(owner);
  memory[id] = Math.max(readMatch3Progress(owner), normalize(wins));
  try {
    storage(owner).setItem(key(owner), String(memory[id]));
    if (owner === 'guest') guestResetPending = false;
    return true;
  } catch { return false; }
}

/** Call on every explicit guest selection, including selecting guest again. */
export function resetGuestMatch3Progress(): void {
  if (typeof window === 'undefined') return;
  memory.guest = 0;
  guestResetPending = true;
  try {
    window.sessionStorage.setItem(GUEST_KEY, '0');
    guestResetPending = false;
  } catch { /* Keep the reset in memory even if the old disk value remains. */ }
}
