/**
 * 首頁信任統計系統 — 資料型別定義
 *
 * 版本：HOME_TRUST_COUNTERS_V2
 *
 * 三個獨立計數功能：
 * - 認同 (agree)
 * - 不認同 (disagree)
 * - 累計瀏覽次數 (view)
 *
 * 共用同一個後端資料源
 */

/**
 * 首頁信任計數器資料
 *
 * Source of Truth：後端資料庫
 * 不得存儲在前端 localStorage/sessionStorage
 */
export interface HomeTrustCounters {
  agreeCount: number;
  disagreeCount: number;
  viewCount: number;
  updatedAt: string;
}

/**
 * 計數器類型
 */
export type CounterType = 'agree' | 'disagree' | 'view';

/**
 * 計數操作結果
 */
export interface IncrementResult {
  success: boolean;
  counters: HomeTrustCounters;
  timestamp: string;
  requestId: string;
}

/**
 * 計數操作失敗
 */
export interface IncrementError {
  type: 'AGREE_INCREMENT_FAILED' | 'DISAGREE_INCREMENT_FAILED' | 'VIEW_INCREMENT_FAILED';
  timestamp: string;
  requestId: string;
  previousValue: number;
  httpStatus?: number;
  reason: string;
}

/**
 * 健康檢查結果
 */
export interface HealthCheckResult {
  AGREE_READ: 'PASS' | 'FAIL';
  AGREE_WRITE: 'PASS' | 'FAIL';
  DISAGREE_READ: 'PASS' | 'FAIL';
  DISAGREE_WRITE: 'PASS' | 'FAIL';
  VIEW_READ: 'PASS' | 'FAIL';
  VIEW_WRITE: 'PASS' | 'FAIL';
  DATABASE: 'PASS' | 'FAIL';
  CROSS_DEVICE: 'PASS' | 'FAIL';
  MONOTONIC: 'PASS' | 'FAIL';
  overallStatus: 'PASSED' | 'FAILED';
}

/**
 * 資料庫記錄
 */
export interface HomeTrustCountersRecord {
  id: string; // 固定為 "home"
  agree_count: number;
  disagree_count: number;
  view_count: number;
  updated_at: string;
}

/**
 * 鐵律：所有計數必須單調遞增（Monotonic Counter）
 *
 * 新值必須 >= 舊值
 * 正常操作只允許 +1
 * 禁止 -1、reset、倒退
 */
export const MONOTONIC_COUNTER_RULES = {
  canIncrement: (oldValue: number, newValue: number): boolean => {
    return newValue >= oldValue && (newValue === oldValue || newValue === oldValue + 1);
  },

  isValidIncrement: (oldValue: number, newValue: number): boolean => {
    return newValue === oldValue + 1;
  },
} as const;

/**
 * API 端點定義
 */
export const COUNTERS_API_ENDPOINTS = {
  GET_COUNTERS: '/api/home-trust',
  INCREMENT_AGREE: '/api/home-trust/agree',
  INCREMENT_DISAGREE: '/api/home-trust/disagree',
  INCREMENT_VIEW: '/api/home-trust/view',
  HEALTH_CHECK: '/api/home-trust/health',
} as const;

/**
 * 正式前端文字（永久固定）
 */
export const COUNTER_LABELS = {
  agree: '認同',
  disagree: '不認同',
  view: '累計瀏覽次數',
  agreeButton: '👍 我認同',
  disagreeButton: '👎 我不認同',
  note: '每次點選都會累加；數字只增不減',
} as const;

/**
 * 禁止文字（永久禁止）
 */
export const FORBIDDEN_LABELS = [
  '認同 714 人',
  '不認同 74 人',
  '累計瀏覽人數',
  '每來一位朋友，就加 1 人',
] as const;
