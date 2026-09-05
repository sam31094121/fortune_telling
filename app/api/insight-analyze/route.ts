import { NextResponse } from 'next/server';
import { generateInsightAnalysis } from '@/lib/insight-engine';
import type { InsightRequest } from '@/lib/types';
import { isValidBirthday } from '@/lib/validation';
import { createRequestId, friendlyErrorResponse, hashedCacheKey } from '@/lib/api-stability';
import { runThreeInOne } from '@/lib/three-in-one';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 設定最大執行時間 60 秒

const VALID_GENDERS = ['male', 'female'];

// 簡單的記憶體緩存 (用於相同查詢的快速響應)
const analysisCache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 分鐘快取

const ipCache = new Map<string, { count: number; resetTime: number }>();
/** 一次完整體驗只會用掉 1～2 次；15 次留給重算與同一個出口 IP 後面的其他人。 */
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;

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
  const shichenKey = typeof body.shichen === 'number' ? String(body.shichen) : body.shichen ?? 'auto';
  const longitudeKey = typeof body.longitude === 'number' ? body.longitude.toFixed(4) : 'no-longitude';
  const timezoneKey = body.timezone ?? 'Asia/Taipei';
  const correctionKey = body.timeCorrectionMode ?? 'STANDARD_TIME';
  return hashedCacheKey([
    body.name.trim(),
    body.birthDate,
    body.gender,
    shichenKey,
    longitudeKey,
    timezoneKey,
    correctionKey,
    'insight-v3-ziwei-presentation',
  ]);
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

  if (typeof req.gender !== 'string' || !VALID_GENDERS.includes(req.gender)) {
    return '性別只能是 male 或 female。';
  }

  const hasValidShichen =
    req.shichen === undefined ||
    req.shichen === null ||
    req.shichen === 'unknown' ||
    (typeof req.shichen === 'number' && Number.isInteger(req.shichen) && req.shichen >= 0 && req.shichen <= 12);
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

  /*
    只擋、先不計數。

    原本計數器在驗證之前就 +1，於是：客戶打錯生日被擋下的 400 照樣扣額度、
    連伺服器快取命中（本來零成本）也扣額度。額度又只有 5 次／60 秒／每個 IP——
    行動網路走 CGNAT，同一個出口 IP 後面可能是幾千人，第一次來的客戶什麼都還沒做完
    就被告知「請求過於頻繁」。
    現在改成：驗證通過、且真的要進運算時才計數，並把額度放寬到 15。
  */
  const limitRecord = ipCache.get(ip);
  const withinWindow = Boolean(limitRecord && now < limitRecord.resetTime);
  if (withinWindow && (limitRecord as { count: number }).count >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil(((limitRecord as { resetTime: number }).resetTime - now) / 1000));
    return friendlyErrorResponse(
      requestId,
      'RATE_LIMITED',
      `太多人同時在算，約 ${retryAfterSec} 秒後再按一次就好。你填的資料都還在。`,
      429,
      { 'Retry-After': String(retryAfterSec) },
    );
  }
  const countThisRequest = () => {
    const record = ipCache.get(ip);
    if (record && Date.now() < record.resetTime) record.count += 1;
    else ipCache.set(ip, { count: 1, resetTime: Date.now() + RATE_LIMIT_WINDOW_MS });
  };

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

  // 到這裡才是真的要花運算資源，這時候才計入額度。
  countThisRequest();

  try {
    const analysis = await generateInsightAnalysis(body);

    /*
      三合一：紫微神獸卡由這裡產出，不由前端推。

      業主定調：「新增的 4 張神獸卡，紫微神獸卡也要列入三合一。」

      神獸是從宮位地支的三合方位與宮內主星五行推出來的，那是一條命理推論；
      前端算它就是前端在編結論。而且它整條依賴命宮——命宮要時辰才定得了，
      所以它必須跟其他兩層走同一道閘：紫微定盤且四柱核對通過才有這四張。
      沒有時辰時 threeInOne 會是 TIME_UNKNOWN，帶著寫明四層怎麼算的無時辰算法。
    */
    const threeInOne = await runThreeInOne({
      birthDate: body.birthDate,
      birthTime: null,
      hourBranchIndex: typeof body.shichen === 'number' ? body.shichen : null,
      gender: body.gender === 'female' ? 'female' : 'male',
    });
    const result = {
      ...analysis,
      threeInOne,
      starBeasts: threeInOne.status === 'PASSED' ? threeInOne.result.starBeasts : [],
    };

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
