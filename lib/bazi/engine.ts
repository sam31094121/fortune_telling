/**
 * ============================================================
 * 【天地人和 易經平台】Traditional Bazi Core V1
 * 傳統八字確定性排盤核心｜先算準 → 再驗證 → 再解盤
 * ============================================================
 *
 * 架構鐵律：
 * A. CALCULATION WORLD（本檔）＝確定性排盤，禁止 易經參與。
 * B. INTERPRETATION WORLD（易經老師層）＝只讀本檔已驗證結果。
 *
 * 曆法來源：lunar-typescript（確定性天文曆法庫）
 * - 年柱：立春實刻為界（yearBoundary = LI_CHUN）
 * - 月柱：十二節實刻為界（monthBoundary = JIE_QI）
 * - 日柱：確定性干支日演算法（lunar-typescript）
 * - 時柱：五鼠遁（日干起時）
 *
 * 缺時辰：PARTIAL_BAZI（只排年月日；時柱 UNKNOWN；
 *          依賴時柱／出生時刻的項目一律 NOT_CALCULATED，禁止補午時冒充）。
 */

import { Solar } from 'lunar-typescript';

// ==================== 常量與規則版本 ====================

export const BAZI_ENGINE = {
  name: 'TraditionalBaziCore',
  version: '1.1.0', // +空亡/命宮/身宮/胎元/胎息/十二長生（皆確定性規則）
  ruleSet: 'TW_TRADITIONAL_BAZI_V1',
  yearBoundary: 'LI_CHUN',
  monthBoundary: 'JIE_QI',
  lateZiRule: 'DAY_UNCHANGED_TIME_NEXT', // 晚子時（23:00 後）：日柱不換日、時柱起子
  timeCorrectionMode: 'STANDARD_TIME', // 第一階段僅支援標準時，明確記錄、不偷偷假設
  hiddenStemWeights: 'PRIMARY_1.0_SECONDARY_0.5_TERTIARY_0.3',
  monthQiMultiplier: 1.5,
} as const;

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export type Stem = (typeof STEMS)[number];
export type Branch = (typeof BRANCHES)[number];
export type Element = '木' | '火' | '土' | '金' | '水';
export type YinYang = '陽' | '陰';

export const STEM_ELEMENT: Record<Stem, Element> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
export const STEM_YINYANG: Record<Stem, YinYang> = {
  甲: '陽', 乙: '陰', 丙: '陽', 丁: '陰', 戊: '陽', 己: '陰', 庚: '陽', 辛: '陰', 壬: '陽', 癸: '陰',
};
export const BRANCH_ELEMENT: Record<Branch, Element> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};
export const BRANCH_YINYANG: Record<Branch, YinYang> = {
  子: '陽', 丑: '陰', 寅: '陽', 卯: '陰', 辰: '陽', 巳: '陰', 午: '陽', 未: '陰', 申: '陽', 酉: '陰', 戌: '陽', 亥: '陰',
};

/** 藏干唯一字典（HiddenStemDictionary｜固定資料表，禁止 易經生成） */
export const HIDDEN_STEM_DICTIONARY: Record<Branch, { primary: Stem; secondary?: Stem; tertiary?: Stem }> = {
  子: { primary: '癸' },
  丑: { primary: '己', secondary: '癸', tertiary: '辛' },
  寅: { primary: '甲', secondary: '丙', tertiary: '戊' },
  卯: { primary: '乙' },
  辰: { primary: '戊', secondary: '乙', tertiary: '癸' },
  巳: { primary: '丙', secondary: '庚', tertiary: '戊' },
  午: { primary: '丁', secondary: '己' },
  未: { primary: '己', secondary: '丁', tertiary: '乙' },
  申: { primary: '庚', secondary: '壬', tertiary: '戊' },
  酉: { primary: '辛' },
  戌: { primary: '戊', secondary: '辛', tertiary: '丁' },
  亥: { primary: '壬', secondary: '甲' },
};

const GENERATES: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

export type TenGod = '比肩' | '劫財' | '食神' | '傷官' | '偏財' | '正財' | '七殺' | '正官' | '偏印' | '正印';

// ==================== 輸入模型 ====================

export type BaziTimePrecision = 'EXACT_TIME' | 'TRADITIONAL_HOUR' | 'UNKNOWN_TIME';
export type BaziChartMode = 'FULL_BAZI' | 'PARTIAL_BAZI';

export interface BaziBirthInput {
  name?: string;
  gender: 'male' | 'female';
  /** YYYY-M-D（calendarType 決定國曆或農曆） */
  birthDate: string;
  birthTimeKnown: boolean;
  /** HH:mm（EXACT_TIME 時使用） */
  birthTime?: string;
  /** 傳統時辰地支（TRADITIONAL_HOUR 時使用，例如「酉」） */
  traditionalHour?: Branch;
  birthCountry?: string;
  birthCity?: string;
  timezone?: string;
  calendarType?: 'SOLAR' | 'LUNAR';
  isLeapMonth?: boolean;
}

// ==================== 輸出模型 ====================

export interface BaziHiddenStemItem { stem: Stem; element: Element; tenGod: TenGod; weight: number; tier: 'primary' | 'secondary' | 'tertiary' }
export interface BaziPillarModel {
  key: 'YEAR' | 'MONTH' | 'DAY' | 'HOUR';
  heavenlyStem: Stem;
  earthlyBranch: Branch;
  ganZhi: string;
  hiddenStems: BaziHiddenStemItem[];
  tenGodStem: TenGod | 'DAY_MASTER';
  element: Element;
  branchElement: Element;
  yinYang: YinYang;
}
export interface BaziInteraction {
  participants: string[];
  interactionType: string;
  sourceRule: string;
  affectedPillars: string[];
}
export interface BaziDaYunStep {
  index: number;
  ganZhi: string;
  startAge: number;
  endAge: number;
  startYear: number;
  stemTenGod: TenGod | null;
}
export interface BaziAnnualLuckItem { year: number; ganZhi: string; stemTenGod: TenGod; branch: Branch }
export interface BaziShenShaItem { id: string; name: string; rule: string; evidence: string; ruleVersion: string }

export interface BaziProfessionalResult {
  engine: { name: string; version: string; ruleSet: string; yearBoundary: string; monthBoundary: string; lateZiRule: string; timeCorrectionMode: string };
  chartMode: BaziChartMode;
  timePrecision: BaziTimePrecision;
  input: BaziBirthInput;
  calendar: {
    normalizedDateTime: string;
    solarDate: string;
    lunarDate: string;
    timezone: string;
    solarTerm: string;
    solarTermTime: string;
    yearBoundaryRule: string;
  };
  pillars: {
    year: BaziPillarModel;
    month: BaziPillarModel;
    day: BaziPillarModel;
    hour: BaziPillarModel | 'UNKNOWN';
  };
  dayMaster: { stem: Stem; element: Element; yinYang: YinYang };
  fiveElements: {
    rawCount: Record<Element, number>;
    weightedStrength: Record<Element, number>;
    weightRule: string;
  };
  seasonalStrength: {
    monthQi: Element;
    lifeStage: '旺' | '相' | '休' | '囚' | '死';
    seasonalSignals: string[];
    supportSignals: string[];
    drainSignals: string[];
    controlSignals: string[];
    tendency: 'STRONG' | 'WEAK' | 'BALANCED';
    score: number;
  };
  interactions: BaziInteraction[];
  /** 空亡（旬空）：年柱旬空 + 日柱旬空 */
  kongWang: { yearXunKong: string; dayXunKong: string };
  /** 命宮／身宮（依月支+時支確定性推得；未知時辰 → NOT_CALCULATED） */
  mingGong: string | 'NOT_CALCULATED';
  shenGong: string | 'NOT_CALCULATED';
  /** 胎元（月柱干進一支進三）／胎息（日柱干支之合） */
  taiYuan: string;
  taiXi: string;
  /** 十二長生（各柱地勢）；未知時辰時 hour = UNKNOWN */
  twelveStages: { year: string; month: string; day: string; hour: string | 'UNKNOWN' };
  daYun: BaziDaYunStep[] | 'NOT_CALCULATED';
  daYunMeta: { direction: 'FORWARD' | 'BACKWARD'; startAgeYears: number; startAgeMonths: number; startAgeDays: number } | 'NOT_CALCULATED';
  annualLuck: BaziAnnualLuckItem[];
  shenSha: BaziShenShaItem[] | 'NOT_CALCULATED_FOR_HOUR_ITEMS';
  verification: {
    calendarVerified: boolean;
    pillarsVerified: boolean;
    tenGodsVerified: boolean;
    luckCyclesVerified: boolean;
    readyForInterpretation: boolean;
    issues: string[];
  };
}

// ==================== TenGodEngine（禁止 易經判十神） ====================

export function calculateTenGod(dayMaster: Stem, target: Stem): TenGod {
  const dmElement = STEM_ELEMENT[dayMaster];
  const tElement = STEM_ELEMENT[target];
  const samePolarity = STEM_YINYANG[dayMaster] === STEM_YINYANG[target];
  if (tElement === dmElement) return samePolarity ? '比肩' : '劫財';
  if (GENERATES[dmElement] === tElement) return samePolarity ? '食神' : '傷官';
  if (CONTROLS[dmElement] === tElement) return samePolarity ? '偏財' : '正財';
  if (CONTROLS[tElement] === dmElement) return samePolarity ? '七殺' : '正官';
  return samePolarity ? '偏印' : '正印'; // tElement 生 dmElement
}

// ==================== 時辰處理 ====================

const BRANCH_HOUR_START: Record<Branch, number> = {
  子: 23, 丑: 1, 寅: 3, 卯: 5, 辰: 7, 巳: 9, 午: 11, 未: 13, 申: 15, 酉: 17, 戌: 19, 亥: 21,
};

function resolveTimePrecision(input: BaziBirthInput): BaziTimePrecision {
  if (!input.birthTimeKnown) return 'UNKNOWN_TIME';
  if (input.birthTime && /^\d{1,2}:\d{2}$/.test(input.birthTime)) return 'EXACT_TIME';
  if (input.traditionalHour && BRANCHES.includes(input.traditionalHour)) return 'TRADITIONAL_HOUR';
  return 'UNKNOWN_TIME';
}

/** TRADITIONAL_HOUR：取時辰「中點」僅供曆法計算定位（時柱地支本身由時辰直接決定，不受此影響） */
function traditionalHourToClock(branch: Branch): { hour: number; minute: number } {
  const start = BRANCH_HOUR_START[branch];
  return { hour: (start + 1) % 24, minute: 0 };
}

// ==================== 主入口：createBaziCore ====================

export function createBaziCore(input: BaziBirthInput): BaziProfessionalResult {
  const issues: string[] = [];
  const timePrecision = resolveTimePrecision(input);
  const chartMode: BaziChartMode = timePrecision === 'UNKNOWN_TIME' ? 'PARTIAL_BAZI' : 'FULL_BAZI';

  // ---- 1. 時間標準化 ----
  const dateMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(input.birthDate.trim());
  if (!dateMatch) throw new Error('BAZI_INPUT_INVALID_DATE: birthDate 必須為 YYYY-M-D');
  const [y, m, d] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])];

  let hour = 12; let minute = 0; // 僅 UNKNOWN_TIME 使用正午定位「日期」層級曆法，時柱不排
  if (timePrecision === 'EXACT_TIME') {
    const [hh, mm] = input.birthTime!.split(':').map(Number);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) throw new Error('BAZI_INPUT_INVALID_TIME');
    hour = hh; minute = mm;
  } else if (timePrecision === 'TRADITIONAL_HOUR') {
    const clock = traditionalHourToClock(input.traditionalHour!);
    hour = clock.hour; minute = clock.minute;
  }

  // ---- 2. 曆法轉換（SOLAR / LUNAR）----
  let solar;
  if ((input.calendarType ?? 'SOLAR') === 'LUNAR') {
    // 農曆輸入 → 轉國曆（lunar-typescript Lunar.fromYmdHms 閏月以負月表示）
    const lunarMonth = input.isLeapMonth ? -m : m;
    const { Lunar } = require('lunar-typescript');
    const lunarObj = Lunar.fromYmdHms(y, lunarMonth, d, hour, minute, 0);
    solar = lunarObj.getSolar();
  } else {
    solar = Solar.fromYmdHms(y, m, d, hour, minute, 0);
  }
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(2); // 晚子時日柱不換日（規則版本已記錄於 BAZI_ENGINE.lateZiRule）

  // ---- 3. 節氣（確定性曆法取得，禁止 易經推測）----
  let solarTerm = ''; let solarTermTime = '';
  try {
    const prevJie = lunar.getPrevJie(true);
    solarTerm = prevJie.getName();
    solarTermTime = prevJie.getSolar().toYmdHms();
  } catch { issues.push('SOLAR_TERM_LOOKUP_FAILED'); }

  // ---- 4. 四柱排定 ----
  const yearGZ = eightChar.getYear();
  const monthGZ = eightChar.getMonth();
  const dayGZ = eightChar.getDay();
  const hourGZ = eightChar.getTime();

  const splitGZ = (gz: string): { stem: Stem; branch: Branch } => {
    const stem = gz[0] as Stem; const branch = gz[1] as Branch;
    if (!STEMS.includes(stem) || !BRANCHES.includes(branch)) throw new Error(`BAZI_PILLAR_INVALID: ${gz}`);
    return { stem, branch };
  };

  const dayParts = splitGZ(dayGZ);
  const dayMasterStem = dayParts.stem;

  const buildPillar = (key: BaziPillarModel['key'], gz: string): BaziPillarModel => {
    const { stem, branch } = splitGZ(gz);
    const dict = HIDDEN_STEM_DICTIONARY[branch];
    const hiddenStems: BaziHiddenStemItem[] = [];
    const pushHidden = (s: Stem | undefined, tier: BaziHiddenStemItem['tier'], weight: number) => {
      if (!s) return;
      hiddenStems.push({ stem: s, element: STEM_ELEMENT[s], tenGod: calculateTenGod(dayMasterStem, s), weight, tier });
    };
    pushHidden(dict.primary, 'primary', 1.0);
    pushHidden(dict.secondary, 'secondary', 0.5);
    pushHidden(dict.tertiary, 'tertiary', 0.3);
    return {
      key,
      heavenlyStem: stem,
      earthlyBranch: branch,
      ganZhi: gz,
      hiddenStems,
      tenGodStem: key === 'DAY' ? 'DAY_MASTER' : calculateTenGod(dayMasterStem, stem),
      element: STEM_ELEMENT[stem],
      branchElement: BRANCH_ELEMENT[branch],
      yinYang: STEM_YINYANG[stem],
    };
  };

  const yearPillar = buildPillar('YEAR', yearGZ);
  const monthPillar = buildPillar('MONTH', monthGZ);
  const dayPillar = buildPillar('DAY', dayGZ);
  const hourPillar: BaziPillarModel | 'UNKNOWN' = chartMode === 'FULL_BAZI' ? buildPillar('HOUR', hourGZ) : 'UNKNOWN';

  const activePillars: BaziPillarModel[] = [yearPillar, monthPillar, dayPillar, ...(hourPillar !== 'UNKNOWN' ? [hourPillar] : [])];

  // ---- 5. 五行統計（RAW_COUNT + WEIGHTED_STRENGTH，字面數量不等同旺衰）----
  const rawCount: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const weighted: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of activePillars) {
    rawCount[p.element] += 1;
    rawCount[p.branchElement] += 1;
    weighted[p.element] += 1.0;
    const monthBoost = p.key === 'MONTH' ? BAZI_ENGINE.monthQiMultiplier : 1.0;
    for (const h of p.hiddenStems) weighted[h.element] += h.weight * monthBoost;
  }
  for (const k of Object.keys(weighted) as Element[]) weighted[k] = Math.round(weighted[k] * 100) / 100;

  // ---- 6. SeasonalStrengthEngine（月令旺相休囚死＋得地得助訊號）----
  const dmElement = STEM_ELEMENT[dayMasterStem];
  const monthQi = STEM_ELEMENT[HIDDEN_STEM_DICTIONARY[monthPillar.earthlyBranch].primary];
  let lifeStage: '旺' | '相' | '休' | '囚' | '死';
  if (monthQi === dmElement) lifeStage = '旺';
  else if (GENERATES[monthQi] === dmElement) lifeStage = '相';
  else if (GENERATES[dmElement] === monthQi) lifeStage = '休';
  else if (CONTROLS[dmElement] === monthQi) lifeStage = '囚';
  else lifeStage = '死';

  const seasonalSignals = [`月令${monthPillar.earthlyBranch}（主氣${monthQi}），日主${dmElement}處「${lifeStage}」`];
  const supportSignals: string[] = [];
  const drainSignals: string[] = [];
  const controlSignals: string[] = [];
  for (const p of activePillars) {
    if (p.key !== 'DAY') {
      if (p.element === dmElement) supportSignals.push(`${p.key} 天干${p.heavenlyStem}比劫幫身`);
      else if (GENERATES[p.element] === dmElement) supportSignals.push(`${p.key} 天干${p.heavenlyStem}印星生身`);
      else if (GENERATES[dmElement] === p.element) drainSignals.push(`${p.key} 天干${p.heavenlyStem}食傷泄身`);
      else if (CONTROLS[dmElement] === p.element) drainSignals.push(`${p.key} 天干${p.heavenlyStem}財星耗身`);
      else controlSignals.push(`${p.key} 天干${p.heavenlyStem}官殺剋身`);
    }
    for (const h of p.hiddenStems) {
      if (h.element === dmElement && h.tier === 'primary') supportSignals.push(`${p.key} 支${p.earthlyBranch}藏${h.stem}為根（得地）`);
    }
  }
  const supportScore = (lifeStage === '旺' ? 30 : lifeStage === '相' ? 20 : lifeStage === '休' ? -8 : lifeStage === '囚' ? -16 : -24)
    + supportSignals.length * 9 - drainSignals.length * 7 - controlSignals.length * 9;
  const tendency: 'STRONG' | 'WEAK' | 'BALANCED' = supportScore >= 14 ? 'STRONG' : supportScore <= -14 ? 'WEAK' : 'BALANCED';

  // ---- 7. StemBranchInteractionEngine ----
  const interactions = computeInteractions(activePillars);

  // ---- 8. DaYunEngine（順逆／性別／年陰陽／起運，由 lunar-typescript Yun 確定性計算）----
  let daYun: BaziDaYunStep[] | 'NOT_CALCULATED' = 'NOT_CALCULATED';
  let daYunMeta: BaziProfessionalResult['daYunMeta'] = 'NOT_CALCULATED';
  if (chartMode === 'FULL_BAZI') {
    const yun = eightChar.getYun(input.gender === 'male' ? 1 : 0, 2);
    const steps: BaziDaYunStep[] = [];
    const arr = yun.getDaYun();
    for (let i = 1; i < Math.min(arr.length, 9); i++) { // index 0 為起運前
      const dy = arr[i];
      const gz = dy.getGanZhi();
      steps.push({
        index: i,
        ganZhi: gz,
        startAge: dy.getStartAge(),
        endAge: dy.getEndAge(),
        startYear: dy.getStartYear(),
        stemTenGod: gz ? calculateTenGod(dayMasterStem, gz[0] as Stem) : null,
      });
    }
    daYun = steps;
    daYunMeta = {
      direction: yun.isForward() ? 'FORWARD' : 'BACKWARD',
      startAgeYears: yun.getStartYear(),
      startAgeMonths: yun.getStartMonth(),
      startAgeDays: yun.getStartDay(),
    };
  }

  // ---- 9. AnnualLuckEngine（流年干支＝確定性；ganzhi 以立春為界標註）----
  const nowYear = new Date().getFullYear();
  const annualLuck: BaziAnnualLuckItem[] = [];
  for (let yy = nowYear; yy < nowYear + 6; yy++) {
    const stem = STEMS[(yy - 4) % 10 < 0 ? ((yy - 4) % 10) + 10 : (yy - 4) % 10];
    const branch = BRANCHES[(yy - 4) % 12 < 0 ? ((yy - 4) % 12) + 12 : (yy - 4) % 12];
    annualLuck.push({ year: yy, ganZhi: `${stem}${branch}`, stemTenGod: calculateTenGod(dayMasterStem, stem), branch });
  }

  // ---- 10. ShenShaEngine（輔助訊號，不凌駕核心）----
  const shenSha = computeShenSha(dayMasterStem, yearPillar.earthlyBranch, dayPillar.earthlyBranch, activePillars);

  // ---- 10.5 空亡／命宮／胎元／胎息／十二長生（lunar-typescript 確定性 API） ----
  const toTraditional = (v: string): string => {
    const MAP: Record<string, string> = { 长生: '長生', 冠带: '冠帶', 临官: '臨官', 绝: '絕', 养: '養' };
    return MAP[v] ?? v;
  };
  const kongWang = { yearXunKong: eightChar.getYearXunKong(), dayXunKong: eightChar.getDayXunKong() };
  const mingGong: string | 'NOT_CALCULATED' = chartMode === 'FULL_BAZI' ? eightChar.getMingGong() : 'NOT_CALCULATED';
  const shenGong: string | 'NOT_CALCULATED' = chartMode === 'FULL_BAZI' ? eightChar.getShenGong() : 'NOT_CALCULATED';
  const taiYuan = eightChar.getTaiYuan();
  const taiXi = eightChar.getTaiXi();
  const twelveStages = {
    year: toTraditional(eightChar.getYearDiShi()),
    month: toTraditional(eightChar.getMonthDiShi()),
    day: toTraditional(eightChar.getDayDiShi()),
    hour: chartMode === 'FULL_BAZI' ? toTraditional(eightChar.getTimeDiShi()) : 'UNKNOWN' as const,
  };

  // ---- 11. 驗證 Gate ----
  const calendarVerified = Boolean(solar.toYmdHms()) && Boolean(lunar.toString()) && solarTerm !== '';
  const pillarsVerified = activePillars.every((p) => STEMS.includes(p.heavenlyStem) && BRANCHES.includes(p.earthlyBranch))
    && (chartMode === 'PARTIAL_BAZI' || hourPillar !== 'UNKNOWN');
  const tenGodsVerified = activePillars.every((p) => p.key === 'DAY' ? p.tenGodStem === 'DAY_MASTER' : p.tenGodStem !== 'DAY_MASTER')
    && activePillars.every((p) => p.hiddenStems.length > 0);
  const luckCyclesVerified = chartMode === 'PARTIAL_BAZI'
    ? true // PARTIAL：大運明確標記 NOT_CALCULATED，不假裝完整
    : daYun !== 'NOT_CALCULATED' && (daYun as BaziDaYunStep[]).length >= 6;
  if (!calendarVerified) issues.push('CALENDAR_NOT_VERIFIED');
  if (!pillarsVerified) issues.push('PILLARS_NOT_VERIFIED');
  if (!tenGodsVerified) issues.push('TEN_GODS_NOT_VERIFIED');
  if (!luckCyclesVerified) issues.push('LUCK_CYCLES_NOT_VERIFIED');
  const readyForInterpretation = calendarVerified && pillarsVerified && tenGodsVerified && luckCyclesVerified;

  return {
    engine: {
      name: BAZI_ENGINE.name, version: BAZI_ENGINE.version, ruleSet: BAZI_ENGINE.ruleSet,
      yearBoundary: BAZI_ENGINE.yearBoundary, monthBoundary: BAZI_ENGINE.monthBoundary,
      lateZiRule: BAZI_ENGINE.lateZiRule, timeCorrectionMode: BAZI_ENGINE.timeCorrectionMode,
    },
    chartMode,
    timePrecision,
    input,
    calendar: {
      normalizedDateTime: solar.toYmdHms(),
      solarDate: solar.toYmd(),
      lunarDate: lunar.toString(),
      timezone: input.timezone ?? 'Asia/Taipei (UTC+8, STANDARD_TIME)',
      solarTerm,
      solarTermTime,
      yearBoundaryRule: 'LI_CHUN',
    },
    pillars: { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar },
    dayMaster: { stem: dayMasterStem, element: dmElement, yinYang: STEM_YINYANG[dayMasterStem] },
    fiveElements: { rawCount, weightedStrength: weighted, weightRule: BAZI_ENGINE.hiddenStemWeights + `_MONTHx${BAZI_ENGINE.monthQiMultiplier}` },
    seasonalStrength: { monthQi, lifeStage, seasonalSignals, supportSignals, drainSignals, controlSignals, tendency, score: supportScore },
    interactions,
    kongWang,
    mingGong,
    shenGong,
    taiYuan,
    taiXi,
    twelveStages,
    daYun,
    daYunMeta,
    annualLuck,
    shenSha: chartMode === 'FULL_BAZI' ? shenSha : shenSha, // PARTIAL 已排除時柱參與項
    verification: { calendarVerified, pillarsVerified, tenGodsVerified, luckCyclesVerified, readyForInterpretation, issues },
  };
}

/** 驗證未通過即擋下 易經解盤（Gate） */
export function assertReadyForInterpretation(core: BaziProfessionalResult): void {
  if (!core.verification.readyForInterpretation) {
    throw new Error('BAZI_CORE_VALIDATION_FAILED: ' + core.verification.issues.join(','));
  }
}

// ==================== StemBranchInteractionEngine ====================

const STEM_COMBINE: Array<[Stem, Stem, string]> = [
  ['甲', '己', '甲己合土'], ['乙', '庚', '乙庚合金'], ['丙', '辛', '丙辛合水'], ['丁', '壬', '丁壬合木'], ['戊', '癸', '戊癸合火'],
];
const STEM_CLASH: Array<[Stem, Stem]> = [['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸']];
const BRANCH_SIX_COMBINE: Array<[Branch, Branch, string]> = [
  ['子', '丑', '子丑合土'], ['寅', '亥', '寅亥合木'], ['卯', '戌', '卯戌合火'], ['辰', '酉', '辰酉合金'], ['巳', '申', '巳申合水'], ['午', '未', '午未合土'],
];
const BRANCH_TRINE: Array<[Branch, Branch, Branch, string]> = [
  ['申', '子', '辰', '申子辰三合水局'], ['亥', '卯', '未', '亥卯未三合木局'], ['寅', '午', '戌', '寅午戌三合火局'], ['巳', '酉', '丑', '巳酉丑三合金局'],
];
const BRANCH_DIRECTIONAL: Array<[Branch, Branch, Branch, string]> = [
  ['寅', '卯', '辰', '寅卯辰三會木方'], ['巳', '午', '未', '巳午未三會火方'], ['申', '酉', '戌', '申酉戌三會金方'], ['亥', '子', '丑', '亥子丑三會水方'],
];
const BRANCH_CLASH: Array<[Branch, Branch]> = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
const BRANCH_HARM: Array<[Branch, Branch]> = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];
const BRANCH_BREAK: Array<[Branch, Branch]> = [['子', '酉'], ['卯', '午'], ['辰', '丑'], ['未', '戌'], ['寅', '亥'], ['巳', '申']];
const BRANCH_PUNISH_TRIO: Array<[Branch, Branch, Branch, string]> = [
  ['寅', '巳', '申', '寅巳申三刑（無恩之刑）'], ['丑', '戌', '未', '丑戌未三刑（恃勢之刑）'],
];
const BRANCH_PUNISH_PAIR: Array<[Branch, Branch, string]> = [['子', '卯', '子卯相刑（無禮之刑）']];
const BRANCH_SELF_PUNISH: Branch[] = ['辰', '午', '酉', '亥'];

export function computeInteractions(pillars: BaziPillarModel[]): BaziInteraction[] {
  const out: BaziInteraction[] = [];
  const stems = pillars.map((p) => ({ v: p.heavenlyStem, key: p.key }));
  const branches = pillars.map((p) => ({ v: p.earthlyBranch, key: p.key }));

  const pairScan = <T extends string>(list: Array<{ v: T; key: string }>, table: Array<[T, T, string?]>, type: string, ruleName: string) => {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      for (const row of table) {
        if ((list[i].v === row[0] && list[j].v === row[1]) || (list[i].v === row[1] && list[j].v === row[0])) {
          out.push({
            participants: [list[i].v, list[j].v],
            interactionType: row[2] ?? `${list[i].v}${list[j].v}${type}`,
            sourceRule: ruleName,
            affectedPillars: [list[i].key, list[j].key],
          });
        }
      }
    }
  };
  pairScan(stems, STEM_COMBINE, '合', 'STEM_FIVE_COMBINE');
  pairScan(stems, STEM_CLASH.map(([a, b]) => [a, b, `${a}${b}相沖`] as [Stem, Stem, string]), '沖', 'STEM_CLASH');
  pairScan(branches, BRANCH_SIX_COMBINE, '合', 'BRANCH_SIX_COMBINE');
  pairScan(branches, BRANCH_CLASH.map(([a, b]) => [a, b, `${a}${b}相沖`] as [Branch, Branch, string]), '沖', 'BRANCH_SIX_CLASH');
  pairScan(branches, BRANCH_HARM.map(([a, b]) => [a, b, `${a}${b}相害`] as [Branch, Branch, string]), '害', 'BRANCH_HARM');
  pairScan(branches, BRANCH_BREAK.map(([a, b]) => [a, b, `${a}${b}相破`] as [Branch, Branch, string]), '破', 'BRANCH_BREAK');
  pairScan(branches, BRANCH_PUNISH_PAIR, '刑', 'BRANCH_PUNISH_PAIR');

  const branchSet = branches.map((b) => b.v);
  const trioScan = (table: Array<[Branch, Branch, Branch, string]>, ruleName: string) => {
    for (const [a, b, c, label] of table) {
      if (branchSet.includes(a) && branchSet.includes(b) && branchSet.includes(c)) {
        out.push({
          participants: [a, b, c],
          interactionType: label,
          sourceRule: ruleName,
          affectedPillars: branches.filter((x) => [a, b, c].includes(x.v)).map((x) => x.key),
        });
      }
    }
  };
  trioScan(BRANCH_TRINE, 'BRANCH_TRINE_COMBINE');
  trioScan(BRANCH_DIRECTIONAL, 'BRANCH_DIRECTIONAL_COMBINE');
  trioScan(BRANCH_PUNISH_TRIO, 'BRANCH_PUNISH_TRIO');
  for (const sb of BRANCH_SELF_PUNISH) {
    const hits = branches.filter((x) => x.v === sb);
    if (hits.length >= 2) {
      out.push({ participants: [sb, sb], interactionType: `${sb}${sb}自刑`, sourceRule: 'BRANCH_SELF_PUNISH', affectedPillars: hits.map((h) => h.key) });
    }
  }
  return out;
}

// ==================== ShenShaEngine（輔助訊號） ====================

const TIANYI_TABLE: Record<Stem, Branch[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};
const WENCHANG_TABLE: Record<Stem, Branch> = { 甲: '巳', 乙: '午', 丙: '申', 戊: '申', 丁: '酉', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const TRINE_GROUP: Record<Branch, { taoHua: Branch; yiMa: Branch; huaGai: Branch }> = {
  申: { taoHua: '酉', yiMa: '寅', huaGai: '辰' }, 子: { taoHua: '酉', yiMa: '寅', huaGai: '辰' }, 辰: { taoHua: '酉', yiMa: '寅', huaGai: '辰' },
  寅: { taoHua: '卯', yiMa: '申', huaGai: '戌' }, 午: { taoHua: '卯', yiMa: '申', huaGai: '戌' }, 戌: { taoHua: '卯', yiMa: '申', huaGai: '戌' },
  巳: { taoHua: '午', yiMa: '亥', huaGai: '丑' }, 酉: { taoHua: '午', yiMa: '亥', huaGai: '丑' }, 丑: { taoHua: '午', yiMa: '亥', huaGai: '丑' },
  亥: { taoHua: '子', yiMa: '巳', huaGai: '未' }, 卯: { taoHua: '子', yiMa: '巳', huaGai: '未' }, 未: { taoHua: '子', yiMa: '巳', huaGai: '未' },
};
const SHENSHA_RULE_VERSION = 'TW_SHENSHA_BASIC_V1';

export function computeShenSha(dayMaster: Stem, yearBranch: Branch, dayBranch: Branch, pillars: BaziPillarModel[]): BaziShenShaItem[] {
  const out: BaziShenShaItem[] = [];
  const branchesInChart = pillars.map((p) => ({ b: p.earthlyBranch, key: p.key }));
  const push = (id: string, name: string, rule: string, evidence: string) => out.push({ id, name, rule, evidence, ruleVersion: SHENSHA_RULE_VERSION });

  for (const { b, key } of branchesInChart) {
    if (TIANYI_TABLE[dayMaster].includes(b)) push('tianyi', '天乙貴人', `日干${dayMaster}見${TIANYI_TABLE[dayMaster].join('/')}`, `${key} 支${b}`);
    if (WENCHANG_TABLE[dayMaster] === b) push('wenchang', '文昌貴人', `日干${dayMaster}見${WENCHANG_TABLE[dayMaster]}`, `${key} 支${b}`);
    for (const anchor of [{ br: yearBranch, tag: '年支' }, { br: dayBranch, tag: '日支' }]) {
      const g = TRINE_GROUP[anchor.br];
      if (g.taoHua === b && key !== 'YEAR') push('taohua', '桃花', `${anchor.tag}${anchor.br}三合局沐浴位${g.taoHua}`, `${key} 支${b}`);
      if (g.yiMa === b && key !== 'YEAR') push('yima', '驛馬', `${anchor.tag}${anchor.br}三合局驛馬位${g.yiMa}`, `${key} 支${b}`);
      if (g.huaGai === b) push('huagai', '華蓋', `${anchor.tag}${anchor.br}三合局華蓋位${g.huaGai}`, `${key} 支${b}`);
    }
  }
  // 去重（同 id + evidence）
  const seen = new Set<string>();
  return out.filter((s) => { const k = s.id + s.evidence + s.rule; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ==================== Debug 摘要 ====================

export function debugBaziCore(core: BaziProfessionalResult): Record<string, unknown> {
  return {
    engine: core.engine,
    chartMode: core.chartMode,
    timePrecision: core.timePrecision,
    四柱: {
      年柱: core.pillars.year.ganZhi,
      月柱: core.pillars.month.ganZhi,
      日柱: core.pillars.day.ganZhi,
      時柱: core.pillars.hour === 'UNKNOWN' ? 'UNKNOWN（未知時辰，不冒充）' : core.pillars.hour.ganZhi,
    },
    日主: `${core.dayMaster.stem}${core.dayMaster.element}（${core.dayMaster.yinYang}）`,
    節氣: `${core.calendar.solarTerm} @ ${core.calendar.solarTermTime}`,
    空亡: `年柱旬空 ${core.kongWang.yearXunKong}｜日柱旬空 ${core.kongWang.dayXunKong}`,
    命宮: core.mingGong,
    身宮: core.shenGong,
    胎元: core.taiYuan,
    胎息: core.taiXi,
    十二長生: core.twelveStages,
    驗證: core.verification,
  };
}
