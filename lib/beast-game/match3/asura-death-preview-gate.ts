/**
 * 阿修羅死亡動畫預覽頁（/beast-game/asura-death-preview）與其 API 的開關。
 * - 正式環境（NODE_ENV=production）預設關閉 → 頁面 notFound()、API 回 404。
 * - 開發環境預設開啟。
 * - 明確環境變數：ASURA_DEATH_PREVIEW=1 強制開啟（例如 staging 驗收）；ASURA_DEATH_PREVIEW=0 強制關閉。
 * 只在伺服端讀（route handler／server component），執行時判斷，不在建置時寫死。
 */
export function asuraDeathPreviewEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  const flag = env.ASURA_DEATH_PREVIEW?.trim();
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return env.NODE_ENV !== 'production';
}