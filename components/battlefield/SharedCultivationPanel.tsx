'use client';
import { useEffect, useRef, useState } from 'react';
import { readSharedCultivation, syncSharedCultivation, sharedRequest, SHARED_UPDATED, type SharedCultivationView } from '@/lib/beast-cultivation-client';
import { takeFeedShortcut, FOOD_CHAIN_SHORTCUT } from '@/lib/beast-food-chain-client';
import type { CultivationFeedback } from '@/lib/beast-game/cultivation-view';
import CatalogBeastCard from './CatalogBeastCard';
import FoodChainFeedback from './FoodChainFeedback';
import CardStarBar from './CardStarBar';
import styles from './OwnedCampaignPreparation.module.css';
import icon from './FoodChainIcons.module.css';

/**
 * iconOnly（2026-11-15 22:44 使用者指示，神獸戰鬥）：純圖示導向——畫面不顯示說明文字，只留卡圖、五顆星、吃卡箭頭、勾勾確認鈕與數字；
 * 每顆按鈕保留 aria-label（讀屏用，畫面不顯示），觸控區 ≥44px；錯誤用圖示＋短動效（封頂、不可吃、版本衝突）。
 * 寶石捷連線仍用文字版（未傳 iconOnly）。規則、伺服端計算、確認步驟都不變。
 */
export default function SharedCultivationPanel({onSaved,onDone,iconOnly=false}:{onSaved?:()=>void;onDone?:()=>void;iconOnly?:boolean}) {
  const [view,setView]=useState<SharedCultivationView|null>(null),[main,setMain]=useState<string[]>([]);
  const [target,setTarget]=useState(''),[material,setMaterial]=useState('');
  const [preview,setPreview]=useState<CultivationFeedback|null>(null),[saved,setSaved]=useState<CultivationFeedback|null>(null);
  const [shortcut,setShortcut]=useState<string|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const operation=useRef<string|null>(null),alive=useRef(true);
  const confirmRef=useRef<HTMLButtonElement>(null),savedRef=useRef<HTMLDivElement>(null);
  // 手機 390：預覽出來就把「確認」捲進可視範圍（避開寶珠選隊頁固定在底部的開戰列）；存檔後把回饋卡捲到畫面中間。
  const motion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant' as ScrollBehavior:'smooth' as ScrollBehavior;
  useEffect(()=>{if(preview)confirmRef.current?.scrollIntoView({block:'nearest',behavior:motion()});},[preview]);
  useEffect(()=>{if(saved)savedRef.current?.scrollIntoView({block:'center',behavior:motion()});},[saved]);
  const load=async()=>{setBusy(true);try{const value=await syncSharedCultivation();if(alive.current){setView(value);setMain(value.protectedIds);setError('');}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'卡庫暫時無法取得。');}finally{if(alive.current)setBusy(false);}};
  // 9A：「拿去強化」只預選目標與材料，仍要玩家按確認；讀一次就清掉。
  useEffect(()=>{const take=()=>{const id=takeFeedShortcut();if(id)setShortcut(id);};take();window.addEventListener(FOOD_CHAIN_SHORTCUT,take);return()=>window.removeEventListener(FOOD_CHAIN_SHORTCUT,take);},[]);
  useEffect(()=>{if(!shortcut||!view)return;
    const material=[...view.cards].reverse().find(c=>c.cardId===shortcut&&!c.protected&&c.materialTargetCardId);
    const goal=material&&view.cards.filter(c=>c.cardId===material.materialTargetCardId).sort((a,b)=>Number(b.protected)-Number(a.protected))[0];
    if(material&&goal){setTarget(goal.id);setMaterial(material.id);setMessage('');setSaved(null);}
    setShortcut(null);
  },[shortcut,view]);
  useEffect(()=>{alive.current=true;void load();const update=()=>{const value=readSharedCultivation();if(value)setView(value);};window.addEventListener(SHARED_UPDATED,update);return()=>{alive.current=false;window.removeEventListener(SHARED_UPDATED,update);};},[]);
  // 即時預覽：選定目標就向伺服端一次取回每張候選材料的「攻擊 +N・約 +X%・星級變化」（只讀），選材料時立刻顯示，不用再等一趟。
  const [options,setOptions]=useState<{targetId:string;revision:string;byId:Record<string,{feedback?:CultivationFeedback;error?:string}>}|null>(null);
  useEffect(()=>{let active=true;
    if(target&&view)void sharedRequest({type:'PREVIEW_TARGET',revision:view.revision,targetId:target}).then(r=>{if(active)setOptions({targetId:target,revision:view.revision,byId:Object.fromEntries((r.options??[]).map((o:{materialId:string;feedback?:CultivationFeedback;error?:string})=>[o.materialId,o]))});}).catch(()=>{if(active)setOptions(null);});
    else setOptions(null);
    return()=>{active=false;};
  },[target,view?.revision]);
  useEffect(()=>{let active=true;operation.current=null;
    const known=options&&options.targetId===target&&options.revision===view?.revision?options.byId[material]:undefined;
    if(known?.feedback){setPreview(known.feedback);setError('');return;}
    setPreview(null);
    if(known?.error){setError(known.error);return;}
    if(target&&material&&view)void sharedRequest({type:'PREVIEW',revision:view.revision,choices:[{targetId:target,materialId:material}]}).then(r=>{if(active){setPreview(r.feedback?.[0]??null);setError('');}}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[target,material,view?.revision,options]);
  const save=async(type:'MAIN_TEAM'|'FUSE')=>{
    if(!view||busy)return;setBusy(true);setError('');operation.current??=crypto.randomUUID();
    try{const result=await navigator.locks.request('tdh-beast-collection',{ifAvailable:true},lock=>{if(!lock)throw new Error('另一分頁正在戰鬥或保存，請先完成。');return sharedRequest({type,revision:view.revision,operationId:operation.current,...(type==='MAIN_TEAM'?{ids:main}:{choices:[{targetId:target,materialId:material}]})});});
      if(!alive.current)return;setView(result.view);setMain(result.view.protectedIds);setTarget('');setMaterial('');setPreview(null);operation.current=null;
      // 具體回饋（吃了誰、攻擊 +N、兩款遊戲攻擊前後）由下方 FoodChainFeedback 照印伺服端數字；狀態句維持固定字串，五語字典對得上。
      const done:CultivationFeedback|undefined=type==='FUSE'?result.feedback?.[0]:undefined;setSaved(done??null);
      setMessage(type==='MAIN_TEAM'?'五隻主力已鎖定，可整組更換。':'合體已保存，材料已扣除，兩款遊戲共用這份成長。');onSaved?.();
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:'尚未確認保存，請重試同一次操作。');}finally{if(alive.current)setBusy(false);}
  };
  const targetCard=view?.cards.find(c=>c.id===target);
  if(iconOnly)return <IconPanel {...{view,main,setMain,target,setTarget,material,setMaterial,preview,saved,setSaved,busy,error,message,setMessage,options,operation,confirmRef,savedRef,load,save,onDone,setBusy,setError}}/>;
  return <section className={styles.panel} data-shared-cultivation>
    <h2>共同神獸卡庫・合體培養</h2>
    <p>寶石捷連線與神獸戰鬥共用收藏及成長。免費試用牌不消耗，也不計入收藏主力。</p>
    {error&&<p role="alert">{error}<button type="button" disabled={busy} onClick={()=>void load()}>重新讀取卡庫</button></p>}
    {message&&<p role="status" data-shared-saved>{message}</p>}
    {saved&&<div ref={savedRef} className={styles.feedbackAnchor}><FoodChainFeedback key={saved.materialId} change={saved} phase="saved"/></div>}
    {!view?<p aria-busy="true">正在讀取卡庫…</p>:<>
      {view.pendingBattle&&<p role="alert">戰鬥尚未結束，請先返回原戰鬥結算或離開。<button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{if(view.pendingBattle?.startsWith('card:'))await (await import('@/lib/beast-collection')).releaseLiveBattle(view.pendingBattle);else await sharedRequest({type:'RELEASE',battleId:view.pendingBattle});await load();}catch(e){setError(e instanceof Error?e.message:'暫時無法結束原戰局。');}finally{setBusy(false);}}}>結束未完成戰局（不扣卡、不發獎）</button></p>}
      <h3>① 親選五隻收藏主力</h3><p>鎖定主力不能當材料。更換時一次確認完整五隻；收藏可以超過五隻。</p>
      {!view.canProtectFive&&<p role="status">目前不足五種可出戰收藏，請先取得收藏；仍可使用原本的試玩入口。</p>}
      <p>已選 {main.length}／5 隻</p>
      <div className={styles.grid}>{view.cards.map(card=><button key={card.id} type="button" data-main-copy={card.id} aria-pressed={main.includes(card.id)} disabled={busy||!!view.pendingBattle} onClick={()=>{operation.current=null;setMain(ids=>ids.includes(card.id)?ids.filter(id=>id!==card.id):ids.length<5?[...ids,card.id]:ids);}}>
        <CatalogBeastCard id={card.cardId}/><strong>{card.name}</strong><small>永久加成 +{card.bonus} {card.protected?'・主力已鎖定':''}</small>
      </button>)}</div>
      <button type="button" className={styles.confirm} data-save-main disabled={busy||!!view.pendingBattle||main.length!==5} onClick={()=>void save('MAIN_TEAM')}>確認這五隻主力</button>
      <h3>② 選擇要強化的神獸</h3><p>同星宿幼子 → 本體；本體 → 所屬四大神獸。每次只消耗親選的材料副本。</p>
      <div className={styles.grid}>{view.cards.filter(c=>c.form!=='YOUNG').map(card=><button key={card.id} type="button" data-shared-target={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={target===card.id} onClick={()=>{setTarget(card.id);setMaterial('');setMessage('');setSaved(null);}}><CatalogBeastCard id={card.cardId}/><strong>{card.name}</strong><small>永久 +{card.bonus} · 寶石攻擊 {card.orbAttack} · 神獸戰鬥攻擊 {card.battleAttack}</small>{card.stars&&<span data-target-stars={card.stars.stars}><CardStarBar stars={card.stars} percent={card.bonusPercent} atCap={card.atBonusCap}/></span>}</button>)}</div>
      {targetCard&&<><h3>③ 選擇對應材料</h3><div className={styles.grid}>{view.cards.filter(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId).map(card=><button key={card.id} type="button" data-shared-material={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={material===card.id} onClick={()=>setMaterial(card.id)}><CatalogBeastCard id={card.cardId}/><strong>{card.name}</strong>{(()=>{const o=options?.targetId===target?options.byId[card.id]:undefined;if(!o)return null;if(o.error)return <small className={styles.feedChip} data-feed-chip-error>{o.error}</small>;const f=o.feedback!;return <small className={styles.feedChip} data-feed-chip={f.addedBonus}><span>攻擊</span> +{f.addedBonus} · <span>約</span> +{f.addedPercent.label}%{f.starsBefore&&f.starsAfter?<><br/>★{f.starsBefore.stars}→★{f.starsAfter.stars}{f.starsAfter.toNext!==null?<> · <span>下一星還差</span> {f.starsAfter.toNext} <span>張</span></>:<> · <span>已五星封頂</span></>}</>:null}</small>;})()}{card.bonus!=='0'&&<small>永久 +{card.bonus}</small>}</button>)}</div>
        {!view.cards.some(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId)&&<p role="status" data-no-material>目前沒有可以餵給這張卡的材料（鎖定主力不能當材料）。</p>}</>}
      {preview&&<div data-shared-preview><FoodChainFeedback change={preview} phase="preview"/></div>}
      <button ref={confirmRef} type="button" className={`${styles.confirm} ${styles.feedbackAnchor}`} data-confirm-shared-fusion disabled={busy||!preview||!!view.pendingBattle} onClick={()=>void save('FUSE')}>{busy?'正在保存…':'確認消耗材料並合體'}</button>
    </>}
    {onDone&&<button type="button" disabled={busy} onClick={onDone}>返回選卡</button>}
  </section>;
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
type IconProps={view:SharedCultivationView|null;main:string[];setMain:React.Dispatch<React.SetStateAction<string[]>>;target:string;setTarget:(v:string)=>void;material:string;setMaterial:(v:string)=>void;preview:CultivationFeedback|null;saved:CultivationFeedback|null;setSaved:(v:CultivationFeedback|null)=>void;busy:boolean;error:string;message:string;setMessage:(v:string)=>void;options:{targetId:string;byId:Record<string,{feedback?:CultivationFeedback;error?:string}>}|null;operation:React.MutableRefObject<string|null>;confirmRef:React.RefObject<HTMLButtonElement|null>;savedRef:React.RefObject<HTMLDivElement|null>;load:()=>Promise<void>;save:(t:'MAIN_TEAM'|'FUSE')=>Promise<void>;onDone?:()=>void;setBusy:(v:boolean)=>void;setError:(v:string)=>void};
function IconPanel(p:IconProps) {
  const {view,main,target,material,preview,saved,busy,error,options}=p;
  const targetCard=view?.cards.find(c=>c.id===target);
  const err=error?errorIcon(error):null;
  return <section className={`${styles.panel} ${icon.panel}`} data-shared-cultivation data-icon-only aria-label="共同神獸卡庫・合體培養">
    {err&&<div role="alert" className={icon.alert} data-error-kind={err.kind} key={error}><span className={icon.alertGlyph} aria-hidden="true">{err.glyph}</span><Sr>{error}</Sr><button type="button" className={icon.iconBtn} disabled={busy} onClick={()=>void p.load()} aria-label="重新讀取卡庫"><span aria-hidden="true">↻</span></button></div>}
    {p.message&&<p role="status" data-shared-saved className={icon.sr}>{p.message}</p>}
    {saved&&<div ref={p.savedRef} className={styles.feedbackAnchor}><FoodChainFeedback key={saved.materialId} change={saved} phase="saved" iconOnly/></div>}
    {!view?<p aria-busy="true" className={icon.loading}><span aria-hidden="true">⏳</span><Sr>正在讀取卡庫…</Sr></p>:<>
      {view.pendingBattle&&<div role="alert" className={icon.alert} data-error-kind="battle"><span className={icon.alertGlyph} aria-hidden="true">⚔⏳</span><Sr>戰鬥尚未結束，請先返回原戰鬥結算或離開。</Sr><button type="button" className={icon.iconBtn} disabled={busy} aria-label="結束未完成戰局（不扣卡、不發獎）" onClick={async()=>{p.setBusy(true);try{if(view.pendingBattle?.startsWith('card:'))await (await import('@/lib/beast-collection')).releaseLiveBattle(view.pendingBattle);else await sharedRequest({type:'RELEASE',battleId:view.pendingBattle});await p.load();}catch(e){p.setError(e instanceof Error?e.message:'暫時無法結束原戰局。');}finally{p.setBusy(false);}}}><span aria-hidden="true">✖</span></button></div>}
      <div className={icon.stepHead} aria-hidden="true"><span>🔒</span><b>{main.length}/5</b></div>
      <div className={styles.grid} role="group" aria-label="親選五隻收藏主力（鎖定主力不能當材料）">{view.cards.map(card=><button key={card.id} type="button" data-main-copy={card.id} aria-pressed={main.includes(card.id)} aria-label={`${card.name}${card.protected?'，主力已鎖定':''}`} disabled={busy||!!view.pendingBattle} onClick={()=>{p.operation.current=null;p.setMain(ids=>ids.includes(card.id)?ids.filter(id=>id!==card.id):ids.length<5?[...ids,card.id]:ids);}}>
        <CatalogBeastCard id={card.cardId}/>{main.includes(card.id)&&<span className={icon.badge} aria-hidden="true">🔒</span>}{card.bonus!=='0'&&<b className={icon.num} aria-hidden="true">+{card.bonusPercent}%</b>}
      </button>)}</div>
      <button type="button" className={`${styles.confirm} ${icon.check}`} data-save-main aria-label="確認這五隻主力" disabled={busy||!!view.pendingBattle||main.length!==5} onClick={()=>void p.save('MAIN_TEAM')}><span aria-hidden="true">🔒✓</span></button>
      <div className={icon.stepHead} aria-hidden="true"><span>⬆</span></div>
      <div className={styles.grid} role="group" aria-label="選擇要強化的神獸">{view.cards.filter(c=>c.form!=='YOUNG').map(card=><button key={card.id} type="button" data-shared-target={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={target===card.id} aria-label={`${card.name}，永久 +${card.bonus}，寶石攻擊 ${card.orbAttack}，神獸戰鬥攻擊 ${card.battleAttack}${card.stars?`，${card.stars.stars} 星${card.stars.toNext===null?'，已五星封頂':`，下一星還差 ${card.stars.toNext} 張`}`:''}`} onClick={()=>{p.setTarget(card.id);p.setMaterial('');p.setMessage('');p.setSaved(null);}}><CatalogBeastCard id={card.cardId}/>{card.stars&&<span data-target-stars={card.stars.stars}><CardStarBar stars={card.stars} percent={card.bonusPercent} atCap={card.atBonusCap} iconOnly/></span>}</button>)}</div>
      {targetCard&&<><div className={icon.stepHead} aria-hidden="true"><span>🍴</span></div><div className={styles.grid} role="group" aria-label="選擇對應材料">{view.cards.filter(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId).map(card=>{const o=options?.targetId===target?options.byId[card.id]:undefined,f=o?.feedback,e=o?.error?errorIcon(o.error):null;
        return <button key={card.id} type="button" data-shared-material={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={material===card.id} aria-label={`${card.name}${f?`，攻擊 +${f.addedBonus}，約 +${f.addedPercent.label}%`:''}${o?.error?`，${o.error}`:''}`} onClick={()=>p.setMaterial(card.id)}><CatalogBeastCard id={card.cardId}/>
          {e?<b className={`${icon.chip} ${icon.chipError}`} data-feed-chip-error data-error-kind={e.kind} aria-hidden="true">{e.glyph}</b>:f?<b className={icon.chip} data-feed-chip={f.addedBonus} aria-hidden="true">+{f.addedPercent.label}%{f.starsBefore&&f.starsAfter&&f.starsAfter.stars>f.starsBefore.stars?<> ★↑</>:null}</b>:null}
        </button>;})}</div>
        {!view.cards.some(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId)&&<div role="status" data-no-material className={icon.alert} data-error-kind="empty"><span className={icon.alertGlyph} aria-hidden="true">🍴✖</span><Sr>目前沒有可以餵給這張卡的材料（鎖定主力不能當材料）。</Sr></div>}</>}
      {preview&&<div data-shared-preview><FoodChainFeedback change={preview} phase="preview" iconOnly/></div>}
      <button ref={p.confirmRef} type="button" className={`${styles.confirm} ${styles.feedbackAnchor} ${icon.check}`} data-confirm-shared-fusion aria-label={busy?'正在保存…':'確認消耗材料並合體'} disabled={busy||!preview||!!view.pendingBattle} onClick={()=>void p.save('FUSE')}><span aria-hidden="true">{busy?'⏳':'✓'}</span></button>
    </>}
    {p.onDone&&<button type="button" className={icon.iconBtn} disabled={busy} onClick={p.onDone} aria-label="返回選卡"><span aria-hidden="true">↩</span></button>}
  </section>;
}
