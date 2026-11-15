'use client';
import { useEffect, useRef, useState } from 'react';
import { readSharedCultivation, syncSharedCultivation, sharedRequest, SHARED_UPDATED, type SharedCultivationView } from '@/lib/beast-cultivation-client';
import { takeFeedShortcut, FOOD_CHAIN_SHORTCUT } from '@/lib/beast-food-chain-client';
import type { CultivationFeedback } from '@/lib/beast-game/cultivation-view';
import CatalogBeastCard from './CatalogBeastCard';
import FoodChainFeedback from './FoodChainFeedback';
import styles from './OwnedCampaignPreparation.module.css';

export default function SharedCultivationPanel({onSaved,onDone}:{onSaved?:()=>void;onDone?:()=>void}) {
  const [view,setView]=useState<SharedCultivationView|null>(null),[main,setMain]=useState<string[]>([]);
  const [target,setTarget]=useState(''),[material,setMaterial]=useState('');
  const [preview,setPreview]=useState<CultivationFeedback|null>(null),[saved,setSaved]=useState<CultivationFeedback|null>(null);
  const [shortcut,setShortcut]=useState<string|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const operation=useRef<string|null>(null),alive=useRef(true);
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
  useEffect(()=>{let active=true;setPreview(null);operation.current=null;
    if(target&&material&&view)void sharedRequest({type:'PREVIEW',revision:view.revision,choices:[{targetId:target,materialId:material}]}).then(r=>{if(active){setPreview(r.feedback?.[0]??null);setError('');}}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[target,material,view?.revision]);
  const save=async(type:'MAIN_TEAM'|'FUSE')=>{
    if(!view||busy)return;setBusy(true);setError('');operation.current??=crypto.randomUUID();
    try{const result=await navigator.locks.request('tdh-beast-collection',{ifAvailable:true},lock=>{if(!lock)throw new Error('另一分頁正在戰鬥或保存，請先完成。');return sharedRequest({type,revision:view.revision,operationId:operation.current,...(type==='MAIN_TEAM'?{ids:main}:{choices:[{targetId:target,materialId:material}]})});});
      if(!alive.current)return;setView(result.view);setMain(result.view.protectedIds);setTarget('');setMaterial('');setPreview(null);operation.current=null;
      const done:CultivationFeedback|undefined=type==='FUSE'?result.feedback?.[0]:undefined;setSaved(done??null);
      setMessage(type==='MAIN_TEAM'?'五隻主力已鎖定，可整組更換。':done?`合體已保存：〈${done.targetName}〉吃了〈${done.materialName}〉，攻擊 +${done.addedBonus}（寶石 ${done.beforeOrbAttack}→${done.afterOrbAttack}・神獸戰鬥 ${done.beforeBattleAttack}→${done.afterBattleAttack}）。材料已扣除，兩款遊戲共用這份成長。`:'合體已保存，材料已扣除，兩款遊戲共用這份成長。');onSaved?.();
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:'尚未確認保存，請重試同一次操作。');}finally{if(alive.current)setBusy(false);}
  };
  const targetCard=view?.cards.find(c=>c.id===target);
  return <section className={styles.panel} data-shared-cultivation>
    <h2>共同神獸卡庫・合體培養</h2>
    <p>寶石捷連線與神獸戰鬥共用收藏及成長。免費試用牌不消耗，也不計入收藏主力。</p>
    {error&&<p role="alert">{error}<button type="button" disabled={busy} onClick={()=>void load()}>重新讀取卡庫</button></p>}
    {message&&<p role="status" data-shared-saved>{message}</p>}
    {saved&&<FoodChainFeedback key={saved.materialId} change={saved} phase="saved"/>}
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
      <div className={styles.grid}>{view.cards.filter(c=>c.form!=='YOUNG').map(card=><button key={card.id} type="button" data-shared-target={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={target===card.id} onClick={()=>{setTarget(card.id);setMaterial('');setMessage('');setSaved(null);}}><CatalogBeastCard id={card.cardId}/><strong>{card.name}</strong><small>永久 +{card.bonus} · 寶石攻擊 {card.orbAttack} · 神獸戰鬥攻擊 {card.battleAttack}</small>{card.stars&&<small className={styles.starLine} data-target-stars={card.stars.stars}><span aria-hidden="true">{'★'.repeat(card.stars.stars)}{'☆'.repeat(5-card.stars.stars)}</span> {card.stars.toNext===null?<span>已五星封頂</span>:<><span>下一星還差</span> {card.stars.toNext} <span>張</span></>}{card.atBonusCap?<> · <span>攻擊加成已滿</span></>:null}</small>}</button>)}</div>
      {targetCard&&<><h3>③ 選擇對應材料</h3><div className={styles.grid}>{view.cards.filter(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId).map(card=><button key={card.id} type="button" data-shared-material={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={material===card.id} onClick={()=>setMaterial(card.id)}><CatalogBeastCard id={card.cardId}/><strong>{card.name}</strong>{card.bonus!=='0'&&<small>永久 +{card.bonus}</small>}</button>)}</div>
        {!view.cards.some(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId)&&<p role="status" data-no-material>目前沒有可以餵給這張卡的材料（鎖定主力不能當材料）。</p>}</>}
      {preview&&<div data-shared-preview><FoodChainFeedback change={preview} phase="preview"/></div>}
      <button type="button" className={`${styles.confirm} ${preview?styles.stickyConfirm:''}`} data-confirm-shared-fusion disabled={busy||!preview||!!view.pendingBattle} onClick={()=>void save('FUSE')}>{busy?'正在保存…':'確認消耗材料並合體'}</button>
    </>}
    {onDone&&<button type="button" disabled={busy} onClick={onDone}>返回選卡</button>}
  </section>;
}
