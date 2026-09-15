/**
 * 困難戰場的戰局票（伺服器專用）
 * ============================================================================
 *
 * 業主定調（2026-09-15）：易經與技能運算在後端，再送給前端；前端只負責顯示易經。
 *
 * Vercel 每台機器的暫存區各一份，連續出招可能打到不同機器——存檔會掉戰局。
 * 所以照 lib/tarot-engine.ts 的無狀態做法：每回合把戰局簽 HMAC 交給前端，
 * 下一招帶回來，任何一台機器驗章後就能接續運算。
 *
 * 簽名擋得住竄改血量、勝負、押注張數；擋不住把舊票拿回來重出一招（悔棋）。
 * 收藏帳本本就存在客人瀏覽器，這一層不假裝做得到。
 *
 * 會帶入 node:crypto——網頁端不得匯入（守門 test:beast-backend-only）。
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Match } from './interactive';

const SECRET = process.env.BEAST_BATTLE_SECRET || process.env.JWT_SECRET || 'beast-battle-stateless-v1';
export const BATTLE_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface BattleSession {
  v: 1;
  match: Match;
  /** 押注代表卡；體驗戰為 null。 */
  stakeCardId: string | null;
  /** 押注張數；體驗戰為 0。 */
  stakeCount: number;
  /** 開戰時間；整場沿用，用來判斷過期。 */
  issuedAt: number;
}

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function signBattleSession(session: BattleSession): string {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function openBattleSession(token: unknown, now = Date.now()): BattleSession | null {
  if (typeof token !== 'string') return null;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const payload = token.slice(0, separator);
  const signature = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(sign(payload));
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as BattleSession;
    if (!session || session.v !== 1 || !session.match || typeof session.match !== 'object') return null;
    if (!Number.isInteger(session.stakeCount) || session.stakeCount < 0) return null;
    if (typeof session.issuedAt !== 'number' || now - session.issuedAt > BATTLE_SESSION_MAX_AGE_MS) return null;
    return session;
  } catch {
    return null;
  }
}
