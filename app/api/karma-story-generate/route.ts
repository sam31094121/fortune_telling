// 2026-10-23 ai-to-asura：因果故事沒有技能檔原句可選，已停用 AI 與自編後備故事，固定回明確狀態「暫時無法取得」。
import { ASURA_UNAVAILABLE_MESSAGE, AsuraUnavailableError } from '@/lib/asura/sourced-lines';
import { NextResponse } from 'next/server';

import { createRequestId, friendlyErrorResponse, hashedCacheKey } from '@/lib/api-stability';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ipCache = new Map<string, { count: number; resetTime: number }>();
const responseCache = new Map<string, { result: unknown; expireTime: number }>();

function cleanCaches() {
  const now = Date.now();
  if (ipCache.size > 200) {
    for (const [key, val] of ipCache.entries()) {
      if (now > val.resetTime) ipCache.delete(key);
    }
  }
  if (responseCache.size > 200) {
    for (const [key, val] of responseCache.entries()) {
      if (now > val.expireTime) responseCache.delete(key);
    }
  }
}

interface PersonInput {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
  shichen?: number | 'unknown' | null;
}

interface MatchResult {
  match_score: number;
  resonance: number;
  communication: number;
  stability: number;
  conflict_risk: number;
  summary: string;
}

interface KarmaStory {
  resonance_score: number;
  active_giver: string;
  needs_understanding: string;
  relationship_theme: string;
  story: string;
  today_advice: string;
  closing_wisdom: string;
  personA_star?: string;
  personB_star?: string;
  iching_hexagram?: string;
}

interface KarmaRequest {
  personA: PersonInput;
  personB: PersonInput;
  matchResult: MatchResult;
}

async function generateKarmaStory(_request: KarmaRequest): Promise<KarmaStory> {
  throw new AsuraUnavailableError('KARMA_STORY_NO_SKILL_SOURCE');
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown_ip';

  cleanCaches();

  const limitRecord = ipCache.get(ip);
  if (limitRecord && now < limitRecord.resetTime) {
    if (limitRecord.count >= 5) {
      return friendlyErrorResponse(requestId, 'RATE_LIMITED', '請求過於頻繁，請稍後再試。', 429);
    }
    limitRecord.count += 1;
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  let body: KarmaRequest;
  try {
    body = (await request.json()) as KarmaRequest;
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '無法解析請求 JSON。', 400);
  }

  try {
    if (!body.personA || !body.personB || !body.matchResult) {
      return friendlyErrorResponse(requestId, 'INVALID_INPUT', '請提供完整的配對資料。', 400);
    }

    const cacheKey = hashedCacheKey([
      body.personA.name.trim(),
      body.personA.birthDate,
      body.personA.bloodType,
      body.personB.name.trim(),
      body.personB.birthDate,
      body.personB.bloodType,
    ]);

    const cached = responseCache.get(cacheKey);
    if (cached && now < cached.expireTime) {
      return NextResponse.json({ karma_story: cached.result }, { status: 200 });
    }

    const karmaStory = await generateKarmaStory(body);
    responseCache.set(cacheKey, { result: karmaStory, expireTime: now + 300_000 });

    return NextResponse.json({ karma_story: karmaStory });
  } catch (error) {
    console.error('[karma-story-generate] request failed', requestId, error instanceof Error ? error.message : String(error));
    return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', ASURA_UNAVAILABLE_MESSAGE, 503);
  }
}
