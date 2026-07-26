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

function resolveRequestEventId(body: { deviceId?: unknown; eventId?: unknown }) {
  const candidate = typeof body.eventId === 'string'
    ? body.eventId
    : typeof body.deviceId === 'string'
      ? body.deviceId
      : '';

  return DEVICE_ID_PATTERN.test(candidate) ? candidate : createCounterEventId();
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
  let body: { deviceId?: unknown; eventId?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: '請重新整理後再試一次。' }, { status: 400 });
  }

  const eventId = resolveRequestEventId(body);
  const ipHash = hashIp(getClientIp(request));
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

    try {
      const fallbackResult = await recordLocalAiSuggestion(eventId, ipHash);
      await raiseSupabaseCountFloor(supabase, fallbackResult.totalCount);

      return NextResponse.json(
        {
          ok: true,
          totalCount: fallbackResult.totalCount,
          didSend: fallbackResult.didSend,
          alreadySent: !fallbackResult.didSend,
          storage: 'local-fallback',
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (fallbackError) {
      console.error('[ai-suggestion] local fallback write failed', fallbackError);
      return NextResponse.json(
        { ok: false, message: '目前無法送出，請稍後再試。' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  const remoteCount = normalizeCount(row.total_count);
  let localResult: Awaited<ReturnType<typeof recordLocalAiSuggestion>>;

  try {
    localResult = await recordLocalAiSuggestion(eventId, ipHash);
  } catch (localError) {
    console.error('[ai-suggestion] local floor write failed', localError);
    localResult = {
      totalCount: remoteCount,
      didSend: row.did_send === true,
    };
  }

  const totalCount = Math.max(remoteCount, localResult.totalCount);

  if (totalCount > remoteCount) {
    await raiseSupabaseCountFloor(supabase, totalCount);
  }

  return NextResponse.json(
    {
      ok: true,
      totalCount,
      didSend: localResult.didSend,
      alreadySent: !localResult.didSend,
      storage: 'supabase',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
