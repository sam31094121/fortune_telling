/**
 * 信任卡計數——鎖定地板（業主規則）
 * 數字只能往前推，不能往後、不能顯示低於地板。
 * 前端／本機檔／API 一律引用這裡，禁止各寫各的。
 */
export const HOME_VISITOR_FLOOR = 110128;
export const AI_LIKE_FLOOR = 356;
export const AI_SUGGESTION_FLOOR = 36;

/**
 * 首頁信任區（認同／不認同／累計瀏覽次數）的初始地板——業主規格 INITIAL_FLOOR。
 * 只在資料庫第一次建立時作基準；之後以資料庫為準，絕不用它覆蓋更高的正式數字。
 * 資料庫遷移（supabase/migrations/20261006170000_*.sql）的 CHECK 地板與種子值必須與此一致。
 */
// 明確標成 number：若寫成 as const，useState(HOME_TRUST_FLOORS.agree) 會被推斷成只能是 714，累加後的數字編不過。
export const HOME_TRUST_FLOORS: { agree: number; disagree: number; view: number } = { agree: 714, disagree: 74, view: 110397 };

export const VISITOR_FEATURE_FLOORS: Record<string, number> = {
  home: HOME_VISITOR_FLOOR,
  personality: 0,
  matching: 0,
  number: 0,
  music: 0,
  iching: 0,
  karma: 0,
};

export function visitorFloorFor(featureKey: string): number {
  return VISITOR_FEATURE_FLOORS[featureKey] ?? 0;
}

export function monotonicCount(...values: Array<number | null | undefined>): number {
  let max = 0;
  for (const value of values) {
    if (typeof value === "number" && Number.isSafeInteger(value) && value > max) {
      max = value;
    }
  }
  return max;
}
