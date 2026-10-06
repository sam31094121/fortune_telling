import { NextResponse } from 'next/server';
import { getVisitorSupabaseClient } from '@/lib/visitor-counter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HomeTrustCounters = {
  agree_count: number;
  disagree_count: number;
  view_count: number;
};

const INITIAL_AGREE = 714;
const INITIAL_DISAGREE = 74;
const INITIAL_VIEW = 110397;

function normalizeCount(value: unknown, floor: number): number {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= floor ? count : floor;
}

/**
 * GET /api/home-trust
 * 讀取當前計數器值
 *
 * Response:
 * {
 *   ok: true,
 *   agreeCount: number,
 *   disagreeCount: number,
 *   viewCount: number
 * }
 */
export async function GET() {
  const supabase = getVisitorSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message: '暫時無法連接資料庫。',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const { data, error } = await supabase
      .from('home_trust_counters')
      .select('agree_count, disagree_count, view_count')
      .eq('id', 'home')
      .maybeSingle<HomeTrustCounters>();

    if (error) {
      console.error('[home-trust] read failed:', error.message);
      throw error;
    }

    if (!data) {
      // 如果表不存在，返回初始值
      return NextResponse.json(
        {
          ok: true,
          agreeCount: INITIAL_AGREE,
          disagreeCount: INITIAL_DISAGREE,
          viewCount: INITIAL_VIEW,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        agreeCount: normalizeCount(data.agree_count, INITIAL_AGREE),
        disagreeCount: normalizeCount(data.disagree_count, INITIAL_DISAGREE),
        viewCount: normalizeCount(data.view_count, INITIAL_VIEW),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[home-trust] GET error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: '無法讀取計數器。',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
