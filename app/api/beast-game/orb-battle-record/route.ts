import { NextResponse } from 'next/server';
import { battleResumeEnabled, BATTLE_SESSION_MESSAGES, type BattleSessionErrorCode } from '@/lib/beast-game/match3/battle-resume';
import { BattleSessionError, battleLedgerStatus, closeBattle, resumeBattle, settleBattle, startBattle } from '@/lib/beast-game/match3/orb-battle-ledger';
import { allowRequest, clientKey } from '@/lib/beast-game/match3/rate-limit';
export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };
const status: Record<BattleSessionErrorCode, number> = { disabled: 404, invalid: 400, tampered: 409, stale: 409, expired: 410, settled: 409, closed: 409, device: 403, 'not-finished': 409, unavailable: 503, lost: 409, 'rate-limited': 429 };
const reply = (code: BattleSessionErrorCode, extra: Record<string, unknown> = {}) => NextResponse.json({ ok: false, code, error: BATTLE_SESSION_MESSAGES[code], ...extra }, { status: status[code], headers: noStore });
/**
 * PLAN-v2 A6：寶珠闖關戰局紀錄（開局／接回／勝利結算／落敗關閉）。
 * ‧ 開關 NEXT_PUBLIC_M3_BATTLE_RESUME 關閉時一律 404（沒有任何殘留行為）。
 * ‧ 開關打開但伺服端沒有共用儲存＋金鑰（AUDIT-2 X1–X3）：一律 503 'unavailable'，前端改走一般模式並照實提示。
 * ‧ action 'status'：只回能不能啟用與原因，不含任何秘密。
 */
export async function POST(request: Request) {
  if (!battleResumeEnabled()) return reply('disabled');
  try {
    const raw = await request.text();
    if (raw.length > 240000) throw new BattleSessionError('invalid');
    const b = JSON.parse(raw);
    if (!b || typeof b !== 'object') throw new BattleSessionError('invalid');
    if (b.action === 'status') { const s = battleLedgerStatus(); return NextResponse.json(s.ok ? { ok: true, mode: s.mode } : { ok: false, code: 'unavailable', reason: s.reason, error: BATTLE_SESSION_MESSAGES.unavailable }, { status: s.ok ? 200 : 503, headers: noStore }); }
    const ready = battleLedgerStatus();
    if (!ready.ok) return reply('unavailable', { reason: ready.reason });
    if (!allowRequest(b.action === 'start' ? 'start' : 'record', clientKey(request))) return reply('rate-limited');
    if (b.action === 'start') return NextResponse.json({ ok: true, ...(await startBattle({ meta: b.meta, core: b.core, device: b.device })) }, { headers: noStore });
    if (b.action === 'resume') return NextResponse.json({ ok: true, ...(await resumeBattle(b)) }, { headers: noStore });
    if (b.action === 'settle') return NextResponse.json({ ok: true, ...(await settleBattle(b)) }, { headers: noStore });
    if (b.action === 'close') return NextResponse.json({ ok: true, ...(await closeBattle(b)) }, { headers: noStore });
    throw new BattleSessionError('invalid');
  } catch (e) {
    return reply(e instanceof BattleSessionError ? e.code : 'invalid');
  }
}
