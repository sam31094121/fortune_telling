/**
 * 九宮格靈動數字 API
 * GET  → 填寫引導與公信力說明（來自技能檔案，前端只照印）
 * POST { birthDate: 'YYYY-MM-DD'（西元） } → 九宮格、數字特質、靈動連線（後端運算）
 */
import { NextResponse } from 'next/server';
import { buildNineGridGuidance, buildNineGridStudy, parseBirthDate } from '@/lib/nine-grid-numbers';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, guidance: buildNineGridGuidance() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: '資料格式無法讀取，請重新送出一次。' }, { status: 400 });
  }
  const birthDate = body && typeof body === 'object' ? (body as { birthDate?: unknown }).birthDate : undefined;
  const parsed = parseBirthDate(birthDate);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: 'INVALID_INPUT', message: parsed.message }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, study: buildNineGridStudy(parsed) });
  } catch (error) {
    console.error('[nine-grid] failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ ok: false, code: 'TEMPORARILY_UNAVAILABLE', message: '九宮格正在重新同步，請稍候再試。' }, { status: 502 });
  }
}
