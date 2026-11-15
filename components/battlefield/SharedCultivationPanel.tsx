'use client';
import { useEffect, useRef, useState } from 'react';
import { readSharedCultivation, syncSharedCultivation, sharedRequest, SHARED_UPDATED, type SharedCultivationView } from '@/lib/beast-cultivation-client';
import { takeFeedShortcut, FOOD_CHAIN_SHORTCUT } from '@/lib/beast-food-chain-client';
import type { CultivationFeedback } from '@/lib/beast-game/cultivation-view';
import CatalogBeastCard from './CatalogBeastCard';
import FoodChainFeedback from './FoodChainFeedback';
import CardStarBar from './CardStarBar';
import styles from './OwnedCampaignPreparation.module.css';
import fusion from './SharedCultivationPanel.module.css';
import { GuideBookProvider } from './GuideBookContext';
import type { GuideBook } from '@/lib/beast-game/guide-book';
import type { cultivationChangeView } from '@/lib/beast-game/cultivation-view';
import icon from './FoodChainIcons.module.css';
type FusionDisplay=ReturnType<typeof cultivationChangeView>;

/**
 * 食物鏈（2026-11-15）：吃卡回饋（攻擊 +N・約 +X%・兩款遊戲攻擊前後・五顆星）一律照印伺服端數字（feedback）。
 * iconOnly（22:44 使用者指示，神獸戰鬥）：純圖示導向——畫面不顯示說明文字，只留卡圖、五顆星、吃卡箭頭、勾勾確認鈕與數字；
 * 每顆按鈕保留 aria-label（讀屏用，畫面不顯示），觸控區 ≥44px；錯誤用圖示＋短動效（封頂、不可吃、版本衝突）。
 * 寶石捷連線維持正式站的文字版（一鍵自動挑最弱材料、說明書），只加上五顆星與吃卡回饋。規則、伺服端計算、確認步驟都不變。
 */

export default function SharedCultivationPanel({onSaved,onDone,iconOnly=false}:{onSaved?:()=>void;onDone?:()=>void;iconOnly?:boolean}) {
  const [view,setView]=useState<SharedCultivationView|null>(null),[main,setMain]=useState<string[]>([]);
  const [target,setTarget]=useState(''),[material,setMaterial]=useState('');
  const [preview,setPreview]=useState<FusionDisplay|null>(null),[savedChange,setSavedChange]=useState<FusionDisplay|null>(null);
  const [previewRevision,setPreviewRevision]=useState<string|null>(null);
  const [feedback,setFeedback]=useState<CultivationFeedback|null>(null),[savedFeedback,setSavedFeedback]=useState<CultivationFeedback|null>(null);
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
    if(food&&goal){setPreview(null);setTarget(goal.id);setMaterial(food.id);setMessage('');setSavedChange(null);setSavedFeedback(null);}
    setShortcut(null);
  },[shortcut,view]);
  // 即時回饋：選定目標就向伺服端一次取回每張候選材料的「攻擊 +N・約 +X%・星級變化」（只讀），顯示在材料卡上。
  const [options,setOptions]=useState<{targetId:string;revision:string;byId:Record<string,{feedback?:CultivationFeedback;error?:string}>}|null>(null);
  useEffect(()=>{let active=true;
    if(target&&view)void sharedRequest({type:'PREVIEW_TARGET',revision:view.revision,targetId:target}).then(r=>{if(active)setOptions({targetId:target,revision:view.revision,byId:Object.fromEntries((r.options??[]).map((o:{materialId:string;feedback?:CultivationFeedback;error?:string})=>[o.materialId,o]))});}).catch(()=>{if(active)setOptions(null);});
    else setOptions(null);
    return()=>{active=false;};
  },[target,view?.revision]);
  useEffect(()=>{let active=true;setPreview(null);setFeedback(null);operation.current=null;
    if(target&&material&&view)void sharedRequest({type:'PREVIEW',revision:view.revision,choices:[{targetId:target,materialId:material}]}).then(r=>{if(active){setPreview(r.changes[0]);setFeedback(r.feedback?.[0]??null);setPreviewRevision(view.revision);setError('');}}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[target,material,view?.revision,previewAttempt]);
  const save=async(type:'MAIN_TEAM'|'FUSE')=>{
    if(!view||busy||saving.current)return;
    if(type==='FUSE'&&(!book||!preview||previewRevision!==view.revision||preview.targetId!==target||preview.materialId!==material))return;
    saving.current=true;setBusy(true);setError('');operation.current??=crypto.randomUUID();
    try{const result=await navigator.locks.request('tdh-beast-collection',{ifAvailable:true},lock=>{if(!lock)throw new Error('另一分頁正在戰鬥或保存，請先完成。');return sharedRequest({type,revision:view.revision,operationId:operation.current,...(type==='MAIN_TEAM'?{ids:main}:{choices:[{targetId:target,materialId:material}]})});});
      if(!alive.current)return;setView(result.view);setMain(result.view.protectedIds);setTarget('');setMaterial('');setPreview(null);operation.current=null;
      setSavedChange(type==='FUSE'?result.changes[0]:null);setSavedFeedback(type==='FUSE'?result.feedback?.[0]??null:null);
      setMessage(type==='MAIN_TEAM'?'五隻主力已鎖定，可整組更換。':'');onSaved?.();
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:'尚未確認保存，請重試同一次操作。');}finally{saving.current=false;if(alive.current)setBusy(false);}
  };
  // 預設自動挑「原始攻擊最低」的那一張對應材料（資料都是後端給的字串，這裡只挑一張）；想自己選就展開「自己選材料」。
  const autoMaterial=(targetCardId:string)=>{const base=(c:{orbAttack:string;bonus:string})=>{try{return BigInt(c.orbAttack)-BigInt(c.bonus);}catch{return 0n;}};const options=(view?.cards??[]).filter(c=>!c.protected&&c.materialTargetCardId===targetCardId).sort((a,b)=>{const d=base(a)-base(b);return d>0n?1:d<0n?-1:0;});return options[0]?.id??'';};
  const targetCard=view?.cards.find(c=>c.id===target);
  const materialCard=view?.cards.find(c=>c.id===material);
  const face=(id:string)=>book?<CatalogBeastCard id={id}/>:<span role="status">{bookError?'卡面暫時無法取得':'卡面載入中…'}</span>;
  const previewReady=!!preview&&previewRevision===view?.revision&&preview.targetId===target&&preview.materialId===material;
  if(iconOnly)return <GuideBookProvider value={book}><IconPanel {...{view,main,setMain,target,setTarget:(id:string)=>{setPreview(null);setTarget(id);setMaterial(autoMaterial(view?.cards.find(c=>c.id===id)?.cardId??''));setMessage('');setSavedChange(null);setSavedFeedback(null);},material,setMaterial:(id:string)=>{if(material!==id){setPreview(null);setMaterial(id);}},preview:previewReady?feedback:null,saved:savedFeedback,busy,error,message,options,operation,resultRef,load,save,onDone,setBusy,setError,ready:previewReady&&!!book}}/></GuideBookProvider>;
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
    {savedChange&&<div ref={resultRef} tabIndex={-1} role="status" data-shared-growth-result><p data-fusion-sentence><b>{savedChange.targetName}吃掉{savedChange.materialName}</b>：寶石攻擊 {savedChange.orbBeforeAttack}→{savedChange.orbAfterAttack}，神獸戰鬥攻擊 {savedChange.battleBeforeAttack}→{savedChange.battleAfterAttack}</p>{savedFeedback&&<FoodChainFeedback key={savedFeedback.materialId} change={savedFeedback} phase="saved"/>}</div>}
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
      <div className={`${styles.grid} ${fusion.selection}`}>{view.cards.filter(c=>c.form!=='YOUNG').map(card=><button key={card.id} type="button" data-shared-target={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={target===card.id} onClick={()=>{setPreview(null);setTarget(card.id);setMaterial(autoMaterial(card.cardId));setMessage('');setSavedChange(null);}}><span className={fusion.badge}>{target===card.id?'✓ 強化這張':'點我強化'}</span>{face(card.cardId)}<strong>{card.name}</strong><small>{card.copyLabel}</small><small>永久 +{card.bonus} · 寶石攻擊 {card.orbAttack} · 神獸戰鬥攻擊 {card.battleAttack}</small>{card.stars&&<span data-target-stars={card.stars.stars}><CardStarBar stars={card.stars} percent={card.bonusPercent} atCap={card.atBonusCap}/></span>}</button>)}</div>
      {targetCard&&!material&&<p role="status" data-no-material>這張目前沒有可以吃的材料</p>}
      {targetCard&&<details data-testid="pick-material-manually"><summary ref={materialRef as unknown as React.Ref<HTMLElement>} tabIndex={-1}>自己選材料</summary><div className={`${styles.grid} ${fusion.selection}`}>{view.cards.filter(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId).map(card=><button key={card.id} type="button" data-shared-material={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={material===card.id} onClick={()=>{if(material!==card.id){setPreview(null);setMaterial(card.id);}}}><span className={fusion.badge}>{material===card.id?'✓ 已選材料・會消耗':'材料・確認後消耗'}</span>{face(card.cardId)}<strong>{card.name}</strong><small>{card.copyLabel} · 永久 +{card.bonus}</small>{(()=>{const o=options?.targetId===target?options.byId[card.id]:undefined;if(!o)return null;if(o.error)return <small className={styles.feedChip} data-feed-chip-error>{o.error}</small>;const f=o.feedback!;return <small className={styles.feedChip} data-feed-chip={f.addedBonus}><span>攻擊</span> +{f.addedBonus} · <span>約</span> +{f.addedPercent.label}%</small>;})()}</button>)}</div></details>}
      <div ref={reviewRef} className={fusion.review}>
      {previewReady&&preview&&<div data-shared-preview><div className={fusion.pair}><div><strong>目標・保留</strong>{targetCard&&<span className={fusion.portrait}>{face(targetCard.cardId)}</span>}<b>{preview.targetName}</b><small>{targetCard?.copyLabel}</small></div><div><strong>材料・消耗 × {preview.materialCount}</strong>{materialCard&&<span className={fusion.portrait}>{face(materialCard.cardId)}</span>}<b>{preview.materialName}</b><small>{materialCard?.copyLabel}</small></div></div><p data-fusion-sentence><b>{preview.targetName}吃掉{preview.materialName}</b>：寶石攻擊 {preview.orbBeforeAttack}→{preview.orbAfterAttack}，神獸戰鬥攻擊 {preview.battleBeforeAttack}→{preview.battleAfterAttack}</p>{feedback&&<FoodChainFeedback change={feedback} phase="preview"/>}</div>}
      {target&&material&&!previewReady&&!error&&<p role="status">正在取得後端合體預覽…</p>}
      <button type="button" className={styles.confirm} data-confirm-shared-fusion disabled={busy||!previewReady||!book||!!view.pendingBattle} onClick={()=>void save('FUSE')}>{busy?'正在保存…':'強化一次'}</button>
      {target&&<div className={fusion.actions}><button type="button" disabled={busy} onClick={()=>{setMaterial('');setPreview(null);materialRef.current?.focus();materialRef.current?.scrollIntoView({block:'start'});}}>重選材料</button><button type="button" disabled={busy} onClick={()=>{setTarget('');setMaterial('');setPreview(null);setError('');}}>取消本次合體</button></div>}
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
type IconProps={view:SharedCultivationView|null;main:string[];setMain:React.Dispatch<React.SetStateAction<string[]>>;target:string;setTarget:(v:string)=>void;material:string;setMaterial:(v:string)=>void;preview:CultivationFeedback|null;saved:CultivationFeedback|null;busy:boolean;error:string;message:string;options:{targetId:string;byId:Record<string,{feedback?:CultivationFeedback;error?:string}>}|null;operation:React.MutableRefObject<string|null>;resultRef:React.RefObject<HTMLDivElement|null>;ready:boolean;load:()=>Promise<void>;save:(t:'MAIN_TEAM'|'FUSE')=>Promise<void>;onDone?:()=>void;setBusy:(v:boolean)=>void;setError:(v:string)=>void};
function IconPanel(p:IconProps) {
  const {view,main,target,material,preview,saved,busy,error,options}=p;
  // 手機 390：勾勾確認鈕黏在捲動區底部（sticky，永遠在畫面內，不壓到底部「返回選隊」列）；
  // 預覽出來時把即時 +X% 捲進可視範圍，並預留確認鈕的高度（scroll-margin-bottom），數字不被鈕蓋住。純版面，不改邏輯。
  const confirmRef=useRef<HTMLButtonElement>(null),previewRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(preview)(previewRef.current??confirmRef.current)?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[preview]);
  const targetCard=view?.cards.find(c=>c.id===target);
  const err=error?errorIcon(error):null;
  return <section className={`${styles.panel} ${icon.panel}`} data-shared-cultivation data-icon-only aria-label="共同神獸卡庫・合體培養">
    {err&&<div role="alert" className={icon.alert} data-error-kind={err.kind} key={error}><span className={icon.alertGlyph} aria-hidden="true">{err.glyph}</span><Sr>{error}</Sr><button type="button" className={icon.iconBtn} disabled={busy} onClick={()=>void p.load()} aria-label="重新讀取卡庫"><span aria-hidden="true">↻</span></button></div>}
    {p.message&&<p role="status" data-shared-saved className={icon.sr}>{p.message}</p>}
    {saved&&<div ref={p.resultRef} tabIndex={-1} className={styles.feedbackAnchor}><FoodChainFeedback key={saved.materialId} change={saved} phase="saved" iconOnly/></div>}
    {!view?<p aria-busy="true" className={icon.loading}><span aria-hidden="true">⏳</span><Sr>正在讀取卡庫…</Sr></p>:<>
      {view.pendingBattle&&<div role="alert" className={icon.alert} data-error-kind="battle"><span className={icon.alertGlyph} aria-hidden="true">⚔⏳</span><Sr>戰鬥尚未結束，請先返回原戰鬥結算或離開。</Sr><button type="button" className={icon.iconBtn} disabled={busy} aria-label="結束未完成戰局（不扣卡、不發獎）" onClick={async()=>{p.setBusy(true);try{if(view.pendingBattle?.startsWith('card:'))await (await import('@/lib/beast-collection')).releaseLiveBattle(view.pendingBattle);else await sharedRequest({type:'RELEASE',battleId:view.pendingBattle});await p.load();}catch(e){p.setError(e instanceof Error?e.message:'暫時無法結束原戰局。');}finally{p.setBusy(false);}}}><span aria-hidden="true">✖</span></button></div>}
      <div className={icon.stepHead} aria-hidden="true"><span>🔒</span><b>{main.length}/5</b></div>
      <div className={styles.grid} role="group" aria-label="親選五隻收藏主力（鎖定主力不能當材料）">{view.cards.map(card=><button key={card.id} type="button" data-main-copy={card.id} aria-pressed={main.includes(card.id)} aria-label={`${card.name}${card.protected?'，主力已鎖定':''}`} disabled={busy||!!view.pendingBattle} onClick={()=>{p.operation.current=null;p.setMain(ids=>ids.includes(card.id)?ids.filter(id=>id!==card.id):ids.length<5?[...ids,card.id]:ids);}}>
        <CatalogBeastCard id={card.cardId}/>{main.includes(card.id)&&<span className={icon.badge} aria-hidden="true">🔒</span>}{card.bonus!=='0'&&<b className={icon.num} aria-hidden="true">+{card.bonusPercent}%</b>}
      </button>)}</div>
      <button type="button" className={`${styles.confirm} ${icon.check}`} data-save-main aria-label="確認這五隻主力" disabled={busy||!!view.pendingBattle||main.length!==5} onClick={()=>void p.save('MAIN_TEAM')}><span aria-hidden="true">🔒✓</span></button>
      <div className={icon.stepHead} aria-hidden="true"><span>⬆</span></div>
      <div className={styles.grid} role="group" aria-label="選擇要強化的神獸">{view.cards.filter(c=>c.form!=='YOUNG').map(card=><button key={card.id} type="button" data-shared-target={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={target===card.id} aria-label={`${card.name}，永久 +${card.bonus}，寶石攻擊 ${card.orbAttack}，神獸戰鬥攻擊 ${card.battleAttack}${card.stars?`，${card.stars.stars} 星${card.stars.toNext===null?'，已五星封頂':`，下一星還差 ${card.stars.toNext} 張`}`:''}`} onClick={()=>p.setTarget(card.id)}><CatalogBeastCard id={card.cardId}/>{card.stars&&<span data-target-stars={card.stars.stars}><CardStarBar stars={card.stars} percent={card.bonusPercent} atCap={card.atBonusCap} iconOnly/></span>}</button>)}</div>
      {targetCard&&<><div className={icon.stepHead} aria-hidden="true"><span>🍴</span></div><div className={styles.grid} role="group" aria-label="選擇對應材料">{view.cards.filter(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId).map(card=>{const o=options?.targetId===target?options.byId[card.id]:undefined,f=o?.feedback,e=o?.error?errorIcon(o.error):null;
        return <button key={card.id} type="button" data-shared-material={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={material===card.id} aria-label={`${card.name}${f?`，攻擊 +${f.addedBonus}，約 +${f.addedPercent.label}%`:''}${o?.error?`，${o.error}`:''}`} onClick={()=>p.setMaterial(card.id)}><CatalogBeastCard id={card.cardId}/>
          {e?<b className={`${icon.chip} ${icon.chipError}`} data-feed-chip-error data-error-kind={e.kind} aria-hidden="true">{e.glyph}</b>:f?<b className={icon.chip} data-feed-chip={f.addedBonus} aria-hidden="true">+{f.addedPercent.label}%{f.starsBefore&&f.starsAfter&&f.starsAfter.stars>f.starsBefore.stars?<> ★↑</>:null}</b>:null}
        </button>;})}</div>
        {!view.cards.some(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId)&&<div role="status" data-no-material className={icon.alert} data-error-kind="empty"><span className={icon.alertGlyph} aria-hidden="true">🍴✖</span><Sr>目前沒有可以餵給這張卡的材料（鎖定主力不能當材料）。</Sr></div>}</>}
      {preview&&<div ref={previewRef} data-shared-preview className={icon.previewAnchor}><FoodChainFeedback change={preview} phase="preview" iconOnly/></div>}
      <button ref={confirmRef} type="button" className={`${styles.confirm} ${styles.feedbackAnchor} ${icon.check} ${icon.stickyConfirm}`} data-sticky-confirm data-confirm-shared-fusion aria-label={busy?'正在保存…':'確認消耗材料並合體'} disabled={busy||!p.ready||!!view.pendingBattle} onClick={()=>void p.save('FUSE')}><span aria-hidden="true">{busy?'⏳':'✓'}</span></button>
    </>}
    {p.onDone&&<button type="button" className={icon.iconBtn} disabled={busy} onClick={p.onDone} aria-label="返回選卡"><span aria-hidden="true">↩</span></button>}
  </section>;
}
