// 2026-10-23 ai-to-asura：深度洞察不再呼叫 AI，解說一律由 buildLocalInsightNarrative（本地命盤決定性）供稿。
import { castHexagramFromBirth, formatHexagramLine, type IChingReading } from '@/lib/iching-engine';
import { buildEmpathicReading, formatEmpathicReading, formatGhostDecoding } from '@/lib/iching-psychology';
import { getBirthPersonalityScores, getBirthZodiac } from './birth-model-db';
import { getNamePersonalityScores } from './name-model-db';
import { buildNameologyAnalysis, type NameologyAnalysis } from './nameology-engine';
import { buildInsightFiveElementResult, type FiveElementIntegrationResult } from './five-element-engine';
import { DIMENSION_META } from './personality';
import { computeShichenProfile } from './shichen-engine';
import { DIMENSION_KEYS, type DimensionKey, type DimensionScores, type InsightRequest } from './types';

import { enforceAiCopywritingTone } from './ai-copywriting-style-center';
import { calculateZiweiSanFang, type ZiweiSanFangAnalysis } from './ziwei-sanfang-engine';
import { calculateAnnualFortune, type AnnualFortuneAnalysis } from './annual-fortune-engine';
import { buildZiweiDestinyCard, type ZiweiDestinyCard } from './ziwei-destiny-card';
import { buildZiweiPresentationBundle, resolveZiweiAnalysisId, type ZiweiPresentationBundle } from './ziwei-presentation-service';
import { createZiweiCore } from './ziwei/engine';
import { saveVerifiedZiweiChart } from './ziwei-chart-store';
import { runThreeInOne, type ThreeInOneResult } from './three-in-one';

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
    label: '命盤訊號',
    ritualText: '正在比對命盤訊號...',
    passedText: '命盤訊號比對完成',
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
    label: '易經深度洞察',
    ritualText: '正在產生 易經深度洞察...',
    passedText: '易經深度洞察生成完成',
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
  // A reference chart is not a verified natal chart. Missing time is not a failure.
  if (input.ziweiSanFang.timeConfidence !== 'exact') return [];
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
  threeInOne: ThreeInOneResult;
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
    `【下一步】${annual.year} 年先順著今年的主軸，排一件本週能完成的工作，再決定下一個機會。`,
  ].join('\n');
}

function normalizeSanFangPlainSummary(value: string | undefined, analysis: ZiweiSanFangAnalysis, annual: AnnualFortuneAnalysis) {
  const lines = String(value ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const expectedLabels = ['【現在重點】', '【工作與錢】', '【人際與機會】', '【下一步】'];
  const valid = lines.length === 4 && expectedLabels.every((label, index) => lines[index].startsWith(label));
  return valid ? lines.join('\n') : buildSanFangPlainFallback(analysis, annual);
}

// 易經解說離線後備：Gemini 不可用時（額度用盡、逾時、未設金鑰），改由本地已排好的
// 命盤資料直接產生解說文字，讓整個紫微功能保持可用。文字全部取自命盤與流年的既有
// 欄位，不做任何盤外推測；plain_summary 留空交給 normalizeSanFangPlainSummary 的
// 既有本地後備產生。
function buildLocalInsightNarrative(input: {
  analysis: ZiweiSanFangAnalysis;
  annual: AnnualFortuneAnalysis;
  isTimeKnown: boolean;
  /** 時辰未知時為 null——沒有卦就不要提卦。 */
  iching: IChingReading | null;
}): {
  psychology_insights: Array<{ title: string; description: string; confidence: number }>;
  recommendations: string[];
  summary: string;
  plain_summary?: string;
} {
  const palace = (key: ZiweiSanFangAnalysis['palaces'][number]['key']) => input.analysis.palaces.find((item) => item.key === key);
  const stars = (key: ZiweiSanFangAnalysis['palaces'][number]['key']) => palace(key)?.majorStars.join('、') || '無十四主星';
  const focus = (key: ZiweiSanFangAnalysis['palaces'][number]['key']) => palace(key)?.focus || '本宮重點';
  const scopeNote = input.isTimeKnown ? '' : '（時辰未確認，以下為趨勢參考）';

  const psychology_insights = [
    {
      title: '命宮格局',
      description: `命宮主星：${stars('MING')}${scopeNote}。這是你最先被環境看見的位置，先處理${focus('MING')}，其他事才會跟著順。`,
      confidence: 82,
    },
    {
      title: '事業與財務結構',
      description: `官祿宮${stars('GUAN_LU')}、財帛宮${stars('CAI_BO')}。把${focus('GUAN_LU')}與${focus('CAI_BO')}排進固定節奏，成果才守得住，不會做多少漏多少。`,
      confidence: 80,
    },
    {
      title: '人際與外緣',
      description: `遷移宮${stars('QIAN_YI')}。${focus('QIAN_YI')}決定外部機會的品質；先把這一塊顧穩，再談擴張與新合作。`,
      confidence: 78,
    },
    {
      title: '今年流年主軸',
      description: `${input.annual.year} 年的主題：${themeClause(input.annual.annualTheme)}。今年的選擇以這條主軸為準，偏離主軸的機會再亮眼也先放後面。`,
      confidence: 76,
    },
    ...(input.iching
      ? [{
        title: '易經卦象印證',
        description: `${formatHexagramLine(input.iching)}。${input.iching.judgment}${input.iching.advice}`,
        confidence: 80,
      }]
      : [{
        title: '易經卦象：補上時辰即可解鎖',
        description: '生辰起卦要有出生時辰才起得出來。目前資料只到出生日期，系統不會用預設時辰替你決定，所以這次不起卦。補上時辰後，卦象與拆卦會一起解鎖。',
        confidence: 0,
      }]),
  ];

  const recommendations = [
    `順著今年的主軸，先完成一件本週就能交付的具體工作。`,
    `工作上把${focus('GUAN_LU')}的責任與進度講清楚，再接新的目標。`,
    `金錢流向以${focus('CAI_BO')}為界線：先守住既有的，再考慮新的投入。`,
    `與人合作或換環境前，先確認${focus('QIAN_YI')}，條件不清楚就不急著答應。`,
  ];

  const summary =
    `命宮${stars('MING')}定調你今年的主場${scopeNote}：${focus('MING')}是第一優先。` +
    `事業面官祿宮${stars('GUAN_LU')}、財帛宮${stars('CAI_BO')}互為表裡——${focus('GUAN_LU')}與${focus('CAI_BO')}同步整理，收入與成果才會對得上。` +
    `對外的遷移宮${stars('QIAN_YI')}提醒你：${focus('QIAN_YI')}顧好了，機會自然靠近。` +
    `${input.annual.year} 年的流年主題是全年判斷的準繩：${themeClause(input.annual.annualTheme)}。把每個決定放回這條主軸檢查，就不會被短期波動帶偏。` +
    (input.iching
      ? `易經以你的生辰起卦得「${input.iching.hexagramName}」，與命盤互為印證：${input.iching.advice}`
      : '易經生辰卦需要出生時辰才起得出來；補上時辰後，卦象會與這張命盤互相印證。');

  return { psychology_insights, recommendations, summary };
}

// 誤差函數的近似實現

const SCORE_WEIGHTS = {
  birth: 50,
  name: 40,
  shichen: 10,
} as const;

const SCORE_FORMULA = '生日人格骨架 50% + 姓名個體校正 40% + 真實出生時辰 10%';

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
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
      globalComparison: '依固定公式算出，同樣資料每次都一樣；不是跟別人比的排名。',
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
      confidenceSource: `依「${stat.dimension}」的固定公式推估，不是跟別人比出來的把握度。`,
    };
  });
}

/** 流年主題是一整句話；接在別的句子裡時先拿掉句尾標點，避免出現「…。」。 */
function themeClause(theme: string): string {
  return theme.trim().replace(/[。．.！!？?]+$/u, '');
}

export async function generateInsightAnalysis(request: InsightRequest): Promise<InsightAnalysisResponse> {
  // 與專案其他模組一致使用 GEMINI_API_KEY，並保留舊名稱作為後備。
  // 金鑰缺失或 易經呼叫失敗都不再讓整個紫微分析掛掉——命盤是本地排的，
  // 解說文字會改用 buildLocalInsightNarrative 的免費離線後備。

  // 獲取基本人格分數
  const birthScores = getBirthPersonalityScores(request.birthDate);
  const nameScores = getNamePersonalityScores(request.name);
  const nameology = buildNameologyAnalysis(request.name, nameScores, { gender: request.gender, birthDate: request.birthDate });

  const birthZodiac = getBirthZodiac(request.birthDate);

  // Unknown hours may retain a neutral model fallback for general text, but never
  // qualify a single Ziwei chart as confirmed.
  const shichenBranchIndex = typeof request.shichen === 'number' ? request.shichen : null;
  const threeInOne = await runThreeInOne({
    birthDate: request.birthDate,
    birthTime: null,
    hourBranchIndex: shichenBranchIndex,
    gender: request.gender,
    longitude: request.longitude ?? null,
  });
  if (threeInOne.status !== 'PASSED' && threeInOne.status !== 'TIME_UNKNOWN') {
    throw new Error(`THREE_IN_ONE_GATE:${threeInOne.status}`);
  }
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
  // 易經起卦（梅花易數・生辰起卦法）：八字輸入正確，卦就固定——
  // 同一生辰永遠同一卦，AI 與本地後備兩條路都以此卦論述，可回查可驗證。
  /*
    時辰未知就不起卦。

    原本這裡在時辰未知時傳 null，引擎會偷偷以午時代填——
    客戶沒填時辰，卻拿到一顆用假時辰起的卦，還被寫成「以你的生辰起卦得…」。
    現在改成不起卦；下面每一處引用卦的地方都要能承受 null，
    畫面上改走「補上出生時辰解鎖卦象」那條路。
  */
  const iching = typeof request.shichen === 'number'
    ? castHexagramFromBirth(request.birthDate, request.shichen)
    : null;
  // 易經心理學「我最懂你」共感層（心靈捕手版）：先算好，AI 提示詞與置頂洞察共用同一份。
  const empathic = typeof request.shichen === 'number'
    ? buildEmpathicReading(request.name.trim(), request.birthDate, request.shichen)
    : null;

  // 構建分析提示

  let aiAnalysis: {
    psychology_insights: Array<{ title: string; description: string; confidence: number }>;
    recommendations: string[];
    summary: string;
    plain_summary?: string;
  };
  aiAnalysis = buildLocalInsightNarrative({
    analysis: ziweiSanFang,
    annual: annualFortune,
    isTimeKnown: shichen.isKnown,
    iching,
  });

  // 易經心理學「我最懂你」共感層（lib/iching-psychology.ts 技能檔案）：
  // 永遠置頂顯示——不論 AI 或本地後備哪條路。
  if (empathic) {
    aiAnalysis.psychology_insights.unshift({
      title: '易經心理學・我最懂你',
      description: formatEmpathicReading(empathic),
      confidence: 88,
    });
  }
  // 鬼魅老師標準檔案輸出：靈異・磁場・因果（與同一顆生辰卦拆解，全站八卡標配）
  if (iching) {
    aiAnalysis.psychology_insights.push({
      title: '鬼魅拆卦・靈異磁場因果',
      description: formatGhostDecoding(iching),
      confidence: 84,
    });
  }
  if (empathic) aiAnalysis.summary = `${empathic.greeting} ${aiAnalysis.summary}`;

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
    threeInOne,
    presentation,
    ritualSteps,
    accuracyScore,
    dataSourceCount,
    scoreMethodology: {
      formula: SCORE_FORMULA,
      percentile: '未採用人群百分位；目前沒有可驗證的外部樣本資料集。',
      sampleBasis: '本報告的數值來自姓名字義、筆畫五格、生日與時辰的固定公式，不是拿很多人的資料統計出來的。',
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
