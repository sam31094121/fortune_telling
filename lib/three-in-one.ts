/**
 * 三合一整合控制層｜八字 × 紫微斗數 × 易經
 * ============================================================================
 *
 * 這一層**不算命**。
 *
 * 八字、紫微、易經三套系統全部沿用既有的，一行運算規則都沒有改寫。
 * 這裡只做一件事：把三套鎖成一條流程，互相核對，缺一不可，異常立即阻斷。
 *
 * 【為什麼需要它】
 *
 * 三套系統各自都會過自己的測試——因為從來沒有人把它們放在一起比對。
 * 2026-09-04 就是這樣出事的：紫微自己重算了一份八字，日柱差 23 天，
 * 兩份八字各自內部一致，所以兩邊的測試都是綠的。
 *
 * 錯的資料一旦通過，就會一路往下傳：
 *   資料錯 → 紫微錯 → 老師解盤錯 → 三合一整合錯 → 客戶看到錯的結果
 * 而且是同時大量客戶一起中。這一層就是用來把骨牌在第一張就按住。
 *
 * 【流程（順序不可顛倒、不可跳關）】
 *
 *   唯一出生資料
 *        ↓
 *   呼叫既有八字        ← 四柱唯一來源
 *        ↓
 *   呼叫既有紫微
 *        ↓
 *   八字 × 紫微 四柱交叉核對   ← 年月日時逐字比對，不容錯
 *        ↓  對不上就停在這裡，不往下走
 *   呼叫既有易經
 *        ↓
 *   三套狀態確認
 *        ↓
 *   三合一成立，才允許輸出正式結果
 *
 * 【這一層的紀律】
 *
 *   不重寫任何一套核心
 *   不自己排四柱、不自己判命盤
 *   四柱不一致時，不自動把其中一套改成另一套——那會把「抓錯」變成「藏錯」
 *   不吞例外；抓到就往上報，並且報到工程端看得懂是哪一柱、兩邊各是什麼
 *
 * 【一個必須講清楚的限制】
 *
 * 依 CLAUDE.md 的鐵律，紫微那一層現在也是呼叫 lib/bazi/engine.ts 取四柱，
 * 所以兩邊同源。這道核對因此**抓不到「兩套演算法算出不同答案」**——
 * 系統裡已經只剩一套演算法，這是刻意的。
 *
 * 它抓得到的是**資料傳遞**出錯：兩邊拿到不同的生日、不同的時辰、
 * 中途被改寫、快取串味、或哪天有人又偷偷接了第二套排盤回來。
 * 歷史上真正出事的那次正是這一類（餵錯曆法），所以這道閘留著有意義，
 * 但不要把它當成「演算法互相驗證」。
 *
 * 守門測試：npm run test:three-in-one
 */

import { shichenFromClockHour } from './shichen-engine';
import {
  isZiweiCertified,
  runBaziLayer,
  runIChingLayer,
  runZiweiLayer,
  type ThreeCoreBaziLayer,
  type ThreeCoreIChingLayer,
  type ThreeCoreInput,
  type ThreeCoreZiweiLayer,
} from './three-core-engine';

/* ────────────────────────────────────────────────────────────────────────────
   一、唯一出生資料

   三套系統共用同一份。禁止八字拿一份、紫微再拿另一份、易經再建第三份。
   ──────────────────────────────────────────────────────────────────────────── */

export interface UnifiedInput {
  /** 國曆 YYYY-MM-DD */
  birthDate: string;
  /** HH:mm。時辰未知時傳 null——不代填，也不用預設值。 */
  birthTime: string | null;
  gender: 'male' | 'female';
  /** 真太陽時校正用；沒有就不校正，不臆測。 */
  longitude?: number | null;
}

/* ────────────────────────────────────────────────────────────────────────────
   二、狀態機

   只允許這幾個狀態，而且只允許這幾條路徑。
   ABNORMAL 與 FAILED 都是終點，不得再往 PASSED 走。
   ──────────────────────────────────────────────────────────────────────────── */

export type ThreeInOneStatus =
  | 'WAITING_INPUT'
  | 'BAZI_RUNNING'
  | 'ZIWEI_RUNNING'
  | 'VERIFYING_FOUR_PILLARS'
  | 'YIJING_RUNNING'
  | 'PASSED'
  | 'ABNORMAL'
  | 'FAILED';

/** 合法轉移表。寫死在這裡，任何跳關都會在執行期就爆掉，而不是靜靜地過去。 */
const ALLOWED_TRANSITIONS: Record<ThreeInOneStatus, ThreeInOneStatus[]> = {
  WAITING_INPUT: ['BAZI_RUNNING', 'FAILED'],
  BAZI_RUNNING: ['ZIWEI_RUNNING', 'FAILED'],
  ZIWEI_RUNNING: ['VERIFYING_FOUR_PILLARS', 'FAILED'],
  VERIFYING_FOUR_PILLARS: ['YIJING_RUNNING', 'ABNORMAL'],
  YIJING_RUNNING: ['PASSED', 'FAILED'],
  PASSED: [],
  ABNORMAL: [],
  FAILED: [],
};

/**
 * 狀態機。
 *
 * 之所以要真的做成一台機器、而不是幾個 if：
 * 「ABNORMAL 之後不准再往下走」如果只靠流程順序自然成立，
 * 哪天有人插一行、或改了順序，它就會靜靜地失效——沒有人會發現。
 * 寫成轉移表，違規當場丟例外。
 */
export class ThreeInOneStateMachine {
  private current: ThreeInOneStatus = 'WAITING_INPUT';
  private readonly history: ThreeInOneStatus[] = ['WAITING_INPUT'];

  get status(): ThreeInOneStatus {
    return this.current;
  }

  /** 走過的每一關，依序記下來。異常報告要附這條軌跡，工程端才知道停在哪。 */
  get trace(): ThreeInOneStatus[] {
    return [...this.history];
  }

  to(next: ThreeInOneStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.current];
    if (!allowed.includes(next)) {
      throw new Error(
        `THREE_IN_ONE_ILLEGAL_TRANSITION: ${this.current} → ${next} 不是合法轉移。` +
        `合法的只有：${allowed.length > 0 ? allowed.join('、') : '（終點，不得再轉移）'}`,
      );
    }
    this.current = next;
    this.history.push(next);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   三、四柱交叉核對

   年、月、日、時逐字完全一致。不是相近、不是三柱、不容錯。
   ──────────────────────────────────────────────────────────────────────────── */

export interface FourPillars {
  year: string;
  month: string;
  day: string;
  hour: string;
}

export interface FourPillarDifference {
  pillar: keyof FourPillars;
  bazi: string;
  ziwei: string;
}

export interface FourPillarVerification {
  passed: boolean;
  differences: FourPillarDifference[];
}

const PILLAR_FIELDS: Array<keyof FourPillars> = ['year', 'month', 'day', 'hour'];

/** 四柱名稱的中文，異常報告要給人看的。 */
export const PILLAR_LABELS: Record<keyof FourPillars, string> = {
  year: '年柱',
  month: '月柱',
  day: '日柱',
  hour: '時柱',
};

export function verifyFourPillars(bazi: FourPillars, ziwei: FourPillars): FourPillarVerification {
  const differences = PILLAR_FIELDS
    .filter((field) => bazi[field] !== ziwei[field])
    .map((field) => ({ pillar: field, bazi: bazi[field], ziwei: ziwei[field] }));

  return { passed: differences.length === 0, differences };
}

/* ────────────────────────────────────────────────────────────────────────────
   四、回傳型別
   ──────────────────────────────────────────────────────────────────────────── */

/** 前端可以顯示哪幾塊。核對沒過時，紫微與易經一律不給看。 */
export interface ThreeInOneDisplay {
  bazi: boolean;
  ziwei: boolean;
  yijing: boolean;
  combined: boolean;
}

export interface ThreeInOneChecklistItem {
  id: 'BAZI' | 'ZIWEI' | 'FOUR_PILLARS' | 'YIJING' | 'COMBINED';
  label: string;
  /** PASSED 打勾、ABNORMAL 打叉、PENDING 是還沒走到（不是失敗）。 */
  state: 'PASSED' | 'ABNORMAL' | 'PENDING';
  detail: string;
}

export interface ThreeInOneAbnormalReport {
  title: string;
  reason: string;
  differences: FourPillarDifference[];
  /** 給客戶看的整段文字。前端只顯示，不自己組。 */
  customerMessage: string;
}

export interface ThreeInOneFailureReport {
  title: string;
  reason: string;
  /** 缺什麼才能繼續。時辰未知就是這一類，不是系統壞掉。 */
  nextStep: string | null;
}

export interface ThreeInOneSuccess {
  success: true;
  completed: true;
  status: 'PASSED';
  trace: ThreeInOneStatus[];
  verification: { fourPillars: true; bazi: true; ziwei: true; yijing: true };
  fourPillars: { bazi: FourPillars; ziwei: FourPillars; differences: FourPillarDifference[] };
  checklist: ThreeInOneChecklistItem[];
  display: ThreeInOneDisplay;
  result: {
    bazi: ThreeCoreBaziLayer;
    ziwei: Extract<ThreeCoreZiweiLayer, { status: 'READY' }>;
    yijing: Extract<ThreeCoreIChingLayer, { status: 'READY' }>;
  };
}

export interface ThreeInOneAbnormal {
  success: false;
  completed: false;
  status: 'ABNORMAL';
  abnormalType: 'FOUR_PILLARS_MISMATCH';
  source: 'BAZI_ZIWEI_CROSS_CHECK';
  trace: ThreeInOneStatus[];
  verification: { fourPillars: false; bazi: true; ziwei: true; yijing: false };
  fourPillars: { bazi: FourPillars; ziwei: FourPillars; differences: FourPillarDifference[] };
  checklist: ThreeInOneChecklistItem[];
  report: ThreeInOneAbnormalReport;
  display: ThreeInOneDisplay;
}

export interface ThreeInOneFailure {
  success: false;
  completed: false;
  status: 'FAILED';
  failureType: 'BAZI_FAILED' | 'ZIWEI_FAILED' | 'YIJING_FAILED' | 'INPUT_INVALID';
  trace: ThreeInOneStatus[];
  verification: { fourPillars: boolean; bazi: boolean; ziwei: boolean; yijing: boolean };
  checklist: ThreeInOneChecklistItem[];
  report: ThreeInOneFailureReport;
  display: ThreeInOneDisplay;
  /** 八字已經算出來時照給——年月日三柱本來就成立，沒必要一起扣住。 */
  partial: { bazi: ThreeCoreBaziLayer | null };
}

export type ThreeInOneResult = ThreeInOneSuccess | ThreeInOneAbnormal | ThreeInOneFailure;

const NOTHING_VISIBLE: ThreeInOneDisplay = { bazi: false, ziwei: false, yijing: false, combined: false };

/* ────────────────────────────────────────────────────────────────────────────
   五、整合控制層
   ──────────────────────────────────────────────────────────────────────────── */

/** HH:mm → 時辰地支索引。用既有的 shichen 引擎換算，這一層不自己算。 */
function toHourBranchIndex(birthTime: string | null): number | null {
  if (!birthTime) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(birthTime.trim());
  if (!match) return null;
  const hour24 = Number(match[1]);
  if (!Number.isInteger(hour24) || hour24 < 0 || hour24 > 23) return null;
  return shichenFromClockHour(hour24);
}

type ChecklistState = ThreeInOneChecklistItem['state'];

function checklistOf(
  states: { bazi: ChecklistState; ziwei: ChecklistState; fourPillars: ChecklistState; yijing: ChecklistState; combined: ChecklistState },
  details: Record<ThreeInOneChecklistItem['id'], string>,
): ThreeInOneChecklistItem[] {
  return [
    { id: 'BAZI', label: '八字資料完成', state: states.bazi, detail: details.BAZI },
    { id: 'ZIWEI', label: '紫微資料完成', state: states.ziwei, detail: details.ZIWEI },
    { id: 'FOUR_PILLARS', label: '八字／紫微四柱核對', state: states.fourPillars, detail: details.FOUR_PILLARS },
    { id: 'YIJING', label: '易經資料完成', state: states.yijing, detail: details.YIJING },
    { id: 'COMBINED', label: '三合一驗證完成', state: states.combined, detail: details.COMBINED },
  ];
}

/**
 * 跑一次完整的三合一。
 *
 * 三套全部成立才回 success；任何一關沒過都停在該關，並且把原因說清楚。
 * 呼叫端拿到的 display 已經算好哪幾塊可以顯示——前端照著開關就好，不要自己判斷。
 */
export async function runThreeInOne(input: UnifiedInput): Promise<ThreeInOneResult> {
  const machine = new ThreeInOneStateMachine();

  const hourBranchIndex = toHourBranchIndex(input.birthTime);
  const coreInput: ThreeCoreInput = {
    birthDate: input.birthDate,
    gender: input.gender,
    hourBranchIndex,
    longitude: input.longitude ?? null,
  };

  // ── 0. 輸入檢查 ────────────────────────────────────────────────────────
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(input.birthDate.trim())) {
    machine.to('FAILED');
    return {
      success: false,
      completed: false,
      status: 'FAILED',
      failureType: 'INPUT_INVALID',
      trace: machine.trace,
      verification: { fourPillars: false, bazi: false, ziwei: false, yijing: false },
      checklist: checklistOf(
        { bazi: 'PENDING', ziwei: 'PENDING', fourPillars: 'PENDING', yijing: 'PENDING', combined: 'PENDING' },
        {
          BAZI: '尚未開始',
          ZIWEI: '尚未開始',
          FOUR_PILLARS: '尚未開始',
          YIJING: '尚未開始',
          COMBINED: '尚未開始',
        },
      ),
      report: {
        title: '出生日期格式無法辨識',
        reason: `收到的 birthDate 是「${input.birthDate}」，不是 YYYY-MM-DD。`,
        nextStep: '請重新確認出生日期後再送一次。',
      },
      display: NOTHING_VISIBLE,
      partial: { bazi: null },
    };
  }

  // ── 1. 呼叫既有八字 ────────────────────────────────────────────────────
  machine.to('BAZI_RUNNING');
  let bazi: ThreeCoreBaziLayer;
  let core: ReturnType<typeof runBaziLayer>['core'];
  try {
    const layer = runBaziLayer(coreInput);
    bazi = layer.bazi;
    core = layer.core;
  } catch (error) {
    machine.to('FAILED');
    return {
      success: false,
      completed: false,
      status: 'FAILED',
      failureType: 'BAZI_FAILED',
      trace: machine.trace,
      verification: { fourPillars: false, bazi: false, ziwei: false, yijing: false },
      checklist: checklistOf(
        { bazi: 'ABNORMAL', ziwei: 'PENDING', fourPillars: 'PENDING', yijing: 'PENDING', combined: 'PENDING' },
        {
          BAZI: error instanceof Error ? error.message : String(error),
          ZIWEI: '八字未完成，未進入',
          FOUR_PILLARS: '八字未完成，未進入',
          YIJING: '八字未完成，未進入',
          COMBINED: '未成立',
        },
      ),
      report: {
        title: '八字排盤未完成',
        reason: error instanceof Error ? error.message : String(error),
        nextStep: null,
      },
      display: NOTHING_VISIBLE,
      partial: { bazi: null },
    };
  }

  const baziDetail = `${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour ?? '（時柱待補）'}`;
  const baziReady = Boolean(bazi.year && bazi.month && bazi.day) && core.verification.readyForInterpretation;

  if (!baziReady) {
    machine.to('FAILED');
    return {
      success: false,
      completed: false,
      status: 'FAILED',
      failureType: 'BAZI_FAILED',
      trace: machine.trace,
      verification: { fourPillars: false, bazi: false, ziwei: false, yijing: false },
      checklist: checklistOf(
        { bazi: 'ABNORMAL', ziwei: 'PENDING', fourPillars: 'PENDING', yijing: 'PENDING', combined: 'PENDING' },
        {
          BAZI: `四柱或驗證閘未通過：${baziDetail}`,
          ZIWEI: '八字未完成，未進入',
          FOUR_PILLARS: '八字未完成，未進入',
          YIJING: '八字未完成，未進入',
          COMBINED: '未成立',
        },
      ),
      report: {
        title: '八字命盤未通過驗證閘',
        reason: '曆法、四柱、十神、大運四道驗證未全數通過，命盤不算鎖定。',
        nextStep: null,
      },
      display: NOTHING_VISIBLE,
      partial: { bazi },
    };
  }

  // ── 2. 呼叫既有紫微 ────────────────────────────────────────────────────
  machine.to('ZIWEI_RUNNING');
  let ziwei: ThreeCoreZiweiLayer;
  try {
    ziwei = runZiweiLayer(coreInput);
  } catch (error) {
    ziwei = {
      status: 'UNAVAILABLE_BIRTH_TIME_REQUIRED',
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  if (ziwei.status !== 'READY' || !isZiweiCertified(ziwei)) {
    machine.to('FAILED');
    const reason = ziwei.status === 'READY'
      ? '紫微命盤未定盤：十二宮未齊備，或時辰未確認。'
      : ziwei.reason;
    return {
      success: false,
      completed: false,
      status: 'FAILED',
      failureType: 'ZIWEI_FAILED',
      trace: machine.trace,
      verification: { fourPillars: false, bazi: true, ziwei: false, yijing: false },
      checklist: checklistOf(
        { bazi: 'PASSED', ziwei: 'ABNORMAL', fourPillars: 'PENDING', yijing: 'PENDING', combined: 'PENDING' },
        {
          BAZI: baziDetail,
          ZIWEI: reason,
          FOUR_PILLARS: '紫微未完成，未進入',
          YIJING: '紫微未完成，未進入',
          COMBINED: '未成立',
        },
      ),
      report: {
        title: '紫微命盤未完成',
        reason,
        nextStep: hourBranchIndex === null
          ? '補上出生時辰即可解鎖命宮、三方四正與卦象。上面的年、月、日三柱不會因此改變。'
          : null,
      },
      // 八字三柱本來就成立，沒必要一起扣住——扣住只會讓客戶覺得整個系統壞了。
      display: { bazi: true, ziwei: false, yijing: false, combined: false },
      partial: { bazi },
    };
  }

  // ── 3. 八字 × 紫微 四柱交叉核對 ────────────────────────────────────────
  machine.to('VERIFYING_FOUR_PILLARS');

  const baziPillars: FourPillars = {
    year: bazi.year,
    month: bazi.month,
    day: bazi.day,
    hour: bazi.hour ?? '',
  };
  const ziweiPillars: FourPillars = {
    year: ziwei.analysis.bazi.year,
    month: ziwei.analysis.bazi.month,
    day: ziwei.analysis.bazi.day,
    hour: ziwei.analysis.bazi.hour,
  };
  const verification = verifyFourPillars(baziPillars, ziweiPillars);
  const ziweiDetail = `${ziweiPillars.year} ${ziweiPillars.month} ${ziweiPillars.day} ${ziweiPillars.hour || '（空）'}`;

  if (!verification.passed) {
    /*
      這裡**不修正**任何一邊。

      把紫微改成八字（或反過來）會讓畫面看起來正常，但那是在藏錯：
      真正的問題是「有一段資料或傳遞跑掉了」，蓋掉之後就再也找不到。
      所以只做三件事：停下來、不顯示、把哪一柱不同原封不動報出去。
    */
    machine.to('ABNORMAL');
    const lines = verification.differences
      .map((d) => `${PILLAR_LABELS[d.pillar]}\n八字：${d.bazi || '（空）'}\n紫微：${d.ziwei || '（空）'}`)
      .join('\n\n');

    return {
      success: false,
      completed: false,
      status: 'ABNORMAL',
      abnormalType: 'FOUR_PILLARS_MISMATCH',
      source: 'BAZI_ZIWEI_CROSS_CHECK',
      trace: machine.trace,
      verification: { fourPillars: false, bazi: true, ziwei: true, yijing: false },
      fourPillars: { bazi: baziPillars, ziwei: ziweiPillars, differences: verification.differences },
      checklist: checklistOf(
        { bazi: 'PASSED', ziwei: 'PASSED', fourPillars: 'ABNORMAL', yijing: 'PENDING', combined: 'PENDING' },
        {
          BAZI: baziDetail,
          ZIWEI: ziweiDetail,
          FOUR_PILLARS: verification.differences
            .map((d) => `${PILLAR_LABELS[d.pillar]} 八字「${d.bazi}」≠ 紫微「${d.ziwei}」`)
            .join('；'),
          YIJING: '核對未過，未進入',
          COMBINED: '未成立',
        },
      ),
      report: {
        title: '八字與紫微四柱核對異常',
        reason: '八字與紫微四柱未完全一致',
        differences: verification.differences,
        customerMessage:
          '資料核對異常\n\n'
          + '八字與紫微斗數的出生四柱未完全一致，\n'
          + '系統已停止本次運算，以避免錯誤結果繼續向下傳遞。\n\n'
          + `異常項目：\n${lines}\n\n`
          + '處理狀態：\n'
          + '本次紫微結果不顯示\n'
          + '三合一結果不成立\n'
          + '請重新檢查原始出生資料或紫微排盤來源',
      },
      display: { bazi: true, ziwei: false, yijing: false, combined: false },
    };
  }

  // ── 4. 呼叫既有易經（含正統卜卦儀式）──────────────────────────────────
  machine.to('YIJING_RUNNING');
  let yijing: ThreeCoreIChingLayer;
  try {
    yijing = runIChingLayer({ input: coreInput, core, bazi, ziwei });
  } catch (error) {
    // castHexagramCertified 憑證不符時會丟例外。不吞掉，照實往上報。
    machine.to('FAILED');
    return {
      success: false,
      completed: false,
      status: 'FAILED',
      failureType: 'YIJING_FAILED',
      trace: machine.trace,
      verification: { fourPillars: true, bazi: true, ziwei: true, yijing: false },
      checklist: checklistOf(
        { bazi: 'PASSED', ziwei: 'PASSED', fourPillars: 'PASSED', yijing: 'ABNORMAL', combined: 'PENDING' },
        {
          BAZI: baziDetail,
          ZIWEI: ziweiDetail,
          FOUR_PILLARS: '年、月、日、時四柱逐字一致',
          YIJING: error instanceof Error ? error.message : String(error),
          COMBINED: '未成立',
        },
      ),
      report: {
        title: '易經起卦未完成',
        reason: error instanceof Error ? error.message : String(error),
        nextStep: null,
      },
      display: { bazi: true, ziwei: true, yijing: false, combined: false },
      partial: { bazi },
    };
  }

  if (yijing.status !== 'READY') {
    machine.to('FAILED');
    return {
      success: false,
      completed: false,
      status: 'FAILED',
      failureType: 'YIJING_FAILED',
      trace: machine.trace,
      verification: { fourPillars: true, bazi: true, ziwei: true, yijing: false },
      checklist: checklistOf(
        { bazi: 'PASSED', ziwei: 'PASSED', fourPillars: 'PASSED', yijing: 'ABNORMAL', combined: 'PENDING' },
        {
          BAZI: baziDetail,
          ZIWEI: ziweiDetail,
          FOUR_PILLARS: '年、月、日、時四柱逐字一致',
          YIJING: yijing.reason,
          COMBINED: '未成立',
        },
      ),
      report: { title: '易經卦象未成立', reason: yijing.reason, nextStep: null },
      display: { bazi: true, ziwei: true, yijing: false, combined: false },
      partial: { bazi },
    };
  }

  // ── 5. 三套全部成功 ────────────────────────────────────────────────────
  machine.to('PASSED');
  return {
    success: true,
    completed: true,
    status: 'PASSED',
    trace: machine.trace,
    verification: { fourPillars: true, bazi: true, ziwei: true, yijing: true },
    fourPillars: { bazi: baziPillars, ziwei: ziweiPillars, differences: [] },
    checklist: checklistOf(
      { bazi: 'PASSED', ziwei: 'PASSED', fourPillars: 'PASSED', yijing: 'PASSED', combined: 'PASSED' },
      {
        BAZI: baziDetail,
        ZIWEI: ziweiDetail,
        FOUR_PILLARS: '年、月、日、時四柱逐字一致',
        YIJING: `${yijing.reading.hexagramName} → ${yijing.patternName}`,
        COMBINED: `命盤指紋 ${yijing.ritual.chartFingerprint}`,
      },
    ),
    display: { bazi: true, ziwei: true, yijing: true, combined: true },
    result: { bazi, ziwei, yijing },
  };
}

/**
 * 三合一沒成立就直接擋下。
 *
 * 用在「要把結果送去表達層／回傳給前端」之前。
 * 這一行是最後一道保險：就算呼叫端忘了看 display，也不會把半套結果送出去。
 */
export function assertThreeInOnePassed(result: ThreeInOneResult): asserts result is ThreeInOneSuccess {
  if (result.status !== 'PASSED') {
    const detail = result.status === 'ABNORMAL'
      ? result.report.differences
        .map((d) => `${PILLAR_LABELS[d.pillar]} 八字「${d.bazi}」≠ 紫微「${d.ziwei}」`)
        .join('；')
      : result.report.reason;
    throw new Error(`THREE_IN_ONE_NOT_PASSED: ${result.status} — ${detail}`);
  }
}
