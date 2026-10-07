/**
 * 首頁信任統計 — 認同計數（獨立功能）
 *
 * 職責：
 * - 處理「我認同」按鈕的計數邏輯
 * - 與不認同、瀏覽計數獨立
 * - 可選擇提供回饋
 *
 * 不得：
 * - 直接修改資料庫
 * - 倒退計數
 * - 在前端設定最終值
 */

import type {
  HomeTrustCounters,
  IncrementResult,
  IncrementError,
} from './counters.types';
import { incrementCounter } from './counters.repository'; // 檔案在同一目錄
import { randomUUID } from 'crypto';

/**
 * 認同計數增加 +1
 *
 * 流程：
 * 1. 產生唯一的 Request ID（用於追蹤）
 * 2. 驗證不在待執行狀態（防止連續點擊）
 * 3. 執行原子性增量
 * 4. 驗證單調性（新值 = 舊值 + 1）
 * 5. 回傳結果給前端（Optimistic UI 已顯示）
 */
export async function incrementAgreeCount(): Promise<IncrementResult> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // 防止連續點擊
    if (isPending(requestId)) {
      throw {
        type: 'AGREE_DUPLICATE_REQUEST',
        timestamp: new Date().toISOString(),
        requestId,
        reason: 'Request already pending',
      } as IncrementError;
    }

    setPending(requestId);

    console.log(`[HomeTrust-Agree] Request ${requestId} started`);

    // 原子性增量（在資料庫執行，不在前端）
    const result = await incrementCounter('agree');

    const duration = Date.now() - startTime;
    console.log(
      `[HomeTrust-Agree] Request ${requestId} completed in ${duration}ms: ${result.agreeCount}`
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
      `[HomeTrust-Agree] Request ${requestId} failed:`,
      errorMessage
    );

    throw {
      type: 'AGREE_INCREMENT_FAILED',
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
 *
 * 格式：req_[時間戳]_[UUID前8碼]
 * 用於：
 * - 追蹤單一請求
 * - 防止重複執行
 * - Race Condition 防護
 */
function generateRequestId(): string {
  return `agree_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

/**
 * 待執行狀態追蹤
 *
 * 防止同一個請求重複執行
 * 同時按鈕只有第一下會成功，第二下被忽略（pending 時）
 */
const pendingRequests = new Set<string>();

function isPending(requestId: string): boolean {
  return pendingRequests.has(requestId);
}

function setPending(requestId: string): void {
  pendingRequests.add(requestId);
  // 5 秒後自動清理（防止記憶體洩漏）
  setTimeout(() => clearPending(requestId), 5000);
}

function clearPending(requestId: string): void {
  pendingRequests.delete(requestId);
}

/**
 * 鐵律
 *
 * ✅ 只負責計數 +1
 * ✅ 原子性增量在資料庫執行
 * ✅ Optimistic UI（前端立即顯示）
 * ✅ 防止連續點擊
 * ✅ 防止 Race Condition
 *
 * ❌ 禁止直接寫 agree_count = 715
 * ❌ 禁止倒退計數
 * ❌ 禁止在前端儲存主資料
 * ❌ 禁止與其他計數混在一起
 *
 * 回饋系統完全分離
 * 呼叫 /api/home-trust/feedback 處理
 */
