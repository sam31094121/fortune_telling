'use client';
import {useEffect,useState} from 'react';
import {getCompletedGrowthModules,getAnonymousProfileId} from '@/lib/growth-center-client';
import {claimStarterPack,subscribeCollection} from '@/lib/beast-collection';
export default function StarterPackBanner({claimed}:{claimed:boolean}){
 const [eligible,setEligible]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const refresh=()=>{try{setEligible(getCompletedGrowthModules()[0]??localStorage.getItem('tdh_beast_completed_game_v1')??'');}catch{setError('請允許瀏覽器保存遊戲進度。');}};refresh();return subscribeCollection(refresh);},[]);
 useEffect(()=>{if(!eligible||claimed)return;let disposed=false;const timer=setTimeout(()=>{setBusy(true);setError('');void claimStarterPack(eligible,getAnonymousProfileId()).catch(e=>{if(!disposed)setError(e.message);}).finally(()=>{if(!disposed)setBusy(false);});},0);return()=>{disposed=true;clearTimeout(timer);};},[eligible,claimed,attempt]);
 return <section aria-label="首次遊戲幼子禮包" className="mt-4 rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-300/15 to-cyan-300/10 p-4">
  <p className="text-xs font-bold tracking-widest text-amber-200">首次完成禮</p><h3 className="mt-1 text-xl font-black text-amber-100">28 張神獸幼子・完整一套</h3>
  <p className="mt-2 text-sm leading-6">完成任一項遊戲，即可首次領取完整幼子套牌。每個瀏覽器身分領一次，入庫後可選卡押注；輸掉的卡不會重新補發。</p>
  <p role="status" className="mt-3 font-bold text-amber-100">{claimed?'✓ 28 張已入庫，可在下方選卡押注':busy?'正在保存你的 28 張幼子卡…':eligible?'已達領取條件':'完成一項遊戲，就能領取'}</p>
  {error&&<div role="alert"><p className="mt-2 text-sm text-rose-200">{error}</p><button className="min-h-11 underline" onClick={()=>setAttempt(n=>n+1)} disabled={busy}>重試領取</button></div>}
 </section>;
}
