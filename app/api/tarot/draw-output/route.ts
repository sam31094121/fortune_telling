import { NextResponse } from 'next/server';
import { createTarotDrawOutput } from '@/lib/tarot-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createTarotDrawOutput(body);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '塔羅翻牌輸出暫時失敗，請重新嘗試。';
    return NextResponse.json({ ok: false, code: 'TAROT_DRAW_OUTPUT_FAILED', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}