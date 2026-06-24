import { GoogleGenAI, Type } from '@google/genai';
import { getBirthPersonalityScores, getBirthZodiac } from './birth-model-db';
import { getBloodTypeDescription, getBloodTypePersonalityScores } from './blood-model-db';
import { generateGenderAdjustments, getGenderCorrectionExplanation } from './gender-corrector';
import { computeMusicProfile } from './music-engine';
import { getNameDescription, getNamePersonalityScores } from './name-model-db';
import { enrichAnalysis, enrichPreview } from './personality-engine';
import {
  aggregatePersonalityScore,
  fusePersonalityV5,
  fusePreviewPersonalityV5,
  subtractScores,
} from './weight-engine';
import {
  DIMENSION_KEYS,
  type AnalysisResult,
  type DimensionAdjustments,
  type DimensionScores,
  type PersonInput,
  type PreviewAnalysisResult,
} from './types';

const MODEL_NAME = 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 15000;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ai_skeleton_summary: { type: Type.STRING, description: '生日骨架摘要，80 字內。' },
    ai_behavior_summary: { type: Type.STRING, description: '血型補充摘要，80 字內。' },
    ai_individuality_summary: { type: Type.STRING, description: '姓名校正摘要，80 字內。' },
    ai_final_summary: { type: Type.STRING, description: '最終總結，150 字內。' },
    ai_wisdom_perspective: { type: Type.STRING, description: '善念與修為視角的結語，200 字內。' },
  },
  required: [
    'ai_skeleton_summary',
    'ai_behavior_summary',
    'ai_individuality_summary',
    'ai_final_summary',
    'ai_wisdom_perspective',
  ],
};

const PREVIEW_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ai_skeleton_summary: { type: Type.STRING, description: '生日骨架摘要，80 字內。' },
    ai_behavior_summary: { type: Type.STRING, description: '血型補充摘要，80 字內。' },
    ai_preview_summary: { type: Type.STRING, description: '天地預分析摘要，120 字內。' },
  },
  required: ['ai_skeleton_summary', 'ai_behavior_summary', 'ai_preview_summary'],
};

function scoreBlock(scores: DimensionScores) {
  return JSON.stringify(scores, null, 2);
}

function extractJsonText(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function safeJsonParse<T>(text: string): T {
  return JSON.parse(extractJsonText(text)) as T;
}

function cleanAiText(value: unknown) {
  if (typeof value !== 'string') return '';

  return value
    .replace(/[\u0000-\u001F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'「」]+|["'「」]+$/g, '')
    .trim();
}

function normalizeStructuredFields<T extends object>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, typeof value === 'string' ? cleanAiText(value) : value]),
  ) as T;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mapAdjustments(scores: DimensionScores, base: DimensionScores): DimensionAdjustments {
  return subtractScores(scores, base);
}

function buildAnalysisPrompt(
  person: PersonInput,
  birthScores: DimensionScores,
  bloodScores: DimensionScores,
  nameScores: DimensionScores,
  finalScores: DimensionScores,
  bloodAdjustments: DimensionAdjustments,
  nameAdjustments: DimensionAdjustments,
) {
  const zodiac = getBirthZodiac(person.birthday);
  const genderLabel = person.gender === 'male' ? '男性' : '女性';

  return `
你是「天地人 AI 人格解碼系統」的高級分析顧問，請只負責寫出穩定、彼此一致、不可互相否定的繁體中文摘要。

鐵律：
1. 生日是人格骨架，血型只能補充生日，姓名只能深化天地，性別只能修飾外在呈現。
2. 任何後面的分析都不得推翻前面的分析。
3. 用詞只能使用「補充、深化、校正、細化、調和」，不可使用「相反、推翻、其實不是、完全改變」。
4. 語氣要高級、穩定、命理顧問感，不可浮誇、不可搞笑。
5. 最後結語必須帶到「以善為本、多行善能讓命運更順」的價值，但不要說教。

人物資料：
- 姓名：${person.name}
- 生日：${person.birthday}
- 星座：${zodiac}
- 血型：${person.bloodType}
- 性別：${genderLabel}

結構化依據：
- 生日骨架：${scoreBlock(birthScores)}
- 血型層：${scoreBlock(bloodScores)}
- 姓名層：${scoreBlock(nameScores)}
- 血型修正：${JSON.stringify(bloodAdjustments)}
- 姓名修正：${JSON.stringify(nameAdjustments)}
- 最終融合：${scoreBlock(finalScores)}
- 血型描述：${getBloodTypeDescription(person.bloodType)}
- 姓名描述：${getNameDescription(person.name)}
- 性別修飾：${getGenderCorrectionExplanation(person.gender, Object.entries(nameAdjustments).map(([key, value]) => ({ key, value })))}

請輸出 JSON，欄位為：
- ai_skeleton_summary
- ai_behavior_summary
- ai_individuality_summary
- ai_final_summary
- ai_wisdom_perspective
`.trim();
}

function buildPreviewPrompt(
  birthday: string,
  bloodType: Exclude<PersonInput['bloodType'], ''>,
  birthScores: DimensionScores,
  bloodScores: DimensionScores,
  previewScores: DimensionScores,
  bloodAdjustments: DimensionAdjustments,
) {
  const zodiac = getBirthZodiac(birthday);

  return `
你是「天地人 AI 人格解碼系統」的免費天地預分析顧問。

規則：
1. 只能描述生日骨架與血型補充。
2. 不可假裝已經分析姓名或最終命運。
3. 血型只能補充，不能推翻生日。
4. 語氣要穩定、神秘、高級，不可浮誇。

人物資料：
- 生日：${birthday}
- 星座：${zodiac}
- 血型：${bloodType}

結構化依據：
- 生日骨架：${scoreBlock(birthScores)}
- 血型層：${scoreBlock(bloodScores)}
- 血型修正：${JSON.stringify(bloodAdjustments)}
- 天地融合：${scoreBlock(previewScores)}
- 血型描述：${getBloodTypeDescription(bloodType)}

請輸出 JSON，欄位為：
- ai_skeleton_summary
- ai_behavior_summary
- ai_preview_summary
`.trim();
}

async function generateStructuredText<T>(
  apiKey: string,
  prompt: string,
  schema: T,
  maxOutputTokens = 900,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema as never,
        temperature: 0.2,
        maxOutputTokens,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    GEMINI_TIMEOUT_MS,
    'Gemini 回應逾時。',
  );

  if (!response.text) {
    throw new Error('Gemini 沒有回傳可解析的內容。');
  }

  return response.text;
}

export async function analyzeDestiny(person: PersonInput): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('尚未設定 GEMINI_API_KEY。');
  }

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

  try {
    const text = await generateStructuredText(
      apiKey,
      buildAnalysisPrompt(person, birthScores, bloodScores, nameScores, finalScores, bloodAdjustments, nameAdjustments),
      RESPONSE_SCHEMA,
    );
    aiData = normalizeStructuredFields(safeJsonParse(text));
  } catch (error) {
    console.error('[gemini] analysis failed, fallback to local summaries', error);
    aiData = {
      ai_skeleton_summary: '',
      ai_behavior_summary: '',
      ai_individuality_summary: '',
      ai_final_summary: '',
      ai_wisdom_perspective: '',
    };
  }

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

export interface MusicReportInput {
  name: string;
  birthDate: string;
  zodiac: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
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
  // 已由大數據選歌引擎挑出的主題曲（英文 / 國語 / 台語），請 AI 說明為何對應此人
  selectedSongs?: {
    english: { title: string; artist: string };
    mandarin: { title: string; artist: string };
    taiwanese?: { title: string; artist: string };
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
}

function createLocalMusicReport(input: MusicReportInput): MusicReportOutput {
  const en = input.selectedSongs?.english;
  const zh = input.selectedSongs?.mandarin;
  const tw = input.selectedSongs?.taiwanese;
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
  };
}

const MUSIC_REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    music_narrative: {
      type: Type.STRING,
      description: '描述這個人的音樂靈魂，語調如命理詩人，200字內，繁體中文。',
    },
    song_title_suggestion: {
      type: Type.STRING,
      description: '建議的專屬歌曲名稱，繁體中文，4-10字。',
    },
    lyric_opening: {
      type: Type.STRING,
      description: '開場歌詞兩句，有詩意、有力量，繁體中文。',
    },
    music_message: {
      type: Type.STRING,
      description: '這首歌想對使用者說的一段話，溫暖、真實，100字內，繁體中文。',
    },
    wisdom_note: {
      type: Type.STRING,
      description: '以善念為核心的結語，不說教，80字內，繁體中文。',
    },
    english_song_reason: {
      type: Type.STRING,
      description: '說明為何這首「英文主題曲」對應此人的人格與命格，具體呼應其特質，70字內，繁體中文。',
    },
    mandarin_song_reason: {
      type: Type.STRING,
      description: '說明為何這首「國語主題曲」對應此人的人格與成長年代，具體有感，70字內，繁體中文。',
    },
    taiwanese_song_reason: {
      type: Type.STRING,
      description: '說明為何這首「台語主題曲」對應此人的人格與土地情感，真摯草根，70字內，繁體中文。',
    },
  },
  required: [
    'music_narrative',
    'song_title_suggestion',
    'lyric_opening',
    'music_message',
    'wisdom_note',
    'english_song_reason',
    'mandarin_song_reason',
    'taiwanese_song_reason',
  ],
};

function buildMusicReportPrompt(input: MusicReportInput): string {
  const genderLabel = input.gender === 'male' ? '男性' : '女性';
  const d = input.destinyContext;
  const p = input.psychologyContext;

  return `
你是「天地人 AI 人格音樂系統」的靈魂音樂顧問，同時精通命理學與深層心理學。
根據以下三層數據——天地人命理架構、心理學原型、音樂矩陣——寫出一份深刻的人格音樂報告。

系統鐵律：
1. 命理、心理學、音樂三個視角必須互相呼應，不可矛盾。
2. 語氣如命理詩人：有深度、有詩意、有人性溫度，不浮誇不說教。
3. 五行、生肖、榮格原型等概念要自然融入敘事，不要硬塞術語。
4. 陰影面（Shadow）要輕描淡寫地提及，不是批評，而是提醒。
5. 結語必須自然帶到「心存善念，命運才能更順」的智慧。

━━━ 人物命格 ━━━
姓名：${input.name}
生日：${input.birthDate}（${input.zodiac}）
血型：${input.bloodType} 型 · 性別：${genderLabel}
音樂年代：${input.era}

━━━ 命理層（天）━━━
天干：${d?.heavenlyStem ?? '—'} · 五行：${d?.wuxing ?? '—'}
五行氣質：${d?.wuxingDescription ?? '—'}
生肖：${d?.chineseZodiac ?? '—'} · 特質：${d?.zodiacTrait ?? '—'}
音樂傾向：${d?.zodiacMusicTrait ?? '—'}

━━━ 心理學層（人）━━━
主原型：${p?.archetypePrimary ?? '—'}（${p?.archetypeDescription ?? '—'}）
核心天賦：${p?.archetypeCoreGift ?? '—'}
此生課題：${p?.archetypeLifeLesson ?? '—'}
核心傷：${p?.archetypeCoreWound ?? '—'}
音樂人格：${p?.archetypeMusicPersona ?? '—'}
陰影面：${p?.archetypeShadow ?? '—'}
輔助原型：${p?.archetypeSecondary ?? '—'}
OCEAN 特質：${p?.oceanHighlight ?? '—'}

━━━ 人格音樂矩陣（0-100）━━━
${JSON.stringify(input.personalityMatrix, null, 2)}

━━━ 生成音樂參數 ━━━
BPM：${input.musicParameters.bpm} · 音調：${input.musicParameters.key}
風格：${input.musicParameters.genre}
氛圍：${input.musicParameters.mood.join(', ')}
唱腔：${input.musicParameters.vocal_style}
樂器：${input.musicParameters.instrument.join(', ')}
歌詞主題：${input.musicParameters.lyric_theme.join(', ')}

━━━ 大數據選歌引擎已挑出的三首主題曲 ━━━
英文主題曲：《${input.selectedSongs?.english.title ?? '—'}》— ${input.selectedSongs?.english.artist ?? '—'}
國語主題曲：《${input.selectedSongs?.mandarin.title ?? '—'}》— ${input.selectedSongs?.mandarin.artist ?? '—'}
台語主題曲：《${input.selectedSongs?.taiwanese?.title ?? '—'}》— ${input.selectedSongs?.taiwanese?.artist ?? '—'}
（這三首是系統依此人生日、血型、性別融合出的人格特質精準匹配，請勿更換歌曲，只需說明為何契合。）

請輸出 JSON，欄位為：
- music_narrative：融合命理與心理學的人格音樂靈魂敘述，200字內
- song_title_suggestion：有命理感的建議歌名，繁中，4-10字
- lyric_opening：開場歌詞兩句，要有五行/命理意象，繁中
- music_message：這首歌想對使用者說的話，溫暖且有深度，100字內
- wisdom_note：以善念、因果、命運為核心的結語，80字內
- english_song_reason：為何上方那首英文主題曲對應此人(具體呼應其人格特質)，70字內
- mandarin_song_reason：為何上方那首國語主題曲對應此人(呼應人格與成長年代)，70字內
- taiwanese_song_reason：為何上方那首台語主題曲對應此人(呼應人格與土地情感，真摯草根)，70字內
`.trim();
}

export async function generateMusicReport(input: MusicReportInput): Promise<MusicReportOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return createLocalMusicReport(input);

  try {
    const text = await generateStructuredText(
      apiKey,
      buildMusicReportPrompt(input),
      MUSIC_REPORT_SCHEMA,
      1500,
    );
    return normalizeStructuredFields(safeJsonParse<MusicReportOutput>(text)) as unknown as MusicReportOutput;
  } catch (error) {
    console.error('[gemini] music report failed', error);
    return createLocalMusicReport(input);
  }
}

// ────────────────────────────────────────────────────────────
// AI 三首原創歌曲雛形（第一階段：英文 / 國語 / 台語文字資料）
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

const SONG_DRAFT_SCHEMA_ITEM = {
  type: Type.OBJECT,
  properties: {
    language_label: {
      type: Type.STRING,
      description: '歌曲語言標籤，例如 English、國語、台語。',
    },
    title: {
      type: Type.STRING,
      description: '原創歌名。英文歌用英文歌名；國語與台語歌用繁體中文歌名。',
    },
    concept: {
      type: Type.STRING,
      description: '這首歌從生日、血型、姓名萃取出的核心概念，繁體中文，60 字內。',
    },
    lyrics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '原創歌詞，每個元素一行，6-10 行。英文歌用英文；國語歌用繁中；台語歌用台語漢字。',
    },
    style: {
      type: Type.STRING,
      description: '曲風、BPM、樂器與情緒設定，繁體中文，80 字內。',
    },
    vocal_direction: {
      type: Type.STRING,
      description: '主唱聲線方向，繁體中文，40 字內。',
    },
  },
  required: ['language_label', 'title', 'concept', 'lyrics', 'style', 'vocal_direction'],
};

const SONG_DRAFTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    english: SONG_DRAFT_SCHEMA_ITEM,
    mandarin: SONG_DRAFT_SCHEMA_ITEM,
    taiwanese: SONG_DRAFT_SCHEMA_ITEM,
  },
  required: ['english', 'mandarin', 'taiwanese'],
};

function createLocalSongDrafts(input: MusicReportInput): OriginalSongDraftsOutput {
  const mood = input.musicParameters.mood.slice(0, 3).join('、') || '溫暖、堅定、真摯';
  const themes = input.musicParameters.lyric_theme.slice(0, 3).join('、') || '命運、心光、重新出發';
  const baseStyle = `${input.musicParameters.genre}，${input.musicParameters.bpm} BPM，${input.musicParameters.instrument.slice(0, 3).join('、') || '鋼琴、弦樂、低頻鼓組'}，情緒偏${mood}`;

  return {
    english: {
      language_label: 'English',
      title: 'Light Beneath My Name',
      concept: `以${input.name}的生日節奏、${input.bloodType}型表達與姓名記憶點，寫成向內尋光的英文歌。`,
      lyrics: [
        '[Verse]',
        'I was born where the quiet stars breathe',
        'Carrying a fire no one else can see',
        '[Pre-Chorus]',
        'Every scar becomes a silver line',
        '[Chorus]',
        'I hear my name turning into light',
        'One true song in the middle of the night',
      ],
      style: baseStyle,
      vocal_direction: '乾淨溫暖、有穿透力的英文主唱。',
    },
    mandarin: {
      language_label: '國語',
      title: '名字裡的光',
      concept: `把${input.name}的命格底色化成一首國語歌，主題圍繞${themes}。`,
      lyrics: [
        '[主歌]',
        '我把生日藏進風裡 慢慢聽見自己',
        '血液裡有一種節奏 陪我走過陰晴',
        '[副歌]',
        '名字裡的光 照亮沒說出口的願望',
        '我不再怕遠方 因為心會替我導航',
        '命運不是牆 是我學會溫柔的方向',
      ],
      style: baseStyle,
      vocal_direction: '溫柔細膩、情緒慢慢推高的國語聲線。',
    },
    taiwanese: {
      language_label: '台語',
      title: '心內彼條歌',
      concept: `以土地感與生命韌性承接${input.name}的人格節奏，寫成真摯的台語歌。`,
      lyrics: [
        '[主歌]',
        '風若吹過阮的名 心內有光袂孤單',
        '一步一步行過暗暝 才知影天會光',
        '[副歌]',
        '這條歌 唱予家己聽',
        '有血有夢 有勇氣作伴',
        '命運的路 慢慢行嘛會到岸',
      ],
      style: baseStyle,
      vocal_direction: '厚實真誠、帶一點沙啞故事感的台語聲線。',
    },
  };
}

function buildSongDraftsPrompt(input: MusicReportInput): string {
  const genderLabel = input.gender === 'male' ? '男性' : '女性';
  const d = input.destinyContext;

  return `
你是「AI 三融合創主題曲」的第一階段作曲資料生成器。
請根據使用者的生日、血型、姓名、命理資料與音樂參數，先產生三首「原創文字歌雛形」：英文、國語、台語各一首。

非常重要：
1. 這一步只產生文字資料，不產生音檔、不產生 YouTube 連結。
2. 三首歌都必須是原創，不可引用、改寫、模仿任何已存在歌曲的歌詞或旋律。
3. 參考曲只可作為年代與情緒錨點，不可模仿歌手、不可抄歌詞。
4. 三首歌要像同一個靈魂的三個面向，之後才會被融合成一首獨一無二的歌曲。
5. 歌詞要可唱、有段落感，但先保持短版雛形，避免太長。

━━━ 使用者資料 ━━━
姓名：${input.name}
生日：${input.birthDate}（${input.zodiac}）
血型：${input.bloodType} 型 · 性別：${genderLabel}
音樂年代：${input.era}

━━━ 命理資料 ━━━
天干：${d?.heavenlyStem ?? '—'} · 五行：${d?.wuxing ?? '—'} · 生肖：${d?.chineseZodiac ?? '—'}
五行氣質：${d?.wuxingDescription ?? '—'}
生肖音樂傾向：${d?.zodiacMusicTrait ?? '—'}

━━━ 人格音樂矩陣 ━━━
${JSON.stringify(input.personalityMatrix, null, 2)}

━━━ 音樂參數 ━━━
BPM：${input.musicParameters.bpm} · 音調：${input.musicParameters.key}
風格：${input.musicParameters.genre}
氛圍：${input.musicParameters.mood.join(', ')}
唱腔：${input.musicParameters.vocal_style}
樂器：${input.musicParameters.instrument.join(', ')}
歌詞主題：${input.musicParameters.lyric_theme.join(', ')}

━━━ 參考曲（只作情緒錨點，不可模仿）━━━
英文參考：《${input.selectedSongs?.english.title ?? '—'}》— ${input.selectedSongs?.english.artist ?? '—'}
國語參考：《${input.selectedSongs?.mandarin.title ?? '—'}》— ${input.selectedSongs?.mandarin.artist ?? '—'}
台語參考：《${input.selectedSongs?.taiwanese?.title ?? '—'}》— ${input.selectedSongs?.taiwanese?.artist ?? '—'}

請輸出 JSON：
- english：英文原創歌雛形
- mandarin：國語原創歌雛形
- taiwanese：台語原創歌雛形

每首歌包含：
- language_label
- title
- concept
- lyrics：6-10 行，段落標記如 [Verse] / [主歌] 可獨立成行
- style
- vocal_direction
`.trim();
}

export async function generateSongDrafts(input: MusicReportInput): Promise<OriginalSongDraftsOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return createLocalSongDrafts(input);

  try {
    const text = await generateStructuredText(
      apiKey,
      buildSongDraftsPrompt(input),
      SONG_DRAFTS_SCHEMA,
      3200,
    );
    return safeJsonParse<OriginalSongDraftsOutput>(text);
  } catch (error) {
    console.error('[gemini] song drafts failed', error);
    return createLocalSongDrafts(input);
  }
}

// ────────────────────────────────────────────────────────────
// AI 三語融合原創主題曲（第一階段：文字版 — 歌名 + 三語融合歌詞 + 融合曲風）
// ────────────────────────────────────────────────────────────

export interface FusionSongInput {
  name: string;
  era: string;
  personalityMatrix: Record<string, number>;
  englishSong: { title: string; artist: string };
  mandarinSong: { title: string; artist: string };
  taiwaneseSong?: { title: string; artist: string };
  genre?: string;
  bpm?: number;
  mood?: string[];
}

export interface FusionSongOutput {
  fusion_title: string;
  fusion_concept: string;
  fusion_lyrics: string[];
  fusion_style: string;
}

const FUSION_SONG_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fusion_title: {
      type: Type.STRING,
      description: '這首三語融合原創歌曲的歌名，繁體中文，4-12 字，有記憶點。',
    },
    fusion_concept: {
      type: Type.STRING,
      description: '一句話說明這首歌如何把英文、國語、台語三種語言與曲風融合貫通，60 字內，繁體中文。',
    },
    fusion_lyrics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        '原創歌詞，以字串陣列回傳，「每個元素為一行」。段落標記（如 [主歌]、[副歌]、[橋段]）各自獨立成一個元素。需自然穿插英文、國語、台語三種語言，台語用台語漢字書寫。共 12-18 個元素，每行精煉。',
    },
    fusion_style: {
      type: Type.STRING,
      description: '融合曲風設定：把三首主題曲的曲風/節奏/情緒揉合成一首歌的描述，80 字內，繁體中文。',
    },
  },
  required: ['fusion_title', 'fusion_concept', 'fusion_lyrics', 'fusion_style'],
};

function createLocalFusionSong(input: FusionSongInput): FusionSongOutput {
  const tw = input.taiwaneseSong?.title ?? '';
  return {
    fusion_title: '三語共鳴曲',
    fusion_concept: `融合《${input.englishSong.title}》《${input.mandarinSong.title}》${tw ? `《${tw}》` : ''}的情感頻率，化為一首屬於${input.name}的三語原創歌。`,
    fusion_lyrics: [
      '[主歌]',
      '天地之間 我聽見自己的聲音',
      'In every heartbeat, a story untold',
      '[副歌]',
      '咱的人生 家己行 嘛要勇敢行',
      '唱出命運的光',
    ],
    fusion_style: '以抒情流行為底，前段木吉他與鋼琴鋪陳，副歌加入弦樂與節奏，英文主導旋律、國語承接敘事、台語收束情感。',
  };
}

function buildFusionSongPrompt(input: FusionSongInput): string {
  const tw = input.taiwaneseSong
    ? `台語素材：《${input.taiwaneseSong.title}》— ${input.taiwaneseSong.artist}`
    : '台語素材：（無，可省略台語段落或少量點綴）';

  return `
你是一位跨語言創作歌手與編曲人，擅長把不同語言、不同曲風的歌揉合成一首動人的原創歌。
請為「${input.name}」量身打造「一首」全新的三語融合原創主題曲。

系統鐵律：
1. 這是「一首歌」，不是三首拼貼——要融合貫通、自然流暢，副歌要有記憶點。
2. 英文、國語、台語三種語言要自然穿插，不可生硬翻譯堆疊。
3. 以下三首是「靈感素材」，請吸收其情感與曲風，但要寫成「全新原創」歌詞，不可抄襲原歌詞。
4. 歌詞要呼應此人的人格特質，溫暖、有畫面、不浮誇。

━━━ 靈感素材（三首主題曲）━━━
英文素材：《${input.englishSong.title}》— ${input.englishSong.artist}
國語素材：《${input.mandarinSong.title}》— ${input.mandarinSong.artist}
${tw}

━━━ 此人的人格音樂矩陣（0-100）━━━
${JSON.stringify(input.personalityMatrix, null, 2)}

━━━ 音樂參數參考 ━━━
曲風：${input.genre ?? '抒情流行'} · BPM：${input.bpm ?? 90} · 氛圍：${(input.mood ?? []).join(', ') || '溫暖、真摯'}

請輸出 JSON，欄位為：
- fusion_title：原創歌名（繁中，4-12 字）
- fusion_concept：一句話說明三語如何融合（60 字內）
- fusion_lyrics：三語穿插的原創歌詞，「字串陣列」每元素一行（[主歌]/[副歌] 各自一行，12-18 行，台語用台語漢字）
- fusion_style：融合曲風設定（80 字內）
`.trim();
}

export async function generateFusionSong(input: FusionSongInput): Promise<FusionSongOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return createLocalFusionSong(input);

  try {
    const text = await generateStructuredText(
      apiKey,
      buildFusionSongPrompt(input),
      FUSION_SONG_SCHEMA,
      3000,
    );
    return normalizeStructuredFields(safeJsonParse<FusionSongOutput>(text)) as unknown as FusionSongOutput;
  } catch (error) {
    console.error('[gemini] fusion song failed', error);
    return createLocalFusionSong(input);
  }
}

export async function analyzePreview(input: {
  birthday: string;
  bloodType: Exclude<PersonInput['bloodType'], ''>;
}): Promise<PreviewAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('尚未設定 GEMINI_API_KEY。');
  }

  const birthScores = getBirthPersonalityScores(input.birthday);
  const bloodScores = getBloodTypePersonalityScores(input.bloodType);
  const previewScores = fusePreviewPersonalityV5(birthScores, bloodScores);
  const bloodAdjustments = mapAdjustments(bloodScores, birthScores);

  let aiData: {
    ai_skeleton_summary: string;
    ai_behavior_summary: string;
    ai_preview_summary: string;
  };

  try {
    const text = await generateStructuredText(
      apiKey,
      buildPreviewPrompt(input.birthday, input.bloodType, birthScores, bloodScores, previewScores, bloodAdjustments),
      PREVIEW_RESPONSE_SCHEMA,
    );
    aiData = normalizeStructuredFields(safeJsonParse(text));
  } catch (error) {
    console.error('[gemini] preview failed, fallback to local summaries', error);
    aiData = {
      ai_skeleton_summary: '',
      ai_behavior_summary: '',
      ai_preview_summary: '',
    };
  }

  return enrichPreview(
    birthScores,
    bloodAdjustments,
    aiData.ai_skeleton_summary,
    aiData.ai_behavior_summary,
    aiData.ai_preview_summary,
  );
}


