import 'server-only';

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getVisitorSupabaseClient } from '@/lib/visitor-counter';
import { HOME_TRUST_FLOORS } from '@/lib/trust-counter-floors';



/*
  首頁信任區（認同／不認同／累計瀏覽次數）的伺服器端單一入口。

  原則（業主規格）：
  - 正式數字只存在資料庫；前端只負責顯示，不得指定最終數字。
  - 所有 +1 都由資料庫原子完成；本檔只傳「動作」與「事件編號」。
  - 事件編號用來去重：同一事件重送（逾時重試、離線補送、sendBeacon、多分頁補送）只 +1 一次，
    不同事件各自 +1，所以快速連點不會漏算。
  - 失敗就誠實回 503，不假裝成功。
*/

export type HomeTrustKind = 'agree' | 'disagree' | 'view';

export type HomeTrustCounters = {
  agreeCount: number;
  disagreeCount: number;
  viewCount: number;
};

export class HomeTrustUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'HomeTrustUnavailableError';
  }
}

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
const MAX_BODY_BYTES = 1024;

const FAILURE_MESSAGE: Record<HomeTrustKind, string> = {
  agree: '無法更新認同計數。',
  disagree: '無法更新不認同計數。',
  view: '無法更新瀏覽次數。',
};

export function normalizeCount(value: unknown, floor: number): number {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= floor ? count : floor;
}

export function floorCounters(): HomeTrustCounters {
  return {
    agreeCount: HOME_TRUST_FLOORS.agree,
    disagreeCount: HOME_TRUST_FLOORS.disagree,
    viewCount: HOME_TRUST_FLOORS.view,
  };
}

function toCounters(row: Record<string, unknown>): HomeTrustCounters {
  return {
    agreeCount: normalizeCount(row.agree_count, HOME_TRUST_FLOORS.agree),
    disagreeCount: normalizeCount(row.disagree_count, HOME_TRUST_FLOORS.disagree),
    viewCount: normalizeCount(row.view_count, HOME_TRUST_FLOORS.view),
  };
}

export function isValidEventId(value: unknown): value is string {
  return typeof value === 'string' && EVENT_ID_PATTERN.test(value);
}

/**
 * 只擋「瀏覽器發起的跨站 POST」（別的網站的頁面偷偷替你灌數字）。
 * 沒有 Origin 的請求（舊客戶端、代理）不擋——這不是安全邊界，只是擋掉最常見的濫用。
 */
export function isCrossSiteRequest(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return true;

  const origin = request.headers.get('origin');
  if (!origin) return false;
  if (origin === 'null') return true;

  try {
    const host = request.headers.get('host') ?? new URL(request.url).host;
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/** 取事件編號：JSON 本文的 eventId，或 X-Idempotency-Key。沒帶回 null；帶了但格式不對回 'invalid'。 */
export async function readEventId(request: Request): Promise<string | null | 'invalid'> {
  const headerValue = request.headers.get('x-idempotency-key');
  let candidate: unknown = headerValue ?? undefined;

  if (candidate === undefined) {
    let text = '';
    try {
      text = await request.text();
    } catch {
      return 'invalid';
    }
    if (text.length > MAX_BODY_BYTES) return 'invalid';
    if (text.trim() === '') return null;
    try {
      const parsed = JSON.parse(text) as { eventId?: unknown } | null;
      candidate = parsed && typeof parsed === 'object' ? parsed.eventId : undefined;
    } catch {
      return 'invalid';
    }
    if (candidate === undefined || candidate === null) return null;
  }

  return isValidEventId(candidate) ? candidate : 'invalid';
}

type RpcError = { code?: string; message?: string } | null;

function isMissingFunction(error: RpcError): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message ?? '');
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

export type IncrementResult = HomeTrustCounters & { applied: boolean };

export async function incrementHomeTrust(
  kind: HomeTrustKind,
  eventId: string | null,
  client: SupabaseClient | null = getVisitorSupabaseClient(),
): Promise<IncrementResult> {
  if (!client) throw new HomeTrustUnavailableError('資料庫尚未設定。');

  const primary = await client.rpc('home_trust_increment', { p_kind: kind, p_event_id: eventId });
  let data: unknown = primary.data;
  let applied = true;

  if (primary.error && isMissingFunction(primary.error)) {
    // 程式比資料庫遷移早部署：退回舊函式（可用，但沒有事件去重）。
    console.warn(`[home-trust] home_trust_increment 不存在，暫用舊函式 increment_home_trust_${kind}；請套用遷移 20261006170000。`);
    const legacy = await client.rpc(`increment_home_trust_${kind}`);
    if (legacy.error) throw new HomeTrustUnavailableError(legacy.error.message, { cause: legacy.error });
    data = legacy.data;
  } else if (primary.error) {
    throw new HomeTrustUnavailableError(primary.error.message, { cause: primary.error });
  }

  const row = firstRow(data);
  if (!row) throw new HomeTrustUnavailableError('累加函式沒有回傳資料。');
  if (typeof row.applied === 'boolean') applied = row.applied;

  return { ...toCounters(row), applied };
}

export async function readHomeTrust(
  client: SupabaseClient | null = getVisitorSupabaseClient(),
): Promise<HomeTrustCounters & { source: 'database' | 'floor' }> {
  if (!client) throw new HomeTrustUnavailableError('資料庫尚未設定。');

  const { data, error } = await client
    .from('home_trust_counters')
    .select('agree_count, disagree_count, view_count')
    .eq('id', 'home')
    .maybeSingle();

  if (error) throw new HomeTrustUnavailableError(error.message, { cause: error });

  if (!data) {
    console.warn('[home-trust] 資料表沒有 id=home 這一列，暫以地板值回應；請確認遷移已套用。');
    return { ...floorCounters(), source: 'floor' };
  }

  return { ...toCounters(data as Record<string, unknown>), source: 'database' };
}

/** POST /api/home-trust/{agree,disagree,view} 共用處理。 */
export async function handleHomeTrustIncrement(
  kind: HomeTrustKind,
  request: Request,
  client?: SupabaseClient | null,
): Promise<Response> {
  if (isCrossSiteRequest(request)) {
    return NextResponse.json({ ok: false, message: '請從本站操作。' }, { status: 403, headers: NO_STORE });
  }

  const eventId = await readEventId(request);
  if (eventId === 'invalid') {
    return NextResponse.json({ ok: false, message: '事件編號格式不正確。' }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await incrementHomeTrust(kind, eventId, client);
    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
  } catch (error) {
    console.error(`[home-trust/${kind}] 累加失敗：`, error);
    return NextResponse.json({ ok: false, message: FAILURE_MESSAGE[kind] }, { status: 503, headers: NO_STORE });
  }
}

/** GET /api/home-trust 處理。 */
export async function handleHomeTrustRead(client?: SupabaseClient | null): Promise<Response> {
  try {
    const result = await readHomeTrust(client);
    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
  } catch (error) {
    console.error('[home-trust] 讀取失敗：', error);
    return NextResponse.json({ ok: false, message: '無法讀取計數器。' }, { status: 503, headers: NO_STORE });
  }
}
