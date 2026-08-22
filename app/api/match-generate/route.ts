import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { computeCompatibility, type PersonProfile, type PersonalityMatrixCompat } from '@/lib/compatibility-engine';
import { isConsistentAiSummary, stabilizeMatchResult } from '@/lib/match-stability';
import { PersonalityMatrixEngine } from '@/lib/personality-matrix-engine';
import { computeDestinyProfile } from '@/lib/destiny-engine';
import { getZodiacEnglishName, getZodiacSign } from '@/lib/zodiac';
import { isValidBirthday } from '@/lib/validation';
import { computeRelationshipMatrix } from '@/lib/relationship-matrix-engine';
import { createRequestId, friendlyErrorResponse, hashedCacheKey } from '@/lib/api-stability';
import { buildAiCopywritingInstruction, enforceAiCopywritingTone } from '@/lib/ai-copywriting-style-center';
import { buildMatchFiveElementResult } from '@/lib/match-five-element-engine';
import { buildSoulMatchAiInterpretationLayer, buildSoulMatchProfessionalLayer, buildSoulMatchReinforcementLayer } from '@/lib/match-professional-layer';
import { analyzeBazi } from '@/lib/bazi-engine';
import { deriveBaziPillarBeast } from '@/lib/bazi-four-pillar-beasts';

export const dynamic = 'force-dynamic';

interface PersonInput {
  name: string;
  birthDate: string;
  birthHourBranch?: string;
  bloodType: 'A' | 'B' | 'AB' | 'O' | 'unknown';
  gender: 'male' | 'female';
}

interface MatchRequest {
  personA: PersonInput;
  personB: PersonInput;
}

interface PersonDisplay {
  name: string;
  zodiacZh: string;
  chineseZodiac: string;
  wuxing: string;
  bloodType: string;
}
type MatchEnhancementPayload = {
  summary: string;
  resonance: string[];
  complement: string[];
  grinding: string[];
  conflict: string[];
};

type BaziMatchFoundation = {
  source: '八字四柱合盤' | '八字三柱基礎合盤' | '八字混合合盤';
  timeNote: string;
  sceneKey: string;
  sharedElement: 'earth' | 'water' | 'fire' | 'air' | 'space';
  personA: { dayMaster: string; primaryReinforcement: string; beastCard: BaziBeastCard };
  personB: { dayMaster: string; primaryReinforcement: string; beastCard: BaziBeastCard };
};

type BaziBeastCard = {
  name: string;
  image: string;
  coreMeaning: string;
  direction: string;
  productElement: '空' | '風' | '水' | '火' | '地';
  evidence: string;
  dayPillar: string;
};

const BAZI_BRAND_TO_MATCH = {
  EARTH: 'earth',
  WATER: 'water',
  FIRE: 'fire',
  AIR: 'air',
  SPACE: 'space',
} as const;

const MATCH_ENHANCEMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    resonance: { type: Type.ARRAY, items: { type: Type.STRING } },
    complement: { type: Type.ARRAY, items: { type: Type.STRING } },
    grinding: { type: Type.ARRAY, items: { type: Type.STRING } },
    conflict: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['summary', 'resonance', 'complement', 'grinding', 'conflict'],
};

function extractJsonObjectText(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
  if (fenced) return fenced;

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function coerceStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function parseMatchEnhancement(text: string): MatchEnhancementPayload {
  const payload = JSON.parse(extractJsonObjectText(text)) as Partial<MatchEnhancementPayload>;
  return {
    summary: typeof payload.summary === 'string' ? payload.summary : '',
    resonance: coerceStringArray(payload.resonance),
    complement: coerceStringArray(payload.complement),
    grinding: coerceStringArray(payload.grinding),
    conflict: coerceStringArray(payload.conflict),
  };
}

function validate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return '請提供有效的配對資料。';

  const payload = body as Partial<MatchRequest>;
  if (!payload.personA || !payload.personB) return '請完整提供兩位對象的資料。';

  for (const [label, person] of [['第一位', payload.personA], ['第二位', payload.personB]] as const) {
    if (typeof person.name !== 'string' || person.name.trim().length < 2 || person.name.trim().length > 20) {
      return `${label}的姓名至少需要 2 個字。`;
    }

    if (!isValidBirthday(person.birthDate)) {
      return `${label}的生日日期無效。`;
    }

    if (!['A', 'B', 'AB', 'O', 'unknown'].includes(person.bloodType)) {
      return `${label}的血型只能是 A、B、AB、O 或不知道。`;
    }

    if (!['male', 'female'].includes(person.gender)) {
      return `${label}的性別只能是 male 或 female。`;
    }
  }

  return null;
}

function buildProfile(person: PersonInput): { profile: PersonProfile; display: PersonDisplay } {
  const zodiacZh = getZodiacSign(person.birthDate);
  const zodiacEn = getZodiacEnglishName(person.birthDate);
  const destiny = computeDestinyProfile(person.birthDate);

  const matrix = PersonalityMatrixEngine.generatePersonalityMatrix(
    {
      birthDate: person.birthDate,
      zodiacSign: zodiacEn,
      gender: person.gender,
      bloodType: person.bloodType,
      voiceCharacteristics: [],
      firstName: person.name.trim(),
    },
    destiny.personalityAdjust,
  );

  return {
    profile: {
      name: person.name.trim(),
      matrix: matrix as unknown as PersonalityMatrixCompat,
    },
    display: {
      name: person.name.trim(),
      zodiacZh,
      chineseZodiac: destiny.chineseZodiac,
      wuxing: destiny.dominantWuxing,
      bloodType: person.bloodType === 'unknown' ? '不知道' : person.bloodType,
    },
  };
}

function buildBaziMatchFoundation(personA: PersonInput, personB: PersonInput): BaziMatchFoundation {
  const toBaziInput = (person: PersonInput) => {
    const traditionalHour = person.birthHourBranch && person.birthHourBranch !== 'unknown'
      ? person.birthHourBranch
      : undefined;
    return {
      name: person.name.trim(),
      birthDate: person.birthDate,
      birthTime: '12:00',
      birthTimeKnown: Boolean(traditionalHour),
      timeUnknown: !traditionalHour,
      traditionalHour,
      gender: person.gender,
      country: 'TW',
      city: 'Taipei',
    };
  };
  const chartA = analyzeBazi(toBaziInput(personA));
  const chartB = analyzeBazi(toBaziInput(personB));
  const firstA = chartA.aiReinforcementPlan.first;
  const firstB = chartB.aiReinforcementPlan.first;
  // Soul matching deliberately reuses the exact same day-pillar helper as the
  // Bazi page. The same birth data therefore always returns the same beast.
  const beastA = deriveBaziPillarBeast({
    key: 'day',
    label: '日柱',
    stem: chartA.pillars.day.stem,
    branch: chartA.pillars.day.branch,
  });
  const beastB = deriveBaziPillarBeast({
    key: 'day',
    label: '日柱',
    stem: chartB.pillars.day.stem,
    branch: chartB.pillars.day.branch,
  });
  const hasHourA = Boolean(personA.birthHourBranch && personA.birthHourBranch !== 'unknown');
  const hasHourB = Boolean(personB.birthHourBranch && personB.birthHourBranch !== 'unknown');
  const sharedElement = firstA.brandElement === firstB.brandElement
    ? BAZI_BRAND_TO_MATCH[firstA.brandElement]
    : BAZI_BRAND_TO_MATCH[chartA.aiReinforcementPlan.second.brandElement];

  return {
    source: hasHourA && hasHourB ? '八字四柱合盤' : hasHourA || hasHourB ? '八字混合合盤' : '八字三柱基礎合盤',
    timeNote: hasHourA && hasHourB
      ? '雙方皆已提供出生時辰，使用完整四柱八字合盤。'
      : hasHourA || hasHourB
        ? '至少一方未填出生時辰，因此以可用的完整四柱與三柱資料合盤；未知時柱不作推定。'
        : '雙方未填出生時辰，因此以年、月、日三柱建立基礎合盤；時柱不作推定。',
    sceneKey: [
      chartA.pillars.year.stem,
      chartA.pillars.year.branch,
      chartA.pillars.month.stem,
      chartA.pillars.month.branch,
      chartA.pillars.day.stem,
      chartA.pillars.day.branch,
      chartB.pillars.year.stem,
      chartB.pillars.year.branch,
      chartB.pillars.month.stem,
      chartB.pillars.month.branch,
      chartB.pillars.day.stem,
      chartB.pillars.day.branch,
    ].join(''),
    sharedElement,
    personA: {
      dayMaster: `${chartA.dayMaster.stem}${chartA.dayMaster.element}`,
      primaryReinforcement: firstA.displayName,
      beastCard: {
        name: beastA.beast.name,
        image: beastA.beast.image,
        coreMeaning: beastA.beast.coreMeaning,
        direction: beastA.direction,
        productElement: beastA.productElement,
        evidence: beastA.evidence,
        dayPillar: `${chartA.pillars.day.stem}${chartA.pillars.day.branch}`,
      },
    },
    personB: {
      dayMaster: `${chartB.dayMaster.stem}${chartB.dayMaster.element}`,
      primaryReinforcement: firstB.displayName,
      beastCard: {
        name: beastB.beast.name,
        image: beastB.beast.image,
        coreMeaning: beastB.beast.coreMeaning,
        direction: beastB.direction,
        productElement: beastB.productElement,
        evidence: beastB.evidence,
        dayPillar: `${chartB.pillars.day.stem}${chartB.pillars.day.branch}`,
      },
    },
  };
}

function buildGhostTeacherReading(
  foundation: BaziMatchFoundation,
  result: { communication: number; conflict_risk: number; zones: { conflict: string[]; grinding: string[] } },
) {
  const tension = result.conflict_risk >= 55
    ? '兩股節奏一靠近，封印就開始震動'
    : result.communication < 65
      ? '未回應的話正在結界裡留下回音'
      : '回音尚未失控，但結界仍在等待第一個人伸手';
  const thread = result.zones.conflict[0] || result.zones.grinding[0] || '把真正的感受說清楚';

  return {
    displayName: '鬼魅老師',
    // 僅供後端敘事引擎使用，前台名稱固定顯示「鬼魅老師」。
    internalStyle: '恐怖・驚悚',
    reading: `封印沒有睡著。${foundation.personA.beastCard.name}與${foundation.personB.beastCard.name}在同一個結界裡相望；${tension}。鬼魅把暗線指向「${thread}」，要讓這一局往前，必須先解除共同元素的封印。`,
  };
}

async function enhanceMatchResultWithAI(
  result: {
    match_score: number;
    resonance: number;
    communication: number;
    stability: number;
    conflict_risk: number;
    summary: string;
    zones: {
      resonance: string[];
      complement: string[];
      grinding: string[];
      conflict: string[];
    };
  },
  displayA: PersonDisplay,
  displayB: PersonDisplay,
  baziFoundation: BaziMatchFoundation,
): Promise<{ summary: string; zones: { resonance: string[]; complement: string[]; grinding: string[]; conflict: string[] }; provider: 'google' | 'local' }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { summary: result.summary, zones: result.zones, provider: 'local' };

  const prompt = `
你是「天地人配對系統」的玄學合盤大師。
請根據以下雙方的基本資料與大數據配對指數，將原始配對結果（摘要與四個關係象限文字）改寫成極具個性化、起伏分明、字字扎心、絕不重複的繁體中文大師合盤結論。

${buildAiCopywritingInstruction('天地人配對系統')}

合盤對象：
- 第一位：姓名 ${displayA.name}，生肖 ${displayA.chineseZodiac}，星座 ${displayA.zodiacZh}，五行 ${displayA.wuxing}，血型 ${displayA.bloodType}
- 第二位：姓名 ${displayB.name}，生肖 ${displayB.chineseZodiac}，星座 ${displayB.zodiacZh}，五行 ${displayB.wuxing}，血型 ${displayB.bloodType}

八字交叉依據（同一份出生資料在八字頁與配對頁必須一致，不可自行改寫）：
- 第一位日主：${baziFoundation.personA.dayMaster}；日柱神獸：${baziFoundation.personA.beastCard.name}；先補方向：${baziFoundation.personA.primaryReinforcement}
- 第二位日主：${baziFoundation.personB.dayMaster}；日柱神獸：${baziFoundation.personB.beastCard.name}；先補方向：${baziFoundation.personB.primaryReinforcement}
- 兩人共同優先元素：${baziFoundation.sharedElement}

配對數理指標：
- 總體契合指數：${result.match_score}
- 共鳴感：${result.resonance}
- 溝通感：${result.communication}
- 穩定度：${result.stability}
- 衝突風險：${result.conflict_risk}

原始基準文字（作為改寫方向參考，不可顛倒主次結論）：
- 原始摘要：${result.summary}
- 原始最有共鳴點：${result.zones.resonance.join('、')}
- 原始互補優勢點：${result.zones.complement.join('、')}
- 原始需要磨合點：${result.zones.grinding.join('、')}
- 原始注意衝突點：${result.zones.conflict.join('、')}

【改寫指令與限制】：
1. 必須將原始各點改寫融入「雙方姓名、星座、生肖、八字日主、日柱神獸與共同元素」的實際差異；不可只換姓名後輸出相同內容。
2. 四大關係象限（共鳴、互補、磨合、衝突）中，每一區請生成 1 到 2 條全新、扎心、個性化的合盤指點（每條請控制在 25 字內，切忌空洞泛泛的讚美，多說有用的修行相處建議）。
3. 摘要 summary 請控制在 120 字內的一段話，語氣高冷犀利、字字點中要害，直接點破相處關卡。
4. ⚠️【JSON 安全與轉義鐵律】：
   - 輸出必須是合法的 JSON。
   - 絕對不准在 JSON 值（value）的文字內容內部使用任何「雙引號（"）」。若需使用引用，請一律使用「單引號（'）」或「書名號（《》）」。
   - 絕對不准在值內包含實體換行鍵。所有的換行必須使用 '\\n' 進行轉義。
5. 必須以 JSON 格式回覆，不含任何外部 markdown 包裝，格式必須嚴格為：
{
  "summary": "改寫後的摘要",
  "resonance": ["改寫後共鳴 1", "改寫後共鳴 2"],
  "complement": ["改寫後互補 1", "改寫後互補 2"],
  "grinding": ["改寫後磨合 1", "改寫後磨合 2"],
  "conflict": ["改寫後衝突 1", "改寫後衝突 2"]
}
  `.trim();

  try {
    const genai = new GoogleGenAI({ apiKey });
    const response = await Promise.race([
      genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: MATCH_ENHANCEMENT_SCHEMA,
          maxOutputTokens: 1500,
          temperature: 0.25,
          thinkingConfig: { thinkingBudget: 0 }
        },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini timeout')), 10_000);
      }),
    ]);

    const text = response.text?.trim();
    if (!text) throw new Error('Empty response');

    const parsed = parseMatchEnhancement(text);

    return {
      summary: enforceAiCopywritingTone(parsed.summary || result.summary),
      zones: {
        resonance: (parsed.resonance?.length ? parsed.resonance : result.zones.resonance).slice(0, 3).map(enforceAiCopywritingTone),
        complement: (parsed.complement?.length ? parsed.complement : result.zones.complement).slice(0, 3).map(enforceAiCopywritingTone),
        grinding: (parsed.grinding?.length ? parsed.grinding : result.zones.grinding).slice(0, 3).map(enforceAiCopywritingTone),
        conflict: (parsed.conflict?.length ? parsed.conflict : result.zones.conflict).slice(0, 3).map(enforceAiCopywritingTone),
      },
      provider: 'google',
    };
  } catch (error) {
    console.info('[enhanceMatchResultWithAI] AI enhancement unavailable; using deterministic templates.', error instanceof Error ? error.message : String(error));
    return { summary: result.summary, zones: result.zones, provider: 'local' };
  }
}

const ipCache = new Map<string, { count: number; resetTime: number }>();
const responseCache = new Map<string, { result: any; expireTime: number }>();

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

export async function POST(request: Request) {
  const requestId = createRequestId();
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  
  cleanCaches();

  const record = ipCache.get(ip);

  if (record && now < record.resetTime) {
    if (record.count >= 5) {
      return friendlyErrorResponse(requestId, 'RATE_LIMITED', '操作太頻繁，請稍後再試。', 429);
    }
    record.count += 1;
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  let body: MatchRequest;
  try {
    body = (await request.json()) as MatchRequest;
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '無法解析請求 JSON。', 400);
  }

  const errMsg = validate(body);
  if (errMsg) {
    return friendlyErrorResponse(requestId, 'INVALID_INPUT', errMsg, 400);
  }

  const cacheKey = hashedCacheKey([
    body.personA.name.trim(),
    body.personA.birthDate,
    body.personA.birthHourBranch ?? 'unknown',
    body.personA.bloodType,
    body.personA.gender,
    body.personB.name.trim(),
    body.personB.birthDate,
    body.personB.birthHourBranch ?? 'unknown',
    body.personB.bloodType,
    body.personB.gender,
    'soul-match-three-layer-v2',
  ]);
  const cached = responseCache.get(cacheKey);
  if (cached && now < cached.expireTime) {
    return NextResponse.json(cached.result);
  }

  try {
    const { profile: profileA, display: displayA } = buildProfile(body.personA);
    const { profile: profileB, display: displayB } = buildProfile(body.personB);

    const rawResult = computeCompatibility(profileA, profileB);
    const result = stabilizeMatchResult(rawResult);
    const baziFoundation = buildBaziMatchFoundation(body.personA, body.personB);
    const enhanced = await enhanceMatchResultWithAI(result, displayA, displayB, baziFoundation);
    const finalSummary = isConsistentAiSummary(enhanced.summary, result) ? enhanced.summary : result.summary;

    const karmaRelation = computeRelationshipMatrix(
      {
        name: body.personA.name,
        birthDate: body.personA.birthDate,
        bloodType: body.personA.bloodType,
        gender: body.personA.gender,
        shichen: null,
      },
      {
        name: body.personB.name,
        birthDate: body.personB.birthDate,
        bloodType: body.personB.bloodType,
        gender: body.personB.gender,
        shichen: null,
      }
    );

    const finalResult = { ...result, summary: finalSummary, zones: enhanced.zones };
    const fiveElementMatch = buildMatchFiveElementResult(body.personA, body.personB, result);
    const ghostTeacher = buildGhostTeacherReading(baziFoundation, finalResult);
    const professionalLayer = buildSoulMatchProfessionalLayer({
      personA: body.personA,
      personB: body.personB,
      displayA,
      displayB,
      matrixA: profileA.matrix,
      matrixB: profileB.matrix,
      result: finalResult,
    });
    const aiInterpretationLayer = buildSoulMatchAiInterpretationLayer(professionalLayer);
    const reinforcementLayer = buildSoulMatchReinforcementLayer(aiInterpretationLayer);

    const responseData = {
      result: finalResult,
      displayA,
      displayB,
      professionalLayer,
      aiInterpretationLayer,
      reinforcementLayer,
      karmaRelation,
      fiveElementMatch,
      baziFoundation,
      teacherReadings: {
        google: {
          reading: enhanced.summary || finalSummary,
          source: enhanced.provider,
        },
        ghost: ghostTeacher,
      },
    };

    responseCache.set(cacheKey, { result: responseData, expireTime: now + 300_000 });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[match-generate] request failed', requestId, error instanceof Error ? error.message : String(error));
    return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', '系統正在重新同步，請稍候再試。', 503);
  }
}
