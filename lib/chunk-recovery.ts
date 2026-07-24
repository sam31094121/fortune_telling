const CHUNK_RECOVERY_KEY = '__tian_su_chunk_recovery_at__';
const CHUNK_RECOVERY_WINDOW_KEY = '__tian_su_chunk_recovery_window__';
const RECOVERY_COOLDOWN_MS = 60_000;
const RECOVERY_WINDOW_MS = 5 * 60_000;
const MAX_RECOVERY_ATTEMPTS_PER_WINDOW = 2;

type RecoveryWindow = {
  startedAt: number;
  attempts: number;
};

function readRecoveryWindow(now: number): RecoveryWindow {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(CHUNK_RECOVERY_WINDOW_KEY) ?? '{}') as Partial<RecoveryWindow>;
    const startedAt = typeof stored.startedAt === 'number' ? stored.startedAt : 0;
    const attempts = typeof stored.attempts === 'number' ? stored.attempts : 0;

    if (now - startedAt > RECOVERY_WINDOW_MS) {
      return { startedAt: now, attempts: 0 };
    }

    return { startedAt, attempts };
  } catch {
    return { startedAt: now, attempts: 0 };
  }
}

export function recoverFromChunkError(message: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!/chunkloaderror|loading chunk|loading css chunk|cannot find module|failed to fetch dynamically imported module|webpack/i.test(message)) return false;
  if (navigator.onLine === false) return false;

  try {
    const now = Date.now();
    const previousAttempt = Number(window.sessionStorage.getItem(CHUNK_RECOVERY_KEY) ?? '0');
    if (now - previousAttempt < RECOVERY_COOLDOWN_MS) return false;

    const recoveryWindow = readRecoveryWindow(now);
    if (recoveryWindow.attempts >= MAX_RECOVERY_ATTEMPTS_PER_WINDOW) return false;

    window.sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(now));
    window.sessionStorage.setItem(
      CHUNK_RECOVERY_WINDOW_KEY,
      JSON.stringify({ startedAt: recoveryWindow.startedAt, attempts: recoveryWindow.attempts + 1 } satisfies RecoveryWindow),
    );
    window.location.replace(window.location.href);
    return true;
  } catch {
    return false;
  }
}
