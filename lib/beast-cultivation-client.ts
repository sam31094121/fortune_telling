'use client';
import type { cultivationView } from './beast-game/cultivation-view';
export type SharedCultivationView=ReturnType<typeof cultivationView>;
const KEY='tdh_beast_wallet_v1',CACHE='tdh_beast_shared_view_v1',COLLECTION='tdh_beast_collection_v1';
import { recoverWalletKey, mirrorWalletKey } from './beast-wallet-recovery';
export const SHARED_UPDATED='tdh-beast-shared-updated';
export const WALLET_LOST_MESSAGE='找不到這支手機的卡庫識別碼（可能被清除了）。請到「存檔備份」輸入識別碼還原；沒有識別碼才選「改用全新卡庫」。';
export function sharedWalletHeaders():Record<string,string> {
  if(typeof window==='undefined')return {};
  const key=window.localStorage.getItem(KEY);return key?{'x-beast-wallet':key}:{};
}
/** 先從 localStorage、cookie、IndexedDB 找回識別碼；三處都沒有、而且這個瀏覽器本來就接過共同卡庫，就停下來請客戶還原，不偷偷建一個空卡庫。 */
async function capability() {
  const found=await recoverWalletKey();
  if(found.key){window.localStorage.setItem(KEY,found.key);return;}
  const old=JSON.parse(window.localStorage.getItem(COLLECTION)??'{}');
  if(old.sharedCultivation)throw new Error(WALLET_LOST_MESSAGE);
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  const key=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
  window.localStorage.setItem(KEY,key);
  if(window.localStorage.getItem(KEY)!==key)throw new Error('卡庫識別尚未保存，請重試。');
  await mirrorWalletKey(key);
}
/** 客戶輸入識別碼還原：寫回所有存放區，並讓下一次同步重新讀伺服器的卡庫。 */
export async function restoreWalletKey(key:string) {
  await mirrorWalletKey(key);
  window.localStorage.removeItem(CACHE);
}
/** 找不回識別碼、客戶決定改用全新卡庫：清掉「已接共同卡庫」的標記，下次同步會用本機資料重新建立。 */
export function startFreshWallet() {
  const old=JSON.parse(window.localStorage.getItem(COLLECTION)??'{"cards":[],"history":[]}');
  delete old.sharedCultivation;
  window.localStorage.removeItem(KEY);window.localStorage.removeItem(CACHE);
  window.localStorage.setItem(COLLECTION,JSON.stringify(old));
}
export function readSharedCultivation():SharedCultivationView|null {
  try{return JSON.parse(window.localStorage.getItem(CACHE)??'null');}catch{return null;}
}
function saveView(view:SharedCultivationView) {
  if(!view||!Array.isArray(view.cards)||!Array.isArray(view.collectionCards))throw new Error('共同卡庫回應不完整。');
  const cached=readSharedCultivation();
  if(cached&&BigInt(cached.revision)>BigInt(view.revision))return cached;
  const old=JSON.parse(window.localStorage.getItem(COLLECTION)??'{"cards":[],"history":[]}');
  const previous=new Map<string,{at?:string;source?:string}>(old.cards.map((c:{id:string})=>[c.id,c]));
  const cards=view.collectionCards.map(c=>({...c,at:previous.get(c.id)?.at??c.at,source:previous.get(c.id)?.source??c.source}));
  window.localStorage.setItem(CACHE,JSON.stringify(view));
  window.localStorage.setItem(COLLECTION,JSON.stringify({...old,cards,granted:view.granted,shards:view.shards,starterPack:view.starterPack,sharedCultivation:true}));
  window.dispatchEvent(new Event('tdh-beast-collection-updated'));window.dispatchEvent(new Event(SHARED_UPDATED));
  return view;
}
export async function sharedRequest(body?:Record<string,unknown>) {
  try {
  const response=await fetch('/api/beast-game/cultivation',{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...sharedWalletHeaders()},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error??'共同卡庫暫時無法取得。');
  if(result.view)result.view=saveView(result.view);
  return result;
  }catch(error){if(error instanceof Error&&/[\u3400-\u9fff]/.test(error.message))throw error;throw new Error('連線或保存尚未確認，請重試同一次操作。');}
}
/** Hold the same cross-tab lock as both local game ledgers during migration/cache updates. */
export async function syncSharedCultivation(options?:{waitForSave?:boolean}):Promise<SharedCultivationView> {
  if(!navigator.locks)throw new Error('請使用支援安全保存的瀏覽器。');
  return navigator.locks.request('tdh-beast-collection',options?.waitForSave?{signal:AbortSignal.timeout(20000)}:{ifAvailable:true},async lock=>{
    if(!lock)throw new Error('另一分頁正在戰鬥或保存，請先完成再重試。');
    // 識別碼就在本機時不等任何非同步（維持「進鎖後立刻送出請求」），只在背景補存備份；不在才去 cookie／IndexedDB 找或建立。
    const present=window.localStorage.getItem(KEY);
    if(present)void mirrorWalletKey(present);else await capability();
    const old=JSON.parse(window.localStorage.getItem(COLLECTION)??'{"cards":[],"history":[]}');
    const growth={modules:JSON.parse(window.localStorage.getItem('tdh_growth_completed_modules_v1')??'[]'),checkIns:JSON.parse(window.localStorage.getItem('tdh_growth_checkin_history_v4')??'{}')};
    if(old.pending&&!old.sharedCultivation)throw new Error('請先結算原戰鬥，再接通共同卡庫。');
    if(!old.sharedCultivation) {
      const result=await sharedRequest({type:'IMPORT',collection:old,growth,orbProfile:window.localStorage.getItem('match3-hard-campaign-self-v1')});
      return result.view;
    }
    const result=await sharedRequest({type:'LOCAL_GRANTS',collection:old,growth});return result.view;
  }).catch(error=>{if(error instanceof Error&&/[\u3400-\u9fff]/.test(error.message))throw error;throw new Error('卡庫保存尚未完成，請稍後重試。');});
}
export async function refreshSharedCultivation() {return (await sharedRequest()).view as SharedCultivationView;}
