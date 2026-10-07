/**
 * 首頁信任統計 — 不認同計數（獨立功能）
 *
 * 職責：
 * - 處理「我不認同」按鈕的計數邏輯
 * - 與認同、瀏覽計數獨立
 * - 可選擇提供回饋
 *
 * 重要：
 * - 不認同也一樣有價值
 * - 我們感謝負面反饋，因為它告訴我們可以改善的地方
 * - 不因為收到不認同就阻擋使用者、防衛或改口
 */

import type {
  HomeTrustCounters,
  IncrementResult,
  IncrementError,
} from './counters.types';
import { incrementCounter } from './counters.repository';
import { randomUUID } from 'crypto';

/**
 * 不認同計數增加 +1
 *
 * 流程同認同，只是增加的欄位不同
 */
export async function incrementDisagreeCount(): Promise<IncrementResult> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    if (isPending(requestId)) {
      throw {
        type: 'DISAGREE_DUPLICATE_REQUEST',
        timestamp: new Date().toISOString(),
        requestId,
        reason: 'Request already pending',
      } as IncrementError;
    }

    setPending(requestId);

    console.log(`[HomeTrust-Disagree] Request ${requestId} started`);

    const result = await incrementCounter('disagree');

    const duration = Date.now() - startTime;
    console.log(
      `[HomeTrust-Disagree] Request ${requestId} completed in ${duration}ms: ${result.disagreeCount}`
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
      `[HomeTrust-Disagree] Request ${requestId} failed:`,
      errorMessage
    );

    throw {
      type: 'DISAGREE_INCREMENT_FAILED',
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
  return `disagree_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

const pendingRequests = new Set<string>();

function isPending(requestId: string): boolean {
  return pendingRequests.has(requestId);
}

function setPending(requestId: string): void {
  pendingRequests.add(requestId);
  setTimeout(() => clearPending(requestId), 5000);
}

function clearPending(requestId: string): void {
  pendingRequests.delete(requestId);
}

/**
 * 哲學
 *
 * 認同：我們感謝。
 * 不認同：我們也感謝。
 *
 * 因為：
 * 認同告訴我們什麼做對了。
 * 不認同告訴我們哪裡還可以更好。
 *
 * 所以：
 * 無論計數數字如何，都是真實的意見。
 * 數字負責累計。
 * 留言負責改善。
 * 前台保持簡單。
 * 後台保留真正有用的意見。
 *
 * 不要：
 * 🚫 公開評論（沒有必要）
 * 🚫 使用者互相吵（沒有幫助）
 * 🚫 因為負評就阻擋使用者（太傻了）
 * 🚫 防衛性回應（會顯得產品很脆弱）
 *
 * 所有回饋：都視為改善產品的資料。
 */
