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

const DIMENSION_PROPERTIES = Object.fromEntries(
  DIMENSION_KEYS.map((key) => [key, { type: Type.NUMBER }]),
);

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

function safeJsonParse<T>(text: string): T {
  return JSON.parse(text) as T;
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

async function generateStructuredText<T>(apiKey: string, prompt: string, schema: T): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema as never,
      temperature: 0.2,
      maxOutputTokens: 900,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

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
    aiData = safeJsonParse(text);
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
    ai_skeleton_summary: aiData.ai_skeleton_summary?.trim(),
    ai_behavior_summary: aiData.ai_behavior_summary?.trim(),
    ai_individuality_summary: aiData.ai_individuality_summary?.trim(),
    ai_final_summary: aiData.ai_final_summary?.trim(),
    ai_wisdom_perspective: aiData.ai_wisdom_perspective?.trim(),
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

/* ─────────────────────────────────────────────────────────────
   天地人 AI 人格音樂系統 V1.0 — Gemini 音樂報告生成
   ───────────────────────────────────────────────────────────── */

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
  // 命理語境（五行 + 生肖）
  destinyContext?: {
    heavenlyStem: string;
    wuxing: string;
    wuxingDescription: string;
    chineseZodiac: string;
    zodiacTrait: string;
    zodiacMusicTrait: string;
  };
  // 心理學語境（榮格原型 + OCEAN）
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
}

export interface MusicReportOutput {
  music_narrative: string;      // 人格音樂靈魂敘述，200字內
  song_title_suggestion: string; // 建議歌名（繁中）
  lyric_opening: string;        // 開場歌詞兩句
  music_message: string;        // 這首歌想對使用者說的話，100字內
  wisdom_note: string;          // 善念結語，80字內
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
  },
  required: [
    'music_narrative',
    'song_title_suggestion',
    'lyric_opening',
    'music_message',
    'wisdom_note',
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

請輸出 JSON，欄位為：
- music_narrative：融合命理與心理學的人格音樂靈魂敘述，200字內
- song_title_suggestion：有命理感的建議歌名，繁中，4-10字
- lyric_opening：開場歌詞兩句，要有五行/命理意象，繁中
- music_message：這首歌想對使用者說的話，溫暖且有深度，100字內
- wisdom_note：以善念、因果、命運為核心的結語，80字內
`.trim();
}

export async function generateMusicReport(input: MusicReportInput): Promise<MusicReportOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('尚未設定 GEMINI_API_KEY。');

  try {
    const text = await generateStructuredText(
      apiKey,
      buildMusicReportPrompt(input),
      MUSIC_REPORT_SCHEMA,
    );
    return safeJsonParse<MusicReportOutput>(text);
  } catch (error) {
    console.error('[gemini] music report failed', error);
    return {
      music_narrative: `${input.name}的人格音樂矩陣已完成融合，天地人三層能量交織出屬於你的聲音頻率。`,
      song_title_suggestion: '命運共鳴',
      lyric_opening: '天地之間有一道光，是你走過的每一個選擇。',
      music_message: '這首歌是你內心深處最真實的聲音，聆聽它，你會找到屬於自己的方向。',
      wisdom_note: '心存善念，多行善事，才是真正改變命運的開始。',
    };
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
    aiData = safeJsonParse(text);
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
    aiData.ai_skeleton_summary?.trim(),
    aiData.ai_behavior_summary?.trim(),
    aiData.ai_preview_summary?.trim(),
  );
}
