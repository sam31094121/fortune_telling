import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/admin-auth';
import { checkGuestbookBody } from '@/lib/guestbook-filter';
import {
  GuestbookRateLimitError,
  GuestbookUnavailableError,
  addMessage,
  authorKeyFor,
  listVisibleMessages,
} from '@/lib/guestbook-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const UNAVAILABLE = '留言板暫時無法使用，請稍後再試。';

/** GET：只回「已公開」的留言（內容、時間、後端算好的匿名人物），不含任何身分欄位。 */
export async function GET(request: NextRequest) {
  try {
    return reply({ messages: await listVisibleMessages(authorKeyFor(request)) });
  } catch (error) {
    if (error instanceof GuestbookUnavailableError) return reply({ error: UNAVAILABLE }, 503);
    return reply({ error: UNAVAILABLE }, 500);
  }
}

/** POST：後端驗證、擋個資與網址、限速；通過就直接公開（不審核）。身分只看 IP，不發 Cookie。 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: '請從本站送出留言。' }, 403);

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: '留言內容格式不正確。' }, 400);
  }

  // 蜜罐：真人看不到這一格；機器人會填。假裝成功、直接丟棄，不給它調整的線索。
  if (typeof payload.website === 'string' && payload.website.trim() !== '') {
    return reply({ ok: true, messages: [] });
  }

  const checked = checkGuestbookBody(payload.body);
  if (!checked.ok) return reply({ error: checked.reason }, 400);

  const authorKey = authorKeyFor(request);
  try {
    await addMessage(checked.body, authorKey);
    return reply({ ok: true, messages: await listVisibleMessages(authorKey) }, 201);
  } catch (error) {
    if (error instanceof GuestbookRateLimitError) {
      return reply({ error: '你留言太頻繁了，每小時最多 3 則，請稍後再試。' }, 429);
    }
    return reply({ error: UNAVAILABLE }, error instanceof GuestbookUnavailableError ? 503 : 500);
  }
}
