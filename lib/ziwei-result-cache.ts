'use client';

/**
 * 紫微結果本機快取（2026-09-04）
 *
 * 一次完整分析要跑兩支 AI，實測 16 秒。但結果只活在 React 記憶體裡：
 * 客戶手滑重新整理、手機切去別的 App 被系統回收分頁、或不小心按到上一頁，
 * 十六秒的東西就全部消失，而且時辰選擇也一起被忘掉，等於要從頭再等一次。
 *
 * 這裡把「結果 + 當時的輸入」一起存 24 小時。它不是使用次數限制，
 * 只是還原：回來看到的是同一份，想重算隨時可以按「重新分析」。
 *
 * 存的內容含姓名與生日，全部留在這台裝置的 localStorage，不會上傳。
 */

const ZIWEI_RESULT_STORAGE_KEY = 'tdh_ziwei_last_result_v1';
const ZIWEI_RESULT_TTL_MS = 24 * 60 * 60 * 1000;
/** localStorage 通常只有 5MB，且整站共用。超過就不存，寧可不還原也不要擠掉別人的資料。 */
const ZIWEI_RESULT_MAX_BYTES = 900_000;

export interface ZiweiCachedResult<TResult, TInput> {
  result: TResult;
  input: TInput;
  savedAt: number;
  expiresAt: number;
}

export function saveZiweiResult<TResult, TInput>(result: TResult, input: TInput): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const now = Date.now();
    const payload: ZiweiCachedResult<TResult, TInput> = {
      result,
      input,
      savedAt: now,
      expiresAt: now + ZIWEI_RESULT_TTL_MS,
    };
    const raw = JSON.stringify(payload);
    if (raw.length > ZIWEI_RESULT_MAX_BYTES) return false;
    window.localStorage.setItem(ZIWEI_RESULT_STORAGE_KEY, raw);
    return true;
  } catch {
    // 配額滿了或 in-app 瀏覽器封鎖 storage：靜默略過，不影響本次已經算好的結果。
    return false;
  }
}

export function readZiweiResult<TResult, TInput>(): ZiweiCachedResult<TResult, TInput> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ZIWEI_RESULT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ZiweiCachedResult<TResult, TInput>;
    if (!parsed || typeof parsed !== 'object' || !parsed.result) return null;
    if (!Number.isFinite(parsed.expiresAt) || Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(ZIWEI_RESULT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearZiweiResult(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ZIWEI_RESULT_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** 「幾分鐘前 / 幾小時前」——回訪時讓客戶知道這份是什麼時候算的。 */
export function describeSavedAt(savedAt: number): string {
  const minutes = Math.floor((Date.now() - savedAt) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  return `${hours} 小時前`;
}
