'use client';
import { useEffect, useRef, useState } from 'react';
import { readSharedCultivation, syncSharedCultivation, sharedRequest, SHARED_UPDATED, type SharedCultivationView } from '@/lib/beast-cultivation-client';
import CatalogBeastCard from './CatalogBeastCard';
import styles from './OwnedCampaignPreparation.module.css';
import fusion from './SharedCultivationPanel.module.css';
import { GuideBookProvider } from './GuideBookContext';
import type { GuideBook } from '@/lib/beast-game/guide-book';
import type { cultivationChangeView } from '@/lib/beast-game/cultivation-view';
type FusionDisplay=ReturnType<typeof cultivationChangeView>;

export default function SharedCultivationPanel({onSaved,onDone}:{onSaved?:()=>void;onDone?:()=>void}) {
  const [view,setView]=useState<SharedCultivationView|null>(null),[main,setMain]=useState<string[]>([]);
  const [target,setTarget]=useState(''),[material,setMaterial]=useState('');
  const [preview,setPreview]=useState<FusionDisplay|null>(null),[savedChange,setSavedChange]=useState<FusionDisplay|null>(null);
  const [previewRevision,setPreviewRevision]=useState<string|null>(null);
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
  useEffect(()=>{let active=true;setPreview(null);operation.current=null;
    if(target&&material&&view)void sharedRequest({type:'PREVIEW',revision:view.revision,choices:[{targetId:target,materialId:material}]}).then(r=>{if(active){setPreview(r.changes[0]);setPreviewRevision(view.revision);setError('');}}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[target,material,view?.revision,previewAttempt]);
  const save=async(type:'MAIN_TEAM'|'FUSE')=>{
    if(!view||busy||saving.current)return;
    if(type==='FUSE'&&(!book||!preview||previewRevision!==view.revision||preview.targetId!==target||preview.materialId!==material))return;
    saving.current=true;setBusy(true);setError('');operation.current??=crypto.randomUUID();
    try{const result=await navigator.locks.request('tdh-beast-collection',{ifAvailable:true},lock=>{if(!lock)throw new Error('另一分頁正在戰鬥或保存，請先完成。');return sharedRequest({type,revision:view.revision,operationId:operation.current,...(type==='MAIN_TEAM'?{ids:main}:{choices:[{targetId:target,materialId:material}]})});});
      if(!alive.current)return;setView(result.view);setMain(result.view.protectedIds);setTarget('');setMaterial('');setPreview(null);operation.current=null;
      setSavedChange(type==='FUSE'?result.changes[0]:null);
      setMessage(type==='MAIN_TEAM'?'五隻主力已鎖定，可整組更換。':'');onSaved?.();
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:'尚未確認保存，請重試同一次操作。');}finally{saving.current=false;if(alive.current)setBusy(false);}
  };
  // 預設自動挑「原始攻擊最低」的那一張對應材料（資料都是後端給的字串，這裡只挑一張）；想自己選就展開「自己選材料」。
  const autoMaterial=(targetCardId:string)=>{const base=(c:{orbAttack:string;bonus:string})=>{try{return BigInt(c.orbAttack)-BigInt(c.bonus);}catch{return 0n;}};const options=(view?.cards??[]).filter(c=>!c.protected&&c.materialTargetCardId===targetCardId).sort((a,b)=>{const d=base(a)-base(b);return d>0n?1:d<0n?-1:0;});return options[0]?.id??'';};
  const targetCard=view?.cards.find(c=>c.id===target);
  const materialCard=view?.cards.find(c=>c.id===material);
  const face=(id:string)=>book?<CatalogBeastCard id={id}/>:<span role="status">{bookError?'卡面暫時無法取得':'卡面載入中…'}</span>;
  const previewReady=!!preview&&previewRevision===view?.revision&&preview.targetId===target&&preview.materialId===material;
  return <GuideBookProvider value={book}><section className={`${styles.panel} ${fusion.panel}`} data-shared-cultivation>
    <h2>共同神獸卡庫・合體培養</h2>
    <details data-testid="fusion-manual"><summary>說明書</summary>
      <p>寶石捷連線與神獸戰鬥共用收藏及成長。免費試用牌不消耗，也不計入收藏主力。</p>
      <p>鎖定主力不能當材料；更換時一次確認完整五隻，收藏可以超過五隻。</p>
      <p>同星宿幼子被對應本體吃掉；本體被所屬四大神獸吃掉。每次消耗一張材料，目標保留並永久增加攻擊；材料不能重用，目標可繼續強化。</p>
      <p>每次加攻＝材料原始攻擊 ÷ 10，無條件捨去，最低 +1；材料先前培養的加成不轉移。只增加攻擊，生命與技能不變。</p>
    </details>
    {bookError&&<div role="alert" className={fusion.notice}>{bookError}<button type="button" disabled={bookLoading} onClick={()=>void loadBook()}>重新載入卡面</button></div>}
    {error&&<p ref={errorRef} tabIndex={-1} role="alert">{error}<button type="button" disabled={busy} onClick={()=>void load()}>重新讀取卡庫</button></p>}
    {message&&<p role="status" data-shared-saved>{message}</p>}
    {savedChange&&<div ref={resultRef} tabIndex={-1} role="status" data-shared-growth-result><p data-fusion-sentence><b>{savedChange.targetName}吃掉{savedChange.materialName}</b>：寶石攻擊 {savedChange.orbBeforeAttack}→{savedChange.orbAfterAttack}，神獸戰鬥攻擊 {savedChange.battleBeforeAttack}→{savedChange.battleAfterAttack}</p></div>}
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
      <div className={`${styles.grid} ${fusion.selection}`}>{view.cards.filter(c=>c.form!=='YOUNG').map(card=><button key={card.id} type="button" data-shared-target={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={target===card.id} onClick={()=>{setPreview(null);setTarget(card.id);setMaterial(autoMaterial(card.cardId));setMessage('');setSavedChange(null);}}><span className={fusion.badge}>{target===card.id?'✓ 強化這張':'點我強化'}</span>{face(card.cardId)}<strong>{card.name}</strong><small>{card.copyLabel}</small><small>永久 +{card.bonus} · 寶石攻擊 {card.orbAttack} · 神獸戰鬥攻擊 {card.battleAttack}</small></button>)}</div>
      {targetCard&&!material&&<p role="status" data-no-material>這張目前沒有可以吃的材料</p>}
      {targetCard&&<details data-testid="pick-material-manually"><summary ref={materialRef as unknown as React.Ref<HTMLElement>} tabIndex={-1}>自己選材料</summary><div className={`${styles.grid} ${fusion.selection}`}>{view.cards.filter(c=>!c.protected&&c.materialTargetCardId===targetCard.cardId).map(card=><button key={card.id} type="button" data-shared-material={card.id} disabled={busy||!!view.pendingBattle} aria-pressed={material===card.id} onClick={()=>{if(material!==card.id){setPreview(null);setMaterial(card.id);}}}><span className={fusion.badge}>{material===card.id?'✓ 已選材料・會消耗':'材料・確認後消耗'}</span>{face(card.cardId)}<strong>{card.name}</strong><small>{card.copyLabel} · 永久 +{card.bonus}</small></button>)}</div></details>}
      <div ref={reviewRef} className={fusion.review}>
      {previewReady&&preview&&<div data-shared-preview><div className={fusion.pair}><div><strong>目標・保留</strong>{targetCard&&<span className={fusion.portrait}>{face(targetCard.cardId)}</span>}<b>{preview.targetName}</b><small>{targetCard?.copyLabel}</small></div><div><strong>材料・消耗 × {preview.materialCount}</strong>{materialCard&&<span className={fusion.portrait}>{face(materialCard.cardId)}</span>}<b>{preview.materialName}</b><small>{materialCard?.copyLabel}</small></div></div><p data-fusion-sentence><b>{preview.targetName}吃掉{preview.materialName}</b>：寶石攻擊 {preview.orbBeforeAttack}→{preview.orbAfterAttack}，神獸戰鬥攻擊 {preview.battleBeforeAttack}→{preview.battleAfterAttack}</p></div>}
      {target&&material&&!previewReady&&!error&&<p role="status">正在取得後端合體預覽…</p>}
      <button type="button" className={styles.confirm} data-confirm-shared-fusion disabled={busy||!previewReady||!book||!!view.pendingBattle} onClick={()=>void save('FUSE')}>{busy?'正在保存…':'強化一次'}</button>
      {target&&<div className={fusion.actions}><button type="button" disabled={busy} onClick={()=>{setMaterial('');setPreview(null);materialRef.current?.focus();materialRef.current?.scrollIntoView({block:'start'});}}>重選材料</button><button type="button" disabled={busy} onClick={()=>{setTarget('');setMaterial('');setPreview(null);setError('');}}>取消本次合體</button></div>}
      </div>
    </>}
    {onDone&&<button type="button" disabled={busy} onClick={onDone}>返回選卡</button>}
  </section></GuideBookProvider>;
}
