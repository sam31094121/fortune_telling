import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/logout
 *
 * 管理員登出（清除 Session Cookie）
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    { status: 'success' },
    { headers: { 'Cache-Control': 'no-store' } }
  );

  response.cookies.delete(ADMIN_COOKIE);

  return response;
}
