/**
 * 首頁信任統計 — 認同計數 API
 *
 * POST /api/home-trust/agree
 * 執行：agree_count +1
 */

import { NextRequest, NextResponse } from 'next/server';
import { agreeAction } from '@/lib/home-trust/counters/counters.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 認同計數增加 +1
 */
export async function POST(request: NextRequest) {
  try {
    const result = await agreeAction();

    return NextResponse.json({
      success: true,
      counters: result.counters,
      timestamp: result.timestamp,
      requestId: result.requestId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] POST /api/home-trust/agree failed:', message);

    return NextResponse.json(
      {
        success: false,
        error: '認同計數失敗，請重試',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
