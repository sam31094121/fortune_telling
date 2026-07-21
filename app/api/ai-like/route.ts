import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import {
  AI_LIKE_INITIAL_COUNT,
  readLocalAiLikeCount,
  recordLocalAiLike,
} from '@/lib/local-ai-like-counter';
import { getVisitorSupabaseClient } from '@/lib/visitor-counter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LikeCounterRow = {
  total_count: number | string | null;
};

type LikeResultRow = {
  total_count: number | string | null;
  did_like: boolean | null;
};

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9:_-]{16,128}$/;

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local';
}

function hashIp(ip: string) {
  return createHash('sha256').update(`ai-like:${ip}`).digest('hex');
}

function normalizeCount(value: unknown) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= AI_LIKE_INITIAL_COUNT
    ? count
    : AI_LIKE_INITIAL_COUNT;
}

export async function GET() {
  const supabase = getVisitorSupabaseClient();

  if (!supabase) {
    try {
      const totalCount = await readLocalAiLikeCount();
      return NextResponse.json(
        { ok: true, totalCount, storage: 'local' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      console.error('[ai-like] local read failed', error);
      return NextResponse.json(
        { ok: false, message: '暫時無法讀取認同數。' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  const { data, error } = await supabase
    .from('like_counter')
    .select('total_count')
    .eq('id', 'global')
    .maybeSingle<LikeCounterRow>();

  if (error) {
    console.error('[ai-like] read failed', error.message);
    return NextResponse.json(
      { ok: false, message: '暫時無法讀取認同數。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { ok: true, totalCount: normalizeCount(data?.total_count), storage: 'supabase' },
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
  const supabase = getVisitorSupabaseClient();

  if (!supabase) {
    try {
      const result = await recordLocalAiLike(body.deviceId, ipHash);
      return NextResponse.json(
        { ok: true, totalCount: result.totalCount, didLike: result.didLike, alreadyLiked: !result.didLike, storage: 'local' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      console.error('[ai-like] local write failed', error);
      return NextResponse.json(
        { ok: false, message: '暫時無法送出認同。' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  const { data, error } = await supabase.rpc('record_ai_like', {
    requested_device_id: body.deviceId,
    requested_ip_hash: ipHash,
  });

  const row = Array.isArray(data) ? (data[0] as LikeResultRow | undefined) : undefined;

  if (error || !row) {
    console.error('[ai-like] record failed', error?.message ?? 'No counter row returned');
    return NextResponse.json(
      { ok: false, message: '暫時無法送出認同。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const didLike = row.did_like === true;
  return NextResponse.json(
    {
      ok: true,
      totalCount: normalizeCount(row.total_count),
      didLike,
      alreadyLiked: !didLike,
      storage: 'supabase',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
