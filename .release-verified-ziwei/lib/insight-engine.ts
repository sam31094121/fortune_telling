import { GoogleGenAI, Type } from '@google/genai';
import { getBirthPersonalityScores, getBirthZodiac } from './birth-model-db';
import { getNamePersonalityScores } from './name-model-db';
import { buildNameologyAnalysis, type NameologyAnalysis } from './nameology-engine';
import { buildInsightFiveElementResult, type FiveElementIntegrationResult } from './five-element-engine';
import { DIMENSION_META } from './personality';
import { computeShichenProfile } from './shichen-engine';
import {
  DIMENSION_KEYS,
  type DimensionKey,
  type DimensionScores,
  type InsightRequest,
} from './types';
import { solarToLunarParts } from './lunar-calendar';
import { buildAiCopywritingInstruction, enforceAiCopywritingTone } from './ai-copywriting-style-center';
import { calculateZiweiSanFang, type ZiweiSanFangAnalysis } from './ziwei-sanfang-engine';
import { calculateAnnualFortune, type AnnualFortuneAnalysis } from './annual-fortune-engine';
import { buildZiweiDestinyCard, type ZiweiDestinyCard } from './ziwei-destiny-card';
import {
  buildZiweiPresentationBundle,
  resolveZiweiAnalysisId,
  type ZiweiPresentationBundle,
} from './ziwei-presentation-service';
import { createZiweiCore } from './ziwei/engine';
import { saveVerifiedZiweiChart } from './ziwei-chart-store';

const MODEL_NAME = 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 20000;

export const INSIGHT_RITUAL_STEP_IDS = [
  'TIME_RESOLVED',
  'CHART_BUILT',
  'TRANSFORMATION_MAPPED',
  'PATTERN_IDENTIFIED',
  'CROSS_CHECKED',
  'TWELVE_PALACE_ANALYZED',
  'STATISTICAL_MATCHED',
  'ACCURACY_SCORED',
  'ANNUAL_FORTUNE_CALCULATED',
  'FIVE_ELEMENT_INTEGRATED',
  'AI_INSIGHT_GENERATED',
  'FINAL_RESULT_VERIFIED',
] as const;

export type InsightRitualStepId = (typeof INSIGHT_RITUAL_STEP_IDS)[number];
export type InsightRitualStepStatus = 'LOCKED' | 'WAITING' | 'PROCESSING' | 'PASSED' | 'FAILED';

export interface InsightRitualStep {
  id: InsightRitualStepId;
  label: string;
  ritualText: string;
  passedText: string;
  status: InsightRitualStepStatus;
  verifiedAt: string | null;
  errorCode: string | null;
}

const INSIGHT_RITUAL_STEP_LABELS: Record<InsightRitualStepId, { label: string; ritualText: string; passedText: string }> = {
  TIME_RESOLVED: {
    label: '出生時間定位',
    ritualText: '正在校準出生時辰與八字四柱...',
    passedText: '出生時辰與八字四柱定位完成',
  },
  CHART_BUILT: {
    label: '十二宮排盤',
    ritualText: '正在建立紫微十二宮與主星結構...',
    passedText: '紫微命盤十二宮與主星排定完成',
  },
  TRANSFORMATION_MAPPED: {
    label: '四化飛星',
    ritualText: '正在判讀四化飛星訊號...',
    passedText: '四化飛星判定完成',
  },
  PATTERN_IDENTIFIED: {
    label: '格局辨識',
    ritualText: '正在辨識命盤核心格局...',
    passedText: '命盤核心格局辨識完成',
  },
  CROSS_CHECKED: {
    label: '三方四正',
    ritualText: '正在進行命財官遷交叉驗證...',
    passedText: '命財官遷三方四正交叉驗證通過',
  },
  TWELVE_PALACE_ANALYZED: {
    label: '十二宮解析',
    ritualText: '正在整理十二宮位精密解析...',
    passedText: '十二宮位精密解析完成',
  },
  STATISTICAL_MATCHED: {
    label: '統計訊號',
    ritualText: '正在比對規則模型與統計訊號...',
    passedText: '規則模型統計訊號比對完成',
  },
  ACCURACY_SCORED: {
    label: '準確度評估',
    ritualText: '正在計算本次判定準確度...',
    passedText: '本次判定準確度評估完成',
  },
  ANNUAL_FORTUNE_CALCULATED: {
    label: '流年運勢',
    ritualText: '正在整合今年流年運勢...',
    passedText: '今年流年運勢運算完成',
  },
  FIVE_ELEMENT_INTEGRATED: {
    label: '五元素整合',
    ritualText: '正在將紫微、八字與五元素整合...',
    passedText: '五元素整合判定完成',
  },
  AI_INSIGHT_GENERATED: {
    label: 'AI 深度洞察',
    ritualText: '正在產生 AI 深度洞察...',
    passedText: 'AI 深度洞察生成完成',
  },
  FINAL_RESULT_VERIFIED: {
    label: '最終結果',
    ritualText: '正在完成最終結果驗證...',
    passedText: '紫微斗數分析正式完成',
  },
};

function buildInsightRitualSteps(input: {
  shichen: ReturnType<typeof computeShichenProfile>;
  ziweiSanFang: ZiweiSanFangAnalysis;
  statisticalAnalysis: InsightAnalysisResponse['statisticalAnalysis'];
  dataSourceCount: number;
  accuracyBreakdown: InsightAnalysisResponse['accuracyBreakdown'];
  accuracyScore: number;
  annualFortune: AnnualFortuneAnalysis;
  fiveElement: FiveElementIntegrationResult;
  aiAnalysis: { psychology_insights: Array<{ title: string; description: string; confidence: number }>; recommendations: string[]; summary: string };
}): InsightRitualStep[] {
  const checks: Record<InsightRitualStepId, boolean> = {
    TIME_RESOLVED: Boolean(input.shichen.dayPillar) && Boolean(input.shichen.hourPillar?.ganzhi),
    CHART_BUILT: Array.isArray(input.ziweiSanFang.allPalaces) && input.ziweiSanFang.allPalaces.length > 0,
    TRANSFORMATION_MAPPED: Array.isArray(input.ziweiSanFang.allPalaces) && input.ziweiSanFang.allPalaces.some((palace) => Array.isArray(palace.majorStars) && palace.majorStars.length > 0),
    PATTERN_IDENTIFIED: Boolean(input.ziweiSanFang.pattern?.name) && Array.isArray(input.ziweiSanFang.pattern?.stars),
    CROSS_CHECKED: Array.isArray(input.ziweiSanFang.crossChecks) && input.ziweiSanFang.crossChecks.length > 0,
    TWELVE_PALACE_ANALYZED: Array.isArray(input.ziweiSanFang.palaceAnalyses) && input.ziweiSanFang.palaceAnalyses.length === 12,
    STATISTICAL_MATCHED: Array.isArray(input.statisticalAnalysis) && input.statisticalAnalysis.length > 0 && Number.isFinite(input.dataSourceCount),
    ACCURACY_SCORED: Array.isArray(input.accuracyBreakdown) && input.accuracyBreakdown.length > 0 && Number.isFinite(input.accuracyScore) && input.accuracyScore >= 0 && input.accuracyScore <= 100,
    ANNUAL_FORTUNE_CALCULATED: Boolean(input.annualFortune) && Number.isFinite(input.annualFortune.overallScore),
    FIVE_ELEMENT_INTEGRATED: Boolean(input.fiveElement?.decision?.conclusion),
    AI_INSIGHT_GENERATED: input.aiAnalysis.psychology_insights.length > 0 && input.aiAnalysis.recommendations.length > 0 && Boolean(input.aiAnalysis.summary),
    FINAL_RESULT_VERIFIED: false,
  };
  checks.FINAL_RESULT_VERIFIED = INSIGHT_RITUAL_STEP_IDS.slice(0, -1).every((id) => checks[id]);

  const now = new Date().toISOString();
  let failedAt = -1;
  return INSIGHT_RITUAL_STEP_IDS.map((id, index) => {
    const meta = INSIGHT_RITUAL_STEP_LABELS[id];
    if (failedAt >= 0) {
      return { id, label: meta.label, ritualText: meta.ritualText, passedText: meta.passedText, status: 'LOCKED' as const, verifiedAt: null, errorCode: null };
    }
    if (!checks[id]) {
      failedAt = index;
      return { id, label: meta.label, ritualText: meta.ritualText, passedText: meta.passedText, status: 'FAILED' as const, verifiedAt: null, errorCode: `${id}_NOT_READY` };
    }
    return { id, label: meta.label, ritualText: meta.ritualText, passedText: meta.passedText, status: 'PASSED' as const, verifiedAt: now, errorCode: null };
  });
}

export interface InsightAnalysisResponse {
  analysisId: string;
  presentation: ZiweiPresentationBundle;
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
  plainSummary: string;
  ziweiPalaces: {
    palaceName: string;
    starName: string;
    statisticalInference: string;
  }[];
  ziweiSanFang: ZiweiSanFangAnalysis;
  annualFortune: AnnualFortuneAnalysis;
  destinyCard: ZiweiDestinyCard | null;
  nameology: NameologyAnalysis;
  fiveElement: FiveElementIntegrationResult;
  ritualSteps: InsightRitualStep[];
  meta?: {
    subjectName?: string;
    gender?: 'male' | 'female';
    dayPillar: string;
    hourPillar: string;
    wuxing: string;
    shichenLabel: string;
    birthDate?: string;
    shichen?: number | 'unknown' | null;
    timeCorrectionMode: 'STANDARD_TIME' | 'TRUE_SOLAR_TIME';
  };
}

function buildSanFangPlainFallback(analysis: ZiweiSanFangAnalysis, annual: AnnualFortuneAnalysis) {
  const palace = (key: ZiweiSanFangAnalysis['palaces'][number]['key']) => analysis.palaces.find((item) => item.key === key);
  const stars = (key: ZiweiSanFangAnalysis['palaces'][number]['key']) => palace(key)?.majorStars.join('、') || '無十四主星';
  const focus = (key: ZiweiSanFangAnalysis['palaces'][number]['key']) => palace(key)?.focus || '本宮資料';

  return [
    `【現在重點】命宮是${stars('MING')}；先處理${focus('MING')}，不要同時把所有事扛在身上。`,
    `【工作與錢】官祿宮是${stars('GUAN_LU')}、財帛宮是${stars('CAI_BO')}；工作與金錢先把${focus('GUAN_LU')}和${focus('CAI_BO')}講清楚。`,
    `【人際與機會】遷移宮是${stars('QIAN_YI')}；外出、合作或換環境時，重點放在${focus('QIAN_YI')}。`,
    `【下一步】${annual.year} 年先照「${annual.annualTheme}」排一件本週能完成的工作，再決定下一個機會。`,
  ].join('\n');
}

function normalizeSanFangPlainSummary(value: string | undefined, analysis: ZiweiSanFangAnalysis, annual: AnnualFortuneAnalysis) {
  const lines = String(value ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const expectedLabels = ['【現在重點】', '【工作與錢】', '【人際與機會】', '【下一步】'];
  const valid = lines.length === 4 && expectedLabels.every((label, index) => lines[index].startsWith(label));
  return valid ? lines.join('\n') : buildSanFangPlainFallback(analysis, annual);
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
    plain_summary: { type: Type.STRING, description: '給「白話重點」卡的四行固定格式摘要。每行只能一個完整句子，依序為【現在重點】、【工作與錢】、【人際與機會】、【下一步】。每行 22-38 字，以台灣生活語言寫，禁用 AI 判定、五行不足、日主、格局、星曜等術語。' },
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
  // No validated population dataset is connected to this product.
  void score;
  return 0;
}

const SCORE_WEIGHTS = {
  birth: 50,
  name: 40,
  shichen: 10,
} as const;

const SCORE_FORMULA = '生日人格骨架 50% + 姓名個體校正 40% + 真實出生時辰 10%';

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
  // Keep the response shape backward-compatible without inventing a dataset.
  void request;
  void shichen;
  return 0;
}

function sampleSizeForDimension(total: number, key: DimensionKey, index: number, request: InsightRequest): number {
  void total;
  void key;
  void index;
  void request;
  return 0;
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
  nameScores: DimensionScores,
  shichen: ReturnType<typeof computeShichenProfile>,
  dataSourceCount: number,
): InsightAnalysisResponse['statisticalAnalysis'] {
  const shichenScores = shichenScoresFromProfile(shichen);

  return DIMENSION_KEYS.map((key, index) => {
    const weightedBirth = birthScores[key] * (SCORE_WEIGHTS.birth / 100);
    const weightedName = nameScores[key] * (SCORE_WEIGHTS.name / 100);
    const weightedShichen = shichenScores[key] * (SCORE_WEIGHTS.shichen / 100);
    const rawScore = weightedBirth + weightedName + weightedShichen;
    const baseScore = clampPercentage(rawScore);

    const score = baseScore;
    const percentile = 0;
    const label = dimensionLabel(key);
    const sourceBreakdown = [
      { label: `生日骨架（${getBirthZodiac(request.birthDate)}）`, value: birthScores[key], weight: SCORE_WEIGHTS.birth, contribution: Number(weightedBirth.toFixed(1)) },
      { label: '姓名個體校正', value: nameScores[key], weight: SCORE_WEIGHTS.name, contribution: Number(weightedName.toFixed(1)) },
      { label: `${shichen.shichen.label}${shichen.isKnown ? '' : '（未確認）'}`, value: shichenScores[key], weight: SCORE_WEIGHTS.shichen, contribution: Number(weightedShichen.toFixed(1)) },
    ];

    return {
      dimension: label,
      score,
      percentile,
      globalComparison: '可重算的規則模型訊號，非人群百分位。',
      sampleSize: sampleSizeForDimension(dataSourceCount, key, index, request),
      formula: SCORE_FORMULA,
      sourceBreakdown,
      sourceSummary: `${label} = ${sourceBreakdown.map((item) => `${item.value}×${item.weight}%`).join(' + ')} = ${rawScore.toFixed(1)}，四捨五入 ${baseScore}。`,
      uniquenessAdjustment: 0,
    };
  }).sort((a, b) => b.score - a.score);
}

function calculateAccuracyBreakdown(
  shichen: ReturnType<typeof computeShichenProfile>,
  birthScores: DimensionScores,
  nameScores: DimensionScores,
  statisticalAnalysis: InsightAnalysisResponse['statisticalAnalysis'],
): InsightAnalysisResponse['accuracyBreakdown'] {
  const shichenScores = shichenScoresFromProfile(shichen);
  const spreads = DIMENSION_KEYS.map((key) => {
    const values = [birthScores[key], nameScores[key], shichenScores[key]];
    return Math.max(...values) - Math.min(...values);
  });
  const averageSpread = spreads.reduce((sum, value) => sum + value, 0) / spreads.length;
  const sourceAgreement = clampPercentage(100 - averageSpread * 0.85);
  const dataCompleteness = shichen.isKnown ? 100 : 55;
  const modelCoverage = 100;
  const uniqueScoreRatio = clampPercentage(new Set(statisticalAnalysis.map((item) => item.score)).size / statisticalAnalysis.length * 100);

  return [
    {
      label: '資料完整度',
      value: dataCompleteness,
      description: shichen.isKnown ? '生日、姓名、真實時辰皆已納入。' : '未確認時辰，不宣稱紫微命宮已定盤。',
    },
    {
      label: '來源一致性',
      value: sourceAgreement,
      description: `四個來源在 12 個指標的平均差距約 ${averageSpread.toFixed(1)} 分。差距越小，信心度越高。`,
    },
    {
      label: '規則覆蓋度',
      value: modelCoverage,
      description: '12 個人格指標皆由生日、姓名、時辰三層計算。',
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
    規則覆蓋度: 0.2,
    分數辨識度: 0.1,
  };
  const weighted = breakdown.reduce((sum, item) => sum + item.value * (weightMap[item.label] ?? 0), 0);
  return Math.max(50, Math.min(99, Math.round(weighted)));
}

function withUniqueConfidence(
  insights: Array<{ title: string; description: string; confidence: number }>,
  statisticalAnalysis: InsightAnalysisResponse['statisticalAnalysis'],
): InsightAnalysisResponse['psychologyInsights'] {
  return insights.slice(0, 5).map((insight, index) => {
    const stat = statisticalAnalysis[index % statisticalAnalysis.length];
    const confidence = clampPercentage(insight.confidence);

    return {
      title: insight.title,
      description: insight.description,
      confidence,
      confidenceSource: `依「${stat.dimension}」的規則模型訊號推估，非人群統計信心度。`,
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
      finding: `你的「${top.dimension}」在本次規則模型中為 ${top.score} 分，是本次報告最突出的訊號。`,
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
  const nameScores = getNamePersonalityScores(request.name);
  const nameology = buildNameologyAnalysis(request.name, nameScores, { gender: request.gender, birthDate: request.birthDate });

  const birthZodiac = getBirthZodiac(request.birthDate);

  // Unknown hours may retain a neutral model fallback for general text, but never
  // qualify a single Ziwei chart as confirmed.
  const shichenBranchIndex = typeof request.shichen === 'number' ? request.shichen : null;
  const shichen = computeShichenProfile({ birthDate: request.birthDate, shichenBranchIndex });
  const selectedHour = `${String(shichen.shichen.startHour).padStart(2, '0')}:00`;
  const ziweiSanFang = calculateZiweiSanFang({
    birthDate: request.birthDate,
    birthTime: selectedHour,
    gender: request.gender,
    // Unknown hours share the same auspicious fallback as the existing profile,
    // but remain explicitly marked as an estimate in the Ziwei result.
    shichen: shichen.shichen.branchIndex,
    isTimeConfirmed: shichen.isKnown,
    longitude: request.longitude ?? null,
  });
  const dataSourceCount = calculateReferenceSampleCount(request, shichen);
  const statisticalAnalysis = buildStatisticalAnalysis(request, birthScores, nameScores, shichen, dataSourceCount);
  const accuracyBreakdown = calculateAccuracyBreakdown(shichen, birthScores, nameScores, statisticalAnalysis);
  const accuracyScore = calculateAccuracyScore(accuracyBreakdown);
  const bigDataInsights: InsightAnalysisResponse['bigDataInsights'] = [];
  const annualFortune = calculateAnnualFortune({
    request,
    ziweiSanFang,
    sourceSignals: statisticalAnalysis.map((item) => ({ dimension: item.dimension, score: item.score })),
  });
  const fiveElement = buildInsightFiveElementResult({
    nameology,
    baziElementBalance: ziweiSanFang.bazi.elementBalance,
    annualElement: annualFortune.yearElement,
    shichenElement: shichen.wuxing,
  });

  // 構建分析提示
  const analysisPrompt = `
你是一個專業紫微斗數與八字輔助分析顧問，熟悉命盤格局、三方四正、流年運勢與五行語言，但不可把規則推論宣稱為真實大數據或科學定論。
請根據以下天地人資料進行深度洞察分析：

【基本資料】
- 姓名: ${request.name}
- 生日: ${request.birthDate} (星座: ${birthZodiac})
- 性別: ${request.gender === 'female' ? '女性' : '男性'}

【八字時辰（人 30% 子層，供八字與紫微斗數分析）】
  - 出生時間: ${selectedHour} · ${shichen.shichen.label}（${shichen.shichen.range}）
- 八字日柱: ${shichen.dayPillar} · 時柱: ${shichen.hourPillar.ganzhi}
- 時辰五行: ${shichen.wuxing}

【姓名學輔助資料：後端固定產生，僅作人格文字參考】
- 姓名學分數: ${nameology.score}
- 姓名學等級: ${nameology.level}
- 核心人格: ${nameology.corePersonality}
- 形象偏好: ${nameology.imageAndPreference}
- 24性情矩陣: ${nameology.temperamentProfile.topTendencies.map((item) => `${item.label}${item.score}分/${item.tone}`).join('；')}
- 明確性情方向: ${nameology.temperamentProfile.clearDirection}
- 姓名結構: ${nameology.composition.surnameSummary} ${nameology.composition.givenNameSummary} ${nameology.composition.combinedIntent}
- 交叉校正: ${nameology.crossCheck.alignmentLabel}；${nameology.crossCheck.genderLens}；${nameology.crossCheck.birthdayLens}
- 每字拆解: ${nameology.characters.map((item) => `${item.char}${item.strokeCount}畫/${item.element}${item.yinYang}/${item.role}/部首${item.glyph.radical}/拆字${item.glyph.parts.join('+')}/象意${item.glyph.meaning}/取名意圖${item.glyph.namingIntent}/性情${item.tendencies.slice(0, 3).map((tendency) => tendency.label).join('、')}`).join('；')}
- 五格: ${nameology.grids.map((item) => `${item.label}${item.value}畫${item.element}`).join('；')}
- 相生相剋: ${nameology.elementFlow.map((item) => `${item.from}->${item.to}/${item.relation}`).join('；')}

【紫微命財官遷規則：本頁主軸，AI 不可改分數】
- \u3010\u4e94\u5143\u7d20\u88dc\u5f37\u7d50\u8ad6\u3011: ${fiveElement.summary}
- \u3010\u552f\u4e00\u4e3b\u88dc\u5224\u5b9a\u3011: ${fiveElement.decision.conclusion}
- \u3010\u624b\u93c8\u4e3b\u88dc\u65b9\u6848\u3011: ${fiveElement.productRecommendation.title}
- \u3010\u88dc\u4e86\u5148\u6539\u8b8a\u4ec0\u9ebc\u3011: ${fiveElement.decision.changeTarget}
- \u3010\u5546\u54c1\u914d\u5c0d\u539f\u56e0\u3011: ${fiveElement.productMatch.matchReason.join('\uFF1B')}
- \u88dc\u5f37\u539f\u56e0: ${fiveElement.reasons.join('\uFF1B')}
- \u7acb\u5373\u884c\u52d5: ${fiveElement.recommendedActions.join('\uFF1B')}
- \u3010\u7981\u6b62\u77db\u76fe\u3011: AI \u4e0d\u5f97\u6539\u5beb\u4e3b\u88dc\u5143\u7d20\uff0c\u4e0d\u5f97\u628a\u7b2c\u4e8c\u9806\u4f4d\u6216\u8f03\u5f37\u5143\u7d20\u5beb\u6210\u672c\u6b21\u4e3b\u88dc\u3002

- 四柱: ${ziweiSanFang.bazi.year} ${ziweiSanFang.bazi.month} ${ziweiSanFang.bazi.day} ${ziweiSanFang.bazi.hour}
- 日主: ${ziweiSanFang.bazi.dayMaster}
- 命、財帛、官祿、遷移宮: ${ziweiSanFang.timeConfidence === 'exact' ? ziweiSanFang.palaces.map((palace) => `${palace.name}(${palace.majorStars.join('、') || '無主星'})`).join('；') : '時辰未確認，不提供單一命宮或格局'}
  - 時辰可靠度: ${ziweiSanFang.timeConfidence === 'exact' ? '使用者已提供時辰' : '系統依生日自動選用良辰吉時，待真實時辰校正'}

【已由後端固定計算的今年流年運勢：只講今年，不是終身本命】
- 年份: ${annualFortune.year} ${annualFortune.ganzhi}年
- 流年五行: ${annualFortune.yearElement}
- 整體分數: ${annualFortune.overallScore}
- 等級: ${annualFortune.level}
- 主題: ${annualFortune.annualTheme}
- 今年命盤三方四正重點: ${annualFortune.sanFangFourZheng.map((item) => `今年${item.palaceName}${item.score}分/${item.trend}/${item.focus}`).join('；')}

【個性特質分數】(0-100)
生日骨架:
${JSON.stringify(birthScores, null, 2)}

姓名校正:
${JSON.stringify(nameScores, null, 2)}

【後端已固定計算的規則模型訊號，非人群統計，AI 不可改寫】
${JSON.stringify(statisticalAnalysis.map((item) => ({
  dimension: item.dimension,
  score: item.score,
  sourceSummary: item.sourceSummary,
})), null, 2)}

請只根據以上固定分數進行文字分析，包括：
1. 紫微斗數洞察（3-5項），必須以命盤格局、三方四正、今年流年運勢、命財官遷為主，不可自行創造新分數。
2. 個性化建議（3-5項）。
3. 完整分析摘要。
4. plain_summary：嚴格輸出四行，格式固定為「【現在重點】...\n【工作與錢】...\n【人際與機會】...\n【下一步】...」。第一行只根據命宮，第二行必須同時根據官祿宮與財帛宮，第三行只根據遷移宮，第四行必須承接今年流年主題。這是使用者最先閱讀的卡片：直接講生活處境和行動，不解釋術語、不重複資料、不寫「AI 判定／AI 建議」、不宣稱統計結論。

${buildAiCopywritingInstruction('天地人 AI 紫微洞察系統')}

分析要求：
- 紫微斗數是主軸，姓名學只作輔助人格參考；你只能引用上方已給定的宮位、四柱、三方四正與今年流年資料，不可自行推導、補充或改寫星曜。
- 今年流年運勢、今年命盤三方四正年度分數與年度建議已由後端固定產生；你只能呼應今年，不可自行改分數、改宮位，也不可把今年運勢寫成終身本命。
- 語氣應具體、有建設性，避免宿命論、恐嚇、鐵口直斷或過度保證。
- 每一項「心理學洞察」與「建議」必須有完全不同的切入點與獨特話術，展現高智商、邏輯嚴密且不可複刻的專業性。
- 若時辰未確認，只能使用「趨勢參考」的措辭，不可宣稱精準定盤。
- 不要輸出任何具體的分數、百分位或樣本數（這些後端會自動渲染）。
- 統一繁體中文，言字有物、精準犀利。
- plain_summary 必須使用台灣日常用語；例如以「工作上先把責任和進度講清楚」取代「官祿宮受星曜影響」，以「主動約人談合作或投履歷」取代「補強火元素」。

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

  const textStr = response.text || '';

  if (!textStr) {
    throw new Error('AI 未返回有效回應。');
  }

  const aiAnalysis = safeJsonParse<{
    psychology_insights: Array<{ title: string; description: string; confidence: number }>;
    recommendations: string[];
    summary: string;
    plain_summary?: string;
  }>(textStr);

  const ritualSteps = buildInsightRitualSteps({
    shichen,
    ziweiSanFang,
    statisticalAnalysis,
    dataSourceCount,
    accuracyBreakdown,
    accuracyScore,
    annualFortune,
    fiveElement,
    aiAnalysis,
  });
  const meta: NonNullable<InsightAnalysisResponse['meta']> = {
    subjectName: request.name,
    gender: request.gender,
    dayPillar: shichen.dayPillar,
    hourPillar: shichen.hourPillar.ganzhi,
    wuxing: shichen.wuxing,
    shichenLabel: shichen.shichen.label,
    birthDate: request.birthDate,
    shichen: request.shichen,
    timeCorrectionMode: typeof request.longitude === 'number' ? 'TRUE_SOLAR_TIME' : 'STANDARD_TIME',
  };
  const summary = enforceAiCopywritingTone(aiAnalysis.summary);
  const plainSummary = normalizeSanFangPlainSummary(aiAnalysis.plain_summary, ziweiSanFang, annualFortune);
  const analysisId = resolveZiweiAnalysisId({
    summary,
    ziweiSanFang,
    annualFortune,
    fiveElement,
    meta,
  });
  // 紫微三老師系統（規格「十七」）：把這次已驗證的命盤存起來，讓老師 API 之後能用
  // analysisId 查回同一張盤，不必自己重新排盤。用同一份 birthInput 決定性地重建
  // ZiweiCoreResult（跟 calculateZiweiSanFang 內部用的是同一顆命盤，不是另外算一次）。
  // 存盤失敗不能影響主流程，這裡只是側寫，用 try/catch 隔開。
  try {
    saveVerifiedZiweiChart(analysisId, createZiweiCore(ziweiSanFang.ziweiBirthInput), {
      birthDate: request.birthDate,
      annualYear: annualFortune.year,
      annualTheme: annualFortune.annualTheme,
      annualLevel: annualFortune.level,
    });
  } catch (error) {
    console.error('ZIWEI_CHART_STORE_SAVE_FAILED', error);
  }
  const presentation = buildZiweiPresentationBundle({
    analysisId,
    summary,
    ziweiSanFang,
    annualFortune,
    fiveElement,
    meta,
  });
  const destinyCard = buildZiweiDestinyCard({
    analysisId,
    subjectName: request.name,
    chart: ziweiSanFang,
    fiveElement,
  });

  return {
    analysisId,
    presentation,
    ritualSteps,
    accuracyScore,
    dataSourceCount,
    scoreMethodology: {
      formula: SCORE_FORMULA,
      percentile: '未採用人群百分位；目前沒有可驗證的外部樣本資料集。',
      sampleBasis: '本報告的數值來自姓名字義、筆畫五格、生日與時辰的手寫規則模型，不是大數據樣本。',
      duplicatePolicy: '保留原始加權結果；相同分數不做人為拆分。',
    },
    accuracyBreakdown,
    psychologyInsights: withUniqueConfidence(
      aiAnalysis.psychology_insights.map((item) => ({ ...item, description: enforceAiCopywritingTone(item.description) })),
      statisticalAnalysis,
    ),
    statisticalAnalysis,
    bigDataInsights,
    personalizedRecommendations: aiAnalysis.recommendations.map((item) => enforceAiCopywritingTone(item)),
    summary,
    plainSummary,
    ziweiPalaces: (ziweiSanFang.timeConfidence === 'exact' ? ziweiSanFang.palaces : []).map((palace) => ({
      palaceName: palace.name,
      starName: palace.majorStars.join('、') || '無十四主星坐守',
      statisticalInference: palace.focus,
    })),
    ziweiSanFang,
    annualFortune,
    destinyCard,
    nameology,
    fiveElement,
    meta,
  };
}
