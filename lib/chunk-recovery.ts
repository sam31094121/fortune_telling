const CHUNK_RECOVERY_KEY = '__tian_su_chunk_recovery_at__';
const RECOVERY_COOLDOWN_MS = 60_000;

export function recoverFromChunkError(message: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!/loading chunk|cannot find module|webpack/i.test(message)) return false;

  try {
    const previousAttempt = Number(window.sessionStorage.getItem(CHUNK_RECOVERY_KEY) ?? '0');
    if (Date.now() - previousAttempt < RECOVERY_COOLDOWN_MS) return false;

    window.sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
