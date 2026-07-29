import { getDayPillarIndex, getHourPillar, shichenFromClockHour, getShichenInfo } from './shichen-engine';

const HEAVENLY_STEMS = ['\u7532', '\u4e59', '\u4e19', '\u4e01', '\u620a', '\u5df1', '\u5e9a', '\u8f9b', '\u58ec', '\u7678'] as const;
const EARTHLY_BRANCHES = ['\u5b50', '\u4e11', '\u5bc5', '\u536f', '\u8fb0', '\u5df3', '\u5348', '\u672a', '\u7533', '\u9149', '\u620c', '\u4ea5'] as const;

type Stem = (typeof HEAVENLY_STEMS)[number];
type Branch = (typeof EARTHLY_BRANCHES)[number];
type TraditionalElement = '\u6728' | '\u706b' | '\u571f' | '\u91d1' | '\u6c34';
type YinYang = 'yang' | 'yin';

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

const ELEMENTS: TraditionalElement[] = ['\u91d1', '\u6728', '\u6c34', '\u706b', '\u571f'];
const PILLAR_KEYS = ['year', 'month', 'day', 'hour'] as const;
const GENERATES: Record<TraditionalElement, TraditionalElement> = { '\u6728': '\u706b', '\u706b': '\u571f', '\u571f': '\u91d1', '\u91d1': '\u6c34', '\u6c34': '\u6728' };
const CONTROLS: Record<TraditionalElement, TraditionalElement> = { '\u6728': '\u571f', '\u571f': '\u6c34', '\u6c34': '\u706b', '\u706b': '\u91d1', '\u91d1': '\u6728' };

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

export type BaziAnalysisResult = {
  ok: true;
  mode: 'bazi';
  moduleId: 'BAZI';
  engineVersion: 'bazi_chart_v2_core_only';
  input: Required<Pick<BaziAnalysisInput, 'birthDate' | 'birthTime' | 'gender' | 'country' | 'city'>> & { name: string | null };
  timezone: { country: string; city: string; note: string };
  pillars: { year: BaziPillar; month: BaziPillar; day: BaziPillar; hour: BaziPillar };
  hiddenStems: Record<(typeof PILLAR_KEYS)[number], BaziHiddenStem[]>;
  tenGods: Record<(typeof PILLAR_KEYS)[number], { stem: string; branchMain: string; hidden: string[] }>;
  dayMaster: { stem: Stem; element: TraditionalElement; strength: number; level: string };
  elementCounts: Record<TraditionalElement, number>;
  strengthAnalysis: { monthSeason: string; supportScore: number; pressureScore: number; verdict: string; explanation: string };
  gods: { joyGod: TraditionalElement; usefulGod: TraditionalElement; avoidGod: TraditionalElement; reason: string };
  luckCycles: BaziLuckCycle[];
  annualFortunes: BaziAnnualFortune[];
  structureFocus: string;
  aiReading: { summary: string; plainText: string; chartSummary: string; encouragement: string };
  plainReading: string;
};

function mod(value: number, base: number) { return ((value % base) + base) % base; }
function ganzhiFromIndex(index: number) { const i = mod(index, 60); return { stem: HEAVENLY_STEMS[i % 10], branch: EARTHLY_BRANCHES[i % 12] }; }
function parseDate(input: string) { const [year, month, day] = input.split('-').map((value) => Number.parseInt(value, 10)); return { year, month, day }; }
function parseHour(input: string) { const [hour] = input.split(':').map((value) => Number.parseInt(value, 10)); return Number.isInteger(hour) ? hour : 12; }
function getYearPillarIndex(year: number, month: number, day: number) { const adjustedYear = month < 2 || (month === 2 && day < 4) ? year - 1 : year; return mod(adjustedYear - 4, 60); }
function getMonthPillarIndex(yearStemIndex: number, month: number) {
  const monthBranchIndex = mod(month + 1, 12);
  const monthStemIndex = mod((yearStemIndex % 5) * 2 + month, 10);
  for (let index = 0; index < 60; index += 1) if (index % 10 === monthStemIndex && index % 12 === monthBranchIndex) return index;
  return monthStemIndex;
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
  return { label, stem: value.stem, branch: value.branch, stemElement: STEM_ELEMENT[value.stem], branchElement: BRANCH_ELEMENT[value.branch], stemTenGod: getTenGod(dayStem, value.stem), hiddenStems: HIDDEN_STEMS[value.branch].map((stem) => ({ stem, element: STEM_ELEMENT[stem], tenGod: getTenGod(dayStem, stem) })) };
}

function countElements(pillars: BaziAnalysisResult['pillars']) {
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
  return { joyGod: low, usefulGod: useful, avoidGod: high, reason: '\u516b\u5b57\u5f15\u64ce\u53ea\u4f9d\u56db\u67f1\u3001\u85cf\u5e72\u3001\u5341\u795e\u8207\u65e5\u4e3b\u65fa\u8870\u5224\u65b7\uff1a\u559c\u795e\u70ba' + low + '\uff0c\u7528\u795e\u70ba' + useful + '\uff0c\u5fcc\u795e\u70ba' + high + '\u3002' };
}

function buildLuckCycles(dayIndex: number, gender: BaziGender, yearStem: Stem) {
  const forward = (gender === 'male' && STEM_YINYANG[yearStem] === 'yang') || (gender === 'female' && STEM_YINYANG[yearStem] === 'yin');
  return Array.from({ length: 8 }, (_, index) => {
    const item = ganzhiFromIndex(mod(dayIndex + (forward ? index + 1 : -index - 1), 60));
    const startAge = 8 + index * 10;
    return { ageRange: startAge + '-' + (startAge + 9) + '\u6b72', pillar: item.stem + item.branch, element: STEM_ELEMENT[item.stem], focus: '\u5927\u904b\u5148\u4f5c\u7bc0\u594f\u53c3\u8003\uff0c\u7b2c\u4e8c\u5c64\u53ea\u5448\u73fe\u516b\u5b57\u672c\u8eab\u7684\u904b\u884c\u6458\u8981\u3002' };
  });
}

function buildAnnualFortunes(currentYear: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const year = currentYear + index;
    const item = ganzhiFromIndex(year - 4);
    return { year, pillar: item.stem + item.branch, element: STEM_ELEMENT[item.stem], focus: '\u6d41\u5e74\u5148\u4fdd\u7559\u6b72\u6b21\u8207\u4e94\u884c\u8a0a\u865f\uff0c\u4e0d\u9032\u884c\u5546\u54c1\u6216\u4e94\u5143\u7d20\u63a8\u85a6\u3002' };
  });
}

function buildPlainReading(dayStem: Stem, dayElement: TraditionalElement, strength: string, gods: BaziAnalysisResult['gods']) {
  return '\u5f8c\u7aef\u5df2\u5b8c\u6210\u516b\u5b57\u547d\u76e4\u6392\u76e4\u3002\u672c\u547d\u65e5\u4e3b\u70ba' + dayStem + dayElement + '\uff0c\u65fa\u8870\u5224\u5b9a\u70ba' + strength + '\u3002\u672c\u9801\u4e0d\u505a\u4e94\u5143\u7d20\u3001\u5546\u54c1\u3001\u540d\u4eba\u8a9e\u9304\u6216\u63a8\u85a6\uff0c\u53ea\u5c07\u516b\u5b57\u5f15\u64ce\u7d50\u679c\u6574\u7406\u6210\u767d\u8a71\u3002' + gods.reason;
}

export function analyzeBazi(input: BaziAnalysisInput): BaziAnalysisResult {
  const { year, month, day } = parseDate(input.birthDate);
  const hour = parseHour(input.birthTime);
  const yearIndex = getYearPillarIndex(year, month, day);
  const monthIndex = getMonthPillarIndex(yearIndex % 10, month);
  const dayIndex = getDayPillarIndex(input.birthDate);
  const dayGanzhi = ganzhiFromIndex(dayIndex);
  const shichenIndex = shichenFromClockHour(hour);
  const hourPillar = getHourPillar(dayIndex % 10, shichenIndex);
  const hourIndex = (() => { for (let index = 0; index < 60; index += 1) if (index % 10 === hourPillar.stemIndex && index % 12 === hourPillar.branchIndex) return index; return hourPillar.stemIndex; })();
  const pillars = { year: pillar('\u5e74\u67f1', yearIndex, dayGanzhi.stem), month: pillar('\u6708\u67f1', monthIndex, dayGanzhi.stem), day: pillar('\u65e5\u67f1', dayIndex, dayGanzhi.stem), hour: pillar('\u6642\u67f1', hourIndex, dayGanzhi.stem) };
  const elementCounts = countElements(pillars);
  const strengthAnalysis = buildStrengthAnalysis(pillars.month.branch, elementCounts, pillars.day.stemElement);
  const gods = chooseGods(elementCounts, strengthAnalysis.verdict, pillars.day.stemElement);
  const hiddenStems = Object.fromEntries(PILLAR_KEYS.map((key) => [key, pillars[key].hiddenStems])) as BaziAnalysisResult['hiddenStems'];
  const tenGods = Object.fromEntries(PILLAR_KEYS.map((key) => [key, { stem: pillars[key].stemTenGod, branchMain: pillars[key].hiddenStems[0]?.tenGod ?? '\u5e73\u8861', hidden: pillars[key].hiddenStems.map((item) => item.tenGod) }])) as BaziAnalysisResult['tenGods'];
  const shichen = getShichenInfo(shichenIndex);
  const plainReading = buildPlainReading(pillars.day.stem, pillars.day.stemElement, strengthAnalysis.verdict, gods);

  return {
    ok: true,
    mode: 'bazi',
    moduleId: 'BAZI',
    engineVersion: 'bazi_chart_v2_core_only',
    input: { name: input.name?.trim() || null, birthDate: input.birthDate, birthTime: input.birthTime, gender: input.gender, country: input.country?.trim() || '\u53f0\u7063', city: input.city?.trim() || '\u53f0\u5317' },
    timezone: { country: input.country?.trim() || '\u53f0\u7063', city: input.city?.trim() || '\u53f0\u5317', note: 'V2\u53ea\u8a18\u9304\u570b\u5bb6\u8207\u57ce\u5e02\u4f5c\u70ba\u6642\u5340\u4f86\u6e90\uff0c\u672c\u6b21\u4ee5\u4f7f\u7528\u8005\u8f38\u5165\u7684\u7576\u5730\u6642\u9593\u6392\u76e4\u3002' },
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
    aiReading: { summary: 'AI\u53ea\u8ca0\u8cac\u6574\u7406\u5f8c\u7aef\u516b\u5b57\u5f15\u64ce\u7684\u7d50\u679c\uff0c\u4e0d\u91cd\u65b0\u7b97\u547d\u3002', plainText: plainReading, chartSummary: '\u547d\u76e4\u91cd\u9ede\uff1a' + pillars.day.stem + pillars.day.branch + '\u65e5\u4e3b\u3001' + strengthAnalysis.verdict + '\u3001\u7528\u795e' + gods.usefulGod + '\u3002', encouragement: '\u5148\u770b\u61c2\u547d\u76e4\u7bc0\u594f\uff0c\u518d\u4e00\u6b65\u4e00\u6b65\u628a\u884c\u52d5\u505a\u7a69\u3002' },
    plainReading,
  };
}
