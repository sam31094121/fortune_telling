'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { readSharedCultivation, syncSharedCultivation, sharedRequest, SHARED_UPDATED, type SharedCultivationView } from '@/lib/beast-cultivation-client';
import { takeFeedShortcut, FOOD_CHAIN_SHORTCUT } from '@/lib/beast-food-chain-client';
import type { CultivationFeedback } from '@/lib/beast-game/cultivation-view';
import CatalogBeastCard from './CatalogBeastCard';
import FoodChainFeedback from './FoodChainFeedback';
import CardStarBar from './CardStarBar';
import styles from './OwnedCampaignPreparation.module.css';
import fusion from './SharedCultivationPanel.module.css';
import { GuideBookProvider, useGuideBook } from './GuideBookContext';
import type { GuideBook } from '@/lib/beast-game/guide-book';
import type { cultivationChangeView } from '@/lib/beast-game/cultivation-view';
import type { BatchLimits, CultivationBatchSummary } from '@/lib/beast-game/cultivation-batch';
import icon from './FoodChainIcons.module.css';
type FusionDisplay=ReturnType<typeof cultivationChangeView>;
type Feedback=CultivationFeedback|CultivationBatchSummary;
/** 2026-11-16 批次吃卡：預覽節流（停手後再算一次；長按中最久每 PREVIEW_MAX_WAIT_MS 更新一次數字）。 */
const PREVIEW_DEBOUNCE_MS=260,PREVIEW_MAX_WAIT_MS=900;
/** 長按加速：先等 300ms（短按只加 1），之後 +1（每 150ms）→ 0.6 秒起 +5（每 100ms）→ 1.5 秒起 +50（每 100ms）；加到伺服端上限就停。 */
const HOLD_DELAY_MS=300;
const HOLD_STEPS=[{until:600,every:150,add:1},{until:1500,every:100,add:5},{until:Infinity,every:100,add:50}] as const;
type AddResult='ok'|'room'|'pile'|'none';
const NO_PICKS:Record<string,number>=Object.freeze({}) as Record<string,number>;

/**
 * 食物鏈（2026-11-15）：吃卡回饋（攻擊 +N・約 +X%・兩款遊戲攻擊前後・五顆星）一律照印伺服端數字（feedback）。
 * iconOnly（22:44 使用者指示，神獸戰鬥）：純圖示導向——畫面不顯示說明文字，只留卡圖、五顆星、吃卡箭頭、勾勾確認鈕與數字；
 * 每顆按鈕保留 aria-label（讀屏用，畫面不顯示），觸控區 ≥44px；錯誤用圖示＋短動效（封頂、不可吃、版本衝突）。
 * 寶石捷連線維持正式站的文字版（一鍵自動挑最弱材料、說明書），只加上五顆星與吃卡回饋。規則、伺服端計算、確認步驟都不變。
 */

export default function SharedCultivationPanel({onSaved,onDone,iconOnly=false,focus}:{onSaved?:()=>void;onDone?:()=>void;iconOnly?:boolean;focus?:'GUARDIAN'}) {
  const [view,setView]=useState<SharedCultivationView|null>(null),[main,setMain]=useState<string[]>([]);
  const [target,setTarget]=useState(''),[material,setMaterial]=useState('');
  const [preview,setPreview]=useState<FusionDisplay|null>(null),[savedChange,setSavedChange]=useState<FusionDisplay|null>(null);
  const [previewRevision,setPreviewRevision]=useState<string|null>(null);
  const [feedback,setFeedback]=useState<CultivationFeedback|null>(null),[savedFeedback,setSavedFeedback]=useState<Feedback|null>(null);
  // 批次吃卡（純圖示面板）：每種材料加入幾張（只是畫面上的選取計數；吃哪幾張、上限、加成都由伺服端給）。
  const [picks,setPicks]=useState<Record<string,number>>({}),picksRef=useRef<Record<string,number>>({});
  const [batchPreview,setBatchPreview]=useState<{key:string;summary:CultivationBatchSummary}|null>(null);
  const autoPick=useRef('');
  const [shortcut,setShortcut]=useState<string|null>(null);
  const [previewAttempt,setPreviewAttempt]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [book,setBook]=useState<GuideBook|null>(null),[bookError,setBookError]=useState(''),[bookLoading,setBookLoading]=useState(false);
  const bookRequest=useRef<Promise<GuideBook>|null>(null),saving=useRef(false);
  const reviewRef=useRef<HTMLDivElement>(null),materialRef=useRef<HTMLHeadingElement>(null);
  const loadBook=async()=>{
    setBookLoading(true);setBookError('');
    bookRequest.current??=(async()=>{for(let attempt=0;attempt<2;attempt++){try{const response=await fetch('/api/beast-game/guide-book',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('卡面資料暫時無法取得');const data=await response.json();if(!data.ok||!data.book?.cards)throw new Error('卡面資料不完整');return data.book as GuideBook;}catch(cause){if(attempt===1)throw cause;}}throw new Error('卡面資料暫時無法取得');})();
    try{const loaded=await bookRequest.current;if(alive.current)setBook(loaded);}catch{if(alive.current)setBookError('卡面資料暫時無法取得，收藏未變更，請重新載入卡面。');}finally{bookRequest.current=null;if(alive.current)setBookLoading(false);}
  };
  const operation=useRef<string|null>(null),alive=useRef(true);
  const resultRef=useRef<HTMLDivElement>(null),errorRef=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{const element=error?errorRef.current:savedChange?resultRef.current:null;if(element){element.focus({preventScroll:true});element.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}},[error,savedChange]);
  const load=async()=>{setBusy(true);try{const value=await syncSharedCultivation();if(alive.current){setView(value);setMain(value.protectedIds);setError('');setPreviewAttempt(n=>n+1);}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'卡庫暫時無法取得。');}finally{if(alive.current)setBusy(false);}};
  useEffect(()=>{alive.current=true;void load();const update=()=>{const value=readSharedCultivation();if(value)setView(value);};window.addEventListener(SHARED_UPDATED,update);return()=>{alive.current=false;window.removeEventListener(SHARED_UPDATED,update);};},[]);
  useEffect(()=>{void loadBook();const online=()=>{void loadBook();};window.addEventListener('online',online);return()=>window.removeEventListener('online',online);},[]);
  useEffect(()=>{if(preview)reviewRef.current?.scrollIntoView({block:'end',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[preview]);
  // 9A：「拿去強化」只預選目標與材料，仍要玩家按確認；讀一次就清掉。
  useEffect(()=>{const take=()=>{const id=takeFeedShortcut();if(id)setShortcut(id);};take();window.addEventListener(FOOD_CHAIN_SHORTCUT,take);return()=>window.removeEventListener(FOOD_CHAIN_SHORTCUT,take);},[]);
  useEffect(()=>{if(!shortcut||!view)return;
    const food=[...view.cards].reverse().find(c=>c.cardId===shortcut&&!c.protected&&c.materialTargetCardId);
    const goal=food&&view.cards.filter(c=>c.cardId===food.materialTargetCardId).sort((a,b)=>Number(b.protected)-Number(a.protected))[0];
    if(food&&goal){setPreview(null);setTarget(goal.id);if(iconOnly){autoPick.current='';const next={[food.cardId]:1};picksRef.current=next;setPicks(next);}else setMaterial(food.id);setMessage('');setSavedChange(null);setSavedFeedback(null);}
    setShortcut(null);
  },[shortcut,view,iconOnly]);
  // 即時回饋：選定目標就向伺服端一次取回每張候選材料的「攻擊 +N・約 +X%・星級變化」（只讀），顯示在材料卡上。
  const [options,setOptions]=useState<{targetId:string;revision:string;byId:Record<string,{feedback?:CultivationFeedback;error?:string}>;batch:BatchLimits|null}|null>(null);
  // Standalone guardian recovery must refetch material limits even when the inventory revision is unchanged.
  const targetPreviewAttempt=focus==='GUARDIAN'?previewAttempt:0;
  useEffect(()=>{let active=true;
    if(target&&view)void sharedRequest({type:'PREVIEW_TARGET',revision:view.revision,targetId:target,...(iconOnly?{piles:true}:{})}).then(r=>{if(active)setOptions({targetId:target,revision:view.revision,byId:Object.fromEntries((r.options??[]).map((o:{materialId:string;feedback?:CultivationFeedback;error?:string})=>[o.materialId,o])),batch:r.batch??null});}).catch(e=>{if(active){setOptions(null);if(iconOnly)setError(e instanceof Error?e.message:'暫時無法預覽。');}});
    else setOptions(null);
    return()=>{active=false;};
  },[target,view?.revision,iconOnly,targetPreviewAttempt]);
  useEffect(()=>{let active=true;setPreview(null);setFeedback(null);operation.current=null;
    if(target&&material&&view)void sharedRequest({type:'PREVIEW',revision:view.revision,choices:[{targetId:target,materialId:material}]}).then(r=>{if(active){setPreview(r.changes[0]);setFeedback(r.feedback?.[0]??null);setPreviewRevision(view.revision);setError('');}}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[target,material,view?.revision,previewAttempt]);
  // 批次：伺服端給的材料堆（每堆的副本 id 已排好序）＋各堆加入張數 → 送出的 choices；前端不判斷規則。
  const limits=iconOnly&&options&&options.targetId===target&&options.revision===view?.revision?options.batch:null;
  const limitsRef=useRef<BatchLimits|null>(null);limitsRef.current=limits;
  useEffect(()=>{picksRef.current=picks;},[picks]);
  const batchChoices=useMemo(()=>limits?limits.piles.flatMap(p=>p.ids.slice(0,Math.min(picks[p.cardId]??0,p.max)).map(materialId=>({targetId:target,materialId}))):[],[limits,picks,target]);
  const batchKey=limits&&view?`${view.revision}|${target}|${limits.piles.map(p=>`${p.cardId}:${Math.min(picks[p.cardId]??0,p.max)}`).join(',')}`:'';
  // 上限一到就把畫面計數收在上限內；剛選目標時自動放入「原始攻擊最低」那一種的一張（和原本單張流程一樣）。
  useEffect(()=>{if(!limits)return;
    let next=Object.fromEntries(Object.entries(picksRef.current).map(([id,n])=>[id,Math.min(n,limits.piles.find(p=>p.cardId===id)?.max??0)]).filter(([,n])=>Number(n)>0)) as Record<string,number>;
    if(autoPick.current===target&&!Object.keys(next).length){const order=autoMaterial(view?.cards.find(c=>c.id===target)?.cardId??'',limits);const head=order&&view?.cards.find(c=>c.id===order)?.cardId;if(head&&limits.max>0)next={[head]:1};}
    autoPick.current='';picksRef.current=next;setPicks(next);
  },[limits]);// eslint-disable-line react-hooks/exhaustive-deps
  const pendingSince=useRef<number|null>(null);
  useEffect(()=>{if(!iconOnly)return;operation.current=null;
    if(!batchKey||!batchChoices.length||!view){pendingSince.current=null;return;}
    const now=Date.now();pendingSince.current??=now;
    const wait=Math.max(0,Math.min(PREVIEW_DEBOUNCE_MS,PREVIEW_MAX_WAIT_MS-(now-pendingSince.current)));
    const key=batchKey,body={type:'PREVIEW',summaryOnly:true,revision:view.revision,choices:batchChoices};
    const timer=window.setTimeout(()=>{pendingSince.current=null;void sharedRequest(body).then(r=>{if(alive.current){setBatchPreview({key,summary:r.summary});setError('');}}).catch(e=>{if(alive.current)setError(e instanceof Error?e.message:'暫時無法預覽。');});},wait);
    return()=>window.clearTimeout(timer);
  },[batchKey,previewAttempt]);// eslint-disable-line react-hooks/exhaustive-deps
  const batchReady=!!batchPreview&&batchPreview.key===batchKey&&batchChoices.length>0;
  /** 加入 step 張（長按會連續呼叫）；回傳是否還能繼續、或停在哪個上限（伺服端給的數字）。 */
  const addPick=(cardId:string,step:number):AddResult=>{
    const lim=limitsRef.current;if(!lim)return 'none';
    const pile=lim.piles.find(p=>p.cardId===cardId);if(!pile)return 'none';
    const cur=picksRef.current,total=Object.values(cur).reduce((a,b)=>a+b,0),have=cur[cardId]??0;
    const roomLeft=lim.max-total,pileLeft=pile.max-have,n=Math.min(step,roomLeft,pileLeft);
    // 只有真的到五星封頂（伺服端給的 room 用完）才回 'room'（★✓）；材料堆用完一律回 'pile'（×0）。
    const capLeft=lim.room===null?Infinity:lim.room-total;
    if(n>0){const next={...cur,[cardId]:have+n};picksRef.current=next;setPicks(next);}
    if(capLeft-Math.max(n,0)<=0)return 'room';
    if(roomLeft-Math.max(n,0)<=0||pileLeft-Math.max(n,0)<=0)return 'pile';
    return 'ok';
  };
  const save=async(type:'MAIN_TEAM'|'FUSE')=>{
    if(!view||busy||saving.current)return;
    if(type==='FUSE'&&iconOnly&&(!book||!batchReady))return;
    if(type==='FUSE'&&!iconOnly&&(!book||!preview||previewRevision!==view.revision||preview.targetId!==target||preview.materialId!==material))return;
    saving.current=true;setBusy(true);setError('');operation.current??=crypto.randomUUID();
    try{const result=await navigator.locks.request('tdh-beast-collection',{ifAvailable:true},lock=>{if(!lock)throw new Error('另一分頁正在戰鬥或保存，請先完成。');return sharedRequest({type,revision:view.revision,operationId:operation.current,...(type==='MAIN_TEAM'?{ids:main}:iconOnly?{summaryOnly:true,choices:batchChoices}:{choices:[{targetId:target,materialId:material}]})});});
      if(!alive.current)return;setView(result.view);setMain(result.view.protectedIds);setTarget('');setMaterial('');setPreview(null);operation.current=null;
      setSavedChange(type==='FUSE'&&!iconOnly?result.changes[0]:null);setSavedFeedback(type==='FUSE'?(iconOnly?result.summary:result.feedback?.[0])??null:null);
      picksRef.current={};setPicks({});setBatchPreview(null);
      setMessage(type==='MAIN_TEAM'?'五隻主力已鎖定，可整組更換。':'');onSaved?.();
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:'尚未確認保存，請重試同一次操作。');}finally{saving.current=false;if(alive.current)setBusy(false);}
  };
  // 預設自動挑「原始攻擊最低」的那一張對應材料（資料都是後端給的字串，這裡只挑一張）；想自己選就展開「自己選材料」。
  const autoMaterial=(targetCardId:string,within?:BatchLimits)=>{const base=(c:{orbAttack:string;bonus:string})=>{try{return BigInt(c.orbAttack)-BigInt(c.bonus);}catch{return 0n;}};const options=(view?.cards??[]).filter(c=>!c.protected&&c.materialTargetCardId===targetCardId&&(!within||(within.piles.find(p=>p.cardId===c.cardId)?.max??0)>0)).sort((a,b)=>{const d=base(a)-base(b);return d>0n?1:d<0n?-1:0;});return options[0]?.id??'';};
  const targetCard=view?.cards.find(c=>c.id===target);
  const materialCard=view?.cards.find(c=>c.id===material);
  const face=(id:string)=>book?<CatalogBeastCard id={id}/>:<span role="status">{bookError?'卡面暫時無法取得':'卡面載入中…'}</span>;
  const previewReady=!!preview&&previewRevision===view?.revision&&preview.targetId===target&&preview.materialId===material;
  if(iconOnly)return <GuideBookProvider value={book}><IconPanel {...{view,main,setMain,target,setTarget:(id:string)=>{setPreview(null);setTarget(id);autoPick.current=id;picksRef.current={};setPicks({});setBatchPreview(null);setError('');setMessage('');setSavedChange(null);setSavedFeedback(null);},picks,limits,addPick,summary:batchPreview&&batchPreview.key.split('|')[1]===target?batchPreview.summary:null,saved:savedFeedback,busy,error,message,options,operation,resultRef,load,save,onDone,setBusy,setError,ready:batchReady&&!!book,bookError:!!bookError,bookLoading,loadBook,focus,reset:()=>{operation.current=null;setPreview(null);setFeedback(null);setTarget('');setMaterial('');setPicks(NO_PICKS);setBatchPreview(null);setError('');setMessage('');setSavedChange(null);setSavedFeedback(null);}}}/></GuideBookProvider>;
  return <GuideBookProvider value={book}><section className={`${styles.panel} ${fusion.panel}`} data-shared-cultivation>
    <h2>共同神獸卡庫・合體培養</h2>
    <details data-testid="fusion-manual"><summary>說明書</summary>
      <p>寶石捷連線與神獸戰鬥共用收藏及成長。免費試用牌不消耗，也不計入收藏主力。</p>
      <p>鎖定主力不能當材料；更換時一次確認完整五隻，收藏可以超過五隻。</p>
      <p>同星宿幼子被對應本體吃掉；本體被所屬四大神獸吃掉。每次消耗一張材料，目標保留並永久增加攻擊；材料不能重用，目標可繼續強化。</p>
      <p>每次加攻＝材料原始攻擊 ÷ 10，無條件捨去，最低 +1；本體被四大神獸吃掉時，另傳承它累積加成的一半。永久加成總和最多到卡面攻擊的 50%。只增加攻擊，生命與技能不變。</p>
      <p>五顆星：每吃一張累計一次，四大神獸吃滿 1000 張、本體吃滿 500 張封頂（第五星佔一半，前面依序減半），封頂後不能再吃。</p>
    </details>
    {bookError&&<div role="alert" className={fusion.notice}>{bookError}<button type="button" disabled={bookLoading} onClick={()=>void loadBook()}>重新載入卡面</button></div>}
    {error&&<p ref={errorRef} tabIndex={-1} role="alert">{error}<button type="button" disabled={busy} onClick={()=>void load()}>重新讀取卡庫</button></p>}
    {message&&<p role="status" data-shared-saved>{message}</p>}
    {savedChange&&<div ref={resultRef} tabIndex={-1} role="status" data-shared-growth-result>{savedFeedback?<FoodChainFeedback key={savedFeedback.materialId} change={savedFeedback} phase="saved" iconOnly/>:<p data-fusion-sentence><b>{savedChange.targetName}吃掉{savedChange.materialName}</b>：寶石攻擊 {savedChange.orbBeforeAttack}→{savedChange.orbAfterAttack}，神獸戰鬥攻擊 {savedChange.battleBeforeAttack}→{savedChange.battleAfterAttack}</p>}</div>}
    {!view?<p aria-busy="true">正在讀取卡庫…</p>:<>
      {view.pendingBattle&&<p role="alert">戰鬥尚未結束，請先返回原戰鬥結算或離開。<button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{if(view.pendingBattle?.startsWith('card:'))await (await import('@/lib/beast-collection')).releaseLiveBattle(view.pendingBattle);else await sharedRequest({type:'RELEASE',battleId:view.pendingBattle});await load();}catch(e){setError(e instanceof Error?e.message:'暫時無法結束原戰局。');}finally{setBusy(false);}}}>結束未完成戰局（不扣卡、不發獎）</button></p>}
      <h3>① 五隻主力</h3>
      {!view.canProtectFive&&<p role="status">目前不足五種可出戰收藏，請先取得收藏；仍可使用原本的試玩入口。</p>}
      <p>已選 {main.length}／5 隻</p>
      <div className={styles.grid}>{view.cards.map(card=><button key={card.id} type="button" data-main-copy={card.id} aria-pressed={main.includes(card.id)} disabled={busy||!!view.pendingBattle} onClick={()=>{operation.current=null;setMain(ids=>ids.includes(card.id)?ids.filter(id=>id!==card.id):ids.length<5?[...ids,card.id]:ids);}}>
        {face(card.cardId)}<strong>{card.name}</strong><small>{card.copyLabel} · 永久加成 +{card.bonus} {card.protected?'・主力已鎖定':''}</small>
      </button>)}</div>
      <button type="button" className={styles.confirm} data-save-main disabled={busy||!!view.pendingBattle||main.length!==5} onClick={()=>void save('MAIN_TEAM')}>確認這五隻主力</button>
      <h3>② 點一張卡來強化</h3>
      <div className={`${styles.grid} ${fusion.selection}`}>{view.cards.filter(c=>c.form!=='YOUNG').map(card=><button key={card.id} type="button" data-shared-target={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={target===card.id} aria-label={`${card.name}，永久 +${card.bonus}，寶石攻擊 ${card.orbAttack}，神獸戰鬥攻擊 ${card.battleAttack}`} onClick={()=>{if(target===card.id)return;setPreview(null);setTarget(card.id);setMaterial(autoMaterial(card.cardId));setMessage('');setSavedChange(null);}}><span className={fusion.badge}>{target===card.id?'✓ 強化這張':'點我強化'}</span>{face(card.cardId)}<strong>{card.name}</strong><small aria-hidden="true">💎{card.orbAttack} ⚔{card.battleAttack}{card.bonus!=='0'?` +${card.bonus}`:''}</small>{card.stars&&<span data-target-stars={card.stars.stars}><CardStarBar stars={card.stars} percent={card.bonusPercent} atCap={card.atBonusCap} iconOnly/></span>}</button>)}</div>
      {targetCard&&!material&&<p role="status" data-no-material>這張目前沒有可以吃的材料</p>}
      {targetCard&&<details data-testid="pick-material-manually"><summary ref={materialRef as unknown as React.Ref<HTMLElement>} tabIndex={-1}>自己選材料</summary><div className={`${styles.grid} ${fusion.selection}`}>{view.cards.filter(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId).map(card=><button key={card.id} type="button" data-shared-material={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={material===card.id} onClick={()=>{if(material!==card.id){setPreview(null);setMaterial(card.id);}}}><span className={fusion.badge}>{material===card.id?'✓ 已選材料・會消耗':'材料・確認後消耗'}</span>{face(card.cardId)}<strong>{card.name}</strong><small>{card.copyLabel} · 永久 +{card.bonus}</small>{(()=>{const o=options?.targetId===target?options.byId[card.id]:undefined;if(!o)return null;if(o.error)return <small className={styles.feedChip} data-feed-chip-error>{o.error}</small>;const f=o.feedback!;return <small className={styles.feedChip} data-feed-chip={f.addedBonus}><span>攻擊</span> +{f.addedBonus} · <span>約</span> +{f.addedPercent.label}%</small>;})()}</button>)}</div></details>}
      <div ref={reviewRef} className={fusion.review}>
      {previewReady&&preview&&<div data-shared-preview>{feedback?<FoodChainFeedback change={feedback} phase="preview" iconOnly/>:<p data-fusion-sentence><b>{preview.targetName}吃掉{preview.materialName}</b>：寶石攻擊 {preview.orbBeforeAttack}→{preview.orbAfterAttack}，神獸戰鬥攻擊 {preview.battleBeforeAttack}→{preview.battleAfterAttack}</p>}</div>}
      {target&&material&&!previewReady&&!error&&<p role="status">正在取得後端合體預覽…</p>}
      {target&&material&&<button type="button" className={styles.confirm} data-confirm-shared-fusion disabled={busy||!previewReady||!book||!!view.pendingBattle} onClick={()=>void save('FUSE')}>{busy?'正在保存…':'強化一次'}</button>}
      {target&&<div className={fusion.actions}>{material&&<button type="button" disabled={busy} onClick={()=>{setMaterial('');setPreview(null);materialRef.current?.focus();materialRef.current?.scrollIntoView({block:'start'});}}>重選材料</button>}<button type="button" disabled={busy} onClick={()=>{setTarget('');setMaterial('');setPreview(null);setError('');}}>取消本次合體</button></div>}
      </div>
    </>}
    {onDone&&<button type="button" disabled={busy} onClick={onDone}>返回選卡</button>}
  </section></GuideBookProvider>;
}

/** 錯誤訊息 → 圖示（畫面只顯示圖示＋短動效；完整訊息給讀屏）。 */
function errorIcon(message:string):{glyph:string;kind:string} {
  if(/封頂/.test(message))return {glyph:'★',kind:'maxed'};
  if(/上限/.test(message))return {glyph:'🔒',kind:'cap'};
  if(/卡庫已更新|版本|重新確認|重新選擇/.test(message))return {glyph:'🔄',kind:'conflict'};
  if(/只能合體|不能作為材料|至少須保留|不存在|鎖定主力/.test(message))return {glyph:'⛔',kind:'forbidden'};
  if(/戰鬥尚未/.test(message))return {glyph:'⚔',kind:'battle'};
  return {glyph:'⚠',kind:'other'};
}
function Sr({children}:{children:React.ReactNode}){return <span className={icon.sr}>{children}</span>;}
type Card=SharedCultivationView['cards'][number];
type IconProps={view:SharedCultivationView|null;main:string[];setMain:React.Dispatch<React.SetStateAction<string[]>>;target:string;setTarget:(v:string)=>void;picks:Record<string,number>;limits:BatchLimits|null;addPick:(cardId:string,step:number)=>AddResult;summary:CultivationBatchSummary|null;saved:Feedback|null;busy:boolean;error:string;message:string;options:{targetId:string;byId:Record<string,{feedback?:CultivationFeedback;error?:string}>}|null;operation:React.MutableRefObject<string|null>;resultRef:React.RefObject<HTMLDivElement|null>;ready:boolean;load:()=>Promise<void>;save:(t:'MAIN_TEAM'|'FUSE')=>Promise<void>;onDone?:()=>void;setBusy:(v:boolean)=>void;setError:(v:string)=>void;bookError:boolean;bookLoading:boolean;loadBook:()=>Promise<void>;focus?:'GUARDIAN';reset:()=>void};
/** 同款、同加成、同星級（同鎖定狀態）的副本疊成一張＋×N：持有上千張時畫面只畫幾十張卡。 */
function stack(cards:readonly Card[],key:(c:Card)=>string):{card:Card;ids:string[]}[] {
  const groups=new Map<string,{card:Card;ids:string[]}>();
  for(const c of cards){const k=key(c),g=groups.get(k);if(g)g.ids.push(c.id);else groups.set(k,{card:c,ids:[c.id]});}
  return [...groups.values()];
}
const buzz=(pattern:number|number[])=>{try{navigator.vibrate?.(pattern);}catch{}};
function IconPanel(p:IconProps) {
  const {view,main,target,picks,limits,summary,saved,busy,error,options}=p;
  // 2026-11-16 一氣貫通（使用者 00:35 授權整合）：版面順序＝要強化的卡（上）→ 可吃的卡（下）→ ✓／✕ → 鎖主力（最後）。
  // 點一張卡＝它單獨放大到最上方（看得到的第一個反應）；✕ 回到點卡前（目標、所有已加入材料、預覽全清），✓ 才吃卡。
  // 2026-11-16 批次吃卡（使用者定案）：材料按卡種疊成一張＋×N；點一下 +1、長按加速連續加入，不逐張確認；
  // 小提示只有圖示＋數字（🃏×N ⚔+N，加成滿 🔒、五星封頂 ★✓）；最後一個 ✓ 一次結算。上限、加成都由伺服端給。
  const confirmRef=useRef<HTMLButtonElement>(null),previewRef=useRef<HTMLDivElement>(null),stageRef=useRef<HTMLDivElement>(null),dockRef=useRef<HTMLDivElement>(null);
  const reduce=()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 預覽出現、以及停手後數字算好（ready）時，把總結卡捲到黏底 ✓ 列上方（長按中不捲，免得卡堆從手指下移走）。
  const hasSummary=!!summary,fresh=hasSummary&&p.ready;
  // 不用 scrollIntoView：黏底 dock 的停靠線會被捲動區 padding 往上推（桌機 96px），改量實際位置，捲到總結卡底邊剛好在 dock 上方。
  useEffect(()=>{const pv=previewRef.current,dock=dockRef.current;if(!hasSummary||!pv||!dock)return;
    let port:HTMLElement|null=pv.parentElement;while(port&&!(/(auto|scroll)/.test(getComputedStyle(port).overflowY)&&port.scrollHeight>port.clientHeight))port=port.parentElement;
    const top=port?port.getBoundingClientRect().top:0,r=pv.getBoundingClientRect(),d=dock.getBoundingClientRect();
    const delta=r.bottom+8>d.top?Math.min(r.bottom+8-d.top,r.top-top-8):r.top<top?r.top-top-8:0;
    if(delta)(port??window).scrollBy({top:delta,behavior:reduce()?'instant':'smooth'});
  },[hasSummary,fresh]);
  useEffect(()=>{if(target)stageRef.current?.scrollIntoView({block:'nearest',behavior:reduce()?'instant':'smooth'});},[target]);
  const targetCard=view?.cards.find(c=>c.id===target);
  const err=error?errorIcon(error):null;
  useEffect(()=>{if(error)buzz([20,40,20]);},[error]);
  // 2026-11-15 23:52 使用者硬性規定：強化畫面絕對零文字（卡面印刷字與數字除外）。卡面未載入時只顯示 ⏳，不顯示載入字樣。
  const book=useGuideBook();
  const face=(id:string)=>book?<CatalogBeastCard id={id}/>:<span className={icon.facePending} aria-hidden="true">⏳</span>;
  // 可吃的卡：伺服端上限到了以後，只留還能吃的那幾種（吃光會少於五種的那一種、或沒有材料時，改顯示空槽＋🃏＋取卡入口）。
  const foods=targetCard&&view?view.cards.filter(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId&&(!limits||(limits.piles.find(x=>x.cardId===c.cardId)?.max??0)>0)):[];
  const piles=limits?limits.piles.filter(x=>x.max>0).map(x=>({cardId:x.cardId,head:x.ids[0],count:x.ids.length})):stack(foods,c=>c.cardId).map(g=>({cardId:g.card.cardId,head:g.ids[0],count:g.ids.length}));
  const total=Object.values(picks).reduce((a,b)=>a+b,0);
  const roomFull=!!limits&&limits.room!==null&&total>=limits.room;
  const waiting=busy||(!!targetCard&&foods.length>0&&(!limits||(total>0&&!p.ready)));
  const rank=(form:string)=>p.focus==='GUARDIAN'?(form==='GUARDIAN'?0:1):0;
  const targets=view?stack(view.cards.filter(c=>c.form!=='YOUNG').map((c,i)=>({c,i})).sort((a,b)=>rank(a.c.form)-rank(b.c.form)||a.i-b.i).map(x=>x.c),c=>`${c.cardId}|${c.bonus}|${c.fed}|${c.protected}`):[];
  const targetLabel=(card:NonNullable<typeof targetCard>)=>`${card.name}，永久 +${card.bonus}，寶石攻擊 ${card.orbAttack}，神獸戰鬥攻擊 ${card.battleAttack}${card.stars?`，${card.stars.stars} 星${card.stars.toNext===null?'，已五星封頂':`，下一星還差 ${card.stars.toNext} 張`}`:''}`;
  // 鎖主力只在「收藏已有五種」時出現（不足五種時鎖不滿，是死路，不顯示）；🔒✓ 只在已選滿五隻而且和目前鎖定不同時出現。
  const lockChanged=!!view&&main.length===5&&(main.length!==view.protectedIds.length||main.some(id=>!view.protectedIds.includes(id)));
  // 長按：pointerdown 先加 1；按住 300ms 後依 HOLD_STEPS 加速；放開、移開（捲動時瀏覽器送 pointercancel）就停。
  const hold=useRef<{timer:number|null;start:number}|null>(null);
  const [bump,setBump]=useState<{cardId:string;kind:'room'|'pile';n:number}|null>(null);
  const stopHold=()=>{if(hold.current?.timer)window.clearTimeout(hold.current.timer);hold.current=null;};
  useEffect(()=>stopHold,[]);
  const signal=(cardId:string,result:AddResult)=>{if(result==='room'||result==='pile'){setBump(b=>({cardId,kind:result,n:(b?.n??0)+1}));buzz(result==='room'?[30,30,60]:25);}};
  const press=(cardId:string)=>{stopHold();if(busy||view?.pendingBattle)return;const first=p.addPick(cardId,1);if(first!=='ok'){signal(cardId,first);return;}
    const h:{timer:number|null;start:number}={timer:null,start:performance.now()};hold.current=h;
    const tick=()=>{if(hold.current!==h)return;const elapsed=performance.now()-h.start;const step=HOLD_STEPS.find(x=>elapsed<x.until)!;const result=p.addPick(cardId,step.add);if(result!=='ok'){signal(cardId,result);stopHold();return;}h.timer=window.setTimeout(tick,step.every);};
    h.timer=window.setTimeout(tick,HOLD_DELAY_MS);};
  const dockAlert=err&&<div role="alert" className={`${icon.alert} ${icon.dockAlert}`} data-error-kind={err.kind} data-dock-alert key={error}><span className={icon.alertGlyph} aria-hidden="true">{err.glyph}</span><Sr>{error}</Sr><button type="button" className={icon.iconBtn} disabled={busy} onClick={()=>void p.load()} aria-label="重新讀取卡庫"><span aria-hidden="true">↻</span></button></div>;
  return <section className={`${styles.panel} ${icon.panel}`} data-shared-cultivation data-icon-only data-focus={targetCard?'target':'pick'} aria-label="共同神獸卡庫・合體培養">
    {!targetCard&&dockAlert}
    {p.bookError&&<div role="alert" className={icon.alert} data-error-kind="book"><span className={icon.alertGlyph} aria-hidden="true">🖼</span><Sr>卡面資料暫時無法取得，收藏未變更。</Sr><button type="button" className={icon.iconBtn} disabled={p.bookLoading} onClick={()=>void p.loadBook()} aria-label="重新載入卡面"><span aria-hidden="true">↻</span></button></div>}
    {p.message&&<p role="status" data-shared-saved className={icon.sr}>{p.message}</p>}
    {saved&&<div ref={p.resultRef} tabIndex={-1} className={styles.feedbackAnchor}><FoodChainFeedback key={`${saved.materialId}:${'count' in saved?saved.count:1}`} change={saved} phase="saved" iconOnly/></div>}
    {!view?<p aria-busy="true" className={icon.loading}><span aria-hidden="true">⏳</span><Sr>正在讀取卡庫…</Sr></p>:<>
      {view.pendingBattle&&<div role="alert" className={icon.alert} data-error-kind="battle"><span className={icon.alertGlyph} aria-hidden="true">⚔⏳</span><Sr>戰鬥尚未結束，請先返回原戰鬥結算或離開。</Sr><button type="button" className={icon.iconBtn} disabled={busy} aria-label="結束未完成戰局（不扣卡、不發獎）" onClick={async()=>{p.setBusy(true);try{if(view.pendingBattle?.startsWith('card:'))await (await import('@/lib/beast-collection')).releaseLiveBattle(view.pendingBattle);else await sharedRequest({type:'RELEASE',battleId:view.pendingBattle});await p.load();}catch(e){p.setError(e instanceof Error?e.message:'暫時無法結束原戰局。');}finally{p.setBusy(false);}}}><span aria-hidden="true">✖</span></button></div>}
      {/* ① 要強化的卡（最上方）。點了之後只留這一張、放大，下面接可吃的卡。 */}
      {targetCard?<div ref={stageRef} className={icon.stage} data-target-stage>
        <button type="button" data-shared-target={targetCard.id} aria-pressed="true" aria-label={targetLabel(targetCard)} disabled={busy||!!view.pendingBattle} onClick={p.reset}>{face(targetCard.cardId)}{targetCard.stars&&<span data-target-stars={targetCard.stars.stars}><CardStarBar stars={targetCard.stars} percent={targetCard.bonusPercent} atCap={targetCard.atBonusCap} iconOnly/></span>}</button>
      </div>:<><div className={icon.stepHead} aria-hidden="true"><span>⬆</span></div>
      <div className={styles.grid} role="group" aria-label="選擇要強化的神獸">{targets.map(({card,ids})=><button key={card.id} type="button" data-shared-target={card.id} data-stack={ids.length} data-maxed={card.stars?.toNext===null?'true':undefined} disabled={busy||!!view.pendingBattle||card.stars?.toNext===null} aria-pressed={target===card.id} aria-label={`${targetLabel(card)}${ids.length>1?`，同款 ${ids.length} 張`:''}`} onClick={()=>p.setTarget(card.id)}>{face(card.cardId)}{ids.length>1&&<b className={icon.count} aria-hidden="true">×{ids.length}</b>}{card.stars&&<span data-target-stars={card.stars.stars}><CardStarBar stars={card.stars} percent={card.bonusPercent} atCap={card.atBonusCap} iconOnly/></span>}</button>)}</div></>}
      {/* ② 可吃的卡（在下方）：每種疊成一張＋×N；點一下 +1、長按連續加入。 */}
      {targetCard&&<><div className={icon.stepHead} aria-hidden="true"><span>⬆</span><span>🍴</span></div><div className={styles.grid} role="group" aria-label="選擇對應材料：點一下加一張，長按連續加入">{piles.map(pile=>{const card=view.cards.find(c=>c.id===pile.head)!,o=options?.targetId===target?options.byId[pile.head]:undefined,f=o?.feedback,e=o?.error?errorIcon(o.error):null,n=picks[pile.cardId]??0,b=bump?.cardId===pile.cardId?bump:null;
        return <button key={pile.cardId} type="button" className={icon.pile} data-shared-material={pile.head} data-pile={pile.cardId} data-picked={n} data-left={pile.count-n} disabled={busy||!!view.pendingBattle} aria-pressed={n>0}
          aria-label={`${card?.name??''}，持有 ${pile.count} 張，已加入 ${n} 張${f?`，第一張攻擊 +${f.addedBonus}，約 +${f.addedPercent.label}%`:''}${o?.error?`，${o.error}`:''}`}
          onPointerDown={ev=>{if(ev.pointerType==='mouse'&&ev.button!==0)return;try{ev.currentTarget.setPointerCapture(ev.pointerId);}catch{}press(pile.cardId);}}
          onPointerUp={stopHold} onPointerCancel={stopHold} onLostPointerCapture={stopHold} onContextMenu={ev=>ev.preventDefault()}
          onClick={ev=>{if(ev.detail===0){press(pile.cardId);stopHold();}}}>{face(card.cardId)}
          <b className={icon.count} data-pile-left aria-hidden="true">×{pile.count-n}</b>
          {n>0?<b className={`${icon.chip} ${icon.picked}`} data-pile-picked={n} aria-hidden="true">🍴{n}</b>:e?<b className={`${icon.chip} ${icon.chipError}`} data-feed-chip-error data-error-kind={e.kind} aria-hidden="true">{e.glyph}</b>:f?<b className={icon.chip} data-feed-chip={f.addedBonus} aria-hidden="true">+{f.addedPercent.label}%{f.starsBefore&&f.starsAfter&&f.starsAfter.stars>f.starsBefore.stars?<> ★↑</>:null}</b>:null}
          {b&&<span key={b.n} className={icon.bumpMark} data-bump={b.kind} aria-hidden="true">{b.kind==='room'?'★✓':'×0'}</span>}
        </button>;})}</div>
        {!foods.length&&<div role="status" data-no-material className={icon.emptyRow}><span className={icon.emptySlot} aria-hidden="true">🍴</span><Sr>目前沒有可以餵給這張卡的材料（鎖定主力不能當材料）。</Sr><a href="/growth-center#beast-collection" className={icon.getCards} data-get-cards aria-label="去取得卡片"><span aria-hidden="true">🃏＋</span></a></div>}</>}
      {summary&&total>0&&<div ref={previewRef} data-shared-preview data-fresh={p.ready?'true':undefined} className={icon.previewAnchor}><FoodChainFeedback change={summary} phase="preview" iconOnly/></div>}
      {/* ③ ✓ 一次結算／✕ 一次全清：黏底、永遠在畫面內；上面一列小提示 🃏×N ⚔+N（🔒 加成滿、★✓ 五星封頂）；失敗時 ⚠ 就在 ✓ 旁。無材料時不顯示 ✓，只留 ✕ 跟在空材料槽後面（不黏底，免得蓋住 🃏＋）。 */}
      {targetCard&&<div className={foods.length>0?`${icon.dock} ${icon.stickyConfirm}`:icon.dock} data-sticky-confirm={foods.length>0?'true':undefined} data-fusion-dock ref={dockRef}>
        {total>0&&<div className={icon.hint} data-batch-hint role="status" aria-label={`已加入 ${total} 張${summary?`，神獸戰鬥攻擊 +${summary.addedBonus}`:''}${summary?.atBonusCap?'，攻擊加成已滿':''}${roomFull?'，已到五星封頂':''}`}>
          <span aria-hidden="true">🃏×<b data-hint-count>{total}</b></span>
          <span aria-hidden="true" data-hint-attack-wrap data-stale={p.ready?undefined:'true'}>⚔+<b data-hint-attack>{summary?summary.addedBonus:'⏳'}</b></span>
          {summary?.atBonusCap&&<span aria-hidden="true" data-hint-cap>🔒</span>}
          {roomFull&&<span aria-hidden="true" data-hint-room>★✓</span>}
        </div>}
        {targetCard&&dockAlert}
        {foods.length>0&&<button ref={confirmRef} type="button" className={`${styles.confirm} ${styles.feedbackAnchor} ${icon.check}`} data-confirm-shared-fusion aria-label={busy?'正在保存…':waiting?'正在取得預覽…':'確認一次吃下已加入的材料'} data-waiting={waiting?'true':undefined} disabled={busy||!p.ready||!!view.pendingBattle} onClick={()=>void p.save('FUSE')}><span aria-hidden="true" className={waiting?icon.wait:undefined}>{waiting?'⏳':'✓'}</span></button>}
        <button type="button" className={`${icon.check} ${icon.cancel}`} data-cancel-shared-fusion aria-label="取消，還原到選卡前" disabled={busy} onClick={p.reset}><span aria-hidden="true">✕</span></button>
      </div>}
      {/* ④ 鎖主力（最後）：只在收藏已有五種、而且沒有在強化某張卡時出現。同款同加成疊成一張，點一下鎖／解這一種的一張。 */}
      {view.canProtectFive&&!targetCard&&<>
        <div className={icon.stepHead} aria-hidden="true"><span>🔒</span><b>{main.length}/5</b></div>
        <div className={styles.grid} role="group" aria-label="親選五隻收藏主力（鎖定主力不能當材料）">{stack(view.cards,c=>`${c.cardId}|${c.bonus}|${c.fed}`).map(({card,ids})=>{const chosen=ids.find(id=>main.includes(id));return <button key={card.id} type="button" data-main-copy={card.id} data-stack={ids.length} aria-pressed={!!chosen} aria-label={`${card.name}${ids.some(id=>view.protectedIds.includes(id))?'，主力已鎖定':''}${ids.length>1?`，同款 ${ids.length} 張`:''}`} disabled={busy||!!view.pendingBattle} onClick={()=>{p.operation.current=null;p.setMain(list=>chosen?list.filter(id=>id!==chosen):list.length<5?[...list,ids[0]]:list);}}>
          {face(card.cardId)}{chosen&&<span className={icon.badge} aria-hidden="true">🔒</span>}{ids.length>1&&<b className={icon.count} aria-hidden="true">×{ids.length}</b>}{card.bonus!=='0'&&<b className={icon.num} aria-hidden="true">+{card.bonusPercent}%</b>}
        </button>;})}</div>
        {lockChanged&&<button type="button" className={`${styles.confirm} ${icon.check}`} data-save-main aria-label="確認這五隻主力" disabled={busy||!!view.pendingBattle} onClick={()=>void p.save('MAIN_TEAM')}><span aria-hidden="true">🔒✓</span></button>}
      </>}
    </>}
    {p.onDone&&<button type="button" className={icon.iconBtn} disabled={busy} onClick={p.onDone} aria-label="返回選卡"><span aria-hidden="true">↩</span></button>}
  </section>;
}
