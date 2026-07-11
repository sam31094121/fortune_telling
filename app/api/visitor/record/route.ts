import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

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
    return NextResponse.json({ ok: false, message: '請求格式錯誤。' }, { status: 400 });
  }

  if (!isFeatureKey(body.featureKey)) {
    return NextResponse.json({ ok: false, message: '缺少或不支援的功能代碼。' }, { status: 400 });
  }

  // Cached clients from a previous release may not send an ID yet. They still
  // count once, while current clients get retry-safe idempotency.
  const visitId = typeof body.visitId === 'string' && UUID_PATTERN.test(body.visitId)
    ? body.visitId
    : randomUUID();

  const supabase = getVisitorSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: '瀏覽計數服務尚未設定。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { data, error } = await supabase.rpc('record_visitor_visit', {
    requested_feature_key: body.featureKey,
    requested_visit_id: visitId,
  });

  const row = Array.isArray(data) ? (data[0] as VisitorCounterRow | undefined) : undefined;
  if (error || !row || !Number.isSafeInteger(Number(row.display_count))) {
    console.error('[visitor-counter] record failed', error?.message ?? 'No counter row returned');
    return NextResponse.json(
      { ok: false, message: '系統正在重新整理。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      featureKey: row.feature_key,
      displayCount: Number(row.display_count),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
