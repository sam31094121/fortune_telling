import 'server-only';

import { createHmac } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { guestbookTimeLabel } from '@/lib/guestbook-filter';
import { avatarFor, type GuestbookAvatar } from '@/lib/guestbook-avatar';

/** 每個 IP 每小時最多幾則。 */
export const GUESTBOOK_HOURLY_LIMIT = 3;
const PUBLIC_LIST_LIMIT = 50;

export class GuestbookUnavailableError extends Error {}
export class GuestbookRateLimitError extends Error {}

/** 給前端的公開留言：內容、時間、後端算好的匿名人物；author_key 不外送。 */
export type PublicGuestbookMessage = {
  id: string;
  body: string;
  timeLabel: string;
  avatar: GuestbookAvatar;
  /** 這則是不是目前這個 IP 寫的（後端比對算出） */
  mine: boolean;
};
export type AdminGuestbookMessage = Omit<PublicGuestbookMessage, 'mine'> & { status: 'visible' | 'removed' };

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient {
  if (client === undefined) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    client = url && key
      ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
      : null;
  }
  if (!client) throw new GuestbookUnavailableError('留言板暫時無法使用');
  return client;
}

/**
 * 匿名人物金鑰：只看來訪 IP，用伺服器祕密做 HMAC。
 * 同一個 IP＝同一個匿名人物；不存原始 IP，外人無法反推。
 */
export function authorKeyFor(request: Request): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const secret = process.env.GUESTBOOK_HASH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createHmac('sha256', secret).update(`author|${ip}`).digest('hex');
}

type Row = { id: string; body: string; status: 'visible' | 'removed'; created_at: string; author_key: string };

export async function listVisibleMessages(viewerKey?: string): Promise<PublicGuestbookMessage[]> {
  const { data, error } = await getClient()
    .from('guestbook_messages')
    .select('id, body, status, created_at, author_key')
    .eq('status', 'visible')
    .order('created_at', { ascending: false })
    .limit(PUBLIC_LIST_LIMIT);
  if (error) throw new GuestbookUnavailableError(error.message);
  return (data as Row[]).map((r) => ({
    id: r.id,
    body: r.body,
    timeLabel: guestbookTimeLabel(r.created_at),
    avatar: avatarFor(r.author_key),
    mine: viewerKey !== undefined && r.author_key === viewerKey,
  }));
}

export async function addMessage(body: string, authorKey: string): Promise<void> {
  const db = getClient();
  const { count, error: countError } = await db
    .from('guestbook_messages')
    .select('id', { count: 'exact', head: true })
    .eq('author_key', authorKey)
    .gte('created_at', new Date(Date.now() - 3_600_000).toISOString());
  if (countError) throw new GuestbookUnavailableError(countError.message);
  if ((count ?? 0) >= GUESTBOOK_HOURLY_LIMIT) throw new GuestbookRateLimitError('留言太頻繁');

  const { error } = await db.from('guestbook_messages').insert({ body, author_key: authorKey });
  if (error) throw new GuestbookUnavailableError(error.message);
}

export async function listAllMessagesForAdmin(): Promise<AdminGuestbookMessage[]> {
  const { data, error } = await getClient()
    .from('guestbook_messages')
    .select('id, body, status, created_at, author_key')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new GuestbookUnavailableError(error.message);
  return (data as Row[]).map((r) => ({
    id: r.id,
    body: r.body,
    status: r.status,
    timeLabel: guestbookTimeLabel(r.created_at),
    avatar: avatarFor(r.author_key),
  }));
}

/** 下架或復原：不刪資料，管理員按錯可以救回來。 */
export async function setMessageStatus(id: string, status: 'visible' | 'removed'): Promise<boolean> {
  const { data, error } = await getClient()
    .from('guestbook_messages')
    .update({ status, removed_at: status === 'removed' ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id');
  if (error) throw new GuestbookUnavailableError(error.message);
  return (data?.length ?? 0) > 0;
}
