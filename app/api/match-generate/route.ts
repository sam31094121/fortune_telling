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
  name:      string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender:    'male' | 'female';
}

interface MatchRequest {
  personA: PersonInput;
  personB: PersonInput;
}

// 顯示用資訊（不參與計算）
interface PersonDisplay {
  name:          string;
  zodiacZh:      string;
  chineseZodiac: string;
  wuxing:        string;
  bloodType:     string;
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

// 使用天地人人格引擎生成矩陣（唯一入口）
function buildProfile(p: PersonInput): { profile: PersonProfile; display: PersonDisplay } {
  const zodiacZh = getZodiacSign(p.birthDate);
  const zodiacEn = ZODIAC_ZH_TO_EN[zodiacZh] ?? 'Aries';
  const destiny  = computeDestinyProfile(p.birthDate);

  const matrix = PersonalityMatrixEngine.generatePersonalityMatrix(
    {
      birthDate:           p.birthDate,
      zodiacSign:          zodiacEn,
      gender:              p.gender,
      bloodType:           p.bloodType,
      voiceCharacteristics: [],
      firstName:           p.name.trim(),
    },
    destiny.personalityAdjust,
  );

  return {
    // 配對引擎只讀取：名字 + 矩陣
    profile: {
      name:   p.name.trim(),
      matrix: matrix as unknown as PersonalityMatrixCompat,
    },
    // 顯示用（不進入計算）
    display: {
      name:          p.name.trim(),
      zodiacZh,
      chineseZodiac: destiny.chineseZodiac,
      wuxing:        destiny.dominantWuxing,
      bloodType:     p.bloodType,
    },
  };
}

async function enhanceSummaryWithAI(
  summary: string,
  matchScore: number,
  displayA: PersonDisplay,
  displayB: PersonDisplay,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return summary;

  const prompt = `
你是天地人 AI 人際關係顧問，精通命理學與心理學。
請根據以下配對數據，將這段摘要改寫得更有溫度（100字內，繁體中文，不提及分數或百分比）。

甲方：${displayA.name}（${displayA.zodiacZh}・${displayA.chineseZodiac}・${displayA.wuxing}屬・${displayA.bloodType}型）
乙方：${displayB.name}（${displayB.zodiacZh}・${displayB.chineseZodiac}・${displayB.wuxing}屬・${displayB.bloodType}型）
配對指數：${matchScore}

原始摘要：${summary}

請輸出改寫後的摘要，語氣溫暖，以「懂得禮讓、欣賞差異」為核心，不說「你們一定合/不合」。
  `.trim();

  try {
    const genai = new GoogleGenAI({ apiKey });
    const resp  = await genai.models.generateContent({
      model:    'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config:   { maxOutputTokens: 200, temperature: 0.75 },
    });
    return resp.text?.trim() || summary;
  } catch {
    return summary;
  }
}

const ipCache = new Map<string, { count: number; resetTime: number }>();

export async function POST(request: Request) {
  const now = Date.now();
  const ip  = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
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

  // ── 各自走天地人人格引擎 ─────────────────────────────
  const { profile: profileA, display: displayA } = buildProfile(body.personA);
  const { profile: profileB, display: displayB } = buildProfile(body.personB);

  // ── 配對：只比較兩個人格矩陣 ────────────────────────
  const result = computeCompatibility(profileA, profileB);

  // ── AI 潤色摘要（不改動計算結果）───────────────────
  const aiSummary = await enhanceSummaryWithAI(
    result.summary, result.match_score, displayA, displayB,
  );

  return NextResponse.json({
    result: { ...result, summary: aiSummary },
    displayA,
    displayB,
  });
}
