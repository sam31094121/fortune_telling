import { emptyTreasureBook, validateTreasureBook, type TreasureBook } from './treasures';
import { sharedRequest, sharedWalletHeaders, refreshSharedCultivation } from '../../beast-cultivation-client';
import { campaignWin, chooseCampaignHero, enhanceCampaignProfile, newCampaign, parseCampaign, validateCampaignTeam, type HardCampaign, type CampaignReward, type EnhancementReceipt } from './hard-campaign';
import { readMatch3Progress } from './progress-store';
import { decodeCampaignBackup, encodeCampaignBackup } from './campaign-backup';
import { salvageCampaign, campaignAhead, campaignWouldChange, localLegacyWins, serverBaselineProfile, legacyProgressWins, LEGACY_PROGRESS_SELF_KEY, LEGACY_CLAIM_MAX_WINS } from './campaign-safety';
import { backupLocal } from '../../beast-local-backup';
export type CampaignOwner = 'self' | 'guest';
export interface CampaignMismatch { localWins: number; serverWins: number }
export interface CampaignResult { ok: boolean; profile: HardCampaign | null; error?: string; mismatch?: CampaignMismatch; notice?: string }
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
/** Store the server-computed guest profile without calculating rewards in the browser. */
export function saveGuestOrbProfile(profile:HardCampaign):void {
  if(!profile?.guestProof)throw new Error('尚未取得親友進度確認');
  const result=write('guest',profile);if(!result.ok)throw new Error(result.error);
}
/** 用伺服器資料覆蓋本機前：內容會改變就先存時間戳記備份；備份失敗就不覆蓋。 */
function writeFromServer(owner: CampaignOwner, p: HardCampaign): CampaignResult {
  try { const old = storage(owner).getItem(keys[owner]); if (old !== null && campaignWouldChange(old, p)) backupLocal('orb-campaign-' + owner, old); }
  catch (e) { return failed(e); }
  return write(owner, p);
}
function selectCampaignHeroUnlocked(owner: CampaignOwner, heroId: string): CampaignResult {
  const result = readCampaign(owner); if (!result.ok || !result.profile) return result;
  try { return write(owner, chooseCampaignHero(result.profile, heroId)); } catch (e) { return failed(e); }
}
function saveCampaignTeamUnlocked(owner: CampaignOwner, ids: readonly string[]): CampaignResult {
  const result = readCampaign(owner); if (!result.ok || !result.profile) return result;
  if (!validateCampaignTeam(result.profile, ids)) return failed(new Error('請選擇主角，可另選最多四張已解鎖夥伴'));
  return write(owner, { ...result.profile, teamIds: [...ids] });
}
function settleWinUnlocked(owner: CampaignOwner, matchId: string, winsAtStart: number): CampaignSettlement {
  const current = readCampaign(owner); if (!current.ok || !current.profile) return { ...current, saved: false };
  if(owner==='guest'&&current.profile.guestProof){const reward=current.profile.receipts.find(r=>r.matchId===matchId);return reward?{...current,saved:true,reward,nextWins:current.profile.wins,duplicate:true}:{...current,ok:false,saved:false,error:'尚未取得後端獎勵確認。'};}
  try {
    const next = campaignWin(current.profile, matchId, winsAtStart);
    // Existing receipt is already read from durable storage; never mint another copy.
    const result = next.duplicate ? current : write(owner, owner === 'guest' ? { ...next.profile, treasures: emptyTreasureBook() } : next.profile);
    return result.ok ? { ...result, saved: true, reward: next.reward, nextWins: next.profile.wins, duplicate: next.duplicate } : { ...result, saved: false };
  } catch (e) { return { ...failed(e), saved: false }; }
}
function resetGuestCampaignUnlocked(): CampaignResult { return write('guest', newCampaign()); }

/** Serialize every self mutation across tabs; do not claim safety without a lock. */
async function transaction<T extends CampaignResult>(owner: CampaignOwner, action: () => T | Promise<T>, failure: (e: unknown) => T): Promise<T> {
  try {
    storage(owner);
    if (typeof navigator !== 'undefined' && navigator.locks?.request) return await navigator.locks.request(owner==='self'?'tdh-beast-collection':keys[owner], action);
    if (owner === 'guest') return action();
    throw new Error('此瀏覽器暫不支援安全儲存，請使用支援的瀏覽器重試');
  } catch (e) { return failure(e); }
}
export const selectCampaignHero = (owner: CampaignOwner, heroId: string): Promise<CampaignResult> => transaction(owner, () => selectCampaignHeroUnlocked(owner, heroId), failed);
export const saveCampaignTeam = (owner: CampaignOwner, ids: readonly string[],ownedEntries?:Record<string,string>): Promise<CampaignResult> => transaction(owner, async () => {
  if(owner==='self'&&sharedWalletHeaders()['x-beast-wallet']){const current=readCampaign(owner);if(!current.profile)return current;const reply=await sharedRequest({type:'ORB_PROFILE',profile:{...current.profile,teamIds:[...ids],ownedEntries:ownedEntries??current.profile.ownedEntries??{}}});if(!validateCampaignTeam(reply.profile,ids))throw new Error('請親選主角，可另選最多四位可出戰夥伴。');return writeFromServer(owner,reply.profile);}
  return saveCampaignTeamUnlocked(owner,ids);
}, failed);
export const resetGuestCampaign = (): Promise<CampaignResult> => transaction('guest', resetGuestCampaignUnlocked, failed);
export const settleWin = (owner: CampaignOwner, matchId: string, winsAtStart: number): Promise<CampaignSettlement> => transaction(owner, async () => {
  if(owner==='self'&&sharedWalletHeaders()['x-beast-wallet']){const current=readCampaign(owner);if(!current.profile)return {...current,saved:false};const reply=await sharedRequest({type:'ORB_PROFILE',profile:current.profile});const reward=reply.profile.receipts.find((r:CampaignReward)=>r.matchId===matchId);if(!reward)throw new Error('本場勝利尚未確認入庫，請重試。');const saved=writeFromServer(owner,reply.profile);if(!saved.ok)return {...saved,saved:false};await refreshSharedCultivation();return {...saved,saved:true,reward,nextWins:reply.profile.wins,duplicate:current.profile.receipts.some(r=>r.matchId===matchId)};}
  return settleWinUnlocked(owner,matchId,winsAtStart);
}, e => ({ ...failed(e), saved: false }));

const conflictOf = (e: unknown): number | null => e instanceof Error && (e as Error & { code?: string }).code === 'ORB_MISMATCH' ? Number((e as Error & { serverWins?: number }).serverWins ?? 0) : null;
const mismatchCopy = (m: CampaignMismatch) => `這個瀏覽器的寶珠存檔（已過 ${m.localWins} 關）和共同卡庫的紀錄（已過 ${m.serverWins} 關）不一樣，多出來的部分系統無法確認。你的存檔沒有被刪除，請選擇要怎麼繼續。`;
/**
 * 讀取自己的進度（共同卡庫為準），但絕不靜默讓本機變少：
 * 1) 共同卡庫勝場 0、沒有任何收據、本機有舊進度 → 一次性舊進度認領（只補關卡，不發卡）。
 * 2) 本機比共同卡庫多 → 不覆蓋，回傳 mismatch 讓客戶選「以伺服器為準」或「保留本機備份」。
 * 3) 其餘情況覆蓋前先備份。
 */
export const refreshSharedCampaign = ():Promise<CampaignResult> => transaction('self',async()=>{
  const current=readCampaign('self');if(!current.profile)return current;
  let reply:{profile:HardCampaign};
  try{reply=await sharedRequest({type:'ORB_PROFILE',profile:current.profile});}
  catch(e){const serverWins=conflictOf(e);if(serverWins===null)throw e;const mismatch={localWins:current.profile.wins,serverWins};return {ok:false,profile:null,mismatch,error:mismatchCopy(mismatch)};}
  const progressRaw=window.localStorage.getItem(LEGACY_PROGRESS_SELF_KEY);
  const legacy=localLegacyWins(current.profile,progressRaw);
  let notice:string|undefined;
  if(legacy>reply.profile.wins){
    if(reply.profile.wins===0&&!reply.profile.receipts.length){
      try{reply=await sharedRequest({type:'ORB_LEGACY_CLAIM',wins:legacy,profile:{...current.profile,wins:legacy,heroChoiceUsed:current.profile.heroChoiceUsed&&legacy>=8,rewards:[],receipts:[]}});notice=`已把這個瀏覽器的舊進度（第 ${legacy} 關）接回共同卡庫。`;}
      catch(e){notice=`這個瀏覽器還有舊進度（第 ${legacy} 關），這次沒有接回：${e instanceof Error?e.message:'請稍後重試'}`;}
    }else if(current.profile.receipts.length<=reply.profile.receipts.length&&current.profile.wins<=reply.profile.wins)notice=`這個瀏覽器還有舊進度紀錄（第 ${legacy} 關），但共同卡庫已有新的闖關紀錄（第 ${reply.profile.wins} 關），無法自動合併；目前以共同卡庫的進度繼續。`;
  }
  if(campaignAhead(current.profile,reply.profile)){const mismatch={localWins:current.profile.wins,serverWins:reply.profile.wins};return {ok:false,profile:null,mismatch,error:mismatchCopy(mismatch)};}
  const saved=writeFromServer('self',reply.profile);return notice&&saved.ok?{...saved,notice}:saved;
},failed);
/** 客戶選「以伺服器為準」：先把本機存檔存成時間戳記備份，再用共同卡庫的紀錄重建本機存檔（主角保留）。 */
export const adoptServerCampaign = ():Promise<CampaignResult> => transaction('self',async()=>{
  const raw=window.localStorage.getItem(keys.self);
  if(raw!==null)backupLocal('orb-campaign-self',raw);
  const reply=await sharedRequest({type:'ORB_PROFILE',profile:serverBaselineProfile(raw)});
  return write('self',reply.profile);
},failed);
/** 目前本機存檔原文（給「保留本機備份」下載用），不改任何東西。 */
export function rawCampaignSave(owner: CampaignOwner): string | null { try { return storage(owner).getItem(keys[owner]); } catch { return null; } }
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

/** 讀不懂的存檔（格式或紀錄不一致）。只檢查、不改動；不把「瀏覽器不允許儲存」誤判成存檔壞掉。 */
export const UNREADABLE_BACKUP_SUFFIX = '.unreadable-backup';
export function inspectCampaignSave(owner: CampaignOwner): { unreadable: boolean; raw?: string; backupSaved?: boolean } {
  try {
    const store = storage(owner), raw = store.getItem(keys[owner]);
    if (raw === null) return { unreadable: false };
    try { parseCampaign(raw); return { unreadable: false }; } catch { return { unreadable: true, raw, backupSaved: store.getItem(keys[owner] + UNREADABLE_BACKUP_SUFFIX) === raw }; }
  } catch { return { unreadable: false }; }
}
/**
 * 修復讀不懂的存檔（業主 2026-11-15：不能先刪）：先把原文存成時間戳記備份與 .unreadable-backup 並確認，
 * 再「搶救」成能讀的版本覆寫（保留勝場、主角、獎卡收據與寶器中還完好的部分），絕不刪除後讓空存檔被帶上共同卡庫。
 * 沒有收據時，勝場取存檔與舊進度鍵的大者；不憑空補發任何獎卡。
 */
export const repairUnreadableCampaign = (owner: CampaignOwner): Promise<CampaignResult & { level?: string }> => transaction(owner, () => {
  const store = storage(owner), raw = store.getItem(keys[owner]);
  if (raw === null) return readCampaign(owner);
  try { parseCampaign(raw); return readCampaign(owner); } catch { /* 確認是壞檔才修 */ }
  const backup = keys[owner] + UNREADABLE_BACKUP_SUFFIX;
  store.setItem(backup, raw);
  if (store.getItem(backup) !== raw) throw new Error('原存檔備份尚未確認，沒有做任何更動，請重試');
  if (owner === 'self') backupLocal('orb-campaign-self', raw);
  const legacy = owner === 'self' ? Math.min(legacyProgressWins(store.getItem(LEGACY_PROGRESS_SELF_KEY)), LEGACY_CLAIM_MAX_WINS) : 0;
  const { profile, level } = salvageCampaign(raw, legacy);
  const fixed = !profile.receipts.length && legacy > profile.wins ? { ...profile, wins: legacy, heroChoiceUsed: profile.heroChoiceUsed && legacy >= 8 } : profile;
  const saved = write(owner, fixed);
  return saved.ok ? { ...saved, level } : saved;
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
  if (typeof navigator !== 'undefined' && navigator.locks?.request) return navigator.locks.request(owner==='self'?'tdh-beast-collection':keys[owner], execute);
  if (owner === 'guest') return execute();
  throw new Error('此瀏覽器暫不支援安全儲存，請使用支援的瀏覽器重試');
}
