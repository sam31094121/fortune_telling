import type { FiveElementIntegrationResult } from './five-element-engine';

export const ZIWEI_USER_MODE = 'MEMBER' as const;
export const ZIWEI_TEACHER_MODE = 'PROFESSIONAL' as const;

export const ZIWEI_CARD_TYPES = {
  SUMMARY_CARD: 'SUMMARY_CARD',
  DETAIL_CARD: 'DETAIL_CARD',
  PROFESSIONAL_DETAIL_CARD: 'PROFESSIONAL_DETAIL_CARD',
} as const;

export type ZiweiUserMode = typeof ZIWEI_USER_MODE;
export type ZiweiTeacherMode = typeof ZIWEI_TEACHER_MODE;
export type ZiweiCardType = (typeof ZIWEI_CARD_TYPES)[keyof typeof ZIWEI_CARD_TYPES];

type ZiweiPalaceLike = {
  key?: string;
  name?: string;
  focus?: string;
  branch?: string;
  palaceStem?: string;
  majorStars?: string[];
  minorStars?: string[];
  transformations?: string[];
};

type ZiweiPatternLike = {
  name?: string;
  description?: string;
  basis?: string;
  stars?: string[];
};

type ZiweiSanFangLike = {
  methodVersion?: string;
  ruleVersion?: string;
  timeConfidence?: 'exact' | 'estimated';
  dataCompleteness?: number;
  summary?: string;
  pattern?: ZiweiPatternLike;
  palaces?: ZiweiPalaceLike[];
  allPalaces?: ZiweiPalaceLike[];
  palaceAnalyses?: unknown[];
  crossChecks?: unknown[];
};

type AnnualFortuneLike = {
  year?: number;
  annualTheme?: string;
  overallScore?: number;
  level?: string;
  recommendations?: string[];
  motivation?: { actionAdvice?: string };
  sanFangFourZheng?: unknown[];
  ruleVersion?: string;
};

export type ZiweiPresentationSource = {
  analysisId?: string;
  summary?: string;
  ziweiSanFang?: ZiweiSanFangLike;
  annualFortune?: AnnualFortuneLike;
  fiveElement?: FiveElementIntegrationResult;
  meta?: {
    birthDate?: string;
    shichenLabel?: string;
    timeCorrectionMode?: 'STANDARD_TIME' | 'TRUE_SOLAR_TIME';
  };
};

export type ZiweiPresentationBundle = {
  analysisId: string;
  modes: {
    member: ZiweiUserMode;
    professional: ZiweiTeacherMode;
  };
  memberSummary: {
    cardType: typeof ZIWEI_CARD_TYPES.SUMMARY_CARD;
    title: string;
    coreJudgment: string;
    coreReason: string;
    immediateAction: string;
    canonicalMeaning: string;
  };
  memberDetail: {
    cardType: typeof ZIWEI_CARD_TYPES.DETAIL_CARD;
    coreTheme: string;
    strengths: string[];
    blindSpots: string[];
    currentFocus: string;
    evidence: string[];
  };
  professionalDetail: {
    cardType: typeof ZIWEI_CARD_TYPES.PROFESSIONAL_DETAIL_CARD;
    patternName: string;
    timeConfidence: 'exact' | 'estimated' | 'unknown';
    dataCompleteness: number;
    twelvePalaceCount: number;
    crossCheckCount: number;
    palaceAnalysisCount: number;
    majorStars: string[];
    transformations: string[];
    engineVersion: string;
    ruleVersion: string;
    annualYear: number | null;
    evidence: string[];
  };
  sourceIntegrity: {
    singleAnalysisId: true;
    readsProfessionalResultOnly: true;
    summaryDoesNotRecalculate: true;
  };
};

function normalizeText(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const clean = value.trim().replace(/\s+/g, ' ');
  return clean.length > 0 ? clean : fallback;
}

function uniqueNonEmpty(items: Array<string | undefined | null>, limit = 6) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items) {
    const clean = normalizeText(item, '');
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    output.push(clean);
    if (output.length >= limit) break;
  }
  return output;
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
}

export function resolveZiweiAnalysisId(source: ZiweiPresentationSource) {
  if (source.analysisId) return source.analysisId;
  const seed = [
    source.meta?.birthDate,
    source.meta?.shichenLabel,
    source.meta?.timeCorrectionMode,
    source.ziweiSanFang?.pattern?.name,
    source.ziweiSanFang?.methodVersion,
    source.annualFortune?.year,
  ]
    .map((item) => String(item ?? 'NA'))
    .join('|');
  return `ZIWEI-${stableHash(seed)}`;
}

function collectPalaces(source: ZiweiPresentationSource) {
  const analysis = source.ziweiSanFang;
  return analysis?.allPalaces?.length ? analysis.allPalaces : analysis?.palaces ?? [];
}

function collectMajorStars(source: ZiweiPresentationSource) {
  return uniqueNonEmpty(collectPalaces(source).flatMap((palace) => palace.majorStars ?? []), 8);
}

function collectTransformations(source: ZiweiPresentationSource) {
  return uniqueNonEmpty(collectPalaces(source).flatMap((palace) => palace.transformations ?? []), 8);
}

function buildCanonicalMeaning(source: ZiweiPresentationSource) {
  const patternName = normalizeText(source.ziweiSanFang?.pattern?.name, '紫微命盤');
  const stars = collectMajorStars(source);
  const sourceText = [
    patternName,
    source.ziweiSanFang?.summary,
    source.annualFortune?.annualTheme,
    source.fiveElement?.decision?.conclusion,
    source.fiveElement?.decision?.changeTarget,
    ...stars,
  ].join(' ');

  if (/七殺|破軍|貪狼|殺破狼|突破|變動|開創/.test(sourceText)) {
    return {
      title: '突破與重整',
      canonicalMeaning: '變動中建立方向',
      coreJudgment: '你現在最需要把變動整理成行動順序。',
      coreReason: '命盤訊號偏向開創與調整，先定順序，能把壓力轉成推進力。',
      immediateAction: '今天先完成一件最重要的事。',
    };
  }

  if (/穩|守|制度|財|資源|累積|責任/.test(sourceText)) {
    return {
      title: '穩定與累積',
      canonicalMeaning: '用節奏累積可信任的成果',
      coreJudgment: '你現在最需要建立穩定節奏。',
      coreReason: '命盤訊號偏向資源累積與責任管理，穩住節奏就會放大成果。',
      immediateAction: '先整理本週責任與時間表。',
    };
  }

  if (/說|表達|人際|合作|關係|溝通|舞台/.test(sourceText)) {
    return {
      title: '表達與連結',
      canonicalMeaning: '用清楚表達建立信任',
      coreJudgment: '你現在最需要把想法說得更清楚。',
      coreReason: '命盤訊號偏向互動與號召，表達越清楚，人際支持越容易出現。',
      immediateAction: '把一個想法寫成三句話。',
    };
  }

  return {
    title: '定位與修正',
    canonicalMeaning: '先看清方向，再調整步伐',
    coreJudgment: '你現在最需要先校準方向。',
    coreReason: '命盤訊號顯示可走的路很多，先確認主軸，後續行動才不會分散。',
    immediateAction: '先選一個最想改善的方向。',
  };
}

export function buildZiweiPresentationBundle(source: ZiweiPresentationSource): ZiweiPresentationBundle {
  const analysisId = resolveZiweiAnalysisId(source);
  const analysis = source.ziweiSanFang;
  const palaces = collectPalaces(source);
  const majorStars = collectMajorStars(source);
  const transformations = collectTransformations(source);
  const semantic = buildCanonicalMeaning(source);
  const patternName = normalizeText(analysis?.pattern?.name, '紫微命盤');
  const annualTheme = normalizeText(source.annualFortune?.annualTheme, '今年先以穩定節奏完成主要任務');
  const firstAction = uniqueNonEmpty(
    [
      source.fiveElement?.decision?.changeTarget,
      source.annualFortune?.motivation?.actionAdvice,
      ...(source.annualFortune?.recommendations ?? []),
      ...(source.fiveElement?.recommendedActions ?? []),
      semantic.immediateAction,
    ],
    1,
  )[0];

  return {
    analysisId,
    modes: {
      member: ZIWEI_USER_MODE,
      professional: ZIWEI_TEACHER_MODE,
    },
    memberSummary: {
      cardType: ZIWEI_CARD_TYPES.SUMMARY_CARD,
      title: semantic.title,
      coreJudgment: semantic.coreJudgment,
      coreReason: semantic.coreReason,
      immediateAction: normalizeText(firstAction, semantic.immediateAction),
      canonicalMeaning: semantic.canonicalMeaning,
    },
    memberDetail: {
      cardType: ZIWEI_CARD_TYPES.DETAIL_CARD,
      coreTheme: patternName,
      strengths: uniqueNonEmpty([analysis?.pattern?.basis, source.fiveElement?.decision?.conclusion, annualTheme], 3),
      blindSpots: uniqueNonEmpty([source.fiveElement?.decision?.changeTarget, source.summary], 3),
      currentFocus: annualTheme,
      evidence: uniqueNonEmpty(
        [
          `十二宮資料 ${palaces.length || 0} 宮`,
          `交叉驗證 ${analysis?.crossChecks?.length ?? 0} 項`,
          analysis?.timeConfidence === 'exact' ? '出生時辰已確認' : '出生時辰為估算，專業盤僅作方向參考',
        ],
        3,
      ),
    },
    professionalDetail: {
      cardType: ZIWEI_CARD_TYPES.PROFESSIONAL_DETAIL_CARD,
      patternName,
      timeConfidence: analysis?.timeConfidence ?? 'unknown',
      dataCompleteness: Number.isFinite(analysis?.dataCompleteness) ? Number(analysis?.dataCompleteness) : 0,
      twelvePalaceCount: palaces.length,
      crossCheckCount: analysis?.crossChecks?.length ?? 0,
      palaceAnalysisCount: analysis?.palaceAnalyses?.length ?? 0,
      majorStars,
      transformations,
      engineVersion: normalizeText(analysis?.methodVersion, 'ziwei-sanfang-engine'),
      ruleVersion: normalizeText(analysis?.ruleVersion ?? source.annualFortune?.ruleVersion, 'active-rule-set'),
      annualYear: source.annualFortune?.year ?? null,
      evidence: uniqueNonEmpty(
        [
          analysis?.summary,
          source.annualFortune?.level ? `流年等級：${source.annualFortune.level}` : null,
          source.fiveElement?.brandElement ? `五元素主軸：${source.fiveElement.brandElement}` : null,
        ],
        4,
      ),
    },
    sourceIntegrity: {
      singleAnalysisId: true,
      readsProfessionalResultOnly: true,
      summaryDoesNotRecalculate: true,
    },
  };
}
