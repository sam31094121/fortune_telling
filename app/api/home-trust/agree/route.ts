import { NextResponse } from 'next/server';
import { getVisitorSupabaseClient } from '@/lib/visitor-counter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const INITIAL_AGREE = 714;
const INITIAL_DISAGREE = 74;
const INITIAL_VIEW = 110397;

function normalizeCount(value: unknown, floor: number): number {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= floor ? count : floor;
}

/**
 * POST /api/home-trust/agree
 * 認同計數器 +1（原子操作）
 */
export async function POST() {
  const supabase = getVisitorSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: '暫時無法連接資料庫。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const { data, error } = await supabase.rpc('increment_home_trust_agree');

    if (error) {
      console.error('[home-trust/agree] RPC failed:', error.message);
      throw error;
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No result returned from increment_home_trust_agree');
    }

    const result = data[0];

    return NextResponse.json(
      {
        ok: true,
        agreeCount: normalizeCount(result.agree_count, INITIAL_AGREE),
        disagreeCount: normalizeCount(result.disagree_count, INITIAL_DISAGREE),
        viewCount: normalizeCount(result.view_count, INITIAL_VIEW),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[home-trust/agree] POST error:', error);
    return NextResponse.json(
      { ok: false, message: '無法更新認同計數。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
