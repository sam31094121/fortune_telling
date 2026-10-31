import { campaignWin, chooseCampaignHero, enhanceCampaignProfile, newCampaign, parseCampaign, validateCampaignTeam, type HardCampaign, type CampaignReward, type EnhancementReceipt } from './hard-campaign';
import { readMatch3Progress } from './progress-store';
import { decodeCampaignBackup, encodeCampaignBackup } from './campaign-backup';
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
    const result = next.duplicate ? current : write(owner, next.profile);
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
