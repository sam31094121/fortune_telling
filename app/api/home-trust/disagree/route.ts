/**
 * 首頁信任統計 — 不認同計數 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { disagreeAction } from '@/lib/home-trust/counters/counters.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/home-trust/disagree
 * 不認同計數增加 +1
 */
export async function POST(request: NextRequest) {
  try {
    const result = await disagreeAction();

    return NextResponse.json({
      success: true,
      counters: result.counters,
      timestamp: result.timestamp,
      requestId: result.requestId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] POST /api/home-trust/disagree failed:', message);

    return NextResponse.json(
      {
        success: false,
        error: '不認同計數失敗，請重試',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
