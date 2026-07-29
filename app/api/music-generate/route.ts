import { NextResponse } from 'next/server';
import { generateMusicReport, generateFusionSong, generateSongDrafts, generateAiProductionPlan } from '@/lib/gemini';
import { PersonalityMatrixEngine } from '@/lib/personality-matrix-engine';
import { MusicParameterGenerator } from '@/lib/music-parameter-generator';
import { computeDestinyProfile } from '@/lib/destiny-engine';
import { computeOcean, identifyArchetypes, getOceanBpmAdjust } from '@/lib/psychology-engine';
import { selectMandarinSongs, getEraDisplayName } from '@/lib/mandarin-songs-db';
import { selectEnglishSong } from '@/lib/english-songs-db';
import { selectTaiwaneseSong } from '@/lib/taiwanese-songs-db';
import { getZodiacEnglishName, getZodiacSign } from '@/lib/zodiac';
import { isValidBirthday } from '@/lib/validation';
import { computeShichenProfile } from '@/lib/shichen-engine';
import { createRequestId, friendlyErrorResponse, hashedCacheKey } from '@/lib/api-stability';
import { buildMusicFiveElementResult } from '@/lib/five-element-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
const VALID_SONG_LANGUAGES = ['mandarin', 'english', 'taiwanese'] as const;
const VALID_SONG_ENERGY_STYLES = ['dance-pop', 'emotional-pop', 'club-edm'] as const;
const AI_VOICE_DIRECT_MIME = 'application/x-ai-voice-direct';

// ?蹇???umber(0??1 ??啾???=?貔??unknown'/null=??貔?????????剝３???蹇?
type ShichenChoice = number | 'unknown' | null;
type VocalGenderPreference = 'male' | 'female' | null;
type PreferredSongLanguage = 'mandarin' | 'english' | 'taiwanese';
type SongEnergyStyle = (typeof VALID_SONG_ENERGY_STYLES)[number];

interface VoiceSampleSummary {
  durationSeconds: number;
  averageVolume: number;
  dynamicRange: number;
  brightness: number;
  tempoPulse: number;
  qualityScore: number;
  inferredCharacteristics: string[];
  recordedAt: string;
  mimeType: string;
  localOnly: true;
}

interface VoiceConsentPayload {
  accepted: boolean;
  version: string;
  confirmedOwnVoice: boolean;
  allowSongGeneration: boolean;
  recordedAt?: string;
  sample?: VoiceSampleSummary;
}

interface MusicGenerateRequest {
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  name: string;
  gender: 'male' | 'female';
  shichen?: ShichenChoice;
  voiceCharacteristics?: string[];
  vocalGenderPreference?: VocalGenderPreference;
  preferredSongLanguage?: PreferredSongLanguage;
  songEnergyStyle?: SongEnergyStyle;
  voiceConsent?: VoiceConsentPayload;
}

function isStringArray(value: unknown, maxLength = 10, maxItemLength = 48): value is string[] {
  return Array.isArray(value) && value.length <= maxLength && value.every((item) => typeof item === 'string' && item.length <= maxItemLength);
}

function isAiVoiceDirectSample(sample?: VoiceSampleSummary) {
  return Boolean(sample?.mimeType === AI_VOICE_DIRECT_MIME || sample?.inferredCharacteristics?.includes('ai_voice_direct'));
}

function validateVoiceConsent(payload: unknown): string | null {
  if (payload === undefined || payload === null) return '\u8acb\u9078\u64c7\u9304\u97f3\u6216 AI \u8072\u97f3\u751f\u6210\u3002';
  if (typeof payload !== 'object') return '\u8072\u97f3\u751f\u6210\u8cc7\u6599\u683c\u5f0f\u7121\u6548\u3002';
  const consent = payload as Partial<VoiceConsentPayload>;
  const aiVoiceDirect = isAiVoiceDirectSample(consent.sample);

  if (typeof consent.accepted !== 'boolean') return '\u8072\u97f3\u751f\u6210\u72c0\u614b\u683c\u5f0f\u7121\u6548\u3002';
  if (!consent.accepted) return '\u8acb\u9078\u64c7\u9304\u97f3\u6216 AI \u8072\u97f3\u751f\u6210\u3002';
  if (consent.allowSongGeneration !== true) return '\u8acb\u5148\u5141\u8a31\u672c\u6b21 AI \u6b4c\u66f2\u751f\u6210\u3002';
  if (!aiVoiceDirect && consent.confirmedOwnVoice !== true) {
    return '\u8acb\u5148\u5b8c\u6210\u9304\u97f3\uff0c\u6216\u76f4\u63a5\u9078\u64c7 AI \u8072\u97f3\u751f\u6210\u3002';
  }

  if (consent.version !== 'voice-song-consent-v1') return '\u8072\u97f3\u751f\u6210\u8cc7\u6599\u9700\u8981\u91cd\u65b0\u78ba\u8a8d\u3002';
  if (!consent.sample) return '\u8acb\u9078\u64c7\u9304\u97f3\u6216 AI \u8072\u97f3\u751f\u6210\u3002';

  const sample = consent.sample;
  const minDuration = aiVoiceDirect ? 0 : 1;
  if (!Number.isFinite(sample.durationSeconds) || sample.durationSeconds < minDuration || sample.durationSeconds > 60) {
    return aiVoiceDirect ? 'AI \u8072\u97f3\u8a2d\u5b9a\u683c\u5f0f\u7121\u6548\u3002' : '\u9304\u97f3\u79d2\u6578\u683c\u5f0f\u7121\u6548\uff0c\u5efa\u8b70\u9304 10 \u5230 20 \u79d2\u3002';
  }
  if (!Number.isFinite(sample.qualityScore) || sample.qualityScore < 0 || sample.qualityScore > 100) return '\u8072\u97f3\u6e05\u6670\u5ea6\u683c\u5f0f\u7121\u6548\u3002';
  if (!isStringArray(sample.inferredCharacteristics, 12, 48)) return '\u8072\u97f3\u8a2d\u5b9a\u683c\u5f0f\u7121\u6548\u3002';
  return null;
}

function isVoicePermissionFallback(sample?: VoiceSampleSummary) {
  return Boolean(sample?.mimeType === 'application/x-voice-permission-fallback' || sample?.inferredCharacteristics?.includes('permission_fallback'));
}

function applySongEnergyStyle<T extends { bpm: number; genre: string; mood: string[]; instrument: string[]; lyric_theme: string[] }>(
  parameters: T,
  style: SongEnergyStyle = 'dance-pop',
): T {
  const profile = {
    'dance-pop': {
      bpmMin: 112,
      bpmBoost: 8,
      genre: 'modern_dance_pop',
      mood: ['bright', 'catchy', 'streaming_friendly'],
      instrument: ['punchy_kick', 'synth_bass', 'vocal_chops', 'hook_lead'],
      lyric_theme: ['memorable_hook', 'short_form_chorus'],
    },
    'emotional-pop': {
      bpmMin: 86,
      bpmBoost: 0,
      genre: 'emotional_pop',
      mood: ['emotional', 'warm', 'cinematic'],
      instrument: ['piano', 'warm_synth', 'soft_drums', 'ambient_pad'],
      lyric_theme: ['inner_dialogue', 'healing_hook'],
    },
    'club-edm': {
      bpmMin: 124,
      bpmBoost: 14,
      genre: 'club_edm_pop',
      mood: ['high_energy', 'confident', 'festival_ready'],
      instrument: ['four_on_floor_kick', 'sidechain_bass', 'riser_fx', 'drop_synth'],
      lyric_theme: ['dance_drop', 'energy_release'],
    },
  }[style];

  return {
    ...parameters,
    bpm: Math.max(profile.bpmMin, Math.min(180, parameters.bpm + profile.bpmBoost)),
    genre: profile.genre,
    mood: Array.from(new Set([...profile.mood, ...parameters.mood])).slice(0, 8),
    instrument: Array.from(new Set([...profile.instrument, ...parameters.instrument])).slice(0, 8),
    lyric_theme: Array.from(new Set([...profile.lyric_theme, ...parameters.lyric_theme])).slice(0, 8),
  };
}

function normalizeVoiceConsent(payload?: VoiceConsentPayload) {
  const requestedSample = payload?.sample;
  const aiVoiceDirect = Boolean(payload?.accepted && payload.allowSongGeneration && isAiVoiceDirectSample(requestedSample));
  const ownVoiceAuthorized = Boolean(payload?.accepted && payload.confirmedOwnVoice && payload.allowSongGeneration);
  const authorized = ownVoiceAuthorized || aiVoiceDirect;
  const sample = authorized ? requestedSample : undefined;
  const inferredCharacteristics = sample?.inferredCharacteristics?.filter((item) => typeof item === 'string') ?? [];
  const permissionFallback = Boolean(ownVoiceAuthorized && sample && isVoicePermissionFallback(sample));
  const recorded = Boolean(ownVoiceAuthorized && sample && !permissionFallback && !aiVoiceDirect);
  const aiVoiceGender = inferredCharacteristics.includes('ai_voice_male') ? 'male' : inferredCharacteristics.includes('ai_voice_female') ? 'female' : null;

  return {
    authorized,
    recorded,
    inferredCharacteristics,
    cacheKey: recorded
      ? [
          'voice-v1',
          Math.round(sample!.durationSeconds),
          Math.round(sample!.qualityScore),
          Math.round(sample!.averageVolume * 1000),
          Math.round(sample!.brightness * 1000),
          inferredCharacteristics.join('|'),
        ].join(':')
      : aiVoiceDirect
        ? ['ai-voice-v1', aiVoiceGender ?? 'auto', inferredCharacteristics.join('|')].join(':')
        : authorized
          ? 'voice-consent-only'
          : 'voice-none',
    profile: {
      workflowStatus: recorded ? 'VOICE_SUMMARY_READY' : aiVoiceDirect ? 'AI_VOICE_READY' : permissionFallback ? 'VOICE_PERMISSION_FALLBACK_READY' : authorized ? 'VOICE_RECORDING_REQUIRED' : 'VOICE_CONSENT_REQUIRED',
      consentAccepted: authorized,
      recorded,
      localOnly: true,
      sample: sample
        ? {
            durationSeconds: sample.durationSeconds,
            qualityScore: sample.qualityScore,
            averageVolume: sample.averageVolume,
            dynamicRange: sample.dynamicRange,
            brightness: sample.brightness,
            tempoPulse: sample.tempoPulse,
            inferredCharacteristics,
            recordedAt: sample.recordedAt,
          }
        : null,
      selfDialogueConcept: recorded
        ? '\u5df2\u7528\u672c\u4eba\u6388\u6b0a\u9304\u97f3\u6458\u8981\u6821\u6e96\u6b4c\u66f2\u7684\u4eba\u8072\u7bc0\u594f\u3001\u60c5\u7dd2\u5f35\u529b\u8207\u81ea\u6211\u5c0d\u8a71\u5c64\u6b21\uff1b\u9019\u662f\u8072\u97f3\u6458\u8981\u904b\u7b97\uff0c\u4e0d\u662f\u8072\u97f3\u8907\u88fd\u6216\u8072\u7dda\u514b\u9686\u3002'
        : aiVoiceDirect
          ? '\u5df2\u6539\u7528 AI ' + (aiVoiceGender === 'male' ? '\u7537\u8072' : '\u5973\u8072') + '\u751f\u6210\uff0c\u4e0d\u9700\u8981\u9ea5\u514b\u98a8\uff0c\u4e5f\u4e0d\u6703\u8072\u7a31\u4f7f\u7528\u672c\u4eba\u9304\u97f3\u3002'
          : authorized
            ? '\u5df2\u53d6\u5f97\u6b4c\u66f2\u751f\u6210\u6388\u6b0a\uff0c\u4f46\u5c1a\u672a\u5b8c\u6210\u9304\u97f3\uff1b\u53ef\u6539\u7528 AI \u8072\u97f3\u7e7c\u7e8c\u751f\u6210\u3002'
            : '\u5c1a\u672a\u9078\u64c7\u8072\u97f3\u751f\u6210\u65b9\u5f0f\u3002',
    },
  };
}

function validate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return '\u8acb\u9001\u51fa\u6b63\u78ba\u7684\u8868\u55ae\u8cc7\u6599\u3002';

  const payload = body as Partial<MusicGenerateRequest>;

  if (!isValidBirthday(payload.birthDate)) return '\u751f\u65e5\u683c\u5f0f\u7121\u6548\u3002';

  if (!payload.bloodType || !VALID_BLOOD_TYPES.includes(payload.bloodType as (typeof VALID_BLOOD_TYPES)[number])) {
    return '\u8840\u578b\u5fc5\u9808\u662f A\u3001B\u3001AB \u6216 O\u3002';
  }

  if (typeof payload.name !== 'string' || payload.name.trim().length < 2) return '\u59d3\u540d\u81f3\u5c11\u9700\u8981 2 \u500b\u5b57\u3002';
  if (payload.name.trim().length > 20) return '\u59d3\u540d\u4e0d\u53ef\u8d85\u904e 20 \u500b\u5b57\u3002';

  if (!payload.gender || !VALID_GENDERS.includes(payload.gender as (typeof VALID_GENDERS)[number])) {
    return '\u8acb\u9078\u64c7\u6027\u5225\u3002';
  }

  if (
    payload.shichen !== undefined &&
    payload.shichen !== null &&
    payload.shichen !== 'unknown' &&
    !(typeof payload.shichen === 'number' && Number.isInteger(payload.shichen) && payload.shichen >= 0 && payload.shichen <= 11)
  ) {
    return '\u6642\u8fb0\u8cc7\u6599\u683c\u5f0f\u7121\u6548\u3002';
  }

  if (payload.voiceCharacteristics !== undefined && !isStringArray(payload.voiceCharacteristics, 10, 40)) {
    return '\u8072\u97f3\u7279\u5fb5\u8cc7\u6599\u683c\u5f0f\u7121\u6548\u3002';
  }

  const voiceConsentError = validateVoiceConsent(payload.voiceConsent);
  if (voiceConsentError) return voiceConsentError;

  if (
    payload.vocalGenderPreference !== undefined &&
    payload.vocalGenderPreference !== null &&
    payload.vocalGenderPreference !== 'male' &&
    payload.vocalGenderPreference !== 'female'
  ) {
    return '\u6f14\u5531\u8072\u7dda\u504f\u597d\u683c\u5f0f\u7121\u6548\u3002';
  }

  if (
    payload.preferredSongLanguage !== undefined &&
    !VALID_SONG_LANGUAGES.includes(payload.preferredSongLanguage as (typeof VALID_SONG_LANGUAGES)[number])
  ) {
    return '\u6b4c\u66f2\u8a9e\u8a00\u504f\u597d\u683c\u5f0f\u7121\u6548\u3002';
  }

  if (
    payload.songEnergyStyle !== undefined &&
    !VALID_SONG_ENERGY_STYLES.includes(payload.songEnergyStyle as SongEnergyStyle)
  ) {
    return '\u6b4c\u66f2\u98a8\u683c\u504f\u597d\u683c\u5f0f\u7121\u6548\u3002';
  }

  return null;
}

const ipCache = new Map<string, { count: number; resetTime: number }>();
const responseCache = new Map<string, { result: unknown; expireTime: number }>();

function cleanCaches() {
  const now = Date.now();
  if (ipCache.size > 200) {
    for (const [key, val] of ipCache.entries()) {
      if (now > val.resetTime) {
        ipCache.delete(key);
      }
    }
  }
  if (responseCache.size > 200) {
    for (const [key, val] of responseCache.entries()) {
      if (now > val.expireTime) {
        responseCache.delete(key);
      }
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
      return friendlyErrorResponse(requestId, 'RATE_LIMITED', '\u8acb\u7a0d\u5f8c\u518d\u8a66\uff0c\u7cfb\u7d71\u6b63\u5728\u8655\u7406\u5176\u4ed6\u8acb\u6c42\u3002', 429);
    }
    record.count += 1;
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  let body: MusicGenerateRequest;
  try {
    body = (await request.json()) as MusicGenerateRequest;
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '\u8acb\u9001\u51fa\u6b63\u78ba JSON\u3002', 400);
  }

  const errMsg = validate(body);
  if (errMsg) {
    return friendlyErrorResponse(requestId, 'INVALID_INPUT', errMsg, 400);
  }

  const voiceWorkflowForCache = normalizeVoiceConsent(body.voiceConsent);
  const mergedVoiceCharacteristicsForCache = Array.from(new Set([
    ...(body.voiceCharacteristics || []),
    ...voiceWorkflowForCache.inferredCharacteristics,
  ])).slice(0, 10);

  const cacheKey = hashedCacheKey([
    body.birthDate,
    body.bloodType,
    body.name.trim(),
    body.gender,
    body.shichen !== undefined && body.shichen !== null ? String(body.shichen) : 'null',
    mergedVoiceCharacteristicsForCache.join(','),
    body.vocalGenderPreference ?? 'auto',
    body.preferredSongLanguage ?? 'mandarin',
    body.songEnergyStyle ?? 'dance-pop',
    voiceWorkflowForCache.cacheKey,
  ]);

  const cached = responseCache.get(cacheKey);
  if (cached && now < cached.expireTime) {
    return NextResponse.json(cached.result, { status: 200 });
  }

  try {
    const {
      birthDate,
      bloodType,
      name,
      gender,
      shichen = null,
      voiceCharacteristics: manualVoiceCharacteristics = [],
      vocalGenderPreference = null,
      preferredSongLanguage = 'mandarin',
      songEnergyStyle = 'dance-pop',
      voiceConsent,
    } = body;
    const trimmedName = name.trim();
    const voiceWorkflow = normalizeVoiceConsent(voiceConsent);
    const finalVoiceCharacteristics = Array.from(new Set([
      ...manualVoiceCharacteristics,
      ...voiceWorkflow.inferredCharacteristics,
    ])).slice(0, 10);

  const zodiacZh = getZodiacSign(birthDate);
  const zodiacEn = getZodiacEnglishName(birthDate);
  const era = getBirthEra(birthDate);
  const destinyProfile = computeDestinyProfile(birthDate);
  const shichenBranchIndex = typeof shichen === 'number' ? shichen : null;
  const shichenProfile = computeShichenProfile({ birthDate, shichenBranchIndex });

  const matrixInput = {
    birthDate,
    zodiacSign: zodiacEn,
    gender: gender as 'male' | 'female' | 'non-binary',
    bloodType,
    voiceCharacteristics: finalVoiceCharacteristics,
    vocalGenderPreference,
    firstName: trimmedName,
  };

  const personalityMatrix = PersonalityMatrixEngine.generatePersonalityMatrix(
    matrixInput,
    destinyProfile.personalityAdjust,
    shichenProfile.personalityAdjust,
  );

  const ocean = computeOcean(personalityMatrix);
  const { primary: archetype, secondary: archetypeSecondary } = identifyArchetypes(personalityMatrix);
  const oceanBpmAdjust = getOceanBpmAdjust(ocean);

  const musicParameters = MusicParameterGenerator.generateMusicParameters(matrixInput, era);
  const finalMusicParameters = applySongEnergyStyle({
    ...musicParameters,
    bpm: Math.max(60, Math.min(180, musicParameters.bpm + oceanBpmAdjust)),
  }, songEnergyStyle);

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
  const englishTrack = selectEnglishSong(era, personalityMatrix);
  const mandarinTrack = selectMandarinSongs(era, personalityMatrix, 1)[0];
  const taiwaneseTrack = selectTaiwaneseSong(era, personalityMatrix);
  const eraDisplayName = getEraDisplayName(era);

  const selectedSongsForAi = {
    english: { title: englishTrack.title, artist: englishTrack.artist },
    mandarin: mandarinTrack
      ? { title: mandarinTrack.title, artist: mandarinTrack.artist }
      : { title: 'N/A', artist: 'N/A' },
    taiwanese: taiwaneseTrack
      ? { title: taiwaneseTrack.title, artist: taiwaneseTrack.artist }
      : undefined,
  };

  const musicAiInput = {
    name: trimmedName,
    birthDate,
    zodiac: zodiacZh,
    bloodType,
    gender,
    vocalGenderPreference,
    preferredSongLanguage,
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
    selectedSongs: selectedSongsForAi,
    voiceProfile: voiceWorkflow.profile,
  };
  const [musicReport, songDrafts] = await Promise.all([
    generateMusicReport(musicAiInput),
    generateSongDrafts(musicAiInput),
  ]);

  const fusionSong = await generateFusionSong({
    name: trimmedName,
    era,
    personalityMatrix: musicAiInput.personalityMatrix,
    englishSong: selectedSongsForAi.english,
    mandarinSong: selectedSongsForAi.mandarin,
    taiwaneseSong: selectedSongsForAi.taiwanese,
    songDrafts,
    genre: finalMusicParameters.genre,
    bpm: finalMusicParameters.bpm,
    mood: finalMusicParameters.mood,
    vocalGenderPreference,
    preferredSongLanguage,
  });

  const productionPlan = generateAiProductionPlan({
    ...musicAiInput,
    songDrafts,
    fusionSong,
  });

  const fiveElement = buildMusicFiveElementResult({
    analysisId: ['music', birthDate, bloodType, gender, shichen ?? 'unknown', songEnergyStyle].join(':'),
    personalityMatrix: Object.fromEntries(Object.entries(personalityMatrix)) as Record<string, number>,
    dominantWuxing: destinyProfile.dominantWuxing,
    shichenElement: shichenProfile.wuxing,
    bpm: finalMusicParameters.bpm,
    genre: finalMusicParameters.genre,
    mood: finalMusicParameters.mood,
    lyricThemes: finalMusicParameters.lyric_theme,
    vocalStyle: finalMusicParameters.vocal_style,
  });

    const resultPayload = {
      personality_matrix: personalityMatrix,
      music_parameters: finalMusicParameters,
      music_report: musicReport,
      song_drafts: songDrafts,
      fusion_song: fusionSong,
      production_plan: productionPlan,
      voice_profile: voiceWorkflow.profile,
      fiveElement,
      english_track: {
        title: englishTrack.title,
        artist: englishTrack.artist,
        videoId: englishTrack.videoId,
      },
      mandarin_track: mandarinTrack
        ? { title: mandarinTrack.title, artist: mandarinTrack.artist, videoId: mandarinTrack.videoId }
        : null,
      taiwanese_track: taiwaneseTrack
        ? { title: taiwaneseTrack.title, artist: taiwaneseTrack.artist, videoId: taiwaneseTrack.videoId }
        : null,
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
        shichen: {
          isKnown: shichenProfile.isKnown,
          label: shichenProfile.shichen.label,
          range: shichenProfile.shichen.range,
          branch: shichenProfile.shichen.branch,
          wuxing: shichenProfile.wuxing,
          dayPillar: shichenProfile.dayPillar,
          hourPillar: shichenProfile.hourPillar.ganzhi,
          friendlyNote: shichenProfile.friendlyNote,
        },
      },
    };

    responseCache.set(cacheKey, { result: resultPayload, expireTime: now + 300_000 });
    return NextResponse.json(resultPayload);
  } catch (error) {
    console.error('[music-generate] request failed', requestId, error instanceof Error ? error.message : String(error));
    return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', '\u76ee\u524d\u66ab\u6642\u7121\u6cd5\u5b8c\u6210\u6b4c\u66f2\u751f\u6210\u3002\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002\u9020\u6210\u60a8\u7684\u4e0d\u4fbf\uff0c\u656c\u8acb\u898b\u8ad2\u3002', 503);
  }
}
