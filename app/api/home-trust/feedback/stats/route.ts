/**
 * 首頁信任統計 — 回饋統計 API（後台專用）
 *
 * GET /api/home-trust/feedback/stats
 *
 * 只有管理者可以查看
 * 返回：回饋統計、分類、狀態
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBackendFeedbackStats } from '@/lib/home-trust/feedback/feedback.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/home-trust/feedback/stats
 *
 * 取得回饋統計（需要驗證）
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: 驗證是否為管理者
    // const isAdmin = await verifyAdmin(request);
    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { error: '無權限查看' },
    //     { status: 403 }
    //   );
    // }

    const stats = await getBackendFeedbackStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] GET /api/home-trust/feedback/stats failed:', message);

    return NextResponse.json(
      {
        success: false,
        error: '無法取得統計',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
