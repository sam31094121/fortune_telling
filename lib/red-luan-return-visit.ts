'use client';

/**
 * 紅鸞・回訪記憶（2026-09-04）
 *
 * 這張卡的結果是靜態的：同一生辰永遠同一卦，未來十八個月的月份清單也不會變。
 * 客戶隔一個月回來，看到的是一模一樣的頁面——於是沒有第二次的理由。
 *
 * 這裡只在本機記三件會隨時間改變的小事：
 *   1. 上次來的時候，那個月還有幾天（回來時才講得出「上次還有 87 天，現在剩 4 天」）
 *   2. 拆過哪幾層（沒拆完的禮物比新東西更會把人拉回來）
 *   3. 上次有沒有填時辰（沒填的人有一個真實的回來理由：去問家裡自己幾點生的）
 *
 * 全部在 localStorage：不需要帳號、不需要通知權限、不上傳任何東西。
 * in-app 瀏覽器可能封鎖 storage，所有讀寫都靜默失敗，絕不影響主流程。
 */

const RETURN_VISIT_STORAGE_KEY = 'tdh_red_luan_return_visit_v1';

export type RedLuanReturnVisit = {
  /** 上次看到結果的日期，YYYY-MM-DD。 */
  lastViewedOn: string;
  /** 上次看到的那個紅鸞月起始日，YYYY-MM-DD。空字串代表當時沒有命中。 */
  encounterStartsOn: string;
  /** 上次看到時，距離那個月還有幾天。 */
  daysAway: number;
  /** 拆開過的折疊區代號。 */
  openedGiftKeys: string[];
  /** 這份結果總共有幾層可拆（有無時辰會不一樣）。 */
  giftTotal: number;
  /** 上次算的時候有沒有填出生時辰。 */
  hourKnown: boolean;
};

const EMPTY_VISIT: RedLuanReturnVisit = {
  lastViewedOn: '',
  encounterStartsOn: '',
  daysAway: 0,
  openedGiftKeys: [],
  giftTotal: 0,
  hourKnown: false,
};

export function readRedLuanReturnVisit(): RedLuanReturnVisit | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(RETURN_VISIT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RedLuanReturnVisit>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...EMPTY_VISIT,
      ...parsed,
      openedGiftKeys: Array.isArray(parsed.openedGiftKeys) ? parsed.openedGiftKeys.filter((key) => typeof key === 'string') : [],
    };
  } catch {
    return null;
  }
}

/** 合併寫入；沒帶到的欄位維持原樣。 */
export function saveRedLuanReturnVisit(patch: Partial<RedLuanReturnVisit>): void {
  if (typeof window === 'undefined') return;
  try {
    const merged: RedLuanReturnVisit = { ...EMPTY_VISIT, ...readRedLuanReturnVisit(), ...patch };
    window.localStorage.setItem(RETURN_VISIT_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* in-app 瀏覽器可能封鎖 storage：靜默略過 */
  }
}

export function clearRedLuanReturnVisit(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RETURN_VISIT_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** 台北時區的今天，YYYY-MM-DD。行事曆與倒數都用它當基準。 */
export function taipeiToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Taipei',
  }).format(new Date());
}

/** 從今天算到某一天還有幾天；已經過去的回負數。 */
export function daysFromToday(iso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 0;
  const today = Date.parse(`${taipeiToday()}T00:00:00Z`);
  const target = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(today) || Number.isNaN(target)) return 0;
  return Math.round((target - today) / 86400000);
}

/**
 * 回訪時要講的那一句。
 *
 * 重點是「這句話上次沒有」——同一個人回來看到的必須是新的資訊，
 * 否則他會發現這頁跟上次一模一樣，然後就不會有第三次。
 * 依優先序只挑一句：倒數 → 沒拆完 → 沒填時辰。
 */
export function buildRedLuanReturnLine(visit: RedLuanReturnVisit | null): string {
  if (!visit || !visit.lastViewedOn) return '';

  if (visit.encounterStartsOn) {
    const daysNow = daysFromToday(visit.encounterStartsOn);
    if (daysNow > 0) {
      // 倒數真的走動了才講倒數。同一天內再進來一次，天數沒變，
      // 硬講「上次還有 4 天，現在剩 4 天」只會顯得系統在硬湊——直接讓給下面的句子。
      if (visit.daysAway > daysNow) return `上次你來的時候還有 ${visit.daysAway} 天，現在剩 ${daysNow} 天。`;
    } else if (daysNow === 0) {
      return '你上次看的那個月，就是今天開始。';
    } else if (daysNow >= -31) {
      // 節氣月大約 30 天：還在那個月裡面。
      return '你上次看的那個月已經開始了，進來看看還剩幾天。';
    } else {
      // 隔了半年才回來的人，聽到「已經開始了」只會覺得這系統根本沒在看日期。
      return '你上次看的那個月已經過去了。下一次在什麼時候，進來看一眼。';
    }
  }

  const unopened = visit.giftTotal - visit.openedGiftKeys.length;
  if (unopened > 0) return `你上次還有 ${unopened} 層沒拆完。`;

  if (!visit.hourKnown) return '上次沒填出生時辰，補上就能解鎖你的卦象。';

  return '';
}
