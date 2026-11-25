/**
 * 戰鬥卡圖載入失敗的顯示狀態（只管畫面，不碰戰鬥數值）。
 * 原圖失敗 → 換備援圖；備援也失敗 → 標記 failed（隱藏破圖示，由外框顯示屬性色底），
 * 之後在「連線恢復」「回到前景」或定時重試時重新載入原圖，最多 MAX_ART_RETRIES 次。
 */
export const MAX_ART_RETRIES = 3;
/** 失敗後自動重試的等待（毫秒），依序使用；網路恢復／回到前景會立即重試。 */
export const ART_RETRY_DELAYS_MS = [4000, 12000, 30000] as const;

export interface ArtState { src: string; current: string; usedFallback: boolean; failed: boolean; retries: number; attempt: number }

export function initialArtState(src: string): ArtState {
  return { src, current: src, usedFallback: false, failed: false, retries: 0, attempt: 0 };
}

/** 圖片 onError：先換備援圖，備援也失敗才標記 failed。 */
export function artOnError(s: ArtState, fallback?: string): ArtState {
  if (s.failed) return s;
  if (!s.usedFallback && fallback && fallback !== s.src && fallback !== s.current) return { ...s, usedFallback: true, current: fallback };
  return { ...s, usedFallback: true, failed: true };
}

/** 重試：重新載入原圖（attempt 變動讓 <img> 重新掛載、真的再抓一次）。超過次數就維持 failed。 */
export function artRetry(s: ArtState): ArtState {
  if (!s.failed || s.retries >= MAX_ART_RETRIES) return s;
  return { ...s, current: s.src, usedFallback: false, failed: false, retries: s.retries + 1, attempt: s.attempt + 1 };
}

/** 圖片成功載入：清掉重試計數。 */
export function artOnLoad(s: ArtState): ArtState {
  return s.failed || s.retries === 0 ? s : { ...s, retries: 0 };
}
