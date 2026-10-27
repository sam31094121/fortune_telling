import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { readLocalVisitorCount, recordLocalVisitorVisit } from '@/lib/local-visitor-counter';
import { monotonicCount, visitorFloorFor } from '@/lib/trust-counter-floors';
import {
  VISITOR_MIN_DISPLAY_COUNT,
  getVisitorSupabaseClient,
  isFeatureKey,
} from '@/lib/visitor-counter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type VisitorCounterRow = {
  feature_key: string;
  real_count: number | string | null;
};

type VisitorCounterTableRow = {
  feature_key: string;
  real_count: number | string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Validate before display floors can turn missing or invalid data into zero.
function confirmedCount(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const featureKey = searchParams.get('featureKey');
  const permanent = searchParams.get('permanent') === '1';

  if (!isFeatureKey(featureKey)) {
    return NextResponse.json({ ok: false, message: '缺少有效的功能代碼。' }, { status: 400 });
  }

  const supabase = getVisitorSupabaseClient();
  if (!supabase) {
    try {
      const displayCount = monotonicCount(
        await readLocalVisitorCount(featureKey, { projectElapsed: !permanent }),
        VISITOR_MIN_DISPLAY_COUNT,
        visitorFloorFor(featureKey),
      );
      return NextResponse.json(
        { ok: true, featureKey, displayCount, storage: 'local', countLabel: '已留存瀏覽紀錄', floorApplied: visitorFloorFor(featureKey) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      console.error('[visitor-counter] local read failed', error);
      return NextResponse.json(
        { ok: false, message: '瀏覽計數暫時無法讀取。' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  const { data, error } = await supabase
    .from('visitor_counters')
    .select('feature_key, real_count')
    .eq('feature_key', featureKey)
    .maybeSingle<VisitorCounterTableRow>();

  const confirmed = confirmedCount(data?.real_count);
  if (error || !data || data.feature_key !== featureKey || confirmed === null) {
    console.error('[visitor-counter] read failed', error?.message ?? 'Missing or invalid counter row');
    return NextResponse.json(
      { ok: false, message: '瀏覽計數暫時無法讀取。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // 只顯示真實造訪數：不加資料庫裡的底數，也不依經過時間自己長大。
  const displayCount = monotonicCount(confirmed, VISITOR_MIN_DISPLAY_COUNT, visitorFloorFor(featureKey));

  if (!Number.isSafeInteger(displayCount)) {
    return NextResponse.json(
      { ok: false, message: '瀏覽計數暫時無法讀取。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { ok: true, featureKey, displayCount, storage: 'supabase', countLabel: '修復後瀏覽紀錄', floorApplied: visitorFloorFor(featureKey) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  let body: { featureKey?: unknown; visitId?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: '請提供有效的請求資料。' }, { status: 400 });
  }

  if (!isFeatureKey(body.featureKey)) {
    return NextResponse.json({ ok: false, message: '缺少有效的功能代碼。' }, { status: 400 });
  }

  const visitId = typeof body.visitId === 'string' && UUID_PATTERN.test(body.visitId)
    ? body.visitId
    : randomUUID();

  const supabase = getVisitorSupabaseClient();
  if (!supabase) {
    try {
      const displayCount = monotonicCount(await recordLocalVisitorVisit(body.featureKey, visitId), VISITOR_MIN_DISPLAY_COUNT, visitorFloorFor(body.featureKey));
      return NextResponse.json(
        { ok: true, featureKey: body.featureKey, displayCount, storage: 'local', countLabel: '已留存瀏覽紀錄', floorApplied: visitorFloorFor(body.featureKey) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      console.error('[visitor-counter] local record failed', error);
      return NextResponse.json(
        { ok: false, message: '瀏覽計數暫時無法保存。' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  const { data, error } = await supabase.rpc('record_visitor_visit', {
    requested_feature_key: body.featureKey,
    requested_visit_id: visitId,
  });

  const row = Array.isArray(data) ? (data[0] as VisitorCounterRow | undefined) : undefined;
  const confirmed = confirmedCount(row?.real_count);
  if (error || !row || row.feature_key !== body.featureKey || confirmed === null) {
    console.error('[visitor-counter] record failed', error?.message ?? 'No counter row returned');
    return NextResponse.json(
      { ok: false, message: '瀏覽計數暫時無法保存。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      featureKey: row.feature_key,
      displayCount: monotonicCount(confirmed, VISITOR_MIN_DISPLAY_COUNT, visitorFloorFor(body.featureKey)),
      storage: 'supabase',
      countLabel: '修復後瀏覽紀錄',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
