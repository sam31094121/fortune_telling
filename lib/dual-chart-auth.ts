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
  if (!gateConfigured() || !token || !/^\d{13}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(token)) return false;
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
