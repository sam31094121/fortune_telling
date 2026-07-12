import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { recordLocalVisitorVisit } from '@/lib/local-visitor-counter';
import { getVisitorSupabaseClient, isFeatureKey } from '@/lib/visitor-counter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type VisitorCounterRow = {
  feature_key: string;
  display_count: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      const displayCount = await recordLocalVisitorVisit(body.featureKey);
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
      displayCount: Number(row.display_count),
      storage: 'supabase',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
