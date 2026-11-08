'use client';

import { cardFusionChoices, requireFusionCopies, commitOwnedFusion, fusionReceiptDisplay, withCollectionCampaign, clearCollectionCampaignPending } from './beast-game/card-campaign-fusion';
import type { CardEnhancementReceipt } from './beast-game/card-campaign';
export { cardFusionChoices, fusionReceiptDisplay } from './beast-game/card-campaign-fusion';
import { deriveUnlockedMansions, gameCardIdsForMansion } from './beast-growth-rewards';
import { creditBattleReward, exchangeShards, grantGrowthCards, grantStarterPack, migrateCollection, reserveCard, reserveOwnedStakes, settleCard, shardSummary, type BeastCollection, type CollectionReceipt, type ShardReceipt, type StakeOutcome } from './beast-collection-ledger';
import type { BattleReward, ShardExchangeKind } from './beast-game/battle-reward';
export type { BeastCollection, CollectionEntry, CollectionHistoryItem, CollectionReceipt } from './beast-collection-ledger';

const COLLECTION_KEY = 'tdh_beast_collection_v1';
const JOURNAL_KEY = 'tdh_beast_duel_pending_v1';
export const COLLECTION_UPDATED = 'tdh-beast-collection-updated';
export const COLLECTION_STORAGE_NOTICE = '收藏保存在此瀏覽器；換手機或清除網站資料不會保留。';
const LOCK = 'tdh-beast-collection';
/*
  困難戰場「進行中的一場」（2026-10-19 業主定調：重新整理後接續原戰局，押注卡繼續押著）。
  存 localStorage，不用 sessionStorage：iOS／LINE 內建瀏覽器關掉分頁或被系統回收後 sessionStorage 會消失，
  那等於「關掉重開就能把押注卡拿回來」。押注保留（pending）本來就在 localStorage，兩者放在同一處才一致。
  後端簽名票才是真相；這裡只是把票帶回去。過期或驗章失敗才照舊退回押注卡。
*/
const LIVE_BATTLE_KEY = 'tdh_beast_field_live_v1';
/** 與後端 BATTLE_SESSION_MAX_AGE_MS 相同（12 小時）；後端仍會再驗一次。 */
export const LIVE_BATTLE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export interface LiveBattle { v: 1; matchId: string; token: string; startedAt: number; savedAt: number; stakeCardId: string | null; table: unknown; campaignToken?:string; campaignWins?:number }
/** 頁面離開（非結算）時用這個錯誤中斷等待：押注卡繼續押著，回來接續。 */
export const BATTLE_HELD = 'BATTLE_HELD';
const isHeld = (error: unknown) => error instanceof Error && error.name === BATTLE_HELD;
const EMPTY: BeastCollection = { cards: [], history: [], granted: [], receipts: {} };
const now = () => new Date().toISOString();

function readJson(key: string, fallback: unknown): unknown {
  const value = window.localStorage.getItem(key);
  return value ? JSON.parse(value) : fallback;
}

function readStrict(): BeastCollection {
  const current = migrateCollection(readJson(COLLECTION_KEY, EMPTY));
  const earned = deriveUnlockedMansions(
    readJson('tdh_growth_completed_modules_v1', []),
    readJson('tdh_growth_checkin_history_v4', {}),
  ).flatMap(gameCardIdsForMansion);
  return grantGrowthCards(current, earned, now());
}

/** Reading never writes or overwrites corrupt storage. Mutations run under one cross-tab lock. */
export function readCollection(): BeastCollection {
  if (typeof window === 'undefined') return EMPTY;
  try { return readStrict(); } catch {
    return { ...EMPTY, storageError: '收藏資料暫時無法讀取，請勿清除網站資料。' };
  }
}

function write(collection: BeastCollection): void {
  window.localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
  window.dispatchEvent(new Event(COLLECTION_UPDATED));
}

export function subscribeCollection(refresh: () => void): () => void {
  const events = ['storage', 'focus', COLLECTION_UPDATED, 'tdh-growth-progress-updated'];
  events.forEach((event) => window.addEventListener(event, refresh));
  return () => events.forEach((event) => window.removeEventListener(event, refresh));
}

async function exclusive<T>(action: () => Promise<T> | T): Promise<T> {
  // Without a cross-tab lock we cannot promise that two pages won't stake the same copy.
  if (!navigator.locks) throw new Error('這個瀏覽器暫不支援安全押注，請改用新版瀏覽器。');
  return navigator.locks.request(LOCK, { ifAvailable: true }, async (lock) => {
    if (!lock) throw new Error('另一個分頁正在處理這場對戰，請稍後再試。');
    return action();
  });
}

export function readLiveBattle(now = Date.now()): LiveBattle | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = readJson(LIVE_BATTLE_KEY, null) as LiveBattle | null;
    if (!value || value.v !== 1 || typeof value.matchId !== 'string' || typeof value.token !== 'string' || typeof value.startedAt !== 'number') return null;
    return now - value.startedAt > LIVE_BATTLE_MAX_AGE_MS ? null : value;
  } catch { return null; }
}
export function saveLiveBattle(battle: Omit<LiveBattle, 'v' | 'savedAt'>): void {
  if (battle.campaignToken) {
    const current=readStrict();
    if(current.pending?.id!==battle.matchId||battle.campaignWins===undefined||!current.cardCampaign)throw new Error('闖關押卡紀錄不一致，尚未保存。');
    write(withCollectionCampaign(current,battle.campaignToken,battle.campaignWins,true));
  }
  const encoded=JSON.stringify({ v: 1, ...battle, savedAt: Date.now() });
  window.localStorage.setItem(LIVE_BATTLE_KEY,encoded);
  if(battle.campaignToken&&window.localStorage.getItem(LIVE_BATTLE_KEY)!==encoded)throw new Error('戰局尚未保存，請重試。');
}
/** 每一招回來就換成最新的票；只更新同一場。 */
export function updateLiveBattleToken(matchId:string,token:string,strict=false):void {
 let campaign=strict;
 try {
  const current=readJson(LIVE_BATTLE_KEY,null) as LiveBattle|null;campaign ||= !!current?.campaignToken;
  if(current?.matchId!==matchId){if(campaign)throw new Error('戰局保存紀錄不符，請重新接續。');return;}
  const encoded=JSON.stringify({...current,token,savedAt:Date.now()});window.localStorage.setItem(LIVE_BATTLE_KEY,encoded);
  if(campaign&&window.localStorage.getItem(LIVE_BATTLE_KEY)!==encoded)throw new Error('戰局尚未保存，請重試。');
 }catch(error){if(campaign)throw new Error('戰局尚未保存，請重試本次操作。');}
}
export function clearLiveBattle(matchId?: string): void {
  try {
    const current = readJson(LIVE_BATTLE_KEY, null) as LiveBattle | null;
    if (!matchId || !current || current.matchId === matchId) window.localStorage.removeItem(LIVE_BATTLE_KEY);
  } catch { window.localStorage.removeItem(LIVE_BATTLE_KEY); }
}

type AwardResult = { campaignToken?: string; campaign?: { wins:number }; ok: boolean; isReplay?: boolean; stake?: StakeOutcome; error?: string };
export type Settlement = { saved: boolean; receipt: CollectionReceipt | null; matchId: string; error?: string };

/** Caller must hold the lock. Receipts persist independently of trimmed visible history. */
function applyStakeOutcome(matchId: string, outcome: StakeOutcome, campaignToken?:string, campaignWins?:number): Settlement {
  try {
    const current=readStrict();
    if(current.pending?.id===matchId&&current.cardCampaign?.pendingToken&&!campaignToken)throw new Error('闖關終局進度缺失，請重試保存。');
    const result = settleCard(current, matchId, outcome, now());
    if (!result.duplicate) {
      if (campaignToken && campaignWins === undefined) throw new Error('闖關進度回應不完整，請重試保存。');
      const next=campaignToken ? withCollectionCampaign(result.collection,campaignToken,campaignWins!) : result.collection;
      write(next);
      if(campaignToken&&window.localStorage.getItem(COLLECTION_KEY)!==JSON.stringify(next))throw new Error('闖關戰果尚未完整保存，請重試。');
    }
    try { window.localStorage.removeItem(JOURNAL_KEY); } catch { /* Receipt makes recovery idempotent. */ }
    return { saved: true, receipt: result.receipt, matchId };
  } catch (error) {
    return { saved: false, receipt: null, matchId, error: error instanceof Error ? error.message : '收藏尚未保存，請重試。' };
  }
}

/** Reserve a real copy before requesting; settle the API result before playing animations. */
export async function runOwnedDuel<T extends AwardResult>(cardId: string, play: () => Promise<T>, entryId?: string): Promise<{ result: T; settlement: Settlement }> {
  return exclusive(async () => {
    const matchId = crypto.randomUUID();
    write(reserveCard(readStrict(), cardId, matchId, now(), entryId));
    let result: T;
    try {
      result = await play();
      if (!result.ok || !result.stake || result.isReplay) throw new Error(result.error ?? '這場沒有有效戰果，押注卡未扣除。');
    } catch (error) {
      const current = readStrict();
      if (current.pending?.id === matchId) write(clearCollectionCampaignPending({ ...current, pending: null }));
      throw error;
    }
    // Recover after reload/crash between receiving the outcome and storing the collection.
    try { window.localStorage.setItem(JOURNAL_KEY, JSON.stringify({ matchId, result })); } catch { /* Try the atomic ledger write; failures remain pending. */ }
    return { result, settlement: applyStakeOutcome(matchId, result.stake!,result.campaignToken,result.campaign?.wins) };
  });
}

export async function retryStakeSettlement(matchId:string,outcome:StakeOutcome,progress?:{campaignToken:string;wins:number}):Promise<Settlement>{
 return exclusive(()=>{const journal=readJson(JOURNAL_KEY,null) as {matchId:string;result:AwardResult}|null;const result=journal?.matchId===matchId?journal.result:undefined;return applyStakeOutcome(matchId,outcome,result?.campaignToken??progress?.campaignToken,result?.campaign?.wins??progress?.wins);});
}

export async function runOwnedStakesDuel(entryIds:string[],play:(entries:Array<{id:string;cardId:string}>)=>Promise<AwardResult>,expectedCampaignToken?:string):Promise<{result:AwardResult;settlement:Settlement}>{
 return exclusive(async()=>{
  const current=readStrict();
  if(expectedCampaignToken!==undefined&&current.cardCampaign?.token!==expectedCampaignToken)throw new Error('闖關資料已在其他操作更新，請重新確認出戰。');
  const matchId=crypto.randomUUID();const reserved=reserveOwnedStakes(current,entryIds,matchId,now());write(reserved);
  let result:AwardResult;
  try{result=await play(reserved.pending!.entries!);if(!result.ok||!result.stake||result.isReplay)throw new Error(result.error??'沒有有效戰果，沒有扣卡。');}
  catch(e){if(isHeld(e))throw e;const current=readStrict();if(current.pending?.id===matchId)write(clearCollectionCampaignPending({...current,pending:null}));clearLiveBattle(matchId);throw e;}
  try{window.localStorage.setItem(JOURNAL_KEY,JSON.stringify({matchId,result}));}catch{/* Ledger write still attempted; no saved claim on failure. */}
  const settlement=applyStakeOutcome(matchId,result.stake!,result.campaignToken,result.campaign?.wins);if(settlement.saved)clearLiveBattle(matchId);
  return {result,settlement};
 });
}

/**
 * 重新整理後接續同一場：沿用原本的押注保留（同一個 matchId），不重新押、不先退回。
 * 結算一樣走 receipts[matchId]，所以同一場最多結算一次。
 */
export async function resumeOwnedStakesDuel(matchId:string,play:(entries:Array<{id:string;cardId:string}>)=>Promise<AwardResult>):Promise<{result:AwardResult;settlement:Settlement}>{
 return exclusive(async()=>{
  const current=readStrict();
  if(!current.pending||current.pending.id!==matchId||!current.pending.entries)throw new Error('押注紀錄不一致，無法接續上一場。');
  const result=await play(current.pending.entries);
  if(!result.ok||!result.stake)throw new Error(result.error??'沒有有效戰果，押注卡仍保留。');
  try{window.localStorage.setItem(JOURNAL_KEY,JSON.stringify({matchId,result}));}catch{/* Ledger write still attempted. */}
  const settlement=applyStakeOutcome(matchId,result.stake,result.campaignToken,result.campaign?.wins);if(settlement.saved)clearLiveBattle(matchId);
  return {result,settlement};
 });
}

/** 戰局票過期或驗章失敗：照舊退回押注卡（未扣除）。 */
export async function releaseLiveBattle(matchId:string):Promise<void>{
 await exclusive(()=>{const current=readStrict();if(current.pending?.id===matchId)write(clearCollectionCampaignPending({...current,pending:null}));clearLiveBattle(matchId);});
}

/** An interrupted request without a received outcome never confiscates a customer's card. */
export async function recoverPendingDuel<T extends AwardResult>(): Promise<{ result?: T; settlement?: Settlement; interrupted?: boolean; liveBattle?: LiveBattle }> {
  return exclusive(() => {
    const current = readStrict();
    const journal = readJson(JOURNAL_KEY, null) as { matchId: string; result: T } | null;
    if (journal?.result?.stake) {
      const settlement = applyStakeOutcome(journal.matchId, journal.result.stake,journal.result.campaignToken,journal.result.campaign?.wins);
      if (settlement.saved) clearLiveBattle(journal.matchId);
      return { result: journal.result, settlement };
    }
    // 困難戰場還在打的那一場：押注卡繼續押著，交給戰場頁接續（不退回、不重押）。
    const live = readLiveBattle();
    if (current.pending && live && live.matchId === current.pending.id && current.pending.entries) return { liveBattle: live };
    if (current.pending) {
      write(clearCollectionCampaignPending({ ...current, pending: null }));
      clearLiveBattle();
      return { interrupted: true };
    }
    clearLiveBattle();
    return {};
  });
}

export function countByCard(collection: BeastCollection): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of collection.cards) counts.set(entry.cardId, (counts.get(entry.cardId) ?? 0) + 1);
  return counts;
}

export async function clearCollection(): Promise<void> {
  await exclusive(() => {
    const current = readStrict();
    if (current.pending) throw new Error('請先完成上一場結算。');
    write({ ...current, cards: [], history: [] });
  });
}

/**
 * 首戰禮領取。
 * 2026-09-15 正式站實測：新版剛上線時伺服器冷啟動超過 15 秒，客人看到英文「signal timed out」又沒卡可押——斷層。
 * 所以自動重試三次、等待逐次拉長；伺服器回 4xx 重送也沒用就不重試。
 * 重送不會重複發卡：寫入前再看一次帳本，已有首戰禮就結束。失敗訊息一律中文，不把瀏覽器英文原文丟給客人。
 */
export const STARTER_PACK_SLOW_MESSAGE='連線較慢，卡片還沒入庫；按「重試領卡」再送一次，不會重複發卡。';
const STARTER_PACK_TIMEOUTS=[15000,20000,25000];
export async function claimStarterPack(completed:string,profileId:string):Promise<void>{
 if(!navigator.locks)throw new Error('請使用支援安全保存的瀏覽器。');
 await navigator.locks.request(LOCK,async()=>{
  if(readStrict().starterPack)return;
  let lastError=new Error(STARTER_PACK_SLOW_MESSAGE);
  for(const [attempt,timeout] of STARTER_PACK_TIMEOUTS.entries()){
   if(attempt>0)await new Promise(resolve=>setTimeout(resolve,1500));
   let response:Response;let result:{ok?:boolean;receipt?:unknown;error?:string};
   try{
    response=await fetch('/api/beast-game/starter-pack',{method:'POST',headers:{'Content-Type':'application/json','x-growth-profile':profileId},body:JSON.stringify({completed}),signal:AbortSignal.timeout(timeout)});
    result=await response.json();
   }catch{lastError=new Error(STARTER_PACK_SLOW_MESSAGE);continue;}
   if(response.ok&&result.ok&&typeof result.receipt==='string'){
    const current=readStrict();if(current.starterPack)return;
    write(grantStarterPack(current,result.receipt,now()));return;
   }
   lastError=new Error(result.error??'獎勵尚未保存，請按「重試領卡」再送一次。');
   if(response.status<500)break;
  }
  throw lastError;
 });
}

/**
 * 免費戰場戰利碎片（2026-11-08）。後端算好的戰績（BattleReward）由這裡入帳到本機收藏帳本。
 * 同一場只入一次（收據鑰匙）；重新整理、重送都不會多給。入帳失敗要讓客戶看得到並可重試，不假裝已發獎。
 */
export type ShardCreditResult = { saved: boolean; receipt?: ShardReceipt; duplicate?: boolean; summary?: ReturnType<typeof shardSummary>; error?: string };
export async function creditFreeBattleReward(reward: BattleReward): Promise<ShardCreditResult> {
  if (typeof window === 'undefined' || !navigator.locks) return { saved: false, error: '請使用支援安全保存的瀏覽器。' };
  try {
    return await navigator.locks.request(LOCK, async () => {
      const current = readStrict();
      if (current.storageError) throw new Error(current.storageError);
      const credited = creditBattleReward(current, reward, now());
      if (!credited.duplicate) write(credited.collection);
      return { saved: true, receipt: credited.receipt, duplicate: credited.duplicate, summary: shardSummary(credited.collection) };
    });
  } catch (error) {
    return { saved: false, error: error instanceof Error && /[㐀-鿿]/.test(error.message) ? error.message : '戰利碎片尚未保存，請重試。' };
  }
}
export type ShardExchangeResult = { saved: boolean; cardId?: string; summary?: ReturnType<typeof shardSummary>; error?: string };
export async function exchangeFreeBattleShards(kind: ShardExchangeKind): Promise<ShardExchangeResult> {
  if (typeof window === 'undefined' || !navigator.locks) return { saved: false, error: '請使用支援安全保存的瀏覽器。' };
  try {
    return await navigator.locks.request(LOCK, async () => {
      const current = readStrict();
      if (current.storageError) throw new Error(current.storageError);
      const done = exchangeShards(current, kind, now());
      write(done.collection);
      return { saved: true, cardId: done.cardId, summary: shardSummary(done.collection) };
    });
  } catch (error) {
    return { saved: false, error: error instanceof Error && /[㐀-鿿]/.test(error.message) ? error.message : '兌換尚未完成，碎片沒有扣除，請重試。' };
  }
}
/** 給畫面讀目前的碎片摘要（唯讀，不寫入）。 */
export function readShardSummary() { return shardSummary(readCollection()); }

export type OwnedEnhancementResult = {saved:boolean;collection?:BeastCollection;receipt?:CardEnhancementReceipt;display?:ReturnType<typeof fusionReceiptDisplay>;error?:string};
async function campaignRequest(body:Record<string,unknown>) {
 try {
  const response=await fetch('/api/beast-game/battlefield',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const reply=await response.json();
  if(!response.ok||!reply.ok)throw new Error(reply.error??'卡片闖關暫時無法連線，尚未扣卡。');
  return reply;
 }catch(error){if(['TimeoutError','AbortError'].includes(String((error as {name?:string})?.name)))throw new Error('連線逾時，尚未扣卡，請稍後重試。');throw error;}
}
/** Server owns displayed enhancement numbers. Ownership is the existing local ledger boundary. */
export async function previewOwnedCardEnhancement(targetEntryId:string,materialEntryId:string) {
 try {
  const current=readStrict(),{target,material}=requireFusionCopies(current,targetEntryId,materialEntryId);
  const reply=await campaignRequest({type:'ENHANCE',preview:true,campaignToken:current.cardCampaign?.token,target,material});
  if(!reply.preview||typeof reply.preview.allowed!=='boolean')throw new Error('培養預覽回應不完整。');
  return {allowed:reply.preview.allowed as boolean,reason:reply.preview.reason as string|undefined,preview:{...reply.preview,beforeAttack:reply.preview.battleCurrentAttack}};
 }catch(e){return {allowed:false,reason:e instanceof Error?e.message:'暫時無法取得培養預覽。'};}
}
export async function enhanceOwnedCard(operationId:string,targetEntryId:string,materialEntryId:string):Promise<OwnedEnhancementResult> {
 try {return await exclusive(async()=>{
  const current=readStrict(),previous=current.cardCampaign?.fusionReceipts.find(r=>r.operationId===operationId);
  if(previous){if(previous.targetEntryId!==targetEntryId||previous.materialEntryId!==materialEntryId)throw new Error('同一操作不可改用其他副本。');return {saved:true,collection:current,receipt:previous,display:fusionReceiptDisplay(previous)};}
  const {target,material}=requireFusionCopies(current,targetEntryId,materialEntryId);
  const reply=await campaignRequest({type:'ENHANCE',campaignToken:current.cardCampaign?.token,operationId,target,material});
  const result=commitOwnedFusion(current,operationId,targetEntryId,materialEntryId,reply.receipt,reply.campaignToken,reply.campaign?.wins);
  write(result.collection);
  if(window.localStorage.getItem(COLLECTION_KEY)!==JSON.stringify(result.collection))throw new Error('培養尚未完整保存，請重試。');
  return {saved:true,collection:result.collection,receipt:result.receipt,display:fusionReceiptDisplay(result.receipt)};
 });}catch(e){return {saved:false,error:e instanceof Error?e.message:'培養尚未保存，請重試。'};}
}
/** Read and persist the server's current signed campaign without racing fusion or staking. */
export async function readOwnedCardCampaignProgress() {
 return exclusive(async()=>{
  const current=readStrict();if(current.pending)throw new Error('請先接續或結算目前戰鬥。');
  const reply=await campaignRequest({type:'PROGRESS',campaignToken:current.cardCampaign?.token});
  const collection=withCollectionCampaign(current,reply.campaignToken,reply.campaign?.wins);
  write(collection);return {collection,campaign:reply.campaign,campaignToken:reply.campaignToken};
 });
}
