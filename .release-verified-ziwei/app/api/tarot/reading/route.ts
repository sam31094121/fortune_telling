import { NextResponse } from 'next/server';
import { createTarotReading } from '@/lib/tarot-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createTarotReading(body);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '塔羅抽牌暫時失敗，請重新嘗試。';
    return NextResponse.json({ ok: false, code: 'TAROT_READING_FAILED', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}