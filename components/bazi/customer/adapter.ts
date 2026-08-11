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
  // LEVEL 3（完整傳統資料，原樣轉交）
  professional: unknown;
  engineVersion: string;
  gods: { usefulGod: string; joyGod: string; avoidGod: string };
  structurePattern: { primaryPattern: string; supportingPattern: string; stability: string };
  dataFlowRules: Record<string, boolean>;
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
    strengthFactors: Array<{ id: string; label: string; status: string; score: number; detail: string }>;
    tenGodDistribution: { ranked: Array<{ tenGod: string; score: number }>; dominant: string[]; missing: string[] };
    structurePattern: { primaryPattern: string; supportingPattern: string; stability: string };
    verification: { readyForInterpretation: boolean };
  };
  structureFocus: string;
  dataFlow: { rules: Record<string, boolean> };
};

export function toBaziCustomerView(result: BackendResult, hourUnknown: boolean): BaziCustomerView {
  const pc = result.professionalChart;
  return {
    name: result.input?.name || '',
    birthSummary: `${result.input?.birthDate ?? ''} · ${hourUnknown ? '時辰未提供' : `${pc.calendar.birthTime}（${pc.calendar.shichen.label}）`} · ${result.input?.gender === 'male' ? '男' : '女'}`,
    hourUnknown,
    dayMaster: result.dayMaster,
    pillars: PILLAR_ORDER.map((key) => ({ key, ...result.pillars[key] })),
    elementBars: Object.entries(pc.elementStatistics.percentages).map(([element, percent]) => ({ element, percent })),
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
    professional: result.professionalChart,
    engineVersion: result.engineVersion,
    gods: result.gods,
    structurePattern: pc.structurePattern,
    dataFlowRules: result.dataFlow?.rules ?? {},
  };
}

/** 五行點綴色（基底墨黑，五行只作標識） */
export const ELEMENT_COLOR: Record<string, { bar: string; text: string }> = {
  木: { bar: 'bg-emerald-500/75', text: 'text-emerald-200' },
  火: { bar: 'bg-rose-500/75', text: 'text-rose-200' },
  土: { bar: 'bg-amber-600/75', text: 'text-amber-200' },
  金: { bar: 'bg-slate-300/75', text: 'text-slate-200' },
  水: { bar: 'bg-blue-500/75', text: 'text-blue-200' },
};
