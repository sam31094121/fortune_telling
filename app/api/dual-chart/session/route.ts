import { NextRequest, NextResponse } from 'next/server';
import { createSession, DUAL_COOKIE, gateConfigured, passwordMatches, sameOrigin, SESSION_SECONDS, takeLoginAttempt } from '@/lib/dual-chart-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply('請從本站開啟。', 403);
  if (!gateConfigured()) return reply('管理員尚未設定進入口令，目前保持鎖定。', 503);
  if (!takeLoginAttempt()) return reply('嘗試次數過多，請於 15 分鐘後再試。', 429);
  try {
    const text = await request.text();
    if (text.length > 1024) return reply('輸入內容過長。', 400);
    if (!passwordMatches(JSON.parse(text)?.password)) return reply('密碼不正確，請重新輸入。', 401);
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(DUAL_COOKIE, createSession(), { httpOnly: true, sameSite: 'strict', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: SESSION_SECONDS });
    return response;
  } catch { return reply('請輸入有效的密碼。', 400); }
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return reply('請從本站開啟。', 403);
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(DUAL_COOKIE, '', { httpOnly: true, sameSite: 'strict', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 0 });
  return response;
}
