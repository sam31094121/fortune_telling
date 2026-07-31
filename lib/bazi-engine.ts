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
export type BaziLuckCycle = { ageRange: string; pillar: string; focus: string; element: TraditionalElement };
export type BaziAnnualFortune = { year: number; pillar: string; focus: string; element: TraditionalElement };
export type BaziPillars = Record<PillarKey, BaziPillar>;
export type BaziInputSnapshot = Required<Pick<BaziAnalysisInput, 'birthDate' | 'birthTime' | 'gender' | 'country' | 'city'>> & { name: string | null };

export type BaziProfessionalChart = {
  layer: 'professional_chart';
  generatedFrom: 'normalized_birth_input';
  recalculationAllowed: false;
  input: BaziInputSnapshot;
  timezone: { country: string; city: string; note: string };
  pillars: BaziPillars;
  hiddenStems: Record<PillarKey, BaziHiddenStem[]>;
  tenGods: Record<PillarKey, { stem: string; branchMain: string; hidden: string[] }>;
  dayMaster: { stem: Stem; element: TraditionalElement; strength: number; level: string };
  elementCounts: Record<TraditionalElement, number>;
  strengthAnalysis: { monthSeason: string; supportScore: number; pressureScore: number; verdict: string; explanation: string };
  gods: { joyGod: TraditionalElement; usefulGod: TraditionalElement; avoidGod: TraditionalElement; reason: string };
  luckCycles: BaziLuckCycle[];
  annualFortunes: BaziAnnualFortune[];
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
  userReadableSections: Array<{ title: string; content: string }>;
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
};

export type BaziReinforcementPlan = {
  layer: 'ai_reinforcement_plan';
  sourceLayer: 'ai_deep_analysis';
  sourceChecksum: string;
  recalculationAllowed: false;
  principle: string;
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
function chartChecksum(chart: Pick<BaziProfessionalChart, 'input' | 'pillars' | 'elementCounts' | 'dayMaster' | 'gods'>) {
  return hashText(JSON.stringify({ input: chart.input, pillars: chart.pillars, elementCounts: chart.elementCounts, dayMaster: chart.dayMaster, gods: chart.gods }));
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

function chooseGods(counts: Record<TraditionalElement, number>, strength: string, dayElement: TraditionalElement) {
  const low = [...ELEMENTS].sort((a, b) => counts[a] - counts[b])[0];
  const high = [...ELEMENTS].sort((a, b) => counts[b] - counts[a])[0];
  const useful = strength === '\u504f\u5f31' ? (ELEMENTS.find((element) => GENERATES[element] === dayElement) ?? dayElement) : low;
  return { joyGod: low, usefulGod: useful, avoidGod: high, reason: '\u516b\u5b57\u5f15\u64ce\u4f9d\u56db\u67f1\u3001\u85cf\u5e72\u3001\u5341\u795e\u8207\u65e5\u4e3b\u65fa\u8870\u5224\u65b7\uff1a\u559c\u795e\u70ba' + low + '\uff0c\u7528\u795e\u70ba' + useful + '\uff0c\u5fcc\u795e\u70ba' + high + '\u3002' };
}

function buildLuckCycles(dayIndex: number, gender: BaziGender, yearStem: Stem) {
  const forward = (gender === 'male' && STEM_YINYANG[yearStem] === 'yang') || (gender === 'female' && STEM_YINYANG[yearStem] === 'yin');
  return Array.from({ length: 8 }, (_, index) => {
    const item = ganzhiFromIndex(mod(dayIndex + (forward ? index + 1 : -index - 1), 60));
    const startAge = 8 + index * 10;
    return { ageRange: startAge + '-' + (startAge + 9) + '\u6b72', pillar: item.stem + item.branch, element: STEM_ELEMENT[item.stem], focus: '\u5927\u904b\u5148\u4f5c\u7bc0\u594f\u53c3\u8003\uff0c\u4e0d\u9032\u5165\u7b2c\u4e8c\u5c64\u91cd\u7b97\u3002' };
  });
}

function buildAnnualFortunes(currentYear: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const year = currentYear + index;
    const item = ganzhiFromIndex(year - 4);
    return { year, pillar: item.stem + item.branch, element: STEM_ELEMENT[item.stem], focus: '\u6d41\u5e74\u4fdd\u7559\u6b72\u6b21\u8207\u4e94\u884c\u8a0a\u865f\uff0c\u4f9b\u7b2c\u4e8c\u5c64\u8b80\u53d6\u3002' };
  });
}

function buildProfessionalChart(input: BaziAnalysisInput): BaziProfessionalChart {
  if (!input.birthDate || !input.birthTime || !input.gender) throw new Error('birthDate\u3001birthTime\u3001gender \u70ba\u5fc5\u586b\u6b04\u4f4d');

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
    year: pillar('\u5e74\u67f1', yearIndex, dayGanzhi.stem),
    month: pillar('\u6708\u67f1', monthIndex, dayGanzhi.stem),
    day: pillar('\u65e5\u67f1', dayIndex, dayGanzhi.stem),
    hour: pillar('\u6642\u67f1', hourIndex, dayGanzhi.stem),
  };
  const elementCounts = countElements(pillars);
  const strengthAnalysis = buildStrengthAnalysis(pillars.month.branch, elementCounts, pillars.day.stemElement);
  const gods = chooseGods(elementCounts, strengthAnalysis.verdict, pillars.day.stemElement);
  const hiddenStems = Object.fromEntries(PILLAR_KEYS.map((key) => [key, pillars[key].hiddenStems])) as BaziProfessionalChart['hiddenStems'];
  const tenGods = Object.fromEntries(PILLAR_KEYS.map((key) => [key, { stem: pillars[key].stemTenGod, branchMain: pillars[key].hiddenStems[0]?.tenGod ?? '\u5e73\u8861', hidden: pillars[key].hiddenStems.map((item) => item.tenGod) }])) as BaziProfessionalChart['tenGods'];
  const shichen = getShichenInfo(shichenIndex);
  const inputSnapshot: BaziInputSnapshot = {
    name: input.name?.trim() || null,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    gender: input.gender,
    country: input.country?.trim() || '\u53f0\u7063',
    city: input.city?.trim() || '\u53f0\u5317',
  };
  const timezone = { country: inputSnapshot.country, city: inputSnapshot.city, note: '\u7b2c\u4e00\u5c64\u53ea\u8a18\u9304\u570b\u5bb6\u8207\u57ce\u5e02\u4f5c\u70ba\u6642\u5340\u4f86\u6e90\uff0c\u672c\u6b21\u4ee5\u4f7f\u7528\u8005\u8f38\u5165\u7684\u7576\u5730\u6642\u9593\u6392\u76e4\u3002' };
  const detail = computeDetail(pillars, hiddenStems, tenGods);

  return {
    layer: 'professional_chart',
    generatedFrom: 'normalized_birth_input',
    recalculationAllowed: false,
    input: inputSnapshot,
    timezone,
    pillars,
    hiddenStems,
    tenGods,
    dayMaster: { stem: pillars.day.stem, element: pillars.day.stemElement, strength: Math.max(0, strengthAnalysis.supportScore - strengthAnalysis.pressureScore), level: strengthAnalysis.verdict },
    elementCounts,
    strengthAnalysis,
    gods,
    luckCycles: buildLuckCycles(dayIndex, input.gender, pillars.year.stem),
    annualFortunes: buildAnnualFortunes(new Date().getFullYear()),
    structureFocus: '\u56db\u67f1\u5df2\u5b8c\u6210\uff1a' + pillars.year.stem + pillars.year.branch + '\u3001' + pillars.month.stem + pillars.month.branch + '\u3001' + pillars.day.stem + pillars.day.branch + '\u3001' + pillars.hour.stem + pillars.hour.branch + '\uff1b\u6642\u8fb0\u70ba' + shichen.label + '\u3002',
    detail,
  };
}

function buildElementPriority(chart: BaziProfessionalChart): BaziElementPriority[] {
  const maxCount = Math.max(...ELEMENTS.map((element) => chart.elementCounts[element]), 1);
  const lowToHigh = [...ELEMENTS].sort((a, b) => chart.elementCounts[a] - chart.elementCounts[b]);
  const ordered = Array.from(new Set([chart.gods.usefulGod, chart.gods.joyGod, ...lowToHigh]));
  return ordered.map((element, index) => {
    const display = ELEMENT_DISPLAY[element];
    const count = chart.elementCounts[element];
    return {
      rank: (index + 1) as BaziElementPriority['rank'],
      element,
      brandElement: display.brandElement,
      displayName: display.displayName,
      count,
      needScore: clampScore(100 - (count / maxCount) * 100 + (element === chart.gods.usefulGod ? 16 : 0)),
      source: 'professional_chart',
      reason: element === chart.gods.usefulGod
        ? '\u7b2c\u4e00\u5c64\u547d\u76e4\u5df2\u5217\u70ba\u7528\u795e\uff0c\u7b2c\u4e8c\u5c64\u76f4\u63a5\u8b80\u53d6\u5f8c\u5217\u5165\u6700\u512a\u5148\u65b9\u5411\u3002'
        : '\u7b2c\u4e00\u5c64\u56db\u67f1\u7d71\u8a08' + element + '\u51fa\u73fe ' + count + ' \u6b21\uff0c\u7b2c\u4e8c\u5c64\u76f4\u63a5\u8b80\u53d6\u5f8c\u5217\u5165\u88dc\u5f37\u9806\u4f4d\u3002',
    };
  }) as BaziElementPriority[];
}

function buildDeepAnalysis(chart: BaziProfessionalChart): BaziDeepAnalysis {
  const checksum = chartChecksum(chart);
  const elementPriority = buildElementPriority(chart);
  const dayPillar = chart.pillars.day.stem + chart.pillars.day.branch;
  const summary = '\u7b2c\u4e8c\u5c64 AI \u89e3\u8b80\uff1a\u76f4\u63a5\u8b80\u53d6\u7b2c\u4e00\u5c64\u547d\u76e4\u3002\u672c\u547d\u65e5\u4e3b\u70ba' + chart.dayMaster.stem + chart.dayMaster.element + '\uff0c\u65fa\u8870\u5224\u5b9a\u70ba' + chart.dayMaster.level + '\u3002';
  const chartSummary = '\u547d\u76e4\u91cd\u9ede\uff1a' + dayPillar + '\u65e5\u4e3b\u3001' + chart.strengthAnalysis.verdict + '\u3001\u7528\u795e' + chart.gods.usefulGod + '\u3001\u559c\u795e' + chart.gods.joyGod + '\u3002';
  const keyFindings = [
    chart.structureFocus,
    chart.strengthAnalysis.explanation,
    chart.gods.reason,
    '\u5143\u7d20\u8b80\u53d6\u9806\u4f4d\uff1a' + elementPriority.slice(0, 3).map((item) => item.displayName).join('\u3001') + '\u3002',
  ];
  const plainText = [summary, chart.strengthAnalysis.explanation, chart.gods.reason, '\u9019\u4e00\u5c64\u53ea\u628a\u5c08\u696d\u547d\u76e4\u8f49\u6210\u4e00\u822c\u7528\u6236\u770b\u5f97\u61c2\u7684\u6587\u5b57\uff0c\u4e0d\u91cd\u65b0\u6392\u76e4\u3002'].join(' ');

  return {
    layer: 'ai_deep_analysis',
    sourceLayer: 'professional_chart',
    sourceChecksum: checksum,
    recalculationAllowed: false,
    summary,
    plainText,
    chartSummary,
    keyFindings,
    userReadableSections: [
      { title: '\u547d\u76e4\u6838\u5fc3', content: chartSummary },
      { title: '\u65e5\u4e3b\u65fa\u8870', content: chart.strengthAnalysis.explanation },
      { title: '\u559c\u7528\u5fcc\u795e', content: chart.gods.reason },
    ],
    elementPriority,
  };
}

function buildReinforcementItem(priority: BaziElementPriority, rank: 1 | 2 | 3): BaziReinforcementItem {
  const display = ELEMENT_DISPLAY[priority.element];
  const rankLabel = rank === 1 ? '\u7b2c\u4e00\u88dc\u5f37' : rank === 2 ? '\u7b2c\u4e8c\u88dc\u5f37' : '\u7b2c\u4e09\u88dc\u5f37';
  return {
    rank,
    element: priority.element,
    brandElement: priority.brandElement,
    displayName: priority.displayName,
    title: rankLabel + '\uff1a' + priority.displayName,
    judgement: 'AI \u5224\u5b9a\uff1a\u76ee\u524d' + rankLabel + '\u70ba' + priority.displayName + '\u3002',
    action: '\u8acb\u88dc\u5f37\uff1a' + priority.displayName + '\u3002',
    suggestion: '\u884c\u52d5\u65b9\u5411\uff1a\u5148\u5c0d\u6e96' + display.actionName + '\u5143\u7d20\u5c0d\u61c9\u7684\u7bc0\u594f\u3001\u7a7a\u9593\u8207\u65e5\u5e38\u9078\u64c7\uff0c\u5b8c\u6210\u5f8c\u518d\u9032\u5165\u4e0b\u4e00\u9806\u4f4d\u3002',
  };
}

function buildReinforcementPlan(analysis: BaziDeepAnalysis): BaziReinforcementPlan {
  const checksum = analysisChecksum(analysis);
  const first = buildReinforcementItem(analysis.elementPriority[0], 1);
  const second = buildReinforcementItem(analysis.elementPriority[1] ?? analysis.elementPriority[0], 2);
  const third = buildReinforcementItem(analysis.elementPriority[2] ?? analysis.elementPriority[1] ?? analysis.elementPriority[0], 3);
  return {
    layer: 'ai_reinforcement_plan',
    sourceLayer: 'ai_deep_analysis',
    sourceChecksum: checksum,
    recalculationAllowed: false,
    principle: 'AI \u4e0d\u9810\u6e2c\u4f60\u7684\u547d\u904b\uff1bAI \u5224\u5b9a\u4f60\u76ee\u524d\u6700\u9700\u8981\u88dc\u5f37\u7684\u65b9\u5411\u3002',
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