/**
 * 鬼魅阿修羅 API 錯誤碼（穩定、可供前端分支；訊息一律繁體中文、不含堆疊或內部細節）。
 *
 * 回應信封（POST /api/ghost-asura/reading）：
 *   成功 200 → { data: AsuraDisplay }
 *   失敗 4xx → { error: string, code: AsuraErrorCode }
 * `error` 字串與先前版本相同（前端／韓文對照表以原字串對應），`code` 為新增欄位。
 */

export type AsuraErrorCode =
  | 'ASURA_FORBIDDEN_ORIGIN'
  | 'ASURA_EMPTY_BODY'
  | 'ASURA_BODY_TOO_LARGE'
  | 'ASURA_INVALID_JSON'
  | 'ASURA_MISSING_BIRTH_DATE'
  | 'ASURA_INVALID_BIRTH_DATE'
  | 'ASURA_INVALID_BIRTH_TIME'
  | 'ASURA_MISSING_GENDER'
  | 'ASURA_RATE_LIMITED'
  | 'ASURA_CHART_FAILED';

export interface AsuraErrorBody {
  /** 繁體中文、可直接顯示的訊息 */
  error: string;
  /** 穩定錯誤碼 */
  code: AsuraErrorCode;
}

/** 固定訊息（不含動態內容的錯誤）。 */
export const ASURA_ERROR_MESSAGE: Readonly<Record<Exclude<AsuraErrorCode, 'ASURA_RATE_LIMITED'>, string>> = {
  ASURA_FORBIDDEN_ORIGIN: '請從本站開啟。',
  ASURA_EMPTY_BODY: '請先填寫生辰。',
  ASURA_BODY_TOO_LARGE: '輸入內容過長。',
  ASURA_INVALID_JSON: '請求格式不正確。',
  ASURA_MISSING_BIRTH_DATE: '缺少出生日期。',
  ASURA_INVALID_BIRTH_DATE: '請輸入 1901 年起至今天的有效出生日期。',
  ASURA_INVALID_BIRTH_TIME: '請補齊出生時辰，才能排出完整八字與紫微命盤。',
  ASURA_MISSING_GENDER: '請選擇排盤性別。',
  ASURA_CHART_FAILED: '出生資料無法排盤。',
};

/**
 * 排盤引擎（lib/dual-chart.ts）既有的輸入驗證訊息 → 錯誤碼。訊息原樣回給前端（相容既有對照表）。
 * 不在此表的例外一律視為 ASURA_CHART_FAILED，只回固定訊息，不外洩 error.message／堆疊。
 */
const ENGINE_INPUT_MESSAGES: ReadonlyArray<readonly [string, AsuraErrorCode]> = [
  ['請填寫完整國曆出生日期。', 'ASURA_INVALID_BIRTH_DATE'],
  ['請輸入 1901 年起至今天的有效出生日期。', 'ASURA_INVALID_BIRTH_DATE'],
  ['請補齊出生時辰，才能排出完整八字與紫微命盤。', 'ASURA_INVALID_BIRTH_TIME'],
  ['請選擇排盤性別。', 'ASURA_MISSING_GENDER'],
];

/** 固定訊息錯誤的回應主體。 */
export function asuraError(code: Exclude<AsuraErrorCode, 'ASURA_RATE_LIMITED'>): AsuraErrorBody {
  return { error: ASURA_ERROR_MESSAGE[code], code };
}

/** 速率限制的回應主體（訊息含等待分鐘數）。 */
export function asuraRateLimited(resetSeconds: number): AsuraErrorBody {
  const minutes = Math.max(1, Math.ceil(resetSeconds / 60));
  return { error: `戰局開得太密。刀先歇著，約 ${minutes} 分鐘後再來。`, code: 'ASURA_RATE_LIMITED' };
}

/** 排盤時拋出的例外 → 安全的 4xx 主體：已知輸入錯誤保留原訊息，其餘一律固定訊息。 */
export function classifyAsuraComputeError(error: unknown): AsuraErrorBody {
  const message = error instanceof Error ? error.message : '';
  const known = ENGINE_INPUT_MESSAGES.find(([text]) => text === message);
  if (known) return { error: known[0], code: known[1] };
  return asuraError('ASURA_CHART_FAILED');
}
