import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import {
  AI_SUGGESTION_INITIAL_COUNT,
  readLocalAiSuggestionCount,
  recordLocalAiSuggestion,
} from '@/lib/local-ai-suggestion-counter';
import { getVisitorSupabaseClient } from '@/lib/visitor-counter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SuggestionCounterRow = {
  total_count: number | string | null;
};

type SuggestionResultRow = {
  total_count: number | string | null;
  did_send: boolean | null;
};

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9:_-]{16,128}$/;

function createCounterEventId() {
  return `event_${randomUUID()}`;
}

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local';
}

function hashIp(ip: string) {
  return createHash('sha256').update(`ai-suggestion:${ip}`).digest('hex');
}

function normalizeCount(value: unknown) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= AI_SUGGESTION_INITIAL_COUNT
    ? count
    : AI_SUGGESTION_INITIAL_COUNT;
}
async function readLocalCountFloor() {
  try {
    return await readLocalAiSuggestionCount();
  } catch (error) {
    console.error('[ai-suggestion] local floor read failed', error);
    return AI_SUGGESTION_INITIAL_COUNT;
  }
}

async function raiseSupabaseCountFloor(supabase: NonNullable<ReturnType<typeof getVisitorSupabaseClient>>, totalCount: number) {
  const { error } = await supabase
    .from('suggestion_counter')
    .upsert({ id: 'global', total_count: totalCount, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (error) {
    console.error('[ai-suggestion] count floor sync failed', error.message);
  }
}

export async function GET() {
  const supabase = getVisitorSupabaseClient();

  if (!supabase) {
    try {
      const totalCount = await readLocalAiSuggestionCount();
      return NextResponse.json(
        { ok: true, totalCount, storage: 'local' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      console.error('[ai-suggestion] local read failed', error);
      return NextResponse.json(
        { ok: false, message: '暫時無法讀取改善建議數。' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  const { data, error } = await supabase
    .from('suggestion_counter')
    .select('total_count')
    .eq('id', 'global')
    .maybeSingle<SuggestionCounterRow>();

  if (error) {
    console.error('[ai-suggestion] read failed', error.message);
    return NextResponse.json(
      { ok: false, message: '暫時無法讀取改善建議數。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const remoteCount = normalizeCount(data?.total_count);
  const localCount = await readLocalCountFloor();
  const totalCount = Math.max(remoteCount, localCount);

  if (totalCount > remoteCount) {
    await raiseSupabaseCountFloor(supabase, totalCount);
  }

  return NextResponse.json(
    { ok: true, totalCount, storage: 'supabase' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  let body: { deviceId?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: '請重新整理後再試一次。' }, { status: 400 });
  }

  if (typeof body.deviceId !== 'string' || !DEVICE_ID_PATTERN.test(body.deviceId)) {
    return NextResponse.json({ ok: false, message: '裝置識別失效，請重新整理後再試一次。' }, { status: 400 });
  }

  const ipHash = hashIp(getClientIp(request));
  const eventId = createCounterEventId();
  const supabase = getVisitorSupabaseClient();

  if (!supabase) {
    try {
      const result = await recordLocalAiSuggestion(eventId, ipHash);
      return NextResponse.json(
        { ok: true, totalCount: result.totalCount, didSend: result.didSend, alreadySent: !result.didSend, storage: 'local' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      console.error('[ai-suggestion] local write failed', error);
      return NextResponse.json(
        { ok: false, message: '暫時無法送出改善建議。' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  const { data, error } = await supabase.rpc('record_ai_suggestion', {
    requested_device_id: eventId,
    requested_ip_hash: ipHash,
  });

  const row = Array.isArray(data) ? (data[0] as SuggestionResultRow | undefined) : undefined;

  if (error || !row) {
    console.error('[ai-suggestion] record failed', error?.message ?? 'No counter row returned');
    return NextResponse.json(
      { ok: false, message: '暫時無法送出改善建議。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const didSend = row.did_send === true;
  const remoteCount = normalizeCount(row.total_count);
  const localCount = didSend
    ? (await recordLocalAiSuggestion(eventId, ipHash)).totalCount
    : await readLocalCountFloor();
  const totalCount = Math.max(remoteCount, localCount);

  if (totalCount > remoteCount) {
    await raiseSupabaseCountFloor(supabase, totalCount);
  }

  return NextResponse.json(
    {
      ok: true,
      totalCount,
      didSend,
      alreadySent: !didSend,
      storage: 'supabase',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
