import { NextResponse } from 'next/server';
import { findSelfStarBeast } from '@/lib/self-star-beast';

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const guardian = await findSelfStarBeast(input);
    return NextResponse.json({ ok: true, ...guardian }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error && /^(請|命盤)/.test(error.message)
      ? error.message : '暫時無法取得神獸，請稍後再試。';
    return NextResponse.json({ ok: false, error: message }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  }
}
