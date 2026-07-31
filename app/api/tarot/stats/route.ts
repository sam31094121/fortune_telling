import { NextResponse } from 'next/server';
import { getTarotStats } from '@/lib/tarot-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const stats = await getTarotStats();
  return NextResponse.json({ ok: true, stats }, { headers: { 'Cache-Control': 'no-store' } });
}