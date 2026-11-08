import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, isAuthorizedDevice, sameOrigin, validAdminSession } from '@/lib/admin-auth';
import {
  GuestbookUnavailableError,
  listAllMessagesForAdmin,
  setMessageStatus,
} from '@/lib/guestbook-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** 與其他後台 API 同一套三層認證：授權裝置、登入 Session、同源。 */
function guard(request: NextRequest): NextResponse | null {
  if (!isAuthorizedDevice(request)) return reply({ error: '未授權的設備' }, 403);
  if (!validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) return reply({ error: '請先登入管理員帳號' }, 401);
  if (!sameOrigin(request)) return reply({ error: '請從本站開啟' }, 403);
  return null;
}

/** GET：管理員看全部留言（含已下架）。 */
export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    return reply({ messages: await listAllMessagesForAdmin() });
  } catch (error) {
    return reply(
      { error: error instanceof GuestbookUnavailableError ? '留言板資料庫暫時無法連線' : '取得留言失敗' },
      503,
    );
  }
}

/** POST { id, action: 'remove' | 'restore' }：下架或復原。不刪資料。 */
export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: '格式不正確' }, 400);
  }
  const { id, action } = payload;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof id !== 'string' || !uuid.test(id)) return reply({ error: 'id 不正確' }, 400);
  if (action !== 'remove' && action !== 'restore') return reply({ error: 'action 不正確' }, 400);

  try {
    const found = await setMessageStatus(id, action === 'remove' ? 'removed' : 'visible');
    if (!found) return reply({ error: '找不到這則留言' }, 404);
    return reply({ ok: true, messages: await listAllMessagesForAdmin() });
  } catch {
    return reply({ error: '操作失敗，請稍後再試' }, 503);
  }
}
