/**
 * 首頁信任統計 — 累計瀏覽次數（獨立功能）
 *
 * 職責：
 * - 記錄正式進入頁面的次數
 * - 完全自動，不需使用者互動
 * - 與認同、不認同計數獨立
 *
 * 重要定義：
 * - 「累計瀏覽次數」 ✅
 * - 不是「瀏覽人數」
 * - 不是「獨立訪客」
 * - 不是「每來一位朋友加一人」
 *
 * 同一人離開再進來：可以再次 +1
 * 這是「次數」，不是「人數」
 */

import type {
  HomeTrustCounters,
  IncrementResult,
  IncrementError,
} from './counters.types';
import { incrementCounter } from './counters.repository';
import { randomUUID } from 'crypto';

/**
 * 累計瀏覽次數增加 +1
 *
 * 觸發時機：
 * - 頁面正式加載
 * - 使用者打開頁面（不是重新整理應該也算一次）
 * - 每次正式進入頁面都 +1
 *
 * 不需要回饋，完全自動
 */
export async function incrementViewCount(): Promise<IncrementResult> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // 防止極短時間內重複（例如同時開多個標籤）
    if (isPending(requestId)) {
      throw {
        type: 'VIEW_DUPLICATE_REQUEST',
        timestamp: new Date().toISOString(),
        requestId,
        reason: 'View count request already pending',
      } as IncrementError;
    }

    setPending(requestId);

    console.log(`[HomeTrust-View] Request ${requestId} started`);

    const result = await incrementCounter('view');

    const duration = Date.now() - startTime;
    console.log(
      `[HomeTrust-View] Request ${requestId} completed in ${duration}ms: views=${result.viewCount}`
    );

    return {
      success: true,
      counters: result,
      timestamp: new Date().toISOString(),
      requestId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[HomeTrust-View] Request ${requestId} failed:`,
      errorMessage
    );

    throw {
      type: 'VIEW_INCREMENT_FAILED',
      timestamp: new Date().toISOString(),
      requestId,
      reason: errorMessage,
    } as IncrementError;
  } finally {
    clearPending(requestId);
  }
}

/**
 * 產生唯一的 Request ID
 */
function generateRequestId(): string {
  return `view_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

const pendingRequests = new Set<string>();

function isPending(requestId: string): boolean {
  return pendingRequests.has(requestId);
}

function setPending(requestId: string): void {
  pendingRequests.add(requestId);
  // 3 秒後清理（瀏覽計數一般不會那麼快重複）
  setTimeout(() => clearPending(requestId), 3000);
}

function clearPending(requestId: string): void {
  pendingRequests.delete(requestId);
}

/**
 * 客製化：瀏覽顯示名稱
 *
 * 前端展示時使用：【累計瀏覽次數】
 *
 * 不要說：
 * ❌ 瀏覽人數
 * ❌ 累計瀏覽人數
 * ❌ 每來一位朋友加一人
 */
export const VIEW_DISPLAY_NAME = '累計瀏覽次數';

/**
 * 數據透明
 *
 * 這個計數的意義：
 * - 有多少人對這張卡片有興趣（打開來看）
 * - 不代表有多少不同的人
 * - 代表多少次的查看行為
 *
 * 為什麼這樣設計：
 * - 簡單透明，沒有黑盒子
 * - 不追蹤使用者身份
 * - 尊重隱私
 */
