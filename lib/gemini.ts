import { GoogleGenAI, Type } from '@google/genai';
import { computeMusicProfile } from './music-engine';
import { enrichAnalysis, enrichPreview } from './personality-engine';
import {
  DIMENSION_KEYS,
  type AnalysisResult,
  type DimensionAdjustments,
  type DimensionScores,
  type PersonInput,
  type PreviewAnalysisResult,
} from './types';
import { averageScore, clampPercentage, fuseTrinityStages } from './trinity-weights';
import { getZodiacSign } from './zodiac';

const MODEL_NAME = 'gemini-2.5-flash';
const BLOOD_ADJUSTMENT_CAP = 12;
const NAME_ADJUSTMENT_CAP = 18;

const DIMENSION_PROPERTIES = Object.fromEntries(
  DIMENSION_KEYS.map((key) => [key, { type: Type.NUMBER }]),
);

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    resonance_score: { type: Type.NUMBER, description: '人格共鳴度，0 到 100。' },
    base_scores: {
      type: Type.OBJECT,
      properties: DIMENSION_PROPERTIES,
      required: [...DIMENSION_KEYS],
    },
    blood_adjustments: {
      type: Type.OBJECT,
      properties: DIMENSION_PROPERTIES,
      required: [...DIMENSION_KEYS],
    },
    name_adjustments: {
      type: Type.OBJECT,
      properties: DIMENSION_PROPERTIES,
      required: [...DIMENSION_KEYS],
    },
    ai_skeleton_summary: { type: Type.STRING, description: '生日建立的人格骨架摘要，80 字內。純粹描述人格特質，不含善惡評價或人生建議。' },
    ai_behavior_summary: { type: Type.STRING, description: '血型補充後的行為模式摘要，80 字內。純粹描述行為傾向，不含善惡評價或人生建議。' },
    ai_individuality_summary: { type: Type.STRING, description: '姓名校正後的個體差異摘要，80 字內。純粹描述個體特質，不含善惡評價或人生建議。' },
    ai_final_summary: { type: Type.STRING, description: '最終整體人格摘要，150 字內。純粹描述人格模型，不含善惡評價或人生建議。' },
    ai_wisdom_perspective: { type: Type.STRING, description: '天地人智慧觀點，200 字內。這是唯一可以出現因果、善念、人生建議的字段。結合此人的人格特質，給出個人化的智慧洞見，風格深沉、高格局、不說教。' },
  },
  required: [
    'resonance_score',
    'base_scores',
    'blood_adjustments',
    'name_adjustments',
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
    base_scores: {
      type: Type.OBJECT,
      properties: DIMENSION_PROPERTIES,
      required: [...DIMENSION_KEYS],
    },
    blood_adjustments: {
      type: Type.OBJECT,
      properties: DIMENSION_PROPERTIES,
      required: [...DIMENSION_KEYS],
    },
    ai_skeleton_summary: { type: Type.STRING, description: '生日建立的人格骨架摘要，80 字內。' },
    ai_behavior_summary: { type: Type.STRING, description: '血型補充後的行為模式摘要，80 字內。' },
    ai_preview_summary: { type: Type.STRING, description: '天地預分析摘要，120 字內。' },
  },
  required: [
    'base_scores',
    'blood_adjustments',
    'ai_skeleton_summary',
    'ai_behavior_summary',
    'ai_preview_summary',
  ],
};

function buildPrompt(person: PersonInput): string {
  const zodiac = getZodiacSign(person.birthday);

  return `
你是「天地人 AI 人格解碼系統」的雙層引擎，請用繁體中文輸出穩定、權威、精準的結果。

【第一層：人格引擎（嚴格中立）】
這一層只分析。不評論。不說教。不涉及善惡判斷。
只負責輸出：base_scores、blood_adjustments、name_adjustments、以及四段純人格描述摘要。

核心規則：
1. 全系統只分析 12 個固定維度：情緒敏感度、理性程度、社交需求、領導傾向、冒險傾向、執行能力、創造能力、同理能力、控制慾、安全感需求、財富動機、感情依附。
2. 天代表生日，權重 35%，只負責建立人格骨架。
3. 地代表血型，權重 35%，只負責補充行為模式；只能修飾天，不能推翻天。
4. 人代表姓名，權重 30%，只負責最後個體化校正；只能深化與細化，不能推翻天地。
5. 系統會在伺服器端把 35/35/30 做正規化融合，所以你只需要提供 base_scores、blood_adjustments、name_adjustments，不要自行輸出 final_scores。

輸入資料：
- 姓名：${person.name}
- 生日：${person.birthday}
- 星座：${zodiac}
- 血型：${person.bloodType}

STEP 1：根據生日，輸出 12 維度的 base_scores，範圍 0 到 100。
STEP 2：根據血型，輸出 blood_adjustments，小幅修正值，建議範圍 -12 到 +12。
STEP 3：根據姓名，輸出 name_adjustments，最後校正值，建議範圍 -18 到 +18。
STEP 4：輸出 ai_skeleton_summary、ai_behavior_summary、ai_individuality_summary、ai_final_summary，語氣高級、穩定、像專業人格顧問。這四段必須保持純人格描述，不得出現善惡判斷或人生建議。

【第二層：智慧引擎（ai_wisdom_perspective）】
人格模型完成後，才進入第二層。
這一層不再分析人格，而是產生個人化的智慧觀點。
這是整個系統唯一可以出現因果、善念、人生方向的字段。

請結合此人的人格特質，以下列思維框架生成 ai_wisdom_perspective（200 字內）：
- 天地人塑造了他的傾向，但選擇塑造了他的人生
- 人格決定習慣，習慣影響行動，行動累積結果，結果形成命運
- 天地萬物皆有因果，每一個選擇都在創造未來的自己
- 善念並非改變命運的捷徑，而是讓人生走向更好循環的開始
- 以善念待人，以誠信處事，以感恩看待世界，往往能創造更長遠的福報與機會

風格要求：深沉、高格局、不說教、不命中注定式的宿命論。結合此人具體的人格維度特質做個人化洞見。

嚴格限制：
1. 只能輸出合法 JSON。
2. resonance_score 一律叫「人格共鳴度」，不可寫準確率。
3. 不可出現互相矛盾的判斷。
4. 摘要不可可愛、不可搞笑、不可過度誇張。
5. 因果、善念、人生建議只能出現在 ai_wisdom_perspective，不得滲入其他字段。
`.trim();
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
