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

export type RedLuanSelfReportedContext = {
  relationshipStatus: (typeof RED_LUAN_RELATIONSHIP_STATUSES)[number];
  familyResponsibility: (typeof RED_LUAN_FAMILY_RESPONSIBILITIES)[number];
  currentExpectation: (typeof RED_LUAN_CURRENT_EXPECTATIONS)[number];
};

/**
 * Validates customer-provided context only. These fields are deliberately not
 * accepted by buildSingleRedLuanHeartbeat, so they cannot alter chart rules,
 * evidence, quality gates, or timeline precision.
 */
export function validateRedLuanSelfReportedContext(value: unknown): string | null {
  if (!value || typeof value !== 'object') return '請完成此刻的關係位置。';
  const context = value as Partial<RedLuanSelfReportedContext>;
  if (!RED_LUAN_RELATIONSHIP_STATUSES.includes(context.relationshipStatus as RedLuanSelfReportedContext['relationshipStatus'])) {
    return '請選擇目前的關係現況。';
  }
  if (!RED_LUAN_FAMILY_RESPONSIBILITIES.includes(context.familyResponsibility as RedLuanSelfReportedContext['familyResponsibility'])) {
    return '請選擇目前主要家庭責任。';
  }
  if (!RED_LUAN_CURRENT_EXPECTATIONS.includes(context.currentExpectation as RedLuanSelfReportedContext['currentExpectation'])) {
    return '請選擇目前期待的方向。';
  }
  return null;
}

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
