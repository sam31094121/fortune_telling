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

function getFallbackKarmaStory(body: KarmaRequest): KarmaStory {
  const score = body.matchResult?.match_score ?? 60;
  return {
    resonance_score: score,
    active_giver: body.personA.name,
    needs_understanding: body.personB.name,
    relationship_theme: `天宿因果課題：在紅塵執念與靈魂改心中尋求順天之軌。`,
    story: `在宿世天命的交錯中，${body.personA.name} 與 ${body.personB.name} 的相遇絕非偶然。這是一段註定要在「${score}%」的星盤引力場中反覆淬煉的緣分。前世的執念如今化為今生相處的拉扯。雙方最深處的命宮星曜正無聲地考驗著彼此的修行。人之所以受折磨，是因為凡夫俗子執著於色相與得失（人有色無空，執念難消）。只有看透「離下坎上：火水未濟卦」之變易道理，學會放下對彼此的索求，方能突破宿世的困局。`,
    today_advice: `修行的重中之重在於改命，而改命的唯一法門是「自己有沒有真正改心、廣結善緣」。不要一味在控制與冷暴力中指責對方，而是要學會放下心中的執著與不甘。以善為本，順天而行，這段關係的因果便已在默默中改寫。`,
    closing_wisdom: `順天而行，以善為道則合、則生；執迷不悟，逆天而行則離、則亡。當你願意跨出改心與放下的第一步，宿世的因果密碼便已為你悄然啟封。`,
    personA_star: `星曜交匯`,
    personB_star: `星曜交匯`,
    iching_hexagram: `震下巽上：雷風恆卦 · 剛柔並濟`
  };
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
