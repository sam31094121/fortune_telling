import { NextRequest, NextResponse } from 'next/server';
import { DUAL_COOKIE, sameOrigin, validSession, checkAPIRateLimit } from '@/lib/dual-chart-auth';
import { calculateDualChart } from '@/lib/dual-chart';
import { recordDualChartAudit } from '@/lib/dual-chart-admin-logger';
import { createHash } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) => NextResponse.json(body, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    ...headers,
  }
});

/**
 * 從响應生成 SHA256 雜湊（用於完整性驗證和審計追蹤）
 */
function hashResponse(data: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

export async function POST(request: NextRequest) {
  // ========== 安全防護第一層：速率限制 ==========
  const rateLimitCheck = checkAPIRateLimit(request);
  const rateLimitHeaders: Record<string, string> = {
    'X-RateLimit-Limit': String(10),
    'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + rateLimitCheck.resetSeconds),
  };

  if (!rateLimitCheck.allowed) {
    return reply(
      { error: '請求過於頻繁，請稍後再試。' },
      429,
      rateLimitHeaders
    );
  }

  // ========== 安全防護第二層：同源檢查 ==========
  if (!sameOrigin(request)) return reply({ error: '請從本站開啟。' }, 403);

  try {
    // ========== 安全防護第三層：請求驗證 ==========
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const length = parseInt(contentLength, 10);
      if (isNaN(length) || length <= 0) {
        return reply({ error: '請求格式不正確。' }, 400);
      }
    }

    const text = await request.text();

    // 檢查內容長度
    if (text.length > 2048) return reply({ error: '輸入內容過長。' }, 400);

    // 檢查內容是否為空
    if (text.length === 0) return reply({ error: '請求內容不能為空。' }, 400);

    // ========== 安全防護第四層：JSON 驗證 ==========
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(text) as Record<string, unknown>;
    } catch (err) {
      return reply({ error: '請求格式不正確（無效的 JSON）。' }, 400);
    }

    // ========== 安全防護第五層：數據完整性檢查 ==========
    if (!input.birthDate || typeof input.birthDate !== 'string') {
      return reply({ error: '缺少必要數據：出生日期。' }, 400);
    }

    const result = calculateDualChart(input);

    // ========== 後端審計日誌（客戶不看得見） ==========
    // 記錄完整的製作過程、來源、著作權信息
    // 用於法律追蹤和內部審計
    if (input.name || input.birthDate) {
      const responseHash = hashResponse(result);
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                       request.headers.get('x-real-ip') ||
                       request.headers.get('cf-connecting-ip') ||
                       'unknown';

      try {
        recordDualChartAudit(
          `chart_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          typeof input.name === 'string' ? input.name : '',
          input.gender === 'male' ? 'male' : 'female',
          input.birthDate as string,
          input.birthTime as string,
          {
            year: typeof result.core.pillars.year === 'object' ? result.core.pillars.year.ganZhi : '',
            month: typeof result.core.pillars.month === 'object' ? result.core.pillars.month.ganZhi : '',
            day: typeof result.core.pillars.day === 'object' ? result.core.pillars.day.ganZhi : '',
            hour: typeof result.core.pillars.hour === 'object' ? result.core.pillars.hour.ganZhi : '',
          },
          {
            ipAddress: clientIP,
            userAgent: request.headers.get('user-agent') || 'unknown',
            responseHash,
          }
        );
      } catch (err) {
        // 審計日誌失敗不應中斷客戶請求
        console.error('Failed to record audit log:', err);
      }
    }

    // ========== 客戶響應（隱藏技術細節） ==========
    // 只返回最終命盤結果，不返回：
    // - 製作過程
    // - 使用的演算法細節
    // - 來源或授權信息
    // - 中間計算步驟
    return reply({ data: result }, 200, rateLimitHeaders);
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : '出生資料無法排盤。' },
      400,
      rateLimitHeaders
    );
  }
}
