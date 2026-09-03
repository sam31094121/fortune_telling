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
  precision: 'ANNUAL_BRANCH';
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
    status: 'UNAVAILABLE_RULE_SOURCE_REQUIRED';
    precision: 'YEAR_ONLY';
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

function timelineEvidence(input: Omit<RedLuanTimelineEvidence, 'precision'>): RedLuanTimelineEvidence {
  return { ...input, precision: 'ANNUAL_BRANCH' };
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
    monthlyRhythm: {
      status: 'UNAVAILABLE_RULE_SOURCE_REQUIRED',
      precision: 'YEAR_ONLY',
      limitation: '專案目前沒有完成獨立來源與黃金案例驗證的月份規則，因此不輸出高機率月份、月份分數或事件預測。',
    },
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
