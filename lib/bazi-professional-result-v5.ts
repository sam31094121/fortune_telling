import type { BaziAnalysisInput, BaziAnalysisResult } from './bazi-engine';
import { createBaziCore, type BaziBirthInput, type BaziProfessionalResult, type Branch, type Element, type TenGod } from './bazi/engine';

export type BaziRuntimeInput = BaziAnalysisInput & {
  birthTimeKnown?: boolean;
  timeUnknown?: boolean;
  birthHourBranch?: string;
  traditionalHour?: string;
  calendarType?: 'solar' | 'lunar' | 'SOLAR' | 'LUNAR';
  isLeapMonth?: boolean;
};

type BaziFieldCondition = 'VALID_VALUE' | 'USER_NOT_PROVIDED' | 'CORE_NOT_SUPPORTED' | 'CALCULATION_FAILED' | 'MAPPING_MISSING' | 'OPTIONAL_NOT_AVAILABLE';

type V5FieldTrace = {
  field: string;
  label: string;
  sourcePath: string;
  apiPath: string;
  adapterPath: string;
  frontendPath: string;
  core: BaziFieldCondition;
  professionalResult: BaziFieldCondition;
  api: BaziFieldCondition;
  adapter: BaziFieldCondition;
  frontend: BaziFieldCondition;
};

const HOUR_BRANCH_TO_TRADITIONAL: Record<string, Branch> = {
  zi: '子',
  chou: '丑',
  yin: '寅',
  mao: '卯',
  chen: '辰',
  si: '巳',
  wu: '午',
  wei: '未',
  shen: '申',
  you: '酉',
  xu: '戌',
  hai: '亥',
};

const REQUIRED_V5_FIELDS = [
  { field: 'solarTerm', label: '節氣資訊', sourcePath: 'core.calendar.solarTerm', apiPath: 'professionalChart.calendar.solarTerm', adapterPath: 'progress.fieldTraces.solarTerm', frontendPath: 'ProfessionalBaziTable.calendar' },
  { field: 'kongWang', label: '空亡', sourcePath: 'core.kongWang', apiPath: 'professionalChart.kongWang', adapterPath: 'progress.fieldTraces.kongWang', frontendPath: 'ProfessionalBaziTable.kongWang' },
  { field: 'twelveStages', label: '十二長生', sourcePath: 'core.twelveStages', apiPath: 'professionalChart.twelveStages', adapterPath: 'progress.fieldTraces.twelveStages', frontendPath: 'ProfessionalBaziTable.twelveStages' },
  { field: 'interactions', label: '合沖刑害破', sourcePath: 'core.interactions', apiPath: 'professionalChart.interactions', adapterPath: 'progress.fieldTraces.interactions', frontendPath: 'ProfessionalBaziTable.interactions' },
  { field: 'shenSha', label: '神煞／特星', sourcePath: 'core.shenSha', apiPath: 'professionalChart.shenSha', adapterPath: 'progress.fieldTraces.shenSha', frontendPath: 'ProfessionalBaziTable.shenSha' },
  { field: 'mingGong', label: '命宮', sourcePath: 'core.mingGong', apiPath: 'professionalChart.mingGong', adapterPath: 'progress.fieldTraces.mingGong', frontendPath: 'ProfessionalBaziTable.mingGong' },
  { field: 'taiYuan', label: '胎元', sourcePath: 'core.taiYuan', apiPath: 'professionalChart.taiYuan', adapterPath: 'progress.fieldTraces.taiYuan', frontendPath: 'ProfessionalBaziTable.taiYuan' },
  { field: 'taiXi', label: '胎息', sourcePath: 'core.taiXi', apiPath: 'professionalChart.taiXi', adapterPath: 'progress.fieldTraces.taiXi', frontendPath: 'ProfessionalBaziTable.taiXi' },
] as const;

function isBranch(value: unknown): value is Branch {
  return typeof value === 'string' && ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].includes(value);
}

function resolveTraditionalHour(input: BaziRuntimeInput): Branch | undefined {
  if (isBranch(input.traditionalHour)) return input.traditionalHour;
  if (input.birthHourBranch && HOUR_BRANCH_TO_TRADITIONAL[input.birthHourBranch]) return HOUR_BRANCH_TO_TRADITIONAL[input.birthHourBranch];
  return undefined;
}

function toCoreInput(input: BaziRuntimeInput): BaziBirthInput {
  const timeUnknown = input.timeUnknown === true || input.birthHourBranch === 'unknown' || input.birthTimeKnown === false;
  const traditionalHour = timeUnknown ? undefined : resolveTraditionalHour(input);
  return {
    name: input.name,
    gender: input.gender,
    birthDate: input.birthDate,
    birthTimeKnown: !timeUnknown && Boolean(input.birthTime || traditionalHour),
    birthTime: !timeUnknown && !traditionalHour ? input.birthTime : undefined,
    traditionalHour,
    birthCountry: input.country,
    birthCity: input.city,
    timezone: 'Asia/Taipei',
    calendarType: input.calendarType === 'lunar' || input.calendarType === 'LUNAR' ? 'LUNAR' : 'SOLAR',
    isLeapMonth: input.isLeapMonth,
  };
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return true;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return value !== '' && value !== 'UNKNOWN' && value !== 'NOT_CALCULATED' && value !== 'NOT_CALCULATED_FOR_HOUR_ITEMS';
}

function getPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

function buildFiveElementTenGodMap(core: BaziProfessionalResult): Record<Element, TenGod[]> {
  const map: Record<Element, Set<TenGod>> = {
    木: new Set<TenGod>(),
    火: new Set<TenGod>(),
    土: new Set<TenGod>(),
    金: new Set<TenGod>(),
    水: new Set<TenGod>(),
  };
  const pillars = [core.pillars.year, core.pillars.month, core.pillars.day, core.pillars.hour].filter((pillar) => pillar !== 'UNKNOWN');
  for (const pillar of pillars) {
    if (pillar.tenGodStem !== 'DAY_MASTER') map[pillar.element].add(pillar.tenGodStem);
    for (const hidden of pillar.hiddenStems) map[hidden.element].add(hidden.tenGod);
  }
  return Object.fromEntries(Object.entries(map).map(([element, values]) => [element, Array.from(values)])) as Record<Element, TenGod[]>;
}

function buildFieldTraces(core: BaziProfessionalResult, professionalChart: Record<string, unknown>, partial: boolean): V5FieldTrace[] {
  return REQUIRED_V5_FIELDS.map((entry) => {
    const dataConditionSkip = partial && ['mingGong'].includes(entry.field);
    const coreValue = getPath({ core }, entry.sourcePath);
    const apiValue = getPath({ professionalChart }, entry.apiPath);
    const status: BaziFieldCondition = dataConditionSkip
      ? 'OPTIONAL_NOT_AVAILABLE'
      : hasValue(apiValue)
        ? 'VALID_VALUE'
        : hasValue(coreValue)
          ? 'MAPPING_MISSING'
          : 'CALCULATION_FAILED';
    return {
      ...entry,
      core: hasValue(coreValue) ? 'VALID_VALUE' : dataConditionSkip ? 'OPTIONAL_NOT_AVAILABLE' : 'CALCULATION_FAILED',
      professionalResult: status,
      api: status === 'VALID_VALUE' ? 'VALID_VALUE' : status,
      adapter: status === 'VALID_VALUE' ? 'VALID_VALUE' : status,
      frontend: status === 'VALID_VALUE' ? 'VALID_VALUE' : status,
    };
  });
}

function summarizeCompleteness(fieldTraces: V5FieldTrace[]) {
  const missingRequiredFields = fieldTraces.filter((trace) => trace.professionalResult !== 'VALID_VALUE' && trace.professionalResult !== 'OPTIONAL_NOT_AVAILABLE');
  return {
    valid: missingRequiredFields.length === 0,
    missingRequiredFields: missingRequiredFields.map((trace) => `${trace.label}｜${trace.professionalResult}`),
    mappingMissingFields: fieldTraces.filter((trace) => trace.professionalResult === 'MAPPING_MISSING').map((trace) => trace.label),
    calculationFailedFields: fieldTraces.filter((trace) => trace.professionalResult === 'CALCULATION_FAILED').map((trace) => trace.label),
    optionalUnavailableFields: fieldTraces.filter((trace) => trace.professionalResult === 'OPTIONAL_NOT_AVAILABLE').map((trace) => trace.label),
  };
}

export function attachBaziProfessionalCoreV5<T extends BaziAnalysisResult>(legacyResult: T, input: BaziRuntimeInput): T {
  const core = createBaziCore(toCoreInput(input));
  const partial = core.chartMode === 'PARTIAL_BAZI';
  const professionalChart = legacyResult.professionalChart as unknown as Record<string, unknown>;
  const existingCalendar = professionalChart.calendar && typeof professionalChart.calendar === 'object'
    ? professionalChart.calendar as Record<string, unknown>
    : {};
  professionalChart.calendar = {
    ...existingCalendar,
    normalizedDateTime: core.calendar.normalizedDateTime,
    solarDate: core.calendar.solarDate,
    lunarDate: core.calendar.lunarDate,
    solarTerm: core.calendar.solarTerm,
    solarTermTime: core.calendar.solarTermTime,
    yearBoundaryRule: core.calendar.yearBoundaryRule,
    timezone: core.calendar.timezone,
  };
  professionalChart.engine = core.engine;
  professionalChart.chartMode = core.chartMode;
  professionalChart.timePrecision = core.timePrecision;
  professionalChart.traditionalCore = core;
  professionalChart.kongWang = core.kongWang;
  professionalChart.voidBranches = core.kongWang;
  professionalChart.twelveStages = core.twelveStages;
  professionalChart.interactions = core.interactions;
  professionalChart.shenSha = core.shenSha;
  professionalChart.mingGong = core.mingGong;
  professionalChart.lifePalace = core.mingGong;
  professionalChart.shenGong = core.shenGong;
  professionalChart.taiYuan = core.taiYuan;
  professionalChart.fetalOrigin = core.taiYuan;
  professionalChart.taiXi = core.taiXi;
  professionalChart.fetalBreath = core.taiXi;
  professionalChart.daYunMeta = core.daYunMeta;
  professionalChart.coreDaYun = core.daYun;
  professionalChart.coreAnnualLuck = core.annualLuck;
  professionalChart.fiveElementTenGodMap = buildFiveElementTenGodMap(core);
  professionalChart.verification = {
    ...(professionalChart.verification as Record<string, unknown>),
    coreReadyForInterpretation: core.verification.readyForInterpretation,
    coreIssues: core.verification.issues,
  };
  const traces = buildFieldTraces(core, professionalChart, partial);
  professionalChart.fieldTrace = traces;
  professionalChart.professionalCompleteness = summarizeCompleteness(traces);
  if (partial) {
    legacyResult.input.birthTime = '';
    (professionalChart.input as Record<string, unknown>).birthTime = '';
    (professionalChart.calendar as Record<string, unknown>).birthTime = '時辰未提供';
  }
  return legacyResult;
}
