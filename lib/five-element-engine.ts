import type { NameologyAnalysis, NameologyElement, NameologyTendencyKey } from './nameology-engine';
import type { NumberAnalysisResponse } from './number-core-engine';
import {
  getFiveElementPositiveQuote,
  getFiveElementProductRecommendation,
  type FiveElementPositiveQuote,
  type FiveElementProductRecommendation,
} from './five-element-positive-quotes';

export type FiveElementKey = 'metal' | 'wood' | 'water' | 'fire' | 'earth';
export type FiveElementConfidence = 'low' | 'medium' | 'high';

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
  sourceModule: 'nameology' | 'insight' | 'number';
  analysisId: string;
  elementScores: Record<FiveElementKey, FiveElementScore>;
  primaryElement: FiveElementKey;
  secondaryElement: FiveElementKey;
  strongElement: FiveElementKey;
  avoidElement: FiveElementKey | null;
  confidence: FiveElementConfidence;
  evidence: FiveElementEvidence[];
  ruleVersion: 'nameology_element_v1' | 'insight_element_v1' | 'number_element_v1';
};

export type FiveElementIntegrationResult = ModuleFiveElementResult & {
  conflict: boolean;
  supportingModules: string[];
  moduleResults: Array<{
    module: 'nameology' | 'insight' | 'bazi' | 'annual' | 'number';
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
};

export const FIVE_ELEMENT_DEFINITIONS: Record<FiveElementKey, { zh: NameologyElement; icon: string; keywords: string[]; direction: string; caution: string }> = {
  metal: {
    zh: '\u91d1',
    icon: '\u25c6',
    keywords: ['\u539f\u5247', '\u6c7a\u65b7', '\u57f7\u884c', '\u754c\u7dda', '\u79e9\u5e8f', '\u5c08\u6ce8'],
    direction: '\u5efa\u7acb\u6e05\u695a\u6a19\u6e96\uff0c\u628a\u6c7a\u5b9a\u843d\u6210\u5177\u9ad4\u57f7\u884c\u3002',
    caution: '\u907f\u514d\u904e\u5ea6\u6311\u5254\u3001\u8ddd\u96e2\u611f\u592a\u5f37\uff0c\u6216\u53ea\u7528\u898f\u5247\u58d3\u4f4f\u611f\u53d7\u3002',
  },
  wood: {
    zh: '\u6728',
    icon: '\u25b2',
    keywords: ['\u6210\u9577', '\u5b78\u7fd2', '\u898f\u5283', '\u5275\u9020', '\u767c\u5c55', '\u5ef6\u4f38'],
    direction: '\u628a\u60f3\u6cd5\u6574\u7406\u6210\u53ef\u6301\u7e8c\u7684\u6210\u9577\u8def\u7dda\u3002',
    caution: '\u907f\u514d\u5206\u5fc3\u3001\u627f\u8afe\u904e\u591a\uff0c\u6216\u8a08\u756b\u4e00\u76f4\u5ef6\u4f38\u537b\u6c92\u6709\u6536\u675f\u3002',
  },
  water: {
    zh: '\u6c34',
    icon: '\u2248',
    keywords: ['\u667a\u6167', '\u6d41\u52d5', '\u6e9d\u901a', '\u9069\u61c9', '\u6d1e\u5bdf', '\u5f48\u6027'],
    direction: '\u63d0\u5347\u89c0\u5bdf\u8207\u6e9d\u901a\u5f48\u6027\uff0c\u8b93\u5224\u65b7\u66f4\u9806\u66a2\u3002',
    caution: '\u907f\u514d\u60f3\u592a\u6df1\u3001\u62d6\u5ef6\uff0c\u6216\u8b93\u80fd\u91cf\u6563\u5728\u592a\u591a\u53ef\u80fd\u6027\u88e1\u3002',
  },
  fire: {
    zh: '\u706b',
    icon: '\u25cf',
    keywords: ['\u884c\u52d5', '\u71b1\u60c5', '\u8868\u9054', '\u81ea\u4fe1', '\u63a8\u9032', '\u80fd\u898b\u5ea6'],
    direction: '\u589e\u52a0\u8868\u9054\u3001\u884c\u52d5\u8207\u88ab\u770b\u898b\u7684\u52c7\u6c23\u3002',
    caution: '\u907f\u514d\u6025\u8e81\u3001\u904e\u5ea6\u8b49\u660e\uff0c\u6216\u8b93\u60c5\u7dd2\u5148\u65bc\u5224\u65b7\u3002',
  },
  earth: {
    zh: '\u571f',
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

const ELEMENT_KEYS = Object.keys(FIVE_ELEMENT_DEFINITIONS) as FiveElementKey[];

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

const GENERATES: Record<FiveElementKey, FiveElementKey> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

const CONTROLS: Record<FiveElementKey, FiveElementKey> = {
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

export function getFiveElementName(element: FiveElementKey) {
  return `${FIVE_ELEMENT_DEFINITIONS[element].zh}\u5143\u7d20`;
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
    `\u672c\u6b21\u5224\u5b9a\uff1a\u4f60\u7f3a${getFiveElementName(primaryElement)}\uff0c\u5c31\u5148\u88dc${primaryDefinition.zh}\u5143\u7d20\u3002\u88dc\u5f37\u9700\u6c42\u70ba ${elementScores[primaryElement].need} \u5206\u3002`,
    '\u7d50\u8ad6\u4e0d\u6a21\u7cca\uff1a\u4e94\u5143\u7d20\u624b\u93c8\u88dc\u5f37\u9806\u5e8f\u4ee5\u7b2c\u4e00\u7f3a\u53e3\u70ba\u4e3b\uff0c\u4e0d\u5148\u5206\u6563\u88dc\u5176\u4ed6\u5143\u7d20\u3002',
    avoidElement ? `${getFiveElementName(avoidElement)}\u5df2\u7d93\u8f03\u5f37\uff0c\u672c\u6b21\u5148\u4e0d\u88dc\u5b83\u3002` : `${getFiveElementName(strongElement)}\u5df2\u7d93\u662f\u76ee\u524d\u8f03\u5f37\u652f\u6490\uff0c\u672c\u6b21\u5148\u5c08\u5fc3\u88dc${primaryDefinition.zh}\u5143\u7d20\u3002`,
  ];

  return {
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
    summary: `\u672c\u6b21\u5224\u5b9a\uff1a\u4f60\u7f3a${getFiveElementName(primaryElement)}\uff0c\u5c31\u5148\u88dc${primaryDefinition.zh}\u5143\u7d20\u3002\u624b\u93c8\u88dc\u5f37\u5148\u9078${primaryDefinition.zh}\u5143\u7d20\uff0c\u518d\u642d\u914d\u6301\u7e8c\u884c\u52d5\u3002`,
    keywords: primaryDefinition.keywords.slice(0, 3),
    reasons,
    recommendedActions: actionFor(primaryElement),
    productEntryLabel: `\u9078\u64c7${primaryDefinition.zh}\u5143\u7d20\u80fd\u91cf\u624b\u93c8`,
    productRecommendation: getFiveElementProductRecommendation(primaryElement),
    positiveQuote: getFiveElementPositiveQuote(primaryElement),
  };
}


type InsightFiveElementInput = {
  nameology: NameologyAnalysis;
  baziElementBalance?: Record<string, number> | null;
  annualElement?: string | null;
  shichenElement?: string | null;
};

function elementKeyFromText(value?: string | null): FiveElementKey | null {
  if (!value) return null;
  return ELEMENT_KEYS.find((key) => value.includes(FIVE_ELEMENT_DEFINITIONS[key].zh)) ?? null;
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
    '\u672c\u6b21\u5224\u5b9a\uff1a\u4f60\u7f3a' + getFiveElementName(primaryElement) + '\uff0c\u5c31\u5148\u88dc' + primaryDefinition.zh + '\u5143\u7d20\u3002\u88dc\u5f37\u9700\u6c42\u70ba ' + elementScores[primaryElement].need + ' \u5206\u3002',
    '\u7b2c\u4e8c\u9806\u4f4d\u662f' + getFiveElementName(secondaryElement) + '\uff0c\u4f46\u672c\u6b21\u4e0d\u5206\u6563\uff0c\u5148\u88dc' + primaryDefinition.zh + '\u5143\u7d20\u3002',
    avoidElement ? getFiveElementName(avoidElement) + '\u5df2\u7d93\u8f03\u5f37\uff0c\u672c\u6b21\u5148\u4e0d\u88dc\u5b83\u3002' : getFiveElementName(strongElement) + '\u5df2\u7d93\u662f\u8f03\u5f37\u652f\u6490\uff0c\u672c\u6b21\u5148\u5c08\u5fc3\u88dc' + primaryDefinition.zh + '\u5143\u7d20\u3002',
  ];

  return {
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
    summary: '\u672c\u6b21\u5224\u5b9a\uff1a\u4f60\u7f3a' + getFiveElementName(primaryElement) + '\uff0c\u5c31\u5148\u88dc' + primaryDefinition.zh + '\u5143\u7d20\u3002\u624b\u93c8\u88dc\u5f37\u5148\u9078' + primaryDefinition.zh + '\u5143\u7d20\uff0c\u518d\u642d\u914d\u6301\u7e8c\u884c\u52d5\u3002',
    keywords: primaryDefinition.keywords.slice(0, 4),
    reasons,
    recommendedActions: actionFor(primaryElement),
    productEntryLabel: '\u9078\u64c7' + primaryDefinition.zh + '\u5143\u7d20\u80fd\u91cf\u624b\u93c8',
    productRecommendation: getFiveElementProductRecommendation(primaryElement),
    positiveQuote: getFiveElementPositiveQuote(primaryElement),
  };
}


const NUMBER_MATRIX_TO_ELEMENT: Record<FiveElementKey, Array<keyof NumberAnalysisResponse['matrix']>> = {
  metal: ['career', 'stability'],
  wood: ['growth', 'social'],
  water: ['social', 'health'],
  fire: ['career', 'growth'],
  earth: ['family', 'stability', 'health'],
};

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
  const elementScores = Object.fromEntries(ELEMENT_KEYS.map((element) => {
    const keys = NUMBER_MATRIX_TO_ELEMENT[element];
    const strengthBase = keys.reduce((sum, key) => sum + result.matrix[key], 0) / keys.length;
    let need = 100 - strengthBase;
    if (element === 'metal') need += Math.max(0, result.matrix.pressure - 55) * 0.35;
    if (element === 'water') need += Math.max(0, result.matrix.risk - 55) * 0.35;
    if (element === 'fire') need += Math.max(0, 58 - result.matrix.career) * 0.45;
    if (element === 'earth') need += Math.max(0, result.matrix.pressure - 55) * 0.28 + Math.max(0, result.matrix.risk - 55) * 0.22;
    if (element === 'wood') need += Math.max(0, 58 - result.matrix.growth) * 0.45;
    return [element, {
      strength: clampScore(strengthBase),
      need: clampScore(need),
      evidenceCount: 1,
    }];
  })) as Record<FiveElementKey, FiveElementScore>;

  const needRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].need - elementScores[a].need);
  const strengthRanking = [...ELEMENT_KEYS].sort((a, b) => elementScores[b].strength - elementScores[a].strength);
  const primaryElement = needRanking[0];
  const secondaryElement = needRanking.find((key) => key !== primaryElement) ?? needRanking[1];
  const strongElement = strengthRanking[0];
  const avoidElement = elementScores[strongElement].need <= 32 ? strongElement : null;
  const primaryDefinition = FIVE_ELEMENT_DEFINITIONS[primaryElement];
  const mappedLabels = NUMBER_MATRIX_TO_ELEMENT[primaryElement].map((key) => key).join('/');

  evidence.push({
    module: 'number',
    title: '\u6578\u5b57\u8ad6\u5409\u5224\u5b9a' + getFiveElementName(primaryElement) + '\u662f\u7b2c\u4e00\u7f3a\u53e3',
    detail: '\u4f9d\u64da\u6578\u5b57\u77e9\u9663 ' + mappedLabels + ' \u8207\u58d3\u529b/\u98a8\u96aa\u8a0a\u865f\u4ea4\u53c9\u5224\u5b9a\u3002',
    element: primaryElement,
    impact: 'need',
  });

  return {
    sourceModule: 'number',
    analysisId: numberElementAnalysisId(result),
    elementScores,
    primaryElement,
    secondaryElement,
    strongElement,
    avoidElement,
    confidence: result.confidenceScore >= 82 ? 'high' : result.confidenceScore >= 65 ? 'medium' : 'low',
    conflict: elementScores[primaryElement].need - elementScores[secondaryElement].need <= 5,
    supportingModules: ['number'],
    moduleResults: [{ module: 'number', primaryElement, confidence: result.confidenceScore >= 82 ? 'high' : result.confidenceScore >= 65 ? 'medium' : 'low' }],
    evidence,
    ruleVersion: 'number_element_v1',
    summary: '\u672c\u6b21\u6578\u5b57\u8ad6\u5409\u5224\u5b9a\uff1a\u4f60\u7f3a' + getFiveElementName(primaryElement) + '\uff0c\u5c31\u5148\u88dc' + primaryDefinition.zh + '\u5143\u7d20\u3002\u624b\u93c8\u88dc\u5f37\u5148\u9078' + primaryDefinition.zh + '\u5143\u7d20\uff0c\u4e0d\u5148\u5206\u6563\u88dc\u5176\u4ed6\u5143\u7d20\u3002',
    keywords: primaryDefinition.keywords.slice(0, 4),
    reasons: [
      '\u6578\u5b57\u77e9\u9663\u5df2\u6392\u5e8f\uff1a' + getFiveElementName(primaryElement) + '\u662f\u7b2c\u4e00\u88dc\u5f37\u9806\u4f4d\u3002',
      '\u7b2c\u4e8c\u9806\u4f4d\u662f' + getFiveElementName(secondaryElement) + '\uff0c\u4f46\u672c\u6b21\u5148\u5c08\u5fc3\u88dc' + primaryDefinition.zh + '\u5143\u7d20\u3002',
      avoidElement ? getFiveElementName(avoidElement) + '\u5df2\u7d93\u8f03\u5f37\uff0c\u672c\u6b21\u5148\u4e0d\u88dc\u5b83\u3002' : getFiveElementName(strongElement) + '\u662f\u76ee\u524d\u8f03\u5f37\u652f\u6490\uff0c\u4f46\u4e0d\u662f\u672c\u6b21\u624b\u93c8\u4e3b\u88dc\u5143\u7d20\u3002',
    ],
    recommendedActions: actionFor(primaryElement),
    productEntryLabel: '\u9078\u64c7' + primaryDefinition.zh + '\u5143\u7d20\u80fd\u91cf\u624b\u93c8',
    productRecommendation: getFiveElementProductRecommendation(primaryElement),
    positiveQuote: getFiveElementPositiveQuote(primaryElement),
  };
}
