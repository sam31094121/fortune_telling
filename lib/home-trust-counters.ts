import 'server-only';
import { NextResponse } from 'next/server';
import { getVisitorSupabaseClient } from '@/lib/visitor-counter';
import { HOME_TRUST_EPOCH, isHomeTrustSnapshot, type HomeTrustKind } from '@/lib/home-trust-contract';
import { checkVoteRateLimit, getClientIp, releaseVoteEvent } from '@/lib/home-trust-vote-limiter';

const headers = { 'Cache-Control': 'no-store' };
const failure = () => NextResponse.json({ ok: false, message: '暫時無法取得，請稍後重試。' }, { status: 503, headers });
function snapshot(row: Record<string, unknown> | null) {
  if (!row) return null;
  const value = { epoch: row.epoch, agreeCount: row.agree_count, disagreeCount: row.disagree_count, viewCount: row.view_count, revision: row.revision };
  return isHomeTrustSnapshot(value) ? value : null;
}
export async function handleHomeTrustRead() {
  try {
    const client = getVisitorSupabaseClient();
    if (!client) return failure();
    const { data, error } = await client.from('home_trust_counters').select('epoch, agree_count, disagree_count, view_count, revision').eq('id', 'home').maybeSingle();
    const current = snapshot(data);
    if (error || !current) return failure();
    return NextResponse.json({ ok: true, ...current }, { headers });
  } catch { return failure(); }
}
export async function handleHomeTrustIncrement(kind: HomeTrustKind, request: Request) {
  const origin = request.headers.get('origin');
  let crossOrigin = request.headers.get('sec-fetch-site') === 'cross-site';
  try { if (origin && new URL(origin).host !== (request.headers.get('host') ?? new URL(request.url).host)) crossOrigin = true; }
  catch { crossOrigin = true; }
  if (crossOrigin) {
    return NextResponse.json({ ok: false, message: '請從本站操作。' }, { status: 403, headers });
  }
  let eventId: string;
  try {
    const text = await request.text();
    if (text.length > 512) throw new Error('body');
    const body = JSON.parse(text);
    if (body?.epoch !== HOME_TRUST_EPOCH || typeof body.eventId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.eventId)) throw new Error('event');
    eventId = body.eventId;
  } catch {
    return NextResponse.json({ ok: false, message: '請重新整理頁面後再試。' }, { status: 400, headers });
  }
  if (kind !== 'view' && checkVoteRateLimit(getClientIp(request), eventId) === 'limited') {
    return NextResponse.json({ ok: false, message: '操作太頻繁，請稍後再試。' }, { status: 429, headers });
  }
  try {
    const client = getVisitorSupabaseClient();
    if (!client) throw new Error('unconfigured');
    const { data, error } = await client.rpc('home_trust_increment_v2', { p_kind: kind, p_event_id: eventId, p_epoch: HOME_TRUST_EPOCH });
    const row = Array.isArray(data) ? data[0] : null;
    const current = snapshot(row);
    if (error || !current) throw new Error('unavailable');
    return NextResponse.json({ ok: true, ...current, applied: row.applied === true }, { headers });
  } catch { releaseVoteEvent(eventId); return failure(); }
}
