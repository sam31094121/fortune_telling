import { NextResponse } from 'next/server';
import { analyzePreview } from '@/lib/gemini';
import type { BloodType, PreviewRequest } from '@/lib/types';
import { isValidBirthday } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const VALID_BLOOD_TYPES: Exclude<BloodType, ''>[] = ['A', 'B', 'AB', 'O'];
const ipCache = new Map<string, { count: number; resetTime: number }>();
const responseCache = new Map<string, { result: unknown; expireTime: number }>();

function validatePreview(body: Partial<PreviewRequest>): string | null {
  if (!body.bloodType || !VALID_BLOOD_TYPES.includes(body.bloodType as Exclude<BloodType, ''>)) {
    return '請選擇正確的血型。';
  }

  if (!isValidBirthday(body.birthday)) return '生日不是有效日期或晚於今天。';

  return null;
}

export async function POST(request: Request) {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown_ip';

  const limitRecord = ipCache.get(ip);
  if (limitRecord && now < limitRecord.resetTime) {
    if (limitRecord.count >= 5) {
      return NextResponse.json({ error: '請求過於頻繁，請稍後再試。' }, { status: 429 });
    }
    limitRecord.count += 1;
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  let body: PreviewRequest;
  try {
    body = (await request.json()) as PreviewRequest;
  } catch {
    return NextResponse.json({ error: '請傳入有效的 JSON。' }, { status: 400 });
  }

  const errorMsg = validatePreview(body);
  if (errorMsg) {
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const cacheKey = `${body.birthday}|${body.bloodType}`;
  const cached = responseCache.get(cacheKey);
  if (cached && now < cached.expireTime) {
    return NextResponse.json(cached.result, { status: 200 });
  }

  try {
    const result = await analyzePreview({
      birthday: body.birthday,
      bloodType: body.bloodType as Exclude<BloodType, ''>,
    });
    responseCache.set(cacheKey, { result, expireTime: now + 300_000 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '天地預分析失敗，請稍後再試。';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
