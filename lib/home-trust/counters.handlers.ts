/**
 * 首頁信任統計 — 三個獨立計數處理程序
 *
 * 三個獨立功能：
 * 1. agreementHandler.ts → 認同 +1
 * 2. disagreementHandler.ts → 不認同 +1
 * 3. viewHandler.ts → 累計瀏覽次數 +1
 *
 * 全部共用 counters.repository.ts
 */

import type {
  HomeTrustCounters,
  IncrementResult,
  IncrementError,
} from './counters.types';
import { incrementCounter, validateMonotonic } from './counters.repository';
import { v4 as uuidv4 } from 'crypto';

/**
 * 認同計數處理程序
 *
 * 唯一職責：認同 +1
 * 禁止直接設定成某個絕對數字
 */
export async function handleAgreeIncrement(): Promise<IncrementResult> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    console.log(`[HomeTrust-Agree] Request ${requestId} started`);

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
      previousValue: 0, // TODO: 從前一狀態取得
      reason: errorMessage,
    } as IncrementError;
  }
}

/**
 * 不認同計數處理程序
 *
 * 唯一職責：不認同 +1
 * 只能 +1，禁止歸零、倒退、前端指定最終值
 */
export async function handleDisagreeIncrement(): Promise<IncrementResult> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
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
      previousValue: 0,
      reason: errorMessage,
    } as IncrementError;
  }
}

/**
 * 瀏覽次數計數處理程序
 *
 * 唯一職責：累計瀏覽次數 +1
 * 固定名稱：「累計瀏覽次數」（不是人數、不是來訪）
 */
export async function handleViewIncrement(): Promise<IncrementResult> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    console.log(`[HomeTrust-View] Request ${requestId} started`);

    const result = await incrementCounter('view');

    const duration = Date.now() - startTime;
    console.log(
      `[HomeTrust-View] Request ${requestId} completed in ${duration}ms: ${result.viewCount}`
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
      previousValue: 0,
      reason: errorMessage,
    } as IncrementError;
  }
}

/**
 * 生成唯一的 Request ID
 * 用於追蹤和防止重複
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

/**
 * 驗證 Request 未重複（防止 Race Condition）
 *
 * 同一個 Request 尚未完成時禁止重複發送
 */
const pendingRequests = new Set<string>();

export function isPending(requestId: string): boolean {
  return pendingRequests.has(requestId);
}

export function setPending(requestId: string): void {
  pendingRequests.add(requestId);
}

export function clearPending(requestId: string): void {
  pendingRequests.delete(requestId);
}

/**
 * 清理超時的請求（5 秒）
 */
export function cleanupStaleRequests(): void {
  // TODO: 實作請求超時管理
  // 移除超過 5 秒的待執行請求
}
