import { GoogleGenAI, Type } from '@google/genai';
import type { AnalysisResult, PersonInput } from './types';
import { getZodiacSign } from './zodiac';

const MODEL_NAME = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    resonance_score: { type: Type.NUMBER, description: '人格共鳴度，0 到 100。' },
    personality: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        description: { type: Type.STRING },
      },
      required: ['score', 'description'],
    },
    wealth: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        description: { type: Type.STRING },
      },
      required: ['score', 'description'],
    },
    love: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        description: { type: Type.STRING },
      },
      required: ['score', 'description'],
    },
    leadership: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        description: { type: Type.STRING },
      },
      required: ['score', 'description'],
    },
    advantage: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        description: { type: Type.STRING },
      },
      required: ['score', 'description'],
    },
    blind_spot: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        description: { type: Type.STRING },
      },
      required: ['score', 'description'],
    },
    name_energy: { type: Type.STRING, description: '姓名能量模型摘要，80字內。' },
    summary: { type: Type.STRING, description: '最終人格主軸摘要，150字內。' },
  },
  required: [
    'resonance_score',
    'personality',
    'wealth',
    'love',
    'leadership',
    'advantage',
    'blind_spot',
    'name_energy',
    'summary',
  ],
};

function buildPrompt(person: PersonInput): string {
  const zodiac = getZodiacSign(person.birthday);

  return `
你是「天地人 AI 人格解碼系統」的核心分析引擎。
請用繁體中文，根據以下三層模型產出高級命理風格的人格報告：

天（15%）：生日與星座，代表先天命格、思考模式、情緒底層。
地（15%）：血型，代表後天氣場、行動風格、人際模式。
人（70%）：姓名，代表個體命運、社會能量、財富磁場、感情磁場與人生軌跡。

使用者資料：
- 姓名：${person.name}
- 生日：${person.birthday}
- 星座：${zodiac}
- 血型：${person.bloodType}

輸出規則：
1. 只輸出 JSON，不要加任何前言或結語。
2. resonance_score 代表「人格共鳴度」，不能寫準確率，範圍 0 到 100。
3. personality、wealth、love、leadership、advantage、blind_spot 都需要 score 與 description。
4. 每段 description 請控制在 55 字內，語氣要像高級命理顧問。
5. name_energy 請控制在 80 字內，說明姓名如何放大這個人的個體命運。
6. summary 請控制在 150 字內，作為最終高潮頁的主摘要。
7. 不要做醫療、法律、投資保證或任何恐嚇式命定論。
`.trim();
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalize(result: AnalysisResult): AnalysisResult {
  return {
    resonance_score: clamp(result.resonance_score),
    personality: {
      score: clamp(result.personality.score),
      description: result.personality.description.trim(),
    },
    wealth: {
      score: clamp(result.wealth.score),
      description: result.wealth.description.trim(),
    },
    love: {
      score: clamp(result.love.score),
      description: result.love.description.trim(),
    },
    leadership: {
      score: clamp(result.leadership.score),
      description: result.leadership.description.trim(),
    },
    advantage: {
      score: clamp(result.advantage.score),
      description: result.advantage.description.trim(),
    },
    blind_spot: {
      score: clamp(result.blind_spot.score),
      description: result.blind_spot.description.trim(),
    },
    name_energy: result.name_energy.trim(),
    summary: result.summary.trim(),
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
        temperature: 0.9,
        // 關閉思考模式：本任務不需要深度推理，關掉可省去 5-8 秒等待時間與大量 token
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
    return normalize(JSON.parse(text) as AnalysisResult);
  } catch (error) {
    console.error('[gemini] invalid JSON response', text, error);
    throw new Error('Gemini 回傳格式異常，請重新啟動解碼。');
  }
}
