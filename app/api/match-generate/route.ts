import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { computeCompatibility, type PersonProfile, type PersonalityMatrixCompat } from '@/lib/compatibility-engine';
import { isConsistentAiSummary, stabilizeMatchResult } from '@/lib/match-stability';
import { PersonalityMatrixEngine } from '@/lib/personality-matrix-engine';
import { computeDestinyProfile } from '@/lib/destiny-engine';
import { getZodiacEnglishName, getZodiacSign } from '@/lib/zodiac';
import { isValidBirthday } from '@/lib/validation';
import { computeRelationshipMatrix } from '@/lib/relationship-matrix-engine';

export const dynamic = 'force-dynamic';

interface PersonInput {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
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

    if (!['A', 'B', 'AB', 'O'].includes(person.bloodType)) {
      return `${label}的血型只能是 A、B、AB、O。`;
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
      bloodType: person.bloodType,
    },
  };
}

async function enhanceSummaryWithAI(
  summary: string,
  result: {
    match_score: number;
    resonance: number;
    communication: number;
    stability: number;
    conflict_risk: number;
  },
  displayA: PersonDisplay,
  displayB: PersonDisplay,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return summary;

  const prompt = `
你是「天地人配對系統」的玄學合盤大師。
請根據以下大數據資料，把原始配對摘要改寫成更具穿透力、起落分明、一針見血的繁體中文分析。

規則：
1. 只做補充與整理，不可推翻原始結論與分數方向。
2. 語氣要高級、精準、高冷且字字扎心，直面雙方的合盤關卡，同時給予核心建議（激勵），拒絕平淡溫和的無用客套。
3. 內容保持 120 字內。
4. 不要輸出分點，只輸出一段文字。
5. 必須順著分數解讀，並融入姓名格局與星曜喜忌的穿透力。

第一位：${displayA.name}，${displayA.zodiacZh}，${displayA.chineseZodiac}，${displayA.wuxing}，血型 ${displayA.bloodType}
第二位：${displayB.name}，${displayB.zodiacZh}，${displayB.chineseZodiac}，${displayB.wuxing}，血型 ${displayB.bloodType}
配對分數：${result.match_score}
共鳴：${result.resonance}
溝通：${result.communication}
穩定：${result.stability}
衝突風險：${result.conflict_risk}
原始摘要：${summary}
`.trim();

  try {
    const genai = new GoogleGenAI({ apiKey });
    const response = await Promise.race([
      genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 180, temperature: 0.2 },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini timeout')), 10_000);
      }),
    ]);

    return response.text?.trim() || summary;
  } catch {
    return summary;
  }
}

const ipCache = new Map<string, { count: number; resetTime: number }>();

export async function POST(request: Request) {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const record = ipCache.get(ip);

  if (record && now < record.resetTime) {
    if (record.count >= 5) {
      return NextResponse.json({ error: '操作太頻繁，請稍後再試。' }, { status: 429 });
    }
    record.count += 1;
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  let body: MatchRequest;
  try {
    body = (await request.json()) as MatchRequest;
  } catch {
    return NextResponse.json({ error: '無法解析請求 JSON。' }, { status: 400 });
  }

  const errMsg = validate(body);
  if (errMsg) {
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }

  try {
    const { profile: profileA, display: displayA } = buildProfile(body.personA);
    const { profile: profileB, display: displayB } = buildProfile(body.personB);

    const rawResult = computeCompatibility(profileA, profileB);
    const result = stabilizeMatchResult(rawResult);
    const aiSummary = await enhanceSummaryWithAI(result.summary, result, displayA, displayB);
    const finalSummary = isConsistentAiSummary(aiSummary, result) ? aiSummary : result.summary;

    // 計算天地人因果三才軌道數據
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

    return NextResponse.json({
      result: { ...result, summary: finalSummary },
      displayA,
      displayB,
      karmaRelation,
    });
  } catch (error) {
    console.error('[match-generate] request failed', error);
    return NextResponse.json({ error: '配對分析暫時無法完成，請稍後再試。' }, { status: 500 });
  }
}
