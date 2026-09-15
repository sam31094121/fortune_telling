/**
 * AI 供應商的原始錯誤不得原封不動丟給客戶。
 *
 * 2026-09-15：Gemini 專案月度花費上限用完，429 的英文訊息
 * （"Your project has exceeded its monthly spending cap…" 連同網址）
 * 直接出現在八字易經老師、鬼魅解盤與紫微娛樂老師的卡片上。
 * 伺服器日誌照樣記原文；回給客戶的只能是看得懂、不嚇人的中文。
 */

const PROVIDER_FAILURE = /RESOURCE_EXHAUSTED|spending cap|quota|rate.?limit|api.?key|PERMISSION_DENIED|UNAVAILABLE|INTERNAL|fetch failed|https?:\/\//i;

export const AI_BUSY_MESSAGE = '老師這一刻比較忙，請稍候一兩分鐘再按一次。';

export function customerSafeAiMessage(error: unknown, fallback: string = AI_BUSY_MESSAGE): string {
  const raw = error instanceof Error ? error.message.trim() : '';
  if (!raw || PROVIDER_FAILURE.test(raw)) return fallback;
  // 自己寫的錯誤訊息都是中文（例如「易經老師解盤逾時」）；中文太少的就是供應商原文。
  const cjk = (raw.match(/[㐀-鿿]/g) ?? []).length;
  return cjk >= raw.length * 0.3 ? raw : fallback;
}
