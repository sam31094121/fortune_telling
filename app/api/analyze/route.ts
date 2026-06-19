// POST /api/analyze
// 天地人 V5.0：接收生日、血型、姓名、性別 → 驗證 → Gemini 人格融合 → 回傳結構化分析

import { NextResponse } from 'next/server';
import { analyzeDestiny } from '@/lib/gemini';
import type { AnalyzeRequest, BloodType, Gender, PersonInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_BLOOD_TYPES: Exclude<BloodType, ''>[] = ['A', 'B', 'AB', 'O'];
const VALID_GENDERS: Gender[] = ['male', 'female'];

// 記憶體快取與速率限制
const ipCache = new Map<string, { count: number; resetTime: number }>();
const responseCache = new Map<string, { result: any; expireTime: number }>();

function validatePerson(person: unknown): string | null {
  if (!person || typeof person !== 'object') {
    return '資料缺失';
  }

  const p = person as Partial<PersonInput>;

  // 驗證生日
  if (typeof p.birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.birthday)) {
    return '生日格式錯誤，應為 YYYY-MM-DD';
  }
  const date = new Date(p.birthday);
  if (Number.isNaN(date.getTime())) {
    return '生日不是有效日期';
  }
  if (date.getTime() > Date.now()) {
    return '生日不能是未來日期';
  }

  // 驗證血型
  if (typeof p.bloodType !== 'string' || !VALID_BLOOD_TYPES.includes(p.bloodType as Exclude<BloodType, ''>)) {
    return '血型無效，應為 A / B / AB / O';
  }

  // 驗證姓名
  if (typeof p.name !== 'string' || p.name.trim() === '') {
    return '姓名為必填項目';
  }
  if (p.name.length > 20) {
    return '姓名長度不得超過 20 個字元';
  }

  // 驗證性別
  if (typeof p.gender !== 'string' || !VALID_GENDERS.includes(p.gender as Gender)) {
    return '性別無效，應為 male / female';
  }

  return null;
}

export async function POST(request: Request) {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown_ip';

  // 1. 速率限制 (1 分鐘內限制 5 次)
  const limitRecord = ipCache.get(ip);
  if (limitRecord) {
    if (now < limitRecord.resetTime) {
      if (limitRecord.count >= 5) {
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

  // 4. 快取鍵（包含性別）
  const cacheKey = [
    body.person.birthday,
    body.person.bloodType,
    body.person.name.trim(),
    body.person.gender,
  ].join('|');

  const cached = responseCache.get(cacheKey);
  if (cached && now < cached.expireTime) {
    console.log('[api/analyze] 命中分析快取');
    return NextResponse.json(cached.result, { status: 200 });
  }

  // 5. 呼叫 Gemini V5.0 引擎
  try {
    const result = await analyzeDestiny(body.person);
    
    // 寫入快取 (5 分鐘有效期)
    responseCache.set(cacheKey, { result, expireTime: now + 300000 });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '解碼失敗，請稍後再試';
    console.error('[api/analyze] Error:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
    responseCache.set(cacheKey, { result, expireTime: now + 300000 });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '解碼失敗，請稍後再試';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
