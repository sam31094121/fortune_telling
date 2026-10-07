/**
 * 首頁信任統計 — 回饋資料庫層
 *
 * 鐵律：
 * - 所有意見只進私密後台系統
 * - 不公開任何使用者回饋
 * - 無法識別個人身份
 * - 與計數系統完全分離
 */

import type {
  HomeFeedback,
  FeedbackSubmitRequest,
  FeedbackSubmitResult,
  FeedbackStats,
  FeedbackStatus,
  FeedbackCategory,
} from './feedback.types';

/**
 * 新增回饋到私密後台系統
 *
 * 不會回傳給前端任何其他使用者的意見
 */
export async function saveFeedback(
  request: FeedbackSubmitRequest
): Promise<FeedbackSubmitResult> {
  try {
    const feedbackId = generateFeedbackId();

    // TODO: 儲存到資料庫
    // INSERT INTO home_feedback (
    //   id, vote, message, category, status,
    //   device_type, created_at
    // ) VALUES (...)

    const feedback: HomeFeedback = {
      id: feedbackId,
      vote: request.vote,
      message: request.message || '',
      category: request.category,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      deviceType: request.deviceType,
      allowContact: request.allowContact || false,
    };

    await persistFeedbackToDatabase(feedback);

    return {
      success: true,
      feedbackId,
      timestamp: new Date().toISOString(),
      message: '回饋已收到，感謝你的意見。',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HomeTrust-Feedback] Failed to save feedback:', errorMessage);

    return {
      success: false,
      timestamp: new Date().toISOString(),
      message: '回饋暫時未能保存，請稍後重試。',
    };
  }
}

/**
 * 自動分類回饋（基於關鍵字）
 */
export function autoClassifyFeedback(message: string): FeedbackCategory {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('不準') ||
    lowerMessage.includes('不對') ||
    lowerMessage.includes('錯誤')
  ) {
    return 'CONTENT_ACCURACY';
  }

  if (
    lowerMessage.includes('功能') ||
    lowerMessage.includes('建議') ||
    lowerMessage.includes('想要')
  ) {
    return 'FEATURE_SUGGESTION';
  }

  if (
    lowerMessage.includes('操作') ||
    lowerMessage.includes('不好用') ||
    lowerMessage.includes('複雜')
  ) {
    return 'USABILITY';
  }

  if (
    lowerMessage.includes('畫面') ||
    lowerMessage.includes('顯示') ||
    lowerMessage.includes('排版')
  ) {
    return 'DISPLAY';
  }

  if (
    lowerMessage.includes('慢') ||
    lowerMessage.includes('卡') ||
    lowerMessage.includes('延遲')
  ) {
    return 'SPEED';
  }

  return 'OTHER';
}

/**
 * 取得回饋統計（後台只讀）
 */
export async function getFeedbackStats(): Promise<FeedbackStats> {
  try {
    const stats = await queryFeedbackStats();

    return stats;
  } catch (error) {
    console.error('[HomeTrust-Feedback] Failed to get stats:', error);

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
 * 更新回饋狀態（後台用）
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): Promise<boolean> {
  try {
    // TODO: 更新資料庫
    // UPDATE home_feedback
    // SET status = ?, updated_at = CURRENT_TIMESTAMP
    // WHERE id = ?

    console.log(
      `[HomeTrust-Feedback] Updated feedback ${feedbackId} to ${status}`
    );

    return true;
  } catch (error) {
    console.error('[HomeTrust-Feedback] Failed to update status:', error);
    return false;
  }
}

/**
 * 模擬資料庫操作
 */

let mockFeedbackDatabase: HomeFeedback[] = [];

function generateFeedbackId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function persistFeedbackToDatabase(feedback: HomeFeedback): Promise<void> {
  // 模擬資料庫延遲
  await new Promise(resolve => setTimeout(resolve, 50));

  mockFeedbackDatabase.push(feedback);

  console.log(
    `[HomeTrust-Feedback] Saved feedback: ${feedback.id} (${feedback.vote})`
  );
}

async function queryFeedbackStats(): Promise<FeedbackStats> {
  await new Promise(resolve => setTimeout(resolve, 50));

  const byCategory: Record<FeedbackCategory, number> = {
    CONTENT_ACCURACY: 0,
    FEATURE_SUGGESTION: 0,
    USABILITY: 0,
    DISPLAY: 0,
    SPEED: 0,
    OTHER: 0,
  };

  const byStatus: Record<FeedbackStatus, number> = {
    NEW: 0,
    REVIEWED: 0,
    ACTIONED: 0,
    ARCHIVED: 0,
  };

  let agreeCount = 0;
  let disagreeCount = 0;

  for (const feedback of mockFeedbackDatabase) {
    if (feedback.vote === 'AGREE') agreeCount++;
    if (feedback.vote === 'DISAGREE') disagreeCount++;

    if (feedback.category) byCategory[feedback.category]++;
    byStatus[feedback.status]++;
  }

  return {
    totalFeedback: mockFeedbackDatabase.length,
    agreeCount,
    disagreeCount,
    byCategory,
    byStatus,
    unreviewed: byStatus['NEW'],
  };
}
