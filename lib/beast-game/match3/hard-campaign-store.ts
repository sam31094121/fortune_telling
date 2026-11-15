import { emptyTreasureBook, validateTreasureBook, type TreasureBook } from './treasures';
import { campaignWin, chooseCampaignHero, enhanceCampaignProfile, newCampaign, parseCampaign, validateCampaignTeam, type HardCampaign, type CampaignReward, type EnhancementReceipt } from './hard-campaign';
import { readMatch3Progress } from './progress-store';
import { decodeCampaignBackup, encodeCampaignBackup } from './campaign-backup';
import { applyFeed, feedChainEnabled, planFeedToCap, type FeedContext, type FeedPreview, type FeedToCapPlan } from './feed-chain';
export type CampaignOwner = 'self' | 'guest';
export interface CampaignResult { ok: boolean; profile: HardCampaign | null; error?: string }
export interface CampaignSettlement extends CampaignResult { saved: boolean; reward?: CampaignReward; nextWins?: number; duplicate?: boolean }
const keys = { self: 'match3-hard-campaign-self-v1', guest: 'match3-hard-campaign-guest-v1' };
const storage = (owner: CampaignOwner): Storage => {
  if (typeof window === 'undefined' || (owner !== 'self' && owner !== 'guest')) throw new Error('請先選擇我自己或親朋好友');
  return owner === 'self' ? window.localStorage : window.sessionStorage;
};
const failed = (error: unknown): CampaignResult => ({ ok: false, profile: null, error: error instanceof Error && /[\u3400-\u9fff]/.test(error.message) ? error.message : '暫時無法讀取或儲存寶珠進度，請確認瀏覽器允許儲存後重試' });
export function readCampaign(owner: CampaignOwner): CampaignResult {
  try { const raw = storage(owner).getItem(keys[owner]); return { ok: true, profile: raw === null ? newCampaign(readMatch3Progress(owner)) : parseCampaign(raw) }; }
  catch (e) { return failed(e); }
}
function write(owner: CampaignOwner, p: HardCampaign): CampaignResult {
  try { const store = storage(owner), raw = JSON.stringify(p); store.setItem(keys[owner], raw); if (store.getItem(keys[owner]) !== raw) throw new Error('儲存未確認，請重試'); return { ok: true, profile: p }; }
  catch (e) { return failed(e); }
}
function selectCampaignHeroUnlocked(owner: CampaignOwner, heroId: string): CampaignResult {
  const result = readCampaign(owner); if (!result.ok || !result.profile) return result;
  try { return write(owner, chooseCampaignHero(result.profile, heroId)); } catch (e) { return failed(e); }
}
function saveCampaignTeamUnlocked(owner: CampaignOwner, ids: readonly string[]): CampaignResult {
  const result = readCampaign(owner); if (!result.ok || !result.profile) return result;
  if (!validateCampaignTeam(result.profile, ids)) return failed(new Error('請選擇主角及四張已解鎖夥伴'));
  return write(owner, { ...result.profile, teamIds: [...ids] });
}
function settleWinUnlocked(owner: CampaignOwner, matchId: string, winsAtStart: number): CampaignSettlement {
  const current = readCampaign(owner); if (!current.ok || !current.profile) return { ...current, saved: false };
  try {
    const next = campaignWin(current.profile, matchId, winsAtStart);
    // Existing receipt is already read from durable storage; never mint another copy.
    const result = next.duplicate ? current : write(owner, owner === 'guest' ? { ...next.profile, treasures: emptyTreasureBook() } : next.profile);
    return result.ok ? { ...result, saved: true, reward: next.reward, nextWins: next.profile.wins, duplicate: next.duplicate } : { ...result, saved: false };
  } catch (e) { return { ...failed(e), saved: false }; }
}
function resetGuestCampaignUnlocked(): CampaignResult { return write('guest', newCampaign()); }

/** Serialize every self mutation across tabs; do not claim safety without a lock. */
async function transaction<T extends CampaignResult>(owner: CampaignOwner, action: () => T, failure: (e: unknown) => T): Promise<T> {
  try {
    storage(owner);
    if (typeof navigator !== 'undefined' && navigator.locks?.request) return await navigator.locks.request(keys[owner], action);
    if (owner === 'guest') return action();
    throw new Error('此瀏覽器暫不支援安全儲存，請使用支援的瀏覽器重試');
  } catch (e) { return failure(e); }
}
export const selectCampaignHero = (owner: CampaignOwner, heroId: string): Promise<CampaignResult> => transaction(owner, () => selectCampaignHeroUnlocked(owner, heroId), failed);
export const saveCampaignTeam = (owner: CampaignOwner, ids: readonly string[]): Promise<CampaignResult> => transaction(owner, () => saveCampaignTeamUnlocked(owner, ids), failed);
export const resetGuestCampaign = (): Promise<CampaignResult> => transaction('guest', resetGuestCampaignUnlocked, failed);
export const settleWin = (owner: CampaignOwner, matchId: string, winsAtStart: number): Promise<CampaignSettlement> => transaction(owner, () => settleWinUnlocked(owner, matchId, winsAtStart), e => ({ ...failed(e), saved: false }));
export interface CampaignEnhancementResult extends CampaignResult { receipt?: EnhancementReceipt; duplicate?: boolean }
export const enhanceCampaign = (owner: CampaignOwner, operationId: string, youngId: string, targetId: string): Promise<CampaignEnhancementResult> => transaction(owner, () => {
  const current = readCampaign(owner);
  if (!current.ok || !current.profile) return current;
  const next = enhanceCampaignProfile(current.profile, operationId, youngId, targetId);
  const result = next.duplicate ? current : write(owner, next.profile);
  return result.ok ? { ...result, receipt: next.receipt, duplicate: next.duplicate } : result;
}, failed);

/** 餵食鏈（feed-chain.ts）：開關關閉時不讀不寫。只給 UI 拿「預覽當下」的原始存檔字串，確認時比對。 */
export function readCampaignSnapshot(owner: CampaignOwner): string | null {
  try { return storage(owner).getItem(keys[owner]); } catch { return null; }
}
export interface CampaignFeedResult extends CampaignResult { preview?: FeedPreview | null; duplicate?: boolean }
/** 同一把跨分頁鎖內：重讀最新存檔→同一 operationId 重送視為重複→存檔已被別的分頁改過就拒絕並要求重讀→同一套規則再檢查→寫入。 */
export const feedCampaignChain = (owner: CampaignOwner, operationId: string, materialRef: string, targetId: string, expectedSnapshot: string | null, ctx: FeedContext): Promise<CampaignFeedResult> => transaction(owner, (): CampaignFeedResult => {
  if (!(ctx.enabled ?? feedChainEnabled())) return failed(new Error('餵食鏈尚未開放'));
  const current = readCampaign(owner);
  if (!current.ok || !current.profile) return current;
  const isDuplicate = (current.profile.chainReceipts ?? []).some(r => r.operationId === operationId) || (current.profile.enhancementReceipts ?? []).some(r => r.operationId === operationId);
  if (!isDuplicate && storage(owner).getItem(keys[owner]) !== expectedSnapshot) return failed(new Error('存檔已在別處變更，請重新讀取後再確認'));
  const next = applyFeed(current.profile, operationId, materialRef, targetId, ctx);
  const result = next.duplicate ? current : write(owner, next.profile);
  return result.ok ? { ...result, preview: next.preview, duplicate: next.duplicate } : result;
}, failed);

export interface CampaignFeedToCapResult extends CampaignResult { plan?: FeedToCapPlan; duplicate?: boolean }
/**
 * PLAN-v2 B3 一鍵吃到封頂：同一把跨分頁鎖內重讀→重新規劃→必須和玩家看到的預覽一模一樣（材料順序相同）才寫入，
 * 否則拒絕並要求重新預覽。整批一次寫入；同一 operationId 重送視為重複，不會多扣卡。
 */
export const feedCampaignToCap = (owner: CampaignOwner, operationId: string, targetId: string, expectedRefs: readonly string[], ctx: Omit<FeedContext, 'inBattle'> = {}): Promise<CampaignFeedToCapResult> => transaction(owner, (): CampaignFeedToCapResult => {
  if (!operationId.trim() || operationId.length > 150) return failed(new Error('強化操作識別無效'));
  const current = readCampaign(owner);
  if (!current.ok || !current.profile) return current;
  const enabled = ctx.enabled ?? feedChainEnabled();
  const first = operationId + ':0';
  const done = (current.profile.enhancementReceipts ?? []).some(r => r.operationId === first) || (current.profile.chainReceipts ?? []).some(r => r.operationId === first) || (current.profile.resonanceReceipts ?? []).some(r => r.operationId === first);
  if (done) return { ...current, duplicate: true };
  const plan = planFeedToCap(current.profile, targetId, { ...ctx, enabled });
  if (!plan.steps.length) return failed(new Error(plan.reason ?? '目前沒有能放進去的材料'));
  if (plan.steps.length !== expectedRefs.length || plan.steps.some((st, i) => st.materialRef !== expectedRefs[i])) return failed(new Error('材料或進度已在別處變更，請重新預覽後再確認'));
  let next = current.profile;
  try {
    plan.steps.forEach((st, i) => {
      const id = operationId + ':' + i;
      next = enabled ? applyFeed(next, id, st.materialRef, targetId, { ...ctx, enabled: true, inBattle: false }).profile : enhanceCampaignProfile(next, id, st.materialCardId, targetId).profile;
    });
    parseCampaign(JSON.stringify(next));
  } catch (e) { return failed(e); }
  const result = write(owner, next);
  return result.ok ? { ...result, plan, duplicate: false } : result;
}, failed);

function legacyWins(): number {
  const raw = window.sessionStorage.getItem('match3-hard-progress');
  if (raw === null || !/^\d+(?:\.\d+)?$/.test(raw.trim())) return 0;
  const wins = Math.floor(Number(raw));
  return Number.isSafeInteger(wins) && wins > 0 ? wins : 0;
}
/** Unlabelled legacy progress is never silently assigned to the current owner. */
export function readLegacyCampaignStatus(): { canImport: boolean; legacyWins: number; error?: string } {
  try {
    const absent = storage('self').getItem(keys.self) === null;
    const wins = legacyWins();
    return { canImport: absent && wins > 0, legacyWins: wins };
  } catch (e) { return { canImport: false, legacyWins: 0, error: failed(e).error }; }
}
/** Only call after an explicit customer claim; existing profiles are untouched. */
export const importLegacyCampaign = (): Promise<CampaignResult> => transaction('self', () => {
  const state = readLegacyCampaignStatus();
  if (!state.canImport) return failed(new Error('目前沒有可認領的舊進度'));
  const own = readCampaign('self');
  if (!own.ok || !own.profile) return own;
  return write('self', newCampaign(Math.max(own.profile.wins, state.legacyWins)));
}, failed);

/** A file transfer, not cloud sync. Never export guest or an unsaved migration. */
export function exportCampaignBackup(owner: CampaignOwner): { ok: boolean; backup?: string; error?: string } {
  try {
    if (owner !== 'self') throw new Error('只有自己的已儲存進度可以備份');
    const raw = storage(owner).getItem(keys.self);
    if (raw === null) throw new Error('目前沒有已儲存的寶珠存檔可備份');
    return { ok: true, backup: encodeCampaignBackup(parseCampaign(raw)) };
  } catch (e) { return { ok: false, error: failed(e).error }; }
}
/** Recheck destination while holding the same lock as every campaign mutation. */
export const importCampaignBackup = (owner: CampaignOwner, raw: string): Promise<CampaignResult> => transaction(owner, () => {
  if (owner !== 'self') throw new Error('親朋好友模式不能匯入自己的存檔');
  const store = storage(owner);
  if (store.getItem(keys.self) !== null || store.getItem('match3-hard-progress-self-v1') !== null) throw new Error('這個瀏覽器已有自己的進度，不能覆蓋或合併。請改用沒有存檔的瀏覽器。');
  const profile = decodeCampaignBackup(raw);
  return write(owner, profile);
}, failed);

/** Hold the owner lock across request and durable save; no display before save acknowledgement. */
export async function transactTreasures<T>(owner: CampaignOwner, run: (book: TreasureBook) => Promise<{ book: TreasureBook; result: T }>): Promise<T> {
  const execute = async () => {
    const current = readCampaign(owner);
    if (!current.ok || !current.profile) throw new Error(current.error ?? '暫時無法讀取寶器');
    const next = await run(current.profile.treasures ?? emptyTreasureBook());
    const saved = write(owner, { ...current.profile, treasures: validateTreasureBook(next.book) });
    if (!saved.ok) throw new Error(saved.error ?? '寶器尚未保存，請重試');
    return next.result;
  };
  storage(owner);
  if (typeof navigator !== 'undefined' && navigator.locks?.request) return navigator.locks.request(keys[owner], execute);
  if (owner === 'guest') return execute();
  throw new Error('此瀏覽器暫不支援安全儲存，請使用支援的瀏覽器重試');
}
