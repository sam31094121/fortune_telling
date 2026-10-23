// 2026-10-23 ai-to-asura：本檔不再呼叫任何 AI；人格分析與預分析只回本地決定性分數，ai_* 文字欄位留空（前端以本地文字呈現）。
import { getBirthPersonalityScores } from './birth-model-db';
import { getBloodTypePersonalityScores } from './blood-model-db';
import { generateGenderAdjustments } from './gender-corrector';
import { computeMusicProfile } from './music-engine';
import { getNamePersonalityScores } from './name-model-db';
import { enrichAnalysis, enrichPreview } from './personality-engine';

import { buildMagneticVoiceDirectiveZh, buildMagneticVoiceDirectiveEn, type MagneticVoiceType } from './magnetic-voice';
import { aggregatePersonalityScore, fusePersonalityV5, fusePreviewPersonalityV5, subtractScores } from './weight-engine';
import { DIMENSION_KEYS, type AnalysisResult, type DimensionAdjustments, type DimensionScores, type PersonInput, type PreviewAnalysisResult } from './types';

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mapAdjustments(scores: DimensionScores, base: DimensionScores): DimensionAdjustments {
  return subtractScores(scores, base);
}

export async function analyzeDestiny(person: PersonInput): Promise<AnalysisResult> {
  const birthScores = getBirthPersonalityScores(person.birthday);
  const bloodScores = getBloodTypePersonalityScores(person.bloodType);
  const nameScores = getNamePersonalityScores(person.name);
  const genderAdjustments = generateGenderAdjustments(person.gender);
  const { rawPersonality, finalScores } = fusePersonalityV5(
    birthScores,
    bloodScores,
    nameScores,
    genderAdjustments,
  );

  const bloodAdjustments = mapAdjustments(bloodScores, birthScores);
  const nameAdjustments = mapAdjustments(nameScores, bloodScores);

  let aiData: {
    ai_skeleton_summary: string;
    ai_behavior_summary: string;
    ai_individuality_summary: string;
    ai_final_summary: string;
    ai_wisdom_perspective: string;
  };

  aiData = {
    ai_skeleton_summary: '',
    ai_behavior_summary: '',
    ai_individuality_summary: '',
    ai_final_summary: '',
    ai_wisdom_perspective: '',
  };

  return enrichAnalysis({
    resonance_score: aggregatePersonalityScore(finalScores),
    final_scores: Object.fromEntries(DIMENSION_KEYS.map((key) => [key, clampScore(finalScores[key])])) as DimensionScores,
    base_scores: birthScores,
    blood_adjustments: bloodAdjustments,
    name_adjustments: nameAdjustments,
    birth_scores: birthScores,
    blood_scores: bloodScores,
    name_scores: nameScores,
    raw_personality: rawPersonality,
    gender_adjustments: genderAdjustments,
    ai_skeleton_summary: aiData.ai_skeleton_summary,
    ai_behavior_summary: aiData.ai_behavior_summary,
    ai_individuality_summary: aiData.ai_individuality_summary,
    ai_final_summary: aiData.ai_final_summary,
    ai_wisdom_perspective: aiData.ai_wisdom_perspective,
    skeleton_summary: '',
    behavior_summary: '',
    individuality_summary: '',
    final_summary: '',
    wealth_motivation_summary: '',
    love_pattern_summary: '',
    blind_spot_summary: '',
    life_advantage_summary: '',
    wisdom_perspective: '',
    music_profile: computeMusicProfile(finalScores),
  });
}

type PreferredSongLanguage = 'mandarin' | 'english' | 'taiwanese';

const SONG_LANGUAGE_GUIDANCE: Record<PreferredSongLanguage, { label: string; prompt: string; distribution: string }> = {
  mandarin: {
    label: '國語生成',
    prompt: '本次請以國語為主要可唱語言與副歌核心。英文只作短 Hook、音色記憶點或少量點綴；人層以國語故事核心句作情感落點。國語是本系統主打強項，請讓歌曲最終聽感以國語流行歌為主。',
    distribution: '國語主唱 85% · 英文 Hook 15%',
  },
  english: {
    label: '英文生成',
    prompt: '本次請以英文為主要可唱語言與 Hook 核心。國語作情緒輔助、關鍵句與人層故事落點。請保留天地人人格融合，但最終聽感以英文流行歌為主。',
    distribution: '英文主唱 70% · 國語情緒與故事落點 30%',
  },
  taiwanese: {
    label: '國語生成',
    prompt: '本次請以國語為主要可唱語言與故事核心。人層以國語故事核心句作情感落點；英文只作短 Hook 或音色點綴。請保留天地人人格融合，但最終聽感以國語故事歌為主。',
    distribution: '國語主唱 85% · 英文 Hook 15%',
  },
};

function getSongLanguageGuidance(language?: PreferredSongLanguage) {
  return SONG_LANGUAGE_GUIDANCE[language ?? 'mandarin'];
}

export interface MusicReportInput {
  name: string;
  birthDate: string;
  zodiac: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
  vocalGenderPreference?: 'male' | 'female' | null;
  magneticVoice?: boolean;
  magneticVoiceType?: MagneticVoiceType;
  preferredSongLanguage?: PreferredSongLanguage;
  era: string;
  personalityMatrix: Record<string, number>;
  musicParameters: {
    bpm: number;
    key: string;
    genre: string;
    mood: string[];
    vocal_style: string;
    instrument: string[];
    lyric_theme: string[];
  };
  destinyContext?: {
    heavenlyStem: string;
    wuxing: string;
    wuxingDescription: string;
    chineseZodiac: string;
    zodiacTrait: string;
    zodiacMusicTrait: string;
  };
  psychologyContext?: {
    archetypePrimary: string;
    archetypeDescription: string;
    archetypeMusicPersona: string;
    archetypeShadow: string;
    archetypeCoreWound?: string;
    archetypeCoreGift?: string;
    archetypeLifeLesson?: string;
    archetypeSecondary: string;
    oceanHighlight: string;
  };
  // 已由大數據選歌引擎挑出的主題曲（英文 / 國語 / 國語），請 易經說明為何對應此人
  selectedSongs?: {
    english: { title: string; artist: string };
    mandarin: { title: string; artist: string };
    taiwanese?: { title: string; artist: string };
  };
  lifeSongContext?: {
    targetMode: 'self' | 'guest' | null;
    goal: string;
    goalNote: string;
    creativeStyle: string;
    growthSummary: string;
    worldView: string;
    theme: string;
    scene: string;
  };
  voiceProfile?: {
    workflowStatus: string;
    consentAccepted: boolean;
    recorded: boolean;
    localOnly: boolean;
    selfDialogueConcept: string;
    sample: null | {
      durationSeconds: number;
      qualityScore: number;
      averageVolume: number;
      dynamicRange: number;
      brightness: number;
      tempoPulse: number;
      inferredCharacteristics: string[];
      recordedAt: string;
    };
  };
}

export interface MusicReportOutput {
  music_narrative: string;
  song_title_suggestion: string;
  lyric_opening: string;
  music_message: string;
  wisdom_note: string;
  english_song_reason: string;
  mandarin_song_reason: string;
  taiwanese_song_reason: string;
  famous_singers_mandarin: string;
  famous_singers_english: string;
  famous_singers_taiwanese: string;
}

const LOCAL_FAMOUS_SINGERS: Record<string, { mandarin: string; english: string; taiwanese: string }> = {
  '1960s': { mandarin: '鄧麗君 / 謝雷', english: 'The Beatles / Elvis Presley', taiwanese: '鳳飛飛 / 文夏' },
  '1970s': { mandarin: '鄧麗君 / 鳳飛飛', english: 'ABBA / John Lennon', taiwanese: '洪一峰 / 江蕙' },
  '1980s': { mandarin: '童安格 / 蘇芮', english: 'Michael Jackson / George Michael', taiwanese: '洪榮宏 / 江蕙' },
  '1990s': { mandarin: '張學友 / 王菲', english: 'Celine Dion / Backstreet Boys', taiwanese: '江蕙 / 葉啟田' },
  '2000s': { mandarin: '周杰倫 / 張惠妹', english: 'Coldplay / Lady Gaga', taiwanese: '江蕙 / 金門王' },
  '2010s': { mandarin: '周杰倫 / 鄧紫棋', english: 'Ed Sheeran / Adele', taiwanese: '茄子蛋 / 滅火器' },
  '2020s': { mandarin: '告五人 / 毛不易', english: 'The Weeknd / Billie Eilish', taiwanese: '茄子蛋 / 鄭宜農' },
};

function createLocalMusicReport(input: MusicReportInput): MusicReportOutput {
  const en = input.selectedSongs?.english;
  const zh = input.selectedSongs?.mandarin;
  const tw = input.selectedSongs?.taiwanese;
  const eraData = LOCAL_FAMOUS_SINGERS[input.era] ?? LOCAL_FAMOUS_SINGERS['2000s'];
  
  return {
    music_narrative: `${input.name}的人格音樂矩陣已完成融合，天地人三層能量交織出屬於你的聲音頻率。`,
    song_title_suggestion: '命運共鳴',
    lyric_opening: '天地之間有一道光，是你走過的每一個選擇。',
    music_message: '這首歌是你內心深處最真實的聲音，聆聽它，你會找到屬於自己的方向。',
    wisdom_note: '心存善念，多行善事，才是真正改變命運的開始。',
    english_song_reason: en
      ? `《${en.title}》的情緒頻率，與你的人格底色相互呼應。`
      : '',
    mandarin_song_reason: zh
      ? `《${zh.title}》的旋律記憶，貼合你成長年代的情感共鳴。`
      : '',
    taiwanese_song_reason: tw
      ? `《${tw.title}》的土地情感，呼應你性格中最真摯草根的那一面。`
      : '',
    famous_singers_mandarin: eraData.mandarin,
    famous_singers_english: eraData.english,
    famous_singers_taiwanese: eraData.mandarin,
  };
}

export async function generateMusicReport(input: MusicReportInput): Promise<MusicReportOutput> {
  return createLocalMusicReport(input);
}

// ────────────────────────────────────────────────────────────
// 天地人歌曲矩陣（第一階段：天 / 地 / 人素材層）
// ────────────────────────────────────────────────────────────

export interface OriginalSongDraft {
  language_label: string;
  title: string;
  concept: string;
  lyrics: string[];
  style: string;
  vocal_direction: string;
}

export interface OriginalSongDraftsOutput {
  english: OriginalSongDraft;
  mandarin: OriginalSongDraft;
  taiwanese: OriginalSongDraft;
}

function createLocalSongDrafts(input: MusicReportInput): OriginalSongDraftsOutput {
  const mood = input.musicParameters.mood.slice(0, 3).join('、') || '溫暖、堅定、真摯';
  const themes = input.musicParameters.lyric_theme.slice(0, 3).join('、') || '命運、心光、重新出發';
  const baseStyle = `${input.musicParameters.genre}，${input.musicParameters.bpm} BPM，${input.musicParameters.instrument.slice(0, 3).join('、') || '鋼琴、弦樂、低頻鼓組'}，情緒偏${mood}`;

  return {
    english: {
      language_label: '天層 English 音樂藍圖',
      title: 'Heaven Motif',
      concept: `天層由生日決定英文音樂格局、年代感、主旋律方向與空間感，不寫完整歌詞。`,
      lyrics: [
        '[天層動機]',
        'Airy opening motif',
        'Wide sky synth pad',
        'Short English hook syllable: Light',
        'Rising melody contour',
        'Distant echo texture',
        'No full lyric writing',
      ],
      style: baseStyle,
      vocal_direction: '只提供英文音樂感與空氣 Hook，不擔任完整主唱。',
    },
    mandarin: {
      language_label: '地層國語唱腔',
      title: '地層情緒線',
      concept: `地層由${input.bloodType}型決定國語流行唱腔、節奏身體、鼓點、和聲與副歌情緒。`,
      lyrics: [
        '[地層唱腔]',
        '主歌保留呼吸，句尾微微上揚',
        '副歌旋律打開，情緒推高但不推翻天層曲風',
        '鼓點穩定向前，讓身體跟著節奏走',
        '和聲加寬，主唱仍保持清楚',
        `情緒主題圍繞${themes}`,
      ],
      style: baseStyle,
      vocal_direction: '國語主唱承接歌曲身體與副歌情緒，但不可改變天層曲風。',
    },
    taiwanese: {
      language_label: '人層國語故事',
      title: '心內彼句話',
      concept: `人層由${input.name}與性別氣質決定國語歌詞語感、個人故事、記憶點與情感落點。`,
      lyrics: [
        '[人層核心句]',
        '風若吹過阮的名 心內有光袂孤單',
        '一步一步行過暗暝 才知影天會光',
        '這句話只負責故事，不改編曲',
        '有血有夢 有勇氣作伴',
        '命運的路 慢慢行嘛會到岸',
      ],
      style: baseStyle,
      vocal_direction: '國語只負責人格故事與情感落點，不亂改旋律與編曲。',
    },
  };
}

export async function generateSongDrafts(input: MusicReportInput): Promise<OriginalSongDraftsOutput> {
  return createLocalSongDrafts(input);
}

// ────────────────────────────────────────────────────────────
// 易經製作總監（輕量自動優化層：把天地人素材層整理成一首歌）
// ────────────────────────────────────────────────────────────

export interface AiProductionPlanInput extends MusicReportInput {
  songDrafts: OriginalSongDraftsOutput;
  fusionSong: FusionSongOutput;
}

export interface AiProductionPlanOutput {
  producer_summary: string;
  fusion_strategy: string;
  final_song_brief: string;
  arrangement_plan: string[];
  vocal_cast: string[];
  lead_vocal_choice: string;
  language_distribution: string;
  hook_design: string;
  popular_music_dna: string[];
  global_trend_blend: string[];
  trend_arrangement_recipe: string;
  rhythm_strategy: string;
  trend_safety_note: string;
  hit_formula: string;
  hook_repeat_strategy: string;
  emotional_arc: string;
  generation_prompt: string;
  next_step_note: string;
}

function pickTopMatrixKeys(matrix: Record<string, number>) {
  return Object.entries(matrix)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => key);
}

function describeVocalBlend(input: AiProductionPlanInput) {
  const emotion = input.personalityMatrix.emotion ?? 50;
  const creativity = input.personalityMatrix.creativity ?? 50;
  const attachment = input.personalityMatrix.attachment ?? 50;

  const vocalPreference = input.vocalGenderPreference === 'male'
    ? '男聲主唱'
    : input.vocalGenderPreference === 'female'
      ? '女聲主唱'
      : '主唱性別由系統依人格與曲風自動配置';
  if (input.magneticVoice) {
    return `${buildMagneticVoiceDirectiveZh(input.magneticVoiceType, input.vocalGenderPreference)} 全程以此聲線為主唱核心，副歌再加寬和聲把情緒推到最高點。`;
  }
  const blend = emotion >= 75 || attachment >= 75
    ? '深情主唱作為主聲線，副歌增加和聲堆疊，讓情緒往上推。'
    : creativity >= 75
      ? '帶空氣感與穿透力的創作型主唱，橋段加入低聲呢喃與電子和聲。'
      : '溫暖穩定的主唱，地層國語承接歌曲身體，天層英文提供空間 Hook，人層國語完成情感落點。';
  return `${vocalPreference}；${blend}`;
}

export function generateAiProductionPlan(input: AiProductionPlanInput): AiProductionPlanOutput {
  const topKeys = pickTopMatrixKeys(input.personalityMatrix);
  const mood = input.musicParameters.mood.slice(0, 4).join('、') || '溫暖、真摯、有畫面';
  const instruments = input.musicParameters.instrument.slice(0, 5).join('、') || '鋼琴、鼓、合成器、弦樂、吉他';
  const themes = input.musicParameters.lyric_theme.slice(0, 4).join('、') || '自我覺醒、命運、希望、連結';
  const lifeSong = input.lifeSongContext;
  const leadVocal = describeVocalBlend(input);
  const languageGuidance = getSongLanguageGuidance(input.preferredSongLanguage);
  const heavenLayerTitle = input.songDrafts.english.title;
  const earthLayerTitle = input.songDrafts.mandarin.title;
  const humanLayerTitle = input.songDrafts.taiwanese.title;
  const popularMusicDna = [
    '8 秒內先出現一個可記住的旋律、音色或短句 Hook，讓聽眾一開始就抓到歌曲身份。',
    '主歌保留空間與故事感，副歌再把鼓組、和聲與旋律高度一起拉開，形成明顯爆發。',
    '核心 Hook 重複 2 到 3 次，但每次換一點語言、和聲或樂器，熟悉但不單調。',
    '歌詞短句優先，避免把太多文字塞進旋律，讓人可以跟著哼、跟著記。',
    '橋段降低編曲密度，讓人層國語核心句或低聲線把情緒落地，再回到最後副歌。',
    '結尾保留一句最核心的人格句子，像標誌一樣留在聽眾腦中。',
  ];
  const globalTrendBlend = [
    'Global Pop：使用乾淨直接的主旋律、短句 Hook、清楚副歌，讓歌曲第一聽就能抓住重點。',
    'K-Pop / Cross-genre：段落轉換要有驚喜，副歌前可用短暫停頓、上升音效或和聲堆疊製造期待。',
    'Latin / Reggaeton / Trap Latino：鼓組加入穩定擺動感與切分節奏，讓地層節奏身體更有律動。',
    'Electronic / Synth Pop：用合成器、空氣墊、低頻脈衝與簡單音色標誌，讓歌曲有現代串流質感。',
    'R&B / Emotional Pop：主歌保留人聲呼吸與親密感，副歌再加寬和聲，避免整首都太滿。',
    'Short-form friendly：保留一段 12-18 秒可剪成短影音的核心副歌片段，但不能犧牲完整歌曲情緒。',
  ];

  return {
    producer_summary:
      `易經製作總監先讀取「${lifeSong?.goal ?? '療癒'}」這個當前生命目標，再把《${heavenLayerTitle}》《${earthLayerTitle}》《${humanLayerTitle}》視為天地人三個素材層，不視為三首歌，最後只整理成《${input.fusionSong.fusion_title}》這一首 易經專屬生命歌曲。`,
    fusion_strategy:
      `天層負責英文音樂格局、主旋律方向與空間感；地層負責國語唱腔、節奏身體與副歌情緒；人層負責國語故事核心句與情感落點。融合時不三首硬拼，而是以「${lifeSong?.theme ?? themes}」作為共同主軸。`,
    final_song_brief:
      `${input.musicParameters.genre} · ${input.musicParameters.bpm} BPM · ${input.musicParameters.key}，情緒走向為${mood}，創作風格鎖定${lifeSong?.creativeStyle ?? '流行'}，人格高點集中在 ${topKeys.join(' / ')}。`,
    arrangement_plan: [
      `天層前奏：${instruments.split('、')[0] ?? '鋼琴'}先建立英文音樂格局、年代感與空間感，決定歌曲靈魂。`,
      '地層主歌：國語唱腔進場，節奏、鼓點、和聲與編曲厚度承接天層曲風，不推翻原本方向。',
      '地層副歌：把旋律與鼓組推高，建立最容易記住的流行 Hook 與副歌情緒。',
      '人層橋段：只加入國語姓名故事與核心句，讓情感落地，但不改變編曲骨架。',
      '融合收尾：由歌曲融合引擎統一收束成一首歌，保留一句人格記憶點。',
    ],
    vocal_cast: [
      `天層聲音：${input.songDrafts.english.vocal_direction}`,
      `地層主唱：${input.songDrafts.mandarin.vocal_direction}`,
      `人層故事聲：${input.songDrafts.taiwanese.vocal_direction}`,
    ],
    lead_vocal_choice: leadVocal,
    language_distribution: `${languageGuidance.distribution}。天地人人格權重仍保留，但最終歌曲以「${languageGuidance.label}」為主要聽感。`,
    hook_design:
      `副歌核心 Hook 以《${input.fusionSong.fusion_title}》為主題：天層給音樂記憶點，地層給國語副歌情緒，人層給一句國語人格落點。`,
    popular_music_dna: popularMusicDna,
    global_trend_blend: globalTrendBlend,
    trend_arrangement_recipe:
      '以天層英文音樂格局建立 Global Pop 骨架，地層國語唱腔與節奏補上歌曲身體，人層國語故事只負責情感落點；三者進同一個歌曲矩陣，不各自生成三套結果。',
    rhythm_strategy:
      '主歌用半拍空間與輕鼓保持親密，副歌加入切分低頻、四拍推進與明亮 hi-hat；橋段降低鼓組，只保留心跳感，最後副歌再全開。',
    trend_safety_note:
      '只使用全球流行音樂的通用結構與聽感邏輯，不模仿特定歌手、特定歌曲、特定旋律或受版權保護的編曲細節。',
    hit_formula:
      '天層英文音樂前奏 8 拍 → 地層國語主歌 16 拍 → 地層副歌情緒拉升 → 人層國語核心句落點 → 融合引擎統一輸出最終副歌與一句記憶收尾。',
    hook_repeat_strategy:
      '核心 Hook 出現三次：第一次由天層建立旋律記憶，第二次由地層推高副歌情緒，第三次由人層核心句完成情感落點。',
    emotional_arc:
      '0-35% 天層建立音樂靈魂，35-70% 地層建立歌曲身體，70-100% 人層放入故事落點後由融合引擎收束成一首歌。',
    generation_prompt:
      `${lifeSong ? `Life song mission: ${lifeSong.theme}. Worldview: ${lifeSong.worldView}. Scene: ${lifeSong.scene}. Growth center: ${lifeSong.growthSummary}. ` : ''}Create one original Tiandiren life song, not three separate songs. Primary song language: ${languageGuidance.label}. ${languageGuidance.prompt} Suggested language balance: ${languageGuidance.distribution}. ${input.musicParameters.genre}, ${input.musicParameters.bpm} BPM, ${input.musicParameters.key}. Mood: ${mood}. Instruments: ${instruments}. Vocal: ${leadVocal}.${input.magneticVoice ? ` ${buildMagneticVoiceDirectiveEn(input.magneticVoiceType, input.vocalGenderPreference)}` : ''} Heaven layer 35% from birth date controls English music identity, main melody direction, era feeling, BPM, emotional color, and space; Heaven must not write full lyrics. Earth layer 35% from blood type controls Mandarin vocal phrasing, rhythm, drums, harmony, arrangement density, and chorus emotion; Earth must not override Heaven's style. Human layer 30% from name, gender, and name energy controls Mandarin story lyric feeling, personal story, name temperament, core lyric phrase, memory point, and emotional landing; Human must not change arrangement. All layers must enter one song matrix and be rendered by one fusion engine. Main theme: ${themes}. Apply global streaming-friendly arrangement logic without copying any existing song, artist, melody, lyrics, or protected arrangement.`,
    next_step_note:
      '下一步才接音樂/人聲生成服務；目前這一層先把製作、編曲、主唱分配與生成提示整理好，避免一次做太重造成當機。',
  };
}

// ────────────────────────────────────────────────────────────
// 易經歌曲融合引擎（第一階段：文字版 — 歌名 + 天地人融合歌詞 + 融合曲風）
// ────────────────────────────────────────────────────────────

export interface FusionSongInput {
  name: string;
  era: string;
  personalityMatrix: Record<string, number>;
  englishSong: { title: string; artist: string };
  mandarinSong: { title: string; artist: string };
  taiwaneseSong?: { title: string; artist: string };
  songDrafts?: OriginalSongDraftsOutput;
  genre?: string;
  bpm?: number;
  mood?: string[];
  vocalGenderPreference?: 'male' | 'female' | null;
  magneticVoice?: boolean;
  magneticVoiceType?: MagneticVoiceType;
  preferredSongLanguage?: PreferredSongLanguage;
}

export interface FusionSongOutput {
  fusion_title: string;
  fusion_concept: string;
  fusion_lyrics: string[];
  fusion_style: string;
}

function createLocalFusionSong(input: FusionSongInput): FusionSongOutput {
  const heavenLayerTitle = input.songDrafts?.english.title ?? input.englishSong.title;
  const earthLayerTitle = input.songDrafts?.mandarin.title ?? input.mandarinSong.title;
  const humanLayerTitle = input.songDrafts?.taiwanese.title ?? input.taiwaneseSong?.title ?? '';

  return {
    fusion_title: '天地人共鳴曲',
    fusion_concept: `以《${heavenLayerTitle}》作音樂格局、《${earthLayerTitle}》作情緒身體${humanLayerTitle ? `、《${humanLayerTitle}》作故事靈魂` : ''}，融合成一首屬於${input.name}的天地人人格歌曲。`,
    fusion_lyrics: [
      '[主歌]',
      '天地之間 我聽見自己的聲音',
      'Light in my heart',
      '[副歌]',
      '咱的人生 家己行 嘛要勇敢行',
      '唱出命運的光',
    ],
    fusion_style: '天層以英文音樂格局建立空間與旋律，地層以國語流行唱腔推動副歌，人層以國語核心句完成故事落點。',
  };
}

export async function generateFusionSong(input: FusionSongInput): Promise<FusionSongOutput> {
  return createLocalFusionSong(input);
}

export async function analyzePreview(input: {
  birthday: string;
  bloodType: Exclude<PersonInput['bloodType'], ''>;
}): Promise<PreviewAnalysisResult> {
  const birthScores = getBirthPersonalityScores(input.birthday);
  const bloodScores = getBloodTypePersonalityScores(input.bloodType);
  const previewScores = fusePreviewPersonalityV5(birthScores, bloodScores);
  const bloodAdjustments = mapAdjustments(bloodScores, birthScores);

  let aiData: {
    ai_skeleton_summary: string;
    ai_behavior_summary: string;
    ai_preview_summary: string;
  };

  aiData = {
    ai_skeleton_summary: '',
    ai_behavior_summary: '',
    ai_preview_summary: '',
  };

  const year = Number.parseInt(input.birthday.slice(0, 4), 10);
  const peakMusicYear = year + 17;
  let era = '2000s';
  if (peakMusicYear < 1960) era = '1950s';
  else if (peakMusicYear < 1970) era = '1960s';
  else if (peakMusicYear < 1980) era = '1970s';
  else if (peakMusicYear < 1990) era = '1980s';
  else if (peakMusicYear < 2000) era = '1990s';
  else if (peakMusicYear < 2010) era = '2000s';
  else if (peakMusicYear < 2020) era = '2010s';
  else era = '2020s';

  const previewRes = enrichPreview(
    birthScores,
    bloodAdjustments,
    aiData.ai_skeleton_summary,
    aiData.ai_behavior_summary,
    aiData.ai_preview_summary,
  );

  return {
    ...previewRes,
    era,
  };
}
