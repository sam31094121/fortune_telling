import { NextResponse } from 'next/server';
import { generateInsightAnalysis } from '@/lib/insight-engine';
import type { InsightRequest } from '@/lib/types';
import { isValidBirthday } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 設定最大執行時間 60 秒

const VALID_BLOOD_TYPES = ['A', 'B', 'AB', 'O'];
const VALID_GENDERS = ['male', 'female'];

// 簡單的記憶體緩存 (用於相同查詢的快速響應)
const analysisCache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 分鐘快取

const ipCache = new Map<string, { count: number; resetTime: number }>();

function cleanIpCache() {
  const now = Date.now();
  if (ipCache.size > 200) {
    for (const [key, val] of ipCache.entries()) {
      if (now > val.resetTime) {
        ipCache.delete(key);
      }
    }
  }
}

function getCacheKey(body: InsightRequest): string {
  const shichenKey = typeof body.shichen === 'number' ? String(body.shichen) : 'auto';
  return `${body.name.trim()}|${body.birthDate}|${body.bloodType}|${body.gender}|${shichenKey}`;
}

function validateInsightRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object') return '請提供有效的分析資料。';

  const req = body as Partial<InsightRequest>;

  if (typeof req.name !== 'string' || req.name.trim().length < 2) {
    return '姓名至少需要 2 個字。';
  }

  if (req.name.trim().length > 20) {
    return '姓名長度不可超過 20 個字。';
  }

  if (!isValidBirthday(req.birthDate)) {
    return '生日不是有效日期。';
  }

  if (typeof req.bloodType !== 'string' || !VALID_BLOOD_TYPES.includes(req.bloodType)) {
    return '血型只能是 A、B、AB、O。';
  }

  if (typeof req.gender !== 'string' || !VALID_GENDERS.includes(req.gender)) {
    return '性別只能是 male 或 female。';
  }

  if (
    req.shichen !== undefined &&
    req.shichen !== null &&
    req.shichen !== 'unknown' &&
    !(typeof req.shichen === 'number' && Number.isInteger(req.shichen) && req.shichen >= 0 && req.shichen <= 11)
  ) {
    return '時辰資料格式無效。';
  }

  return null;
}

export async function POST(request: Request) {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown_ip';

  cleanIpCache();

  const limitRecord = ipCache.get(ip);
  if (limitRecord && now < limitRecord.resetTime) {
    if (limitRecord.count >= 5) {
      return NextResponse.json({ error: '請求過於頻繁，請稍後再試。' }, { status: 429 });
    }
    limitRecord.count += 1;
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  let body: InsightRequest;

  try {
    body = (await request.json()) as InsightRequest;
  } catch {
    return NextResponse.json({ error: '請傳入有效的 JSON。' }, { status: 400 });
  }

  const errorMsg = validateInsightRequest(body);
  if (errorMsg) {
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  // 檢查快取
  const cacheKey = getCacheKey(body);
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json(cached.result, {
      status: 200,
      headers: { 'X-Cache': 'HIT' },
    });
  }

  try {
    const result = await generateInsightAnalysis(body);

    // 儲存到快取
    analysisCache.set(cacheKey, { result, timestamp: Date.now() });

    // 定期清理過期快取
    if (analysisCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of analysisCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION_MS) {
          analysisCache.delete(key);
        }
      }
    }

    return NextResponse.json(result, {
      status: 200,
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '深度洞察分析失敗，請稍後再試。';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
