import { NextRequest, NextResponse } from 'next/server';
import { DUAL_COOKIE, sameOrigin, validSession } from '@/lib/dual-chart-auth';
import { calculateDualChart } from '@/lib/dual-chart';
import { recordDualChartAudit } from '@/lib/dual-chart-admin-logger';
import { createHash } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * 從响應生成 SHA256 雜湊（用於完整性驗證和審計追蹤）
 */
function hashResponse(data: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

export async function POST(request: NextRequest) {
  if (!validSession(request.cookies.get(DUAL_COOKIE)?.value)) return reply({ error: '請先輸入密碼，或重新解鎖已到期的工作階段。' }, 401);
  if (!sameOrigin(request)) return reply({ error: '請從本站開啟。' }, 403);
  try {
    const text = await request.text();
    if (text.length > 2048) return reply({ error: '輸入內容過長。' }, 400);

    const input = JSON.parse(text) as Record<string, unknown>;
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
    return reply({ data: result });
  } catch (error) { return reply({ error: error instanceof Error ? error.message : '出生資料無法排盤。' }, 400); }
}
