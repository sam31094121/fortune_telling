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
 * 文字版先選目標，再顯示單張目標與合法材料；點材料預覽、另行確認，說明與主力管理獨立顯示。
 */

export default function SharedCultivationPanel({onSaved,onDone,iconOnly=false,visualGuide=false}:{onSaved?:()=>void;onDone?:()=>void;iconOnly?:boolean;visualGuide?:boolean}) {
  const [view,setView]=useState<SharedCultivationView|null>(null),[main,setMain]=useState<string[]>([]);
  const [target,setTarget]=useState(''),[material,setMaterial]=useState('');
  const [preview,setPreview]=useState<FusionDisplay|null>(null),[savedChange,setSavedChange]=useState<FusionDisplay|null>(null);
  const [previewRevision,setPreviewRevision]=useState<string|null>(null);
  const [feedback,setFeedback]=useState<CultivationFeedback|null>(null),[savedFeedback,setSavedFeedback]=useState<CultivationFeedback|null>(null);
  const [screen,setScreen]=useState<'fusion'|'help'|'main'>('fusion');
  const [shortcut,setShortcut]=useState<string|null>(null);
  const [previewAttempt,setPreviewAttempt]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [book,setBook]=useState<GuideBook|null>(null),[bookError,setBookError]=useState(''),[bookLoading,setBookLoading]=useState(false);
  const bookRequest=useRef<Promise<GuideBook>|null>(null),saving=useRef(false);
  const reviewRef=useRef<HTMLDivElement>(null);
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
      if(!alive.current)return;setView(result.view);setMain(result.view.protectedIds);if(iconOnly||type==='MAIN_TEAM')setTarget('');setMaterial('');setPreview(null);operation.current=null;
      setSavedChange(type==='FUSE'?result.changes[0]:null);setSavedFeedback(type==='FUSE'?result.feedback?.[0]??null:null);
      setMessage(type==='MAIN_TEAM'?'五隻主力已鎖定，可整組更換。':'');if(type==='MAIN_TEAM'&&!iconOnly)setScreen('fusion');onSaved?.();
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:'尚未確認保存，請重試同一次操作。');}finally{saving.current=false;if(alive.current)setBusy(false);}
  };
  // 預設自動挑「原始攻擊最低」的那一張對應材料（資料都是後端給的字串，這裡只挑一張）；想自己選就展開「自己選材料」。
  const autoMaterial=(targetCardId:string)=>{const base=(c:{orbAttack:string;bonus:string})=>{try{return BigInt(c.orbAttack)-BigInt(c.bonus);}catch{return 0n;}};const options=(view?.cards??[]).filter(c=>!c.protected&&c.materialTargetCardId===targetCardId).sort((a,b)=>{const d=base(a)-base(b);return d>0n?1:d<0n?-1:0;});return options[0]?.id??'';};
  const targetCard=view?.cards.find(c=>c.id===target);
  const materialCard=view?.cards.find(c=>c.id===material);
  const face=(id:string,attack?:string)=>book?<CatalogBeastCard id={id} attackOverride={attack}/>:<span role="status">{bookError?'卡面暫時無法取得':'卡面載入中…'}</span>;
  const previewReady=!!preview&&previewRevision===view?.revision&&preview.targetId===target&&preview.materialId===material;
  const materialChoices=targetCard&&view?(<div className={styles.grid+' '+fusion.selection} role="group" aria-label="選擇要消耗的材料" data-material-zone>{view.cards.filter(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId).map(card=><button key={card.id} type="button" data-shared-material={card.id} aria-label={card.name+'，'+card.copyLabel+'，確認後消耗'} disabled={busy||!!view.pendingBattle} aria-pressed={material===card.id} onClick={()=>{if(material!==card.id){setPreview(null);setMaterial(card.id);setSavedChange(null);setSavedFeedback(null);setError('');}}}>{face(card.cardId,card.orbAttack)}{material===card.id&&<span className={fusion.selectedMark} aria-hidden="true">✓</span>}</button>)}</div>):null;
  if(iconOnly)return <GuideBookProvider value={book}><IconPanel {...{view,main,setMain,target,setTarget:(id:string)=>{setPreview(null);setTarget(id);setMaterial(autoMaterial(view?.cards.find(c=>c.id===id)?.cardId??''));setMessage('');setSavedChange(null);setSavedFeedback(null);},material,setMaterial:(id:string)=>{if(material!==id){setPreview(null);setMaterial(id);}},preview:previewReady?feedback:null,saved:savedFeedback,busy,error,message,options,operation,resultRef,load,save,onDone,setBusy,setError,ready:previewReady&&!!book}}/></GuideBookProvider>;
  return <GuideBookProvider value={book}><section className={`${styles.panel} ${fusion.panel} ${visualGuide?fusion.visualGuide:''}`} data-shared-cultivation data-visual-guide={visualGuide||undefined}>
    <nav className={fusion.actions} aria-label="培養選單"><button type="button" aria-label={screen==='help'?'返回合體':'說明'} disabled={busy} onClick={()=>setScreen(screen==='help'?'fusion':'help')}><span aria-hidden="true">{screen==='help'?'↩':'ⓘ'}</span></button><button type="button" aria-label={screen==='main'?'返回合體':'設定保護卡'} disabled={busy} onClick={()=>setScreen(screen==='main'?'fusion':'main')}><span aria-hidden="true">{screen==='main'?'↩':'🔒'}</span></button></nav>
    {screen==='help'&&<div data-testid="fusion-manual"><h2>說明</h2>{view&&<><p data-protection-reason>{view.protectionReason}</p><p>{view.protectionTieBreak}</p></>}
      <p>寶石捷連線與神獸戰鬥共用收藏及成長。免費試用牌不消耗，也不計入收藏主力。</p>
      <p>鎖定主力不能當材料；更換時一次確認完整五隻，收藏可以超過五隻。</p>
      <p>同星宿幼子被對應本體吃掉；本體被所屬四大神獸吃掉。每次消耗一張材料，目標保留並永久增加攻擊；材料不能重用，目標可繼續強化。</p>
      <p>每次加攻＝材料原始攻擊 ÷ 10，無條件捨去，最低 +1；本體被四大神獸吃掉時，另傳承它累積加成的一半。永久加成總和最多到卡面攻擊的 50%。只增加攻擊，生命與技能不變。</p>
      <p>五顆星：每吃一張累計一次，四大神獸吃滿 1000 張、本體吃滿 500 張封頂（第五星佔一半，前面依序減半），封頂後不能再吃。</p>
    </div>}
    {bookError&&<div role="alert" className={fusion.notice}>{bookError}<button type="button" disabled={bookLoading} onClick={()=>void loadBook()}>重新載入卡面</button></div>}
    {error&&<p ref={errorRef} tabIndex={-1} role="alert">{error}<button type="button" disabled={busy} onClick={()=>void load()}>重新讀取卡庫</button></p>}
    {message&&<p role="status" className={icon.sr} data-shared-saved>{message}</p>}
    {!view?<p aria-busy="true" aria-label="正在讀取卡庫">⏳</p>:<>
      {view.pendingBattle&&<p role="alert">戰鬥尚未結束，請先返回原戰鬥結算或離開。<button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{if(view.pendingBattle?.startsWith('card:'))await (await import('@/lib/beast-collection')).releaseLiveBattle(view.pendingBattle);else await sharedRequest({type:'RELEASE',battleId:view.pendingBattle});await load();}catch(e){setError(e instanceof Error?e.message:'暫時無法結束原戰局。');}finally{setBusy(false);}}}>結束未完成戰局（不扣卡、不發獎）</button></p>}
      {(screen==='main'||(screen==='fusion'&&view.reason&&!view.pendingBattle))&&<div data-cultivation-prerequisite><Sr>{view.reason??'選擇五張保護卡'}</Sr><div className={fusion.slots} role="group" aria-label={view.protectionReason} data-strongest-protected>{view.strongestProtectedIds.map(id=>{const card=view.cards.find(c=>c.id===id);return card?<div key={id} aria-label={card.name+'，累積培養 +'+card.bonus+'，已自動保護'}>{face(card.cardId,card.orbAttack)}<span aria-hidden="true">🔒</span></div>:null;})}</div><div className={fusion.slots} role="group" aria-label="五張保護卡槽">{Array.from({length:5},(_,i)=>{const card=view.cards.find(c=>c.id===main[i]);return <button key={i} type="button" aria-label={card?'取消保護 '+card.name:'未選卡槽 '+(i+1)} disabled={busy||!card} onClick={()=>{operation.current=null;setMain(ids=>ids.filter(id=>id!==card?.id));}}>{card?face(card.cardId,card.orbAttack):<span aria-hidden="true">＋</span>}</button>;})}</div>
      {!view.canProtectFive&&<p role="status">目前不足五種可出戰收藏，請先取得收藏；仍可使用原本的試玩入口。</p>}
      <p aria-label="已選保護卡數" className={fusion.count}>🔒 {main.length}/5</p>
      <div className={styles.grid}>{view.cards.map(card=><button key={card.id} type="button" data-main-copy={card.id} aria-label={card.name+'，'+card.copyLabel} aria-pressed={main.includes(card.id)} disabled={busy||!!view.pendingBattle} onClick={()=>{operation.current=null;setMain(ids=>ids.includes(card.id)?ids.filter(id=>id!==card.id):ids.length<5?[...ids,card.id]:ids);}}>
        {face(card.cardId,card.orbAttack)}{main.includes(card.id)&&<span className={fusion.selectedMark} aria-hidden="true">✓</span>}
      </button>)}</div>
      <button type="button" className={styles.confirm} data-save-main aria-label="確認這五隻主力" disabled={busy||!!view.pendingBattle||main.length!==5} onClick={()=>void save('MAIN_TEAM')}><span aria-hidden="true">🔒 ✓</span></button></div>}
      {screen==='fusion'&&!view.reason&&<>
      {!targetCard?<><Sr>選擇要強化的神獸</Sr><div className={styles.grid+' '+fusion.selection}>{view.cards.filter(c=>c.form!=='YOUNG').map(card=><button key={card.id} type="button" data-shared-target={card.id} data-maxed={card.stars?.toNext===null?'true':undefined} aria-label={card.name+'，'+card.copyLabel+(card.stars?.toNext===null?'，已五星封頂':'')} disabled={busy||!!view.pendingBattle||card.stars?.toNext===null} onClick={()=>{setPreview(null);setTarget(card.id);setMaterial('');setMessage('');setSavedChange(null);setSavedFeedback(null);setError('');}}>{face(card.cardId,card.orbAttack)}{card.strongestProtected&&<span className={fusion.selectedMark} data-strongest-lock aria-label="培養成果保護">🔒</span>}</button>)}</div></>:<FusionStage enabled={visualGuide}>
        <div className={fusion.targetZone} data-selected-target={targetCard.id}><div className={fusion.largeCard} data-fusion-complete={visualGuide&&savedChange?savedChange.materialId:undefined} key={visualGuide?savedChange?.materialId:undefined}>{face(targetCard.cardId,targetCard.orbAttack)}</div>
          {visualGuide&&<div className={fusion.materialDock} data-material-dock data-saved={savedChange?'true':undefined}>
            <span className={fusion.flow} aria-hidden="true" />
            <div className={fusion.materialSeat} key={material||savedChange?.materialId}>
              {materialCard?face(materialCard.cardId,materialCard.orbAttack):savedChange?<div className={fusion.absorbed} aria-hidden="true">{face(savedChange.materialCardId)}</div>:<span className={fusion.emptySeat} aria-hidden="true">＋</span>}
            </div>
          </div>}
        </div>
        <div className={fusion.actions}><button type="button" aria-label="更換神獸" disabled={busy} onClick={()=>{setTarget('');setMaterial('');setPreview(null);setSavedChange(null);setSavedFeedback(null);setError('');}}><span aria-hidden="true">↻</span></button></div>
        {!visualGuide&&materialChoices}
        {!view.cards.some(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId)&&<p role="status" data-no-material aria-label="這張目前沒有可以吃的材料"><span aria-hidden="true">🃏 ∅</span>{targetCard.acceptsMaterialsText&&<small data-no-material-reason> {targetCard.acceptsMaterialsText}</small>}</p>}
            {savedChange&&<div ref={resultRef} tabIndex={-1} role="status" data-shared-growth-result>{!savedFeedback&&<p data-fusion-sentence>💎 {savedChange.orbBeforeAttack}→{savedChange.orbAfterAttack}　⚔ {savedChange.battleBeforeAttack}→{savedChange.battleAfterAttack}</p>}{savedFeedback&&<FoodChainFeedback key={savedFeedback.materialId} change={savedFeedback} phase="saved" iconOnly concise/>}</div>}

        {material&&<div ref={reviewRef} className={fusion.review}>
          {previewReady&&preview&&<div data-shared-preview>{feedback?<FoodChainFeedback change={feedback} phase="preview" iconOnly concise/>:<p>💎 {preview.orbBeforeAttack}→{preview.orbAfterAttack}　⚔ {preview.battleBeforeAttack}→{preview.battleAfterAttack}</p>}</div>}
          {!previewReady&&!error&&<p role="status" aria-label="正在取得後端合體預覽">⏳</p>}
          <button type="button" className={styles.confirm+' '+fusion.stickyConfirm} data-sticky-confirm data-confirm-shared-fusion aria-label="確認消耗材料並強化" disabled={busy||!previewReady||!book||!!view.pendingBattle} onClick={()=>void save('FUSE')}><span aria-hidden="true">{busy?'⏳':'✓'}</span></button>
          <div className={fusion.actions}><button type="button" aria-label="取消本次合體" disabled={busy} onClick={()=>{setMaterial('');setPreview(null);setError('');}}><span aria-hidden="true">✕</span></button></div>
        </div>}
        {visualGuide&&materialChoices}
      </FusionStage>}
      </>}
    </>}
    {onDone&&<button type="button" className={icon.iconBtn} aria-label="返回選卡" disabled={busy} onClick={onDone}><span aria-hidden="true">↩</span></button>}
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
  // 手機 390：預覽出來就把勾勾確認鈕捲進可視範圍（避開底部固定列）。
  const confirmRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(preview)confirmRef.current?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[preview]);
  const targetCard=view?.cards.find(c=>c.id===target);
  const err=error?errorIcon(error):null;
  return <section className={`${styles.panel} ${icon.panel}`} data-shared-cultivation data-icon-only aria-label="共同神獸卡庫・合體培養">
    {view&&<details><summary aria-label="培養成果保護說明">ⓘ</summary><p data-protection-reason>{view.protectionReason}</p><p>{view.protectionTieBreak}</p></details>}
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
      {preview&&<div data-shared-preview><FoodChainFeedback change={preview} phase="preview" iconOnly/></div>}
      <button ref={confirmRef} type="button" className={`${styles.confirm} ${styles.feedbackAnchor} ${icon.check}`} data-confirm-shared-fusion aria-label={busy?'正在保存…':'確認消耗材料並合體'} disabled={busy||!p.ready||!!view.pendingBattle} onClick={()=>void p.save('FUSE')}><span aria-hidden="true">{busy?'⏳':'✓'}</span></button>
    </>}
    {p.onDone&&<button type="button" className={icon.iconBtn} disabled={busy} onClick={p.onDone} aria-label="返回選卡"><span aria-hidden="true">↩</span></button>}
  </section>;
}

function FusionStage({enabled,children}:{enabled:boolean;children:React.ReactNode}) {
  return enabled?<div className={fusion.workspace}>{children}</div>:<>{children}</>;
}
