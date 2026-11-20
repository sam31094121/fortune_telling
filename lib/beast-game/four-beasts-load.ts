/**
 * 四大神獸強化頁的讀取流程與讀取錯誤文案（只決定怎麼讀、讀不到怎麼說；不算任何強化資格）。
 * - 先同步共同卡庫（IMPORT／LOCAL_GRANTS）；同步失敗也照樣讀 GET /api/beast-game/four-beasts（之前同步失敗會永遠 ⏳）。
 * - 讀取失敗的畫面文案在這裡對應；伺服器共用錯誤字串不改（扣料流程裡「未扣材料」是對的）。
 */
export const FOUR_BEASTS_READ_ERROR = '卡庫暫時讀不到，稍後再試';
/** 需要客戶自己動手、而且字面照實的訊息才原樣顯示。 */
const PASS_THROUGH = [/找不到這支手機的卡庫識別碼/, /另一分頁正在戰鬥或保存/];

export function fourBeastsReadMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return PASS_THROUGH.some(p => p.test(message)) ? message : FOUR_BEASTS_READ_ERROR;
}

export async function loadFourBeasts<S, V>(sync: () => Promise<S>, get: () => Promise<V>): Promise<{ synced: S | null; view: V | null; error: string | null }> {
  let synced: S | null = null, syncError: unknown = null;
  try { synced = await sync(); } catch (e) { syncError = e; }
  try { return { synced, view: await get(), error: null }; }
  catch (e) {
    const fromSync = syncError ? fourBeastsReadMessage(syncError) : null;
    return { synced, view: null, error: fromSync && fromSync !== FOUR_BEASTS_READ_ERROR ? fromSync : fourBeastsReadMessage(e) };
  }
}
