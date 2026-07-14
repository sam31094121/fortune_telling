import { NextResponse } from 'next/server';
import { generateInsightAnalysis } from '@/lib/insight-engine';
import type { InsightRequest } from '@/lib/types';
import { isValidBirthday } from '@/lib/validation';
import { createRequestId, friendlyErrorResponse, hashedCacheKey } from '@/lib/api-stability';

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
  return hashedCacheKey([body.name.trim(), body.birthDate, body.bloodType, body.gender, shichenKey]);
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

  // birthTime 為選填，前端已移除此欄位，後端容許缺失並預設 '12:00'
  if (req.birthTime !== undefined && typeof req.birthTime === 'string' && req.birthTime.length > 0) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(req.birthTime)) {
      return '出生時間格式不正確（時：分）。';
    }
  }

  if (typeof req.bloodType !== 'string' || !VALID_BLOOD_TYPES.includes(req.bloodType)) {
    return '血型只能是 A、B、AB、O。';
  }

  if (typeof req.gender !== 'string' || !VALID_GENDERS.includes(req.gender)) {
    return '性別只能是 male 或 female。';
  }

  const hasValidShichen =
    req.shichen === undefined ||
    req.shichen === null ||
    req.shichen === 'unknown' ||
    (typeof req.shichen === 'number' && Number.isInteger(req.shichen) && req.shichen >= 0 && req.shichen <= 11);
  if (!hasValidShichen) {
    return '出生時辰格式不正確。';
  }

  if (
    req.longitude !== undefined &&
    req.longitude !== null &&
    !(typeof req.longitude === 'number' && Number.isFinite(req.longitude) && req.longitude >= -180 && req.longitude <= 180)
  ) {
    return '出生地經度必須介於 -180 至 180。';
  }

  return null;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown_ip';

  cleanIpCache();

  const limitRecord = ipCache.get(ip);
  if (limitRecord && now < limitRecord.resetTime) {
    if (limitRecord.count >= 5) {
      return friendlyErrorResponse(requestId, 'RATE_LIMITED', '請求過於頻繁，請稍後再試。', 429);
    }
    limitRecord.count += 1;
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  let body: InsightRequest;

  try {
    const rawBody = (await request.json()) as Partial<InsightRequest>;
    body = {
      ...rawBody,
      birthTime: typeof rawBody.birthTime === 'string' && rawBody.birthTime.length > 0 ? rawBody.birthTime : '12:00',
    } as InsightRequest;
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '請傳入有效的 JSON。', 400);
  }

  const errorMsg = validateInsightRequest(body);
  if (errorMsg) {
    return friendlyErrorResponse(requestId, 'INVALID_INPUT', errorMsg, 400);
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
    console.error('[insight-analyze] request failed', requestId, err instanceof Error ? err.message : String(err));
    return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', '系統正在重新同步，請稍候再試。', 502);
  }
}
