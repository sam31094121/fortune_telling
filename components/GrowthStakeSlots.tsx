'use client';
import {useEffect,useRef,useState} from 'react';
import {runOwnedDuel,retryStakeSettlement,recoverPendingDuel,type BeastCollection,type Settlement} from '@/lib/beast-collection';
import type {StakeOutcome} from '@/lib/beast-collection-ledger';
import styles from './GrowthStakeSlots.module.css';
import {recordBeastGameCompleted} from '@/lib/growth-center-client';
type Card={id:string;name:string;thumbnail:string};
type Result={ok:boolean;stake?:StakeOutcome;error?:string};
export default function GrowthStakeSlots({collection,pool}:{collection:BeastCollection;pool:Map<string,Card>}){
 const [id,setId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [outcome,setOutcome]=useState<StakeOutcome|null>(null),[saved,setSaved]=useState<Settlement|null>(null);
 const [guided,setGuided]=useState(true);
 const slots=useRef<HTMLDivElement>(null),picker=useRef<HTMLSelectElement>(null);
 const show=(element:HTMLElement|null)=>element?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 useEffect(()=>{if(guided&&(id||saved))show(slots.current);},[id,saved,guided]);
 useEffect(()=>{let disposed=false;const timer=setTimeout(()=>{void recoverPendingDuel<Result>().then(r=>{if(disposed)return;if(r.result?.stake)setOutcome(r.result.stake);if(r.settlement)setSaved(r.settlement);}).catch(e=>{if(!disposed)setError(e.message);});},0);return()=>{disposed=true;clearTimeout(timer);};},[]);
 const selected=collection.cards.find(c=>c.id===id),stake=pool.get(outcome?.stakes.player??selected?.cardId??''),reward=pool.get(outcome?.gainedCardId??'');
 const won=saved?.saved&&outcome?.verdict==='WON',lost=saved?.saved&&outcome?.verdict==='LOST';
 useEffect(()=>{if(saved?.saved)recordBeastGameCompleted('stake-duel');},[saved?.saved]);
 async function play(){if(!selected||busy)return;setBusy(true);setError('');setSaved(null);setOutcome(null);try{const result=await runOwnedDuel<Result>(selected.cardId,async()=>{const r=await fetch('/api/beast-game/stake-duel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cardId:selected.cardId}),signal:AbortSignal.timeout(20000)});return r.json();},selected.id);setOutcome(result.result.stake??null);setSaved(result.settlement);}catch(e){setError(e instanceof Error?e.message:'連線中斷，沒有扣卡。');}finally{setBusy(false);}}
 async function retry(){if(!saved||!outcome||busy)return;setBusy(true);try{setSaved(await retryStakeSettlement(saved.matchId,outcome));}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <section aria-label="收藏押注決鬥" className="mt-4 rounded-xl border border-amber-200/30 p-3">
  <h3 className="text-lg font-bold text-amber-100">收藏押注決鬥</h3>
  <div className={styles.guide}>
   <p role="status">{busy?'正在對戰，請等結算完成。':saved?.saved?'③ 看結果：押注卡與獎勵格已更新。':selected?'② 核對這張卡，再親手按開戰。':'① 先選一張自己收藏的卡。'}</p>
   {!selected&&!busy&&!saved&&<button type="button" className={styles.helpButton} onClick={()=>{setGuided(true);show(picker.current);picker.current?.focus({preventScroll:true});}}>帶我選卡 <span aria-hidden="true">↓</span></button>}
   <button type="button" className={styles.toggle} onClick={()=>setGuided(v=>!v)} aria-pressed={guided}>{guided?'收起箭頭引導':'開啟箭頭引導'}</button>
  </div>
  <p className="mt-2 text-sm leading-6">選一張收藏卡與電腦單挑，雙方自動出招。輸了沒收這一張；贏了保留原卡，再獲得對手押的一張。平手退回。</p>
  <div ref={slots} className={styles.slots}>
   <div><p>押注卡格</p><div className={`${styles.slot} ${lost?styles.lost:''}`}>{stake?<img src={stake.thumbnail} alt={stake.name}/>:<span>請選收藏卡</span>}</div><p className="text-sm">{stake?.name}{lost?' · 已沒收 1 張':''}</p></div>
   <div><p>獎勵卡格</p><div className={`${styles.slot} ${won?styles.won:''}`}>{won&&reward?<img src={reward.thumbnail} alt={`已入庫獎勵：${reward.name}`}/>:<span>{busy?'結算中…':lost?'本場沒有獎勵':'獲勝入庫後亮起'}</span>}</div>{won&&<p className="text-sm">{reward?.name??'獎勵卡'} · 已加入收藏</p>}</div>
  </div>
  {selected&&!outcome&&<p className={styles.confirm}>你選的是「{stake?.name??selected.cardId}」。現在只是選卡，尚未扣除；按開戰後，輸了會沒收這一張。</p>}
  {guided&&!selected&&!saved&&<p className={styles.arrow}><span aria-hidden="true">↓</span> 點下方選單，選你的收藏卡</p>}
  <label htmlFor="growth-stake-entry" className="text-sm">選擇押注的那一張</label>
  <select ref={picker} id="growth-stake-entry" className="mt-2 min-h-11 w-full rounded-lg bg-slate-900 p-2 text-white" value={selected?id:''} disabled={busy||Boolean(saved&&!saved.saved)} onChange={e=>{setId(e.target.value);setOutcome(null);setSaved(null);setError('');}}><option value="">請選擇收藏卡</option>{collection.cards.map((c,i)=><option key={c.id} value={c.id}>{pool.get(c.cardId)?.name??c.cardId} · 收藏第 {i+1} 張</option>)}</select>
  {guided&&selected&&!outcome&&<p className={styles.arrow}><span aria-hidden="true">↓</span> 確認願意押這張，再按開戰</p>}
  <button className="mt-3 min-h-11 w-full rounded-xl bg-amber-200 p-3 font-bold text-slate-950 disabled:opacity-40" disabled={!selected||busy||Boolean(collection.storageError)||Boolean(saved&&!saved.saved)} onClick={()=>void play()}>{busy?'結算中…':'押這張卡開戰（輸了沒收）'}</button>
  {saved?.saved&&<p role="status" className="mt-2 text-sm">{won?'獎勵已入庫，原押注卡保留。':lost?'已從成長陪伴收藏沒收這張卡，其他卡保留。':'本場平手，原卡退回。'}</p>}
  {saved&&!saved.saved&&<div role="alert"><p>{saved.error??'結算尚未保存。'}</p><button className="min-h-11 underline" disabled={busy} onClick={()=>void retry()}>重試保存結果</button></div>}
  {error&&<p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>}
  {!collection.cards.length&&<p className="mt-2 text-sm">先完成成長任務取得收藏卡，即可押注。</p>}
 </section>;
}
