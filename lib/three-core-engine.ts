/**
 * 三合一運算核心｜八字命盤 × 紫微斗數 × 易經卜卦
 * ============================================================================
 *
 * 這是後端唯一的三核心入口。任何卡片需要命理運算，都應該走這裡，
 * 而不是自己去拼三支引擎——那正是出事的方式。
 *
 * 【為什麼要有這支檔案】
 *
 * 2026-09-04 巡檢發現：紫微卡自己用 tyme4ts 的 LunarHour.fromYmdHms() 重算了
 * 一份八字，而該 API 吃的是農曆、程式卻餵國曆（1990-05-20 被當成農曆五月二十，
 * 實際國曆 6/12，整整差 23 天）。日柱算成戊申（正確乙酉）、日主變成戊土
 * （正確乙木），整段流年生剋關係相反。
 *
 * 最致命的是：同一份回應裡有兩套八字，各自內部一致，所以各自的測試都過——
 * 因為從來沒有人把它們放在一起比對。客戶只要拿八字卡與紫微卡對照一次就會發現。
 *
 * 問題不是演算法錯，是「同一件事被算了兩次，而沒有人負責比對」。
 * 所以這支檔案的職責不只是算，更是「只准算一次，而且自己驗自己」。
 *
 * 【三層順序（不可顛倒）】
 *
 *   第一層  八字命盤   唯一的四柱來源。年界立春、月界節氣、晚子時不換日。
 *      ↓
 *   第二層  紫微斗數   消費第一層，不得自行推算四柱。
 *      ↓
 *   第三層  易經卜卦   只負責「怎麼說」，不新增規則、不改寫證據。
 *      ↓
 *          前端       只顯示。不編結論、不自己算、不自己寫解讀。
 *
 * 【不知道時辰時】
 *
 * 不代填、不硬排、不硬起卦。年、月、日三柱照給——那三柱與時辰無關，一直成立。
 * 命宮、三方四正、卦象一律標為「需要時辰」，並帶出補齊提示。
 * 這是本專案的誠實底線：寧可少給，不可假給。
 *
 * 【判準素材】
 *
 * 專業命理師客訴後永久鎖定（tests/bazi-core.test.ts）：
 *   1974-07-02 03:30 女 → 甲寅／庚午／甲辰／丙寅
 *   月柱＝庚午：小暑(7/7)前仍屬午月，甲年五虎遁，不是辛未
 *   對照組 1974-07-08 → 辛未（小暑後）
 *
 * 守門測試：npm run test:three-core
 */

import { BRANCHES, createBaziCore, type Branch } from './bazi/engine';
import { calculateZiweiSanFang, type ZiweiSanFangAnalysis } from './ziwei-sanfang-engine';
import { castHexagramFromBirth, type IChingReading } from './iching-engine';
import { patternNameOf } from './iching-psychology';

export const THREE_CORE_ENGINE = {
  name: 'Three Core Engine',
  version: 'V1.0',
  order: '八字命盤 → 紫微斗數 → 易經卜卦',
  authority: '四柱唯一來源為 lib/bazi/engine.ts；其餘兩層不得自行推算四柱。',
  unknownTimePolicy: '不代填時辰、不硬排命宮、不硬起卦；年月日三柱照給。',
} as const;

export interface ThreeCoreInput {
  /** 國曆 YYYY-MM-DD */
  birthDate: string;
  gender: 'male' | 'female';
  /**
   * 時辰地支索引，0＝子 … 11＝亥。
   * null／undefined 代表「不知道時辰」——此時不會代填任何值。
   */
  hourBranchIndex?: number | null;
  /** 真太陽時校正用；沒有就不校正，不臆測。 */
  longitude?: number | null;
}

/** 第一層：八字命盤。時辰未知時 hour 為 null，不以任何預設值填補。 */
export interface ThreeCoreBaziLayer {
  year: string;
  month: string;
  day: string;
  hour: string | null;
  dayMaster: string;
  dayMasterElement: string;
  yearBranch: string;
  monthBranch: string;
  dayBranch: string;
  hourBranch: string | null;
  /** 只計年月日三柱的五行分布，與時辰無關，任何時候都成立。 */
  elementBalanceThreePillar: Record<string, number>;
  /** 四柱齊全時才有，含推估時柱的版本。 */
  elementBalanceFourPillar: Record<string, number> | null;
  solarTerm: string;
  lunarDate: string;
}

export type ThreeCoreZiweiLayer =
  | { status: 'READY'; analysis: ZiweiSanFangAnalysis }
  | { status: 'UNAVAILABLE_BIRTH_TIME_REQUIRED'; reason: string };

export type ThreeCoreIChingLayer =
  | { status: 'READY'; reading: IChingReading; patternName: string }
  | { status: 'UNAVAILABLE_BIRTH_TIME_REQUIRED'; reason: string };

export interface ThreeCoreCrossCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ThreeCoreResult {
  engine: typeof THREE_CORE_ENGINE;
  timePrecision: 'TRADITIONAL_HOUR' | 'UNKNOWN_TIME';
  bazi: ThreeCoreBaziLayer;
  ziwei: ThreeCoreZiweiLayer;
  iching: ThreeCoreIChingLayer;
  /** 引擎自己驗自己。任何一項不過，passed 為 false，呼叫端不得當成正常結果。 */
  crossCheck: {
    passed: boolean;
    checks: ThreeCoreCrossCheckItem[];
    failedReasons: string[];
  };
  /** 補齊提示。時辰已知時為 null。 */
  unlockNote: string | null;
}

function isKnownHour(index: number | null | undefined): index is number {
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index <= 11;
}

/** 只計年月日三柱：時辰未知時，四柱版會含推估時柱，不能拿給客戶看。 */
const STEM_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const BRANCH_ELEMENT: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

function elementBalanceOf(pillars: string[]): Record<string, number> {
  const balance: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const pillar of pillars) {
    for (const symbol of pillar ?? '') {
      const element = STEM_ELEMENT[symbol] ?? BRANCH_ELEMENT[symbol];
      if (element) balance[element] += 1;
    }
  }
  return balance;
}

/**
 * 三合一運算。
 *
 * 依序跑完三層，並在回傳前自己交叉驗證一次。
 * 呼叫端拿到的結果若 crossCheck.passed 為 false，代表三層之間不一致，
 * 不得當成正常結果輸出給客戶——那正是先前兩套八字打架卻沒人發現的情境。
 */
export function computeThreeCore(input: ThreeCoreInput): ThreeCoreResult {
  const hourIndex = isKnownHour(input.hourBranchIndex) ? input.hourBranchIndex : null;
  const hourKnown = hourIndex !== null;
  const hourBranch = hourKnown ? (BRANCHES[hourIndex] as Branch) : null;

  // ── 第一層：八字命盤（唯一四柱來源）────────────────────────────────
  const core = createBaziCore({
    gender: input.gender,
    birthDate: input.birthDate,
    calendarType: 'SOLAR',
    birthTimeKnown: hourKnown,
    traditionalHour: hourBranch ?? undefined,
    timezone: 'Asia/Taipei',
  });

  const hourPillar = core.pillars.hour === 'UNKNOWN' ? null : core.pillars.hour;
  const threePillars = [core.pillars.year.ganZhi, core.pillars.month.ganZhi, core.pillars.day.ganZhi];

  const bazi: ThreeCoreBaziLayer = {
    year: core.pillars.year.ganZhi,
    month: core.pillars.month.ganZhi,
    day: core.pillars.day.ganZhi,
    hour: hourPillar?.ganZhi ?? null,
    dayMaster: core.pillars.day.heavenlyStem,
    dayMasterElement: STEM_ELEMENT[core.pillars.day.heavenlyStem] ?? '未知',
    yearBranch: core.pillars.year.earthlyBranch,
    monthBranch: core.pillars.month.earthlyBranch,
    dayBranch: core.pillars.day.earthlyBranch,
    hourBranch: hourPillar?.earthlyBranch ?? null,
    elementBalanceThreePillar: elementBalanceOf(threePillars),
    elementBalanceFourPillar: hourPillar ? elementBalanceOf([...threePillars, hourPillar.ganZhi]) : null,
    solarTerm: core.calendar.solarTerm,
    lunarDate: core.calendar.lunarDate,
  };

  // ── 第二層：紫微斗數（消費第一層；時辰未知時不硬排）──────────────
  const ziwei: ThreeCoreZiweiLayer = hourKnown
    ? {
      status: 'READY',
      analysis: calculateZiweiSanFang({
        birthDate: input.birthDate,
        birthTime: `${String(hourIndex === 0 ? 0 : hourIndex * 2 - 1).padStart(2, '0')}:30`,
        gender: input.gender,
        shichen: hourIndex,
        isTimeConfirmed: true,
        longitude: input.longitude ?? null,
      }),
    }
    : {
      status: 'UNAVAILABLE_BIRTH_TIME_REQUIRED',
      reason: '命宮、三方四正與主星位置都依賴出生時辰。時辰未確認前不硬排命宮，也不以預設時辰代替。',
    };

  // ── 第三層：易經卜卦（只負責怎麼說；時辰未知時不硬起卦）──────────
  const iching: ThreeCoreIChingLayer = hourKnown
    ? (() => {
      const reading = castHexagramFromBirth(input.birthDate, hourIndex);
      return { status: 'READY' as const, reading, patternName: patternNameOf(reading) };
    })()
    : {
      status: 'UNAVAILABLE_BIRTH_TIME_REQUIRED',
      reason: '梅花易數以生辰起卦，時辰是其中一項輸入。時辰未確認前不起卦，避免給出無法回查的卦象。',
    };

  // ── 引擎自己驗自己 ──────────────────────────────────────────────
  const checks: ThreeCoreCrossCheckItem[] = [];

  checks.push({
    id: 'BAZI_PILLARS_PRESENT',
    label: '第一層四柱齊備',
    passed: Boolean(bazi.year && bazi.month && bazi.day),
    detail: `${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour ?? '（時柱待補）'}`,
  });

  checks.push({
    id: 'HOUR_NOT_FABRICATED',
    label: '時辰未知時不得代填',
    passed: hourKnown ? bazi.hour !== null : bazi.hour === null,
    detail: hourKnown ? `已知時辰，時柱 ${bazi.hour}` : '未知時辰，時柱為 null（未代填）',
  });

  if (ziwei.status === 'READY') {
    const zb = ziwei.analysis.bazi;
    const same = zb.year === bazi.year && zb.month === bazi.month && zb.day === bazi.day;
    checks.push({
      id: 'ZIWEI_BAZI_MATCHES_CORE',
      label: '第二層四柱必須等於第一層',
      passed: same,
      detail: same
        ? `兩層一致：${bazi.year} ${bazi.month} ${bazi.day}`
        : `不一致！第一層 ${bazi.year} ${bazi.month} ${bazi.day}／第二層 ${zb.year} ${zb.month} ${zb.day}`,
    });
  } else {
    checks.push({
      id: 'ZIWEI_NOT_FORCED',
      label: '時辰未知時不得硬排命宮',
      passed: true,
      detail: ziwei.reason,
    });
  }

  if (iching.status === 'READY' && hourIndex !== null) {
    const expectedSeed = `梅花易數|${input.birthDate}|時辰${hourIndex + 1}`;
    checks.push({
      id: 'ICHING_SEED_TRACEABLE',
      label: '第三層起卦依據可回查',
      passed: iching.reading.seedText === expectedSeed,
      detail: iching.reading.seedText,
    });
    checks.push({
      id: 'ICHING_PATTERN_DERIVED',
      label: '格局名由卦象推出',
      passed: iching.patternName.endsWith('格') && iching.patternName.length >= 3,
      detail: `${iching.reading.hexagramName} → ${iching.patternName}`,
    });
  } else if (iching.status === 'UNAVAILABLE_BIRTH_TIME_REQUIRED') {
    checks.push({
      id: 'ICHING_NOT_FORCED',
      label: '時辰未知時不得硬起卦',
      passed: true,
      detail: iching.reason,
    });
  }

  const failedReasons = checks.filter((item) => !item.passed).map((item) => `${item.label}：${item.detail}`);

  return {
    engine: THREE_CORE_ENGINE,
    timePrecision: hourKnown ? 'TRADITIONAL_HOUR' : 'UNKNOWN_TIME',
    bazi,
    ziwei,
    iching,
    crossCheck: { passed: failedReasons.length === 0, checks, failedReasons },
    unlockNote: hourKnown
      ? null
      : '補上出生時辰，就能解鎖命宮、三方四正與你的卦象。上面的年、月、日三柱不會因此改變。',
  };
}

/**
 * 交叉驗證未通過時直接擋下。
 *
 * 用在「要把結果送去表達層／回傳給前端」之前。三層之間對不起來卻照樣輸出，
 * 就是先前那個 bug 能活這麼久的原因——寧可擋掉，不要讓客戶拿到互相矛盾的命盤。
 */
export function assertThreeCoreConsistent(result: ThreeCoreResult): void {
  if (!result.crossCheck.passed) {
    throw new Error(`THREE_CORE_CROSS_CHECK_FAILED: ${result.crossCheck.failedReasons.join('；')}`);
  }
}
