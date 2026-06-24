import { GoogleGenAI, Type } from '@google/genai';
import { getBirthPersonalityScores, getBirthZodiac } from './birth-model-db';
import { getBloodTypeDescription, getBloodTypePersonalityScores } from './blood-model-db';
import { getNameDescription, getNamePersonalityScores } from './name-model-db';
import { computeShichenProfile } from './shichen-engine';
import {
  DIMENSION_KEYS,
  type DimensionScores,
  type InsightRequest,
} from './types';

const MODEL_NAME = 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 20000;

interface InsightAnalysisResponse {
  accuracyScore: number;
  dataSourceCount: number;
  psychologyInsights: {
    title: string;
    description: string;
    confidence: number;
  }[];
  statisticalAnalysis: {
    dimension: string;
    score: number;
    percentile: number;
    globalComparison: string;
  }[];
  bigDataInsights: {
    category: string;
    finding: string;
    sampleSize: number;
  }[];
  personalizedRecommendations: string[];
  summary: string;
}

const INSIGHT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    psychology_insights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          confidence: { type: Type.INTEGER },
        },
      },
      description: '心理學洞察，3-5 項，信心度 0-100',
    },
    statistical_analysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dimension: { type: Type.STRING },
          score: { type: Type.INTEGER },
          percentile: { type: Type.INTEGER },
          globalComparison: { type: Type.STRING },
        },
      },
      description: '統計分析數據，包含分數和百分位',
    },
    big_data_insights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          finding: { type: Type.STRING },
          sampleSize: { type: Type.INTEGER },
        },
      },
      description: '大數據發現，基於全球統計樣本',
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '個性化建議，3-5 項',
    },
    summary: { type: Type.STRING, description: '完整摘要，200-300 字' },
  },
  required: [
    'psychology_insights',
    'statistical_analysis',
    'big_data_insights',
    'recommendations',
    'summary',
  ],
};

// 誤差函數的近似實現
function computeErf(x: number): number {
  // 誤差函數的近似值 (Abramowitz and Stegun)
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);

  return sign * y;
}

function calculateGlobalPercentile(score: number): number {
  // 模擬全球人口的百分位分布
  // 基於常態分佈
  const z = (score - 50) / 15;
  const percentile = Math.round((1 + computeErf(z / Math.sqrt(2))) / 2 * 100);
  return Math.max(0, Math.min(100, percentile));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    // 確保超時被正確捕獲
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function safeJsonParse<T>(text: string): T {
  const jsonText = extractJsonText(text);
  try {
    return JSON.parse(jsonText) as T;
  } catch (error) {
    // 多半是輸出被 token 上限截斷，導致 JSON 不完整
    const isTruncated = !jsonText.trimEnd().endsWith('}');
    const reason = isTruncated
      ? 'AI 回應內容過長被截斷，請稍後再試。'
      : 'AI 回應格式異常，無法解析。';
    throw new Error(reason);
  }
}

export async function generateInsightAnalysis(request: InsightRequest): Promise<InsightAnalysisResponse> {
  // 與專案其他模組一致使用 GEMINI_API_KEY，並保留舊名稱作為後備
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('未設定 GEMINI_API_KEY 環境變數。請在 .env.local 中填入你的 Google AI Studio 金鑰。');
  }

  const ai = new GoogleGenAI({ apiKey });

  // 獲取基本人格分數
  const birthScores = getBirthPersonalityScores(request.birthDate);
  const bloodScores = getBloodTypePersonalityScores(request.bloodType);
  const nameScores = getNamePersonalityScores(request.name);

  const birthZodiac = getBirthZodiac(request.birthDate);

  // 時辰（人 30% 子層）：算八字日柱/時柱，不知道時辰時自動採良辰吉時。
  const shichenBranchIndex = typeof request.shichen === 'number' ? request.shichen : null;
  const shichen = computeShichenProfile({ birthDate: request.birthDate, shichenBranchIndex });

  // 構建分析提示
  const analysisPrompt = `
你是一個專業的人格和心理分析專家，同時精通八字命理與紫微斗數，並擁有統計學和大數據分析的專業知識。
請根據以下天地人資料進行深度洞察分析：

【基本資料】
- 姓名: ${request.name}
- 生日: ${request.birthDate} (星座: ${birthZodiac})
- 血型: ${request.bloodType}型
- 性別: ${request.gender === 'female' ? '女性' : '男性'}

【八字時辰（人 30% 子層，供八字與紫微斗數分析）】
- 出生時辰: ${shichen.shichen.label}（${shichen.shichen.range}）${shichen.isKnown ? '（使用者提供之真實時辰）' : '（使用者未提供時辰，已依生辰自動採用良辰吉時）'}
- 八字日柱: ${shichen.dayPillar} · 時柱: ${shichen.hourPillar.ganzhi}
- 時辰五行: ${shichen.wuxing}

【個性特質分數】(0-100)
生日骨架:
${JSON.stringify(birthScores, null, 2)}

血型補充:
${JSON.stringify(bloodScores, null, 2)}

姓名校正:
${JSON.stringify(nameScores, null, 2)}

請進行全面分析，包括：
1. 基於全球數據庫的心理學洞察（3-5項）
2. 各維度的統計分析和全球百分位
3. 大數據發現（基於全球樣本的趨勢）
4. 個性化建議（3-5項）
5. 完整的分析摘要

分析要求：
- 至少有一項心理學洞察或大數據發現，要自然融入「八字（日柱/時柱五行）與紫微斗數」的命理視角，與心理學/統計資料彼此呼應、不可互相矛盾。
- 若時辰為自動採用的良辰吉時，分析照常完成，語氣保持正向，不需強調資料不足。
- 語氣專業、溫和、有依據，繁體中文。

返回結構化的 JSON 格式。`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: analysisPrompt,
      config: {
        responseSchema: INSIGHT_RESPONSE_SCHEMA as never,
        responseMimeType: 'application/json',
        temperature: 1,
        topP: 0.95,
        topK: 40,
        // gemini-2.5-flash 為思考型模型，思考 tokens 會佔用輸出額度。
        // 關閉思考並提高上限，避免中文 JSON 被截斷導致解析失敗。
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 8192,
      },
    }),
    GEMINI_TIMEOUT_MS,
    '深度洞察分析超時，請稍後再試。'
  );

  const textContent = (response as { text?: string | (() => string) }).text;
  const textStr = typeof textContent === 'function' ? textContent() : (textContent || '');

  if (!textStr) {
    throw new Error('AI 未返回有效回應。');
  }

  const aiAnalysis = safeJsonParse<{
    psychology_insights: Array<{ title: string; description: string; confidence: number }>;
    statistical_analysis: Array<{ dimension: string; score: number; percentile: number; globalComparison: string }>;
    big_data_insights: Array<{ category: string; finding: string; sampleSize: number }>;
    recommendations: string[];
    summary: string;
  }>(textStr);

  // 計算整體精準度 (基於多個因素)
  const dimensionCount = Object.keys(birthScores).length;
  const avgScore = Object.values(birthScores).reduce((a, b) => a + b, 0) / dimensionCount;
  const confidenceMultiplier = 1 - Math.abs(50 - avgScore) / 100;
  const accuracyScore = Math.round(75 + confidenceMultiplier * 20);

  // 全球數據樣本量 (虛擬數據，代表系統已學習的樣本)
  const dataSourceCount = 5000000 + Math.floor(Math.random() * 5000000);

  return {
    accuracyScore: Math.max(50, Math.min(99, accuracyScore)),
    dataSourceCount,
    psychologyInsights: aiAnalysis.psychology_insights,
    statisticalAnalysis: aiAnalysis.statistical_analysis.map(stat => ({
      ...stat,
      percentile: calculateGlobalPercentile(stat.score),
    })),
    bigDataInsights: aiAnalysis.big_data_insights,
    personalizedRecommendations: aiAnalysis.recommendations,
    summary: aiAnalysis.summary,
  };
}
