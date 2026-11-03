import { NextResponse } from 'next/server';
import { sameOrigin, checkAPIRateLimit } from '@/lib/dual-chart-auth';
import { normalizeAsuraInput } from '@/lib/server/ghost-asura-display';
import { buildAsuraConversation } from '@/lib/server/asura-conversation';
import type { AsuraConversationIntent, AsuraConversationTopic } from '@/lib/ghost-asura-conversation-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200, headers = {}) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: '請從本站開啟。' }, 403);
  const text = await request.text().catch(() => '');
  if (!text || text.length > 2048) return reply({ error: '請求內容為空或過長。' }, 400);
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    body = parsed;
  } catch { return reply({ error: '請求格式不正確。' }, 400); }
  if (typeof body.topic !== 'string' || !['past', 'present', 'future'].includes(body.topic) || typeof body.intent !== 'string' || !['summary', 'why', 'action'].includes(body.intent)) return reply({ error: '請選擇現有的對話主題。' }, 400);
  const raw = body.birthInput;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return reply({ error: '請先填寫生辰。' }, 400);
  const birth = raw as Record<string, unknown>;
  if ((birth.calendarType !== undefined && birth.calendarType !== 'solar') || (birth.timezone !== undefined && birth.timezone !== 'Asia/Taipei')) return reply({ error: '請使用本頁的國曆與臺灣時間資料。' }, 400);
  if (typeof birth.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birth.birthDate) || typeof birth.gender !== 'string' || !['male', 'female'].includes(birth.gender)) return reply({ error: '請填寫完整出生日期與性別。' }, 400);
  if ((birth.birthTime !== undefined && typeof birth.birthTime !== 'string') || (birth.birthHourBranch !== undefined && typeof birth.birthHourBranch !== 'string')) return reply({ error: '出生時間格式不正確。' }, 400);
  const input = normalizeAsuraInput(birth);
  if (input.hourAssumed === true) return reply({ error: '請補上出生時辰，再開始對話。' }, 422);
  if (typeof birth.birthTime === 'string' && birth.birthTime !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birth.birthTime)) return reply({ error: '出生時間格式不正確。' }, 400);
  const limit = checkAPIRateLimit(request);
  if (!limit.allowed) return reply({ error: '請稍候再繼續對話。' }, 429, { 'Retry-After': String(limit.resetSeconds) });
  try {
    return reply(buildAsuraConversation(birth, body.topic as AsuraConversationTopic, body.intent as AsuraConversationIntent));
  } catch { return reply({ error: '這份出生資料暫時無法取得解說，請核對後重試。' }, 422); }
}
