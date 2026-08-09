import { NextResponse } from 'next/server';
import { generateMusicReport, generateFusionSong, generateSongDrafts, generateAiProductionPlan } from '@/lib/gemini';
import { PersonalityMatrixEngine } from '@/lib/personality-matrix-engine';
import { MusicParameterGenerator } from '@/lib/music-parameter-generator';
import { computeDestinyProfile } from '@/lib/destiny-engine';
import { computeOcean, identifyArchetypes, getOceanBpmAdjust } from '@/lib/psychology-engine';
import { selectMandarinSongs, getEraDisplayName } from '@/lib/mandarin-songs-db';
import { selectEnglishSong } from '@/lib/english-songs-db';
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
const VALID_LIFE_SONG_GOALS = ['dream', 'work', 'love', 'family', 'health', 'wealth', 'healing', 'relax'] as const;
const VALID_SONG_CREATIVE_STYLES = ['pop', 'piano', 'healing', 'ancient', 'rock', 'electronic', 'jazz', 'cinematic'] as const;
const AI_VOICE_DIRECT_MIME = 'application/x-ai-voice-direct';

// ?蹇???umber(0??1 ??啾???=?貔??unknown'/null=??貔?????????剝３???蹇?
type ShichenChoice = number | 'unknown' | null;
type VocalGenderPreference = 'male' | 'female' | null;
type PreferredSongLanguage = 'mandarin' | 'english' | 'taiwanese';
type SongEnergyStyle = (typeof VALID_SONG_ENERGY_STYLES)[number];
type LifeSongGoal = (typeof VALID_LIFE_SONG_GOALS)[number];
type SongCreativeStyle = (typeof VALID_SONG_CREATIVE_STYLES)[number];
type AnalysisTargetMode = 'self' | 'guest' | null;
type GrowthContextPayload = { completedModules?: string[]; elements?: Record<string, string> } | null;

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
  lifeGoal?: LifeSongGoal;
  lifeGoalNote?: string;
  songCreativeStyle?: SongCreativeStyle;
  analysisTarget?: AnalysisTargetMode;
  growthContext?: GrowthContextPayload;
  birthDate: string;

  bloodType: 'A' | 'B' | 'AB' | 'O';
  name: string;
  gender: 'male' | 'female';
  shichen?: ShichenChoice;
  voiceCharacteristics?: string[];
  vocalGenderPreference?: VocalGenderPreference;
  magneticVoice?: boolean;
  preferredSongLanguage?: PreferredSongLanguage;
  songEnergyStyle?: SongEnergyStyle;
  voiceConsent?: VoiceConsentPayload;
}

interface LifeSongContext {
  targetMode: 'self' | 'guest' | null;
  goal: string;
  goalNote: string;
  creativeStyle: string;
  growthSummary: string;
  worldView: string;
  theme: string;
  scene: string;
}

const LIFE_SONG_GOAL_LABELS: Record<LifeSongGoal, string> = {
  dream: '夢想',
  work: '工作',
  love: '愛情',
  family: '家庭',
  health: '健康',
  wealth: '財富',
  healing: '療癒',
  relax: '放鬆',
};

const SONG_CREATIVE_STYLE_LABELS: Record<SongCreativeStyle, string> = {
  pop: '流行',
  piano: '鋼琴',
  healing: '療癒',
  ancient: '古風',
  rock: '搖滾',
  electronic: '電子',
  jazz: '爵士',
  cinematic: '電影配樂',
};

function normalizeLifeSongContext(input: { lifeGoal?: LifeSongGoal; lifeGoalNote?: string; songCreativeStyle?: SongCreativeStyle; analysisTarget?: AnalysisTargetMode; growthContext?: GrowthContextPayload }): LifeSongContext {
  const goal = input.lifeGoal ? LIFE_SONG_GOAL_LABELS[input.lifeGoal] : '療癒';
  const creativeStyle = input.songCreativeStyle ? SONG_CREATIVE_STYLE_LABELS[input.songCreativeStyle] : '流行';
  const targetMode = input.analysisTarget === 'self' ? 'self' : input.analysisTarget === 'guest' ? 'guest' : null;
  const goalNote = typeof input.lifeGoalNote === 'string' ? input.lifeGoalNote.trim().slice(0, 120) : '';
  const completedModules = targetMode === 'self' && Array.isArray(input.growthContext?.completedModules) ? input.growthContext.completedModules.filter((item): item is string => typeof item === 'string').slice(0, 8) : [];
  const elements = targetMode === 'self' && input.growthContext?.elements && typeof input.growthContext.elements === 'object' ? Object.entries(input.growthContext.elements).filter(([, value]) => typeof value === 'string').map(([module, element]) => `${module}:${element}`).slice(0, 8) : [];
  const growthSummary = targetMode === 'self' ? `成長中心已完成 ${completedModules.length} 個模組；元素紀錄 ${elements.join('、') || '尚未累積'}。` : '親朋好友模式：只做本次歌曲分析，不讀取會員長期成長資料。';
  return {
    targetMode,
    goal,
    goalNote,
    creativeStyle,
    growthSummary,
    worldView: `以「${goal}」作為生命章節，把命理底色、五元素補強與${creativeStyle}聲景整合成一個專屬歌曲世界。`,
    theme: goalNote ? `${goal}：${goalNote}` : `${goal}補強與自我陪伴`,
    scene: `使用者站在目前人生階段的轉折點，AI 以${creativeStyle}方式陪他把方向唱清楚。`,
  };
}

function isStringArray(value: unknown, maxLength = 10, maxItemLength = 48): value is string[] {
  return Array.isArray(value) && value.length <= maxLength && value.every((item) => typeof item === 'string' && item.length <= maxItemLength);
}

function isAiVoiceDirectSample(sample?: VoiceSampleSummary) {
  return Boolean(sample?.mimeType === AI_VOICE_DIRECT_MIME || sample?.inferredCharacteristics?.includes('ai_voice_direct'));
}

function validateVoiceConsent(payload: unknown): string | null {
  if (payload === undefined || payload === null) return null;
  if (typeof payload !== 'object') return 'AI 聲音生成資料格式無效。';
  const consent = payload as Partial<VoiceConsentPayload>;
  if (!consent.sample) return null;

  const sample = consent.sample;
  const aiVoiceDirect = isAiVoiceDirectSample(sample);
  if (!aiVoiceDirect && consent.confirmedOwnVoice === true) {
    return '本版本已取消使用者錄音，請改用 AI 自動聲音生成。';
  }
  if (!Number.isFinite(sample.durationSeconds) || sample.durationSeconds < 0 || sample.durationSeconds > 60) {
    return 'AI 聲音設定格式無效。';
  }
  if (!Number.isFinite(sample.qualityScore) || sample.qualityScore < 0 || sample.qualityScore > 100) return 'AI 聲音清晰度格式無效。';
  if (!isStringArray(sample.inferredCharacteristics, 12, 48)) return 'AI 聲音設定格式無效。';

  return null;
}

function buildDefaultAiVoiceConsent(): VoiceConsentPayload {
  const recordedAt = new Date().toISOString();
  return {
    accepted: true,
    version: 'voice-song-consent-v1',
    confirmedOwnVoice: false,
    allowSongGeneration: true,
    recordedAt,
    sample: {
      durationSeconds: 0,
      averageVolume: 0.06,
      dynamicRange: 0.08,
      brightness: 0.5,
      tempoPulse: 0.56,
      qualityScore: 100,
      inferredCharacteristics: ['ai_voice_direct', 'ai_voice_auto', 'life_song_vocal'],
      recordedAt,
      mimeType: AI_VOICE_DIRECT_MIME,
      localOnly: true,
    },
  };
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
  const effectivePayload = payload?.accepted && payload.allowSongGeneration && isAiVoiceDirectSample(payload.sample)
    ? payload
    : buildDefaultAiVoiceConsent();
  const sample = effectivePayload.sample!;
  const inferredCharacteristics = Array.from(new Set([
    ...(sample.inferredCharacteristics?.filter((item) => typeof item === 'string') ?? []),
    'ai_voice_direct',
    'ai_voice_auto',
  ])).slice(0, 12);
  const aiVoiceGender = inferredCharacteristics.includes('ai_voice_male') ? 'male' : inferredCharacteristics.includes('ai_voice_female') ? 'female' : null;

  return {
    authorized: true,
    recorded: false,
    inferredCharacteristics,
    cacheKey: ['ai-voice-v2', aiVoiceGender ?? 'auto', inferredCharacteristics.join('|')].join(':'),
    profile: {
      workflowStatus: 'AI_VOICE_READY',
      consentAccepted: true,
      recorded: false,
      localOnly: true,
      sample: {
        durationSeconds: sample.durationSeconds,
        qualityScore: sample.qualityScore,
        averageVolume: sample.averageVolume,
        dynamicRange: sample.dynamicRange,
        brightness: sample.brightness,
        tempoPulse: sample.tempoPulse,
        inferredCharacteristics,
        recordedAt: sample.recordedAt,
      },
      selfDialogueConcept: 'AI 已自動建立演唱聲線，不需要使用者錄音、不需要麥克風權限；歌曲會依命理資料、五元素與本次目標自動生成歌詞、曲風、節奏與 AI 演唱。',
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


  if (payload.lifeGoal !== undefined && !VALID_LIFE_SONG_GOALS.includes(payload.lifeGoal as LifeSongGoal)) {
    return '生命歌曲目標格式無效。';
  }

  if (payload.lifeGoalNote !== undefined && (typeof payload.lifeGoalNote !== 'string' || payload.lifeGoalNote.length > 120)) {
    return '生命歌曲補充內容不可超過 120 字。';
  }

  if (payload.songCreativeStyle !== undefined && !VALID_SONG_CREATIVE_STYLES.includes(payload.songCreativeStyle as SongCreativeStyle)) {
    return '生命歌曲風格格式無效。';
  }

  if (payload.analysisTarget !== undefined && payload.analysisTarget !== null && payload.analysisTarget !== 'self' && payload.analysisTarget !== 'guest') {
    return '分析對象格式無效。';
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

function countCjk(input: string) {
  return (input.match(/[\u4e00-\u9fff]/g) ?? []).length;
}

function repairMojibakeText(input: string) {
  if (!/[ÃÂâéèäåæçï¼ã]/.test(input)) return input;
  try {
    const bytes = Uint8Array.from(Array.from(input, (char) => char.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return countCjk(repaired) > countCjk(input) ? repaired : input;
  } catch {
    return input;
  }
}

function repairMojibakeDeep<T>(value: T): T {
  if (typeof value === 'string') return repairMojibakeText(value) as T;
  if (Array.isArray(value)) return value.map((item) => repairMojibakeDeep(item)) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, repairMojibakeDeep(entry)]),
  ) as T;
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
    body.lifeGoal ?? 'healing',
    body.lifeGoalNote ?? '',
    body.songCreativeStyle ?? 'pop',
    body.analysisTarget ?? 'guest',
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
      magneticVoice = false,
      preferredSongLanguage = 'mandarin',
      songEnergyStyle = 'dance-pop',
      lifeGoal = 'healing',
      lifeGoalNote = '',
      songCreativeStyle = 'pop',
      analysisTarget = null,
      growthContext = null,
      voiceConsent,
    } = body;
    const trimmedName = name.trim();
    const voiceWorkflow = normalizeVoiceConsent(voiceConsent);
    const lifeSongContext = normalizeLifeSongContext({
      lifeGoal,
      lifeGoalNote,
      songCreativeStyle,
      analysisTarget,
      growthContext,
    });

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
  finalMusicParameters.mood = Array.from(new Set([
    ...finalMusicParameters.mood,
    lifeSongContext.goal,
    lifeSongContext.creativeStyle,
  ])).slice(0, 8);

  finalMusicParameters.lyric_theme = Array.from(new Set([
    ...finalMusicParameters.lyric_theme,
    lifeSongContext.goal,
    lifeSongContext.theme,
  ])).slice(0, 8);
  const englishTrack = selectEnglishSong(era, personalityMatrix);
  // 地層＝國語主歌，人層＝國語故事歌（取第二首國語歌，避免與主歌重複）；台語已移除
  const mandarinTracks = selectMandarinSongs(era, personalityMatrix, 2);
  const mandarinTrack = mandarinTracks[0];
  const humanTrack = mandarinTracks[1] ?? mandarinTracks[0];
  const eraDisplayName = getEraDisplayName(era);

  const selectedSongsForAi = {
    english: { title: englishTrack.title, artist: englishTrack.artist },
    mandarin: mandarinTrack
      ? { title: mandarinTrack.title, artist: mandarinTrack.artist }
      : { title: 'N/A', artist: 'N/A' },
    // 人層情感落點歌：改用國語歌（原為台語）
    taiwanese: humanTrack
      ? { title: humanTrack.title, artist: humanTrack.artist }
      : undefined,
  };

  const musicAiInput = {
    name: trimmedName,
    birthDate,
    zodiac: zodiacZh,
    bloodType,
    gender,
    vocalGenderPreference,
    magneticVoice,
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
    lifeSongContext,
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
    magneticVoice,
    preferredSongLanguage,
  });

  const productionPlan = generateAiProductionPlan({
    ...musicAiInput,
    songDrafts,
    fusionSong,
  });

  const fiveElement = buildMusicFiveElementResult({
    analysisId: ['music', birthDate, bloodType, gender, shichen ?? 'unknown', songEnergyStyle, lifeGoal, songCreativeStyle].join(':'),
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
      life_song_context: lifeSongContext,
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
      taiwanese_track: humanTrack
        ? { title: humanTrack.title, artist: humanTrack.artist, videoId: humanTrack.videoId }
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

    const repairedResultPayload = repairMojibakeDeep(resultPayload);
    responseCache.set(cacheKey, { result: repairedResultPayload, expireTime: now + 300_000 });
    return NextResponse.json(repairedResultPayload);
  } catch (error) {
    console.error('[music-generate] request failed', requestId, error instanceof Error ? error.message : String(error));
    return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', '\u76ee\u524d\u66ab\u6642\u7121\u6cd5\u5b8c\u6210\u6b4c\u66f2\u751f\u6210\u3002\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002\u9020\u6210\u60a8\u7684\u4e0d\u4fbf\uff0c\u656c\u8acb\u898b\u8ad2\u3002', 503);
  }
}
