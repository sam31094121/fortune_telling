import { NextResponse } from 'next/server';
import { generateMusicReport } from '@/lib/gemini';
import { PersonalityMatrixEngine } from '@/lib/personality-matrix-engine';
import { MusicParameterGenerator } from '@/lib/music-parameter-generator';
import { computeDestinyProfile } from '@/lib/destiny-engine';
import { computeOcean, identifyArchetypes, getOceanBpmAdjust } from '@/lib/psychology-engine';
import { selectMandarinSongs, getEraDisplayName } from '@/lib/mandarin-songs-db';
import { getZodiacEnglishName, getZodiacSign } from '@/lib/zodiac';
import { isValidBirthday } from '@/lib/validation';

export const dynamic = 'force-dynamic';

function getBirthEra(birthDate: string): string {
  const year = Number.parseInt(birthDate.slice(0, 4), 10);
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
  if (!body || typeof body !== 'object') return '請提供有效的請求資料。';

  const payload = body as Partial<MusicGenerateRequest>;

  if (!isValidBirthday(payload.birthDate)) {
    return '生日日期無效。';
  }

  if (!payload.bloodType || !VALID_BLOOD_TYPES.includes(payload.bloodType as (typeof VALID_BLOOD_TYPES)[number])) {
    return '血型只能是 A、B、AB、O。';
  }

  if (typeof payload.name !== 'string' || payload.name.trim().length < 2) {
    return '姓名至少需要 2 個字。';
  }

  if (payload.name.trim().length > 20) {
    return '姓名長度不可超過 20 個字。';
  }

  if (!payload.gender || !VALID_GENDERS.includes(payload.gender as (typeof VALID_GENDERS)[number])) {
    return '性別只能是 male 或 female。';
  }

  if (payload.voiceCharacteristics !== undefined && (
    !Array.isArray(payload.voiceCharacteristics)
    || payload.voiceCharacteristics.length > 10
    || payload.voiceCharacteristics.some((item) => typeof item !== 'string' || item.length > 40)
  )) {
    return '聲音特徵資料格式無效。';
  }

  return null;
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

  let body: MusicGenerateRequest;
  try {
    body = (await request.json()) as MusicGenerateRequest;
  } catch {
    return NextResponse.json({ error: '無法解析請求 JSON。' }, { status: 400 });
  }

  const errMsg = validate(body);
  if (errMsg) {
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }

  try {
    const { birthDate, bloodType, name, gender, voiceCharacteristics = [] } = body;
    const trimmedName = name.trim();

  const zodiacZh = getZodiacSign(birthDate);
  const zodiacEn = getZodiacEnglishName(birthDate);
  const era = getBirthEra(birthDate);
  const destinyProfile = computeDestinyProfile(birthDate);

  const matrixInput = {
    birthDate,
    zodiacSign: zodiacEn,
    gender: gender as 'male' | 'female' | 'non-binary',
    bloodType,
    voiceCharacteristics,
    firstName: trimmedName,
  };

  const personalityMatrix = PersonalityMatrixEngine.generatePersonalityMatrix(
    matrixInput,
    destinyProfile.personalityAdjust,
  );

  const ocean = computeOcean(personalityMatrix);
  const { primary: archetype, secondary: archetypeSecondary } = identifyArchetypes(personalityMatrix);
  const oceanBpmAdjust = getOceanBpmAdjust(ocean);

  const musicParameters = MusicParameterGenerator.generateMusicParameters(matrixInput, era);
  const finalMusicParameters = {
    ...musicParameters,
    bpm: Math.max(60, Math.min(180, musicParameters.bpm + oceanBpmAdjust)),
  };

  finalMusicParameters.mood = Array.from(
    new Set([
      ...finalMusicParameters.mood,
      ...destinyProfile.wuxingProfile.moodKeywords.slice(0, 2),
      ...archetype.moodKeywords.slice(0, 2),
    ]),
  ).slice(0, 8);

  finalMusicParameters.lyric_theme = Array.from(
    new Set([
      ...finalMusicParameters.lyric_theme,
      ...destinyProfile.wuxingProfile.lyricKeywords.slice(0, 2),
      ...archetype.lyricThemes.slice(0, 2),
    ]),
  ).slice(0, 8);

  const musicReport = await generateMusicReport({
    name: trimmedName,
    birthDate,
    zodiac: zodiacZh,
    bloodType,
    gender,
    era,
    personalityMatrix: Object.fromEntries(Object.entries(personalityMatrix)) as Record<string, number>,
    musicParameters: finalMusicParameters,
    destinyContext: {
      heavenlyStem: destinyProfile.heavenlyStem,
      wuxing: destinyProfile.dominantWuxing,
      wuxingDescription: destinyProfile.wuxingProfile.description,
      chineseZodiac: destinyProfile.chineseZodiac,
      zodiacTrait: destinyProfile.zodiacProfile.trait,
      zodiacMusicTrait: destinyProfile.zodiacProfile.musicTrait,
    },
  });

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
  } catch (error) {
    console.error('[music-generate] request failed', error);
    return NextResponse.json({ error: '音樂人格分析暫時無法完成，請稍後再試。' }, { status: 500 });
  }
}
