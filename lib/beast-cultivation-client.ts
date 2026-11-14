'use client';
import type { cultivationView } from './beast-game/cultivation-view';
export type SharedCultivationView=ReturnType<typeof cultivationView>;
const KEY='tdh_beast_wallet_v1',CACHE='tdh_beast_shared_view_v1',COLLECTION='tdh_beast_collection_v1';
export const SHARED_UPDATED='tdh-beast-shared-updated';
export function sharedWalletHeaders():Record<string,string> {
  if(typeof window==='undefined')return {};
  const key=window.localStorage.getItem(KEY);return key?{'x-beast-wallet':key}:{};
}
function capability() {
  if(!window.localStorage.getItem(KEY)) {
    const bytes=crypto.getRandomValues(new Uint8Array(32));
    const key=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
    window.localStorage.setItem(KEY,key);
    if(window.localStorage.getItem(KEY)!==key)throw new Error('卡庫識別尚未保存，請重試。');
  }
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
  window.localStorage.setItem(COLLECTION,JSON.stringify({...old,cards,sharedCultivation:true}));
  window.dispatchEvent(new Event('tdh-beast-collection-updated'));window.dispatchEvent(new Event(SHARED_UPDATED));
  return view;
}
export async function sharedRequest(body?:Record<string,unknown>) {
  const response=await fetch('/api/beast-game/cultivation',{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...sharedWalletHeaders()},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error??'共同卡庫暫時無法取得。');
  if(result.view)result.view=saveView(result.view);
  return result;
}
/** Hold the same cross-tab lock as both local game ledgers during migration/cache updates. */
export async function syncSharedCultivation():Promise<SharedCultivationView> {
  if(!navigator.locks)throw new Error('請使用支援安全保存的瀏覽器。');
  return navigator.locks.request('tdh-beast-collection',{ifAvailable:true},async lock=>{
    if(!lock)throw new Error('另一分頁正在戰鬥或保存，請先完成再重試。');
    capability();
    const old=JSON.parse(window.localStorage.getItem(COLLECTION)??'{"cards":[],"history":[]}');
    if(old.pending&&!old.sharedCultivation)throw new Error('請先結算原戰鬥，再接通共同卡庫。');
    if(!old.sharedCultivation) {
      const result=await sharedRequest({type:'IMPORT',collection:old,orbProfile:window.localStorage.getItem('match3-hard-campaign-self-v1')});
      return result.view;
    }
    const result=await sharedRequest({type:'LOCAL_GRANTS',collection:old});return result.view;
  });
}
export async function refreshSharedCultivation() {return (await sharedRequest()).view as SharedCultivationView;}
