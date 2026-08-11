/**
 * BaziCustomerAdapter｜後端資料 → UI ViewModel
 * 鐵律：只做映射，禁止任何八字重新計算（無 calculateTenGod / calculatePillar / calculateLuck）。
 * 核心算什麼，前端就忠實呈現什麼。
 */

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
  reinforcement: { principle: string; basisSummary: string; priorityOrder: Array<{ rank: number; displayName?: string; title?: string; reason?: string }> };
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

const FIVE_ELEMENT_ORBIT_ORDER: Array<{ element: FiveElementOrbitElement; label: string }> = [
  { element: 'WOOD', label: '木' },
  { element: 'FIRE', label: '火' },
  { element: 'EARTH', label: '土' },
  { element: 'METAL', label: '金' },
  { element: 'WATER', label: '水' },
];

function toFiveElementOrbitView(result: BackendResult): FiveElementOrbitViewModel {
  const percentages = result.professionalChart.elementStatistics.percentages;
  const tenGodMap = result.professionalChart.fiveElementTenGodMap ?? {};
  return {
    centerLabel: `${result.dayMaster.stem}${result.dayMaster.element}`,
    items: FIVE_ELEMENT_ORBIT_ORDER.map(({ element, label }) => {
      const value = percentages[label];
      return {
        element,
        label,
        value: typeof value === 'number' ? value : null,
        ratio: typeof value === 'number' ? value : null,
        strength: typeof value === 'number' ? value : null,
        tenGodLabels: tenGodMap[label] ?? [],
        status: typeof value === 'number' ? 'AVAILABLE' : 'UNAVAILABLE',
      };
    }),
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
    themeLine: result.structureFocus || result.aiDeepAnalysis.chartSummary,
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
    reinforcement: {
      principle: (result as unknown as { aiReinforcementPlan?: { principle?: string } }).aiReinforcementPlan?.principle ?? '',
      basisSummary: (result as unknown as { aiReinforcementPlan?: { basisSummary?: string } }).aiReinforcementPlan?.basisSummary ?? '',
      priorityOrder: ((result as unknown as { aiReinforcementPlan?: { priorityOrder?: Array<{ rank: number; displayName?: string; title?: string; reason?: string }> } }).aiReinforcementPlan?.priorityOrder ?? []),
    },
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
