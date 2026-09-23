/**
 * 信任卡計數——鎖定地板（業主規則）
 * 數字只能往前推，不能往後、不能顯示低於地板。
 * 前端／本機檔／API 一律引用這裡，禁止各寫各的。
 */
export const HOME_VISITOR_FLOOR = 110128;
export const AI_LIKE_FLOOR = 356;
export const AI_SUGGESTION_FLOOR = 36;

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
