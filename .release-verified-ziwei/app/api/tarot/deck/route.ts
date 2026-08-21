import { NextResponse } from 'next/server';
import { getTarotDeckCatalog } from '@/lib/tarot-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json(getTarotDeckCatalog(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '塔羅牌庫讀取暫時失敗，請重新嘗試。';
    return NextResponse.json({ ok: false, code: 'TAROT_DECK_FAILED', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}