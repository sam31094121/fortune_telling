import { NextResponse } from 'next/server';
import { generateMusicReport } from '@/lib/gemini';
import { PersonalityMatrixEngine } from '@/lib/personality-matrix-engine';
import { MusicParameterGenerator } from '@/lib/music-parameter-generator';
import { computeDestinyProfile } from '@/lib/destiny-engine';
import { computeOcean, getOceanDescription, identifyArchetypes, getOceanBpmAdjust } from '@/lib/psychology-engine';
import { selectMandarinSongs, getEraDisplayName } from '@/lib/mandarin-songs-db';
import { getZodiacSign } from '@/lib/zodiac';

export const dynamic = 'force-dynamic';

const ZODIAC_ZH_TO_EN: Record<string, string> = {
  '牡羊座': 'Aries', '金牛座': 'Taurus', '雙子座': 'Gemini',
  '巨蟹座': 'Cancer', '獅子座': 'Leo', '處女座': 'Virgo',
  '天秤座': 'Libra', '天蠍座': 'Scorpio', '射手座': 'Sagittarius',
  '摩羯座': 'Capricorn', '水瓶座': 'Aquarius', '雙魚座': 'Pisces',
};

// 以 17 歲音樂記憶黃金期推算年代
function getBirthEra(birthDate: string): string {
  const year = parseInt(birthDate.slice(0, 4), 10);
  const peakMusicYear = year + 17;
  if (peakMusicYear < 1960) return '1950s';
  if (peakMusicYear < 1970) return '1960s';
  if (peakMusicYear < 1980) return '1970s';
  if (peakMusicYear < 1990) return '1980s';
  if (peakMusicYear < 2000) return '1990s';
  if (peakMusicYear < 2010) return '2000s';
  if (peakMusicYear < 2020) return '2010s';
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
  if (typeof b.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.birthDate))
    return '生日格式不正確，請使用 YYYY-MM-DD。';
  const date = new Date(b.birthDate);
  if (isNaN(date.getTime()) || date.getTime() > Date.now()) return '生日日期不合法。';
  if (!b.bloodType || !VALID_BLOOD_TYPES.includes(b.bloodType as typeof VALID_BLOOD_TYPES[number]))
    return '血型只能是 A、B、AB、O。';
  if (typeof b.name !== 'string' || b.name.trim().length < 2) return '姓名至少需要 2 個字。';
  if (b.name.trim().length > 20) return '姓名長度不可超過 20 個字。';
  if (!b.gender || !VALID_GENDERS.includes(b.gender as typeof VALID_GENDERS[number]))
    return '性別只能是 male 或 female。';
  return null;
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

  let body: MusicGenerateRequest;
  try {
    body = (await request.json()) as MusicGenerateRequest;
  } catch {
    return NextResponse.json({ error: '請傳入有效的 JSON。' }, { status: 400 });
  }

  const errMsg = validate(body);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 400 });

  const { birthDate, bloodType, name, gender, voiceCharacteristics = [] } = body;
  const trimmedName = name.trim();

  // ── 基礎推算 ──────────────────────────────────────────────────────
  const zodiacZh = getZodiacSign(birthDate);
  const zodiacEn = ZODIAC_ZH_TO_EN[zodiacZh] || 'Aries';
  const era = getBirthEra(birthDate);

  // ── 命理層：五行 + 天干 + 生肖 ────────────────────────────────────
  const destinyProfile = computeDestinyProfile(birthDate);

  const matrixInput = {
    birthDate, zodiacSign: zodiacEn,
    gender: gender as 'male' | 'female' | 'non-binary',
    bloodType, voiceCharacteristics, firstName: trimmedName,
  };

  // ── 人格矩陣（含命理加成）─────────────────────────────────────────
  const personalityMatrix = PersonalityMatrixEngine.generatePersonalityMatrix(
    matrixInput,
    destinyProfile.personalityAdjust,
  );

  // ── 心理學層：OCEAN + 榮格原型 ────────────────────────────────────
  const ocean = computeOcean(personalityMatrix);
  const oceanDescriptions = getOceanDescription(ocean);
  const { primary: archetype, secondary: archetypeSecondary } = identifyArchetypes(personalityMatrix);
  const oceanBpmAdjust = getOceanBpmAdjust(ocean);

  // ── 音樂參數（含心理學 BPM 微調）────────────────────────────────
  const musicParameters = MusicParameterGenerator.generateMusicParameters(matrixInput, era);
  // 把心理學 BPM 微調疊加到結果上
  const adjustedBpm = Math.max(60, Math.min(180, musicParameters.bpm + oceanBpmAdjust));
  const finalMusicParameters = { ...musicParameters, bpm: adjustedBpm };

  // 把五行、生肖、原型的 mood/lyric 補充進音樂參數
  finalMusicParameters.mood = Array.from(new Set([
    ...finalMusicParameters.mood,
    ...destinyProfile.wuxingProfile.moodKeywords.slice(0, 2),
    ...archetype.moodKeywords.slice(0, 2),
  ])).slice(0, 8);

  finalMusicParameters.lyric_theme = Array.from(new Set([
    ...finalMusicParameters.lyric_theme,
    ...destinyProfile.wuxingProfile.lyricKeywords.slice(0, 2),
    ...archetype.lyricThemes.slice(0, 2),
  ])).slice(0, 8);

  // ── Gemini 深度音樂報告 ────────────────────────────────────────────
  const musicReport = await generateMusicReport({
    name: trimmedName,
    birthDate,
    zodiac: zodiacZh,
    bloodType,
    gender,
    era,
    personalityMatrix: Object.fromEntries(Object.entries(personalityMatrix)) as Record<string, number>,
    musicParameters: finalMusicParameters,
    // 傳入命理 + 心理學語境
    destinyContext: {
      heavenlyStem: destinyProfile.heavenlyStem,
      wuxing: destinyProfile.dominantWuxing,
      wuxingDescription: destinyProfile.wuxingProfile.description,
      chineseZodiac: destinyProfile.chineseZodiac,
      zodiacTrait: destinyProfile.zodiacProfile.trait,
      zodiacMusicTrait: destinyProfile.zodiacProfile.musicTrait,
    },
    psychologyContext: {
      archetypePrimary: archetype.zh,
      archetypeDescription: archetype.description,
      archetypeMusicPersona: archetype.musicPersona,
      archetypeShadow: archetype.shadowSide,
      archetypeCoreWound: archetype.coreWound,
      archetypeCoreGift: archetype.coreGift,
      archetypeLifeLesson: archetype.lifeLesson,
      archetypeSecondary: archetypeSecondary.zh,
      oceanHighlight: Object.values(oceanDescriptions).find(
        (d) => d.startsWith('高'),
      ) ?? oceanDescriptions.openness,
    },
  });

  // ── 國語歌曲選歌（年代 × 天地人人格矩陣）────────────────────────
  const mandarinTracks = selectMandarinSongs(era, personalityMatrix);
  const eraDisplayName = getEraDisplayName(era);

  return NextResponse.json({
    personality_matrix: personalityMatrix,
    music_parameters: finalMusicParameters,
    music_report: musicReport,
    mandarin_tracks: mandarinTracks,
    meta: {
      eraDisplayName,
      zodiac: zodiacZh,
      era,
      wuxing: destinyProfile.dominantWuxing,
      wuxingColor: destinyProfile.wuxingProfile.color,
      chineseZodiac: destinyProfile.chineseZodiac,
      heavenlyStem: destinyProfile.heavenlyStem,
      archetype: archetype.zh,
      archetypeSymbol: archetype.symbol,
      archetypeEn: archetype.en,
      archetypeDescription: archetype.description,
      archetypeMusicPersona: archetype.musicPersona,
      archetypeShadow: archetype.shadowSide,
      archetypeCoreWound: archetype.coreWound,
      archetypeCoreGift: archetype.coreGift,
      archetypeLifeLesson: archetype.lifeLesson,
      archetypeShadowIntegration: archetype.shadowIntegration,
      archetypeSecondary: archetypeSecondary.zh,
      archetypeSecondarySymbol: archetypeSecondary.symbol,
      ocean,
    },
  });
}
