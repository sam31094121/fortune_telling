import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { readLocalVisitorCount, recordLocalVisitorVisit } from '@/lib/local-visitor-counter';
import {
  VISITOR_MIN_DISPLAY_COUNT,
  VISITOR_SEED_COUNT,
  getVisitorSupabaseClient,
  isFeatureKey,
} from '@/lib/visitor-counter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type VisitorCounterRow = {
  feature_key: string;
  display_count: number;
};

type VisitorCounterTableRow = {
  feature_key: string;
  real_count: number | string | null;
  seed_count: number | string | null;
  updated_at: string | null;
};

const DISPLAY_AUTO_INCREMENT_INTERVAL_MS = 18_000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      const displayCount = Math.max(
        await readLocalVisitorCount(featureKey, { projectElapsed: !permanent }),
        VISITOR_MIN_DISPLAY_COUNT,
      );
      return NextResponse.json(
        { ok: true, featureKey, displayCount, storage: 'local' },
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
    .select('feature_key, real_count, seed_count, updated_at')
    .eq('feature_key', featureKey)
    .maybeSingle<VisitorCounterTableRow>();

  if (error) {
    console.error('[visitor-counter] read failed', error.message);
    return NextResponse.json(
      { ok: false, message: '瀏覽計數暫時無法讀取。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const realCount = Number(data?.real_count ?? 0);
  const seedCount = Number(data?.seed_count ?? VISITOR_SEED_COUNT);
  const updatedAtMs = data?.updated_at ? Date.parse(data.updated_at) : Date.now();
  const elapsedMs = Math.max(0, Date.now() - (Number.isNaN(updatedAtMs) ? Date.now() : updatedAtMs));
  const elapsedDisplayCount = permanent ? 0 : Math.floor(elapsedMs / DISPLAY_AUTO_INCREMENT_INTERVAL_MS);
  const displayCount = Math.max(seedCount + realCount + elapsedDisplayCount, VISITOR_MIN_DISPLAY_COUNT);

  if (!Number.isSafeInteger(displayCount)) {
    return NextResponse.json(
      { ok: false, message: '瀏覽計數暫時無法讀取。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { ok: true, featureKey, displayCount, storage: 'supabase' },
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
      const displayCount = Math.max(await recordLocalVisitorVisit(body.featureKey, visitId), VISITOR_MIN_DISPLAY_COUNT);
      return NextResponse.json(
        { ok: true, featureKey: body.featureKey, displayCount, storage: 'local' },
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
  if (error || !row || !Number.isSafeInteger(Number(row.display_count))) {
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
      displayCount: Math.max(Number(row.display_count), VISITOR_MIN_DISPLAY_COUNT),
      storage: 'supabase',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
