import { NextResponse } from 'next/server';
import { calculateLifeCode, lifeCodeGuidance } from '@/lib/western-life-code/engine';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store, max-age=0' };
export async function GET() { return NextResponse.json({ ok: true, guidance: lifeCodeGuidance() }, { headers }); }
export async function POST(request: Request) {
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return NextResponse.json({ ok: false, message: '輸入資料過長' }, { status: 413, headers });
    body = JSON.parse(text);
  } catch { return NextResponse.json({ ok: false, message: '資料格式無法讀取，請重新送出' }, { status: 400, headers }); }
  try { return NextResponse.json({ ok: true, result: calculateLifeCode(body) }, { headers }); }
  catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : '暫時無法取得，請稍後再試' }, { status: 400, headers });
  }
}
