'use client';
import {useEffect,useRef,useState} from 'react';
import {runOwnedStakesDuel,retryStakeSettlement,recoverPendingDuel,type BeastCollection,type Settlement} from '@/lib/beast-collection';
import type {StakeOutcome} from '@/lib/beast-collection-ledger';
import styles from './GrowthStakeSlots.module.css';
import {recordBeastGameCompleted} from '@/lib/growth-center-client';
type Card={id:string;name:string;thumbnail:string};
type Result={ok:boolean;stake?:StakeOutcome;error?:string};
export default function GrowthStakeSlots({collection,pool}:{collection:BeastCollection;pool:Map<string,Card>}){
 const [ids,setIds]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [outcome,setOutcome]=useState<StakeOutcome|null>(null),[saved,setSaved]=useState<Settlement|null>(null);
 const [guided,setGuided]=useState(true);
 const slots=useRef<HTMLDivElement>(null),picker=useRef<HTMLSelectElement>(null);
 const show=(element:HTMLElement|null)=>element?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 useEffect(()=>{if(guided&&(ids.length||saved))show(slots.current);},[ids,saved,guided]);
 useEffect(()=>{let disposed=false;const timer=setTimeout(()=>{void recoverPendingDuel<Result>().then(r=>{if(disposed)return;if(r.result?.stake)setOutcome(r.result.stake);if(r.settlement)setSaved(r.settlement);}).catch(e=>{if(!disposed)setError(e.message);});},0);return()=>{disposed=true;clearTimeout(timer);};},[]);
 const selected=ids.map(id=>collection.cards.find(c=>c.id===id)).filter((c):c is BeastCollection['cards'][number]=>Boolean(c));
 const displayed=outcome?.selectedEntries??selected,reward=pool.get(outcome?.gainedCardId??'');
 const won=saved?.saved&&outcome?.verdict==='WON',lost=saved?.saved&&outcome?.verdict==='LOST';
 useEffect(()=>{if(saved?.saved)recordBeastGameCompleted('stake-duel');},[saved?.saved]);
 async function play(){if(selected.length<1||selected.length>5||busy)return;setBusy(true);setError('');setSaved(null);setOutcome(null);try{const result=await runOwnedStakesDuel(selected.map(c=>c.id),async(entries)=>{const r=await fetch('/api/beast-game/stake-duel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries}),signal:AbortSignal.timeout(20000)});return r.json();});setOutcome(result.result.stake??null);setSaved(result.settlement);}catch(e){setError(e instanceof Error?e.message:'連線中斷，沒有扣卡。');}finally{setBusy(false);}}
 async function retry(){if(!saved||!outcome||busy)return;setBusy(true);try{setSaved(await retryStakeSettlement(saved.matchId,outcome));}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <section aria-label="收藏押注決鬥" className="mt-4 rounded-xl border border-amber-200/30 p-3">
  <h3 className="text-lg font-bold text-amber-100">收藏押注決鬥</h3>
  <div className={styles.guide}>
   <p role="status">{busy?'正在對戰，請等結算完成。':saved?.saved?'③ 看結果：押注卡與獎勵格已更新。':selected.length>0?`② 已放入 ${selected.length} 張，可以開戰，也可以繼續加牌（最多 5 張）。`:'① 先從下方選一張自己的收藏卡。'}</p>
   {!selected.length&&!busy&&!saved&&<button type="button" className={styles.helpButton} onClick={()=>{setGuided(true);show(picker.current);picker.current?.focus({preventScroll:true});}}>帶我選卡 <span aria-hidden="true">↓</span></button>}
   <button type="button" className={styles.toggle} onClick={()=>setGuided(v=>!v)} aria-pressed={guided}>{guided?'收起箭頭引導':'開啟箭頭引導'}</button>
  </div>
  <p className="mt-2 text-sm leading-6">只可押已入庫的收藏卡，60 張戰鬥試用牌不能押。贈送的 28 張幼子入庫後才能使用。一次可押 1～5 張，一張、兩張都能玩，不必放滿。第一張與電腦自動單挑；輸了只沒收你押的牌，贏了原牌保留並另送一張，平手原牌保留。</p>
  <ol className={styles.steps} aria-label="押牌三步驟"><li>① 選卡：下方選單只列你的收藏。</li><li>② 放牌：選好會自動放進押注格；點「取回」可取消。</li><li>③ 開戰：核對張數後按金色按鈕，格子裡的牌才正式成為賭注。</li></ol>
  <div ref={slots} className={styles.slots}>
   {Array.from({length:5},(_,i)=>{const entry=displayed[i],card=pool.get(entry?.cardId??'');return <div key={i}><p>押注格 {i+1}{i===0?' · 出戰':''}</p><div className={styles.slot+' '+(lost?styles.lost:'')}>{card?<img src={card.thumbnail} alt={card.name}/>:<button type="button" className={styles.addCard} disabled={busy||Boolean(saved)} onClick={()=>{show(picker.current);picker.current?.focus({preventScroll:true});}}>＋ 選收藏卡<br/><small>{i===0?'先放一張就能玩':'選填，不必放滿'}</small></button>}</div><p className="text-sm">{card?.name}{lost?' · 已沒收':''}</p>{entry&&!outcome&&<button className="min-h-11 underline" disabled={busy} onClick={()=>setIds(v=>v.filter(id=>id!==entry.id))}>取回第 {i+1} 張</button>}</div>})}
   <div><p>獎勵卡格</p><div className={`${styles.slot} ${won?styles.won:''}`}>{won&&reward?<img src={reward.thumbnail} alt={`已入庫獎勵：${reward.name}`}/>:<span>{busy?'結算中…':lost?'本場沒有獎勵':'獲勝入庫後亮起'}</span>}</div>{won&&<p className="text-sm">{reward?.name??'獎勵卡'} · 已加入收藏</p>}</div>
  </div>
  {selected.length>0&&!outcome&&<p className={styles.confirm}>本次押 {selected.length} 張：輸了沒收這 {selected.length} 張；贏了保留這 {selected.length} 張，另送 1 張。目前只是放牌，還沒有扣卡。</p>}
  {guided&&selected.length<5&&!saved&&<p className={styles.arrow}><span aria-hidden="true">↓</span> 點選一張卡，它就會出現在上方押注格</p>}
  <label htmlFor="growth-stake-entry" className="text-sm">選收藏卡放入押注格（1～5 張）</label>
  <select ref={picker} id="growth-stake-entry" className="mt-2 min-h-11 w-full rounded-lg bg-slate-900 p-2 text-white" value="" disabled={busy||selected.length>=5||Boolean(saved)} onChange={e=>{const id=e.target.value;if(id&&!ids.includes(id))setIds([...selected.map(c=>c.id),id]);setError('');}}><option value="">點這裡選一張收藏卡</option>{collection.cards.map((c,i)=>!ids.includes(c.id)&&<option key={c.id} value={c.id}>{pool.get(c.cardId)?.name??c.cardId} · 收藏第 {i+1} 張</option>)}</select>
  {guided&&selected.length>0&&!outcome&&<p className={styles.arrow}><span aria-hidden="true">↓</span> 已放好 {selected.length} 張，不必放滿；確認後按下方開戰</p>}
  <button className="mt-3 min-h-11 w-full rounded-xl bg-amber-200 p-3 font-bold text-slate-950 disabled:opacity-40" disabled={selected.length<1||selected.length>5||busy||Boolean(collection.storageError)||Boolean(saved)} onClick={()=>void play()}>{busy?'結算中…':selected.length?`確認押 ${selected.length} 張，開始對戰`:'先選一張收藏卡，就能開戰'}</button>
  {saved?.saved&&<><p role="status" className="mt-2 text-sm">{won?'原押注卡保留，額外一張獎勵已入庫。':lost?'已精準沒收押注收藏，其他卡保留。':'本場平手，押注卡保留。'}</p><button className="min-h-11 underline" onClick={()=>{setIds([]);setOutcome(null);setSaved(null);setError('');}}>重新選牌</button></>}
  {saved&&!saved.saved&&<div role="alert"><p>{saved.error??'結算尚未保存。'}</p><button className="min-h-11 underline" disabled={busy} onClick={()=>void retry()}>重試保存結果</button></div>}
  {error&&<p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>}
  {collection.cards.length===0&&<p className="mt-2 text-sm">你還沒有收藏卡。先完成遊戲並領取 28 張幼子入庫，再回來選一張就能玩。</p>}
 </section>;
}
