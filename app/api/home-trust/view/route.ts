/**
 * 首頁信任統計 — 瀏覽計數 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { viewAction } from '@/lib/home-trust/counters/counters.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/home-trust/view
 * 瀏覽計數增加 +1
 */
export async function POST(request: NextRequest) {
  try {
    const result = await viewAction();

    return NextResponse.json({
      success: true,
      counters: result.counters,
      timestamp: result.timestamp,
      requestId: result.requestId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] POST /api/home-trust/view failed:', message);

    return NextResponse.json(
      {
        success: false,
        error: '瀏覽計數失敗，請重試',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
