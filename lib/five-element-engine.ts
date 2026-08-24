import type { NameologyAnalysis, NameologyElement, NameologyTendencyKey } from './nameology-engine';
import type { NumberAnalysisResponse } from './number-core-engine';
import type { ZodiacAnalysisResult, ZodiacElement } from './zodiac-engine';
import type { BloodType } from './types';
import {
  getFiveElementPositiveQuote,
  getFiveElementProductRecommendation,
  type FiveElementPositiveQuote,
  type FiveElementProductRecommendation,
} from './five-element-positive-quotes';
import { AI_CORE_JUDGEMENT_PRINCIPLE } from './ai-language-principle';
import { getProductOrbFromWuxing, type ProductOrbElement } from './five-element-orb-map';

export type FiveElementKey = 'metal' | 'wood' | 'water' | 'fire' | 'earth';
export type FiveElementDisplayName = ProductOrbElement;
export type FiveElementConfidence = 'low' | 'medium' | 'high';

export type TraditionalFiveElementCode = 'METAL' | 'WOOD' | 'WATER' | 'FIRE' | 'EARTH';
export type BrandFiveElementCode = 'SPACE' | 'AIR' | 'WATER' | 'FIRE' | 'EARTH';
export type AiCoreElementCode = BrandFiveElementCode;
export type AiCoreElementScore = Record<AiCoreElementCode, number>;
export type AiCoreElementModel = {
  primaryElement: AiCoreElementCode;
  secondaryElement: AiCoreElementCode;
  elementScore: AiCoreElementScore;
};

export type NormalizedFiveElementSignal = {
  sourceElement: FiveElementKey;
  traditionalElement: TraditionalFiveElementCode;
  brandElement: BrandFiveElementCode;
  displayName: FiveElementDisplayName;
  sourceName: NameologyElement;
  strength: number;
  need: number;
  evidenceCount: number;
};

export type FiveElementDecision = {
  title: string;
  conclusion: string;
  primaryAction: string;
  changeTarget: string;
  why: string;
  conflictNote: string | null;
  priorityOrder: FiveElementKey[];
  priorityTemplate: string;
  corePrinciple: string;
};

export type FiveElementProductMatch = {
  primaryProductId: string;
  supportedElements: BrandFiveElementCode[];
  balancedElements: BrandFiveElementCode[];
  matchReason: string[];
  matchConfidence: FiveElementConfidence;
};

export type FiveElementScore = {
  strength: number;
  need: number;
  evidenceCount: number;
};

export type FiveElementEvidence = {
  module: string;
  title: string;
  detail: string;
  element: FiveElementKey;
  impact: 'strength' | 'need' | 'avoid' | 'balance';
};

export type ModuleFiveElementResult = {
  sourceModule: 'nameology' | 'insight' | 'number' | 'bazi' | 'music' | 'zodiac';
  analysisId: string;
  elementScores: Record<FiveElementKey, FiveElementScore>;
  primaryElement: FiveElementKey;
  secondaryElement: FiveElementKey;
  strongElement: FiveElementKey;
  avoidElement: FiveElementKey | null;
  confidence: FiveElementConfidence;
  evidence: FiveElementEvidence[];
  ruleVersion: 'nameology_element_v1' | 'insight_element_v1' | 'number_element_v1' | 'bazi_element_v1' | 'music_element_v1' | 'zodiac_element_v1';
};

export type FiveElementIntegrationResult = ModuleFiveElementResult & {
  conflict: boolean;
  supportingModules: string[];
  moduleResults: Array<{
    module: 'nameology' | 'insight' | 'bazi' | 'annual' | 'number' | 'music' | 'zodiac';
    primaryElement: FiveElementKey;
    confidence: FiveElementConfidence;
  }>;
  summary: string;
  keywords: string[];
  reasons: string[];
  recommendedActions: string[];
  productEntryLabel: string;
  productRecommendation: FiveElementProductRecommendation;
  positiveQuote: FiveElementPositiveQuote;
  traditionalElement: TraditionalFiveElementCode;
  brandElement: BrandFiveElementCode;
  secondaryBrandElement: BrandFiveElementCode;
  strongBrandElement: BrandFiveElementCode;
  avoidBrandElement: BrandFiveElementCode | null;
  normalizedElements: Record<BrandFiveElementCode, NormalizedFiveElementSignal>;
  decision: FiveElementDecision;
  productMatch: FiveElementProductMatch;
  enginePipeline: string[];
  aiElementModel: AiCoreElementModel;
  elementScore: AiCoreElementScore;
};

export const FIVE_ELEMENT_DEFINITIONS: Record<FiveElementKey, { zh: NameologyElement; displayZh: FiveElementDisplayName; icon: string; keywords: string[]; direction: string; caution: string }> = {
  metal: {
    zh: '\u91d1',
    displayZh: '\u7a7a',
    icon: '\u25c6',
    keywords: ['\u539f\u5247', '\u6c7a\u65b7', '\u57f7\u884c', '\u754c\u7dda', '\u79e9\u5e8f', '\u5c08\u6ce8'],
    direction: '\u5efa\u7acb\u6e05\u695a\u6a19\u6e96\uff0c\u628a\u6c7a\u5b9a\u843d\u6210\u5177\u9ad4\u57f7\u884c\u3002',
    caution: '\u907f\u514d\u904e\u5ea6\u6311\u5254\u3001\u8ddd\u96e2\u611f\u592a\u5f37\uff0c\u6216\u53ea\u7528\u898f\u5247\u58d3\u4f4f\u611f\u53d7\u3002',
  },
  wood: {
    zh: '\u6728',
    displayZh: '\u98a8',
    icon: '\u25b2',
    keywords: ['\u6210\u9577', '\u5b78\u7fd2', '\u898f\u5283', '\u5275\u9020', '\u767c\u5c55', '\u5ef6\u4f38'],
    direction: '\u628a\u60f3\u6cd5\u6574\u7406\u6210\u53ef\u6301\u7e8c\u7684\u6210\u9577\u8def\u7dda\u3002',
    caution: '\u907f\u514d\u5206\u5fc3\u3001\u627f\u8afe\u904e\u591a\uff0c\u6216\u8a08\u756b\u4e00\u76f4\u5ef6\u4f38\u537b\u6c92\u6709\u6536\u675f\u3002',
  },
  water: {
    zh: '\u6c34',
    displayZh: '\u6c34',
    icon: '\u2248',
    keywords: ['\u667a\u6167', '\u6d41\u52d5', '\u6e9d\u901a', '\u9069\u61c9', '\u6d1e\u5bdf', '\u5f48\u6027'],
    direction: '\u63d0\u5347\u89c0\u5bdf\u8207\u6e9d\u901a\u5f48\u6027\uff0c\u8b93\u5224\u65b7\u66f4\u9806\u66a2\u3002',
    caution: '\u907f\u514d\u60f3\u592a\u6df1\u3001\u62d6\u5ef6\uff0c\u6216\u8b93\u80fd\u91cf\u6563\u5728\u592a\u591a\u53ef\u80fd\u6027\u88e1\u3002',
  },
  fire: {
    zh: '\u706b',
    displayZh: '\u706b',
    icon: '\u25cf',
    keywords: ['\u884c\u52d5', '\u71b1\u60c5', '\u8868\u9054', '\u81ea\u4fe1', '\u63a8\u9032', '\u80fd\u898b\u5ea6'],
    direction: '\u589e\u52a0\u8868\u9054\u3001\u884c\u52d5\u8207\u88ab\u770b\u898b\u7684\u52c7\u6c23\u3002',
    caution: '\u907f\u514d\u6025\u8e81\u3001\u904e\u5ea6\u8b49\u660e\uff0c\u6216\u8b93\u60c5\u7dd2\u5148\u65bc\u5224\u65b7\u3002',
  },
  earth: {
    zh: '\u571f',
    displayZh: '\u5730',
    icon: '\u25a0',
    keywords: ['\u7a69\u5b9a', '\u627f\u64d4', '\u4fe1\u4efb', '\u57fa\u790e', '\u6301\u7e8c', '\u843d\u5be6'],
    direction: '\u628a\u7bc0\u594f\u7a69\u4f4f\uff0c\u5efa\u7acb\u80fd\u88ab\u4fe1\u4efb\u7684\u57fa\u790e\u3002',
    caution: '\u907f\u514d\u786c\u6490\u3001\u904e\u5ea6\u4fdd\u5b88\uff0c\u6216\u56e0\u8ffd\u6c42\u7a69\u5b9a\u800c\u5931\u53bb\u8b8a\u901a\u3002',
  },
};

const ZH_TO_KEY: Record<NameologyElement, FiveElementKey> = {
  ['\u91d1']: 'metal',
  ['\u6728']: 'wood',
  ['\u6c34']: 'water',
  ['\u706b']: 'fire',
  ['\u571f']: 'earth',
};

/**
 * 前端五元素名稱唯一映射：金→空、木→風、水→水、火→火、土→地。
 * 傳統五行原值仍留在後端計算資料，不在這裡改寫。
 */
export function getProductElementNameFromTraditional(element: string): FiveElementDisplayName {
  return getProductOrbFromWuxing(element);
}

const ELEMENT_KEYS = Object.keys(FIVE_ELEMENT_DEFINITIONS) as FiveElementKey[];
const AI_CORE_ELEMENT_ORDER: AiCoreElementCode[] = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'];

// Exported: the canonical traditional<->brand element mapping, so other
// modules can convert between the two systems instead of re-declaring it.
export const FIVE_ELEMENT_CODE_MAP: Record<FiveElementKey, { traditionalElement: TraditionalFiveElementCode; brandElement: BrandFiveElementCode; productId: string }> = {
  metal: { traditionalElement: 'METAL', brandElement: 'SPACE', productId: 'bracelet_space_core' },
  wood: { traditionalElement: 'WOOD', brandElement: 'AIR', productId: 'bracelet_air_core' },
  water: { traditionalElement: 'WATER', brandElement: 'WATER', productId: 'bracelet_water_core' },
  fire: { traditionalElement: 'FIRE', brandElement: 'FIRE', productId: 'bracelet_fire_core' },
  earth: { traditionalElement: 'EARTH', brandElement: 'EARTH', productId: 'bracelet_earth_core' },
};

const FIVE_ELEMENT_ENGINE_PIPELINE = [
  'ModuleAnalysisAdapter',
  'ElementNormalizationEngine',
  'ElementRecommendationEngine',
  'ElementConflictResolver',
  'ProductMatchingEngine',
  'VerifiedQuoteMatchingEngine',
  'ElementResultPresenter',
];

function getElementChangeTarget(element: FiveElementKey) {
  return NUMBER_ELEMENT_IMPROVEMENT[element] ?? FIVE_ELEMENT_DEFINITIONS[element].direction;
}

const TENDENCY_TO_ELEMENT: Partial<Record<NameologyTendencyKey, FiveElementKey>> = {
  authority: 'metal',
  logic: 'metal',
  discipline: 'metal',
  detail: 'metal',
  learning: 'wood',
  creativity: 'wood',
  ambition: 'wood',
  independence: 'wood',
  communication: 'water',
  adaptability: 'water',
  intuition: 'water',
  relationship: 'water',
  action: 'fire',
  leadership: 'fire',
  visibility: 'fire',
  masculine: 'fire',
  stability: 'earth',
  resource: 'earth',
  service: 'earth',
  resilience: 'earth',
  gentleness: 'earth',
  empathy: 'water',
  balance: 'earth',
  feminine: 'water',
};

// Exported so other modules that need the canonical 相生/相剋 cycle (e.g. the
// match/soul-pairing five-element engine) derive it from here instead of
// hand-maintaining a second copy that could silently drift out of sync.
export const GENERATES: Record<FiveElementKey, FiveElementKey> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

export const CONTROLS: Record<FiveElementKey, FiveElementKey> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function addScore(scores: Record<FiveElementKey, number>, element: FiveElementKey, value: number) {
  scores[element] = (scores[element] ?? 0) + value;
}

export function getFiveElementShortName(element: FiveElementKey) {
  return getProductOrbFromWuxing(FIVE_ELEMENT_DEFINITIONS[element].zh);
}

export function getFiveElementName(element: FiveElementKey) {
  return `${getFiveElementShortName(element)}\u5143\u7d20`;
}

function getAnalysisId(analysis: NameologyAnalysis) {
  const raw = `${analysis.name}:${analysis.score}:${analysis.grids.map((grid) => `${grid.key}${grid.value}${grid.element}`).join('|')}`;
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `nameology_${(hash >>> 0).toString(16)}`;
}

function confidenceFromEvidence(evidenceCount: number, structuralEstimateCount: number): FiveElementConfidence {
  if (evidenceCount >= 8 && structuralEstimateCount <= 1) return 'high';
  if (evidenceCount >= 5) return 'medium';
  return 'low';
}

function actionFor(element: FiveElementKey) {
  const actions: Record<FiveElementKey, string[]> = {
    metal: ['\u4eca\u5929\u5148\u5beb\u4e0b 3 \u689d\u6e05\u695a\u754c\u7dda\u3002', '\u628a\u4e00\u4ef6\u62d6\u5ef6\u7684\u6c7a\u5b9a\u5207\u6210\u53ef\u57f7\u884c\u6b65\u9a5f\u3002', '\u7528\u66f4\u7cbe\u6e96\u7684\u6587\u5b57\u8868\u9054\u81ea\u5df1\u7684\u6a19\u6e96\u3002'],
    wood: ['\u5b89\u6392\u4e00\u500b\u53ef\u6301\u7e8c 7 \u5929\u7684\u5c0f\u5b78\u7fd2\u8a08\u756b\u3002', '\u628a\u65b0\u60f3\u6cd5\u6574\u7406\u6210\u4e00\u5f35\u7c21\u55ae\u8def\u7dda\u5716\u3002', '\u4e3b\u52d5\u9023\u7d50\u4e00\u4f4d\u80fd\u4e00\u8d77\u6210\u9577\u7684\u4eba\u3002'],
    water: ['\u5148\u807d\u5b8c\u5c0d\u65b9\u610f\u601d\uff0c\u518d\u6574\u7406\u81ea\u5df1\u7684\u56de\u61c9\u3002', '\u628a\u5361\u4f4f\u7684\u554f\u984c\u63db\u4e00\u7a2e\u554f\u6cd5\u3002', '\u7559 10 \u5206\u9418\u5b89\u975c\u6574\u7406\u76f4\u89ba\u8207\u8cc7\u8a0a\u3002'],
    fire: ['\u4eca\u5929\u5b8c\u6210\u4e00\u500b\u80fd\u88ab\u770b\u898b\u7684\u5c0f\u884c\u52d5\u3002', '\u7df4\u7fd2\u628a\u771f\u6b63\u60f3\u8aaa\u7684\u8a71\u8aaa\u6e05\u695a\u3002', '\u70ba\u76ee\u6a19\u5b89\u6392\u4e00\u500b\u660e\u78ba\u516c\u958b\u7684\u63a8\u9032\u9ede\u3002'],
    earth: ['\u5148\u56fa\u5b9a\u7761\u7720\u3001\u6574\u7406\u684c\u9762\u6216\u5b8c\u6210\u4e00\u4ef6\u57fa\u790e\u4efb\u52d9\u3002', '\u628a\u627f\u8afe\u6e1b\u5c11\u5230\u53ef\u4ee5\u7a69\u5b9a\u505a\u5230\u7684\u7bc4\u570d\u3002', '\u5efa\u7acb\u4e00\u500b\u8b93\u81ea\u5df1\u5b89\u5fc3\u7684\u65e5\u5e38\u7bc0\u594f\u3002'],
  };
  return actions[element];
}


function buildAiCoreElementScore(elementScores: Record<FiveElementKey, FiveElementScore>) {
  const score = Object.fromEntries(AI_CORE_ELEMENT_ORDER.map((element) => [element, 0])) as AiCoreElementScore;
  ELEMENT_KEYS.forEach((element) => {
    const code = FIVE_ELEMENT_CODE_MAP[element].brandElement;
    score[code] = elementScores[element]?.need ?? 0;
  });
  return score;
}

function buildNormalizedElements(elementScores: Record<FiveElementKey, FiveElementScore>) {
  return Object.fromEntries(ELEMENT_KEYS.map((element) => {
    const definition = FIVE_ELEMENT_DEFINITIONS[element];
    const code = FIVE_ELEMENT_CODE_MAP[element];
    const score = elementScores[element];
    return [code.brandElement, {
      sourceElement: element,
      traditionalElement: code.traditionalElement,
      brandElement: code.brandElement,
      displayName: definition.displayZh,
      sourceName: definition.zh,
      strength: score.strength,
      need: score.need,
      evidenceCount: score.evidenceCount,
    }];
  })) as Record<BrandFiveElementCode, NormalizedFiveElementSignal>;
}

const AI_JUDGEMENT_TONE_REPLACEMENTS: Array<[string, string]> = [
  ['可能性', '潛力'],
  ['建議可以', '請優先'],
  ['比較像', '系統判定為'],
  ['看起來', '系統判定'],
  ['可能', '系統判定'],
  ['也許', '目前重點'],
  ['或許', '現在最重要'],
  ['傾向', '判定方向'],
  ['疑似', '系統判定'],
  ['大概', '系統判定'],
];

function enforceAiJudgementTone(text: string) {
  return AI_JUDGEMENT_TONE_REPLACEMENTS.reduce(
    (output, [avoid, use]) => output.replaceAll(avoid, use),
    text,
  );
}

function buildElementPriorityOrder(result: Pick<FiveElementIntegrationResult, 'elementScores' | 'primaryElement' | 'secondaryElement'>) {
  const scoreOrder = [...ELEMENT_KEYS].sort((a, b) => {
    const needGap = result.elementScores[b].need - result.elementScores[a].need;
    if (needGap !== 0) return needGap;
    return result.elementScores[a].strength - result.elementScores[b].strength;
  });
  return Array.from(new Set([result.primaryElement, result.secondaryElement, ...scoreOrder]));
}

function buildElementPriorityTemplate(priorityOrder: FiveElementKey[]) {
  const first = priorityOrder[0];
  const second = priorityOrder[1] ?? first;
  const third = priorityOrder[2] ?? second;
  return [
    'AI 判定：',
    '目前最缺：',
    `【${getFiveElementShortName(first)}】`,
    '請優先補強：',
    `【${getFiveElementShortName(first)}】`,
    '完成後：',
    '再補：',
    `【${getFiveElementShortName(second)}】`,
    '最後：',
    `【${getFiveElementShortName(third)}】`,
  ].join('\n');
}

function buildUnifiedFiveElementSummary(decision: FiveElementDecision) {
  return enforceAiJudgementTone([
    decision.conclusion,
    decision.primaryAction,
    AI_CORE_JUDGEMENT_PRINCIPLE,
  ].join(' '));
}

function buildElementDecision(result: Pick<FiveElementIntegrationResult, 'elementScores' | 'primaryElement' | 'secondaryElement' | 'strongElement' | 'avoidElement' | 'conflict'>): FiveElementDecision {
  const priorityOrder = buildElementPriorityOrder(result);
  const primaryName = getFiveElementName(result.primaryElement);
  const primaryShort = getFiveElementShortName(result.primaryElement);
  const secondaryName = getFiveElementName(priorityOrder[1] ?? result.secondaryElement);
  const thirdName = getFiveElementName(priorityOrder[2] ?? result.strongElement);
  const strongName = getFiveElementName(result.strongElement);
  const primaryNeed = result.elementScores[result.primaryElement].need;
  const secondaryNeed = result.elementScores[priorityOrder[1] ?? result.secondaryElement].need;
  const gap = Math.max(0, primaryNeed - secondaryNeed);
  const whyText = gap === 0
    ? '因為' + primaryName + '與第二補強' + secondaryName + '補強需求同為 ' + primaryNeed + ' 分；後端依來源權重、五行生剋與主補規則，仍判定' + primaryName + '是第一補強。目前支撐元素是' + strongName + '，本次不把它當成第一補強。差距：0 分。'
    : '因為' + primaryName + '補強需求為 ' + primaryNeed + ' 分，高於第二補強' + secondaryName + ' ' + secondaryNeed + ' 分；目前支撐元素是' + strongName + '，本次不把它當成第一補強。差距：' + gap + ' 分。';
  const conflictNote = result.conflict
    ? '第二補強與第一補強接近，系統已啟用衝突解決：仍以補強需求最高的' + primaryName + '作為第一補強，不把第二補強寫成第一補強。'
    : null;

  return {
    title: 'AI 判定：目前最缺【' + primaryShort + '】',
    conclusion: 'AI 判定：目前最缺' + primaryName + '。請優先補強' + primaryName + '。',
    primaryAction: '第一補強：' + primaryName + '。完成後再補：' + secondaryName + '。最後補：' + thirdName + '。',
    changeTarget: getElementChangeTarget(result.primaryElement),
    why: enforceAiJudgementTone(whyText),
    conflictNote: conflictNote ? enforceAiJudgementTone(conflictNote) : null,
    priorityOrder,
    priorityTemplate: buildElementPriorityTemplate(priorityOrder),
    corePrinciple: AI_CORE_JUDGEMENT_PRINCIPLE,
  };
}

function buildElementProductMatch(result: Pick<FiveElementIntegrationResult, 'primaryElement' | 'secondaryElement' | 'avoidElement' | 'confidence' | 'conflict'>): FiveElementProductMatch {
  const primaryCode = FIVE_ELEMENT_CODE_MAP[result.primaryElement];
  const secondaryCode = FIVE_ELEMENT_CODE_MAP[result.secondaryElement];
  const avoidCode = result.avoidElement ? FIVE_ELEMENT_CODE_MAP[result.avoidElement] : null;
  const primaryShort = getFiveElementShortName(result.primaryElement);
  const secondaryShort = getFiveElementShortName(result.secondaryElement);

  return {
    primaryProductId: primaryCode.productId,
    supportedElements: Array.from(new Set([primaryCode.brandElement, secondaryCode.brandElement])),
    balancedElements: avoidCode ? [avoidCode.brandElement] : [],
    matchReason: [
      '\u4e3b\u88dc\u5143\u7d20\u9396\u5b9a' + primaryShort + '\u5143\u7d20\uff0c\u5546\u54c1\u63a8\u85a6\u5fc5\u9808\u5148\u5c0d\u6e96\u9019\u500b\u7f3a\u53e3\u3002',
      '\u7b2c\u4e8c\u9806\u4f4d' + secondaryShort + '\u5143\u7d20\u53ea\u4f5c\u8f14\u52a9\u53c3\u8003\uff0c\u4e0d\u53d6\u4ee3\u4e3b\u88dc\u5224\u5b9a\u3002',
      avoidCode ? '\u76ee\u524d\u8f03\u5f37\u5143\u7d20\u5148\u5217\u5165\u5e73\u8861\u89c0\u5bdf\uff0c\u4e0d\u4f5c\u70ba\u672c\u6b21\u4e3b\u63a8\u88dc\u5f37\u3002' : '\u76ee\u524d\u6c92\u6709\u9700\u8981\u907f\u958b\u7684\u904e\u5f37\u5143\u7d20\uff0c\u63a8\u85a6\u96c6\u4e2d\u5728\u7b2c\u4e00\u7f3a\u53e3\u3002',
      result.conflict ? '\u591a\u6a21\u7d44\u8a0a\u865f\u63a5\u8fd1\u6642\u5df2\u5957\u7528\u885d\u7a81\u89e3\u6c7a\uff0c\u524d\u7aef\u53ea\u986f\u793a\u552f\u4e00\u4e3b\u88dc\u3002' : '\u5224\u5b9a\u8a0a\u865f\u7a69\u5b9a\uff0c\u524d\u7aef\u53ef\u76f4\u63a5\u6e05\u695a\u5448\u73fe\u3002',
    ],
    matchConfidence: result.confidence,
  };
}

type FiveElementIntegrationBase = ModuleFiveElementResult & Omit<FiveElementIntegrationResult, keyof ModuleFiveElementResult | 'traditionalElement' | 'brandElement' | 'secondaryBrandElement' | 'strongBrandElement' | 'avoidBrandElement' | 'normalizedElements' | 'decision' | 'productMatch' | 'enginePipeline' | 'aiElementModel' | 'elementScore'>;

function enrichFiveElementResult(result: FiveElementIntegrationBase): FiveElementIntegrationResult {
  const primaryCode = FIVE_ELEMENT_CODE_MAP[result.primaryElement];
  const secondaryCode = FIVE_ELEMENT_CODE_MAP[result.secondaryElement];
  const strongCode = FIVE_ELEMENT_CODE_MAP[result.strongElement];
  const avoidCode = result.avoidElement ? FIVE_ELEMENT_CODE_MAP[result.avoidElement] : null;
  const decision = buildElementDecision(result);
  const productMatch = buildElementProductMatch(result);
  const conflictReason = decision.conflictNote ? [decision.conflictNote] : [];
  const elementScore = buildAiCoreElementScore(result.elementScores);
  const aiElementModel: AiCoreElementModel = {
    primaryElement: primaryCode.brandElement,
    secondaryElement: secondaryCode.brandElement,
    elementScore,
  };

  return {
    ...result,
    summary: buildUnifiedFiveElementSummary(decision),
    traditionalElement: primaryCode.traditionalElement,
    brandElement: primaryCode.brandElement,
    secondaryBrandElement: secondaryCode.brandElement,
    strongBrandElement: strongCode.brandElement,
    avoidBrandElement: avoidCode?.brandElement ?? null,
    normalizedElements: buildNormalizedElements(result.elementScores),
    decision,
    productMatch: {
      ...productMatch,
      matchReason: productMatch.matchReason.map(enforceAiJudgementTone),
    },
    enginePipeline: FIVE_ELEMENT_ENGINE_PIPELINE,
    aiElementModel,
    elementScore,
    reasons: [decision.priorityTemplate, decision.conclusion, decision.primaryAction, decision.why, ...conflictReason, ...result.reasons].map(enforceAiJudgementTone),
    recommendedActions: result.recommendedActions.map(enforceAiJudgementTone),
  };
}

export function buildNameologyFiveElementResult(analysis: NameologyAnalysis): FiveElementIntegrationResult {
  const strength = Object.fromEntries(ELEMENT_KEYS.map((key) => [key, 18])) as Record<FiveElementKey, number>;
  const evidence: FiveElementEvidence[] = [];

  analysis.characters.forEach((char, index) => {
    const element = ZH_TO_KEY[char.element];
    const weight = index === 0 ? 0.65 : index === 1 ? 1.4 : 1.15;
    const value = Math.min(26, char.strokeCount * 0.95) * weight;
    addScore(strength, element, value);
    if (index > 0) {
      evidence.push({
        module: 'nameology',
        title: `\u540d\u5b57\u300c${char.char}\u300d\u63d0\u4f9b${getFiveElementName(element)}\u8a0a\u865f`,
        detail: `${char.role}\u4ee5${char.strokeCount}\u756b\u3001${char.element}${char.yinYang}\u7d0d\u5165\u59d3\u540d\u5b78\u5224\u5b9a\u3002`,
        element,
        impact: 'strength',
      });
    }
  });

  analysis.grids.forEach((grid) => {
    const element = ZH_TO_KEY[grid.element];
    const value = grid.key === 'person' ? 24 : grid.key === 'total' ? 20 : grid.key === 'earth' ? 14 : 9;
    addScore(strength, element, value);
    if (grid.key === 'person' || grid.key === 'total') {
      evidence.push({
        module: 'nameology',
        title: `${grid.label}${grid.value}\u756b\u843d\u5728${getFiveElementName(element)}`,
        detail: grid.key === 'person' ? '\u4eba\u683c\u683c\u5c40\u4ee3\u8868\u59d3\u540d\u7684\u4e3b\u8981\u8868\u73fe\u65b9\u5f0f\u3002' : '\u7e3d\u683c\u4ee3\u8868\u59d3\u540d\u9577\u671f\u7d2f\u7a4d\u65b9\u5411\u3002',
        element,
        impact: 'strength',
      });
    }
  });

  analysis.temperamentProfile.topTendencies.slice(0, 6).forEach((tendency, index) => {
    const element = TENDENCY_TO_ELEMENT[tendency.key];
    if (!element) return;
    addScore(strength, element, Math.max(5, tendency.score * (0.17 - index * 0.015)));
    if (index < 3) {
      evidence.push({
        module: 'nameology',
        title: `24\u6027\u60c5\u77e9\u9663\u504f\u5411\u300c${tendency.label}\u300d`,
        detail: tendency.meaning,
        element,
        impact: 'strength',
      });
    }
  });

  analysis.elementFlow.forEach((flow) => {
    const fromChar = analysis.characters.find((char) => char.char === flow.from.replace(/[\u300c\u300d]/g, ''));
    const toChar = analysis.characters.find((char) => char.char === flow.to.replace(/[\u300c\u300d]/g, ''));
    const from = fromChar ? ZH_TO_KEY[fromChar.element] : null;
    const to = toChar ? ZH_TO_KEY[toChar.element] : null;
    if (!from || !to) return;
    if (flow.relation === '\u76f8\u751f') addScore(strength, to, 6);
    if (flow.relation === '\u76f8\u524b') {
      addScore(strength, CONTROLS[from], -5);
      evidence.push({
        module: 'nameology',
        title: `\u59d3\u540d\u5b57\u5e8f\u51fa\u73fe${flow.relation}\u8a0a\u865f`,
        detail: flow.note,
        element: to,
        impact: 'need',
      });
    }
  });

  const normalizedStrength = Object.fromEntries(
    ELEMENT_KEYS.map((key) => [key, clampScore(strength[key])]),
  ) as Record<FiveElementKey, number>;

  const rawNeed = Object.fromEntries(ELEMENT_KEYS.map((key) => [key, 100 - normalizedStrength[key]])) as Record<FiveElementKey, number>;
  ELEMENT_KEYS.forEach((key) => {
    const generatedBy = ELEMENT_KEYS.find((source) => GENERATES[source] === key);
    if (generatedBy && normalizedStrength[generatedBy] >= 70) rawNeed[key] -= 7;
    const controllingElement = ELEMENT_KEYS.find((source) => CONTROLS[source] === key);
    if (controllingElement && normalizedStrength[controllingElement] >= 72) rawNeed[key] += 9;
    if (normalizedStrength[key] <= 42) rawNeed[key] += 12;
    if (normalizedStrength[key] >= 82) rawNeed[key] -= 24;
  });

  const elementScores = Object.fromEntries(
    ELEMENT_KEYS.map((key) => [key, {
      strength: normalizedStrength[key],
      need: clampScore(rawNeed[key]),
      evidenceCount: evidence.filter((item) => item.element === key).length,
    }]),
  ) as Record<FiveElementKey, FiveElementScore>;

  const needRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].need - elementScores[a].need);
  const strengthRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].strength - elementScores[a].strength);
  const primaryElement = needRanking[0];
  const secondaryElement = needRanking.find((key) => key !== primaryElement) ?? needRanking[1];
  const strongElement = strengthRanking[0];
  const avoidElement = elementScores[strongElement].strength >= 82 && elementScores[strongElement].need <= 25 ? strongElement : null;
  const structuralEstimateCount = analysis.characters.filter((char) => char.strokeSource === 'structural_estimate').length;
  const confidence = confidenceFromEvidence(evidence.length, structuralEstimateCount);
  const primaryDefinition = FIVE_ELEMENT_DEFINITIONS[primaryElement];
  const conflict = avoidElement === primaryElement || elementScores[primaryElement].need - elementScores[secondaryElement].need <= 4;
  const reasons = [
    `\u672c\u6b21\u5224\u5b9a\uff1a\u4f60\u7f3a${getFiveElementName(primaryElement)}\uff0c\u5c31\u5148\u88dc${getFiveElementShortName(primaryElement)}\u5143\u7d20\u3002\u88dc\u5f37\u9700\u6c42\u70ba ${elementScores[primaryElement].need} \u5206\u3002`,
    '\u7d50\u8ad6\u4e0d\u6a21\u7cca\uff1a\u4e94\u5143\u7d20\u624b\u93c8\u88dc\u5f37\u9806\u5e8f\u4ee5\u7b2c\u4e00\u7f3a\u53e3\u70ba\u4e3b\uff0c\u4e0d\u5148\u5206\u6563\u88dc\u5176\u4ed6\u5143\u7d20\u3002',
    avoidElement ? `${getFiveElementName(avoidElement)}\u5df2\u7d93\u8f03\u5f37\uff0c\u672c\u6b21\u5148\u4e0d\u88dc\u5b83\u3002` : `${getFiveElementName(strongElement)}\u5df2\u7d93\u662f\u76ee\u524d\u8f03\u5f37\u652f\u6490\uff0c\u672c\u6b21\u5148\u5c08\u5fc3\u88dc${getFiveElementShortName(primaryElement)}\u5143\u7d20\u3002`,
  ];

  return enrichFiveElementResult({
    sourceModule: 'nameology',
    analysisId: getAnalysisId(analysis),
    elementScores,
    primaryElement,
    secondaryElement,
    strongElement,
    avoidElement,
    confidence,
    conflict,
    supportingModules: ['nameology'],
    moduleResults: [{ module: 'nameology', primaryElement, confidence }],
    evidence,
    ruleVersion: 'nameology_element_v1',
    summary: `\u672c\u6b21\u5224\u5b9a\uff1a\u4f60\u7f3a${getFiveElementName(primaryElement)}\uff0c\u5c31\u5148\u88dc${getFiveElementShortName(primaryElement)}\u5143\u7d20\u3002\u624b\u93c8\u88dc\u5f37\u5148\u9078${getFiveElementShortName(primaryElement)}\u5143\u7d20\uff0c\u518d\u642d\u914d\u6301\u7e8c\u884c\u52d5\u3002`,
    keywords: primaryDefinition.keywords.slice(0, 3),
    reasons,
    recommendedActions: actionFor(primaryElement),
    productEntryLabel: `\u9078\u64c7${getFiveElementName(primaryElement)}\u80fd\u91cf\u624b\u93c8`,
    productRecommendation: getFiveElementProductRecommendation(primaryElement),
    positiveQuote: getFiveElementPositiveQuote(primaryElement),
  });
}


type InsightFiveElementInput = {
  nameology: NameologyAnalysis;
  baziElementBalance?: Record<string, number> | null;
  annualElement?: string | null;
  shichenElement?: string | null;
};

function elementKeyFromText(value?: string | null): FiveElementKey | null {
  if (!value) return null;
  return ELEMENT_KEYS.find((key) => value.includes(FIVE_ELEMENT_DEFINITIONS[key].zh) || value.includes(FIVE_ELEMENT_DEFINITIONS[key].displayZh)) ?? null;
}

function getInsightAnalysisId(input: InsightFiveElementInput) {
  const raw = [
    input.nameology.name,
    input.nameology.score,
    JSON.stringify(input.baziElementBalance ?? {}),
    input.annualElement ?? '',
    input.shichenElement ?? '',
  ].join(':');
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 'insight_' + (hash >>> 0).toString(16);
}

export function buildInsightFiveElementResult(input: InsightFiveElementInput): FiveElementIntegrationResult {
  const nameResult = buildNameologyFiveElementResult(input.nameology);
  const strength = Object.fromEntries(ELEMENT_KEYS.map((key) => [key, 8])) as Record<FiveElementKey, number>;
  const evidence: FiveElementEvidence[] = [];
  const baziCounts = Object.fromEntries(
    ELEMENT_KEYS.map((key) => [key, Number(input.baziElementBalance?.[FIVE_ELEMENT_DEFINITIONS[key].zh] ?? 0)]),
  ) as Record<FiveElementKey, number>;
  const totalBaziCount = ELEMENT_KEYS.reduce((sum, key) => sum + Math.max(0, baziCounts[key]), 0);
  const minBaziCount = totalBaziCount > 0 ? Math.min(...ELEMENT_KEYS.map((key) => baziCounts[key])) : 0;

  ELEMENT_KEYS.forEach((key) => {
    addScore(strength, key, nameResult.elementScores[key].strength * 0.34);
    const baziStrength = totalBaziCount > 0 ? 18 + (Math.max(0, baziCounts[key]) / totalBaziCount) * 76 : 50;
    addScore(strength, key, baziStrength * 0.44);
  });

  evidence.push({
    module: 'nameology',
    title: 'AI\u59d3\u540d\u5b78\u6307\u51fa' + getFiveElementName(nameResult.primaryElement) + '\u9700\u88dc\u5f37',
    detail: '\u59d3\u540d\u5b78\u7368\u7acb\u5224\u5b9a\u7684\u88dc\u5f37\u9700\u6c42\u70ba ' + nameResult.elementScores[nameResult.primaryElement].need + ' \u5206\u3002',
    element: nameResult.primaryElement,
    impact: 'need',
  });

  ELEMENT_KEYS.forEach((key) => {
    if (totalBaziCount > 0 && baziCounts[key] <= minBaziCount) {
      evidence.push({
        module: 'bazi',
        title: '\u516b\u5b57\u4e2d' + getFiveElementName(key) + '\u504f\u5c11',
        detail: '\u56db\u67f1\u5143\u7d20\u5e73\u8861\u4e2d\u50c5\u51fa\u73fe ' + baziCounts[key] + ' \u6b21\uff0c\u5217\u5165\u88dc\u5f37\u53c3\u8003\u3002',
        element: key,
        impact: 'need',
      });
    }
  });

  const annualKey = elementKeyFromText(input.annualElement);
  if (annualKey) {
    addScore(strength, annualKey, 7);
    evidence.push({
      module: 'annual',
      title: '\u4eca\u5e74\u6d41\u5e74\u652f\u6490' + getFiveElementName(annualKey),
      detail: '\u6d41\u5e74\u5143\u7d20\u4f5c\u70ba\u7576\u5e74\u74b0\u5883\u8a0a\u865f\uff0c\u53ea\u7528\u4f86\u8f14\u52a9\u5e73\u8861\u3002',
      element: annualKey,
      impact: 'balance',
    });
  }

  const shichenKey = elementKeyFromText(input.shichenElement);
  if (shichenKey) addScore(strength, shichenKey, 5);

  const normalizedStrength = Object.fromEntries(
    ELEMENT_KEYS.map((key) => [key, clampScore(strength[key])]),
  ) as Record<FiveElementKey, number>;
  const rawNeed = Object.fromEntries(ELEMENT_KEYS.map((key) => [key, 100 - normalizedStrength[key]])) as Record<FiveElementKey, number>;

  ELEMENT_KEYS.forEach((key) => {
    if (totalBaziCount > 0 && baziCounts[key] <= minBaziCount) rawNeed[key] += 18;
    if (nameResult.elementScores[key].need >= 65) rawNeed[key] += 12;
    const generatedBy = ELEMENT_KEYS.find((source) => GENERATES[source] === key);
    if (generatedBy && normalizedStrength[generatedBy] >= 72) rawNeed[key] -= 6;
    const controllingElement = ELEMENT_KEYS.find((source) => CONTROLS[source] === key);
    if (controllingElement && normalizedStrength[controllingElement] >= 76) rawNeed[key] += 8;
    if (normalizedStrength[key] >= 82) rawNeed[key] -= 22;
  });

  const elementScores = Object.fromEntries(
    ELEMENT_KEYS.map((key) => [key, {
      strength: normalizedStrength[key],
      need: clampScore(rawNeed[key]),
      evidenceCount: evidence.filter((item) => item.element === key).length + nameResult.elementScores[key].evidenceCount,
    }]),
  ) as Record<FiveElementKey, FiveElementScore>;

  const needRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].need - elementScores[a].need);
  const strengthRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].strength - elementScores[a].strength);
  const primaryElement = needRanking[0];
  const secondaryElement = needRanking.find((key) => key !== primaryElement) ?? needRanking[1];
  const strongElement = strengthRanking[0];
  const avoidElement = elementScores[strongElement].strength >= 78 && elementScores[strongElement].need <= 34 ? strongElement : null;
  const primaryDefinition = FIVE_ELEMENT_DEFINITIONS[primaryElement];
  const confidence: FiveElementConfidence = totalBaziCount > 0 && evidence.length >= 4 ? 'high' : 'medium';
  const conflict = elementScores[primaryElement].need - elementScores[secondaryElement].need <= 5;
  const supportingModules = ['nameology', 'bazi', annualKey ? 'annual' : null, shichenKey ? 'shichen' : null].filter(Boolean) as string[];
  const reasons = [
    '\u672c\u6b21\u5224\u5b9a\uff1a\u4f60\u7f3a' + getFiveElementName(primaryElement) + '\uff0c\u5c31\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002\u88dc\u5f37\u9700\u6c42\u70ba ' + elementScores[primaryElement].need + ' \u5206\u3002',
    '\u7b2c\u4e8c\u9806\u4f4d\u662f' + getFiveElementName(secondaryElement) + '\uff0c\u4f46\u672c\u6b21\u4e0d\u5206\u6563\uff0c\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002',
    avoidElement ? getFiveElementName(avoidElement) + '\u5df2\u7d93\u8f03\u5f37\uff0c\u672c\u6b21\u5148\u4e0d\u88dc\u5b83\u3002' : getFiveElementName(strongElement) + '\u5df2\u7d93\u662f\u8f03\u5f37\u652f\u6490\uff0c\u672c\u6b21\u5148\u5c08\u5fc3\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002',
  ];

  return enrichFiveElementResult({
    sourceModule: 'insight',
    analysisId: getInsightAnalysisId(input),
    elementScores,
    primaryElement,
    secondaryElement,
    strongElement,
    avoidElement,
    confidence,
    conflict,
    supportingModules,
    moduleResults: [{ module: 'insight', primaryElement, confidence }, { module: 'nameology', primaryElement: nameResult.primaryElement, confidence: nameResult.confidence }],
    evidence,
    ruleVersion: 'insight_element_v1',
    summary: '\u672c\u6b21\u5224\u5b9a\uff1a\u4f60\u7f3a' + getFiveElementName(primaryElement) + '\uff0c\u5c31\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002\u624b\u93c8\u88dc\u5f37\u5148\u9078' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\uff0c\u518d\u642d\u914d\u6301\u7e8c\u884c\u52d5\u3002',
    keywords: primaryDefinition.keywords.slice(0, 4),
    reasons,
    recommendedActions: actionFor(primaryElement),
    productEntryLabel: '\u9078\u64c7' + getFiveElementName(primaryElement) + '\u80fd\u91cf\u624b\u93c8',
    productRecommendation: getFiveElementProductRecommendation(primaryElement),
    positiveQuote: getFiveElementPositiveQuote(primaryElement),
  });
}



export type BaziFiveElementInput = {
  analysisId: string;
  elementEnergy: Record<FiveElementKey, number>;
  elementCounts: Record<string, number>;
  dayMasterElement: FiveElementKey;
  shichenElement: FiveElementKey;
};

export function buildBaziFiveElementResult(input: BaziFiveElementInput): FiveElementIntegrationResult {
  const evidence: FiveElementEvidence[] = [];
  const rawNeed = Object.fromEntries(ELEMENT_KEYS.map((key) => [key, 100 - clampScore(input.elementEnergy[key])])) as Record<FiveElementKey, number>;

  ELEMENT_KEYS.forEach((key) => {
    const traditionalName = FIVE_ELEMENT_DEFINITIONS[key].zh;
    const count = Number(input.elementCounts[traditionalName] ?? 0);
    if (count <= 1) rawNeed[key] += 22;
    if (key === input.dayMasterElement) rawNeed[key] -= 8;
    if (key === input.shichenElement) rawNeed[key] -= 4;
    const generatedBy = ELEMENT_KEYS.find((source) => GENERATES[source] === key);
    if (generatedBy && input.elementEnergy[generatedBy] >= 70) rawNeed[key] -= 5;
    const controllingElement = ELEMENT_KEYS.find((source) => CONTROLS[source] === key);
    if (controllingElement && input.elementEnergy[controllingElement] >= 72) rawNeed[key] += 7;
  });

  const elementScores = Object.fromEntries(
    ELEMENT_KEYS.map((key) => {
      const traditionalName = FIVE_ELEMENT_DEFINITIONS[key].zh;
      const count = Number(input.elementCounts[traditionalName] ?? 0);
      return [key, {
        strength: clampScore(input.elementEnergy[key]),
        need: clampScore(rawNeed[key]),
        evidenceCount: 1 + (count <= 1 ? 1 : 0) + (key === input.dayMasterElement ? 1 : 0),
      }];
    }),
  ) as Record<FiveElementKey, FiveElementScore>;

  const needRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].need - elementScores[a].need || elementScores[a].strength - elementScores[b].strength);
  const strengthRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].strength - elementScores[a].strength);
  const primaryElement = needRanking[0];
  const secondaryElement = needRanking.find((key) => key !== primaryElement) ?? needRanking[1];
  const strongElement = strengthRanking[0];
  const avoidElement = elementScores[strongElement].strength >= 80 && elementScores[strongElement].need <= 28 ? strongElement : null;
  const confidence: FiveElementConfidence = 'high';
  const primaryDefinition = FIVE_ELEMENT_DEFINITIONS[primaryElement];
  const primaryCount = Number(input.elementCounts[FIVE_ELEMENT_DEFINITIONS[primaryElement].zh] ?? 0);
  const primaryEnergy = elementScores[primaryElement].strength;
  const conflict = elementScores[primaryElement].need - elementScores[secondaryElement].need <= 5;

  evidence.push({
    module: 'bazi',
    title: '\u516b\u5b57\u7d71\u8a08\u5224\u5b9a' + getFiveElementName(primaryElement) + '\u662f\u7b2c\u4e00\u7f3a\u53e3',
    detail: '\u56db\u67f1\u4e2d' + getFiveElementName(primaryElement) + '\u51fa\u73fe ' + primaryCount + ' \u6b21\uff0c\u80fd\u91cf\u689d\u70ba ' + primaryEnergy + ' \u5206\uff0c\u672c\u6b21\u5fc5\u9808\u5148\u88dc\u3002',
    element: primaryElement,
    impact: 'need',
  });

  evidence.push({
    module: 'bazi',
    title: '\u65e5\u4e3b\u5f37\u5f31\u7d0d\u5165\u88dc\u5f37\u6b0a\u91cd',
    detail: '\u65e5\u4e3b\u5143\u7d20\u70ba' + getFiveElementName(input.dayMasterElement) + '\uff0c\u7cfb\u7d71\u5df2\u8207\u56db\u67f1\u5f37\u5f31\u9032\u884c\u4ea4\u53c9\u7d71\u8a08\u3002',
    element: input.dayMasterElement,
    impact: 'balance',
  });

  const reasons = [
    '\u672c\u6b21\u516b\u5b57\u7d71\u8a08\u5224\u5b9a\uff1a\u4f60\u7f3a' + getFiveElementName(primaryElement) + '\uff0c\u4e00\u5b9a\u8981\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002',
    '\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u6703\u5148\u6539\u8b8a\uff1a' + getElementChangeTarget(primaryElement),
    '\u7b2c\u4e8c\u9806\u4f4d\u662f' + getFiveElementName(secondaryElement) + '\uff0c\u4f46\u672c\u6b21\u7d50\u8ad6\u4e0d\u5206\u6563\uff0c\u552f\u4e00\u4e3b\u88dc\u662f' + getFiveElementName(primaryElement) + '\u3002',
    avoidElement ? getFiveElementName(avoidElement) + '\u5df2\u7d93\u8f03\u5f37\uff0c\u672c\u6b21\u5148\u4e0d\u88dc\u5b83\u3002' : getFiveElementName(strongElement) + '\u662f\u76ee\u524d\u8f03\u5f37\u652f\u6490\uff0c\u672c\u6b21\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002',
  ];

  return enrichFiveElementResult({
    sourceModule: 'bazi',
    analysisId: input.analysisId,
    elementScores,
    primaryElement,
    secondaryElement,
    strongElement,
    avoidElement,
    confidence,
    conflict,
    supportingModules: ['bazi', 'dayMaster', 'fiveElementMatrix'],
    moduleResults: [{ module: 'bazi', primaryElement, confidence }],
    evidence,
    ruleVersion: 'bazi_element_v1',
    summary: '\u672c\u6b21\u5224\u5b9a\uff1a\u4f60\u7f3a' + getFiveElementName(primaryElement) + '\uff0c\u4e00\u5b9a\u8981\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002\u624b\u93c8\u88dc\u5f37\u5148\u9078' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\uff0c\u518d\u642d\u914d\u6301\u7e8c\u884c\u52d5\u3002',
    keywords: primaryDefinition.keywords.slice(0, 4),
    reasons,
    recommendedActions: actionFor(primaryElement),
    productEntryLabel: '\u9078\u64c7' + getFiveElementName(primaryElement) + '\u80fd\u91cf\u624b\u93c8',
    productRecommendation: getFiveElementProductRecommendation(primaryElement),
    positiveQuote: getFiveElementPositiveQuote(primaryElement),
  });
}

export type MusicFiveElementInput = {
  analysisId: string;
  personalityMatrix: Record<string, number>;
  dominantWuxing?: string | null;
  shichenElement?: string | null;
  bpm: number;
  genre: string;
  mood: string[];
  lyricThemes: string[];
  vocalStyle: string;
};

const MUSIC_MATRIX_TO_ELEMENT: Record<FiveElementKey, string[]> = {
  metal: ['logic', 'discipline', 'execution', 'conscientiousness', 'precision', 'focus'],
  wood: ['creativity', 'growth', 'openness', 'learning', 'innovation', 'adaptability'],
  water: ['empathy', 'intuition', 'agreeableness', 'sensitivity', 'flow', 'healing'],
  fire: ['action', 'visibility', 'extraversion', 'confidence', 'energy', 'ambition'],
  earth: ['stability', 'security', 'resilience', 'balance', 'grounding', 'warmth'],
};

function averageMusicMatrix(matrix: Record<string, number>, keys: string[]) {
  const values = keys
    .map((key) => Number(matrix[key]))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return 48;
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function musicElementFromText(value?: string | null): FiveElementKey | null {
  if (!value) return null;
  const text = String(value).toLowerCase();
  return ELEMENT_KEYS.find((key) => {
    const definition = FIVE_ELEMENT_DEFINITIONS[key];
    return text.includes(key) || value.includes(definition.zh) || value.includes(definition.displayZh);
  }) ?? null;
}

export function buildMusicFiveElementResult(input: MusicFiveElementInput): FiveElementIntegrationResult {
  const evidence: FiveElementEvidence[] = [];
  const strength = Object.fromEntries(
    ELEMENT_KEYS.map((key) => [key, averageMusicMatrix(input.personalityMatrix, MUSIC_MATRIX_TO_ELEMENT[key])]),
  ) as Record<FiveElementKey, number>;

  const dominantElement = musicElementFromText(input.dominantWuxing);
  const shichenElement = musicElementFromText(input.shichenElement);
  if (dominantElement) addScore(strength, dominantElement, 12);
  if (shichenElement) addScore(strength, shichenElement, 6);

  const musicText = [input.genre, input.vocalStyle, ...input.mood, ...input.lyricThemes].join(' ').toLowerCase();
  if (input.bpm >= 124 || musicText.includes('edm') || musicText.includes('dance') || musicText.includes('club')) addScore(strength, 'fire', 8);
  if (input.bpm <= 88 || musicText.includes('emotional') || musicText.includes('healing') || musicText.includes('cinematic')) addScore(strength, 'water', 6);
  if (musicText.includes('piano') || musicText.includes('warm') || musicText.includes('ambient')) addScore(strength, 'earth', 5);
  if (musicText.includes('hook') || musicText.includes('creative') || musicText.includes('short_form')) addScore(strength, 'wood', 5);
  if (musicText.includes('precision') || musicText.includes('producer') || musicText.includes('arrangement')) addScore(strength, 'metal', 5);

  const rawNeed = Object.fromEntries(ELEMENT_KEYS.map((key) => [key, 100 - strength[key]])) as Record<FiveElementKey, number>;
  ELEMENT_KEYS.forEach((key) => {
    const generatedBy = ELEMENT_KEYS.find((source) => GENERATES[source] === key);
    if (generatedBy && strength[generatedBy] >= 72) rawNeed[key] -= 4;
    const controllingElement = ELEMENT_KEYS.find((source) => CONTROLS[source] === key);
    if (controllingElement && strength[controllingElement] >= 74) rawNeed[key] += 6;
    if (strength[key] < 45) rawNeed[key] += 12;
  });

  const elementScores = Object.fromEntries(
    ELEMENT_KEYS.map((key) => [key, {
      strength: clampScore(strength[key]),
      need: clampScore(rawNeed[key]),
      evidenceCount: 2 + (dominantElement === key ? 1 : 0) + (shichenElement === key ? 1 : 0),
    }]),
  ) as Record<FiveElementKey, FiveElementScore>;

  const needRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].need - elementScores[a].need || elementScores[a].strength - elementScores[b].strength);
  const strengthRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].strength - elementScores[a].strength);
  const primaryElement = needRanking[0];
  const secondaryElement = needRanking.find((key) => key !== primaryElement) ?? needRanking[1];
  const strongElement = strengthRanking[0];
  const avoidElement = elementScores[strongElement].strength >= 82 && elementScores[strongElement].need <= 30 ? strongElement : null;
  const primaryDefinition = FIVE_ELEMENT_DEFINITIONS[primaryElement];
  const confidence: FiveElementConfidence = dominantElement || shichenElement ? 'high' : 'medium';

  evidence.push({
    module: 'music',
    title: '\u97f3\u6a02\u4eba\u683c\u77e9\u9663\u5224\u5b9a' + getFiveElementName(primaryElement) + '\u662f\u7b2c\u4e00\u7f3a\u53e3',
    detail: '\u7cfb\u7d71\u5df2\u628a\u4eba\u683c\u77e9\u9663\u3001\u751f\u65e5\u4e94\u884c\u3001\u6642\u8fb0\u8207\u6b4c\u66f2\u98a8\u683c\u4ea4\u53c9\u904b\u7b97\uff0c' + getFiveElementName(primaryElement) + '\u7684\u88dc\u5f37\u9700\u6c42\u6700\u9ad8\u3002',
    element: primaryElement,
    impact: 'need',
  });

  if (dominantElement) {
    evidence.push({
      module: 'music',
      title: '\u751f\u65e5\u4e94\u884c\u7d0d\u5165\u97f3\u6a02\u88dc\u5f37\u6b0a\u91cd',
      detail: '\u672c\u6b21\u751f\u65e5\u4e3b\u8abf\u70ba' + getFiveElementName(dominantElement) + '\uff0c\u5df2\u7d0d\u5165\u6b4c\u66f2\u6c23\u8cea\u8207\u88dc\u5f37\u5224\u5b9a\u3002',
      element: dominantElement,
      impact: 'balance',
    });
  }

  return enrichFiveElementResult({
    sourceModule: 'music',
    analysisId: input.analysisId,
    elementScores,
    primaryElement,
    secondaryElement,
    strongElement,
    avoidElement,
    confidence,
    conflict: elementScores[primaryElement].need - elementScores[secondaryElement].need <= 5,
    supportingModules: ['music', 'personalityMatrix', 'songStyle'],
    moduleResults: [{ module: 'music', primaryElement, confidence }],
    evidence,
    ruleVersion: 'music_element_v1',
    summary: '\u672c\u6b21 AI \u97f3\u6a02\u7d71\u8a08\u5224\u5b9a\uff1a\u4f60\u7f3a' + getFiveElementName(primaryElement) + '\uff0c\u4e00\u5b9a\u8981\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002\u624b\u93c8\u88dc\u5f37\u5148\u9078' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\uff0c\u518d\u642d\u914d\u97f3\u6a02\u88e1\u7684\u60c5\u7dd2\u7df4\u7fd2\u8207\u884c\u52d5\u3002',
    keywords: primaryDefinition.keywords.slice(0, 4),
    reasons: [
      '\u97f3\u6a02\u4eba\u683c\u77e9\u9663\u986f\u793a' + getFiveElementName(primaryElement) + '\u662f\u76ee\u524d\u7b2c\u4e00\u88dc\u5f37\u9806\u4f4d\u3002',
      '\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u6703\u5148\u6539\u8b8a\uff1a' + getElementChangeTarget(primaryElement),
      '\u7b2c\u4e8c\u9806\u4f4d\u662f' + getFiveElementName(secondaryElement) + '\uff0c\u4f46\u672c\u6b21\u4e0d\u5206\u6563\uff0c\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002',
      avoidElement ? getFiveElementName(avoidElement) + '\u5df2\u7d93\u8f03\u5f37\uff0c\u672c\u6b21\u5148\u4e0d\u88dc\u5b83\u3002' : getFiveElementName(strongElement) + '\u662f\u76ee\u524d\u8f03\u5f37\u652f\u6490\uff0c\u672c\u6b21\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002',
    ],
    recommendedActions: actionFor(primaryElement),
    productEntryLabel: '\u9078\u64c7' + getFiveElementName(primaryElement) + '\u80fd\u91cf\u624b\u93c8',
    productRecommendation: getFiveElementProductRecommendation(primaryElement),
    positiveQuote: getFiveElementPositiveQuote(primaryElement),
  });
}
const NUMBER_DIGIT_TO_ELEMENT: Record<string, FiveElementKey> = {
  '0': 'water',
  '1': 'water',
  '2': 'earth',
  '3': 'wood',
  '4': 'wood',
  '5': 'earth',
  '6': 'metal',
  '7': 'metal',
  '8': 'earth',
  '9': 'fire',
};

const NUMBER_MATRIX_TO_ELEMENT: Record<FiveElementKey, Array<keyof NumberAnalysisResponse['matrix']>> = {
  metal: ['career', 'stability'],
  wood: ['growth', 'social'],
  water: ['social', 'health'],
  fire: ['career', 'growth'],
  earth: ['family', 'stability', 'health'],
};

const NUMBER_ELEMENT_IMPROVEMENT: Record<FiveElementKey, string> = {
  metal: '\u88dc\u7a7a\u5143\u7d20\u5148\u6539\u8b8a\u7684\u662f\u6c7a\u7b56\u3001\u7d00\u5f8b\u8207\u57f7\u884c\u6e05\u6670\u5ea6\u3002',
  wood: '\u88dc\u98a8\u5143\u7d20\u5148\u6539\u8b8a\u7684\u662f\u6210\u9577\u52d5\u80fd\u3001\u898f\u5283\u611f\u8207\u6301\u7e8c\u63a8\u9032\u3002',
  water: '\u88dc\u6c34\u5143\u7d20\u5148\u6539\u8b8a\u7684\u662f\u601d\u8003\u5f48\u6027\u3001\u6e9d\u901a\u7de9\u885d\u8207\u9069\u61c9\u529b\u3002',
  fire: '\u88dc\u706b\u5143\u7d20\u5148\u6539\u8b8a\u7684\u662f\u884c\u52d5\u529b\u3001\u8868\u9054\u52c7\u6c23\u8207\u88ab\u770b\u898b\u7684\u80fd\u898b\u5ea6\u3002',
  earth: '\u88dc\u5730\u5143\u7d20\u5148\u6539\u8b8a\u7684\u662f\u7a69\u5b9a\u611f\u3001\u627f\u64d4\u529b\u8207\u9577\u671f\u843d\u5be6\u7684\u7bc0\u594f\u3002',
};

function numberDigitElementStats(result: NumberAnalysisResponse) {
  const counts = Object.fromEntries(ELEMENT_KEYS.map((key) => [key, 0])) as Record<FiveElementKey, number>;

  Object.entries(result.evidence.digitFrequency).forEach(([digit, count]) => {
    const element = NUMBER_DIGIT_TO_ELEMENT[digit];
    if (!element) return;
    counts[element] += Math.max(0, Number(count) || 0);
  });

  result.evidence.lastFour.split('').forEach((digit) => {
    const element = NUMBER_DIGIT_TO_ELEMENT[digit];
    if (!element) return;
    counts[element] += 0.35;
  });

  const total = ELEMENT_KEYS.reduce((sum, key) => sum + counts[key], 0) || 1;
  return { counts, total };
}

function numberMatrixStrength(result: NumberAnalysisResponse, element: FiveElementKey) {
  const keys = NUMBER_MATRIX_TO_ELEMENT[element];
  return keys.reduce((sum, key) => sum + result.matrix[key], 0) / keys.length;
}

function numberElementWeaknessReason(element: FiveElementKey) {
  const reasons: Record<FiveElementKey, string> = {
    metal: '\u7a7a\u5143\u7d20\u5c0d\u61c9\u6c7a\u7b56\u3001\u908a\u754c\u8207\u57f7\u884c\uff1b\u7576\u7a7a\u5143\u7d20\u4fe1\u865f\u504f\u5c11\u6642\uff0c\u5bb9\u6613\u6c7a\u65b7\u4e0d\u5920\u5feb\u6216\u57f7\u884c\u6a19\u6e96\u4e0d\u5920\u660e\u78ba\u3002',
    wood: '\u98a8\u5143\u7d20\u5c0d\u61c9\u6210\u9577\u3001\u898f\u5283\u8207\u5275\u65b0\uff1b\u7576\u98a8\u5143\u7d20\u4fe1\u865f\u504f\u5c11\u6642\uff0c\u5bb9\u6613\u7f3a\u5c11\u6301\u7e8c\u5ef6\u5c55\u8207\u5411\u524d\u751f\u9577\u7684\u529b\u9053\u3002',
    water: '\u6c34\u5143\u7d20\u5c0d\u61c9\u601d\u8003\u3001\u6e9d\u901a\u8207\u9069\u61c9\uff1b\u7576\u6c34\u5143\u7d20\u4fe1\u865f\u504f\u5c11\u6642\uff0c\u5bb9\u6613\u6e9d\u901a\u8f49\u5f4e\u4e0d\u5920\u9806\uff0c\u9047\u5230\u58d3\u529b\u6642\u601d\u8003\u5f48\u6027\u4e0d\u8db3\u3002',
    fire: '\u706b\u5143\u7d20\u5c0d\u61c9\u884c\u52d5\u3001\u8868\u9054\u8207\u52c7\u6c23\uff1b\u7576\u706b\u5143\u7d20\u4fe1\u865f\u504f\u5c11\u6642\uff0c\u5bb9\u6613\u60f3\u5f97\u591a\u3001\u505a\u5f97\u6162\uff0c\u8868\u9054\u63a8\u9032\u611f\u4e0d\u5920\u3002',
    earth: '\u5730\u5143\u7d20\u5c0d\u61c9\u7a69\u5b9a\u3001\u627f\u64d4\u8207\u9577\u671f\u843d\u5be6\uff1b\u7576\u5730\u5143\u7d20\u4fe1\u865f\u504f\u5c11\u6642\uff0c\u5bb9\u6613\u57fa\u790e\u611f\u4e0d\u7a69\uff0c\u627f\u8afe\u8207\u7bc0\u594f\u96e3\u4ee5\u6301\u7e8c\u3002',
  };
  return reasons[element];
}


function numberElementAnalysisId(result: NumberAnalysisResponse) {
  const raw = [result.valueMasked, result.finalScore, result.level, JSON.stringify(result.matrix)].join(':');
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 'number_' + (hash >>> 0).toString(16);
}

export function buildNumberFiveElementResult(result: NumberAnalysisResponse): FiveElementIntegrationResult {
  const evidence: FiveElementEvidence[] = [];
  const digitStats = numberDigitElementStats(result);
  const expectedShare = digitStats.total / ELEMENT_KEYS.length;

  const rawScores = Object.fromEntries(ELEMENT_KEYS.map((element) => {
    const digitCount = digitStats.counts[element];
    const digitStrength = (digitCount / Math.max(1, expectedShare)) * 50;
    const matrixStrength = numberMatrixStrength(result, element);
    const strength = clampScore(digitStrength * 0.58 + matrixStrength * 0.42);
    let need = 100 - strength;
    const digitGap = Math.max(0, expectedShare - digitCount);
    need += digitGap * 12;
    if (element === 'metal') need += Math.max(0, result.matrix.pressure - 62) * 0.18;
    if (element === 'water') need += Math.max(0, result.matrix.risk - 62) * 0.2;
    if (element === 'fire') need += Math.max(0, 55 - result.matrix.career) * 0.24;
    if (element === 'earth') need += Math.max(0, 55 - result.matrix.stability) * 0.2 + Math.max(0, result.matrix.pressure - 64) * 0.12;
    if (element === 'wood') need += Math.max(0, 55 - result.matrix.growth) * 0.24;
    return [element, {
      strength,
      need: clampScore(need),
      evidenceCount: 2,
    }];
  })) as Record<FiveElementKey, FiveElementScore>;

  const elementScores = rawScores;
  const needRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].need - elementScores[a].need || digitStats.counts[a] - digitStats.counts[b]);
  const strengthRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].strength - elementScores[a].strength);
  const primaryElement = needRanking[0];
  const secondaryElement = needRanking.find((key) => key !== primaryElement) ?? needRanking[1];
  const strongElement = strengthRanking[0];
  const avoidElement = elementScores[strongElement].need <= 32 ? strongElement : null;
  const primaryDefinition = FIVE_ELEMENT_DEFINITIONS[primaryElement];
  const confidence: FiveElementConfidence = result.confidenceScore >= 82 ? 'high' : result.confidenceScore >= 65 ? 'medium' : 'low';
  const digitCountText = digitStats.counts[primaryElement].toFixed(1).replace(/\.0$/, '');
  const expectedText = expectedShare.toFixed(1).replace(/\.0$/, '');
  const matrixText = numberMatrixStrength(result, primaryElement).toFixed(0);

  evidence.push({
    module: 'number',
    title: '\u6578\u5b57\u7d71\u8a08\u5224\u5b9a' + getFiveElementName(primaryElement) + '\u662f\u7b2c\u4e00\u7f3a\u53e3',
    detail: '\u672c\u865f\u78bc\u4e2d' + getFiveElementName(primaryElement) + '\u52a0\u6b0a\u51fa\u73fe ' + digitCountText + '\uff0c\u57fa\u6e96\u61c9\u7d04 ' + expectedText + '\uff1b\u5c0d\u61c9\u77e9\u9663\u5f37\u5ea6 ' + matrixText + '\u3002',
    element: primaryElement,
    impact: 'need',
  });

  return enrichFiveElementResult({
    sourceModule: 'number',
    analysisId: numberElementAnalysisId(result),
    elementScores,
    primaryElement,
    secondaryElement,
    strongElement,
    avoidElement,
    confidence,
    conflict: elementScores[primaryElement].need - elementScores[secondaryElement].need <= 5,
    supportingModules: ['number'],
    moduleResults: [{ module: 'number', primaryElement, confidence }],
    evidence,
    ruleVersion: 'number_element_v1',
    summary: '\u672c\u6b21\u6578\u5b57\u7d71\u8a08\u5224\u5b9a\uff1a\u4f60\u7f3a' + getFiveElementName(primaryElement) + '\uff0c\u5c31\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002\u624b\u93c8\u88dc\u5f37\u5148\u9078' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\uff0c\u4e0d\u5148\u5206\u6563\u88dc\u5176\u4ed6\u5143\u7d20\u3002',
    keywords: primaryDefinition.keywords.slice(0, 4),
    reasons: [
      '\u6578\u5b57\u4e94\u5143\u7d20\u7d71\u8a08\uff1a' + getFiveElementName(primaryElement) + '\u51fa\u73fe ' + digitCountText + '\uff0c\u4f4e\u65bc\u672c\u7d44\u865f\u78bc\u7684\u5e73\u8861\u57fa\u6e96 ' + expectedText + '\u3002',
      '\u6578\u5b57\u77e9\u9663\u5f37\u5ea6\uff1a' + getFiveElementName(primaryElement) + '\u5c0d\u61c9\u7684\u529f\u80fd\u5e73\u5747\u70ba ' + matrixText + '\uff0c\u88dc\u5b83\u6700\u80fd\u5c0d\u6e96\u672c\u6b21\u7f3a\u53e3\u3002',
      numberElementWeaknessReason(primaryElement),
      NUMBER_ELEMENT_IMPROVEMENT[primaryElement],
      '\u7b2c\u4e8c\u9806\u4f4d\u662f' + getFiveElementName(secondaryElement) + '\uff0c\u4f46\u672c\u6b21\u5148\u5c08\u5fc3\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002',
    ],
    recommendedActions: actionFor(primaryElement),
    productEntryLabel: '\u9078\u64c7' + getFiveElementName(primaryElement) + '\u80fd\u91cf\u624b\u93c8',
    productRecommendation: getFiveElementProductRecommendation(primaryElement),
    positiveQuote: getFiveElementPositiveQuote(primaryElement),
  });
}

const ZODIAC_ELEMENT_TO_KEY: Record<ZodiacElement, FiveElementKey> = {
  fire: 'fire',
  earth: 'earth',
  air: 'wood',
  water: 'water',
};

const ZODIAC_BLOOD_TO_KEY: Record<Exclude<BloodType, ''>, FiveElementKey> = {
  A: 'earth',
  B: 'wood',
  AB: 'metal',
  O: 'fire',
};

function zodiacElementAnalysisId(result: ZodiacAnalysisResult, bloodType?: BloodType | null) {
  const raw = [result.sign.key, result.risingSign?.key ?? 'none', result.moonSign?.key ?? 'none', bloodType || 'none'].join(':');
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 'zodiac_' + (hash >>> 0).toString(16);
}

/**
 * Cross-analyzes sun/rising/moon sign (whichever the member has unlocked) plus
 * blood type into the platform's shared five-element model. Western air maps to
 * the wood key (displayed as \u98a8/AIR); blood type is the only signal that can
 * reach the metal key (displayed as \u7a7a/SPACE), since no western sign maps there.
 */
export function buildZodiacFiveElementResult(result: ZodiacAnalysisResult, bloodType?: BloodType | null): FiveElementIntegrationResult {
  const weighted: Array<{ key: FiveElementKey; weight: number; source: string }> = [];
  weighted.push({ key: ZODIAC_ELEMENT_TO_KEY[result.sign.element], weight: 34, source: `\u592a\u967d\u661f\u5ea7 ${result.sign.name}` });
  if (result.risingSign) weighted.push({ key: ZODIAC_ELEMENT_TO_KEY[result.risingSign.element], weight: 20, source: `\u4e0a\u5347\u661f\u5ea7 ${result.risingSign.name}` });
  if (result.moonSign) weighted.push({ key: ZODIAC_ELEMENT_TO_KEY[result.moonSign.element], weight: 20, source: `\u6708\u4eae\u661f\u5ea7 ${result.moonSign.name}` });
  const normalizedBloodType = bloodType ? bloodType : null;
  if (normalizedBloodType) weighted.push({ key: ZODIAC_BLOOD_TO_KEY[normalizedBloodType], weight: 14, source: `\u8840\u578b ${normalizedBloodType} \u578b` });

  const rawStrength = Object.fromEntries(ELEMENT_KEYS.map((element) => [element, 50])) as Record<FiveElementKey, number>;
  for (const item of weighted) rawStrength[item.key] += item.weight;

  const elementScores = Object.fromEntries(ELEMENT_KEYS.map((element) => {
    const strength = clampScore(rawStrength[element]);
    const need = clampScore(100 - strength);
    return [element, { strength, need, evidenceCount: weighted.filter((item) => item.key === element).length }];
  })) as Record<FiveElementKey, FiveElementScore>;

  const needRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].need - elementScores[a].need);
  const strengthRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].strength - elementScores[a].strength);
  const primaryElement = needRanking[0];
  const secondaryElement = needRanking.find((key) => key !== primaryElement) ?? needRanking[1];
  const strongElement = strengthRanking[0];
  const avoidElement = elementScores[strongElement].need <= 32 ? strongElement : null;
  const primaryDefinition = FIVE_ELEMENT_DEFINITIONS[primaryElement];
  const confidence: FiveElementConfidence = result.precision === 'FULL_CHART' ? 'high' : result.precision === 'DATE_TIME' ? 'medium' : 'low';
  const sourceText = weighted.map((item) => item.source).join('\u3001');

  return enrichFiveElementResult({
    sourceModule: 'zodiac',
    analysisId: zodiacElementAnalysisId(result, bloodType),
    elementScores,
    primaryElement,
    secondaryElement,
    strongElement,
    avoidElement,
    confidence,
    conflict: elementScores[primaryElement].need - elementScores[secondaryElement].need <= 5,
    supportingModules: ['zodiac'],
    moduleResults: [{ module: 'zodiac', primaryElement, confidence }],
    evidence: [{
      module: 'zodiac',
      title: getFiveElementName(primaryElement) + '\u662f\u672c\u6b21\u661f\u5ea7\u4ea4\u53c9\u5206\u6790\u5224\u5b9a\u7684\u7b2c\u4e00\u7f3a\u53e3',
      detail: sourceText + '\uff0c\u4ea4\u53c9\u5224\u5b9a\u5f8c\u5c0d\u61c9' + getFiveElementName(primaryElement) + '\u8a0a\u865f\u504f\u5c11\u3002',
      element: primaryElement,
      impact: 'need',
    }],
    ruleVersion: 'zodiac_element_v1',
    summary: '\u672c\u6b21\u661f\u5ea7\u4ea4\u53c9\u5206\u6790\u5224\u5b9a\uff1a\u4f60\u7f3a' + getFiveElementName(primaryElement) + '\uff0c\u5c31\u5148\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002\u624b\u93c8\u88dc\u5f37\u5148\u9078' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\uff0c\u4e0d\u5148\u5206\u6563\u88dc\u5176\u4ed6\u5143\u7d20\u3002',
    keywords: primaryDefinition.keywords.slice(0, 4),
    reasons: [
      '\u661f\u5ea7\u4ea4\u53c9\u5206\u6790\u4f86\u6e90\uff1a' + sourceText + '\u3002',
      getElementChangeTarget(primaryElement) + '\u9019\u662f\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u6700\u5148\u6539\u8b8a\u7684\u5730\u65b9\u3002',
      '\u7b2c\u4e8c\u9806\u4f4d\u662f' + getFiveElementName(secondaryElement) + '\uff0c\u4f46\u672c\u6b21\u5148\u5c08\u5fc3\u88dc' + getFiveElementShortName(primaryElement) + '\u5143\u7d20\u3002',
    ],
    recommendedActions: actionFor(primaryElement),
    productEntryLabel: '\u9078\u64c7' + getFiveElementName(primaryElement) + '\u80fd\u91cf\u624b\u93c8',
    productRecommendation: getFiveElementProductRecommendation(primaryElement),
    positiveQuote: getFiveElementPositiveQuote(primaryElement),
  });
}
