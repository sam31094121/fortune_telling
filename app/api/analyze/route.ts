import { NextResponse } from 'next/server';
import { analyzeDestiny } from '@/lib/gemini';
import type { AnalyzeRequest, BloodType, Gender, PersonInput } from '@/lib/types';
import { isValidBirthday } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const VALID_BLOOD_TYPES: Exclude<BloodType, ''>[] = ['A', 'B', 'AB', 'O'];
const VALID_GENDERS: Gender[] = ['male', 'female'];

const ipCache = new Map<string, { count: number; resetTime: number }>();
const responseCache = new Map<string, { result: unknown; expireTime: number }>();

function validatePerson(person: unknown): string | null {
  if (!person || typeof person !== 'object') return '請提供正確的人格解碼資料。';

  const p = person as Partial<PersonInput>;

  if (!isValidBirthday(p.birthday)) return '生日不是有效日期或晚於今天。';

  if (typeof p.bloodType !== 'string' || !VALID_BLOOD_TYPES.includes(p.bloodType as Exclude<BloodType, ''>)) {
    return '血型只能是 A、B、AB、O。';
  }

  if (typeof p.name !== 'string' || p.name.trim().length < 2) {
    return '姓名至少需要 2 個字，才能開啟 VIP 解碼。';
  }
  if (p.name.trim().length > 20) return '姓名長度不可超過 20 個字。';

  if (typeof p.gender !== 'string' || !VALID_GENDERS.includes(p.gender as Gender)) {
    return '性別只能是 male 或 female。';
  }

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

  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: '請傳入有效的 JSON。' }, { status: 400 });
  }

  const errorMsg = validatePerson(body.person);
  if (errorMsg) {
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const cacheKey = [
    body.person.birthday,
    body.person.bloodType,
    body.person.name.trim(),
    body.person.gender,
  ].join('|');

  const cached = responseCache.get(cacheKey);
  if (cached && now < cached.expireTime) {
    return NextResponse.json(cached.result, { status: 200 });
  }

  try {
    const result = await analyzeDestiny({ ...body.person, name: body.person.name.trim() });
    responseCache.set(cacheKey, { result, expireTime: now + 300_000 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '人格解碼失敗，請稍後再試。';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
