import { NextResponse } from 'next/server';
import { buildNameologyBaziCrossCheck, normalizeNameologyShichen } from '@/lib/nameology-bazi-crosscheck';
import { buildNameologyAnalysis, type NameologySubjectType } from '@/lib/nameology-engine';
import { buildNameologyFiveElementResult } from '@/lib/five-element-engine';
import { getNamePersonalityScores } from '@/lib/name-model-db';
import { loadLocalNameologyDictionary } from '@/lib/nameology-dictionary-loader';
import type { Gender } from '@/lib/types';
import { isValidBirthday } from '@/lib/validation';
import { createRequestId, friendlyErrorResponse, hashedCacheKey } from '@/lib/api-stability';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const VALID_GENDERS = ['male', 'female'] as const;
const SIMPLIFIED_NAME_CHARS = new Set(Array.from(
  '张刘陈黄杨赵吴郑马冯许谢韩罗邓叶钟卢苏赖谭萧蓝吕' +
  '学胜钰龙华国凤丽宝凯伟强艳红颖语悦宁静乐爱诗书诚义轩远铭锋钧铎业东炜维' +
  '广庆梦艺荣辉贤礼达发兴泽洁润汉涛滨钱银铁钢锦锐镇颜龄权观运进选连过还'
));

function hasSimplifiedNameCharacter(name: string) {
  return Array.from(name).some((char) => SIMPLIFIED_NAME_CHARS.has(char));
}
type NameologyRequest = {
  name: string;
  birthDate: string;
  gender: Gender;
  shichen?: number | null;
  analysisTarget?: 'self' | 'guest';
};

const analysisCache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000;

function validateNameologyRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object') return '請提供有效的姓名學資料。';
  const req = body as Partial<NameologyRequest>;

  if (typeof req.name !== 'string' || req.name.trim().length < 2) return '姓名至少需要 2 個字。';
  if (req.name.trim().length > 20) return '姓名長度不可超過 20 個字。';
  if (!isValidBirthday(req.birthDate)) return '生日不是有效日期。';
  try { normalizeNameologyShichen(req.shichen); } catch { return '出生時辰請選擇十二時辰之一，或選擇不知道。'; }
  if (typeof req.gender !== 'string' || !VALID_GENDERS.includes(req.gender as Gender)) return '性別只能是 male 或 female。';

  return null;
}

function subjectTypeFromTarget(target: NameologyRequest['analysisTarget']): NameologySubjectType {
  return target === 'guest' ? 'OTHER' : 'SELF';
}

function getCacheKey(body: NameologyRequest, dictionaryVersion: string) {
  return hashedCacheKey([body.name.trim(), body.birthDate, body.gender, String(normalizeNameologyShichen(body.shichen) ?? 'unknown'), subjectTypeFromTarget(body.analysisTarget), dictionaryVersion, 'nameology-ultimate-v4-bazi-hour']);
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
    gender: body.gender,
    shichen: normalizeNameologyShichen(body.shichen),
    analysisTarget: body.analysisTarget === 'guest' ? 'guest' : 'self',
  };

  if (hasSimplifiedNameCharacter(normalized.name)) {
    return friendlyErrorResponse(requestId, 'NON_TRADITIONAL_NAME_INPUT', '目前無法完成可靠的姓名分析，請稍後重新嘗試。', 422);
  }

  const dictionarySnapshot = await loadLocalNameologyDictionary();
  const cacheKey = getCacheKey(normalized, dictionarySnapshot.version);
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json(cached.result, { status: 200, headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const nameScores = getNamePersonalityScores(normalized.name);
    const analysis = buildNameologyAnalysis(normalized.name, nameScores, {
      gender: normalized.gender,
      birthDate: normalized.birthDate,
      dictionarySnapshot,
      subjectType: subjectTypeFromTarget(normalized.analysisTarget),
    });
    if (!analysis.standardOutput.verification.readyForFrontend) {
      console.warn('[nameology-analyze] blocked unreliable result', requestId, analysis.standardOutput.verification);
      return friendlyErrorResponse(requestId, 'NAME_RULES_NOT_READY', '目前無法完成可靠的姓名分析，請稍後重新嘗試。', 422);
    }
    analysis.baziCrossCheck = buildNameologyBaziCrossCheck(normalized, analysis.characters);
    const fiveElement = buildNameologyFiveElementResult(analysis);
    const result = { ok: true, mode: 'nameology', analysis, nameScores, fiveElement, standardOutput: analysis.standardOutput, verification: analysis.standardOutput.verification };

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