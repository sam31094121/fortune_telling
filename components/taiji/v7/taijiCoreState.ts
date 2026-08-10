/**
 * Taiji Experience Core V7｜狀態機（唯一核心狀態）
 *
 * 每個狀態只能有一個主動畫；Growth Center 直接讀此狀態，不得自建第二套中心。
 */

export type TaijiState =
  | 'IDLE'
  | 'FOCUS'
  | 'EXPAND_TWO'
  | 'EXPAND_FOUR'
  | 'EXPAND_EIGHT'
  | 'ANALYZING'
  | 'RESULT_READY'
  | 'LOW_POWER';

export type TaijiElement = 'SPACE' | 'AIR' | 'WATER' | 'FIRE' | 'EARTH';

export type TaijiAnalysisStatus =
  | 'RECEIVED'
  | 'VERIFYING'
  | 'ANALYZING'
  | 'INTEGRATING'
  | 'QUALITY_CHECK'
  | 'READY';

export interface TaijiCoreState {
  state: TaijiState;
  progress: {
    completed: number;
    total: number;
  };
  /** AI 判定的唯一下一步（例：AI 紫微斗數） */
  nextModule?: string;
  /** 有真實資料才提供；沒有真實資料禁止顯示元素訊號 */
  primaryElement?: TaijiElement;
  elementSignals?: Array<{ element: TaijiElement; percent: number }>;
  analysisStatus?: TaijiAnalysisStatus;
}

export const TAIJI_STATE_FLOW: TaijiState[] = ['IDLE', 'FOCUS', 'EXPAND_TWO', 'EXPAND_FOUR', 'EXPAND_EIGHT'];

export function nextInteractionState(current: TaijiState): TaijiState {
  const index = TAIJI_STATE_FLOW.indexOf(current);
  if (index < 0) return 'IDLE';
  if (index >= TAIJI_STATE_FLOW.length - 1) return 'IDLE';
  return TAIJI_STATE_FLOW[index + 1];
}
