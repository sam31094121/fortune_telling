import { NextRequest, NextResponse } from 'next/server';
import { DUAL_COOKIE, sameOrigin, validSession } from '@/lib/dual-chart-auth';
import { calculateDualChart } from '@/lib/dual-chart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: NextRequest) {
  if (!validSession(request.cookies.get(DUAL_COOKIE)?.value)) return reply({ error: '請先輸入密碼，或重新解鎖已到期的工作階段。' }, 401);
  if (!sameOrigin(request)) return reply({ error: '請從本站開啟。' }, 403);
  try {
    const text = await request.text();
    if (text.length > 2048) return reply({ error: '輸入內容過長。' }, 400);
    return reply({ data: calculateDualChart(JSON.parse(text)) });
  } catch (error) { return reply({ error: error instanceof Error ? error.message : '出生資料無法排盤。' }, 400); }
}
