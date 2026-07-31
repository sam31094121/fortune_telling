import { getDayPillarIndex, getHourPillar, shichenFromClockHour, getShichenInfo } from './shichen-engine';
import { computeDetail } from './bazi-detail';
import type { BaziDetail } from './bazi-detail';

const HEAVENLY_STEMS = ['\u7532', '\u4e59', '\u4e19', '\u4e01', '\u620a', '\u5df1', '\u5e9a', '\u8f9b', '\u58ec', '\u7678'] as const;
const EARTHLY_BRANCHES = ['\u5b50', '\u4e11', '\u5bc5', '\u536f', '\u8fb0', '\u5df3', '\u5348', '\u672a', '\u7533', '\u9149', '\u620c', '\u4ea5'] as const;

const PILLAR_KEYS = ['year', 'month', 'day', 'hour'] as const;
const ELEMENTS = ['\u91d1', '\u6728', '\u6c34', '\u706b', '\u571f'] as const;

type Stem = (typeof HEAVENLY_STEMS)[number];
type Branch = (typeof EARTHLY_BRANCHES)[number];
type TraditionalElement = (typeof ELEMENTS)[number];
type PillarKey = (typeof PILLAR_KEYS)[number];
type YinYang = 'yang' | 'yin';
type BrandElement = 'SPACE' | 'AIR' | 'WATER' | 'FIRE' | 'EARTH';

const STEM_ELEMENT: Record<Stem, TraditionalElement> = {
  '\u7532': '\u6728', '\u4e59': '\u6728', '\u4e19': '\u706b', '\u4e01': '\u706b', '\u620a': '\u571f', '\u5df1': '\u571f', '\u5e9a': '\u91d1', '\u8f9b': '\u91d1', '\u58ec': '\u6c34', '\u7678': '\u6c34',
};

const STEM_YINYANG: Record<Stem, YinYang> = {
  '\u7532': 'yang', '\u4e59': 'yin', '\u4e19': 'yang', '\u4e01': 'yin', '\u620a': 'yang', '\u5df1': 'yin', '\u5e9a': 'yang', '\u8f9b': 'yin', '\u58ec': 'yang', '\u7678': 'yin',
};

const BRANCH_ELEMENT: Record<Branch, TraditionalElement> = {
  '\u5b50': '\u6c34', '\u4e11': '\u571f', '\u5bc5': '\u6728', '\u536f': '\u6728', '\u8fb0': '\u571f', '\u5df3': '\u706b', '\u5348': '\u706b', '\u672a': '\u571f', '\u7533': '\u91d1', '\u9149': '\u91d1', '\u620c': '\u571f', '\u4ea5': '\u6c34',
};

const HIDDEN_STEMS: Record<Branch, Stem[]> = {
  '\u5b50': ['\u7678'], '\u4e11': ['\u5df1', '\u7678', '\u8f9b'], '\u5bc5': ['\u7532', '\u4e19', '\u620a'], '\u536f': ['\u4e59'], '\u8fb0': ['\u620a', '\u4e59', '\u7678'], '\u5df3': ['\u4e19', '\u620a', '\u5e9a'],
  '\u5348': ['\u4e01', '\u5df1'], '\u672a': ['\u5df1', '\u4e01', '\u4e59'], '\u7533': ['\u5e9a', '\u58ec', '\u620a'], '\u9149': ['\u8f9b'], '\u620c': ['\u620a', '\u8f9b', '\u4e01'], '\u4ea5': ['\u58ec', '\u7532'],
};

const GENERATES: Record<TraditionalElement, TraditionalElement> = { '\u6728': '\u706b', '\u706b': '\u571f', '\u571f': '\u91d1', '\u91d1': '\u6c34', '\u6c34': '\u6728' };
const CONTROLS: Record<TraditionalElement, TraditionalElement> = { '\u6728': '\u571f', '\u571f': '\u6c34', '\u6c34': '\u706b', '\u706b': '\u91d1', '\u91d1': '\u6728' };
const ELEMENT_DISPLAY: Record<TraditionalElement, { brandElement: BrandElement; displayName: string; actionName: string }> = {
  '\u91d1': { brandElement: 'SPACE', displayName: '\u7a7a\u5143\u7d20', actionName: '\u7a7a' },
  '\u6728': { brandElement: 'AIR', displayName: '\u98a8\u5143\u7d20', actionName: '\u98a8' },
  '\u6c34': { brandElement: 'WATER', displayName: '\u6c34\u5143\u7d20', actionName: '\u6c34' },
  '\u706b': { brandElement: 'FIRE', displayName: '\u706b\u5143\u7d20', actionName: '\u706b' },
  '\u571f': { brandElement: 'EARTH', displayName: '\u5730\u5143\u7d20', actionName: '\u5730' },
};

export type BaziGender = 'male' | 'female';

export type BaziAnalysisInput = {
  name?: string;
  birthDate: string;
  birthTime: string;
  gender: BaziGender;
  country?: string;
  city?: string;
};

export type BaziHiddenStem = { stem: Stem; element: TraditionalElement; tenGod: string };
export type BaziPillar = { label: string; stem: Stem; branch: Branch; stemElement: TraditionalElement; branchElement: TraditionalElement; stemTenGod: string; hiddenStems: BaziHiddenStem[] };
export type BaziLuckCycle = { ageRange: string; pillar: string; focus: string; element: TraditionalElement; startAge?: number; endAge?: number; startYear?: number; endYear?: number; tenGod?: string; direction?: 'forward' | 'backward' };
export type BaziAnnualFortune = { year: number; pillar: string; focus: string; element: TraditionalElement; tenGod?: string };
export type BaziPillars = Record<PillarKey, BaziPillar>;
export type BaziInputSnapshot = Required<Pick<BaziAnalysisInput, 'birthDate' | 'birthTime' | 'gender' | 'country' | 'city'>> & { name: string | null };

type HiddenStemRole = 'main' | 'middle' | 'residual';
type StrengthFactorStatus = 'support' | 'pressure' | 'neutral';
type PatternStability = 'stable' | 'mixed' | 'unstable';

export type BaziCalendarProfile = {
  solarDate: string;
  birthTime: string;
  calendarType: 'solar';
  lunarConverted: false;
  trueSolarTimeApplied: false;
  shichen: { branchIndex: number; label: string; range: string; branch: string };
  note: string;
};

export type BaziPillarDetail = {
  key: PillarKey;
  label: string;
  ganzhi: string;
  stem: Stem;
  branch: Branch;
  stemElement: TraditionalElement;
  branchElement: TraditionalElement;
  stemYinYang: YinYang;
  branchMainElement: TraditionalElement;
  stemTenGod: string;
  branchMainTenGod: string;
  hiddenStemLabels: string[];
};

export type BaziHiddenStemLayer = {
  role: HiddenStemRole;
  roleLabel: string;
  stem: Stem;
  element: TraditionalElement;
  tenGod: string;
  weight: number;
};

export type BaziTenGodDistribution = {
  counts: Record<string, number>;
  ranked: Array<{ tenGod: string; score: number; level: 'strong' | 'medium' | 'light' }>;
  dominant: string[];
  missing: string[];
};

export type BaziElementStatistics = {
  stems: Record<TraditionalElement, number>;
  branches: Record<TraditionalElement, number>;
  hiddenStems: Record<TraditionalElement, number>;
  total: Record<TraditionalElement, number>;
  percentages: Record<TraditionalElement, number>;
};

export type BaziStrengthFactor = {
  id: string;
  label: string;
  status: StrengthFactorStatus;
  score: number;
  detail: string;
};

export type BaziStructurePattern = {
  primaryPattern: string;
  supportingPattern: string;
  stability: PatternStability;
  mixed: boolean;
  brokenBy: string[];
  specialNotes: string[];
};

export type BaziGodSet = {
  joyGod: TraditionalElement;
  usefulGod: TraditionalElement;
  avoidGod: TraditionalElement;
  neutralGod: TraditionalElement;
  enemyGod: TraditionalElement;
  reason: string;
};

export type BaziProfessionalChart = {
  layer: 'professional_chart';
  generatedFrom: 'normalized_birth_input';
  recalculationAllowed: false;
  input: BaziInputSnapshot;
  timezone: { country: string; city: string; note: string };
  calendar: BaziCalendarProfile;
  pillars: BaziPillars;
  pillarDetails: Record<PillarKey, BaziPillarDetail>;
  hiddenStems: Record<PillarKey, BaziHiddenStem[]>;
  hiddenStemStructure: Record<PillarKey, BaziHiddenStemLayer[]>;
  tenGods: Record<PillarKey, { stem: string; branchMain: string; hidden: string[] }>;
  tenGodDistribution: BaziTenGodDistribution;
  dayMaster: { stem: Stem; element: TraditionalElement; strength: number; level: string };
  elementCounts: Record<TraditionalElement, number>;
  elementStatistics: BaziElementStatistics;
  strengthAnalysis: { monthSeason: string; supportScore: number; pressureScore: number; verdict: string; explanation: string };
  strengthFactors: BaziStrengthFactor[];
  gods: BaziGodSet;
  luckCycles: BaziLuckCycle[];
  annualFortunes: BaziAnnualFortune[];
  structurePattern: BaziStructurePattern;
  structureFocus: string;
  detail: BaziDetail;
};

export type BaziElementPriority = {
  rank: 1 | 2 | 3 | 4 | 5;
  element: TraditionalElement;
  brandElement: BrandElement;
  displayName: string;
  count: number;
  needScore: number;
  source: 'professional_chart';
  judgementLevel: 'primary' | 'secondary' | 'supporting';
  professionalBasis: string[];
  reason: string;
};

export type BaziDeepAnalysis = {
  layer: 'ai_deep_analysis';
  sourceLayer: 'professional_chart';
  sourceChecksum: string;
  recalculationAllowed: false;
  summary: string;
  plainText: string;
  chartSummary: string;
  keyFindings: string[];
  userReadableSections: Array<{ title: string; content: string; basis?: string }>;
  professionalSignals: {
    dayMaster: string;
    structure: string;
    tenGodFocus: string[];
    strengthFocus: string;
    elementFocus: string;
    timingFocus: string;
  };
  logicTrace: Array<{ step: string; source: 'professional_chart'; output: string }>;
  elementPriority: BaziElementPriority[];
};

export type BaziReinforcementItem = {
  rank: 1 | 2 | 3;
  element: TraditionalElement;
  brandElement: BrandElement;
  displayName: string;
  title: string;
  judgement: string;
  action: string;
  suggestion: string;
  basis: string[];
  intensity: 'core' | 'important' | 'follow_up';
  sequenceNote: string;
};

export type BaziReinforcementPlan = {
  layer: 'ai_reinforcement_plan';
  sourceLayer: 'ai_deep_analysis';
  sourceChecksum: string;
  recalculationAllowed: false;
  principle: string;
  basisSummary: string;
  elementSequenceExplanation: string;
  first: BaziReinforcementItem;
  second: BaziReinforcementItem;
  third: BaziReinforcementItem;
  priorityOrder: BaziReinforcementItem[];
};

export type BaziDataFlow = {
  direction: 'forward_only';
  pipeline: ['\u751f\u6210\u8cc7\u6599', '\u7b2c\u4e00\u5c64\u5c08\u696d\u547d\u76e4', '\u7b2c\u4e8c\u5c64 AI \u89e3\u8b80', '\u7b2c\u4e09\u5c64 AI \u88dc\u5f37'];
  rules: {
    professionalChartOnlyBuildsChart: true;
    deepAnalysisReadsProfessionalChartOnly: true;
    reinforcementReadsDeepAnalysisOnly: true;
    noReverseFlow: true;
    noRepeatedChartCalculation: true;
  };
};

export type BaziAnalysisResult = {
  ok: true;
  mode: 'bazi';
  moduleId: 'BAZI';
  engineVersion: 'bazi_three_layer_v3';
  input: BaziInputSnapshot;
  timezone: BaziProfessionalChart['timezone'];
  pillars: BaziPillars;
  hiddenStems: BaziProfessionalChart['hiddenStems'];
  tenGods: BaziProfessionalChart['tenGods'];
  dayMaster: BaziProfessionalChart['dayMaster'];
  elementCounts: BaziProfessionalChart['elementCounts'];
  strengthAnalysis: BaziProfessionalChart['strengthAnalysis'];
  gods: BaziProfessionalChart['gods'];
  luckCycles: BaziLuckCycle[];
  annualFortunes: BaziAnnualFortune[];
  structureFocus: string;
  aiReading: { summary: string; plainText: string; chartSummary: string; encouragement: string };
  plainReading: string;
  detail: BaziDetail;
  professionalChart: BaziProfessionalChart;
  aiDeepAnalysis: BaziDeepAnalysis;
  aiReinforcementPlan: BaziReinforcementPlan;
  dataFlow: BaziDataFlow;
};

function mod(value: number, base: number) { return ((value % base) + base) % base; }
function ganzhiFromIndex(index: number) { const i = mod(index, 60); return { stem: HEAVENLY_STEMS[i % 10], branch: EARTHLY_BRANCHES[i % 12] }; }
function parseDate(input: string) {
  const parts = input.split('-');
  if (parts.length !== 3) throw new Error('birthDate \u5fc5\u9808\u70ba YYYY-MM-DD \u683c\u5f0f');
  const [year, month, day] = parts.map((value) => Number.parseInt(value, 10));
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) throw new Error('birthDate \u5305\u542b\u975e\u6578\u5b57');
  return { year, month, day };
}
function parseHour(input: string) {
  const parts = input.split(':');
  if (parts.length !== 2) throw new Error('birthTime \u5fc5\u9808\u70ba HH:MM \u683c\u5f0f');
  const hour = Number.parseInt(parts[0], 10);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('birthTime \u5c0f\u6642\u5fc5\u9808\u5728 0-23 \u4e4b\u9593');
  return hour;
}
function getYearPillarIndex(year: number, month: number, day: number) { const adjustedYear = month < 2 || (month === 2 && day < 4) ? year - 1 : year; return mod(adjustedYear - 4, 60); }
function getMonthPillarIndex(yearStemIndex: number, month: number) {
  const monthBranchIndex = mod(month + 1, 12);
  const monthStemIndex = mod((yearStemIndex % 5) * 2 + month, 10);
  for (let index = 0; index < 60; index += 1) if (index % 10 === monthStemIndex && index % 12 === monthBranchIndex) return index;
  return monthStemIndex;
}
function clampScore(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function hashText(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
function chartChecksum(chart: Pick<BaziProfessionalChart, 'input' | 'pillars' | 'pillarDetails' | 'elementCounts' | 'elementStatistics' | 'tenGodDistribution' | 'dayMaster' | 'gods' | 'structurePattern'>) {
  return hashText(JSON.stringify({
    input: chart.input,
    pillars: chart.pillars,
    pillarDetails: chart.pillarDetails,
    elementCounts: chart.elementCounts,
    elementStatistics: chart.elementStatistics,
    tenGodDistribution: chart.tenGodDistribution,
    dayMaster: chart.dayMaster,
    gods: chart.gods,
    structurePattern: chart.structurePattern,
  }));
}
function analysisChecksum(analysis: Pick<BaziDeepAnalysis, 'summary' | 'plainText' | 'elementPriority'>) {
  return hashText(JSON.stringify({ summary: analysis.summary, plainText: analysis.plainText, elementPriority: analysis.elementPriority }));
}

function getTenGod(dayStem: Stem, targetStem: Stem) {
  const dayElement = STEM_ELEMENT[dayStem];
  const targetElement = STEM_ELEMENT[targetStem];
  const samePolarity = STEM_YINYANG[dayStem] === STEM_YINYANG[targetStem];
  if (dayElement === targetElement) return samePolarity ? '\u6bd4\u80a9' : '\u52ab\u8ca1';
  if (GENERATES[dayElement] === targetElement) return samePolarity ? '\u98df\u795e' : '\u50b7\u5b98';
  if (GENERATES[targetElement] === dayElement) return samePolarity ? '\u504f\u5370' : '\u6b63\u5370';
  if (CONTROLS[dayElement] === targetElement) return samePolarity ? '\u504f\u8ca1' : '\u6b63\u8ca1';
  if (CONTROLS[targetElement] === dayElement) return samePolarity ? '\u4e03\u6bba' : '\u6b63\u5b98';
  return '\u5e73\u8861';
}

function pillar(label: string, index: number, dayStem: Stem): BaziPillar {
  const value = ganzhiFromIndex(index);
  return {
    label,
    stem: value.stem,
    branch: value.branch,
    stemElement: STEM_ELEMENT[value.stem],
    branchElement: BRANCH_ELEMENT[value.branch],
    stemTenGod: getTenGod(dayStem, value.stem),
    hiddenStems: HIDDEN_STEMS[value.branch].map((stem) => ({ stem, element: STEM_ELEMENT[stem], tenGod: getTenGod(dayStem, stem) })),
  };
}

function countElements(pillars: BaziPillars) {
  const counts: Record<TraditionalElement, number> = { '\u91d1': 0, '\u6728': 0, '\u6c34': 0, '\u706b': 0, '\u571f': 0 };
  Object.values(pillars).forEach((item) => {
    counts[item.stemElement] += 1.2;
    counts[item.branchElement] += 1;
    item.hiddenStems.forEach((hidden, index) => { counts[hidden.element] += index === 0 ? 0.6 : 0.35; });
  });
  return Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(value.toFixed(2))])) as Record<TraditionalElement, number>;
}

function buildStrengthAnalysis(monthBranch: Branch, counts: Record<TraditionalElement, number>, dayElement: TraditionalElement) {
  const monthSeason = BRANCH_ELEMENT[monthBranch];
  const source = ELEMENTS.find((element) => GENERATES[element] === dayElement) ?? dayElement;
  const pressure = ELEMENTS.find((element) => CONTROLS[element] === dayElement) ?? dayElement;
  const supportScore = Math.round(counts[dayElement] * 14 + counts[source] * 9 + (monthSeason === dayElement ? 16 : 0));
  const pressureScore = Math.round(counts[pressure] * 13 + counts[CONTROLS[dayElement]] * 7);
  const net = supportScore - pressureScore;
  const verdict = net >= 26 ? '\u504f\u65fa' : net >= -10 ? '\u4e2d\u548c' : '\u504f\u5f31';
  return { monthSeason: monthSeason + '\u6c23\u7576\u4ee4', supportScore, pressureScore, verdict, explanation: '\u6708\u4ee4\u4e3b\u6c23\u70ba' + monthSeason + '\uff0c\u5f8c\u7aef\u4f9d\u540c\u6c23\u3001\u751f\u6276\u8207\u5236\u5316\u58d3\u529b\u7d71\u8a08\uff0c\u5224\u5b9a\u65e5\u4e3b\u70ba' + verdict + '\u3002' };
}

function emptyElementRecord(): Record<TraditionalElement, number> {
  return { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
}

function roundElementRecord(record: Record<TraditionalElement, number>) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, Number(value.toFixed(2))])) as Record<TraditionalElement, number>;
}

function buildCalendarProfile(input: BaziAnalysisInput, shichenIndex: number): BaziCalendarProfile {
  const shichen = getShichenInfo(shichenIndex);
  return {
    solarDate: input.birthDate,
    birthTime: input.birthTime,
    calendarType: 'solar',
    lunarConverted: false,
    trueSolarTimeApplied: false,
    shichen: { branchIndex: shichenIndex, label: shichen.label, range: shichen.range, branch: EARTHLY_BRANCHES[shichenIndex] },
    note: '第一層命盤以使用者輸入的陽曆日期與當地時間排盤；目前不在此層套入 AI 解讀，也不反向修改輸入資料。',
  };
}

function buildPillarDetails(pillars: BaziPillars) {
  return Object.fromEntries(PILLAR_KEYS.map((key) => {
    const item = pillars[key];
    const mainHidden = item.hiddenStems[0];
    const detail: BaziPillarDetail = {
      key,
      label: item.label,
      ganzhi: item.stem + item.branch,
      stem: item.stem,
      branch: item.branch,
      stemElement: item.stemElement,
      branchElement: item.branchElement,
      stemYinYang: STEM_YINYANG[item.stem],
      branchMainElement: mainHidden?.element ?? item.branchElement,
      stemTenGod: item.stemTenGod,
      branchMainTenGod: mainHidden?.tenGod ?? '平衡',
      hiddenStemLabels: item.hiddenStems.map((hidden) => hidden.stem + hidden.element + hidden.tenGod),
    };
    return [key, detail];
  })) as Record<PillarKey, BaziPillarDetail>;
}

function buildHiddenStemStructure(pillars: BaziPillars) {
  const roles: HiddenStemRole[] = ['main', 'middle', 'residual'];
  const roleLabels: Record<HiddenStemRole, string> = { main: '主氣', middle: '中氣', residual: '餘氣' };
  const weights = [0.6, 0.35, 0.2];
  return Object.fromEntries(PILLAR_KEYS.map((key) => [key, pillars[key].hiddenStems.map((hidden, index) => {
    const role = roles[index] ?? 'residual';
    return { role, roleLabel: roleLabels[role], stem: hidden.stem, element: hidden.element, tenGod: hidden.tenGod, weight: weights[index] ?? 0.2 };
  })])) as Record<PillarKey, BaziHiddenStemLayer[]>;
}

function buildTenGodDistribution(pillars: BaziPillars): BaziTenGodDistribution {
  const allTenGods = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '七殺', '正官', '偏印', '正印'];
  const counts: Record<string, number> = Object.fromEntries(allTenGods.map((name) => [name, 0]));
  Object.values(pillars).forEach((item) => {
    counts[item.stemTenGod] = (counts[item.stemTenGod] ?? 0) + 1.2;
    item.hiddenStems.forEach((hidden, index) => {
      counts[hidden.tenGod] = (counts[hidden.tenGod] ?? 0) + (index === 0 ? 0.8 : 0.4);
    });
  });
  const normalized = Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(value.toFixed(2))]));
  const ranked = Object.entries(normalized)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([tenGod, score]) => ({ tenGod, score, level: score >= 2 ? 'strong' as const : score >= 1 ? 'medium' as const : 'light' as const }));
  return {
    counts: normalized,
    ranked,
    dominant: ranked.filter((item) => item.level === 'strong').map((item) => item.tenGod),
    missing: allTenGods.filter((name) => (normalized[name] ?? 0) === 0),
  };
}

function buildElementStatistics(pillars: BaziPillars): BaziElementStatistics {
  const stems = emptyElementRecord();
  const branches = emptyElementRecord();
  const hiddenStems = emptyElementRecord();
  Object.values(pillars).forEach((item) => {
    stems[item.stemElement] += 1;
    branches[item.branchElement] += 1;
    item.hiddenStems.forEach((hidden, index) => { hiddenStems[hidden.element] += index === 0 ? 0.6 : 0.35; });
  });
  const total = emptyElementRecord();
  ELEMENTS.forEach((element) => { total[element] = stems[element] + branches[element] + hiddenStems[element]; });
  const totalScore = ELEMENTS.reduce((sum, element) => sum + total[element], 0) || 1;
  const percentages = emptyElementRecord();
  ELEMENTS.forEach((element) => { percentages[element] = Number(((total[element] / totalScore) * 100).toFixed(1)); });
  return { stems: roundElementRecord(stems), branches: roundElementRecord(branches), hiddenStems: roundElementRecord(hiddenStems), total: roundElementRecord(total), percentages };
}

function buildStrengthFactors(pillars: BaziPillars, counts: Record<TraditionalElement, number>, strength: BaziProfessionalChart['strengthAnalysis']): BaziStrengthFactor[] {
  const dayElement = pillars.day.stemElement;
  const source = ELEMENTS.find((element) => GENERATES[element] === dayElement) ?? dayElement;
  const wealth = CONTROLS[dayElement];
  const officer = ELEMENTS.find((element) => CONTROLS[element] === dayElement) ?? dayElement;
  const rootCount = Object.values(pillars).filter((item) => item.hiddenStems.some((hidden) => hidden.element === dayElement)).length;
  const sameStemCount = Object.values(pillars).filter((item) => item.stemElement === dayElement).length;
  return [
    {
      id: 'month_command',
      label: '得令（月令）',
      status: pillars.month.branchElement === dayElement ? 'support' : pillars.month.branchElement === officer ? 'pressure' : 'neutral',
      score: pillars.month.branchElement === dayElement ? 28 : pillars.month.branchElement === source ? 18 : pillars.month.branchElement === officer ? -18 : 4,
      detail: '月支主氣為' + pillars.month.branchElement + '，用來判定日主是否得令。',
    },
    {
      id: 'root',
      label: '有根（地支藏干）',
      status: rootCount >= 2 ? 'support' : rootCount === 0 ? 'pressure' : 'neutral',
      score: rootCount * 10,
      detail: '四支藏干中有 ' + rootCount + ' 處含日主同氣，代表根氣深淺。',
    },
    {
      id: 'peer_stems',
      label: '天干幫扶',
      status: sameStemCount >= 2 ? 'support' : sameStemCount === 0 ? 'pressure' : 'neutral',
      score: sameStemCount * 8,
      detail: '四柱天干同五行出現 ' + sameStemCount + ' 次，作為比劫幫身訊號。',
    },
    {
      id: 'seal_support',
      label: '印星生扶',
      status: counts[source] >= 2 ? 'support' : counts[source] <= 0.7 ? 'pressure' : 'neutral',
      score: Math.round(counts[source] * 9),
      detail: source + '生扶日主' + dayElement + '，統計分數為 ' + counts[source] + '。',
    },
    {
      id: 'output_wealth_officer',
      label: '食傷財官消耗',
      status: strength.pressureScore > strength.supportScore ? 'pressure' : 'neutral',
      score: -Math.round((counts[GENERATES[dayElement]] + counts[wealth] + counts[officer]) * 5),
      detail: '食傷、財星、官殺會消耗或制約日主，合併作為壓力訊號。',
    },
  ];
}

function buildStructurePattern(pillars: BaziPillars, distribution: BaziTenGodDistribution, strength: BaziProfessionalChart['strengthAnalysis']): BaziStructurePattern {
  const top = distribution.ranked[0]?.tenGod ?? '平衡';
  const monthMain = pillars.month.hiddenStems[0]?.tenGod ?? pillars.month.stemTenGod;
  const mixed = distribution.dominant.length >= 3;
  const brokenBy = distribution.ranked.filter((item) => item.score >= 1.6 && item.tenGod !== top).map((item) => item.tenGod);
  return {
    primaryPattern: monthMain + '格',
    supportingPattern: top + '主導',
    stability: mixed ? 'mixed' : strength.verdict === '中和' ? 'stable' : 'unstable',
    mixed,
    brokenBy,
    specialNotes: [
      '第一層僅建立格局資料，不輸出吉凶斷語。',
      '月令取' + monthMain + '作格局核心，十神分布以' + top + '為主要訊號。',
    ],
  };
}

function chooseGods(counts: Record<TraditionalElement, number>, strength: string, dayElement: TraditionalElement): BaziGodSet {
  const lowToHigh = [...ELEMENTS].sort((a, b) => counts[a] - counts[b]);
  const highToLow = [...ELEMENTS].sort((a, b) => counts[b] - counts[a]);
  const low = lowToHigh[0];
  const high = highToLow[0];
  const useful = strength === '偏弱' ? (ELEMENTS.find((element) => GENERATES[element] === dayElement) ?? dayElement) : low;
  const neutral = lowToHigh.find((element) => element !== useful && element !== low && element !== high) ?? dayElement;
  const enemy = ELEMENTS.find((element) => CONTROLS[element] === useful) ?? high;
  return {
    joyGod: low,
    usefulGod: useful,
    avoidGod: high,
    neutralGod: neutral,
    enemyGod: enemy,
    reason: '八字引擎依四柱、藏干、十神與日主旺衰判斷：用神為' + useful + '，喜神為' + low + '，忌神為' + high + '，仇神為' + enemy + '，閒神為' + neutral + '。',
  };
}

function buildLuckCycles(dayIndex: number, gender: BaziGender, yearStem: Stem, birthYear: number, dayStem: Stem) {
  const forward = (gender === 'male' && STEM_YINYANG[yearStem] === 'yang') || (gender === 'female' && STEM_YINYANG[yearStem] === 'yin');
  return Array.from({ length: 8 }, (_, index) => {
    const item = ganzhiFromIndex(mod(dayIndex + (forward ? index + 1 : -index - 1), 60));
    const startAge = 8 + index * 10;
    const endAge = startAge + 9;
    return {
      ageRange: startAge + '-' + endAge + '歲',
      startAge,
      endAge,
      startYear: birthYear + startAge,
      endYear: birthYear + endAge,
      pillar: item.stem + item.branch,
      element: STEM_ELEMENT[item.stem],
      tenGod: getTenGod(dayStem, item.stem),
      direction: forward ? 'forward' as const : 'backward' as const,
      focus: '大運只作第一層節奏資料，後續層級只能讀取，不得重新起運或重算命盤。',
    };
  });
}

function buildAnnualFortunes(currentYear: number, dayStem: Stem) {
  return Array.from({ length: 5 }, (_, index) => {
    const year = currentYear + index;
    const item = ganzhiFromIndex(year - 4);
    return { year, pillar: item.stem + item.branch, element: STEM_ELEMENT[item.stem], tenGod: getTenGod(dayStem, item.stem), focus: '流年保留歲次、天干十神與五行訊號，供第二層讀取。' };
  });
}

function buildProfessionalChart(input: BaziAnalysisInput): BaziProfessionalChart {
  if (!input.birthDate || !input.birthTime || !input.gender) throw new Error('birthDate、birthTime、gender 為必填欄位');

  const { year, month, day } = parseDate(input.birthDate);
  const hour = parseHour(input.birthTime);
  const yearIndex = getYearPillarIndex(year, month, day);
  const monthIndex = getMonthPillarIndex(yearIndex % 10, month);
  const dayIndex = getDayPillarIndex(input.birthDate);
  const dayGanzhi = ganzhiFromIndex(dayIndex);
  const shichenIndex = shichenFromClockHour(hour);
  const hourPillar = getHourPillar(dayIndex % 10, shichenIndex);
  const hourIndex = (() => {
    for (let index = 0; index < 60; index += 1) if (index % 10 === hourPillar.stemIndex && index % 12 === hourPillar.branchIndex) return index;
    return hourPillar.stemIndex;
  })();
  const pillars: BaziPillars = {
    year: pillar('年柱', yearIndex, dayGanzhi.stem),
    month: pillar('月柱', monthIndex, dayGanzhi.stem),
    day: pillar('日柱', dayIndex, dayGanzhi.stem),
    hour: pillar('時柱', hourIndex, dayGanzhi.stem),
  };
  const elementCounts = countElements(pillars);
  const strengthAnalysis = buildStrengthAnalysis(pillars.month.branch, elementCounts, pillars.day.stemElement);
  const gods = chooseGods(elementCounts, strengthAnalysis.verdict, pillars.day.stemElement);
  const hiddenStems = Object.fromEntries(PILLAR_KEYS.map((key) => [key, pillars[key].hiddenStems])) as BaziProfessionalChart['hiddenStems'];
  const hiddenStemStructure = buildHiddenStemStructure(pillars);
  const tenGods = Object.fromEntries(PILLAR_KEYS.map((key) => [key, { stem: pillars[key].stemTenGod, branchMain: pillars[key].hiddenStems[0]?.tenGod ?? '平衡', hidden: pillars[key].hiddenStems.map((item) => item.tenGod) }])) as BaziProfessionalChart['tenGods'];
  const pillarDetails = buildPillarDetails(pillars);
  const tenGodDistribution = buildTenGodDistribution(pillars);
  const elementStatistics = buildElementStatistics(pillars);
  const strengthFactors = buildStrengthFactors(pillars, elementCounts, strengthAnalysis);
  const structurePattern = buildStructurePattern(pillars, tenGodDistribution, strengthAnalysis);
  const shichen = getShichenInfo(shichenIndex);
  const calendar = buildCalendarProfile(input, shichenIndex);
  const inputSnapshot: BaziInputSnapshot = {
    name: input.name?.trim() || null,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    gender: input.gender,
    country: input.country?.trim() || '台灣',
    city: input.city?.trim() || '台北',
  };
  const timezone = { country: inputSnapshot.country, city: inputSnapshot.city, note: '第一層只記錄國家與城市作為時區來源，本次以使用者輸入的當地時間排盤。' };
  const detail = computeDetail(pillars, hiddenStems, tenGods);

  return {
    layer: 'professional_chart',
    generatedFrom: 'normalized_birth_input',
    recalculationAllowed: false,
    input: inputSnapshot,
    timezone,
    calendar,
    pillars,
    pillarDetails,
    hiddenStems,
    hiddenStemStructure,
    tenGods,
    tenGodDistribution,
    dayMaster: { stem: pillars.day.stem, element: pillars.day.stemElement, strength: Math.max(0, strengthAnalysis.supportScore - strengthAnalysis.pressureScore), level: strengthAnalysis.verdict },
    elementCounts,
    elementStatistics,
    strengthAnalysis,
    strengthFactors,
    gods,
    luckCycles: buildLuckCycles(dayIndex, input.gender, pillars.year.stem, year, pillars.day.stem),
    annualFortunes: buildAnnualFortunes(new Date().getFullYear(), pillars.day.stem),
    structurePattern,
    structureFocus: '四柱已完成：' + pillars.year.stem + pillars.year.branch + '、' + pillars.month.stem + pillars.month.branch + '、' + pillars.day.stem + pillars.day.branch + '、' + pillars.hour.stem + pillars.hour.branch + '；時辰為' + shichen.label + '。',
    detail,
  };
}

function buildElementPriority(chart: BaziProfessionalChart): BaziElementPriority[] {
  const percentages = chart.elementStatistics.percentages;
  const maxPercent = Math.max(...ELEMENTS.map((element) => percentages[element]), 1);
  const lowToHigh = [...ELEMENTS].sort((a, b) => percentages[a] - percentages[b]);
  const ordered = Array.from(new Set([chart.gods.usefulGod, chart.gods.joyGod, chart.gods.neutralGod, ...lowToHigh]));
  return ordered.map((element, index) => {
    const display = ELEMENT_DISPLAY[element];
    const count = chart.elementCounts[element];
    const percent = percentages[element] ?? 0;
    const godBonus = element === chart.gods.usefulGod ? 28 : element === chart.gods.joyGod ? 18 : element === chart.gods.neutralGod ? 8 : 0;
    const avoidPenalty = element === chart.gods.avoidGod ? 14 : element === chart.gods.enemyGod ? 8 : 0;
    const rootNeed = chart.strengthAnalysis.verdict === '偏弱' && (element === chart.gods.usefulGod || element === chart.dayMaster.element) ? 12 : 0;
    const needScore = clampScore(100 - (percent / maxPercent) * 54 + godBonus + rootNeed - avoidPenalty);
    const judgementLevel = index === 0 ? 'primary' : index === 1 ? 'secondary' : 'supporting';
    const professionalBasis = [
      '第一層五行比例：' + element + '佔 ' + percent + '%，原始權重 ' + count + '。',
      element === chart.gods.usefulGod ? '第一層喜用忌判定：此元素為用神。' : element === chart.gods.joyGod ? '第一層喜用忌判定：此元素為喜神。' : element === chart.gods.neutralGod ? '第一層喜用忌判定：此元素為閒神，可作後續穩定。' : '第一層五行排序列入後續補強觀察。',
      '第一層日主旺衰：' + chart.dayMaster.stem + chart.dayMaster.element + '為' + chart.dayMaster.level + '。',
    ];
    return {
      rank: (index + 1) as BaziElementPriority['rank'],
      element,
      brandElement: display.brandElement,
      displayName: display.displayName,
      count,
      needScore,
      source: 'professional_chart',
      judgementLevel,
      professionalBasis,
      reason: '第二層讀取第一層命盤後判定：' + display.displayName + '補強分數為 ' + needScore + '，依五行比例、喜用忌與日主旺衰排序。',
    };
  }) as BaziElementPriority[];
}

function buildDeepAnalysis(chart: BaziProfessionalChart): BaziDeepAnalysis {
  const checksum = chartChecksum(chart);
  const elementPriority = buildElementPriority(chart);
  const dayPillar = chart.pillars.day.stem + chart.pillars.day.branch;
  const topTenGods = chart.tenGodDistribution.ranked.slice(0, 3).map((item) => item.tenGod);
  const pressureFactors = chart.strengthFactors.filter((item) => item.status === 'pressure').map((item) => item.label);
  const supportFactors = chart.strengthFactors.filter((item) => item.status === 'support').map((item) => item.label);
  const firstElement = elementPriority[0];
  const secondElement = elementPriority[1] ?? firstElement;
  const thirdElement = elementPriority[2] ?? secondElement;
  const timingFocus = chart.luckCycles[0]
    ? chart.luckCycles[0].ageRange + '大運為' + chart.luckCycles[0].pillar + '，十神訊號為' + (chart.luckCycles[0].tenGod ?? '未標示') + '。'
    : '第一層未產生大運資料。';
  const professionalSignals = {
    dayMaster: chart.dayMaster.stem + chart.dayMaster.element + '日主，旺衰判定為' + chart.dayMaster.level,
    structure: chart.structurePattern.primaryPattern + '，輔助訊號為' + chart.structurePattern.supportingPattern,
    tenGodFocus: topTenGods,
    strengthFocus: '扶助因子：' + (supportFactors.join('、') || '無明顯扶助') + '；壓力因子：' + (pressureFactors.join('、') || '無明顯壓力') + '。',
    elementFocus: '補強排序：' + [firstElement.displayName, secondElement.displayName, thirdElement.displayName].join(' → '),
    timingFocus,
  };
  const chartSummary = '命盤重點：' + dayPillar + '日主、' + chart.strengthAnalysis.verdict + '、' + chart.structurePattern.primaryPattern + '、用神' + chart.gods.usefulGod + '、喜神' + chart.gods.joyGod + '。';
  const summary = '第二層 AI 解讀：直接讀取第一層專業命盤，不重新排盤。本命' + professionalSignals.dayMaster + '，目前優先讀取' + firstElement.displayName + '作第一補強方向。';
  const userReadableSections = [
    { title: '命盤核心', basis: '來源：第一層四柱、日主、格局。', content: chartSummary + '此段只把命盤主軸轉成一般使用者能理解的語言。' },
    { title: '格局與十神', basis: '來源：第一層格局與十神分布。', content: '第一層判定格局為' + professionalSignals.structure + '；十神主訊號為' + (topTenGods.join('、') || '分布平均') + '。這代表第二層解讀會以格局主軸與十神比例作為分析骨架。' },
    { title: '日主強弱', basis: '來源：第一層日主強弱規則。', content: chart.strengthAnalysis.explanation + professionalSignals.strengthFocus },
    { title: '五行補強排序', basis: '來源：第一層五行分層統計、喜用忌神。', content: '第二層判定補強順序為' + [firstElement.displayName, secondElement.displayName, thirdElement.displayName].join('、') + '。此排序交給第三層制定行動，不在第二層直接給補強方案。' },
    { title: '大運流年讀取', basis: '來源：第一層大運與流年資料。', content: timingFocus + '流年資料僅作節奏參考，第二層不重算歲運。' },
  ];
  const keyFindings = [chart.structureFocus, professionalSignals.structure, professionalSignals.strengthFocus, chart.gods.reason, professionalSignals.elementFocus];
  const logicTrace = [
    { step: '讀取第一層四柱', source: 'professional_chart' as const, output: chart.structureFocus },
    { step: '讀取格局與十神', source: 'professional_chart' as const, output: professionalSignals.structure + '；十神：' + (topTenGods.join('、') || '分布平均') },
    { step: '讀取日主強弱', source: 'professional_chart' as const, output: professionalSignals.dayMaster + '；' + professionalSignals.strengthFocus },
    { step: '讀取五行統計', source: 'professional_chart' as const, output: professionalSignals.elementFocus },
    { step: '交給第三層', source: 'professional_chart' as const, output: '第二層只完成白話分析與排序依據，不輸出行動方案。' },
  ];
  const plainText = [summary, userReadableSections.map((section) => section.content).join(' '), '這一層只讀取第一層專業命盤並轉譯，不重新排盤、不重新起運、不直接制定補強方案。'].join(' ');

  return {
    layer: 'ai_deep_analysis',
    sourceLayer: 'professional_chart',
    sourceChecksum: checksum,
    recalculationAllowed: false,
    summary,
    plainText,
    chartSummary,
    keyFindings,
    userReadableSections,
    professionalSignals,
    logicTrace,
    elementPriority,
  };
}

function buildReinforcementItem(priority: BaziElementPriority, rank: 1 | 2 | 3, analysis: BaziDeepAnalysis): BaziReinforcementItem {
  const display = ELEMENT_DISPLAY[priority.element];
  const rankLabel = rank === 1 ? '第一補強' : rank === 2 ? '第二補強' : '第三補強';
  const intensity = rank === 1 ? 'core' : rank === 2 ? 'important' : 'follow_up';
  const sequenceNote = rank === 1 ? '先處理核心缺口，完成後才進入第二補強。' : rank === 2 ? '承接第一補強後，建立第二層穩定度。' : '最後補上第三順位，避免整體能量失衡。';
  const basis = [...priority.professionalBasis, '第二層專業訊號：' + analysis.professionalSignals.dayMaster + '。', '第二層排序依據：' + analysis.professionalSignals.elementFocus + '。'];
  return {
    rank,
    element: priority.element,
    brandElement: priority.brandElement,
    displayName: priority.displayName,
    title: rankLabel + '：' + priority.displayName,
    judgement: 'AI 判定：目前' + rankLabel + '為' + priority.displayName + '，補強分數 ' + priority.needScore + '。',
    action: '請補強：' + priority.displayName + '。',
    suggestion: '行動方向：先對準' + display.actionName + '元素對應的節奏、空間與日常選擇。' + sequenceNote,
    basis,
    intensity,
    sequenceNote,
  };
}

function buildReinforcementPlan(analysis: BaziDeepAnalysis): BaziReinforcementPlan {
  const checksum = analysisChecksum(analysis);
  const first = buildReinforcementItem(analysis.elementPriority[0], 1, analysis);
  const second = buildReinforcementItem(analysis.elementPriority[1] ?? analysis.elementPriority[0], 2, analysis);
  const third = buildReinforcementItem(analysis.elementPriority[2] ?? analysis.elementPriority[1] ?? analysis.elementPriority[0], 3, analysis);
  return {
    layer: 'ai_reinforcement_plan',
    sourceLayer: 'ai_deep_analysis',
    sourceChecksum: checksum,
    recalculationAllowed: false,
    principle: 'AI 不預測你的命運；AI 判定你目前最需要補強的方向。',
    basisSummary: '第三層只讀取第二層輸出的補強排序與專業訊號：' + analysis.professionalSignals.elementFocus + '。',
    elementSequenceExplanation: '補強順序固定為：' + [first.displayName, second.displayName, third.displayName].join(' → ') + '。先補第一順位，再補第二順位，最後補第三順位。',
    first,
    second,
    third,
    priorityOrder: [first, second, third],
  };
}

function buildDataFlow(): BaziDataFlow {
  return {
    direction: 'forward_only',
    pipeline: ['\u751f\u6210\u8cc7\u6599', '\u7b2c\u4e00\u5c64\u5c08\u696d\u547d\u76e4', '\u7b2c\u4e8c\u5c64 AI \u89e3\u8b80', '\u7b2c\u4e09\u5c64 AI \u88dc\u5f37'],
    rules: {
      professionalChartOnlyBuildsChart: true,
      deepAnalysisReadsProfessionalChartOnly: true,
      reinforcementReadsDeepAnalysisOnly: true,
      noReverseFlow: true,
      noRepeatedChartCalculation: true,
    },
  };
}

export function analyzeBazi(input: BaziAnalysisInput): BaziAnalysisResult {
  const professionalChart = buildProfessionalChart(input);
  const aiDeepAnalysis = buildDeepAnalysis(professionalChart);
  const aiReinforcementPlan = buildReinforcementPlan(aiDeepAnalysis);

  return {
    ok: true,
    mode: 'bazi',
    moduleId: 'BAZI',
    engineVersion: 'bazi_three_layer_v3',
    input: professionalChart.input,
    timezone: professionalChart.timezone,
    pillars: professionalChart.pillars,
    hiddenStems: professionalChart.hiddenStems,
    tenGods: professionalChart.tenGods,
    dayMaster: professionalChart.dayMaster,
    elementCounts: professionalChart.elementCounts,
    strengthAnalysis: professionalChart.strengthAnalysis,
    gods: professionalChart.gods,
    luckCycles: professionalChart.luckCycles,
    annualFortunes: professionalChart.annualFortunes,
    structureFocus: professionalChart.structureFocus,
    aiReading: {
      summary: aiDeepAnalysis.summary,
      plainText: aiDeepAnalysis.plainText,
      chartSummary: aiDeepAnalysis.chartSummary,
      encouragement: aiReinforcementPlan.principle,
    },
    plainReading: aiDeepAnalysis.plainText,
    detail: professionalChart.detail,
    professionalChart,
    aiDeepAnalysis,
    aiReinforcementPlan,
    dataFlow: buildDataFlow(),
  };
}