import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { computeCompatibility, type PersonProfile, type PersonalityMatrixCompat } from '@/lib/compatibility-engine';
import { PersonalityMatrixEngine } from '@/lib/personality-matrix-engine';
import { computeDestinyProfile } from '@/lib/destiny-engine';
import { getZodiacSign } from '@/lib/zodiac';

export const dynamic = 'force-dynamic';

const ZODIAC_ZH_TO_EN: Record<string, string> = {
  '牡羊座':'Aries','金牛座':'Taurus','雙子座':'Gemini','巨蟹座':'Cancer',
  '獅子座':'Leo','處女座':'Virgo','天秤座':'Libra','天蠍座':'Scorpio',
  '射手座':'Sagittarius','摩羯座':'Capricorn','水瓶座':'Aquarius','雙魚座':'Pisces',
};

interface PersonInput {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
}

interface MatchRequest {
  personA: PersonInput;
  personB: PersonInput;
  relationshipType: 'love' | 'friend' | 'family' | 'partner';
}

function validate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return '請提供正確資料格式。';
  const b = body as Partial<MatchRequest>;
  if (!b.personA || !b.personB) return '請提供甲方與乙方資料。';
  for (const [label, p] of [['甲方', b.personA], ['乙方', b.personB]] as const) {
    if (typeof p.name !== 'string' || p.name.trim().length < 2) return `${label}姓名至少需要 2 個字。`;
    if (typeof p.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) return `${label}生日格式不正確。`;
    if (!['A','B','AB','O'].includes(p.bloodType)) return `${label}血型只能是 A、B、AB、O。`;
    if (!['male','female'].includes(p.gender)) return `${label}性別只能是 male 或 female。`;
  }
  return null;
}

function buildProfile(p: PersonInput): PersonProfile {
  const zodiacZh = getZodiacSign(p.birthDate);
  const zodiacEn = ZODIAC_ZH_TO_EN[zodiacZh] ?? 'Aries';
  const destiny = computeDestinyProfile(p.birthDate);

  const matrix = PersonalityMatrixEngine.generatePersonalityMatrix(
    {
      birthDate: p.birthDate,
      zodiacSign: zodiacEn,
      gender: p.gender,
      bloodType: p.bloodType,
      voiceCharacteristics: [],
      firstName: p.name.trim(),
    },
    destiny.personalityAdjust,
  );

  return {
    name: p.name.trim(),
    zodiacZh,
    chineseZodiac: destiny.chineseZodiac,
    wuxing: destiny.dominantWuxing,
    bloodType: p.bloodType,
    matrix: matrix as unknown as PersonalityMatrixCompat,
  };
}

async function generateAIInsight(
  result: ReturnType<typeof computeCompatibility>,
  profileA: PersonProfile,
  profileB: PersonProfile,
  relType: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return result.wisdomNote;

  const relLabel = { love: '戀人', friend: '朋友', family: '家人', partner: '合夥人' }[relType] ?? '關係';

  const prompt = `
你是天地人 AI 人際關係顧問，精通命理學與深層心理學。
請根據以下配對數據，為這對${relLabel}生成一段深刻且溫暖的相處智慧（200字內，繁體中文，不要提及分數或百分比）。

━━━ 配對概況 ━━━
${profileA.name}（${profileA.zodiacZh}・${profileA.chineseZodiac}・${profileA.wuxing}屬・${profileA.bloodType}型）
${profileB.name}（${profileB.zodiacZh}・${profileB.chineseZodiac}・${profileB.wuxing}屬・${profileB.bloodType}型）
關係類型：${relLabel}
配對結果：${result.grade}

━━━ 能量強項 ━━━
${result.strengthPoints.join('\n') || '暫無特別突出強項'}

━━━ 摩擦警示 ━━━
${result.frictionPoints.join('\n') || '摩擦點不明顯'}

請輸出一段相處智慧，融合命理觀點與心理學洞見，告訴這兩個人如何讓這段關係走得更遠、更深。
語氣溫暖，帶著善念，以「心存善念，懂得禮讓」的哲學作為核心。
`.trim();

  try {
    const genai = new GoogleGenAI({ apiKey });
    const resp = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 400, temperature: 0.8 },
    });
    return resp.text?.trim() || result.wisdomNote;
  } catch {
    return result.wisdomNote;
  }
}

const ipCache = new Map<string, { count: number; resetTime: number }>();

export async function POST(request: Request) {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const rec = ipCache.get(ip);
  if (rec && now < rec.resetTime) {
    if (rec.count >= 5) return NextResponse.json({ error: '請求過於頻繁，請稍後再試。' }, { status: 429 });
    rec.count += 1;
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  let body: MatchRequest;
  try { body = await request.json() as MatchRequest; }
  catch { return NextResponse.json({ error: '請傳入有效的 JSON。' }, { status: 400 }); }

  const errMsg = validate(body);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 400 });

  const profileA = buildProfile(body.personA);
  const profileB = buildProfile(body.personB);
  const result = computeCompatibility(profileA, profileB);

  const aiInsight = await generateAIInsight(result, profileA, profileB, body.relationshipType);

  return NextResponse.json({
    result: { ...result, wisdomNote: aiInsight },
    profileA: {
      name: profileA.name,
      zodiacZh: profileA.zodiacZh,
      chineseZodiac: profileA.chineseZodiac,
      wuxing: profileA.wuxing,
      bloodType: profileA.bloodType,
    },
    profileB: {
      name: profileB.name,
      zodiacZh: profileB.zodiacZh,
      chineseZodiac: profileB.chineseZodiac,
      wuxing: profileB.wuxing,
      bloodType: profileB.bloodType,
    },
  });
}
