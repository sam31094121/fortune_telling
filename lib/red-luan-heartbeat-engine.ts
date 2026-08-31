import { createZiweiCore, resolveSanFangSiZhengFor, type ZiweiBirthInput, type ZiweiPalaceResult } from './ziwei/engine';

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
type Branch = (typeof BRANCHES)[number];

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

export const RED_LUAN_HEARTBEAT_BAZI_VERSION = 'STAR_STUDY_HONGLUAN_TIANXI_V1';
export const RED_LUAN_HEARTBEAT_ZIWEI_VERSION = 'IZTRO_2_5_8_NATAL_RELATION_V1';

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
