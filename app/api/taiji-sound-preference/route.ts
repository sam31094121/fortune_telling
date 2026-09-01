import { NextResponse } from 'next/server';

import {
  readLocalTaijiSoundStats,
  recordLocalTaijiSoundEvent,
  TAIJI_SOUND_VARIANTS,
  type TaijiSoundEventField,
  type TaijiSoundVariant,
} from '@/lib/local-taiji-sound-preference';
import { getVisitorSupabaseClient } from '@/lib/visitor-counter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VARIANT_SET = new Set<string>(TAIJI_SOUND_VARIANTS);
const FIELD_SET = new Set(['assigned', 'completed', 'muted_immediately', 'replayed', 'next_step']);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 24;
const eventBuckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'local';
}

function isRateLimited(request: Request) {
  const key = clientKey(request);
  const now = Date.now();
  const bucket = eventBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    eventBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_EVENTS;
}

type StatsRow = {
  variant: string;
  assigned_count: number | string | null;
  completed_count: number | string | null;
  muted_immediately_count: number | string | null;
  replayed_count: number | string | null;
  next_step_count: number | string | null;
};

function toStats(row: StatsRow) {
  return {
    variant: row.variant,
    assignedCount: Number(row.assigned_count) || 0,
    completedCount: Number(row.completed_count) || 0,
    mutedImmediatelyCount: Number(row.muted_immediately_count) || 0,
    replayedCount: Number(row.replayed_count) || 0,
    nextStepCount: Number(row.next_step_count) || 0,
  };
}

export async function GET() {
  const supabase = getVisitorSupabaseClient();

  if (!supabase) {
    try {
      const stats = await readLocalTaijiSoundStats();
      return NextResponse.json({ ok: true, stats, storage: 'local' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('[taiji-sound-preference] local read failed', error);
      return NextResponse.json({ ok: false, message: '暫時無法讀取聲音偏好統計。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  const { data, error } = await supabase.from('taiji_sound_preference_stats').select('*');

  if (error || !data) {
    console.error('[taiji-sound-preference] read failed', error?.message ?? 'no data');
    return NextResponse.json({ ok: false, message: '暫時無法讀取聲音偏好統計。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json(
    { ok: true, stats: (data as StatsRow[]).map(toStats), storage: 'supabase' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json({ ok: false, message: '操作太頻繁，請稍後再試。' }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
  }
  let body: { variant?: unknown; field?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: '請重新整理後再試一次。' }, { status: 400 });
  }

  const variant = typeof body.variant === 'string' && VARIANT_SET.has(body.variant) ? body.variant as TaijiSoundVariant : null;
  const field = typeof body.field === 'string' && FIELD_SET.has(body.field) ? body.field as TaijiSoundEventField : null;

  if (!variant || !field) {
    return NextResponse.json({ ok: false, message: '無效的聲音偏好事件。' }, { status: 400 });
  }

  const supabase = getVisitorSupabaseClient();

  if (!supabase) {
    try {
      const row = await recordLocalTaijiSoundEvent(variant, field);
      return NextResponse.json({ ok: true, stats: row, storage: 'local' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('[taiji-sound-preference] local write failed', error);
      return NextResponse.json({ ok: false, message: '暫時無法記錄。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  const { data, error } = await supabase.rpc('record_taiji_sound_event', {
    requested_variant: variant,
    requested_field: field,
  });

  const row = Array.isArray(data) ? (data[0] as StatsRow | undefined) : undefined;

  if (error || !row) {
    console.error('[taiji-sound-preference] record failed', error?.message ?? 'no row returned');
    try {
      const fallbackRow = await recordLocalTaijiSoundEvent(variant, field);
      return NextResponse.json({ ok: true, stats: fallbackRow, storage: 'local-fallback' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (fallbackError) {
      console.error('[taiji-sound-preference] local fallback write failed', fallbackError);
      return NextResponse.json({ ok: false, message: '目前無法記錄，請稍後再試。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  return NextResponse.json({ ok: true, stats: toStats(row), storage: 'supabase' }, { headers: { 'Cache-Control': 'no-store' } });
}
