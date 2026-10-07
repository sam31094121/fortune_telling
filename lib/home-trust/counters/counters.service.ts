/**
 * 首頁信任統計 — 計數服務層
 *
 * 職責：統一分派三個獨立計數功能
 * - 認同計數
 * - 不認同計數
 * - 瀏覽計數
 *
 * 每個都是獨立模組，這個檔案負責整合
 */

import { incrementAgreeCount } from './agree.counter';
import { incrementDisagreeCount } from './disagree.counter';
import { incrementViewCount } from './views.counter';
import type {
  HomeTrustCounters,
  IncrementResult,
  IncrementError,
} from './counters.types';

/**
 * 認同計數
 */
export async function agreeAction(): Promise<IncrementResult> {
  try {
    return await incrementAgreeCount();
  } catch (error) {
    console.error('[HomeTrust-Service] Agree action failed:', error);
    throw error;
  }
}

/**
 * 不認同計數
 */
export async function disagreeAction(): Promise<IncrementResult> {
  try {
    return await incrementDisagreeCount();
  } catch (error) {
    console.error('[HomeTrust-Service] Disagree action failed:', error);
    throw error;
  }
}

/**
 * 瀏覽計數
 */
export async function viewAction(): Promise<IncrementResult> {
  try {
    return await incrementViewCount();
  } catch (error) {
    console.error('[HomeTrust-Service] View action failed:', error);
    throw error;
  }
}

/**
 * 統一計數狀態（讀取）
 */
export async function getAllCounters(): Promise<HomeTrustCounters> {
  try {
    // TODO: 實作讀取全部計數
    // 應從資料庫讀取 home_trust_counters 表
    return {
      agreeCount: 0,
      disagreeCount: 0,
      viewCount: 0,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[HomeTrust-Service] Failed to get all counters:', error);
    throw error;
  }
}

/**
 * 鐵律：完全分離
 *
 * ✅ agreeAction → incrementAgreeCount()
 * ✅ disagreeAction → incrementDisagreeCount()
 * ✅ viewAction → incrementViewCount()
 *
 * ❌ 禁止在這裡修改計數
 * ❌ 禁止直接碰資料庫
 * ❌ 禁止混合邏輯
 *
 * API 路由會呼叫這些 Action
 */
