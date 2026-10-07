/**
 * 首頁信任統計 + 私密意見回饋系統 — 回饋資料型別
 *
 * 版本：HOME_TRUST_FEEDBACK_SYSTEM_V3
 *
 * 鐵律：
 * - 回饋系統與計數系統完全分離
 * - 回饋 API 失敗不影響計數
 * - 所有意見私密保存，不公開
 * - 使用者匿名
 */

/**
 * 投票類型
 */
export type FeedbackVote = 'AGREE' | 'DISAGREE';

/**
 * 回饋狀態
 */
export type FeedbackStatus = 'NEW' | 'REVIEWED' | 'ACTIONED' | 'ARCHIVED';

/**
 * 回饋分類
 */
export type FeedbackCategory =
  | 'CONTENT_ACCURACY'      // 內容準確度
  | 'FEATURE_SUGGESTION'    // 功能建議
  | 'USABILITY'             // 操作體驗
  | 'DISPLAY'               // 畫面問題
  | 'SPEED'                 // 速度問題
  | 'OTHER';                // 其他

/**
 * 設備類型
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * 首頁回饋記錄
 */
export interface HomeFeedback {
  // 唯一識別
  id: string;

  // 投票
  vote: FeedbackVote;

  // 使用者留言（可選）
  message: string;

  // 自動或人工分類
  category?: FeedbackCategory;

  // 狀態追蹤
  status: FeedbackStatus;

  // 時間戳
  createdAt: string;

  // 頁面識別（可選）
  page?: string;

  // 設備類型（只記錄：mobile/tablet/desktop）
  deviceType?: DeviceType;

  // 是否允許聯絡（預設 false）
  allowContact?: boolean;
}

/**
 * 回饋提交請求
 */
export interface FeedbackSubmitRequest {
  vote: FeedbackVote;
  message?: string;
  category?: FeedbackCategory;
  deviceType?: DeviceType;
  allowContact?: boolean;
}

/**
 * 回饋提交結果
 */
export interface FeedbackSubmitResult {
  success: boolean;
  feedbackId?: string;
  timestamp: string;
  message: string;
}

/**
 * 回饋統計（後台用）
 */
export interface FeedbackStats {
  totalFeedback: number;
  agreeCount: number;
  disagreeCount: number;
  byCategory: Record<FeedbackCategory, number>;
  byStatus: Record<FeedbackStatus, number>;
  unreviewed: number;
}

/**
 * 禁止蒐集：
 * - 真實姓名
 * - 電話
 * - 精確位置
 * - 身份資料
 *
 * 只保存改善產品所需最少資訊
 */

/**
 * 溫暖文案
 */
export const FEEDBACK_MESSAGES = {
  AGREE_PROMPT:
    '謝謝你的認同。\n如果你願意，也可以告訴我們哪裡做得好，\n你的回饋會幫助我們繼續做好。',

  DISAGREE_PROMPT:
    '謝謝你願意告訴我們。\n如果有哪裡不準、不好用，或你覺得可以更好，\n都歡迎直接告訴我們。\n我們會認真看。',

  MESSAGE_PLACEHOLDER:
    '想告訴我們哪裡可以更好嗎？可以直接寫。',

  SUCCESS:
    '收到，謝謝你願意留下意見。\n好的我們會珍惜，不好的我們會改進。',

  FAILURE:
    '留言暫時沒有送成功，可以再試一次。',

  QUICK_OPTIONS_DISAGREE: [
    '內容不準',
    '看不懂',
    '操作不好用',
    '手機顯示有問題',
    '速度太慢',
    '其他',
  ],
} as const;

/**
 * 鐵律：
 *
 * 認同：我們感謝。
 * 不認同：我們也感謝。
 *
 * 因為：
 * 認同告訴我們什麼做對了。
 * 不認同告訴我們哪裡還可以更好。
 *
 * 所以：
 * 數字負責累計。
 * 留言負責改善。
 * 前台保持簡單。
 * 後台保留真正有用的意見。
 * 不要公開留言板。
 * 不要因為收到負面回饋就阻擋使用者。
 */
