/**
 * BaziCustomerAdapter｜後端資料 → UI ViewModel
 * 鐵律：只做映射，禁止任何八字重新計算（無 calculateTenGod / calculatePillar / calculateLuck）。
 * 核心算什麼，前端就忠實呈現什麼。
 */

import { getProductElementNameFromTraditional } from '@/lib/five-element-engine';

export type PillarKey = 'year' | 'month' | 'day' | 'hour';
export const PILLAR_ORDER: PillarKey[] = ['year', 'month', 'day', 'hour'];

export interface CustomerPillar {
  key: PillarKey;
  label: string;
  stem: string;
  branch: string;
  stemTenGod: string;
  hiddenStems: Array<{ stem: string; element: string; tenGod: string }>;
}

export interface CustomerElementBar { element: string; percent: number }

export type FiveElementOrbitElement = 'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER';

export interface FiveElementOrbitItem {
  element: FiveElementOrbitElement;
  /** Backend-only orthodox five-element key. Never display this to customers. */
  sourceLabel: string;
  label: string;
  value: number | null;
  ratio: number | null;
  strength: number | null;
  tenGodLabels: string[];
  status: 'AVAILABLE' | 'UNAVAILABLE';
}

export interface FiveElementOrbitViewModel {
  centerLabel: string;
  items: FiveElementOrbitItem[];
}

export interface CustomerDaYun {
  ageRange: string;
  pillar: string;
  tenGod?: string;
  startYear?: number;
  endYear?: number;
  focus?: string;
}

export interface CustomerAnnual { year: number; pillar: string; tenGod?: string; element: string; focus?: string }

export interface BaziTimeContext {
  age: number | null;
  currentYear: number;
  dayNight: '白天' | '夜晚';
  activeDaYun: CustomerDaYun | null;
  annualLuck: CustomerAnnual | null;
}

export interface CustomerTeacherSection { title: string; basis?: string; content: string }

export interface BaziCustomerView {
  name: string;
  birthSummary: string;
  hourUnknown: boolean;
  dayMaster: { stem: string; element: string; level: string };
  pillars: CustomerPillar[];
  elementBars: CustomerElementBar[];
  fiveElementOrbit: FiveElementOrbitViewModel;
  themeLine: string;
  // LEVEL 2
  teacher: {
    chartSummary: string;
    summary: string;
    sections: CustomerTeacherSection[];
    signals: { dayMaster: string; structure: string; elementFocus: string };
    strengthFactors: Array<{ id: string; label: string; status: string; score: number; detail: string }>;
    tenGodsRanked: Array<{ tenGod: string; score: number }>;
    tenGodsDominant: string[];
    tenGodsMissing: string[];
    daYun: CustomerDaYun[];
    annual: CustomerAnnual[];
    verified: boolean;
  };
  /** 當下情境層：只讀鎖定命盤的既有大運／流年，不重算四柱。 */
  timeContext: BaziTimeContext;
  reinforcement: { principle: string; basisSummary: string; priorityOrder: Array<{ rank: number; displayName?: string; title?: string; reason?: string }> };
  /** 老師版五行 Drill Down 證據：全部來自後端 elementStatistics，未提供的細項誠實標示 */
  elementEvidence: Array<{ element: string; percent: number | null; stems: number; branches: number; hiddenStems: number; tenGodLabels: string[] }>;
  // LEVEL 3（完整傳統資料，原樣轉交）
  professional: unknown;
  engineVersion: string;
  gods: { usefulGod: string; joyGod: string; avoidGod: string };
  structurePattern: { primaryPattern: string; supportingPattern: string; stability: string };
  dataFlowRules: Record<string, boolean>;
  source: {
    calculationId: string;
    birthInputFingerprint: string;
    professionalResultId: string;
    mode: 'FULL_BAZI' | 'PARTIAL_BAZI' | 'UNKNOWN';
    pipelineState: 'ADAPTER_COMPLETED';
  };
}

/* 後端結果的結構型輸入（唯讀，不完整列型別即可） */
type BackendResult = {
  input: { name?: string; birthDate?: string; gender?: string };
  engineVersion: string;
  pillars: Record<PillarKey, { label: string; stem: string; branch: string; stemTenGod: string; hiddenStems: Array<{ stem: string; element: string; tenGod: string }> }>;
  dayMaster: { stem: string; element: string; level: string };
  gods: { usefulGod: string; joyGod: string; avoidGod: string };
  luckCycles: Array<{ ageRange: string; pillar: string; tenGod?: string; startYear?: number; endYear?: number; focus?: string }>;
  annualFortunes: Array<{ year: number; pillar: string; tenGod?: string; element: string; focus?: string }>;
  aiDeepAnalysis: {
    chartSummary: string;
    summary: string;
    userReadableSections: Array<{ title: string; basis?: string; content: string }>;
    professionalSignals: { dayMaster: string; structure: string; elementFocus: string };
  };
  professionalChart: {
    calendar: { birthTime: string; shichen: { label: string; range: string } };
    elementStatistics: { percentages: Record<string, number> };
    fiveElementTenGodMap?: Record<string, string[]>;
    strengthFactors: Array<{ id: string; label: string; status: string; score: number; detail: string }>;
    tenGodDistribution: { ranked: Array<{ tenGod: string; score: number }>; dominant: string[]; missing: string[] };
    structurePattern: { primaryPattern: string; supportingPattern: string; stability: string };
    verification: { readyForInterpretation: boolean };
    calculationId?: string;
    birthInputFingerprint?: string;
    professionalResultId?: string;
    chartMode?: 'FULL_BAZI' | 'PARTIAL_BAZI';
    pipeline?: {
      calculationId?: string;
      birthInputFingerprint?: string;
      professionalResultId?: string;
      mode?: 'FULL_BAZI' | 'PARTIAL_BAZI';
      currentState?: string;
    };
  };
  structureFocus: string;
  dataFlow: { rules: Record<string, boolean> };
};

const FIVE_ELEMENT_ORBIT_ORDER: Array<{ element: FiveElementOrbitElement; sourceLabel: string }> = [
  { element: 'WOOD', sourceLabel: '木' },
  { element: 'FIRE', sourceLabel: '火' },
  { element: 'EARTH', sourceLabel: '土' },
  { element: 'METAL', sourceLabel: '金' },
  { element: 'WATER', sourceLabel: '水' },
];

function toFiveElementOrbitView(result: BackendResult): FiveElementOrbitViewModel {
  const percentages = result.professionalChart.elementStatistics.percentages;
  const tenGodMap = result.professionalChart.fiveElementTenGodMap ?? {};
  return {
    centerLabel: `${result.dayMaster.stem}${result.dayMaster.element}`,
    items: FIVE_ELEMENT_ORBIT_ORDER.map(({ element, sourceLabel }) => {
      const value = percentages[sourceLabel];
      return {
        element,
        sourceLabel,
        label: getProductElementNameFromTraditional(sourceLabel),
        value: typeof value === 'number' ? value : null,
        ratio: typeof value === 'number' ? value : null,
        strength: typeof value === 'number' ? value : null,
        tenGodLabels: tenGodMap[sourceLabel] ?? [],
        status: typeof value === 'number' ? 'AVAILABLE' : 'UNAVAILABLE',
      };
    }),
  };
}

function buildTimeContext(result: BackendResult): BaziTimeContext {
  const now = new Date();
  const currentYear = now.getFullYear();
  const birth = result.input?.birthDate ? new Date(`${result.input.birthDate}T00:00:00`) : null;
  const age = birth && !Number.isNaN(birth.getTime())
    ? currentYear - birth.getFullYear() - (now < new Date(currentYear, birth.getMonth(), birth.getDate()) ? 1 : 0)
    : null;
  const daYun = result.luckCycles.find((item) => typeof item.startYear === 'number' && typeof item.endYear === 'number' && currentYear >= item.startYear && currentYear <= item.endYear) ?? null;
  const annual = result.annualFortunes.find((item) => item.year === currentYear) ?? result.annualFortunes[0] ?? null;
  const hour = now.getHours();

  return {
    age: typeof age === 'number' && age >= 0 ? age : null,
    currentYear,
    dayNight: hour >= 6 && hour < 18 ? '白天' : '夜晚',
    activeDaYun: daYun,
    annualLuck: annual,
  };
}

export function toBaziCustomerView(result: BackendResult, hourUnknown: boolean): BaziCustomerView {
  const pc = result.professionalChart;
  return {
    name: result.input?.name || '',
    birthSummary: `${result.input?.birthDate ?? ''} · ${hourUnknown ? '時辰未提供' : `${pc.calendar.birthTime}（${pc.calendar.shichen.label}）`} · ${result.input?.gender === 'male' ? '男' : '女'}`,
    hourUnknown,
    dayMaster: result.dayMaster,
    pillars: PILLAR_ORDER.map((key) => ({ key, ...result.pillars[key] })),
    elementBars: Object.entries(pc.elementStatistics.percentages).map(([element, percent]) => ({ element, percent })),
    fiveElementOrbit: toFiveElementOrbitView(result),
    themeLine: (() => {
      const raw = result.structureFocus || result.aiDeepAnalysis.chartSummary || '';
      // 未知時辰：舊核心文案可能含補午時敘述，與時柱「未提供」矛盾 → 以誠實句取代（僅呈現層，非重算）
      if (hourUnknown && /(四柱已完成|時辰為|午時)/.test(raw)) {
        return '三柱結構已完成；補充出生時辰後，可建立完整四柱。';
      }
      return raw;
    })(),
    teacher: {
      chartSummary: result.aiDeepAnalysis.chartSummary,
      summary: result.aiDeepAnalysis.summary,
      sections: result.aiDeepAnalysis.userReadableSections,
      signals: result.aiDeepAnalysis.professionalSignals,
      strengthFactors: pc.strengthFactors,
      tenGodsRanked: pc.tenGodDistribution.ranked,
      tenGodsDominant: pc.tenGodDistribution.dominant,
      tenGodsMissing: pc.tenGodDistribution.missing,
      daYun: result.luckCycles,
      annual: result.annualFortunes,
      verified: pc.verification.readyForInterpretation,
    },
    timeContext: buildTimeContext(result),
    reinforcement: {
      principle: (result as unknown as { aiReinforcementPlan?: { principle?: string } }).aiReinforcementPlan?.principle ?? '',
      basisSummary: (result as unknown as { aiReinforcementPlan?: { basisSummary?: string } }).aiReinforcementPlan?.basisSummary ?? '',
      priorityOrder: ((result as unknown as { aiReinforcementPlan?: { priorityOrder?: Array<{ rank: number; displayName?: string; title?: string; reason?: string }> } }).aiReinforcementPlan?.priorityOrder ?? []),
    },
    elementEvidence: ['木', '火', '土', '金', '水'].map((el) => {
      const stats = pc.elementStatistics as unknown as { percentages: Record<string, number>; stems?: Record<string, number>; branches?: Record<string, number>; hiddenStems?: Record<string, number> };
      return {
        element: el,
        percent: typeof stats.percentages?.[el] === 'number' ? stats.percentages[el] : null,
        stems: stats.stems?.[el] ?? 0,
        branches: stats.branches?.[el] ?? 0,
        hiddenStems: stats.hiddenStems?.[el] ?? 0,
        tenGodLabels: [], // 後端未提供五行→十神正式對應；未提供即不顯示
      };
    }),
    professional: result.professionalChart,
    engineVersion: result.engineVersion,
    gods: result.gods,
    structurePattern: pc.structurePattern,
    dataFlowRules: result.dataFlow?.rules ?? {},
    source: {
      calculationId: pc.pipeline?.calculationId ?? pc.calculationId ?? '',
      birthInputFingerprint: pc.pipeline?.birthInputFingerprint ?? pc.birthInputFingerprint ?? '',
      professionalResultId: pc.pipeline?.professionalResultId ?? pc.professionalResultId ?? '',
      mode: pc.pipeline?.mode ?? pc.chartMode ?? 'UNKNOWN',
      pipelineState: 'ADAPTER_COMPLETED',
    },
  };
}

export function validateBaziCustomerViewPipeline(result: BackendResult, view: BaziCustomerView, hourUnknown: boolean): string[] {
  const pc = result.professionalChart;
  const issues: string[] = [];
  const pipeline = pc.pipeline;
  if (pipeline?.currentState !== 'API_READY') issues.push('pipeline not API_READY before adapter');
  if (!view.source.calculationId || view.source.calculationId !== pipeline?.calculationId) issues.push('view calculationId mismatch');
  if (!view.source.birthInputFingerprint || view.source.birthInputFingerprint !== pipeline?.birthInputFingerprint) issues.push('view fingerprint mismatch');
  if (!view.source.professionalResultId || view.source.professionalResultId !== pipeline?.professionalResultId) issues.push('view professionalResultId mismatch');
  const expectedMode = hourUnknown ? 'PARTIAL_BAZI' : 'FULL_BAZI';
  if (view.source.mode !== expectedMode || pipeline?.mode !== expectedMode) issues.push('view mode mismatch');
  if (!result.aiDeepAnalysis?.summary) issues.push('AI_INTERPRETATION_COMPLETED missing');
  if (!view.pillars.length || !view.professional) issues.push('CUSTOMER_VIEW_READY missing');
  return issues;
}

/** 五行點綴色（基底墨黑，五行只作標識） */
export const ELEMENT_COLOR: Record<string, { bar: string; text: string }> = {
  木: { bar: 'bg-emerald-500/75', text: 'text-emerald-200' },
  火: { bar: 'bg-rose-500/75', text: 'text-rose-200' },
  土: { bar: 'bg-amber-600/75', text: 'text-amber-200' },
  金: { bar: 'bg-slate-300/75', text: 'text-slate-200' },
  水: { bar: 'bg-blue-500/75', text: 'text-blue-200' },
};
