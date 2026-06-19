import { GoogleGenAI, Type } from '@google/genai';
import { enrichAnalysis, enrichPreview } from './personality-engine';
import {
  DIMENSION_KEYS,
  type AnalysisResult,
  type DimensionAdjustments,
  type DimensionScores,
  type PersonInput,
  type PreviewAnalysisResult,
} from './types';
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
    ai_skeleton_summary: { type: Type.STRING, description: '生日建立的人格骨架摘要，80字內。' },
    ai_behavior_summary: { type: Type.STRING, description: '血型補充後的行為模式摘要，80字內。' },
    ai_individuality_summary: { type: Type.STRING, description: '姓名個人化校正摘要，80字內。' },
    ai_final_summary: { type: Type.STRING, description: '最終融合摘要，150字內。' },
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
    ai_skeleton_summary: { type: Type.STRING, description: '生日建立的人格骨架摘要，80字內。' },
    ai_behavior_summary: { type: Type.STRING, description: '血型補充後的行為模式摘要，80字內。' },
    ai_preview_summary: { type: Type.STRING, description: '天地預分析摘要，120字內。' },
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
你是「天地人 AI 人格解碼系統™ V2.0」的核心分析引擎。

核心鐵律：
1. 永遠禁止互相否定。
2. 血型不能推翻生日，只能補充、修飾、細化。
3. 姓名權重 70%，但姓名不是重新算一次，而是最後校正器；不得推翻天地結論，只能深化、補充、細化、個性化。
4. 全系統只允許使用以下 12 個人格維度，不得新增、不得替換、不得隨機生成：
   - emotion_sensitivity 情緒敏感度
   - logic 理性程度
   - social_need 社交需求
   - leadership 領導傾向
   - risk_tendency 冒險傾向
   - execution 執行能力
   - creativity 創造能力
   - empathy 同理能力
   - control 控制慾
   - security_need 安全感需求
   - wealth_motivation 財富動機
   - attachment 感情依附

分析流程必須完全照做：
STEP 1：根據生日與星座，建立人格骨架，只輸出 base_scores。
STEP 2：根據血型，輸出 blood_adjustments，這些值只能修飾 base_scores，不可產生互相否定的敘述。
STEP 3：根據姓名，輸出 name_adjustments，作為 70% 權重的個體差異校正器，不可推翻前兩步，只能讓人格更個人化。
STEP 4：計算 final_scores = base_scores + blood_adjustments + name_adjustments。

使用者資料：
- 姓名：${person.name}
- 生日：${person.birthday}
- 星座：${zodiac}
- 血型：${person.bloodType}

輸出規則：
1. 只輸出 JSON，不要輸出任何其他內容。
2. resonance_score 一律叫「人格共鳴度」，不可寫準確率。
3. base_scores 與 final_scores 範圍為 0 到 100 的整數。
4. blood_adjustments 與 name_adjustments 為整數，可正可負；其中血型修正幅度建議落在 -12 到 +12，姓名修正幅度建議落在 -18 到 +18。
5. 不需要輸出 final_scores，本地系統會自行計算最終值。
6. ai_skeleton_summary 描述生日建立的人格骨架；ai_behavior_summary 描述血型如何補充行為模式；ai_individuality_summary 描述姓名如何細化個體差異；ai_final_summary 是最終融合結論。
7. 所有 summary 都要遵守「只能補充深化，不能互相否定」。
8. 語氣是高級人格模型，不是算命口吻，不是紫微網站口吻，不要誇大，不要恐嚇。
`.trim();
}

function buildPreviewPrompt(input: { birthday: string; bloodType: Exclude<PersonInput['bloodType'], ''> }) {
  const zodiac = getZodiacSign(input.birthday);

  return `
你是「天地人 AI 人格解碼系統™」的天地預分析引擎。

任務規則：
1. 只分析天與地，不處理姓名。
2. 生日負責建立人格骨架，血型只做補充修飾，不可推翻生日結論。
3. 只能使用以下 12 個固定維度：
   emotion_sensitivity, logic, social_need, leadership, risk_tendency, execution,
   creativity, empathy, control, security_need, wealth_motivation, attachment
4. 只輸出 JSON。

使用者資料：
- 生日：${input.birthday}
- 星座：${zodiac}
- 血型：${input.bloodType}

輸出規則：
1. base_scores 為生日建立的人格骨架，0 到 100 整數。
2. blood_adjustments 為血型修正值，整數，建議落在 -12 到 +12。
3. ai_skeleton_summary 只描述天的骨架，不下太重結論。
4. ai_behavior_summary 只描述地如何補充，不可否定天。
5. ai_preview_summary 描述天地預分析已完成，並引導姓名解鎖更深層個體差異。
`.trim();
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function roundAdjustment(value: number) {
  return Math.round(value);
}

function mapScores(scores: Record<string, number>): DimensionScores {
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, clampScore(scores[key])]),
  ) as DimensionScores;
}

function mapAdjustments(scores: Record<string, number>): DimensionAdjustments {
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, roundAdjustment(scores[key])]),
  ) as DimensionAdjustments;
}

function clampAdjustments(
  scores: DimensionAdjustments,
  cap: number,
): DimensionAdjustments {
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, Math.max(-cap, Math.min(cap, roundAdjustment(scores[key])))]),
  ) as DimensionAdjustments;
}

function normalize(result: AnalysisResult): AnalysisResult {
  const base_scores = mapScores(result.base_scores);
  const blood_adjustments = clampAdjustments(mapAdjustments(result.blood_adjustments), BLOOD_ADJUSTMENT_CAP);
  const name_adjustments = clampAdjustments(mapAdjustments(result.name_adjustments), NAME_ADJUSTMENT_CAP);

  const final_scores = Object.fromEntries(
    DIMENSION_KEYS.map((key) => [
      key,
      clampScore(base_scores[key] + blood_adjustments[key] + name_adjustments[key]),
    ]),
  ) as DimensionScores;

  return {
    resonance_score: clampScore(result.resonance_score),
    base_scores,
    blood_adjustments,
    name_adjustments,
    final_scores,
    ai_skeleton_summary: result.ai_skeleton_summary?.trim(),
    ai_behavior_summary: result.ai_behavior_summary?.trim(),
    ai_individuality_summary: result.ai_individuality_summary?.trim(),
    ai_final_summary: result.ai_final_summary?.trim(),
    skeleton_summary: '',
    behavior_summary: '',
    individuality_summary: '',
    final_summary: '',
    wealth_motivation_summary: '',
    love_pattern_summary: '',
    blind_spot_summary: '',
    life_advantage_summary: '',
  };
}

export async function analyzeDestiny(person: PersonInput): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY is missing');
    throw new Error('找不到 Gemini API 金鑰，請先在 .env.local 設定 GEMINI_API_KEY。');
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
    throw new Error('Gemini 沒有回傳可用內容，請稍後再試。');
  }

  try {
    return enrichAnalysis(normalize(JSON.parse(text) as AnalysisResult));
  } catch (error) {
    console.error('[gemini] invalid JSON response', text, error);
    throw new Error('Gemini 回傳格式異常，請重新啟動解碼。');
  }
}

export async function analyzePreview(input: {
  birthday: string;
  bloodType: Exclude<PersonInput['bloodType'], ''>;
}): Promise<PreviewAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY is missing');
    throw new Error('找不到 Gemini API 金鑰，請先在 .env.local 設定 GEMINI_API_KEY。');
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
