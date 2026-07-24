import type { PersonalityMatrix } from './personality-matrix-engine';

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];
export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];
export type WuxingElement = '木' | '火' | '土' | '金' | '水';

function ganzhiName(index: number): string {
  const i = ((index % 60) + 60) % 60;
  return HEAVENLY_STEMS[i % 10] + EARTHLY_BRANCHES[i % 12];
}

const BRANCH_WUXING: Record<EarthlyBranch, WuxingElement> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
};

export interface ShichenInfo {
  branch: EarthlyBranch;
  branchIndex: number;
  label: string;
  startHour: number;
  range: string;
  wuxing: WuxingElement;
  imagery: string;
}

export const SHICHEN_LIST: ShichenInfo[] = [
  { branch: '子', branchIndex: 0, label: '子時', startHour: 23, range: '23:00-00:59', wuxing: '水', imagery: '夜深蓄勢，適合沉澱直覺與內在聲音' },
  { branch: '丑', branchIndex: 1, label: '丑時', startHour: 1, range: '01:00-02:59', wuxing: '土', imagery: '穩定醞釀，重視安全感與耐力' },
  { branch: '寅', branchIndex: 2, label: '寅時', startHour: 3, range: '03:00-04:59', wuxing: '木', imagery: '破曉啟動，帶有開創與行動力' },
  { branch: '卯', branchIndex: 3, label: '卯時', startHour: 5, range: '05:00-06:59', wuxing: '木', imagery: '晨光舒展，感受力與人際節奏較明顯' },
  { branch: '辰', branchIndex: 4, label: '辰時', startHour: 7, range: '07:00-08:59', wuxing: '土', imagery: '萬物整隊，適合建立格局與責任感' },
  { branch: '巳', branchIndex: 5, label: '巳時', startHour: 9, range: '09:00-10:59', wuxing: '火', imagery: '思緒明亮，表達、判斷與熱度提升' },
  { branch: '午', branchIndex: 6, label: '午時', startHour: 11, range: '11:00-12:59', wuxing: '火', imagery: '能量外放，具有舞台感與感染力' },
  { branch: '未', branchIndex: 7, label: '未時', startHour: 13, range: '13:00-14:59', wuxing: '土', imagery: '午後收束，重視照顧、修復與整合' },
  { branch: '申', branchIndex: 8, label: '申時', startHour: 15, range: '15:00-16:59', wuxing: '金', imagery: '反應俐落，帶有分析與轉換能力' },
  { branch: '酉', branchIndex: 9, label: '酉時', startHour: 17, range: '17:00-18:59', wuxing: '金', imagery: '光影收斂，重視品味、標準與精準' },
  { branch: '戌', branchIndex: 10, label: '戌時', startHour: 19, range: '19:00-20:59', wuxing: '土', imagery: '夜幕守成，忠誠、界線與承諾感突出' },
  { branch: '亥', branchIndex: 11, label: '亥時', startHour: 21, range: '21:00-22:59', wuxing: '水', imagery: '靈感回流，情緒、想像與內心對話加深' },
];

export function getShichenInfo(branchIndex: number): ShichenInfo {
  const i = ((branchIndex % 12) + 12) % 12;
  return SHICHEN_LIST[i];
}

export function shichenFromClockHour(hour24: number): number {
  const h = ((hour24 % 24) + 24) % 24;
  return Math.floor(((h + 1) % 24) / 2) % 12;
}

export function julianDayNumber(year: number, month: number, day: number): number {
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return 2451551;
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function getDayPillarIndex(birthDate: string): number {
  if (!birthDate || typeof birthDate !== 'string') return 0;
  const parts = birthDate.split('-');
  if (parts.length !== 3) return 0;
  const [y, m, d] = parts.map((v) => parseInt(v, 10));
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return 0;
  return (((julianDayNumber(y, m, d) - 11) % 60) + 60) % 60;
}

export interface HourPillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  ganzhi: string;
  stemIndex: number;
  branchIndex: number;
}

export function getHourPillar(dayStemIndex: number, hourBranchIndex: number): HourPillar {
  const branchIdx = ((hourBranchIndex % 12) + 12) % 12;
  const stemIdx = (((dayStemIndex % 5) * 2 + branchIdx) % 10 + 10) % 10;
  return {
    stem: HEAVENLY_STEMS[stemIdx],
    branch: EARTHLY_BRANCHES[branchIdx],
    ganzhi: HEAVENLY_STEMS[stemIdx] + EARTHLY_BRANCHES[branchIdx],
    stemIndex: stemIdx,
    branchIndex: branchIdx,
  };
}

type ShichenAdjust = Partial<PersonalityMatrix>;

const SHICHEN_PERSONALITY_ADJUST: Record<number, ShichenAdjust> = {
  0: { logic: 4, creativity: 4, risk: 2, social: -2, security: -1 },
  1: { security: 5, attachment: 3, logic: 2, risk: -3 },
  2: { leadership: 4, risk: 4, creativity: 3, social: 2 },
  3: { creativity: 4, social: 4, emotion: 3, security: 2 },
  4: { leadership: 4, security: 4, logic: 3, social: 2 },
  5: { logic: 4, creativity: 4, social: 3, emotion: 2 },
  6: { emotion: 5, leadership: 5, social: 5, creativity: 3, logic: -2 },
  7: { attachment: 5, creativity: 4, emotion: 3, security: 3 },
  8: { creativity: 4, social: 5, logic: 4, risk: 3 },
  9: { logic: 5, leadership: 3, security: 3, social: 2 },
  10: { attachment: 5, security: 4, logic: 3, social: 2 },
  11: { emotion: 5, attachment: 4, creativity: 3, social: 2 },
};

export function getShichenPersonalityAdjust(branchIndex: number): ShichenAdjust {
  const i = ((branchIndex % 12) + 12) % 12;
  return SHICHEN_PERSONALITY_ADJUST[i] ?? {};
}

function pickAuspiciousShichen(dayBranchIndex: number) {
  const preferred = [2, 3, 4, 5, 6, 8, 9, 11];
  return getShichenInfo(preferred[Math.abs(dayBranchIndex) % preferred.length]);
}

export interface ShichenProfile {
  isKnown: boolean;
  shichen: ShichenInfo;
  friendlyNote: string;
  dayPillar: string;
  dayStem: HeavenlyStem;
  dayBranch: EarthlyBranch;
  hourPillar: HourPillar;
  wuxing: WuxingElement;
  personalityAdjust: ShichenAdjust;
  ziweiPalaceNote: string;
}

export interface ShichenInput {
  birthDate: string;
  shichenBranchIndex?: number | null;
}

export function computeShichenProfile(input: ShichenInput): ShichenProfile {
  const dayPillarIndex = getDayPillarIndex(input.birthDate);
  const dayStemIndex = dayPillarIndex % 10;
  const dayBranchIndex = dayPillarIndex % 12;
  const isKnown = typeof input.shichenBranchIndex === 'number' && input.shichenBranchIndex >= 0 && input.shichenBranchIndex <= 11;
  const shichen = isKnown ? getShichenInfo(input.shichenBranchIndex as number) : pickAuspiciousShichen(dayBranchIndex);
  const hourPillar = getHourPillar(dayStemIndex, shichen.branchIndex);

  return {
    isKnown,
    shichen,
    friendlyNote: isKnown
      ? `已採用 ${shichen.label}（${shichen.range}），讓時辰節奏自然併入人格與音樂分析。`
      : `未提供精準時辰，系統以穩定良辰 ${shichen.label}（${shichen.range}）輔助推估，結果會偏向保守友善。`,
    dayPillar: ganzhiName(dayPillarIndex),
    dayStem: HEAVENLY_STEMS[dayStemIndex],
    dayBranch: EARTHLY_BRANCHES[dayBranchIndex],
    hourPillar,
    wuxing: BRANCH_WUXING[shichen.branch],
    personalityAdjust: getShichenPersonalityAdjust(shichen.branchIndex),
    ziweiPalaceNote: '時辰用於輔助命盤宮位與人格節奏校準，若不確定則採用保守推估。',
  };
}