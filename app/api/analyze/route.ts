// POST /api/analyze
// 接收天地人個人資料 → 驗證 → 呼叫 Gemini 進行完整解碼 → 回傳結構化分析結果
// 限制 maxOutputTokens 為 800 以保障 API 費用安全

import { NextResponse } from 'next/server';
import { analyzeDestiny } from '@/lib/gemini';
import type { AnalyzeRequest, BloodType, PersonInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O'];

// 記憶體快取與速率限制
const ipCache = new Map<string, { count: number; resetTime: number }>();
const responseCache = new Map<string, { result: any; expireTime: number }>();

function validatePerson(person: unknown): string | null {
  if (!person || typeof person !== 'object') {
    return '資料缺失';
  }

  const p = person as Partial<PersonInput>;

  if (typeof p.name !== 'string' || p.name.trim() === '') {
    return '姓名為必填項目';
  }
  if (p.name.length > 20) {
    return '姓名長度不得超過 20 個字元';
  }

  if (typeof p.bloodType !== 'string' || !VALID_BLOOD_TYPES.includes(p.bloodType as BloodType)) {
    return '血型無效';
  }

  if (typeof p.birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.birthday)) {
    return '生日格式錯誤';
  }
  const date = new Date(p.birthday);
  if (Number.isNaN(date.getTime())) {
    return '生日不是有效日期';
  }
  if (date.getTime() > Date.now()) {
    return '生日不能是未來日期';
  }

  return null;
}

export async function POST(request: Request) {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown_ip';

  // 1. 速率限制 (1分鐘內限制 3 次)
  const limitRecord = ipCache.get(ip);
  if (limitRecord) {
    if (now < limitRecord.resetTime) {
      if (limitRecord.count >= 3) {
        console.warn(`[api/analyze] IP: ${ip} 觸發速率限制`);
        return NextResponse.json({ error: '請求過於頻繁，請於一分鐘後再試。' }, { status: 429 });
      }
      limitRecord.count += 1;
    } else {
      ipCache.set(ip, { count: 1, resetTime: now + 60000 });
    }
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60000 });
  }

  // 2. 解析 body
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch (err) {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }

  // 3. 驗證資料
  const errorMsg = validatePerson(body.person);
  if (errorMsg) {
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  // 4. 重複快取 (有效時間 5 分鐘)
  const cacheKey = [
    body.person.name.trim(),
    body.person.birthday,
    body.person.bloodType,
  ].join('|');

  const cached = responseCache.get(cacheKey);
  if (cached && now < cached.expireTime) {
    console.log('[api/analyze] 命中分析快取');
    return NextResponse.json(cached.result, { status: 200 });
  }

  // 5. 呼叫 Gemini
  try {
    const result = await analyzeDestiny(body.person);
    
    // 寫入快取
    responseCache.set(cacheKey, { result, expireTime: now + 300000 });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '解碼失敗，請稍後再試';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
