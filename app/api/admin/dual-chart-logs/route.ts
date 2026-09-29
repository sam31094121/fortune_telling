import { NextRequest, NextResponse } from 'next/server';
import { validAdminSession, sameOrigin, isAuthorizedDevice, ADMIN_COOKIE } from '@/lib/admin-auth';
import { getAllAuditLogs, getAuditLog } from '@/lib/dual-chart-admin-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * GET /api/admin/dual-chart-logs
 *
 * 取得所有命盤製作日誌（完整審計追蹤）
 *
 * ⚠️ 僅授權 IP + 有效管理員 Session 可訪問
 *
 * 返回：
 * - 每個命盤的完整製作過程
 * - 使用的來源和授權信息
 * - 著作權聲明
 * - 法律追蹤信息（IP、時間、響應雜湊）
 */
export async function GET(request: NextRequest) {
  // ========== 第一層：檢查授權 IP ==========
  if (!isAuthorizedDevice(request)) {
    return reply(
      {
        error: '未授權的設備。此後台僅允許授權的 IP 地址存取。',
        deniedIP: request.headers.get('x-forwarded-for') || 'unknown',
      },
      403
    );
  }

  // ========== 第二層：檢查管理員 Session ==========
  if (!validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return reply(
      { error: '請先登入管理員帳號。' },
      401
    );
  }

  // ========== 第三層：檢查同源 ==========
  if (!sameOrigin(request)) {
    return reply({ error: '請從本站開啟。' }, 403);
  }

  try {
    const logs = getAllAuditLogs();
    return reply({
      status: 'success',
      count: logs.length,
      data: logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        name: log.name,
        gender: log.gender,
        birthDate: log.birthDate,
        birthTime: log.birthTime,
        bazi: log.bazi,
        sources: log.sources,
        copyright: log.copyright,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      })),
    });
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : '取得日誌失敗' },
      500
    );
  }
}

/**
 * GET /api/admin/dual-chart-logs/[id]
 *
 * 取得單個命盤的詳細製作記錄（包含每個計算步驟）
 */
export async function POST(request: NextRequest) {
  // ========== 三層認證 ==========
  if (!isAuthorizedDevice(request)) {
    return reply({ error: '未授權的設備' }, 403);
  }

  if (!validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return reply({ error: '請先登入管理員帳號' }, 401);
  }

  if (!sameOrigin(request)) {
    return reply({ error: '請從本站開啟' }, 403);
  }

  try {
    const body = await request.json();
    const { id } = body as Record<string, unknown>;

    if (!id || typeof id !== 'string') {
      return reply({ error: 'id 參數必須是字符串' }, 400);
    }

    const log = getAuditLog(id);
    if (!log) {
      return reply({ error: '日誌不存在' }, 404);
    }

    return reply({
      status: 'success',
      data: log,
    });
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : '查詢失敗' },
      500
    );
  }
}
