// POST /api/preview
// 接收天地雙維度資料 → 驗證 → 呼叫 Gemini 進行天地預分析 → 回傳預分析結果

import { NextResponse } from 'next/server';
import { analyzePreview } from '@/lib/gemini';
import type { BloodType, PreviewRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O'];

// 記憶體快取與速率限制 (獨立快取，防止被分析路由干擾)
const ipCache = new Map<string, { count: number; resetTime: number }>();
const responseCache = new Map<string, { result: any; expireTime: number }>();

function validatePreview(body: Partial<PreviewRequest>): string | null {
  if (!body.bloodType || !VALID_BLOOD_TYPES.includes(body.bloodType as BloodType)) {
    return '血型無效';
  }

  if (!body.birthday || !/^\d{4}-\d{2}-\d{2}$/.test(body.birthday)) {
    return '生日格式錯誤';
  }
  const date = new Date(body.birthday);
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

  // 1. 速率限制 (1分鐘內限制 5 次，預分析允許稍多頻率)
  const limitRecord = ipCache.get(ip);
  if (limitRecord) {
    if (now < limitRecord.resetTime) {
      if (limitRecord.count >= 5) {
        console.warn(`[api/preview] IP: ${ip} 觸發速率限制`);
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
  let body: PreviewRequest;
  try {
    body = (await request.json()) as PreviewRequest;
  } catch (err) {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }

  // 3. 驗證資料
  const errorMsg = validatePreview(body);
  if (errorMsg) {
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  // 4. 重複快取 (有效時間 5 分鐘)
  const cacheKey = [body.birthday, body.bloodType].join('|');
  const cached = responseCache.get(cacheKey);
  if (cached && now < cached.expireTime) {
    console.log('[api/preview] 命中預分析快取');
    return NextResponse.json(cached.result, { status: 200 });
  }

  // 5. 呼叫 Gemini
  try {
    const result = await analyzePreview({
      birthday: body.birthday,
      bloodType: body.bloodType as Exclude<BloodType, ''>,
    });
    
    // 寫入快取
    responseCache.set(cacheKey, { result, expireTime: now + 300000 });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '預分析失敗，請稍後再試';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
