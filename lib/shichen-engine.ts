/**
 * 時辰引擎（人 30% 子層）
 * ────────────────────────────────────────────────────────────
 * 大數據基礎：八字「時柱」+ 紫微斗數（命宮為後續階段）。
 *
 * 設計概念：
 * - 時辰併入「人 30%」，與姓名、性別同層，不另立第四權重。
 * - 知道時辰 → 以真實時辰推時柱、補人格。
 * - 不知道時辰 → 友善告知，依當日生辰自動挑「良辰吉時」，分析照常完成。
 *
 * 本檔只做純邏輯，不涉任何 UI；可用 node 單獨驗證。
 * 紫微命宮需農曆月，列為後續步驟（Phase 4），此處先標記預留。
 */

import type { PersonalityMatrix } from './personality-matrix-engine';

// ─── 天干地支基礎 ────────────────────────────────────────────
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];
export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];
export type WuxingElement = '木' | '火' | '土' | '金' | '水';

function ganzhiName(index: number): string {
  const i = ((index % 60) + 60) % 60;
  return HEAVENLY_STEMS[i % 10] + EARTHLY_BRANCHES[i % 12];
}

// 地支 → 五行
const BRANCH_WUXING: Record<EarthlyBranch, WuxingElement> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

// ─── 12 時辰定義 ─────────────────────────────────────────────
export interface ShichenInfo {
  branch: EarthlyBranch;     // 地支
  branchIndex: number;       // 0=子 … 11=亥
  label: string;             // 顯示名，例如「子時」
  startHour: number;         // 起始時（24 制，子時起 23）
  range: string;             // 時間區間文字
  wuxing: WuxingElement;     // 地支五行
  imagery: string;           // 時段意象
}

// 子時跨午夜（23:00–00:59），其餘每 2 小時一辰。
export const SHICHEN_LIST: ShichenInfo[] = [
  { branch: '子', branchIndex: 0,  label: '子時', startHour: 23, range: '23:00–00:59', wuxing: '水', imagery: '深夜沉靜，思緒內收，藏鋒蓄勢' },
  { branch: '丑', branchIndex: 1,  label: '丑時', startHour: 1,  range: '01:00–02:59', wuxing: '土', imagery: '萬籟俱寂，根基穩固，默默積累' },
  { branch: '寅', branchIndex: 2,  label: '寅時', startHour: 3,  range: '03:00–04:59', wuxing: '木', imagery: '黎明將至，生機初動，敢為人先' },
  { branch: '卯', branchIndex: 3,  label: '卯時', startHour: 5,  range: '05:00–06:59', wuxing: '木', imagery: '日出東方，清新明朗，充滿希望' },
  { branch: '辰', branchIndex: 4,  label: '辰時', startHour: 7,  range: '07:00–08:59', wuxing: '土', imagery: '朝氣蓬勃，承載厚實，穩中前行' },
  { branch: '巳', branchIndex: 5,  label: '巳時', startHour: 9,  range: '09:00–10:59', wuxing: '火', imagery: '上午精進，思路清晰，靈動聰慧' },
  { branch: '午', branchIndex: 6,  label: '午時', startHour: 11, range: '11:00–12:59', wuxing: '火', imagery: '正午陽盛，熱情外放，光芒奪目' },
  { branch: '未', branchIndex: 7,  label: '未時', startHour: 13, range: '13:00–14:59', wuxing: '土', imagery: '午後溫煦，柔情藝感，內心豐潤' },
  { branch: '申', branchIndex: 8,  label: '申時', startHour: 15, range: '15:00–16:59', wuxing: '金', imagery: '日昃機敏，才思活絡，應變靈巧' },
  { branch: '酉', branchIndex: 9,  label: '酉時', startHour: 17, range: '17:00–18:59', wuxing: '金', imagery: '日落西山，精準收斂，審美俐落' },
  { branch: '戌', branchIndex: 10, label: '戌時', startHour: 19, range: '19:00–20:59', wuxing: '土', imagery: '黃昏守護，忠誠重情，可靠安定' },
  { branch: '亥', branchIndex: 11, label: '亥時', startHour: 21, range: '21:00–22:59', wuxing: '水', imagery: '入夜溫柔，想像豐沛，情深意長' },
];

export function getShichenInfo(branchIndex: number): ShichenInfo {
  const i = ((branchIndex % 12) + 12) % 12;
  return SHICHEN_LIST[i];
}

/** 由 24 制時鐘小時換算時辰 branchIndex（子時 23、0 點皆屬子）。 */
export function shichenFromClockHour(hour24: number): number {
  const h = ((hour24 % 24) + 24) % 24;
  // 子時 23–0:59 → 0；其餘 (h+1)/2 取整
  return Math.floor(((h + 1) % 24) / 2) % 12;
}

// ─── 八字日柱（儒略日推算）────────────────────────────────────
/** 公曆 (年, 月, 日) → 正午儒略日 JDN（標準公式）。 */
export function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * 公曆日期 → 日柱干支序（0=甲子 … 59=癸亥）。
 * 校準錨：2000-01-07 為甲子日（JDN 2451551 → 序 0）。
 * 公式：dayIndex = (JDN - 11) mod 60。
 */
export function getDayPillarIndex(birthDate: string): number {
  const [y, m, d] = birthDate.split('-').map((v) => parseInt(v, 10));
  const jdn = julianDayNumber(y, m, d);
  return (((jdn - 11) % 60) + 60) % 60;
}

export interface HourPillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  ganzhi: string;
  stemIndex: number;
  branchIndex: number;
}

/**
 * 時柱：時支由時辰決定，時干由日干以「五鼠遁」推。
 * 時干序 = (日干序 mod 5 × 2 + 時支序) mod 10。
 */
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

// ─── 良辰吉時（不知道時辰時的友善預設）────────────────────────
// 六合（最相合）：子丑、寅亥、卯戌、辰酉、巳申、午未
const LIU_HE: Record<number, number> = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
// 六沖（避開）：對宮 (b+6)%12

/**
 * 依當日日支挑「良辰吉時」：取與日支六合之時辰，必非六沖，最為相合。
 * 給不知道時辰的人一個合理且帶吉意的預設，分析照常完成。
 */
export function pickAuspiciousShichen(dayBranchIndex: number): ShichenInfo {
  const dayBranch = ((dayBranchIndex % 12) + 12) % 12;
  const harmonious = LIU_HE[dayBranch] ?? 3; // 預設卯時（日出，吉）
  return getShichenInfo(harmonious);
}

// ─── 時辰人格加成（人 30% 子層，幅度保守 ≤5）──────────────────
type ShichenAdjust = Partial<PersonalityMatrix>;

const SHICHEN_PERSONALITY_ADJUST: Record<number, ShichenAdjust> = {
  0:  { logic: 4, creativity: 4, risk: 2, social: -2, security: -1 },   // 子 水
  1:  { security: 5, attachment: 3, logic: 2, risk: -3 },               // 丑 土
  2:  { leadership: 4, risk: 4, creativity: 3, social: 2 },             // 寅 木
  3:  { creativity: 4, social: 4, emotion: 3, security: 2 },            // 卯 木
  4:  { leadership: 4, security: 4, logic: 3, social: 2 },              // 辰 土
  5:  { logic: 4, creativity: 4, social: 3, emotion: 2 },               // 巳 火
  6:  { emotion: 5, leadership: 5, social: 5, creativity: 3, logic: -2 },// 午 火
  7:  { attachment: 5, creativity: 4, emotion: 3, security: 3 },        // 未 土
  8:  { creativity: 4, social: 5, logic: 4, risk: 3 },                  // 申 金
  9:  { logic: 5, leadership: 3, security: 3, social: 2 },              // 酉 金
  10: { attachment: 5, security: 4, logic: 3, social: 2 },             // 戌 土
  11: { emotion: 5, attachment: 4, creativity: 3, social: 2 },         // 亥 水
};

export function getShichenPersonalityAdjust(branchIndex: number): ShichenAdjust {
  const i = ((branchIndex % 12) + 12) % 12;
  return SHICHEN_PERSONALITY_ADJUST[i] ?? {};
}

// ─── 主函數 ──────────────────────────────────────────────────
export interface ShichenProfile {
  isKnown: boolean;              // 使用者是否提供真實時辰
  shichen: ShichenInfo;          // 採用的時辰（含吉時預設）
  friendlyNote: string;          // 友善告知文字（不知道時辰時引導）
  dayPillar: string;             // 日柱干支
  dayStem: HeavenlyStem;
  dayBranch: EarthlyBranch;
  hourPillar: HourPillar;        // 時柱
  wuxing: WuxingElement;         // 時辰五行
  personalityAdjust: ShichenAdjust; // 對音樂人格矩陣的加成（人 30% 子層）
  ziweiPalaceNote: string;       // 紫微命宮預留（後續階段補農曆月）
}

export interface ShichenInput {
  birthDate: string;                       // 'YYYY-MM-DD'（國曆/公曆）
  shichenBranchIndex?: number | null;      // 0–11；null/undefined = 不知道時辰
}

export function computeShichenProfile(input: ShichenInput): ShichenProfile {
  const dayPillarIndex = getDayPillarIndex(input.birthDate);
  const dayStemIndex = dayPillarIndex % 10;
  const dayBranchIndex = dayPillarIndex % 12;

  const isKnown =
    typeof input.shichenBranchIndex === 'number' &&
    input.shichenBranchIndex >= 0 &&
    input.shichenBranchIndex <= 11;

  const shichen = isKnown
    ? getShichenInfo(input.shichenBranchIndex as number)
    : pickAuspiciousShichen(dayBranchIndex);

  const friendlyNote = isKnown
    ? `已依你的${shichen.label}（${shichen.range}）推算八字時柱，完成人層的時辰補強。`
    : `你沒有填時辰沒關係 — 系統已依你的生辰，自動為你挑選與當日最相合的「良辰吉時」：${shichen.label}（${shichen.range}），分析照常完成。日後若知道真實時辰，可再回來補上會更精準。`;

  const hourPillar = getHourPillar(dayStemIndex, shichen.branchIndex);

  return {
    isKnown,
    shichen,
    friendlyNote,
    dayPillar: ganzhiName(dayPillarIndex),
    dayStem: HEAVENLY_STEMS[dayStemIndex],
    dayBranch: EARTHLY_BRANCHES[dayBranchIndex],
    hourPillar,
    wuxing: BRANCH_WUXING[shichen.branch],
    personalityAdjust: getShichenPersonalityAdjust(shichen.branchIndex),
    ziweiPalaceNote: '紫微命宮將於後續階段接入農曆月後補全。',
  };
}
