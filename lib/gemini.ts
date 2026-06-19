// Gemini API 封裝：負責組 prompt、呼叫模型、回傳結構化結果
// 僅在 server-side（API route）使用，API Key 不會外洩到前端

import { GoogleGenAI, Type } from '@google/genai';
import type { AnalysisResult, PersonInput } from './types';
import { getZodiacSign } from './zodiac';

// 模型：gemini-2.5-flash（原訂的 2.0-flash 已被 Google 下架，2.5-flash 是其穩定後繼，定位同樣是快速、低成本）
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * 回應結構描述（responseSchema）。
 * 讓 Gemini 強制吐出符合 AnalysisResult 的 JSON，省去脆弱的字串解析。
 */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overall_score: { type: Type.NUMBER, description: '整體配對分數 0-100' },
    personality: {
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
    communication: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        description: { type: Type.STRING },
      },
      required: ['score', 'description'],
    },
    future: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        description: { type: Type.STRING },
      },
      required: ['score', 'description'],
    },
    summary: { type: Type.STRING, description: '總結建議，150 字內' },
  },
  required: ['overall_score', 'personality', 'love', 'communication', 'future', 'summary'],
};

/**
 * 組合送給 Gemini 的 prompt。
 * 角色設定（使用者決策 #3）：專業命理老師，語氣帶玄學感但給實際建議。
 */
function buildPrompt(personA: PersonInput, personB: PersonInput): string {
  const zodiacA = getZodiacSign(personA.birthday);
  const zodiacB = getZodiacSign(personB.birthday);

  const nameA = personA.name.trim() || '甲方';
  const nameB = personB.name.trim() || '乙方';

  return `你是一位經驗豐富的專業命理老師，精通血型性格學與星座命盤。
請以命理老師的口吻，溫和而專業地分析以下兩人的配對程度。

【${nameA}】血型：${personA.bloodType} 型、生日：${personA.birthday}、星座：${zodiacA}
【${nameB}】血型：${personB.bloodType} 型、生日：${personB.birthday}、星座：${zodiacB}

請從「個性相容、愛情緣分、溝通互動、未來發展」四個面向各給 0-100 分並附說明，
再給出整體配對分數與總結建議。

要求：
1. 全程使用繁體中文。
2. 每項說明 60 字以內，具體點出兩人血型與星座交互帶來的特質，避免空泛套話。
3. summary 為總結建議，150 字以內，給出實際可行的相處建議。
4. 分數需反映分析內容，不要全部給高分或低分。`;
}

/**
 * 呼叫 Gemini 分析兩人配對度。
 * @throws 當缺少金鑰、API 失敗或回傳格式異常時拋錯，由呼叫端處理。
 */
export async function analyzeCompatibility(
  personA: PersonInput,
  personB: PersonInput,
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // 開發者 log：最常見的設定遺漏
    console.error('[gemini] 缺少環境變數 GEMINI_API_KEY');
    throw new Error('伺服器未設定 API 金鑰，請於 .env.local 填入 GEMINI_API_KEY');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(personA, personB);

  let rawText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.8, // 命理分析保留一些變化性，但不至於亂跳
      },
    });
    rawText = response.text;
  } catch (err) {
    console.error('[gemini] 呼叫 generateContent 失敗：', err);
    throw new Error('AI 分析服務暫時無法使用，請稍後再試');
  }

  if (!rawText) {
    console.error('[gemini] 回應為空');
    throw new Error('AI 沒有回傳內容，請再試一次');
  }

  // responseSchema 已約束格式，但仍做防禦性解析，避免偶發異常造成整頁崩潰
  try {
    const parsed = JSON.parse(rawText) as AnalysisResult;
    return parsed;
  } catch (err) {
    console.error('[gemini] JSON 解析失敗，原始內容：', rawText, err);
    throw new Error('AI 回傳格式異常，請再試一次');
  }
}
