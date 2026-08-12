import type { BaziAnalysisInput, BaziAnalysisResult } from './bazi-engine';
import { createBaziCore, type BaziBirthInput, type BaziProfessionalResult, type Branch, type Element, type TenGod } from './bazi/engine';

export type BaziRuntimeInput = BaziAnalysisInput & {
  calculationId?: string;
  birthTimeKnown?: boolean;
  timeUnknown?: boolean;
  birthHourBranch?: string;
  traditionalHour?: string;
  calendarType?: 'solar' | 'lunar' | 'SOLAR' | 'LUNAR';
  isLeapMonth?: boolean;
};

type BaziFieldCondition = 'VALID_VALUE' | 'USER_NOT_PROVIDED' | 'CORE_NOT_SUPPORTED' | 'CALCULATION_FAILED' | 'MAPPING_MISSING' | 'OPTIONAL_NOT_AVAILABLE';
export type BaziPipelineState =
  | 'INPUT_RECEIVED'
  | 'INPUT_VALIDATED'
  | 'INPUT_NORMALIZED'
  | 'CORE_PROCESSING'
  | 'CORE_COMPLETED'
  | 'PROFESSIONAL_RESULT_CREATED'
  | 'PROFESSIONAL_VALIDATED'
  | 'API_READY'
  | 'ADAPTER_COMPLETED'
  | 'AI_INTERPRETATION_COMPLETED'
  | 'CUSTOMER_VIEW_READY'
  | 'FINAL_VALIDATED'
  | 'COMPLETED';
export type BaziValidationStatus = 'VALID' | 'PARTIAL_VALID' | 'INVALID';

type V5FieldTrace = {
  field: string;
  calculationId: string;
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

export type BaziPipelineTrace = {
  calculationId: string;
  birthInputFingerprint: string;
  professionalResultId: string;
  mode: 'FULL_BAZI' | 'PARTIAL_BAZI';
  validationStatus: BaziValidationStatus;
  currentState: BaziPipelineState;
  completedStates: BaziPipelineState[];
  transitions: Array<{ from: BaziPipelineState; to: BaziPipelineState; ok: true }>;
  illegalTransitions: Array<{ from: BaziPipelineState; to: BaziPipelineState; reason: string }>;
  failureStage: BaziPipelineState | null;
  failureReason: string | null;
};

export const BAZI_PIPELINE_ORDER: BaziPipelineState[] = [
  'INPUT_RECEIVED',
  'INPUT_VALIDATED',
  'INPUT_NORMALIZED',
  'CORE_PROCESSING',
  'CORE_COMPLETED',
  'PROFESSIONAL_RESULT_CREATED',
  'PROFESSIONAL_VALIDATED',
  'API_READY',
  'ADAPTER_COMPLETED',
  'AI_INTERPRETATION_COMPLETED',
  'CUSTOMER_VIEW_READY',
  'FINAL_VALIDATED',
  'COMPLETED',
];

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

function hashText(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value as Record<string, unknown>).sort().map((key) => JSON.stringify(key) + ':' + stableStringify((value as Record<string, unknown>)[key])).join(',') + '}';
}

function normalizeForFingerprint(input: BaziRuntimeInput) {
  return {
    name: input.name?.trim() || '',
    birthDate: input.birthDate.trim(),
    birthTime: input.timeUnknown === true || input.birthHourBranch === 'unknown' || input.birthTimeKnown === false ? '' : input.birthTime?.trim() || '',
    birthTimeKnown: !(input.timeUnknown === true || input.birthHourBranch === 'unknown' || input.birthTimeKnown === false),
    birthHourBranch: input.birthHourBranch ?? '',
    traditionalHour: input.traditionalHour ?? '',
    gender: input.gender,
    country: input.country?.trim() || '台灣',
    city: input.city?.trim() || '台北',
    calendarType: input.calendarType === 'lunar' || input.calendarType === 'LUNAR' ? 'LUNAR' : 'SOLAR',
    isLeapMonth: Boolean(input.isLeapMonth),
  };
}

function createCalculationId(input: BaziRuntimeInput): string {
  if (input.calculationId?.trim()) return input.calculationId.trim();
  return `bazi_${hashText(stableStringify(normalizeForFingerprint(input)))}_${Date.now().toString(36)}`;
}

function birthInputFingerprint(input: BaziRuntimeInput): string {
  return `birth_${hashText(stableStringify(normalizeForFingerprint(input)))}`;
}

function assertValidRuntimeInput(input: BaziRuntimeInput) {
  const missing = ['birthDate', 'gender'].filter((key) => !input[key as keyof BaziRuntimeInput]);
  const timeUnknown = input.timeUnknown === true || input.birthHourBranch === 'unknown' || input.birthTimeKnown === false;
  if (!timeUnknown && !input.birthTime) missing.push('birthTime');
  if (missing.length > 0) throw new Error(`BAZI_PIPELINE_INPUT_INVALID: ${missing.join(',')}`);
  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(input.birthDate)) throw new Error('BAZI_PIPELINE_INPUT_INVALID: birthDate');
  if (!timeUnknown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.birthTime)) throw new Error('BAZI_PIPELINE_INPUT_INVALID: birthTime');
  if (input.gender !== 'male' && input.gender !== 'female') throw new Error('BAZI_PIPELINE_INPUT_INVALID: gender');
}

export function isLegalBaziPipelineTransition(from: BaziPipelineState, to: BaziPipelineState): boolean {
  const fromIndex = BAZI_PIPELINE_ORDER.indexOf(from);
  return fromIndex >= 0 && BAZI_PIPELINE_ORDER[fromIndex + 1] === to;
}

function createPipelineRecorder(calculationId: string, fingerprint: string) {
  const completedStates: BaziPipelineState[] = ['INPUT_RECEIVED'];
  const transitions: BaziPipelineTrace['transitions'] = [];
  const illegalTransitions: BaziPipelineTrace['illegalTransitions'] = [];
  let current: BaziPipelineState = 'INPUT_RECEIVED';
  const advance = (to: BaziPipelineState) => {
    if (!isLegalBaziPipelineTransition(current, to)) {
      illegalTransitions.push({ from: current, to, reason: 'ILLEGAL_TRANSITION' });
      throw new Error(`BAZI_PIPELINE_ILLEGAL_TRANSITION: ${current}->${to}`);
    }
    transitions.push({ from: current, to, ok: true });
    current = to;
    completedStates.push(to);
  };
  const build = (mode: 'FULL_BAZI' | 'PARTIAL_BAZI', validationStatus: BaziValidationStatus, professionalResultId: string): BaziPipelineTrace => ({
    calculationId,
    birthInputFingerprint: fingerprint,
    professionalResultId,
    mode,
    validationStatus,
    currentState: current,
    completedStates: [...completedStates],
    transitions: [...transitions],
    illegalTransitions: [...illegalTransitions],
    failureStage: null,
    failureReason: null,
  });
  return { advance, build };
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

function buildFieldTraces(core: BaziProfessionalResult, professionalChart: Record<string, unknown>, partial: boolean, calculationId: string): V5FieldTrace[] {
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
      calculationId,
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

export function attachBaziProfessionalCoreV5<T extends BaziAnalysisResult>(result: T, input: BaziRuntimeInput): T {
  const calculationId = createCalculationId(input);
  const fingerprint = birthInputFingerprint(input);
  const pipeline = createPipelineRecorder(calculationId, fingerprint);
  assertValidRuntimeInput(input);
  pipeline.advance('INPUT_VALIDATED');
  const coreInput = toCoreInput(input);
  pipeline.advance('INPUT_NORMALIZED');
  pipeline.advance('CORE_PROCESSING');
  const core = createBaziCore(coreInput);
  pipeline.advance('CORE_COMPLETED');
  const partial = core.chartMode === 'PARTIAL_BAZI';
  const professionalChart = result.professionalChart as unknown as Record<string, unknown>;
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
  pipeline.advance('PROFESSIONAL_RESULT_CREATED');
  const traces = buildFieldTraces(core, professionalChart, partial, calculationId);
  professionalChart.fieldTrace = traces;
  const professionalCompleteness = summarizeCompleteness(traces);
  const validationStatus: BaziValidationStatus = professionalCompleteness.valid ? partial ? 'PARTIAL_VALID' : 'VALID' : 'INVALID';
  professionalChart.professionalCompleteness = { ...professionalCompleteness, validationStatus };
  if (validationStatus === 'INVALID') throw new Error(`BAZI_PIPELINE_VALIDATION_FAILED: ${professionalCompleteness.missingRequiredFields.join(',')}`);
  pipeline.advance('PROFESSIONAL_VALIDATED');
  const professionalResultId = `professional_${hashText(stableStringify({ calculationId, fingerprint, core: core.engine, mode: core.chartMode }))}`;
  const pipelineTrace = pipeline.build(core.chartMode, validationStatus, professionalResultId);
  pipelineTrace.currentState = 'API_READY';
  pipelineTrace.completedStates.push('API_READY');
  pipelineTrace.transitions.push({ from: 'PROFESSIONAL_VALIDATED', to: 'API_READY', ok: true });
  professionalChart.pipeline = pipelineTrace;
  professionalChart.calculationId = calculationId;
  professionalChart.birthInputFingerprint = fingerprint;
  professionalChart.professionalResultId = professionalResultId;
  result.dataFlow = {
    ...result.dataFlow,
    rules: {
      ...result.dataFlow.rules,
      sameCalculationIdRequired: true,
      birthInputFingerprintRequired: true,
      pipelineStateMachineLocked: true,
      finalRenderGateRequired: true,
    } as never,
  };
  if (partial) {
    result.input.birthTime = '';
    (professionalChart.input as Record<string, unknown>).birthTime = '';
    (professionalChart.calendar as Record<string, unknown>).birthTime = '時辰未提供';
  }
  return result;
}
