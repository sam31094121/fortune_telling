import { NextResponse } from 'next/server';
import { generateMusicReport } from '@/lib/gemini';
import { PersonalityMatrixEngine } from '@/lib/personality-matrix-engine';
import { MusicParameterGenerator } from '@/lib/music-parameter-generator';
import { getZodiacSign } from '@/lib/zodiac';

export const dynamic = 'force-dynamic';

// 中文星座 → 英文（PersonalityMatrixEngine 使用英文鍵）
const ZODIAC_ZH_TO_EN: Record<string, string> = {
  '牡羊座': 'Aries',
  '金牛座': 'Taurus',
  '雙子座': 'Gemini',
  '巨蟹座': 'Cancer',
  '獅子座': 'Leo',
  '處女座': 'Virgo',
  '天秤座': 'Libra',
  '天蠍座': 'Scorpio',
  '射手座': 'Sagittarius',
  '摩羯座': 'Capricorn',
  '水瓶座': 'Aquarius',
  '雙魚座': 'Pisces',
};

// 生日年份 → 年代（影響音樂風格）
function getBirthEra(birthDate: string): string {
  const year = parseInt(birthDate.slice(0, 4), 10);
  if (year < 1960) return '1950s';
  if (year < 1980) return '1970s';
  if (year < 1990) return '1990s'; // 改：1980 出生 → 1990s 音樂青春期
  if (year < 2000) return '1990s';
  if (year < 2010) return '2000s';
  return '2020s';
}

const VALID_BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
const VALID_GENDERS = ['male', 'female'] as const;

interface MusicGenerateRequest {
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  name: string;
  gender: 'male' | 'female';
  voiceCharacteristics?: string[];
}

function validate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return '請提供正確的資料格式。';
  const b = body as Partial<MusicGenerateRequest>;

  if (typeof b.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.birthDate)) {
    return '生日格式不正確，請使用 YYYY-MM-DD。';
  }
  const date = new Date(b.birthDate);
  if (isNaN(date.getTime()) || date.getTime() > Date.now()) return '生日日期不合法。';

  if (!b.bloodType || !VALID_BLOOD_TYPES.includes(b.bloodType as typeof VALID_BLOOD_TYPES[number])) {
    return '血型只能是 A、B、AB、O。';
  }

  if (typeof b.name !== 'string' || b.name.trim().length < 2) return '姓名至少需要 2 個字。';
  if (b.name.trim().length > 20) return '姓名長度不可超過 20 個字。';

  if (!b.gender || !VALID_GENDERS.includes(b.gender as typeof VALID_GENDERS[number])) {
    return '性別只能是 male 或 female。';
  }

  return null;
}

// 簡易 rate limit
const ipCache = new Map<string, { count: number; resetTime: number }>();

export async function POST(request: Request) {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const rec = ipCache.get(ip);
  if (rec && now < rec.resetTime) {
    if (rec.count >= 5) {
      return NextResponse.json({ error: '請求過於頻繁，請稍後再試。' }, { status: 429 });
    }
    rec.count += 1;
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  let body: MusicGenerateRequest;
  try {
    body = (await request.json()) as MusicGenerateRequest;
  } catch {
    return NextResponse.json({ error: '請傳入有效的 JSON。' }, { status: 400 });
  }

  const errMsg = validate(body);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 400 });

  const { birthDate, bloodType, name, gender, voiceCharacteristics = [] } = body;

  const zodiacZh = getZodiacSign(birthDate);
  const zodiacEn = ZODIAC_ZH_TO_EN[zodiacZh] || 'Aries';
  const era = getBirthEra(birthDate);

  // 人格矩陣計算（天35% + 地35% + 人30%）
  const personalityMatrix = PersonalityMatrixEngine.generatePersonalityMatrix({
    birthDate,
    zodiacSign: zodiacEn,
    gender: gender as 'male' | 'female' | 'non-binary',
    bloodType,
    voiceCharacteristics,
    firstName: name.trim(),
  });

  // 音樂參數生成
  const musicParameters = MusicParameterGenerator.generateMusicParameters(
    {
      birthDate,
      zodiacSign: zodiacEn,
      gender: gender as 'male' | 'female' | 'non-binary',
      bloodType,
      voiceCharacteristics,
      firstName: name.trim(),
    },
    era,
  );

  // Gemini 音樂報告
  const musicReport = await generateMusicReport({
    name: name.trim(),
    birthDate,
    zodiac: zodiacZh,
    bloodType,
    gender,
    era,
    personalityMatrix,
    musicParameters,
  });

  return NextResponse.json({
    personality_matrix: personalityMatrix,
    music_parameters: musicParameters,
    music_report: musicReport,
    meta: { zodiac: zodiacZh, era },
  });
}
