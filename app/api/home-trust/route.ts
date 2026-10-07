/**
 * 首頁信任統計 API — GET 端點
 *
 * GET /api/home-trust
 * 返回：{ success, counters, timestamp }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCounters } from '@/lib/home-trust/counters/counters.repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 取得目前計數狀態
 */
export async function GET(request: NextRequest) {
  try {
    const counters = await getCurrentCounters();

    return NextResponse.json({
      success: true,
      counters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] GET /api/home-trust failed:', message);

    return NextResponse.json(
      {
        success: false,
        error: '無法取得計數',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
