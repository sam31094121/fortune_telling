import { createZiweiCore, resolveSanFangSiZhengFor, type ZiweiBirthInput, type ZiweiPalaceResult } from './ziwei/engine';

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
type Branch = (typeof BRANCHES)[number];
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
type Stem = (typeof STEMS)[number];

const RED_LUAN_BY_YEAR_BRANCH: Record<Branch, Branch> = {
  子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌',
  午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰',
};

// This table intentionally matches the project’s existing TW_SHENSHA_BASIC_V1
// 三合局沐浴位 mapping. It is kept here only to expose annual targets; the
// base chart's existing 桃花 evidence remains the Bazi engine’s responsibility.
const PEACH_BY_TRINE_BRANCH: Record<Branch, Branch> = {
  申: '酉', 子: '酉', 辰: '酉',
  寅: '卯', 午: '卯', 戌: '卯',
  巳: '午', 酉: '午', 丑: '午',
  亥: '子', 卯: '子', 未: '子',
};

const TIANYI_BY_DAY_STEM: Record<Stem, Branch[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};

const DAY_BRANCH_SIX_COMBINE: Array<[Branch, Branch]> = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
];
const DAY_BRANCH_SIX_CLASH: Array<[Branch, Branch]> = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];

export const RED_LUAN_HEARTBEAT_BAZI_VERSION = 'STAR_STUDY_HONGLUAN_TIANXI_V1';
export const RED_LUAN_HEARTBEAT_ZIWEI_VERSION = 'IZTRO_2_5_8_NATAL_RELATION_V1';
export const RED_LUAN_HEARTBEAT_TIMELINE_VERSION = 'RED_LUAN_DETERMINISTIC_TIMELINE_V2';

export const RED_LUAN_RELATIONSHIP_STATUSES = [
  'SINGLE_NEVER_MARRIED', 'DATING', 'MARRIED', 'SEPARATED', 'DIVORCED', 'WIDOWED',
] as const;
export const RED_LUAN_FAMILY_RESPONSIBILITIES = [
  'NO_CHILDREN_OR_PRIMARY_CARE', 'LIVE_WITH_OR_CARE_FOR_PARENTS', 'HAS_CHILDREN', 'CARE_FOR_OTHER_FAMILY',
] as const;
export const RED_LUAN_CURRENT_EXPECTATIONS = [
  'MEET_SOMEONE', 'STABLE_RELATIONSHIP', 'MARRIAGE_PLANNING', 'REPAIR_RELATIONSHIP',
] as const;

/**
 * Marks a context field the customer has not answered. The three self-reported
 * fields are optional by design: chart evidence is frozen before this stage, so
 * leaving them blank costs no precision. It only means the guidance copy for
 * that dimension stays neutral instead of tailored.
 */
export const RED_LUAN_CONTEXT_UNSPECIFIED = 'UNSPECIFIED';

export type RedLuanRelationshipStatus = (typeof RED_LUAN_RELATIONSHIP_STATUSES)[number];
export type RedLuanFamilyResponsibility = (typeof RED_LUAN_FAMILY_RESPONSIBILITIES)[number];
export type RedLuanCurrentExpectation = (typeof RED_LUAN_CURRENT_EXPECTATIONS)[number];
export type RedLuanContextUnspecified = typeof RED_LUAN_CONTEXT_UNSPECIFIED;

export type RedLuanSelfReportedContext = {
  relationshipStatus: RedLuanRelationshipStatus | RedLuanContextUnspecified;
  familyResponsibility: RedLuanFamilyResponsibility | RedLuanContextUnspecified;
  currentExpectation: RedLuanCurrentExpectation | RedLuanContextUnspecified;
};

export type RedLuanContextField = keyof RedLuanSelfReportedContext;

export type RedLuanContextCompleteness = 'NONE' | 'PARTIAL' | 'COMPLETE';

export type RedLuanContextAlignment = {
  mode: 'REFLECTION_GUIDANCE_ONLY';
  alignmentStatus: 'EVIDENCE_AVAILABLE' | 'NO_VERIFIED_YEARLY_RULE_HIT';
  calculationOrder: {
    stageOne: {
      label: 'BAZI_ZIWEI_EVIDENCE';
      baziStatus: RedLuanValidationState['primaryStatus'];
      ziweiStatus: ZiweiLovePersonSignal['status'];
      evidenceFrozenBeforeContext: true;
    };
    stageTwo: {
      label: 'RELATIONSHIP_CONTEXT_ALIGNMENT';
      status: 'COMPUTED';
      inputFields: ['relationshipStatus', 'familyResponsibility', 'currentExpectation'];
      /** Fields the customer actually answered; the rest fall back to neutral guidance. */
      providedFields: RedLuanContextField[];
      unspecifiedFields: RedLuanContextField[];
    };
  };
  contextCompleteness: RedLuanContextCompleteness;
  relationshipPosition: RedLuanSelfReportedContext;
  annualEvidence: {
    precision: 'ANNUAL_BRANCH';
    years: number[];
    evidenceCount: number;
  };
  themeTitle: string;
  guidancePrompt: string;
  actionDirections: Array<{
    id: 'relationship_rhythm' | 'life_arrangement' | 'expectation_direction';
    title: string;
    symbolism: string;
    reflectionQuestion: string;
    action: string;
  }>;
  limitations: string[];
};

/**
 * Validates customer-provided context only. These fields are deliberately not
 * accepted by buildSingleRedLuanHeartbeat, so they cannot alter chart rules,
 * evidence, quality gates, or timeline precision.
 *
 * Every field is optional: blank is a valid answer and produces neutral guidance
 * for that dimension. Only a value outside the published option list is an error.
 */
export function validateRedLuanSelfReportedContext(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return '關係位置資料格式無效。';
  const context = value as Partial<Record<RedLuanContextField, unknown>>;
  if (!isBlankContextValue(context.relationshipStatus) && !RED_LUAN_RELATIONSHIP_STATUSES.includes(context.relationshipStatus as RedLuanRelationshipStatus)) {
    return '關係現況的選項無效。';
  }
  if (!isBlankContextValue(context.familyResponsibility) && !RED_LUAN_FAMILY_RESPONSIBILITIES.includes(context.familyResponsibility as RedLuanFamilyResponsibility)) {
    return '家庭責任的選項無效。';
  }
  if (!isBlankContextValue(context.currentExpectation) && !RED_LUAN_CURRENT_EXPECTATIONS.includes(context.currentExpectation as RedLuanCurrentExpectation)) {
    return '期待方向的選項無效。';
  }
  return null;
}

function isBlankContextValue(value: unknown) {
  return value === undefined || value === null || value === '' || value === RED_LUAN_CONTEXT_UNSPECIFIED;
}

/**
 * Turns anything the client sent into a complete context object, with every
 * unanswered or blank field collapsed to UNSPECIFIED. Invalid values are treated
 * as unanswered here; `validateRedLuanSelfReportedContext` is what rejects them.
 */
export function normalizeRedLuanSelfReportedContext(value: unknown): RedLuanSelfReportedContext {
  const context = (value && typeof value === 'object' ? value : {}) as Partial<Record<RedLuanContextField, unknown>>;
  const pick = <Option extends string>(raw: unknown, allowed: readonly Option[]) => (
    !isBlankContextValue(raw) && allowed.includes(raw as Option) ? raw as Option : RED_LUAN_CONTEXT_UNSPECIFIED
  );
  return {
    relationshipStatus: pick(context.relationshipStatus, RED_LUAN_RELATIONSHIP_STATUSES),
    familyResponsibility: pick(context.familyResponsibility, RED_LUAN_FAMILY_RESPONSIBILITIES),
    currentExpectation: pick(context.currentExpectation, RED_LUAN_CURRENT_EXPECTATIONS),
  };
}

type ContextGuidanceModule = { theme: string; symbolism: string; reflectionQuestion: string; action: string };

const RELATIONSHIP_GUIDANCE: Record<RedLuanSelfReportedContext['relationshipStatus'], ContextGuidanceModule> = {
  SINGLE_NEVER_MARRIED: { theme: '留白開新', symbolism: '如初爻留白，先讓新的相遇有地方落腳。', reflectionQuestion: '在不勉強自己的前提下，你願意為認識新朋友留出多少空間？', action: '選擇一個自己願意參與、也方便自然認識新朋友的場合。' },
  DATING: { theme: '同行定步', symbolism: '兩線同行，先辨彼此步幅，再決定下一程。', reflectionQuestion: '你希望目前的關係用什麼速度前進，哪些界線需要先說清楚？', action: '安排一次雙方都願意的關係節奏對話，先交換期待，不急著下結論。' },
  MARRIED: { theme: '守成有新', symbolism: '守其所成，也為日常添一點新的流動。', reflectionQuestion: '在既有關係裡，你想先為哪一種相處品質留出時間？', action: '為目前關係保留一段不被打擾的相處時間，從一件可共同完成的小事開始。' },
  SEPARATED: { theme: '先界後行', symbolism: '水有岸才可安行；先定界線，再看是否前進。', reflectionQuestion: '什麼樣的聯絡方式與距離，對你現在而言較尊重也較安全？', action: '先確認安全、尊重且雙方願意的聯絡界線，再決定是否安排下一次對話。' },
  DIVORCED: { theme: '整序再啟', symbolism: '一卦既終，不催下一卦；先由自己決定何時再啟。', reflectionQuestion: '如果重新開放連結，你希望保留哪些步調與選擇權？', action: '按自己的步調決定是否開放新的社交連結，不需要配合任何命理時程。' },
  WIDOWED: { theme: '敬昔迎今', symbolism: '珍重走過的篇章，也容許新的陪伴依自己的節奏靠近。', reflectionQuestion: '此刻你願意接受的是陪伴、社交，還是先保留自己的時間？', action: '尊重自己的步調，選擇是否接受一段低壓力的陪伴或社交邀請。' },
  UNSPECIFIED: { theme: '界線自訂', symbolism: '未定之爻不強斷，界線由當事人自己畫。', reflectionQuestion: '此刻你希望與人的距離是再靠近一點，還是先保留自己的空間？', action: '照自己的舒適距離決定互動頻率；願意時再補上關係現況，引導會更貼近。' },
};

const FAMILY_GUIDANCE: Record<RedLuanSelfReportedContext['familyResponsibility'], ContextGuidanceModule> = {
  NO_CHILDREN_OR_PRIMARY_CARE: { theme: '自在留時', symbolism: '行有餘地，才有空間觀察新的變化。', reflectionQuestion: '你現在願意固定留出哪一段時間，照顧自己的關係探索？', action: '先在日常行程中留下一段可自由運用的關係探索時間。' },
  LIVE_WITH_OR_CARE_FOR_PARENTS: { theme: '承責有度', symbolism: '承載不是停滯；先定份量，才能讓生活繼續流動。', reflectionQuestion: '在照顧父母之外，你希望如何保留自己的時間與支持？', action: '先盤點照顧安排與可運用時間，再選擇不增加負擔的互動方式。' },
  HAS_CHILDREN: { theme: '護持並行', symbolism: '一邊護持既有責任，一邊為自己的關係需要留一條路。', reflectionQuestion: '什麼樣的安排能同時尊重照顧責任與你的關係需求？', action: '選擇不影響照顧責任、時間界線清楚的相處安排。' },
  CARE_FOR_OTHER_FAMILY: { theme: '分力安行', symbolism: '先量可用之力，再選可長久的步幅。', reflectionQuestion: '目前可運用的時間與心力到哪裡，哪些支持可以先安排？', action: '先確認目前可負擔的時間與心力，再決定互動頻率。' },
  UNSPECIFIED: { theme: '量力而行', symbolism: '行有餘力則進，力有未逮則守。', reflectionQuestion: '扣掉現有的責任，你每週還剩下多少真正屬於自己的時間？', action: '先估算自己可運用的時間再安排互動，不需要為了配合任何時程勉強自己。' },
};

const EXPECTATION_GUIDANCE: Record<RedLuanSelfReportedContext['currentExpectation'], ContextGuidanceModule & { prompt: string }> = {
  MEET_SOMEONE: {
    theme: '開門見人',
    symbolism: '門開一線，不求結果先到，只讓相遇有機會發生。',
    reflectionQuestion: '你想從什麼樣的場合開始，才會感到自然且保有選擇？',
    prompt: '這一段時間，你想先為哪一種認識新人的節奏留出位置？',
    action: '從一個低壓力、興趣相近的活動開始，保留接受或婉拒的選擇。',
  },
  STABLE_RELATIONSHIP: {
    theme: '穩中求進',
    symbolism: '水流不必急，方向一致才能走得長。',
    reflectionQuestion: '你希望彼此先穩定哪一項相處習慣或溝通方式？',
    prompt: '這一段時間，你想先穩住哪一種相處節奏？',
    action: '選一個彼此都方便的時間，先談一項希望維持的相處習慣。',
  },
  MARRIAGE_PLANNING: {
    theme: '共築有序',
    symbolism: '成屋先立樑柱；共同生活也從可討論的現實安排開始。',
    reflectionQuestion: '在共同生活的想像裡，你最想先談清楚哪一項安排？',
    prompt: '這一段時間，你想先釐清哪一項共同生活安排？',
    action: '先挑一項現實議題交換想法，例如時間、住居或家庭責任，不把結果當成命盤承諾。',
  },
  REPAIR_RELATIONSHIP: {
    theme: '緩修再連',
    symbolism: '裂處不以急力相合，先確認雙方是否仍願意靠近。',
    reflectionQuestion: '若要開始修復，你希望先從哪一件小事建立可對話的空間？',
    prompt: '這一段時間，你想先為哪一種修復節奏留出空間？',
    action: '先確認雙方是否願意對話，再從一件可具體說明的小事開始；任何一方都可以停止。',
  },
  UNSPECIFIED: {
    theme: '順勢而觀',
    symbolism: '方向未定時先觀其變，不急於落子。',
    reflectionQuestion: '如果現在不必給出答案，你最想先弄清楚的是哪一件事？',
    prompt: '這一段時間，你想先觀察哪一種關係節奏？',
    action: '先把年度訊號當成觀察窗口；等自己的方向清楚了，再決定要不要行動。',
  },
};

export type RedLuanTimePrecision = 'EXACT_TIME' | 'TRADITIONAL_HOUR' | 'UNKNOWN_TIME';

export type RedLuanNormalizedBirth = {
  inputCalendarType: 'SOLAR' | 'LUNAR';
  normalizedSolarDate: string;
  normalizedLunarDate: string;
  timezone: string;
  timePrecision: RedLuanTimePrecision;
  exactTime?: string;
  traditionalHour?: Branch;
  traditionalHourRange?: string;
};

export type RedLuanValidationState = {
  primaryEngine: string;
  primaryEngineVersion: string;
  primaryRuleSet: string;
  primaryStatus: 'PASSED' | 'BLOCKED';
  qualityGateStatus: 'PASSED' | 'BLOCKED' | 'REVIEW_REQUIRED' | 'NOT_TESTED';
  independentReference: 'PASSED' | 'FAILED' | 'NOT_TESTED_NO_INDEPENDENT_SOURCE';
  goldenCases: 'PASSED' | 'FAILED' | 'NOT_AVAILABLE';
  totalCompared: number;
  matchedCount: number;
  differences: Array<{
    path: string;
    severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
    sourceA: unknown;
    sourceB: unknown;
    message: string;
    ruleId?: string;
  }>;
  verifiedScope: string[];
  unverifiedScope: string[];
};

export type RedLuanTimelineEvidence = {
  id: 'red_luan' | 'tian_xi' | 'peach_blossom' | 'tianyi' | 'day_branch_combine' | 'day_branch_clash';
  label: string;
  ruleId: string;
  ruleVersion: string;
  evidenceBranches: string[];
  evidence: string;
  source: string;
  precision: 'ANNUAL_BRANCH' | 'SOLAR_TERM_MONTH_BRANCH';
};

export type RedLuanAnnualRhythm = {
  year: number;
  annualBranch: Branch;
  status: 'RULE_HIT' | 'NO_RULE_HIT';
  precision: 'ANNUAL_BRANCH';
  evidence: RedLuanTimelineEvidence[];
  limitation: string;
};

export type RedLuanEvidence = {
  id: 'red_luan' | 'tian_xi' | 'peach_blossom';
  label: '紅鸞' | '天喜' | '桃花';
  targetBranch: Branch;
  evidence: string;
};

export type BaziLovePersonSignal = {
  status: 'READY';
  ruleVersion: typeof RED_LUAN_HEARTBEAT_BAZI_VERSION;
  annualYear: number;
  annualBranch: Branch;
  inputCompleteness: '完整四柱' | '三柱基礎（時辰未知）';
  natalEvidence: RedLuanEvidence[];
  annualTriggers: RedLuanEvidence[];
  sources: Array<{ title: string; reference: string }>;
  limitations: string[];
};

export type ZiweiLovePersonSignal = {
  status: 'READY' | 'UNAVAILABLE_BIRTH_TIME_REQUIRED';
  ruleVersion: typeof RED_LUAN_HEARTBEAT_ZIWEI_VERSION;
  annualStatus: 'UNAVAILABLE_RULE_SOURCE_REQUIRED';
  inputCompleteness: '完整出生時辰' | '時辰未知';
  palaces?: Array<{ palace: string; earthlyBranch: string; majorStars: string[]; minorStars: string[] }>;
  limitations: string[];
};

export type RedLuanHeartbeatResult = {
  annualYear: number;
  bazi: { personA: BaziLovePersonSignal; personB: BaziLovePersonSignal };
  ziwei: { personA: ZiweiLovePersonSignal; personB: ZiweiLovePersonSignal };
  crossCheck: {
    status: 'READY' | 'PARTIAL';
    summary: string;
    limitation: string;
  };
  iching: {
    status: 'UNAVAILABLE_RULE_SOURCE_REQUIRED';
    limitation: string;
  };
};

export type SingleRedLuanHeartbeatResult = {
  annualYear: number;
  normalizedBirth: RedLuanNormalizedBirth;
  validation: RedLuanValidationState;
  bazi: BaziLovePersonSignal;
  annualRhythm: RedLuanAnnualRhythm[];
  monthlyRhythm: {
    status: 'READY';
    precision: 'SOLAR_TERM_MONTH_BRANCH';
    year: number;
    months: RedLuanMonthlyRhythm[];
    /** 命中規則最多的月份，最多三個；同分依節氣先後排列。 */
    peakMonths: RedLuanMonthlyRhythm[];
    limitation: string;
  };
  ziwei: ZiweiLovePersonSignal;
  crossCheck: {
    status: 'READY' | 'PARTIAL';
    summary: string;
    limitation: string;
  };
  iching: {
    status: 'UNAVAILABLE_RULE_SOURCE_REQUIRED';
    limitation: string;
  };
};

/**
 * Builds a separate reflection layer by placing explicit customer context next
 * to already-computed annual evidence. It never mutates or recalculates the
 * chart result and is intentionally separate from the calculation quality gate.
 */
export function buildRedLuanContextAlignment(
  context: unknown,
  result: SingleRedLuanHeartbeatResult,
): RedLuanContextAlignment {
  const contextError = validateRedLuanSelfReportedContext(context);
  if (contextError) throw new Error(`RED_LUAN_CONTEXT_INVALID:${contextError}`);
  const normalized = normalizeRedLuanSelfReportedContext(context);
  const contextFields: RedLuanContextField[] = ['relationshipStatus', 'familyResponsibility', 'currentExpectation'];
  const providedFields = contextFields.filter((field) => normalized[field] !== RED_LUAN_CONTEXT_UNSPECIFIED);
  const unspecifiedFields = contextFields.filter((field) => normalized[field] === RED_LUAN_CONTEXT_UNSPECIFIED);
  const evidenceRows = result.annualRhythm.filter((item) => item.evidence.length > 0);
  const relationship = RELATIONSHIP_GUIDANCE[normalized.relationshipStatus];
  const family = FAMILY_GUIDANCE[normalized.familyResponsibility];
  const expectation = EXPECTATION_GUIDANCE[normalized.currentExpectation];
  const answeredThemes = [
    normalized.relationshipStatus !== RED_LUAN_CONTEXT_UNSPECIFIED ? relationship.theme : '',
    normalized.familyResponsibility !== RED_LUAN_CONTEXT_UNSPECIFIED ? family.theme : '',
    normalized.currentExpectation !== RED_LUAN_CONTEXT_UNSPECIFIED ? expectation.theme : '',
  ].filter(Boolean);
  return {
    mode: 'REFLECTION_GUIDANCE_ONLY',
    alignmentStatus: evidenceRows.length > 0 ? 'EVIDENCE_AVAILABLE' : 'NO_VERIFIED_YEARLY_RULE_HIT',
    calculationOrder: {
      stageOne: {
        label: 'BAZI_ZIWEI_EVIDENCE',
        baziStatus: result.validation.primaryStatus,
        ziweiStatus: result.ziwei.status,
        evidenceFrozenBeforeContext: true,
      },
      stageTwo: {
        label: 'RELATIONSHIP_CONTEXT_ALIGNMENT',
        status: 'COMPUTED',
        inputFields: ['relationshipStatus', 'familyResponsibility', 'currentExpectation'],
        providedFields,
        unspecifiedFields,
      },
    },
    contextCompleteness: providedFields.length === 0 ? 'NONE' : unspecifiedFields.length === 0 ? 'COMPLETE' : 'PARTIAL',
    relationshipPosition: { ...normalized },
    annualEvidence: {
      precision: 'ANNUAL_BRANCH',
      years: evidenceRows.map((item) => item.year),
      evidenceCount: evidenceRows.reduce((total, item) => total + item.evidence.length, 0),
    },
    themeTitle: answeredThemes.length > 0 ? answeredThemes.join('・') : '年度訊號・方向留白',
    guidancePrompt: expectation.prompt,
    actionDirections: [
      { id: 'relationship_rhythm', title: `界線與步調・${relationship.theme}`, symbolism: relationship.symbolism, reflectionQuestion: relationship.reflectionQuestion, action: relationship.action },
      { id: 'life_arrangement', title: `支持系統・${family.theme}`, symbolism: family.symbolism, reflectionQuestion: family.reflectionQuestion, action: family.action },
      { id: 'expectation_direction', title: `關係準備度・${expectation.theme}`, symbolism: expectation.symbolism, reflectionQuestion: expectation.reflectionQuestion, action: expectation.action },
    ],
    limitations: [
      '這是客戶自述與已驗證年度規則證據的交叉呈現，只用來增加引導貼合度。',
      '自述資料不改變八字排盤、紅鸞規則、年份證據或品質門控，也不提高命盤計算精準度。',
      '本層不推斷未填資訊、人格、焦慮、依附型態或創傷，不作心理診斷或婚姻預測。',
      ...(unspecifiedFields.length > 0
        ? ['未填寫的項目一律採用中性引導，系統不會反推或補齊；命盤證據在此之前已完成並凍結，不因此有任何差異。']
        : []),
    ],
  };
}

export function annualBranchOf(year: number): Branch {
  return BRANCHES[((Math.trunc(year) - 4) % 12 + 12) % 12];
}

export function redLuanBranchOf(yearBranch: Branch): Branch {
  return RED_LUAN_BY_YEAR_BRANCH[yearBranch];
}

export function tianXiBranchOf(yearBranch: Branch): Branch {
  return BRANCHES[(BRANCHES.indexOf(redLuanBranchOf(yearBranch)) + 6) % 12];
}

function isBranch(value: string): value is Branch {
  return (BRANCHES as readonly string[]).includes(value);
}

function isStem(value?: string): value is Stem {
  return Boolean(value && (STEMS as readonly string[]).includes(value));
}

function pairMatches(left: Branch, right: Branch, pairs: Array<[Branch, Branch]>) {
  return pairs.some(([a, b]) => (a === left && b === right) || (a === right && b === left));
}

function timelineEvidence(
  input: Omit<RedLuanTimelineEvidence, 'precision'>,
  precision: RedLuanTimelineEvidence['precision'] = 'ANNUAL_BRANCH',
): RedLuanTimelineEvidence {
  return { ...input, precision };
}

/**
 * 節氣月（非國曆月）：月支由節氣定義，正月起於立春、月月固定，
 * 與年份無關，因此不需星曆即可決定性取得。國曆區間為概略值，
 * 交界日以八字排盤引擎的節氣時刻為準。
 */
export const RED_LUAN_SOLAR_MONTHS = [
  { index: 1, branch: '寅', jieqi: '立春', lunarLabel: '正月', gregorianHint: '約 2/4 – 3/5' },
  { index: 2, branch: '卯', jieqi: '驚蟄', lunarLabel: '二月', gregorianHint: '約 3/6 – 4/4' },
  { index: 3, branch: '辰', jieqi: '清明', lunarLabel: '三月', gregorianHint: '約 4/5 – 5/5' },
  { index: 4, branch: '巳', jieqi: '立夏', lunarLabel: '四月', gregorianHint: '約 5/6 – 6/5' },
  { index: 5, branch: '午', jieqi: '芒種', lunarLabel: '五月', gregorianHint: '約 6/6 – 7/6' },
  { index: 6, branch: '未', jieqi: '小暑', lunarLabel: '六月', gregorianHint: '約 7/7 – 8/7' },
  { index: 7, branch: '申', jieqi: '立秋', lunarLabel: '七月', gregorianHint: '約 8/8 – 9/7' },
  { index: 8, branch: '酉', jieqi: '白露', lunarLabel: '八月', gregorianHint: '約 9/8 – 10/7' },
  { index: 9, branch: '戌', jieqi: '寒露', lunarLabel: '九月', gregorianHint: '約 10/8 – 11/6' },
  { index: 10, branch: '亥', jieqi: '立冬', lunarLabel: '十月', gregorianHint: '約 11/7 – 12/6' },
  { index: 11, branch: '子', jieqi: '大雪', lunarLabel: '十一月', gregorianHint: '約 12/7 – 隔年 1/5' },
  { index: 12, branch: '丑', jieqi: '小寒', lunarLabel: '十二月', gregorianHint: '約 1/6 – 2/3' },
] as const satisfies ReadonlyArray<{ index: number; branch: Branch; jieqi: string; lunarLabel: string; gregorianHint: string }>;

export type RedLuanSolarMonth = (typeof RED_LUAN_SOLAR_MONTHS)[number];

export type RedLuanMonthlyRhythm = {
  year: number;
  monthIndex: number;
  monthBranch: Branch;
  jieqi: string;
  lunarLabel: string;
  gregorianHint: string;
  status: 'RULE_HIT' | 'NO_RULE_HIT';
  precision: 'SOLAR_TERM_MONTH_BRANCH';
  /** 命中的規則數；用來排序「哪幾個月最densely命中」，不是機率或分數。 */
  hitCount: number;
  evidence: RedLuanTimelineEvidence[];
  limitation: string;
};

/**
 * 月度節奏：把年度用的同一組規則（紅鸞／天喜／桃花／天乙貴人／日支六合六沖）
 * 改以流月地支為觸發對象。規則編號、版本與出處完全沿用年度層，
 * 唯一差別是精度從年支變成節氣月支——不是新流派，也沒有新的機率模型。
 */
export function buildSingleRedLuanMonthlyRhythm(input: {
  yearBranch: string;
  dayBranch: string;
  dayMasterStem?: string;
  year: number;
}): RedLuanMonthlyRhythm[] {
  if (!isBranch(input.yearBranch) || !isBranch(input.dayBranch)) {
    throw new Error('RED_LUAN_HEARTBEAT_INVALID_BAZI_BRANCH');
  }
  if (!Number.isInteger(input.year)) throw new Error('RED_LUAN_HEARTBEAT_INVALID_YEAR_RANGE');
  const yearBranch = input.yearBranch;
  const dayBranch = input.dayBranch;

  const targets: Array<{ id: RedLuanTimelineEvidence['id']; label: string; branch: Branch; scope: string; ruleId: string; source: string }> = [
    { id: 'red_luan', label: '紅鸞', branch: redLuanBranchOf(yearBranch), scope: `年支${yearBranch}之紅鸞位`, ruleId: 'RED_LUAN_BY_YEAR_BRANCH_V1', source: '《星學大成》〈論紅鸞天喜〉' },
    { id: 'tian_xi', label: '天喜', branch: tianXiBranchOf(yearBranch), scope: `年支${yearBranch}之天喜位`, ruleId: 'TIAN_XI_OPPOSITE_RED_LUAN_V1', source: '《星學大成》〈論紅鸞天喜〉' },
    { id: 'peach_blossom', label: '桃花', branch: PEACH_BY_TRINE_BRANCH[yearBranch], scope: `年支${yearBranch}三合局沐浴位`, ruleId: 'TW_SHENSHA_BASIC_V1_TAOHUA', source: '專案既有八字神煞規則' },
    { id: 'peach_blossom', label: '桃花', branch: PEACH_BY_TRINE_BRANCH[dayBranch], scope: `日支${dayBranch}三合局沐浴位`, ruleId: 'TW_SHENSHA_BASIC_V1_TAOHUA', source: '專案既有八字神煞規則' },
  ];
  const seen = new Set<string>();
  const uniqueTargets = targets.filter((target) => {
    const key = `${target.id}:${target.branch}:${target.scope}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return RED_LUAN_SOLAR_MONTHS.map((month) => {
    const monthBranch = month.branch;
    const period = `${input.year} 年${month.lunarLabel}（${month.jieqi}起，${month.gregorianHint}）`;
    const evidence: RedLuanTimelineEvidence[] = uniqueTargets
      .filter((target) => target.branch === monthBranch)
      .map((target) => timelineEvidence({
        id: target.id,
        label: target.label,
        ruleId: target.ruleId,
        ruleVersion: RED_LUAN_HEARTBEAT_BAZI_VERSION,
        evidenceBranches: [target.branch, monthBranch],
        evidence: `${period}流月支${monthBranch}命中${target.scope}`,
        source: target.source,
      }, 'SOLAR_TERM_MONTH_BRANCH'));

    if (isStem(input.dayMasterStem) && TIANYI_BY_DAY_STEM[input.dayMasterStem].includes(monthBranch)) {
      evidence.push(timelineEvidence({
        id: 'tianyi',
        label: '天乙貴人',
        ruleId: 'TW_SHENSHA_BASIC_V1_TIANYI',
        ruleVersion: 'TW_SHENSHA_BASIC_V1',
        evidenceBranches: [input.dayMasterStem, monthBranch],
        evidence: `${period}流月支${monthBranch}命中日干${input.dayMasterStem}之天乙貴人位${TIANYI_BY_DAY_STEM[input.dayMasterStem].join('/')}`,
        source: '專案既有八字神煞規則',
      }, 'SOLAR_TERM_MONTH_BRANCH'));
    }
    if (pairMatches(dayBranch, monthBranch, DAY_BRANCH_SIX_COMBINE)) {
      evidence.push(timelineEvidence({
        id: 'day_branch_combine',
        label: '日支六合',
        ruleId: 'DAY_BRANCH_SIX_COMBINE_V1',
        ruleVersion: 'TW_TRADITIONAL_BAZI_V1',
        evidenceBranches: [dayBranch, monthBranch],
        evidence: `本命日支${dayBranch}與${period}流月支${monthBranch}構成六合`,
        source: '專案既有干支作用規則',
      }, 'SOLAR_TERM_MONTH_BRANCH'));
    }
    if (pairMatches(dayBranch, monthBranch, DAY_BRANCH_SIX_CLASH)) {
      evidence.push(timelineEvidence({
        id: 'day_branch_clash',
        label: '日支六沖',
        ruleId: 'DAY_BRANCH_SIX_CLASH_V1',
        ruleVersion: 'TW_TRADITIONAL_BAZI_V1',
        evidenceBranches: [dayBranch, monthBranch],
        evidence: `本命日支${dayBranch}與${period}流月支${monthBranch}構成六沖`,
        source: '專案既有干支作用規則',
      }, 'SOLAR_TERM_MONTH_BRANCH'));
    }

    return {
      year: input.year,
      monthIndex: month.index,
      monthBranch,
      jieqi: month.jieqi,
      lunarLabel: month.lunarLabel,
      gregorianHint: month.gregorianHint,
      status: evidence.length > 0 ? 'RULE_HIT' : 'NO_RULE_HIT',
      precision: 'SOLAR_TERM_MONTH_BRANCH',
      hitCount: evidence.length,
      evidence,
      limitation: '月份以節氣為界，非國曆一號起算；命中表示該月地支觸發規則，不保證發生特定事件。',
    };
  });
}

export function buildSingleRedLuanAnnualRhythm(input: {
  yearBranch: string;
  dayBranch: string;
  dayMasterStem?: string;
  presentBranches: Array<{ pillar: '年' | '月' | '日' | '時'; branch: string }>;
  hourKnown: boolean;
  fromYear: number;
  toYear: number;
}): RedLuanAnnualRhythm[] {
  if (!isBranch(input.yearBranch) || !isBranch(input.dayBranch)) {
    throw new Error('RED_LUAN_HEARTBEAT_INVALID_BAZI_BRANCH');
  }
  const yearBranch = input.yearBranch;
  const dayBranch = input.dayBranch;
  if (!Number.isInteger(input.fromYear) || !Number.isInteger(input.toYear) || input.fromYear > input.toYear || input.toYear - input.fromYear > 20) {
    throw new Error('RED_LUAN_HEARTBEAT_INVALID_YEAR_RANGE');
  }

  return Array.from({ length: input.toYear - input.fromYear + 1 }, (_, offset) => {
    const year = input.fromYear + offset;
    const annualBranch = annualBranchOf(year);
    const base = buildBaziLovePersonSignal({
      yearBranch,
      dayBranch,
      presentBranches: input.presentBranches,
      hourKnown: input.hourKnown,
      annualYear: year,
    });
    const evidence: RedLuanTimelineEvidence[] = base.annualTriggers.map((item) => {
      const basisBranch = item.evidence.includes('命中年支') ? yearBranch : dayBranch;
      return timelineEvidence({
        id: item.id,
        label: item.label,
        ruleId: item.id === 'red_luan'
          ? 'RED_LUAN_BY_YEAR_BRANCH_V1'
          : item.id === 'tian_xi'
            ? 'TIAN_XI_OPPOSITE_RED_LUAN_V1'
            : 'TW_SHENSHA_BASIC_V1_TAOHUA',
        ruleVersion: RED_LUAN_HEARTBEAT_BAZI_VERSION,
        evidenceBranches: [basisBranch, annualBranch],
        evidence: item.evidence,
        source: item.id === 'peach_blossom' ? '專案既有八字神煞規則' : '《星學大成》〈論紅鸞天喜〉',
      });
    });

    if (isStem(input.dayMasterStem) && TIANYI_BY_DAY_STEM[input.dayMasterStem].includes(annualBranch)) {
      evidence.push(timelineEvidence({
        id: 'tianyi',
        label: '天乙貴人',
        ruleId: 'TW_SHENSHA_BASIC_V1_TIANYI',
        ruleVersion: 'TW_SHENSHA_BASIC_V1',
        evidenceBranches: [input.dayMasterStem, annualBranch],
        evidence: `${year}流年支${annualBranch}命中日干${input.dayMasterStem}之天乙貴人位${TIANYI_BY_DAY_STEM[input.dayMasterStem].join('/')}`,
        source: '專案既有八字神煞規則',
      }));
    }
    if (pairMatches(dayBranch, annualBranch, DAY_BRANCH_SIX_COMBINE)) {
      evidence.push(timelineEvidence({
        id: 'day_branch_combine',
        label: '日支六合',
        ruleId: 'DAY_BRANCH_SIX_COMBINE_V1',
        ruleVersion: 'TW_TRADITIONAL_BAZI_V1',
        evidenceBranches: [dayBranch, annualBranch],
        evidence: `本命日支${dayBranch}與${year}流年支${annualBranch}構成六合`,
        source: '專案既有干支作用規則',
      }));
    }
    if (pairMatches(dayBranch, annualBranch, DAY_BRANCH_SIX_CLASH)) {
      evidence.push(timelineEvidence({
        id: 'day_branch_clash',
        label: '日支六沖',
        ruleId: 'DAY_BRANCH_SIX_CLASH_V1',
        ruleVersion: 'TW_TRADITIONAL_BAZI_V1',
        evidenceBranches: [dayBranch, annualBranch],
        evidence: `本命日支${dayBranch}與${year}流年支${annualBranch}構成六沖`,
        source: '專案既有干支作用規則',
      }));
    }

    return {
      year,
      annualBranch,
      status: evidence.length > 0 ? 'RULE_HIT' : 'NO_RULE_HIT',
      precision: 'ANNUAL_BRANCH',
      evidence,
      limitation: '僅表示年度地支規則命中，不代表必然發生戀愛、婚姻或特定事件。',
    };
  });
}

/**
 * 地支 → 外型印象與常見職業領域。
 * 這是十二地支五行氣性的傳統對應（木主生發、火主外放、金主精整、水主流動、土主承載），
 * 描述的是「第一眼的印象」與「常出現的行業場域」，不是對任何人的斷定。
 */
const BRANCH_PERSON_PROFILE: Record<Branch, { appearance: string; careers: string[] }> = {
  子: { appearance: '清秀機靈，眼神有神、反應寫在臉上', careers: ['業務', '行銷企劃', '媒體傳播', '運輸物流', '飲料餐飲'] },
  丑: { appearance: '厚實穩重，五官敦厚、講話慢但踏實', careers: ['金融', '營建', '公職', '倉儲管理', '農牧食品'] },
  寅: { appearance: '骨架大、氣勢足，走進來會被注意到的那種', careers: ['主管職', '軍警消', '教育', '法律', '創業'] },
  卯: { appearance: '乾淨秀氣，笑起來柔和、給人沒有壓力的感覺', careers: ['設計', '文創出版', '教育', '園藝', '美容美髮'] },
  辰: { appearance: '身形有份量、氣場大，說話有條理', careers: ['工程', '資訊科技', '專案管理', '土木建築', '研發'] },
  巳: { appearance: '五官立體、眼神深，安靜但存在感強', careers: ['醫療', '研究', '精密製造', '法務', '金融分析'] },
  午: { appearance: '陽光外向，笑容外放、走路帶風', careers: ['演藝表演', '餐飲', '業務', '體育健身', '消防'] },
  未: { appearance: '面相溫和，眼神軟、天生讓人放鬆', careers: ['護理照護', '餐飲', '社福', '藝術', '幼教'] },
  申: { appearance: '精瘦靈活，手腳快、講話節奏明快', careers: ['工程師', '機械技術', '交通運輸', '貿易', '資訊'] },
  酉: { appearance: '乾淨整齊，講究穿搭與細節，看起來很清爽', careers: ['醫師', '會計', '精品零售', '金工珠寶', '品管'] },
  戌: { appearance: '陽剛可靠，兄弟型、義氣寫在臉上', careers: ['軍警消', '保全', '法務', '獸醫', '資安'] },
  亥: { appearance: '圓潤親和，好接近、聊兩句就熟', careers: ['醫護', '宗教心靈', '藝術', '公益社工', '海洋水產'] },
};

/** 紫微主星 → 常見職業場域。只取實際排出的星，不補星。 */
const ZIWEI_STAR_CAREER: Record<string, string> = {
  紫微: '管理職、公職、企業主管',
  天機: '企劃、顧問、研發、幕僚',
  太陽: '教育、公關、業務主管',
  武曲: '金融、軍警、技術專業',
  天同: '服務業、餐飲、社福',
  廉貞: '業務、公關、資訊',
  天府: '財務、行政、經營管理',
  太陰: '文書、設計、照護',
  貪狼: '演藝、業務、教育訓練',
  巨門: '律師、教師、媒體、口才專業',
  天相: '幕僚、秘書、協調整合',
  天梁: '醫療、教育、宗教、稽核',
  七殺: '軍警、業務開發、創業',
  破軍: '工程技術、變動性強的行業',
};

/** 節氣月起始的國曆概略日（±1 天，實際交界以節氣時刻為準）。 */
const SOLAR_MONTH_START: Record<number, [month: number, day: number]> = {
  1: [2, 4], 2: [3, 6], 3: [4, 5], 4: [5, 6], 5: [6, 6], 6: [7, 7],
  7: [8, 8], 8: [9, 8], 9: [10, 8], 10: [11, 7], 11: [12, 7], 12: [1, 6],
};

export type RedLuanEncounterKind = 'SOUL_RESONANCE' | 'BENEFACTOR' | 'BOTH';

export type RedLuanEncounter = {
  gregorianYear: number;
  monthIndex: number;
  monthBranch: Branch;
  jieqi: string;
  lunarLabel: string;
  startsOn: string;
  endsOn: string;
  /** 距今幾個節氣月；0＝就是現在這個月。 */
  monthsAway: number;
  kind: RedLuanEncounterKind;
  /** 命中的規則名稱，例如 ['紅鸞', '天喜']。 */
  labels: string[];
  /** 這個月的吸力會怎麼顯現——講給客戶聽的一句話。 */
  magnet: string;
  /** 臨門一腳：吸力再明顯，也要有人先伸手。 */
  action: string;
  /** 前端給客戶看的：把機制講成愛情的話，不是術語。 */
  loveWords: string[];
  /** 後端運算與稽核用的正式心理學術語；前端不直接顯示，收在證據層供查證。 */
  mechanism: string[];
  evidence: RedLuanTimelineEvidence[];
};

/**
 * 「磁鐵」那一段的話術與其心理學骨架。
 *
 * 吸力為什麼會「特別明顯」，有真實機制可講：命中的月份代表這段時間你會更常
 * 出現在特定場域（接近性效應），重複照面本身就會提升好感（單純曝光效應），
 * 而節奏變動帶來的心跳加速容易被讀成心動（錯誤歸因激發）。
 *
 * 為什麼「只差伸手那一下」也有機制：想做與真的做之間有落差（意圖—行動落差），
 * 落差多半由怕被拒絕撐著（拒絕敏感度）。解法不是勇氣，是先把句子準備好
 * （執行意圖）——先開口的人啟動的是自我揭露互惠。
 */
const ENCOUNTER_COPY: Record<RedLuanEncounterKind, { magnet: string; action: string; loveWords: string[]; mechanism: string[] }> = {
  SOUL_RESONANCE: {
    magnet: '這個月的吸力會很明顯——像磁鐵一樣，你自己會知道是誰。不是玄，是你這段時間會一直跟同一個人照到面，看久了心就軟了。',
    action: '差的只是當下你有沒有伸出手、有沒有把那一句話講出口。先想好要說什麼，機會來的時候才不會又吞回去。',
    loveWords: ['你們會一直出現在同一個地方', '看久了，心就會軟', '想了很多次，就差說出口那一次', '先想好要說什麼，當下才不會愣住'],
    mechanism: ['接近性效應（Propinquity Effect）', '單純曝光效應（Mere Exposure Effect）', '意圖—行動落差（Intention–Behavior Gap）', '執行意圖（Implementation Intentions）'],
  },
  BENEFACTOR: {
    magnet: '這個月比較容易碰到願意拉你一把的人。訊號通常不是轟轟烈烈的，是有人多問你一句、多留一下。',
    action: '貴人不會自己猜到你需要什麼——把你要的事講清楚，別人才接得住。開口求助不是欠人情，是給對方一個靠近你的入口。',
    loveWords: ['別人比你以為的更願意幫你', '讓人幫你一次，關係反而更近', '說出需要，才有人接得住'],
    mechanism: ['求助低估效應（Underestimating Compliance）', '富蘭克林效應（Ben Franklin Effect）', '社會支持動員（Social Support Mobilisation）'],
  },
  BOTH: {
    magnet: '這個月兩股力道會一起來——相吸的那一種，和願意拉你一把的那一種。吸力會很明顯，像磁鐵，你會分得出來是誰。',
    action: '兩邊都只差你先動那一下：想靠近的就伸手，需要幫忙的就開口。先把話準備好，當下就不會愣住。',
    loveWords: ['你們會一直出現在同一個地方', '看久了，心就會軟', '你先說一句真心話，對方才敢說第二句', '想歸想，手要伸出去才算'],
    mechanism: ['接近性效應（Propinquity Effect）', '單純曝光效應（Mere Exposure Effect）', '意圖—行動落差（Intention–Behavior Gap）', '自我揭露互惠（Reciprocal Self-Disclosure）'],
  },
};

export type RedLuanNextEncounters = {
  fromDate: string;
  /** 下一次「兩人相吸」的月份：紅鸞、天喜、桃花或日支六合命中。 */
  soulResonance: RedLuanEncounter | null;
  /** 下一次貴人月份：天乙貴人命中。 */
  benefactor: RedLuanEncounter | null;
  /** 掃描範圍內全部命中的月份，依時間排序。 */
  upcoming: RedLuanEncounter[];
  monthsScanned: number;
  limitation: string;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** 從某個國曆年往後列出所有節氣月窗口，依起始日排序。 */
function solarMonthWindows(fromYear: number, years: number) {
  const windows: Array<{ gregorianYear: number; monthIndex: number; branch: Branch; jieqi: string; lunarLabel: string; startsOn: string }> = [];
  for (let year = fromYear; year < fromYear + years; year += 1) {
    for (const month of RED_LUAN_SOLAR_MONTHS) {
      const [gm, gd] = SOLAR_MONTH_START[month.index];
      windows.push({
        gregorianYear: year,
        monthIndex: month.index,
        branch: month.branch,
        jieqi: month.jieqi,
        lunarLabel: month.lunarLabel,
        startsOn: isoDate(year, gm, gd),
      });
    }
  }
  windows.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  return windows;
}

/**
 * 「下一次是什麼時候」：從指定日期往後掃節氣月，找出下一個命中的月份。
 *
 * 會跨年——今年剩下的月份都沒命中，就往明年找。規則與年度／月度層完全相同，
 * 只是改成以「今天之後」為起點；紅鸞、天喜、桃花與日支六合歸為「相吸」，
 * 天乙貴人歸為「貴人」，兩者分開回報，因為客戶問的是不同的事。
 */
export function buildRedLuanNextEncounters(input: {
  yearBranch: string;
  dayBranch: string;
  dayMasterStem?: string;
  fromDate: string;
  monthsAhead?: number;
}): RedLuanNextEncounters {
  if (!isBranch(input.yearBranch) || !isBranch(input.dayBranch)) {
    throw new Error('RED_LUAN_HEARTBEAT_INVALID_BAZI_BRANCH');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fromDate)) throw new Error('RED_LUAN_HEARTBEAT_INVALID_FROM_DATE');
  const monthsAhead = Math.min(Math.max(input.monthsAhead ?? 18, 1), 36);
  const fromYear = Number(input.fromDate.slice(0, 4)) - 1;
  const windows = solarMonthWindows(fromYear, Math.ceil(monthsAhead / 12) + 3);

  // 找出「今天所在」的那個窗口：起始日 <= today 的最後一個。
  let currentIndex = -1;
  for (let i = 0; i < windows.length; i += 1) {
    if (windows[i].startsOn <= input.fromDate) currentIndex = i;
    else break;
  }
  if (currentIndex < 0) currentIndex = 0;

  const slice = windows.slice(currentIndex, currentIndex + monthsAhead);
  const upcoming: RedLuanEncounter[] = [];

  for (let offset = 0; offset < slice.length; offset += 1) {
    const window = slice[offset];
    const monthRows = buildSingleRedLuanMonthlyRhythm({
      yearBranch: input.yearBranch,
      dayBranch: input.dayBranch,
      dayMasterStem: input.dayMasterStem,
      year: window.gregorianYear,
    });
    const row = monthRows.find((item) => item.monthIndex === window.monthIndex);
    if (!row || row.evidence.length === 0) continue;
    // 六沖不是相吸也不是貴人，這裡不當成「會碰到」的訊號。
    const meaningful = row.evidence.filter((item) => item.id !== 'day_branch_clash');
    if (meaningful.length === 0) continue;
    const hasResonance = meaningful.some((item) => item.id !== 'tianyi');
    const hasBenefactor = meaningful.some((item) => item.id === 'tianyi');
    const next = windows[currentIndex + offset + 1];
    const kind: RedLuanEncounterKind = hasResonance && hasBenefactor ? 'BOTH' : hasBenefactor ? 'BENEFACTOR' : 'SOUL_RESONANCE';
    upcoming.push({
      ...ENCOUNTER_COPY[kind],
      gregorianYear: window.gregorianYear,
      monthIndex: window.monthIndex,
      monthBranch: window.branch,
      jieqi: window.jieqi,
      lunarLabel: window.lunarLabel,
      startsOn: window.startsOn,
      endsOn: next ? next.startsOn : window.startsOn,
      monthsAway: offset,
      kind,
      labels: [...new Set(meaningful.map((item) => item.label))],
      evidence: meaningful,
    });
  }

  return {
    fromDate: input.fromDate,
    soulResonance: upcoming.find((item) => item.kind !== 'BENEFACTOR') ?? null,
    benefactor: upcoming.find((item) => item.kind !== 'SOUL_RESONANCE') ?? null,
    upcoming,
    monthsScanned: slice.length,
    limitation: '節氣交界日為概略值（±1 天），實際起訖以八字排盤引擎的節氣時刻為準；命中表示該月地支觸發規則，不保證發生特定事件。',
  };
}

/** 地支 → 生肖／方位／相處特質。特質描述的是「相處起來的樣子」，不是人格診斷。 */
const BRANCH_AFFINITY: Record<Branch, { zodiac: string; direction: string; trait: string }> = {
  子: { zodiac: '鼠', direction: '北方', trait: '反應快、話題多，靠機靈與貼心拉近距離' },
  丑: { zodiac: '牛', direction: '東北方', trait: '穩重耐磨，話不多但答應的事會做到' },
  寅: { zodiac: '虎', direction: '東北方', trait: '有衝勁、敢帶頭，相處時節奏明快' },
  卯: { zodiac: '兔', direction: '東方', trait: '溫和好相處，善於察言觀色、不給壓力' },
  辰: { zodiac: '龍', direction: '東南方', trait: '格局大、有想法，容易讓人跟著他的方向走' },
  巳: { zodiac: '蛇', direction: '東南方', trait: '心思細、觀察久，熟了之後才交出真心' },
  午: { zodiac: '馬', direction: '南方', trait: '熱情外放、行動力強，喜歡就直接靠近' },
  未: { zodiac: '羊', direction: '西南方', trait: '體貼會照顧人，把對方的舒服放前面' },
  申: { zodiac: '猴', direction: '西南方', trait: '靈活風趣，聊得開、氣氛容易熱起來' },
  酉: { zodiac: '雞', direction: '西方', trait: '講究細節與品味，標準清楚也願意說明白' },
  戌: { zodiac: '狗', direction: '西北方', trait: '忠誠可靠，界線分明，一旦認定就守得住' },
  亥: { zodiac: '豬', direction: '西北方', trait: '包容度高、情緒穩，讓人待著很放鬆' },
};

/** 紫微主星 → 相處特質。只取夫妻宮及三方四正實際排出的星，不補星。 */
const ZIWEI_STAR_AFFINITY: Record<string, string> = {
  紫微: '有主見、撐得住場面，習慣被依靠',
  天機: '腦子轉得快，喜歡把事情想通再行動',
  太陽: '大方外向，願意主動付出與照亮別人',
  武曲: '務實重承諾，用行動而不是甜言表達',
  天同: '性情溫和知足，相處沒有壓迫感',
  廉貞: '個性鮮明有稜角，愛憎分明',
  天府: '穩健會持家，重視安全感與累積',
  太陰: '細膩體貼，情緒感受力強',
  貪狼: '多才多藝、魅力強，社交場合很吃得開',
  巨門: '善於言辭、講究說清楚，會把話攤開講',
  天相: '公道熱心，願意居中協調',
  天梁: '成熟有長者風範，遇事扛得住',
  七殺: '果斷獨立，說走就走的行動派',
  破軍: '敢破敢立，不走既定路線',
};

export const RED_LUAN_ATTRACTED_TYPES = [
  'WARM_STEADY', 'BRIGHT_OUTGOING', 'CLEAR_RATIONAL', 'MATURE_CARING', 'FREE_INSPIRED',
] as const;

export type RedLuanAttractedType = (typeof RED_LUAN_ATTRACTED_TYPES)[number];

const ATTRACTED_TYPE_COPY: Record<RedLuanAttractedType, { label: string; note: string }> = {
  WARM_STEADY: { label: '溫柔穩定型', note: '話不用多，但讓人安心' },
  BRIGHT_OUTGOING: { label: '明亮外向型', note: '氣氛帶得起來，主動靠近' },
  CLEAR_RATIONAL: { label: '理性清楚型', note: '講道理、界線分明' },
  MATURE_CARING: { label: '成熟照顧型', note: '扛得住，也照顧得到你' },
  FREE_INSPIRED: { label: '自由靈感型', note: '有自己的世界，不被框住' },
};

export const RED_LUAN_PARTNER_GENDERS = ['male', 'female', 'any'] as const;
export type RedLuanPartnerGender = (typeof RED_LUAN_PARTNER_GENDERS)[number];

/**
 * 對象稱呼。預設由客戶性別取傳統的異性對應，客戶可以自己改成另一個或「都可以」，
 * 所以這只是預設值，不是對任何人的假定。
 */
export function redLuanPartnerLabel(gender: RedLuanPartnerGender) {
  return gender === 'male' ? '男生' : gender === 'female' ? '女生' : '對方';
}

export function defaultPartnerGenderFor(selfGender?: string): RedLuanPartnerGender {
  if (selfGender === 'female') return 'male';
  if (selfGender === 'male') return 'female';
  return 'any';
}

export function validateRedLuanPartnerGender(value: unknown): string | null {
  if (isBlankContextValue(value)) return null;
  return RED_LUAN_PARTNER_GENDERS.includes(value as RedLuanPartnerGender) ? null : '對象性別選項無效。';
}

export type RedLuanAffinityProfile = {
  status: 'READY';
  /** 客戶最想看的一句話：直接講明是哪一型的男生／女生。 */
  typeHeadline: string;
  typeSummary: string;
  partnerGender: RedLuanPartnerGender;
  partnerLabel: string;
  /** 由八字規則推出的有緣方向；每一條都附規則出處。 */
  branches: Array<{ label: string; branch: Branch; zodiac: string; direction: string; trait: string; appearance: string; careers: string[]; ruleId: string; basis: string }>;
  /** 紫微夫妻宮及三方四正實際排出的主星特質。時辰未知時為空陣列。 */
  spouseStars: Array<{ palace: string; star: string; trait: string; career: string }>;
  /** 洋蔥式逐層揭露：由外而內，一層講一件事。 */
  onionLayers: Array<{ step: number; title: string; headline: string; detail: string }>;
  /** 收斂成 1–3 個具體人選，客戶要的是「誰」，不是一串場域清單。 */
  candidates: Array<{ rank: number; career: string; look: string; basis: string }>;
  selfReportedType: RedLuanAttractedType | RedLuanContextUnspecified;
  selfReportedLabel: string;
  limitations: string[];
};

/**
 * 有緣人方向：紅鸞／天喜／桃花／天乙貴人所落的地支，翻成生肖與方位；
 * 紫微夫妻宮主星翻成相處特質。這是「容易對上頻率的類型」的傳統文化描述，
 * 不是對特定人的預測，也不推斷對方的身分。
 */
export function buildRedLuanAffinityProfile(input: {
  yearBranch: string;
  dayBranch: string;
  dayMasterStem?: string;
  ziwei: ZiweiLovePersonSignal;
  attractedType?: RedLuanAttractedType | RedLuanContextUnspecified;
  partnerGender?: RedLuanPartnerGender;
}): RedLuanAffinityProfile {
  if (!isBranch(input.yearBranch) || !isBranch(input.dayBranch)) {
    throw new Error('RED_LUAN_HEARTBEAT_INVALID_BAZI_BRANCH');
  }
  const rows: RedLuanAffinityProfile['branches'] = [
    { label: '紅鸞', branch: redLuanBranchOf(input.yearBranch), ruleId: 'RED_LUAN_BY_YEAR_BRANCH_V1', basis: `年支${input.yearBranch}起紅鸞` },
    { label: '天喜', branch: tianXiBranchOf(input.yearBranch), ruleId: 'TIAN_XI_OPPOSITE_RED_LUAN_V1', basis: `年支${input.yearBranch}起天喜` },
    { label: '桃花', branch: PEACH_BY_TRINE_BRANCH[input.yearBranch], ruleId: 'TW_SHENSHA_BASIC_V1_TAOHUA', basis: `年支${input.yearBranch}三合局沐浴位` },
    { label: '桃花', branch: PEACH_BY_TRINE_BRANCH[input.dayBranch], ruleId: 'TW_SHENSHA_BASIC_V1_TAOHUA', basis: `日支${input.dayBranch}三合局沐浴位` },
    ...(isStem(input.dayMasterStem)
      ? TIANYI_BY_DAY_STEM[input.dayMasterStem].map((branch) => ({
        label: '天乙貴人', branch, ruleId: 'TW_SHENSHA_BASIC_V1_TIANYI', basis: `日干${input.dayMasterStem}之天乙貴人位`,
      }))
      : []),
  ].map((row) => ({ ...row, ...BRANCH_AFFINITY[row.branch], ...BRANCH_PERSON_PROFILE[row.branch] }));

  const seen = new Set<string>();
  const branches = rows.filter((row) => {
    const key = `${row.label}:${row.branch}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const spouseStars = (input.ziwei.palaces ?? []).flatMap((palace) =>
    palace.majorStars
      .map((star) => star.replace(/（.*?）/g, ''))
      .filter((star) => ZIWEI_STAR_AFFINITY[star])
      .map((star) => ({ palace: palace.palace, star, trait: ZIWEI_STAR_AFFINITY[star], career: ZIWEI_STAR_CAREER[star] ?? '' })),
  );

  const selfReportedType = input.attractedType && input.attractedType !== RED_LUAN_CONTEXT_UNSPECIFIED
    ? input.attractedType
    : RED_LUAN_CONTEXT_UNSPECIFIED;

  // 同一個地支可能同時是天喜與桃花，講給客戶聽時只算一次。
  const uniqueBranches = branches.filter((row, index, all) => all.findIndex((item) => item.branch === row.branch) === index);
  const careerPool = [...new Set([
    ...uniqueBranches.flatMap((row) => row.careers),
    ...spouseStars.map((star) => star.career).filter(Boolean),
  ])];

  const onionLayers: Array<{ step: number; title: string; headline: string; detail: string }> = uniqueBranches.length > 0
    ? [
      {
        step: 1,
        title: '第一眼・外型印象',
        headline: uniqueBranches.map((row) => row.appearance.split('，')[0]).join('、'),
        detail: `你的紅鸞、天喜、桃花與貴人落在${uniqueBranches.map((row) => `${row.branch}（屬${row.zodiac}）`).join('、')}。這幾個地支的氣性，對到人身上的第一印象是：${uniqueBranches.map((row) => row.appearance).join('；')}。`,
      },
      {
        step: 2,
        title: '第二層・相處起來',
        headline: uniqueBranches.slice(0, 2).map((row) => row.trait.split('，')[0]).join('、'),
        detail: `真的接觸之後，會發現對方${uniqueBranches.map((row) => row.trait).join('；或是')}。${spouseStars.length > 0 ? `紫微夫妻宮這邊補一筆：${spouseStars.map((star) => star.trait).join('、')}。` : ''}`,
      },
      {
        step: 3,
        title: '第三層・在做什麼的人',
        headline: careerPool.slice(0, 5).join('、'),
        detail: `地支氣性常落在這些場域：${uniqueBranches.map((row) => `${row.branch}→${row.careers.join('／')}`).join('；')}。${spouseStars.length > 0 ? `紫微主星再指一次：${spouseStars.map((star) => `${star.star}→${star.career}`).filter((line) => !line.endsWith('→')).join('；')}。` : '時辰未知，紫微這一路先不補。'}這是行業場域的傳統對應，不是說一定是這些職業。`,
      },
      {
        step: 4,
        title: '第四層・從哪個方向來',
        headline: [...new Set(uniqueBranches.map((row) => row.direction))].join('、'),
        detail: `方位取自這幾個地支的傳統對應：${uniqueBranches.map((row) => `${row.branch}＝${row.direction}`).join('、')}。可以當成活動範圍的參考，不是指定地點。`,
      },
    ]
    : [{
      step: 1,
      title: '第一眼・外型印象',
      headline: '本命四柱未見這組神煞現位',
      detail: '紅鸞、天喜、桃花與貴人都沒有落在你的四柱上，這一路先不強斷。這不代表沒有緣分，只代表這組規則沒有給出方向。',
    }];

  const partnerGender = input.partnerGender ?? 'any';
  const partnerLabel = redLuanPartnerLabel(partnerGender);
  // 客戶最想看的那一句：把最強的那個地支講成一句人話。
  // 排序取紅鸞優先，其次天喜、桃花，最後貴人——紅鸞是這張卡的主星。
  const priority = ['紅鸞', '天喜', '桃花', '天乙貴人'];
  const lead = [...uniqueBranches].sort((a, b) => priority.indexOf(a.label) - priority.indexOf(b.label))[0];
  const typeHeadline = lead
    ? `${lead.appearance.split('，')[0]}的${partnerLabel}`
    : `這一年命盤沒有指出特定類型的${partnerLabel}`;
  const typeSummary = lead
    ? `${lead.appearance}。相處起來${lead.trait}。常出現在${lead.careers.slice(0, 3).join('、')}這些場域。`
    : '紅鸞、天喜、桃花與貴人都沒有落在你的四柱上，這一路先不強斷。';

  // 每個地支只出一個人選，最多三個——客戶記得住的是人，不是清單。
  const candidates = uniqueBranches.slice(0, 3).map((row, index) => ({
    rank: index + 1,
    career: row.careers.slice(0, 2).join('、'),
    look: row.appearance.split('，')[0],
    basis: `${row.label}落在${row.branch}（屬${row.zodiac}・${row.direction}）`,
  }));

  return {
    status: 'READY',
    typeHeadline,
    typeSummary,
    candidates,
    partnerGender,
    partnerLabel,
    branches,
    spouseStars,
    onionLayers,
    selfReportedType,
    selfReportedLabel: selfReportedType === RED_LUAN_CONTEXT_UNSPECIFIED ? '未填寫' : ATTRACTED_TYPE_COPY[selfReportedType].label,
    limitations: [
      '生肖、方位、外型印象與職業場域，都是紅鸞、天喜、桃花、天乙貴人所落地支的傳統五行對應，不是對某個特定對象的指認，也不保證對方一定是這些條件。',
      ...(spouseStars.length > 0 ? [] : ['未取得紫微夫妻宮主星（時辰未知或該宮無主星），本層只列八字方向。']),
      '你自己填的偏好只做對照顯示，不參與任何排盤或規則運算。',
    ],
  };
}

export function redLuanAttractedTypeLabel(value: string) {
  return ATTRACTED_TYPE_COPY[value as RedLuanAttractedType]?.label ?? '未填寫';
}

export const RED_LUAN_ATTRACTED_TYPE_OPTIONS = RED_LUAN_ATTRACTED_TYPES.map((value) => ({
  value, ...ATTRACTED_TYPE_COPY[value],
}));

/**
 * 偏好型別與其他自述欄位一樣是選填：空白合法，只有超出選項清單才算錯。
 * 這個欄位不參與排盤或規則運算，只在有緣方向那一段做對照顯示。
 */
export function validateRedLuanAttractedType(value: unknown): string | null {
  if (isBlankContextValue(value)) return null;
  return RED_LUAN_ATTRACTED_TYPES.includes(value as RedLuanAttractedType) ? null : '喜歡的類型選項無效。';
}

export function normalizeRedLuanAttractedType(value: unknown): RedLuanAttractedType | RedLuanContextUnspecified {
  return !isBlankContextValue(value) && RED_LUAN_ATTRACTED_TYPES.includes(value as RedLuanAttractedType)
    ? value as RedLuanAttractedType
    : RED_LUAN_CONTEXT_UNSPECIFIED;
}

function branchEvidence(label: RedLuanEvidence['label'], targetBranch: Branch, scope: string) {
  const id = label === '紅鸞' ? 'red_luan' : label === '天喜' ? 'tian_xi' : 'peach_blossom';
  return { id, label, targetBranch, evidence: `${scope}見${targetBranch}` } as RedLuanEvidence;
}

export function buildBaziLovePersonSignal(input: {
  yearBranch: string;
  dayBranch: string;
  presentBranches: Array<{ pillar: '年' | '月' | '日' | '時'; branch: string }>;
  hourKnown: boolean;
  annualYear: number;
}): BaziLovePersonSignal {
  if (!isBranch(input.yearBranch) || !isBranch(input.dayBranch)) {
    throw new Error('RED_LUAN_HEARTBEAT_INVALID_BAZI_BRANCH');
  }
  const annualBranch = annualBranchOf(input.annualYear);
  const targets: Array<{ label: RedLuanEvidence['label']; branch: Branch; scope: string }> = [
    { label: '紅鸞', branch: redLuanBranchOf(input.yearBranch), scope: `年支${input.yearBranch}` },
    { label: '天喜', branch: tianXiBranchOf(input.yearBranch), scope: `年支${input.yearBranch}` },
    { label: '桃花', branch: PEACH_BY_TRINE_BRANCH[input.yearBranch], scope: `年支${input.yearBranch}三合局沐浴位` },
    { label: '桃花', branch: PEACH_BY_TRINE_BRANCH[input.dayBranch], scope: `日支${input.dayBranch}三合局沐浴位` },
  ];

  const seen = new Set<string>();
  const normalizedTargets = targets.filter((item) => {
    const key = `${item.label}:${item.branch}:${item.scope}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const availablePillars = input.presentBranches.filter((item) => input.hourKnown || item.pillar !== '時');
  const natalEvidence = normalizedTargets.flatMap((target) =>
    availablePillars
      .filter((item) => item.branch === target.branch)
      .map((item) => ({ ...branchEvidence(target.label, target.branch, target.scope), evidence: `${target.scope}；${item.pillar}支${item.branch}` })),
  );
  const annualTriggers = normalizedTargets
    .filter((target) => target.branch === annualBranch)
    .map((target) => ({ ...branchEvidence(target.label, target.branch, target.scope), evidence: `${input.annualYear}流年支${annualBranch}命中${target.scope}` }));

  return {
    status: 'READY',
    ruleVersion: RED_LUAN_HEARTBEAT_BAZI_VERSION,
    annualYear: input.annualYear,
    annualBranch,
    inputCompleteness: input.hourKnown ? '完整四柱' : '三柱基礎（時辰未知）',
    natalEvidence,
    annualTriggers,
    sources: [
      { title: '《星學大成》〈論紅鸞天喜〉', reference: '紅鸞子年加卯逆數；天喜子年加酉逆數。' },
      { title: '專案既有八字神煞規則', reference: 'TW_SHENSHA_BASIC_V1：年支／日支三合局沐浴位桃花。' },
    ],
    limitations: [
      '此為傳統文化的關係主題訊號，不保證戀愛、婚嫁、真愛或任何事件。',
      ...(input.hourKnown ? [] : ['出生時辰未知：時柱不納入命盤現位核對。']),
      '流年以所選年份的干支年標示；節氣交界的實際起訖仍以八字排盤引擎為準。',
    ],
  };
}

function palaceEvidence(palace: ZiweiPalaceResult) {
  return {
    palace: palace.name,
    earthlyBranch: palace.earthlyBranch,
    majorStars: palace.majorStarDetails.map((star) => `${star.name}${star.brightness ? `（${star.brightness}）` : ''}`),
    minorStars: palace.minorStars.map((star) => star.name),
  };
}

export function buildZiweiLovePersonSignal(input: { birth: ZiweiBirthInput | null }): ZiweiLovePersonSignal {
  if (!input.birth) {
    return {
      status: 'UNAVAILABLE_BIRTH_TIME_REQUIRED',
      ruleVersion: RED_LUAN_HEARTBEAT_ZIWEI_VERSION,
      annualStatus: 'UNAVAILABLE_RULE_SOURCE_REQUIRED',
      inputCompleteness: '時辰未知',
      limitations: [
        '紫微本命夫妻宮需完整出生時辰才可排盤；目前不以預設時辰代替。',
        '紫微流年夫妻宮規則尚未指定流派與版本，因此本功能不推算流年紫微。',
      ],
    };
  }

  const core = createZiweiCore(input.birth);
  const spouse = core.palaces.find((palace) => palace.name === '夫妻宮');
  const surrounded = resolveSanFangSiZhengFor(input.birth, '夫妻宮');
  const palaces = [spouse, surrounded.wealth, surrounded.career, surrounded.opposite]
    .filter((palace): palace is ZiweiPalaceResult => Boolean(palace))
    .filter((palace, index, all) => all.findIndex((item) => item.key === palace.key) === index)
    .map(palaceEvidence);

  return {
    status: 'READY',
    ruleVersion: RED_LUAN_HEARTBEAT_ZIWEI_VERSION,
    annualStatus: 'UNAVAILABLE_RULE_SOURCE_REQUIRED',
    inputCompleteness: '完整出生時辰',
    palaces,
    limitations: [
      '本層只列出本命夫妻宮及其三方四正的可核對星曜，不將星曜直接判為關係結果。',
      '紫微流年夫妻宮需要另行指定流派、安星與四化規則；目前刻意不推算。',
    ],
  };
}

/**
 * Single-person red-luan reading.  This deliberately keeps each tradition's
 * evidence separate: it is not a compatibility score and never invents a
 * second person or an I Ching hexagram.
 */
export function buildSingleRedLuanHeartbeat(input: {
  yearBranch: string;
  dayBranch: string;
  presentBranches: Array<{ pillar: '年' | '月' | '日' | '時'; branch: string }>;
  hourKnown: boolean;
  annualYear: number;
  ziweiBirth: ZiweiBirthInput | null;
  dayMasterStem?: string;
  normalizedBirth?: RedLuanNormalizedBirth;
  validation?: RedLuanValidationState;
  timelineYears?: number;
}): SingleRedLuanHeartbeatResult {
  const bazi = buildBaziLovePersonSignal(input);
  const ziwei = buildZiweiLovePersonSignal({ birth: input.ziweiBirth });
  const ziweiReady = ziwei.status === 'READY';
  const timelineYears = Math.max(1, Math.min(12, Math.trunc(input.timelineYears ?? 6)));
  const normalizedBirth = input.normalizedBirth ?? {
    inputCalendarType: 'SOLAR' as const,
    normalizedSolarDate: '',
    normalizedLunarDate: '',
    timezone: 'Asia/Taipei (UTC+8, STANDARD_TIME)',
    timePrecision: input.hourKnown ? 'TRADITIONAL_HOUR' as const : 'UNKNOWN_TIME' as const,
  };
  const validation = input.validation ?? {
    primaryEngine: 'TraditionalBaziCore',
    primaryEngineVersion: 'UNKNOWN',
    primaryRuleSet: 'TW_TRADITIONAL_BAZI_V1',
    primaryStatus: 'PASSED' as const,
    qualityGateStatus: 'NOT_TESTED' as const,
    independentReference: 'NOT_TESTED_NO_INDEPENDENT_SOURCE' as const,
    goldenCases: 'NOT_AVAILABLE' as const,
    totalCompared: 0,
    matchedCount: 0,
    differences: [],
    verifiedScope: ['紅鸞／天喜年支表', '年支／日支三合局沐浴位桃花'],
    unverifiedScope: ['獨立第二來源逐欄校驗', '人工黃金案例', '月份級關係訊號'],
  };

  return {
    annualYear: input.annualYear,
    normalizedBirth,
    validation,
    bazi,
    annualRhythm: buildSingleRedLuanAnnualRhythm({
      yearBranch: input.yearBranch,
      dayBranch: input.dayBranch,
      dayMasterStem: input.dayMasterStem,
      presentBranches: input.presentBranches,
      hourKnown: input.hourKnown,
      fromYear: input.annualYear,
      toYear: input.annualYear + timelineYears - 1,
    }),
    monthlyRhythm: (() => {
      const months = buildSingleRedLuanMonthlyRhythm({
        yearBranch: input.yearBranch,
        dayBranch: input.dayBranch,
        dayMasterStem: input.dayMasterStem,
        year: input.annualYear,
      });
      const peakMonths = months
        .filter((month) => month.hitCount > 0)
        .sort((a, b) => (b.hitCount - a.hitCount) || (a.monthIndex - b.monthIndex))
        .slice(0, 3)
        .sort((a, b) => a.monthIndex - b.monthIndex);
      return {
        status: 'READY' as const,
        precision: 'SOLAR_TERM_MONTH_BRANCH' as const,
        year: input.annualYear,
        months,
        peakMonths,
        limitation: '月份由年度同一組規則改以節氣月支觸發，規則編號與出處不變；月份以節氣為界，命中不等於必然發生事件。',
      };
    })(),
    ziwei,
    crossCheck: {
      status: ziweiReady ? 'READY' : 'PARTIAL',
      summary: ziweiReady
        ? '八字年度訊號與紫微本命夫妻宮資料皆已各自核對；請分開閱讀各自的證據。'
        : '八字年度訊號已核對；紫微本命資料需補出生時辰，暫不進行跨系統推論。',
      limitation: '交叉摘要只說明資料是否可並列閱讀，不新增分數、不以 AI 補足缺項，也不保證任何關係事件。',
    },
    iching: {
      status: 'UNAVAILABLE_RULE_SOURCE_REQUIRED',
      limitation: '易經補卦尚未選定可追溯的單人起卦或映射規則，因此目前不生成卦象。',
    },
  };
}
