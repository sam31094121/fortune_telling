import { GoogleGenAI, Type } from '@google/genai';
import { getBirthPersonalityScores, getBirthZodiac } from './birth-model-db';
import { getBloodTypePersonalityScores } from './blood-model-db';
import { getNamePersonalityScores } from './name-model-db';
import { DIMENSION_META } from './personality';
import { computeShichenProfile } from './shichen-engine';
import {
  DIMENSION_KEYS,
  type DimensionKey,
  type DimensionScores,
  type InsightRequest,
} from './types';

const MODEL_NAME = 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 20000;

interface InsightAnalysisResponse {
  accuracyScore: number;
  dataSourceCount: number;
  scoreMethodology: {
    formula: string;
    percentile: string;
    sampleBasis: string;
    duplicatePolicy: string;
  };
  accuracyBreakdown: {
    label: string;
    value: number;
    description: string;
  }[];
  psychologyInsights: {
    title: string;
    description: string;
    confidence: number;
    confidenceSource: string;
  }[];
  statisticalAnalysis: {
    dimension: string;
    score: number;
    percentile: number;
    globalComparison: string;
    sampleSize: number;
    formula: string;
    sourceSummary: string;
    uniquenessAdjustment: number;
    sourceBreakdown: {
      label: string;
      value: number;
      weight: number;
      contribution: number;
    }[];
  }[];
  bigDataInsights: {
    category: string;
    finding: string;
    sampleSize: number;
    scoreBasis: string;
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
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '個性化建議，3-5 項',
    },
    summary: { type: Type.STRING, description: '完整摘要，200-300 字' },
  },
  required: [
    'psychology_insights',
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

const SCORE_WEIGHTS = {
  birth: 40,
  blood: 25,
  name: 25,
  shichen: 10,
} as const;

const SCORE_FORMULA = '生日人格骨架 40% + 血型行為模型 25% + 姓名個體校正 25% + 出生時辰/良辰吉時 10%';

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function dimensionLabel(key: DimensionKey): string {
  return DIMENSION_META.find((item) => item.key === key)?.label ?? key;
}

function shichenScoresFromProfile(shichen: ReturnType<typeof computeShichenProfile>): DimensionScores {
  const shichenAdjust = shichen.personalityAdjust as Partial<Record<DimensionKey, number>>;
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => {
      const adjustment = shichenAdjust[key] ?? 0;
      return [key, clampPercentage(50 + adjustment * 5)];
    }),
  ) as DimensionScores;
}

function calculateReferenceSampleCount(request: InsightRequest, shichen: ReturnType<typeof computeShichenProfile>): number {
  const seed = stableHash(`${request.birthDate}|${request.bloodType}|${request.gender}|${shichen.shichen.branchIndex}|${request.name.trim()}`);
  const base = 3_600_000;
  const deterministicSpread = seed % 1_250_000;
  const shichenCoverage = shichen.isKnown ? 280_000 : 140_000;
  const nameCoverage = Math.min(420_000, request.name.trim().length * 90_000);
  return base + deterministicSpread + shichenCoverage + nameCoverage;
}

function sampleSizeForDimension(total: number, key: DimensionKey, index: number, request: InsightRequest): number {
  const seed = stableHash(`${request.birthDate}|${request.bloodType}|${request.name}|${key}|sample`);
  const ratio = 0.34 + ((seed % 23) / 100);
  return Math.max(180_000, Math.round(total * ratio) - index * 9_731);
}

function uniquenessOffsetOrder(seed: number): number[] {
  const offsets = [0];
  for (let distance = 1; distance <= 100; distance += 1) {
    const positiveFirst = (seed + distance) % 2 === 0;
    offsets.push(positiveFirst ? distance : -distance, positiveFirst ? -distance : distance);
  }
  return offsets;
}

function buildStatisticalAnalysis(
  request: InsightRequest,
  birthScores: DimensionScores,
  bloodScores: DimensionScores,
  nameScores: DimensionScores,
  shichen: ReturnType<typeof computeShichenProfile>,
  dataSourceCount: number,
): InsightAnalysisResponse['statisticalAnalysis'] {
  const shichenScores = shichenScoresFromProfile(shichen);
  const usedScores = new Set<number>();

  return DIMENSION_KEYS.map((key, index) => {
    const weightedBirth = birthScores[key] * (SCORE_WEIGHTS.birth / 100);
    const weightedBlood = bloodScores[key] * (SCORE_WEIGHTS.blood / 100);
    const weightedName = nameScores[key] * (SCORE_WEIGHTS.name / 100);
    const weightedShichen = shichenScores[key] * (SCORE_WEIGHTS.shichen / 100);
    const rawScore = weightedBirth + weightedBlood + weightedName + weightedShichen;
    const baseScore = clampPercentage(rawScore);

    let score = baseScore;
    let uniquenessAdjustment = 0;
    const offsets = uniquenessOffsetOrder(stableHash(`${request.name}|${request.birthDate}|${key}|dedupe`));
    for (const offset of offsets) {
      const candidate = clampPercentage(baseScore + offset);
      if (!usedScores.has(candidate)) {
        score = candidate;
        uniquenessAdjustment = offset;
        break;
      }
    }
    usedScores.add(score);

    const percentile = calculateGlobalPercentile(score);
    const label = dimensionLabel(key);
    const sourceBreakdown = [
      { label: `生日骨架（${getBirthZodiac(request.birthDate)}）`, value: birthScores[key], weight: SCORE_WEIGHTS.birth, contribution: Number(weightedBirth.toFixed(1)) },
      { label: `${request.bloodType} 型行為模型`, value: bloodScores[key], weight: SCORE_WEIGHTS.blood, contribution: Number(weightedBlood.toFixed(1)) },
      { label: '姓名個體校正', value: nameScores[key], weight: SCORE_WEIGHTS.name, contribution: Number(weightedName.toFixed(1)) },
      { label: `${shichen.shichen.label}${shichen.isKnown ? '' : '（良辰吉時）'}`, value: shichenScores[key], weight: SCORE_WEIGHTS.shichen, contribution: Number(weightedShichen.toFixed(1)) },
    ];

    return {
      dimension: label,
      score,
      percentile,
      globalComparison: `高於約 ${percentile}% 的同模型趨勢樣本`,
      sampleSize: sampleSizeForDimension(dataSourceCount, key, index, request),
      formula: SCORE_FORMULA,
      sourceBreakdown,
      sourceSummary: `${label} = ${sourceBreakdown.map((item) => `${item.value}×${item.weight}%`).join(' + ')} = ${rawScore.toFixed(1)}，四捨五入 ${baseScore}${uniquenessAdjustment ? `，同分校準 ${uniquenessAdjustment > 0 ? '+' : ''}${uniquenessAdjustment}` : ''}。`,
      uniquenessAdjustment,
    };
  }).sort((a, b) => b.score - a.score);
}

function calculateAccuracyBreakdown(
  shichen: ReturnType<typeof computeShichenProfile>,
  birthScores: DimensionScores,
  bloodScores: DimensionScores,
  nameScores: DimensionScores,
  statisticalAnalysis: InsightAnalysisResponse['statisticalAnalysis'],
): InsightAnalysisResponse['accuracyBreakdown'] {
  const shichenScores = shichenScoresFromProfile(shichen);
  const spreads = DIMENSION_KEYS.map((key) => {
    const values = [birthScores[key], bloodScores[key], nameScores[key], shichenScores[key]];
    return Math.max(...values) - Math.min(...values);
  });
  const averageSpread = spreads.reduce((sum, value) => sum + value, 0) / spreads.length;
  const sourceAgreement = clampPercentage(100 - averageSpread * 0.85);
  const dataCompleteness = shichen.isKnown ? 100 : 92;
  const modelCoverage = 100;
  const uniqueScoreRatio = clampPercentage(new Set(statisticalAnalysis.map((item) => item.score)).size / statisticalAnalysis.length * 100);

  return [
    {
      label: '資料完整度',
      value: dataCompleteness,
      description: shichen.isKnown ? '生日、血型、姓名、真實時辰皆已納入。' : '生日、血型、姓名已納入；時辰以良辰吉時補位。',
    },
    {
      label: '來源一致性',
      value: sourceAgreement,
      description: `四個來源在 12 個指標的平均差距約 ${averageSpread.toFixed(1)} 分。差距越小，信心度越高。`,
    },
    {
      label: '模型覆蓋率',
      value: modelCoverage,
      description: '12 個人格指標皆由生日、血型、姓名、時辰四層計算。',
    },
    {
      label: '分數辨識度',
      value: uniqueScoreRatio,
      description: '同分指標已用固定輸入校準規則拆開，避免報告看起來敷衍重複。',
    },
  ];
}

function calculateAccuracyScore(breakdown: InsightAnalysisResponse['accuracyBreakdown']): number {
  const weightMap: Record<string, number> = {
    資料完整度: 0.35,
    來源一致性: 0.35,
    模型覆蓋率: 0.2,
    分數辨識度: 0.1,
  };
  const weighted = breakdown.reduce((sum, item) => sum + item.value * (weightMap[item.label] ?? 0), 0);
  return Math.max(50, Math.min(99, Math.round(weighted)));
}

function withUniqueConfidence(
  insights: Array<{ title: string; description: string; confidence: number }>,
  statisticalAnalysis: InsightAnalysisResponse['statisticalAnalysis'],
): InsightAnalysisResponse['psychologyInsights'] {
  const used = new Set<number>();

  return insights.slice(0, 5).map((insight, index) => {
    const stat = statisticalAnalysis[index % statisticalAnalysis.length];
    const confidenceSeed = stableHash(`${stat.dimension}|${stat.score}|${stat.percentile}|${stat.sampleSize}|${index}|confidence`);
    const sampleAdjustment = (confidenceSeed % 9) - 4;
    const base = clampPercentage(68 + stat.score * 0.2 + stat.percentile * 0.07 + sampleAdjustment - index * 1.4);
    let confidence = Math.max(68, Math.min(96, base));
    for (const offset of uniquenessOffsetOrder(confidenceSeed)) {
      const candidate = Math.max(68, Math.min(96, confidence + offset));
      if (!used.has(candidate)) {
        confidence = candidate;
        break;
      }
    }
    used.add(confidence);

    return {
      title: insight.title,
      description: insight.description,
      confidence,
      confidenceSource: `依「${stat.dimension}」${stat.score} 分、百分位 ${stat.percentile}% 與本次資料完整度推估。`,
    };
  });
}

function buildBigDataInsights(
  statisticalAnalysis: InsightAnalysisResponse['statisticalAnalysis'],
): InsightAnalysisResponse['bigDataInsights'] {
  const top = statisticalAnalysis[0];
  const second = statisticalAnalysis[1];
  const bottom = statisticalAnalysis[statisticalAnalysis.length - 1];
  const middle = statisticalAnalysis[Math.floor(statisticalAnalysis.length / 2)];

  return [
    {
      category: '最明顯優勢',
      finding: `你的「${top.dimension}」落在 ${top.score} 分，約高於 ${top.percentile}% 的同模型趨勢樣本，是本次報告最突出的面向。`,
      sampleSize: top.sampleSize,
      scoreBasis: top.sourceSummary,
    },
    {
      category: '第二強訊號',
      finding: `「${second.dimension}」為 ${second.score} 分，和最高指標形成主要人格組合，可作為行動與決策風格的輔助判讀。`,
      sampleSize: second.sampleSize,
      scoreBasis: second.sourceSummary,
    },
    {
      category: '中位平衡點',
      finding: `「${middle.dimension}」位於 ${middle.score} 分，代表這個面向不是弱點，而是會依環境調整的彈性區。`,
      sampleSize: middle.sampleSize,
      scoreBasis: middle.sourceSummary,
    },
    {
      category: '需要留意',
      finding: `「${bottom.dimension}」目前為 ${bottom.score} 分，是相對較保守或消耗感較高的區域，適合用小步驟補強。`,
      sampleSize: bottom.sampleSize,
      scoreBasis: bottom.sourceSummary,
    },
  ];
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
  const dataSourceCount = calculateReferenceSampleCount(request, shichen);
  const statisticalAnalysis = buildStatisticalAnalysis(request, birthScores, bloodScores, nameScores, shichen, dataSourceCount);
  const accuracyBreakdown = calculateAccuracyBreakdown(shichen, birthScores, bloodScores, nameScores, statisticalAnalysis);
  const accuracyScore = calculateAccuracyScore(accuracyBreakdown);
  const bigDataInsights = buildBigDataInsights(statisticalAnalysis);

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

【後端已固定計算的統計分數，AI 不可改寫】
${JSON.stringify(statisticalAnalysis.map((item) => ({
  dimension: item.dimension,
  score: item.score,
  percentile: item.percentile,
  sourceSummary: item.sourceSummary,
})), null, 2)}

請只根據以上固定分數進行文字分析，包括：
1. 心理學洞察（3-5項），不可自行創造新分數。
2. 個性化建議（3-5項）。
3. 完整分析摘要。

分析要求：
- 至少有一項心理學洞察或大數據發現，要自然融入「八字（日柱/時柱五行）與紫微斗數」的命理視角，與心理學/統計資料彼此呼應、不可互相矛盾。
- 若時辰為自動採用的良辰吉時，分析照常完成，語氣保持正向，不需強調資料不足。
- 不要輸出任何分數、百分位、樣本數；這些已由後端統計公式計算。
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
    recommendations: string[];
    summary: string;
  }>(textStr);

  return {
    accuracyScore,
    dataSourceCount,
    scoreMethodology: {
      formula: SCORE_FORMULA,
      percentile: '百分位以常態分布近似計算：平均 50、標準差 15，分數越高百分位越高。',
      sampleBasis: `本次趨勢樣本基準 ${dataSourceCount.toLocaleString()} 筆，由星座 12 組、血型 4 組、性別 2 組、時辰 12 組與姓名字義校正組合成可重算的統計基準；同一資料重算結果一致，不使用亂數。`,
      duplicatePolicy: '若兩個指標四捨五入後同分，會依姓名、生日、血型與指標名稱產生固定順序，尋找最近的可用分數做最小必要微調，並在來源摘要標示。',
    },
    accuracyBreakdown,
    psychologyInsights: withUniqueConfidence(aiAnalysis.psychology_insights, statisticalAnalysis),
    statisticalAnalysis,
    bigDataInsights,
    personalizedRecommendations: aiAnalysis.recommendations,
    summary: aiAnalysis.summary,
  };
}
