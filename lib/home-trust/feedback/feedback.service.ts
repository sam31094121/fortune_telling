/**
 * 首頁信任統計 — 回饋服務層
 *
 * 職責：
 * - 驗證回饋資料
 * - 自動分類
 * - 與計數系統隔離
 * - 記錄錯誤不影響計數
 */

import type {
  FeedbackSubmitRequest,
  FeedbackSubmitResult,
  FeedbackStats,
} from './feedback.types';
import {
  saveFeedback,
  autoClassifyFeedback,
  getFeedbackStats,
  updateFeedbackStatus,
} from './feedback.repository';

/**
 * 完整回饋流程
 *
 * 1. 驗證輸入
 * 2. 自動分類
 * 3. 儲存到私密系統
 * 4. 回傳結果（失敗也不影響前台計數）
 */
export async function submitFeedback(
  request: FeedbackSubmitRequest
): Promise<FeedbackSubmitResult> {
  try {
    // 步驟 1：驗證
    const validation = validateFeedbackRequest(request);
    if (!validation.valid) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        message: validation.error || '回饋內容不符合要求',
      };
    }

    // 步驟 2：自動分類
    let category = request.category;
    if (!category && request.message) {
      category = autoClassifyFeedback(request.message);
    }

    // 步驟 3：儲存
    const enhanced = {
      ...request,
      category,
    };

    const result = await saveFeedback(enhanced);

    // 步驟 4：記錄（僅供後台查看）
    if (result.success && result.feedbackId) {
      console.log(
        `[HomeTrust-Service] Feedback saved: ${result.feedbackId} (${request.vote})`
      );
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[HomeTrust-Service] submitFeedback failed:', message);

    // 重要：即使回饋系統出錯，也要回傳友善訊息
    return {
      success: false,
      timestamp: new Date().toISOString(),
      message: '暫時無法保存意見，但你的投票已計算。我們稍後再看。',
    };
  }
}

/**
 * 驗證回饋請求
 *
 * 禁止規則：
 * - 禁止收集真實姓名
 * - 禁止收集電話
 * - 禁止收集精確位置
 * - 禁止超長訊息（防止垃圾）
 * - 禁止含有聯絡資訊
 */
export function validateFeedbackRequest(
  request: FeedbackSubmitRequest
): { valid: boolean; error?: string } {
  // 投票必須
  if (!request.vote || !['AGREE', 'DISAGREE'].includes(request.vote)) {
    return { valid: false, error: '投票類型無效' };
  }

  // 訊息限制：最多 500 字
  if (request.message && request.message.length > 500) {
    return { valid: false, error: '訊息超過 500 字限制' };
  }

  // 檢查禁止關鍵字（基本防護）
  if (request.message) {
    const forbidden = checkForbiddenPatterns(request.message);
    if (!forbidden.allowed) {
      return { valid: false, error: forbidden.reason };
    }
  }

  return { valid: true };
}

/**
 * 檢查禁止的內容模式
 *
 * 防止用戶在回饋中留下身份資訊
 */
function checkForbiddenPatterns(message: string): {
  allowed: boolean;
  reason?: string;
} {
  // 檢查電話號碼模式
  const phonePattern = /\d{7,11}/;
  if (phonePattern.test(message)) {
    return { allowed: false, reason: '請勿留下電話號碼' };
  }

  // 檢查電子郵件模式
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailPattern.test(message)) {
    return { allowed: false, reason: '請勿留下電子郵件' };
  }

  // 檢查身份證號碼（台灣格式）
  const idPattern = /[A-Z]\d{9}/;
  if (idPattern.test(message)) {
    return { allowed: false, reason: '請勿留下身份資訊' };
  }

  return { allowed: true };
}

/**
 * 取得回饋統計（後台專用）
 *
 * 前台使用者看不到任何統計
 * 只有管理員可以查看
 */
export async function getBackendFeedbackStats(): Promise<FeedbackStats> {
  try {
    const stats = await getFeedbackStats();
    return stats;
  } catch (error) {
    console.error('[HomeTrust-Service] Failed to get stats:', error);
    // 回傳空統計，不中斷前台
    return {
      totalFeedback: 0,
      agreeCount: 0,
      disagreeCount: 0,
      byCategory: {
        CONTENT_ACCURACY: 0,
        FEATURE_SUGGESTION: 0,
        USABILITY: 0,
        DISPLAY: 0,
        SPEED: 0,
        OTHER: 0,
      },
      byStatus: {
        NEW: 0,
        REVIEWED: 0,
        ACTIONED: 0,
        ARCHIVED: 0,
      },
      unreviewed: 0,
    };
  }
}

/**
 * 後台更新回饋狀態
 *
 * NEW → REVIEWED → ACTIONED → ARCHIVED
 */
export async function markFeedbackAsReviewed(
  feedbackId: string
): Promise<boolean> {
  return updateFeedbackStatus(feedbackId, 'REVIEWED');
}

export async function markFeedbackAsActioned(
  feedbackId: string
): Promise<boolean> {
  return updateFeedbackStatus(feedbackId, 'ACTIONED');
}

export async function markFeedbackAsArchived(
  feedbackId: string
): Promise<boolean> {
  return updateFeedbackStatus(feedbackId, 'ARCHIVED');
}

/**
 * 鐵律
 *
 * 回饋系統與計數完全隔離
 * 這個檔案只負責回饋本身的驗證、分類、儲存
 *
 * 計數相關操作一律經過：
 * lib/home-trust/counters.repository.ts
 *
 * 不在這裡呼叫計數函式
 * 不在這裡修改計數值
 */
