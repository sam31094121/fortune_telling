import { NextResponse } from 'next/server';
import { buildNameologyAnalysis } from '@/lib/nameology-engine';
import { getNamePersonalityScores } from '@/lib/name-model-db';
import type { BloodType, Gender } from '@/lib/types';
import { isValidBirthday } from '@/lib/validation';
import { createRequestId, friendlyErrorResponse, hashedCacheKey } from '@/lib/api-stability';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const VALID_BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
const VALID_GENDERS = ['male', 'female'] as const;

type NameologyRequest = {
  name: string;
  birthDate: string;
  bloodType: Exclude<BloodType, ''>;
  gender: Gender;
};

const analysisCache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000;

function validateNameologyRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object') return '請提供有效的姓名學資料。';
  const req = body as Partial<NameologyRequest>;

  if (typeof req.name !== 'string' || req.name.trim().length < 2) return '姓名至少需要 2 個字。';
  if (req.name.trim().length > 20) return '姓名長度不可超過 20 個字。';
  if (!isValidBirthday(req.birthDate)) return '生日不是有效日期。';
  if (typeof req.bloodType !== 'string' || !VALID_BLOOD_TYPES.includes(req.bloodType as Exclude<BloodType, ''>)) return '血型只能是 A、B、AB、O。';
  if (typeof req.gender !== 'string' || !VALID_GENDERS.includes(req.gender as Gender)) return '性別只能是 male 或 female。';

  return null;
}

function getCacheKey(body: NameologyRequest) {
  return hashedCacheKey([body.name.trim(), body.birthDate, body.bloodType, body.gender, 'nameology-v1']);
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  let body: NameologyRequest;

  try {
    body = (await request.json()) as NameologyRequest;
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '請傳入有效的 JSON。', 400);
  }

  const errorMsg = validateNameologyRequest(body);
  if (errorMsg) return friendlyErrorResponse(requestId, 'INVALID_INPUT', errorMsg, 400);

  const normalized: NameologyRequest = {
    name: body.name.trim(),
    birthDate: body.birthDate,
    bloodType: body.bloodType,
    gender: body.gender,
  };

  const cacheKey = getCacheKey(normalized);
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json(cached.result, { status: 200, headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const nameScores = getNamePersonalityScores(normalized.name);
    const analysis = buildNameologyAnalysis(normalized.name, nameScores, {
      gender: normalized.gender,
      bloodType: normalized.bloodType,
      birthDate: normalized.birthDate,
    });
    const result = { ok: true, mode: 'nameology', analysis, nameScores };

    analysisCache.set(cacheKey, { result, timestamp: Date.now() });
    if (analysisCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of analysisCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION_MS) analysisCache.delete(key);
      }
    }

    return NextResponse.json(result, { status: 200, headers: { 'X-Cache': 'MISS' } });
  } catch (err) {
    console.error('[nameology-analyze] request failed', requestId, err instanceof Error ? err.message : String(err));
    return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', '姓名學系統正在重新同步，請稍候再試。', 502);
  }
}