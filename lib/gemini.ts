import { GoogleGenAI, Type } from '@google/genai';
import { computeMusicProfile } from './music-engine';
import { getBirthPersonalityScores } from './birth-model-db';
import { getBloodTypePersonalityScores } from './blood-model-db';
import { getNamePersonalityScores } from './name-model-db';
import { generateGenderAdjustments } from './gender-corrector';
import { fusePersonalityV5, aggregatePersonalityScore } from './weight-engine';
import {
  DIMENSION_KEYS,
  type AnalysisResult,
  type DimensionScores,
  type PersonInput,
} from './types';
import { clampPercentage } from './trinity-weights';
import { getZodiacSign } from './zodiac';

const MODEL_NAME = 'gemini-2.5-flash';

const DIMENSION_PROPERTIES = Object.fromEntries(
  DIMENSION_KEYS.map((key) => [key, { type: Type.NUMBER }]),
);

/**
 * V5.0 完整分析 Schema
 * 
 * 天地人融合後，通過 Gemini 生成文字分析和智慧結語
 */
const RESPONSE_SCHEMA_V5 = {
  type: Type.OBJECT,
  properties: {
    birth_analysis: { 
      type: Type.STRING, 
      description: '天分析：根據生日星座的人格骨架深度解讀，100 字內。純粹描述，無評價。' 
    },
    blood_analysis: { 
      type: Type.STRING, 
      description: '地分析：血型如何補充生日人格的行為模式，100 字內。純粹描述，無評價。' 
    },
    name_analysis: { 
      type: Type.STRING, 
      description: '人分析：姓名如何個人化人格特質，100 字內。純粹描述，無評價。' 
    },
    gender_presentation: { 
      type: Type.STRING, 
      description: '性別校正說明：該性別下的人格表現方式差異，100 字內。解釋是表現方式，非本質改變。' 
    },
    final_insight: { 
      type: Type.STRING, 
      description: '最終人格洞察：整合天地人與性別的完整人格描述，200 字內。純粹描述人格，無建議。' 
    },
    wisdom_conclusion: { 
      type: Type.STRING, 
      description: '善念因果結語：根據人格特質的個人化智慧洞見，250 字內。這是唯一可出現因果、善念、人生方向的字段。風格深沉、高格局、不說教。' 
    },
  },
  required: [
    'birth_analysis',
    'blood_analysis',
    'name_analysis',
    'gender_presentation',
    'final_insight',
    'wisdom_conclusion',
  ],
};

/**
 * 構建 V5.0 完整分析提示詞
 */
function buildAnalysisPromptV5(
  person: PersonInput,
  birthScores: DimensionScores,
  bloodScores: DimensionScores,
  nameScores: DimensionScores,
  finalScores: DimensionScores,
): string {
  const zodiac = getZodiacSign(person.birthday);
  const genderLabel = person.gender === 'male' ? '男性' : '女性';

  return `
你是「天地人 AI 人格解碼系統 V5.0」的融合分析引擎。

【輸入資訊】
- 姓名：${person.name}
- 生日：${person.birthday}（${zodiac}）
- 血型：${person.bloodType}
- 性別：${genderLabel}

【人格矩陣數據】（已由融合引擎計算）
- 天模型（生日）35% 的基礎分數
- 地模型（血型）35% 的補充分數
- 人模型（姓名）30% 的個體化分數
- 性別校正：調整表現方式（非本質改變）
- 最終融合分數（12 維）

【你的任務】
根據上述人格矩陣數據，按順序生成 6 段文字分析：

1. **birth_analysis**（天分析）
   - 根據 ${zodiac} 與生日，解釋其人格骨架
   - 100 字內，純粹描述，無善惡評價
   
2. **blood_analysis**（地分析）
   - 根據 ${person.bloodType} 型血，解釋其行為補充
   - 100 字內，說明血型如何修飾生日骨架
   - 用詞：「補充」「調和」「細微修飾」，不可用「改變」或「推翻」

3. **name_analysis**（人分析）
   - 根據名字「${person.name}」，解釋個體化深化
   - 100 字內，說明姓名如何精細調整整體特質

4. **gender_presentation**（性別校正說明）
   - 在 ${genderLabel} 文化背景下，解釋人格表現方式
   - 100 字內，強調這是表現風格而非本質改變
   - 舉例對比「內在相同，外在表達不同」

5. **final_insight**（最終人格洞察）
   - 整合天地人與性別，給出完整人格描述
   - 200 字內，涵蓋最突出的 3-4 個維度特質
   - 不涉及建議或因果，純粹人格分析

6. **wisdom_conclusion**（善念因果結語）
   - 基於該人的人格特質，生成個人化智慧觀點
   - 250 字內，這是唯一可出現因果、善念、人生方向的字段
   - 風格深沉、高格局、不說教
   - 融合思維框架：
     * 天地人塑造傾向，但選擇塑造人生
     * 人格決定習慣，習慣影響行動，行動累積結果
     * 每個選擇都在創造未來的自己
     * 善念不是捷徑，而是更好循環的開始
   - 根據此人具體特質做個人化洞見

【嚴格限制】
1. 只能輸出合法 JSON，勿包含註解或多餘字符
2. 每段文字必須在字數限制內
3. 描述必須穩定、專業、不可浮誇或可愛
4. 因果善念只能在 wisdom_conclusion 出現
5. 不涉及命盤、紫微、易經等其他系統
`.trim();
}

/**
 * 驗證並規範化 AI 回應
 */
function normalizeGeminiResponse(raw: any): Partial<AnalysisResult> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI 回傳格式無效');
  }

  return {
    birth_analysis: (raw.birth_analysis as string)?.trim() || '',
    blood_analysis: (raw.blood_analysis as string)?.trim() || '',
    name_analysis: (raw.name_analysis as string)?.trim() || '',
    gender_presentation: (raw.gender_presentation as string)?.trim() || '',
    final_insight: (raw.final_insight as string)?.trim() || '',
    wisdom_conclusion: (raw.wisdom_conclusion as string)?.trim() || '',
  };
}

/**
 * V5.0 完整人格解碼
 * 
 * 流程：
 * 1. 載入生日、血型、姓名模型數據
 * 2. 應用性別校正
 * 3. 融合三層人格（35%、35%、30%）
 * 4. 呼叫 Gemini 生成文字分析
 * 5. 返回完整人格矩陣 + 音樂檔案
 */
export async function analyzeDestiny(person: PersonInput): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY is missing');
    throw new Error('尚未設定 Gemini API 金鑰，請先在 .env.local 中加入 GEMINI_API_KEY。');
  }

  // Step 1: 載入三層模型數據
  const birthScores = getBirthPersonalityScores(person.birthday);
  const bloodScores = getBloodTypePersonalityScores(person.bloodType as Exclude<typeof person.bloodType, ''>);
  const nameScores = getNamePersonalityScores(person.name);

  // Step 2: 性別校正
  const genderAdjustments = generateGenderAdjustments(person.gender);

  // Step 3: 融合人格
  const { rawPersonality, finalScores } = fusePersonalityV5(
    birthScores,
    bloodScores,
    nameScores,
    genderAdjustments,
  );

  // Step 4: 呼叫 Gemini 生成文字分析
  let geminiText: string | undefined;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: buildAnalysisPromptV5(person, birthScores, bloodScores, nameScores, finalScores),
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA_V5,
        temperature: 0.4,
        maxOutputTokens: 1500,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    geminiText = response.text;
  } catch (error) {
    console.error('[gemini] generateContent failed', error);
    throw new Error('Gemini 暫時無法完成人格解碼，請稍後再試。');
  }

  if (!geminiText) {
    throw new Error('Gemini 沒有回傳可解析的內容。');
  }

  try {
    const geminiData = normalizeGeminiResponse(JSON.parse(geminiText));

    // Step 5: 組裝完整結果
    const result: AnalysisResult = {
      // 三層人格矩陣
      birth_scores: birthScores,
      blood_scores: bloodScores,
      name_scores: nameScores,
      raw_personality: rawPersonality,
      gender_adjustments: genderAdjustments,
      final_scores: finalScores,

      // 文字分析
      birth_analysis: geminiData.birth_analysis,
      blood_analysis: geminiData.blood_analysis,
      name_analysis: geminiData.name_analysis,
      gender_presentation: geminiData.gender_presentation,
      final_insight: geminiData.final_insight,
      wisdom_conclusion: geminiData.wisdom_conclusion,

      // 音樂檔案
      music_profile: computeMusicProfile(finalScores),
    };

    return result;
  } catch (error) {
    console.error('[gemini] JSON parse or composition failed', geminiText, error);
    throw new Error('Gemini 回傳格式異常，系統無法完成穩定解碼。');
  }
}

function buildPreviewPrompt(input: { birthday: string; bloodType: Exclude<PersonInput['bloodType'], ''> }) {
  const zodiac = getZodiacSign(input.birthday);

  return `
你是「天地人 AI 人格解碼系統™ V2.0」的免費天地預分析引擎，請用繁體中文輸出穩定、權威、簡潔的結果。

核心規則：
1. 只分析 12 個固定維度，不可新增。
2. 天代表生日，建立人格骨架。
3. 地代表血型，補充行為模式；只能修飾生日骨架，不能推翻。
4. 這是免費天地預分析，尚未輸入姓名，因此不可假裝已完成最終人格模型。

輸入資料：
- 生日：${input.birthday}
- 星座：${zodiac}
- 血型：${input.bloodType}

請輸出：
1. base_scores：生日建立的 12 維度基礎值，0 到 100。
2. blood_adjustments：血型帶來的修正值，建議範圍 -12 到 +12。
3. ai_skeleton_summary：人格骨架摘要，80 字內。
4. ai_behavior_summary：血型補充後的行為模式摘要，80 字內。
5. ai_preview_summary：天地預分析摘要，120 字內。

嚴格限制：
1. 只能輸出合法 JSON。
2. 不可宣稱已完成姓名分析。
3. 語氣必須穩定、神秘、高級，不可浮誇。
`.trim();
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) throw new Error('AI 回傳了無效的分數。');
  return clampPercentage(value);
}

function roundAdjustment(value: number) {
  if (!Number.isFinite(value)) throw new Error('AI 回傳了無效的修正值。');
  return Math.round(value);
}

function mapScores(scores: Record<string, number>): DimensionScores {
  if (!scores || typeof scores !== 'object') throw new Error('AI 回傳的基礎分數格式不正確。');
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, clampScore(scores[key])]),
  ) as DimensionScores;
}

function mapAdjustments(scores: Record<string, number>): DimensionAdjustments {
  if (!scores || typeof scores !== 'object') throw new Error('AI 回傳的修正值格式不正確。');
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, roundAdjustment(scores[key])]),
  ) as DimensionAdjustments;
}

function clampAdjustments(scores: DimensionAdjustments, cap: number): DimensionAdjustments {
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, Math.max(-cap, Math.min(cap, roundAdjustment(scores[key])))]),
  ) as DimensionAdjustments;
}

function normalize(result: AnalysisResult): AnalysisResult {
  const base_scores = mapScores(result.base_scores);
  const blood_adjustments = clampAdjustments(mapAdjustments(result.blood_adjustments), BLOOD_ADJUSTMENT_CAP);
  const name_adjustments = clampAdjustments(mapAdjustments(result.name_adjustments), NAME_ADJUSTMENT_CAP);

  const earth_stage_scores = Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, clampScore(base_scores[key] + blood_adjustments[key])]),
  ) as DimensionScores;

  const human_stage_scores = Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, clampScore(earth_stage_scores[key] + name_adjustments[key])]),
  ) as DimensionScores;

  const final_scores = Object.fromEntries(
    DIMENSION_KEYS.map((key) => [
      key,
      fuseTrinityStages(base_scores[key], earth_stage_scores[key], human_stage_scores[key]),
    ]),
  ) as DimensionScores;

  return {
    resonance_score: averageScore(Object.values(final_scores)),
    base_scores,
    blood_adjustments,
    name_adjustments,
    final_scores,
    ai_skeleton_summary: result.ai_skeleton_summary?.trim(),
    ai_behavior_summary: result.ai_behavior_summary?.trim(),
    ai_individuality_summary: result.ai_individuality_summary?.trim(),
    ai_final_summary: result.ai_final_summary?.trim(),
    ai_wisdom_perspective: result.ai_wisdom_perspective?.trim(),
    skeleton_summary: '',
    behavior_summary: '',
    individuality_summary: '',
    final_summary: '',
    wealth_motivation_summary: '',
    love_pattern_summary: '',
    blind_spot_summary: '',
    life_advantage_summary: '',
    wisdom_perspective: '',
    music_profile: computeMusicProfile(final_scores),
  };
}

export async function analyzeDestiny(person: PersonInput): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY is missing');
    throw new Error('尚未設定 Gemini API 金鑰，請先在 .env.local 中加入 GEMINI_API_KEY。');
  }

  const ai = new GoogleGenAI({ apiKey });

  let text: string | undefined;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: buildPrompt(person),
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.25,
        maxOutputTokens: 800,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    text = response.text;
  } catch (error) {
    console.error('[gemini] generateContent failed', error);
    throw new Error('Gemini 暫時無法完成人格解碼，請稍後再試。');
  }

  if (!text) {
    throw new Error('Gemini 沒有回傳可解析的內容，請稍後再試。');
  }

  try {
    return enrichAnalysis(normalize(JSON.parse(text) as AnalysisResult));
  } catch (error) {
    console.error('[gemini] invalid JSON response', text, error);
    throw new Error('Gemini 回傳格式異常，系統無法完成穩定解碼。');
  }
}

export async function analyzePreview(input: {
  birthday: string;
  bloodType: Exclude<PersonInput['bloodType'], ''>;
}): Promise<PreviewAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY is missing');
    throw new Error('尚未設定 Gemini API 金鑰，請先在 .env.local 中加入 GEMINI_API_KEY。');
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: buildPreviewPrompt(input),
      config: {
        responseMimeType: 'application/json',
        responseSchema: PREVIEW_RESPONSE_SCHEMA,
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const parsed = JSON.parse(response.text ?? '{}') as {
      base_scores: Record<string, number>;
      blood_adjustments: Record<string, number>;
      ai_skeleton_summary?: string;
      ai_behavior_summary?: string;
      ai_preview_summary?: string;
    };

    const base_scores = mapScores(parsed.base_scores);
    const blood_adjustments = clampAdjustments(mapAdjustments(parsed.blood_adjustments), BLOOD_ADJUSTMENT_CAP);

    return enrichPreview(
      base_scores,
      blood_adjustments,
      parsed.ai_skeleton_summary,
      parsed.ai_behavior_summary,
      parsed.ai_preview_summary,
    );
  } catch (error) {
    console.error('[gemini] preview failed', error);
    throw new Error('天地預分析暫時無法完成，請稍後再試。');
  }
}
