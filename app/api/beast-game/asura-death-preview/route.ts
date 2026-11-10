/**
 * 預覽專用：模擬「伺服端回合結果」。正式環境預設 404（見 asura-death-preview-gate.ts）。
 * 伺服端扣血、回傳結算後 HP；前端只拿回傳值比對前後 HP 產生擊倒事件，不自行判定。
 */
import { NextResponse } from 'next/server';
import { asuraDeathPreviewEnabled } from '@/lib/beast-game/match3/asura-death-preview-gate';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
interface PFoe { id: string; hp: number; maxHp: number }
export async function POST(request: Request) {
  // 正式環境預設關閉（ASURA_DEATH_PREVIEW=1 才開）
  if (!asuraDeathPreviewEnabled()) return NextResponse.json({ error: 'not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  try {
    const p = await request.json() as { foes: PFoe[]; target: number; amount: number; actionId: string };
    const int = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
    if (!Array.isArray(p.foes) || p.foes.length < 1 || p.foes.length > 5 || !int(p.target, 0, p.foes.length - 1) || !int(p.amount, 0, 10000000) || typeof p.actionId !== 'string' || !p.actionId || p.actionId.length > 100) throw new Error('invalid');
    for (const f of p.foes) if (typeof f.id !== 'string' || !int(f.maxHp, 1, 10000000) || !int(f.hp, 0, f.maxHp)) throw new Error('invalid');
    const foes = p.foes.map((f, i) => i === p.target ? { ...f, hp: Math.max(0, f.hp - p.amount) } : f);
    return NextResponse.json({ actionId: p.actionId, foes, serverConfirmedAt: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
