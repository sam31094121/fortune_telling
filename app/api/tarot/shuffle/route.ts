import { NextResponse } from 'next/server';
import { createTarotShuffle } from '@/lib/tarot-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createTarotShuffle(body);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '塔羅洗牌系統暫時無法運算，請稍後再試。';
    return NextResponse.json({ ok: false, code: 'TAROT_SHUFFLE_FAILED', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}