import { NextResponse } from 'next/server';
import { createTarotInterpretation } from '@/lib/tarot-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createTarotInterpretation(body);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '塔羅解讀後端暫時無法重新運算。';
    return NextResponse.json({ ok: false, code: 'TAROT_INTERPRET_FAILED', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}