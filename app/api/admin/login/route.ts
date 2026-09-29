import { NextRequest, NextResponse } from 'next/server';
import { adminPasswordMatches, createAdminSession, takeAdminLoginAttempt, sameOrigin, isAuthorizedDevice, ADMIN_COOKIE } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (body: unknown, status = 200, cookies?: { [key: string]: string }) => {
  const response = NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (cookies) {
    Object.entries(cookies).forEach(([key, value]) => {
      response.cookies.set(key, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600, // 1小時
        path: '/',
      });
    });
  }
  return response;
};

/**
 * POST /api/admin/login
 *
 * 管理員登入
 *
 * ⚠️ 只有授權 IP 可以嘗試登入
 */
export async function POST(request: NextRequest) {
  // ========== 第一層：檢查授權 IP ==========
  if (!isAuthorizedDevice(request)) {
    return reply(
      {
        error: '未授權的設備。此後台僅允許授權的 IP 地址存取。',
      },
      403
    );
  }

  // ========== 第二層：檢查同源 ==========
  if (!sameOrigin(request)) {
    return reply({ error: '請從本站開啟。' }, 403);
  }

  // ========== 第三層：防暴力破解 ==========
  if (!takeAdminLoginAttempt()) {
    return reply(
      { error: '登入嘗試次數過多，請 15 分鐘後再試。' },
      429
    );
  }

  try {
    const body = await request.json();
    const { password } = body as Record<string, unknown>;

    if (!password || typeof password !== 'string') {
      return reply({ error: '請輸入密碼。' }, 400);
    }

    if (!adminPasswordMatches(password)) {
      return reply({ error: '密碼錯誤。' }, 401);
    }

    const session = createAdminSession();
    return reply(
      { status: 'success', message: '登入成功' },
      200,
      { [ADMIN_COOKIE]: session }
    );
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : '登入失敗' },
      500
    );
  }
}
