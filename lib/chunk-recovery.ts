const CHUNK_RECOVERY_KEY = '__tian_su_chunk_recovery_at__';
const CHUNK_RECOVERY_WINDOW_KEY = '__tian_su_chunk_recovery_window__';
const PENDING_ROUTE_KEY = '__tian_su_pending_route__';
const RECOVERY_COOLDOWN_MS = 60_000;
const RECOVERY_WINDOW_MS = 5 * 60_000;
const MAX_RECOVERY_ATTEMPTS_PER_WINDOW = 2;
// 導航意圖只在點擊後短時間內有效，過期就當作使用者已經停留在目前頁面
const PENDING_ROUTE_TTL_MS = 15_000;

// 記錄「使用者剛剛想去哪一頁」。client-side 導航若中途失敗，
// 才知道要把人送到目標頁，而不是把目前這一頁重載一次。
export function markPendingRoute(href: string) {
  if (typeof window === 'undefined') return;
  if (!href.startsWith('/')) return;
  try {
    window.sessionStorage.setItem(PENDING_ROUTE_KEY, JSON.stringify({ href, at: Date.now() }));
  } catch {
    // sessionStorage 不可用時略過，不影響導航本身
  }
}

function takePendingRoute(now: number): string | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_ROUTE_KEY);
    window.sessionStorage.removeItem(PENDING_ROUTE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as { href?: unknown; at?: unknown };
    const href = typeof stored.href === 'string' ? stored.href : '';
    const at = typeof stored.at === 'number' ? stored.at : 0;
    if (!href.startsWith('/') || now - at > PENDING_ROUTE_TTL_MS) return null;
    return href;
  } catch {
    return null;
  }
}

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

    // 導航途中掛掉：用整頁載入把使用者送進目標頁，
    // 不能只重載目前網址，否則使用者會被留在原地，看起來像「點了沒反應」。
    const pendingRoute = takePendingRoute(now);
    if (pendingRoute && pendingRoute !== window.location.pathname) {
      window.location.assign(pendingRoute);
      return true;
    }

    window.location.replace(window.location.href);
    return true;
  } catch {
    return false;
  }
}
