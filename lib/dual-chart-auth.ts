import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const DUAL_COOKIE = 'dual_chart_session';
export const SESSION_SECONDS = 1800;
export function gateConfigured() {
  return Boolean(process.env.DUAL_CHART_PASSWORD && (process.env.DUAL_CHART_SESSION_SECRET?.length ?? 0) >= 32);
}
function digest(value: string) { return createHash('sha256').update(value).digest(); }
export function passwordMatches(value: unknown) {
  return gateConfigured() && typeof value === 'string' && value.length <= 256 &&
    timingSafeEqual(digest(value), digest(process.env.DUAL_CHART_PASSWORD!));
}
function sign(value: string) {
  return createHmac('sha256', process.env.DUAL_CHART_SESSION_SECRET!)
    .update(value).update(digest(process.env.DUAL_CHART_PASSWORD!)).digest('hex');
}
export function createSession(now = Date.now()) {
  if (!gateConfigured()) throw new Error('Gate not configured');
  const payload = `${now + SESSION_SECONDS * 1000}.${randomBytes(24).toString('hex')}`;
  return `${payload}.${sign(payload)}`;
}
export function validSession(token?: string, now = Date.now()) {
  // 如果沒有配置密碼（開發或公開模式），允許訪問
  if (!gateConfigured()) return true;
  if (!token || !/^\d{13}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires, nonce, signature] = token.split('.');
  if (Number(expires) <= now || Number(expires) > now + SESSION_SECONDS * 1000) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(`${expires}.${nonce}`), 'hex'));
}
// Single-process gate: a shared budget cannot be bypassed with spoofed IP headers.
// Multi-instance hosting must replace this with an atomic shared limiter.
const state = globalThis as typeof globalThis & { dualChartAttempts?: { count: number; until: number } };
export function takeLoginAttempt(now = Date.now()) {
  if (!state.dualChartAttempts || now >= state.dualChartAttempts.until) state.dualChartAttempts = { count: 0, until: now + 15 * 60_000 };
  if (state.dualChartAttempts.count >= 10) return false;
  state.dualChartAttempts.count++;
  return true;
}
export function sameOrigin(request: Request) {
  // Next's internal URL may use 0.0.0.0 while the browser uses localhost/LAN.
  // Compare the browser origin to the actual HTTP Host, never arbitrary forwarded headers.
  try {
    const origin = new URL(request.headers.get('origin') ?? '');
    return ['http:', 'https:'].includes(origin.protocol) && origin.protocol === new URL(request.url).protocol && origin.host === (request.headers.get('host') ?? new URL(request.url).host);
  } catch { return false; }
}

// ========== API 速率限制（防止濫用） ==========
export const API_RATE_LIMIT = {
  MAX_REQUESTS: 10,        // 每個時間窗口最多 10 次請求
  WINDOW_MS: 60 * 1000,    // 時間窗口 60 秒
  BLOCK_DURATION_MS: 5 * 60 * 1000,  // 超限後阻擋 5 分鐘
};

interface RateLimitEntry {
  count: number;
  until: number;  // 時間窗口結束時間
  blocked: boolean;
  blockedUntil?: number;  // 阻擋到何時
}

const rateLimitState = globalThis as typeof globalThis & {
  apiRateLimits?: Map<string, RateLimitEntry>;
};

function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

// Development-only loopback exemption: next dev receives no proxy headers, so every local client
// (browser, health monitor, live-API tests) collapsed into one 'unknown' bucket and got 429-blocked.
// Production (NODE_ENV === 'production') never takes this branch, so production limiting is unchanged.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
function isDevelopmentLoopback(request: Request): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const ip = getClientIP(request);
  if (LOOPBACK_IPS.has(ip)) return true;
  if (ip !== 'unknown') return false;
  let hostname = '';
  try { hostname = new URL(`http://${request.headers.get('host') ?? new URL(request.url).host}`).hostname; } catch { return false; }
  return LOOPBACK_HOSTS.has(hostname);
}

export function checkAPIRateLimit(request: Request): { allowed: boolean; remaining: number; resetSeconds: number } {
  if (isDevelopmentLoopback(request)) {
    return { allowed: true, remaining: API_RATE_LIMIT.MAX_REQUESTS, resetSeconds: Math.ceil(API_RATE_LIMIT.WINDOW_MS / 1000) };
  }
  const ip = getClientIP(request);
  const now = Date.now();

  if (!rateLimitState.apiRateLimits) {
    rateLimitState.apiRateLimits = new Map();
  }

  const limits = rateLimitState.apiRateLimits;
  let entry = limits.get(ip);

  // 初始化或重置時間窗口
  if (!entry || now >= entry.until) {
    entry = {
      count: 0,
      until: now + API_RATE_LIMIT.WINDOW_MS,
      blocked: false,
    };
    limits.set(ip, entry);
  }

  // 檢查是否在阻擋期間內
  if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // 重置阻擋狀態
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    entry.blocked = false;
    entry.count = 0;
    entry.until = now + API_RATE_LIMIT.WINDOW_MS;
  }

  // 檢查是否超過限制
  if (entry.count >= API_RATE_LIMIT.MAX_REQUESTS) {
    entry.blocked = true;
    entry.blockedUntil = now + API_RATE_LIMIT.BLOCK_DURATION_MS;
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.ceil(API_RATE_LIMIT.BLOCK_DURATION_MS / 1000),
    };
  }

  // 增加計數
  entry.count++;
  const remaining = API_RATE_LIMIT.MAX_REQUESTS - entry.count;
  const resetSeconds = Math.ceil((entry.until - now) / 1000);

  return { allowed: true, remaining, resetSeconds };
}
