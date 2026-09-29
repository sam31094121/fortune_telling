import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDevice } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/ip-check
 *
 * 檢查當前 IP 是否被授權
 *
 * 用於前端顯示授權狀態（不涉及密碼）
 */
export async function GET(request: NextRequest) {
  const clientIP =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('remote-addr') ||
    'unknown';

  const authorized = isAuthorizedDevice(request);

  return NextResponse.json(
    {
      authorized,
      clientIP,
      message: authorized
        ? '✅ 此 IP 已授權，可登入管理員後台'
        : '❌ 此 IP 未授權。管理員後台只允許授權的 IP 地址存取。',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
