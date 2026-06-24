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
      description: '說明為何這首英文參考音樂適合作為天層音樂格局錨點，70字內，繁體中文。',
    },
    mandarin_song_reason: {
      type: Type.STRING,
      description: '說明為何這首國語參考音樂適合作為地層情緒與唱腔錨點，70字內，繁體中文。',
    },
    taiwanese_song_reason: {
      type: Type.STRING,
      description: '說明為何這首台語參考音樂適合作為人層故事與情感錨點，70字內，繁體中文。',
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

━━━ 大數據選歌引擎已挑出的三個參考錨點 ━━━
天層英文音樂錨點：《${input.selectedSongs?.english.title ?? '—'}》— ${input.selectedSongs?.english.artist ?? '—'}
地層國語情緒錨點：《${input.selectedSongs?.mandarin.title ?? '—'}》— ${input.selectedSongs?.mandarin.artist ?? '—'}
人層台語故事錨點：《${input.selectedSongs?.taiwanese?.title ?? '—'}》— ${input.selectedSongs?.taiwanese?.artist ?? '—'}
（這三個只是資料庫參考錨點，不是要生成三首歌；請勿更換歌曲，只需說明為何契合各素材層。）

請輸出 JSON，欄位為：
- music_narrative：融合命理與心理學的人格音樂靈魂敘述，200字內
- song_title_suggestion：有命理感的建議歌名，繁中，4-10字
- lyric_opening：開場歌詞兩句，要有五行/命理意象，繁中
- music_message：這首歌想對使用者說的話，溫暖且有深度，100字內
- wisdom_note：以善念、因果、命運為核心的結語，80字內
- english_song_reason：為何上方英文錨點適合作為天層音樂格局，70字內
- mandarin_song_reason：為何上方國語錨點適合作為地層情緒與唱腔，70字內
- taiwanese_song_reason：為何上方台語錨點適合作為人層故事與情感，70字內
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
// 天地人歌曲矩陣（第一階段：天 / 地 / 人素材層）
// ────────────────────────────────────────────────────────────

const TIANDIREN_SONG_MATRIX_RULES = `
天地人歌曲矩陣鐵律：
- 最終只能生成一首「天地人人格歌曲」，不是英文歌 + 國語歌 + 台語歌硬湊。
- 天 35%（出生日期）：只決定英文音樂感、主旋律方向、年代感、BPM、情緒色彩、空間感；天不能寫歌詞。
- 地 35%（血型）：只決定國語流行唱腔、節奏、鼓點、和聲、編曲厚度、副歌情緒；地不能推翻天的曲風。
- 人 30%（姓名 + 性別 + 名字性格男/女/中性）：只決定台語歌詞語感、姓名氣質、個人故事、歌詞核心句、記憶點、情感落點；人不能亂改編曲。
- 天只決定音樂靈魂，地只決定音樂身體，人只決定音樂故事。
- 三者不能互相推翻，所有結果都必須進入同一個歌曲矩陣。
- AI 不能各自生成三套最終歌曲；english / mandarin / taiwanese 欄位只是素材層，不是三首正式歌。
- 若規則衝突，停止擴寫，以歌曲矩陣為唯一輸出。
`.trim();

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
      description: '素材層標籤，例如 天層 English 音樂藍圖、地層國語唱腔、人格台語故事。',
    },
    title: {
      type: Type.STRING,
      description: '素材層標題。這不是正式三首歌，而是同一首歌的素材名稱。',
    },
    concept: {
      type: Type.STRING,
      description: '此素材層在天地人歌曲矩陣中的分工，繁體中文，60 字內。',
    },
    lyrics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '素材文字，每個元素一行，6-10 行。天層不可寫完整歌詞，只能給旋律/音色/Hook 音節；地層給國語唱腔與情緒句；人層給台語歌詞核心句。',
    },
    style: {
      type: Type.STRING,
      description: '此素材層允許負責的曲風、BPM、樂器或情緒設定，繁體中文，80 字內。',
    },
    vocal_direction: {
      type: Type.STRING,
      description: '此素材層允許負責的人聲/唱腔方向，繁體中文，40 字內。',
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
      language_label: '人層台語故事',
      title: '心內彼句話',
      concept: `人層由${input.name}與性別氣質決定台語歌詞語感、個人故事、記憶點與情感落點。`,
      lyrics: [
        '[人層核心句]',
        '風若吹過阮的名 心內有光袂孤單',
        '一步一步行過暗暝 才知影天會光',
        '這句話只負責故事，不改編曲',
        '有血有夢 有勇氣作伴',
        '命運的路 慢慢行嘛會到岸',
      ],
      style: baseStyle,
      vocal_direction: '台語只負責人格故事與情感落點，不亂改旋律與編曲。',
    },
  };
}

function buildSongDraftsPrompt(input: MusicReportInput): string {
  const genderLabel = input.gender === 'male' ? '男性' : '女性';
  const d = input.destinyContext;

  return `
你是「天地人歌曲矩陣」的第一階段素材層生成器。
請根據使用者的生日、血型、姓名、命理資料與音樂參數，先產生三個素材層：天層、地層、人層。

${TIANDIREN_SONG_MATRIX_RULES}

非常重要：
1. 這一步只產生文字資料，不產生音檔、不產生 YouTube 連結。
2. 不是生成三首歌，而是生成同一首歌的三個資料層。
3. 所有素材必須原創，不可引用、改寫、模仿任何已存在歌曲的歌詞或旋律。
4. 參考曲只可作為年代與情緒錨點，不可模仿歌手、不可抄歌詞。
5. 天層不能寫完整歌詞；地層不能推翻天層曲風；人層不能亂改編曲。
6. 文字要短、清楚、可進入同一個歌曲矩陣，避免太長。

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
- english：天層素材（英文音樂格局、主旋律方向、年代感、BPM、情緒色彩、空間感；不可寫完整歌詞）
- mandarin：地層素材（國語唱腔、節奏、鼓點、和聲、編曲厚度、副歌情緒；不可推翻天層曲風）
- taiwanese：人層素材（台語歌詞語感、姓名氣質、個人故事、核心句、記憶點、情感落點；不可亂改編曲）

每個素材層包含：
- language_label
- title
- concept
- lyrics：6-10 行素材文字；天層不可寫完整歌詞，地層給唱腔/節奏句，人層給台語故事核心句
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
// AI 製作總監（輕量自動優化層：把天地人素材層整理成一首歌）
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

  if (emotion >= 75 || attachment >= 75) return '深情主唱作為主聲線，副歌增加和聲堆疊，讓情緒往上推。';
  if (creativity >= 75) return '帶空氣感與穿透力的創作型主唱，橋段加入低聲呢喃與電子和聲。';
  return '溫暖穩定的主唱，地層國語承接歌曲身體，天層英文提供空間 Hook，人層台語完成情感落點。';
}

export function generateAiProductionPlan(input: AiProductionPlanInput): AiProductionPlanOutput {
  const topKeys = pickTopMatrixKeys(input.personalityMatrix);
  const mood = input.musicParameters.mood.slice(0, 4).join('、') || '溫暖、真摯、有畫面';
  const instruments = input.musicParameters.instrument.slice(0, 5).join('、') || '鋼琴、鼓、合成器、弦樂、吉他';
  const themes = input.musicParameters.lyric_theme.slice(0, 4).join('、') || '自我覺醒、命運、希望、連結';
  const leadVocal = describeVocalBlend(input);
  const heavenLayerTitle = input.songDrafts.english.title;
  const earthLayerTitle = input.songDrafts.mandarin.title;
  const humanLayerTitle = input.songDrafts.taiwanese.title;
  const popularMusicDna = [
    '8 秒內先出現一個可記住的旋律、音色或短句 Hook，讓聽眾一開始就抓到歌曲身份。',
    '主歌保留空間與故事感，副歌再把鼓組、和聲與旋律高度一起拉開，形成明顯爆發。',
    '核心 Hook 重複 2 到 3 次，但每次換一點語言、和聲或樂器，熟悉但不單調。',
    '歌詞短句優先，避免把太多文字塞進旋律，讓人可以跟著哼、跟著記。',
    '橋段降低編曲密度，讓人層台語核心句或低聲線把情緒落地，再回到最後副歌。',
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
      `AI 製作總監會把《${heavenLayerTitle}》《${earthLayerTitle}》《${humanLayerTitle}》視為天地人三個素材層，不視為三首歌，最後只整理成《${input.fusionSong.fusion_title}》這一首天地人人格歌曲。`,
    fusion_strategy:
      `天層負責英文音樂格局、主旋律方向與空間感；地層負責國語唱腔、節奏身體與副歌情緒；人層負責台語故事核心句與情感落點。融合時不三首硬拼，而是以「${themes}」作為共同主軸。`,
    final_song_brief:
      `${input.musicParameters.genre} · ${input.musicParameters.bpm} BPM · ${input.musicParameters.key}，情緒走向為${mood}，人格高點集中在 ${topKeys.join(' / ')}。`,
    arrangement_plan: [
      `天層前奏：${instruments.split('、')[0] ?? '鋼琴'}先建立英文音樂格局、年代感與空間感，決定歌曲靈魂。`,
      '地層主歌：國語唱腔進場，節奏、鼓點、和聲與編曲厚度承接天層曲風，不推翻原本方向。',
      '地層副歌：把旋律與鼓組推高，建立最容易記住的流行 Hook 與副歌情緒。',
      '人層橋段：只加入台語姓名故事與核心句，讓情感落地，但不改變編曲骨架。',
      '融合收尾：由歌曲融合引擎統一收束成一首歌，保留一句人格記憶點。',
    ],
    vocal_cast: [
      `天層聲音：${input.songDrafts.english.vocal_direction}`,
      `地層主唱：${input.songDrafts.mandarin.vocal_direction}`,
      `人層故事聲：${input.songDrafts.taiwanese.vocal_direction}`,
    ],
    lead_vocal_choice: leadVocal,
    language_distribution: '天 35% · 地 35% · 人 30%。這是歌曲矩陣權重，不是三種語言硬性比例。',
    hook_design:
      `副歌核心 Hook 以《${input.fusionSong.fusion_title}》為主題：天層給音樂記憶點，地層給國語副歌情緒，人層給一句台語人格落點。`,
    popular_music_dna: popularMusicDna,
    global_trend_blend: globalTrendBlend,
    trend_arrangement_recipe:
      '以天層英文音樂格局建立 Global Pop 骨架，地層國語唱腔與節奏補上歌曲身體，人層台語故事只負責情感落點；三者進同一個歌曲矩陣，不各自生成三套結果。',
    rhythm_strategy:
      '主歌用半拍空間與輕鼓保持親密，副歌加入切分低頻、四拍推進與明亮 hi-hat；橋段降低鼓組，只保留心跳感，最後副歌再全開。',
    trend_safety_note:
      '只使用全球流行音樂的通用結構與聽感邏輯，不模仿特定歌手、特定歌曲、特定旋律或受版權保護的編曲細節。',
    hit_formula:
      '天層英文音樂前奏 8 拍 → 地層國語主歌 16 拍 → 地層副歌情緒拉升 → 人層台語核心句落點 → 融合引擎統一輸出最終副歌與一句記憶收尾。',
    hook_repeat_strategy:
      '核心 Hook 出現三次：第一次由天層建立旋律記憶，第二次由地層推高副歌情緒，第三次由人層核心句完成情感落點。',
    emotional_arc:
      '0-35% 天層建立音樂靈魂，35-70% 地層建立歌曲身體，70-100% 人層放入故事落點後由融合引擎收束成一首歌。',
    generation_prompt:
      `Create one original Tiandiren personality song, not three separate songs. ${input.musicParameters.genre}, ${input.musicParameters.bpm} BPM, ${input.musicParameters.key}. Mood: ${mood}. Instruments: ${instruments}. Vocal: ${leadVocal}. Heaven layer 35% from birth date controls English music identity, main melody direction, era feeling, BPM, emotional color, and space; Heaven must not write full lyrics. Earth layer 35% from blood type controls Mandarin vocal phrasing, rhythm, drums, harmony, arrangement density, and chorus emotion; Earth must not override Heaven's style. Human layer 30% from name, gender, and name energy controls Taiwanese lyric feeling, personal story, name temperament, core lyric phrase, memory point, and emotional landing; Human must not change arrangement. All layers must enter one song matrix and be rendered by one fusion engine. Main theme: ${themes}. Apply global streaming-friendly arrangement logic without copying any existing song, artist, melody, lyrics, or protected arrangement.`,
    next_step_note:
      '下一步才接音樂/人聲生成服務；目前這一層先把製作、編曲、主唱分配與生成提示整理好，避免一次做太重造成當機。',
  };
}

// ────────────────────────────────────────────────────────────
// AI 歌曲融合引擎（第一階段：文字版 — 歌名 + 天地人融合歌詞 + 融合曲風）
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
      description: '這首天地人人格歌曲的歌名，繁體中文，4-12 字，有記憶點。',
    },
    fusion_concept: {
      type: Type.STRING,
      description: '一句話說明這首歌如何用英文音樂格局、國語情緒、台語故事融合成一首歌，60 字內，繁體中文。',
    },
    fusion_lyrics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        '原創歌詞，以字串陣列回傳，「每個元素為一行」。段落標記（如 [主歌]、[副歌]、[橋段]）各自獨立成一個元素。以國語為主要可唱敘事，人層台語只放核心句與情感落點，天層英文只可作短 Hook 或音色記憶點。共 12-18 個元素，每行精煉。',
    },
    fusion_style: {
      type: Type.STRING,
      description: '融合曲風設定：描述天層音樂靈魂、地層歌曲身體、人層故事落點如何成為同一首歌，80 字內，繁體中文。',
    },
  },
  required: ['fusion_title', 'fusion_concept', 'fusion_lyrics', 'fusion_style'],
};

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
    fusion_style: '天層以英文音樂格局建立空間與旋律，地層以國語流行唱腔推動副歌，人層以台語核心句完成故事落點。',
  };
}

function buildFusionSongPrompt(input: FusionSongInput): string {
  const tw = input.taiwaneseSong
    ? `台語素材：《${input.taiwaneseSong.title}》— ${input.taiwaneseSong.artist}`
    : '台語素材：（無，可省略台語段落或少量點綴）';
  const drafts = input.songDrafts
    ? `
━━━ 第一階段 AI 已生成的天地人素材層（這才是主要融合素材）━━━
天層素材：《${input.songDrafts.english.title}》
概念：${input.songDrafts.english.concept}
素材文字：
${input.songDrafts.english.lyrics.join('\n')}

地層素材：《${input.songDrafts.mandarin.title}》
概念：${input.songDrafts.mandarin.concept}
素材文字：
${input.songDrafts.mandarin.lyrics.join('\n')}

人層素材：《${input.songDrafts.taiwanese.title}》
概念：${input.songDrafts.taiwanese.concept}
素材文字：
${input.songDrafts.taiwanese.lyrics.join('\n')}
`.trim()
    : '';

  return `
你是「歌曲融合引擎」，擅長把天、地、人三個素材層統一成一首動人的原創人格歌曲。
請為「${input.name}」量身打造「一首」全新的天地人人格歌曲。

${TIANDIREN_SONG_MATRIX_RULES}

系統鐵律：
1. 這是「一首歌」，不是三首拼貼；要融合貫通、自然流暢，副歌要有記憶點。
2. 天層只給英文音樂格局、旋律方向、年代感與空間，不可寫完整歌詞。
3. 地層只給國語唱腔、節奏、鼓點、和聲、編曲厚度與副歌情緒，不可推翻天層曲風。
4. 人層只給台語歌詞語感、姓名故事、核心句、記憶點與情感落點，不可亂改編曲。
5. 歌詞要呼應此人的人格特質，溫暖、有畫面、不浮誇。
6. 優先融合「AI 已生成的天地人素材層」，參考曲只作年代/情緒輔助，不可搶主導。

${drafts}

━━━ 參考曲（只作情緒錨點，不可模仿）━━━
英文素材：《${input.englishSong.title}》— ${input.englishSong.artist}
國語素材：《${input.mandarinSong.title}》— ${input.mandarinSong.artist}
${tw}

━━━ 此人的人格音樂矩陣（0-100）━━━
${JSON.stringify(input.personalityMatrix, null, 2)}

━━━ 音樂參數參考 ━━━
曲風：${input.genre ?? '抒情流行'} · BPM：${input.bpm ?? 90} · 氛圍：${(input.mood ?? []).join(', ') || '溫暖、真摯'}

請輸出 JSON，欄位為：
- fusion_title：原創歌名（繁中，4-12 字）
- fusion_concept：一句話說明天地人如何融合成一首歌（60 字內）
- fusion_lyrics：一首天地人人格歌曲的原創歌詞，「字串陣列」每元素一行（[主歌]/[副歌] 各自一行，12-18 行；國語為主線，英文只能短 Hook，台語作核心落點）
- fusion_style：天地人歌曲矩陣的融合曲風設定（80 字內）
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
