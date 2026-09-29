import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * 管理員認證系統（獨立於客戶認證）
 * - 只有應用所有者能存取
 * - 用來查看製作過程、來源授權、著作權信息
 * - 前端對客戶隱藏所有這些信息
 */

export const ADMIN_COOKIE = 'admin_master_key';
export const ADMIN_SESSION_SECONDS = 3600; // 1小時

export function adminGateConfigured() {
  return Boolean(
    process.env.ADMIN_MASTER_PASSWORD &&
    (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32
  );
}

function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

export function adminPasswordMatches(value: unknown) {
  return (
    adminGateConfigured() &&
    typeof value === 'string' &&
    value.length <= 256 &&
    timingSafeEqual(digest(value), digest(process.env.ADMIN_MASTER_PASSWORD!))
  );
}

function sign(value: string) {
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET!)
    .update(value)
    .update(digest(process.env.ADMIN_MASTER_PASSWORD!))
    .digest('hex');
}

export function createAdminSession(now = Date.now()) {
  if (!adminGateConfigured()) throw new Error('Admin gate not configured');
  const payload = `${now + ADMIN_SESSION_SECONDS * 1000}.${randomBytes(24).toString('hex')}`;
  return `${payload}.${sign(payload)}`;
}

export function validAdminSession(token?: string, now = Date.now()) {
  if (!adminGateConfigured() || !token || !/^\d{13}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires, nonce, signature] = token.split('.');
  if (Number(expires) <= now || Number(expires) > now + ADMIN_SESSION_SECONDS * 1000) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(`${expires}.${nonce}`), 'hex'));
}

// 防暴力破解
const state = globalThis as typeof globalThis & { adminAttempts?: { count: number; until: number } };

export function takeAdminLoginAttempt(now = Date.now()) {
  if (!state.adminAttempts || now >= state.adminAttempts.until)
    state.adminAttempts = { count: 0, until: now + 15 * 60_000 };
  if (state.adminAttempts.count >= 5) return false; // 更嚴格
  state.adminAttempts.count++;
  return true;
}

export function sameOrigin(request: Request) {
  try {
    const origin = new URL(request.headers.get('origin') ?? '');
    return (
      ['http:', 'https:'].includes(origin.protocol) &&
      origin.protocol === new URL(request.url).protocol &&
      origin.host === (request.headers.get('host') ?? new URL(request.url).host)
    );
  } catch {
    return false;
  }
}

/**
 * 只有授權的 IP/裝置可以存取管理員後台
 * 防止即使洩露管理員密碼，也無法從其他位置存取
 */
export function isAuthorizedDevice(request: Request): boolean {
  // 從環境變數讀取授權 IP 白名單
  const authorizedIPs = (process.env.ADMIN_AUTHORIZED_IPS ?? '').split(',').map(ip => ip.trim()).filter(Boolean);

  if (!authorizedIPs.length) {
    // 未配置白名單時，拒絕所有請求
    console.warn('ADMIN_AUTHORIZED_IPS not configured - all admin requests denied');
    return false;
  }

  // 從請求取得真實 IP（考慮代理）
  const clientIP =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() || // CloudFlare/Vercel
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown';

  const isAuthorized = authorizedIPs.includes(clientIP);

  if (!isAuthorized) {
    console.warn(`Unauthorized admin access attempt from IP: ${clientIP}`);
  }

  return isAuthorized;
}

/**
 * 裝置指紋（可選的額外驗證層）
 * 用於驗證瀏覽器/設備的一致性
 */
export function validateDeviceFingerprint(request: Request, expectedFingerprint?: string): boolean {
  if (!expectedFingerprint) return true; // 未配置時跳過

  const fingerprint = request.headers.get('x-device-fingerprint');
  return fingerprint === expectedFingerprint;
}
