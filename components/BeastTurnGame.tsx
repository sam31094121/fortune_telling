'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {readOwnedCards} from '@/lib/beast-owned-cards';
import {spiritArtFor} from '@/lib/beast-battle-fx';
import type {interactiveCatalog,Match,Action} from '@/lib/beast-game/interactive';
import styles from './BeastTurnGame.module.css';
import BeastDuelArchive from './BeastDuelArchive';
type Card=ReturnType<typeof interactiveCatalog>[number];
type Account={owned:string[];experience:Record<string,number>;match:Match|null;summonDay:string|null;imported:boolean;revision:number};
const labels:Record<string,string>={SPACE:'空',AIR:'風',WATER:'水',FIRE:'火',EARTH:'地'};
export default function BeastTurnGame(){
 const [cards,setCards]=useState<Card[]>([]),[account,setAccount]=useState<Account|null>(null),[selected,setSelected]=useState<string[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[tab,setTab]=useState('組隊'),[filter,setFilter]=useState('全部'),[detail,setDetail]=useState<Card|null>(null),[switching,setSwitching]=useState(false),[anim,setAnim]=useState(false),[history,setHistory]=useState<string[]>([]),[notice,setNotice]=useState('');
 const audio=useRef<HTMLAudioElement|null>(null),pending=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const screen=useRef<HTMLElement|null>(null);
 useEffect(()=>{screen.current?.scrollIntoView({block:'start'});},[account?.match?.status]);
 async function load(){try{const r=await fetch('/api/beast-game/turns',{signal:AbortSignal.timeout(15000)});const d=await r.json();if(!d.ok)throw Error(d.error);setCards(d.cards);setAccount(d.account);setError('');}catch(e){setError(String(e));}}
 useEffect(()=>{void load();return()=>{audio.current?.pause();if(timer.current)clearTimeout(timer.current);};},[]);
 async function send(type:string,extra:Record<string,unknown>={}){
  if(!account||pending.current)return;pending.current=true;setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/beast-game/turns',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({type,revision:account.revision,requestId:crypto.randomUUID(),...extra})});const d=await r.json();if(!d.ok)throw Error(d.error);
   setAccount(d.account);setSwitching(false);
   if(type==='ACTION'){setAnim(true);timer.current=setTimeout(()=>setAnim(false),1400);const logs=d.account.match?.log??[];setHistory(h=>[...logs.map((l:{text:string})=>l.text),...h].slice(0,40));const own=logs.find((l:{side:string})=>l.side==='player');if(own){audio.current?.pause();audio.current=new Audio(`/audio/beast-voices/${own.cardId}.mp3`);audio.current.volume=.55;void audio.current.play().catch(()=>setNotice('瀏覽器尚未允許聲音；下次點擊操作時會再嘗試播放。'));}}
   if(type==='START'){setHistory([]);setTab('組隊');setDetail(null);}
   if(type==='SUMMON'){const fresh=d.account.owned.find((id:string)=>!account.owned.includes(id));setNotice(fresh?`召喚成功：${cards.find(c=>c.id===fresh)?.name}`:'抽到已收藏神獸，已增加該卡 1 點成長。');}
   if(type==='EVOLVE')setNotice('覺醒成功！成獸已加入收藏，幼子保留。');
   if(type==='LEAVE')audio.current?.pause();
  }catch(e){setError(e instanceof Error?e.message:'連線中斷，請重新載入確認是否已保存。');}
  finally{pending.current=false;setBusy(false);}
 }
 const match=account?.match,lookup=(id:string)=>cards.find(c=>c.id===id)!;
 const owned=cards.filter(c=>account?.owned.includes(c.id));
 const top=<><header className={styles.header}><h1>神獸・回合對戰</h1><Link href="/beast-game/lineup">組陣台・押注</Link><Link href="/beast-game/battlefield">神獸戰場</Link><Link href="/">回首頁</Link></header><p className={styles.muted}>選三隻神獸，親手決定攻擊、技能與換陣。擊倒對方三隻即獲勝。</p>{error&&<p role="alert" className={styles.error}>{error} <button onClick={()=>void load()}>重新載入</button></p>}{notice&&<p role="status">{notice}</p>}</>;
 if(!account)return <main ref={screen} className={styles.page}>{top}<p>正在讀取神獸收藏…</p></main>;
 if(match&&match.status==='PLAYING'){
  const me=match.player.team[match.player.active],foe=match.opponent.team[match.opponent.active],p=lookup(me.cardId);
  const forced=me.defeated,enemyForced=foe.defeated;
  const act=(action:Action)=>void send('ACTION',{action});
  return <main ref={screen} className={styles.page}>{top}<div className={styles.header}><strong>第 {match.round} 回合</strong><span>能量 {match.player.energy}／6</span></div>
   <div className={styles.status}><strong>對手・{foe.name}</strong><span>　{foe.hp}／{foe.maxHp} HP · 盾 {foe.shield}</span><progress value={foe.hp} max={foe.maxHp}/><small>剩餘 {match.opponent.team.filter(f=>!f.defeated).length} 隻 · 能量 {match.opponent.energy}</small></div>
   <div className={`${styles.stage} ${anim?styles.attack:''}`} aria-label="雙方神獸交戰舞台"><img src={spiritArtFor(me.cardId)??lookup(me.cardId).front} alt={me.name}/><img src={spiritArtFor(foe.cardId)??lookup(foe.cardId).front} alt={foe.name}/></div>
   <div className={styles.status}><strong>我方・{me.name}</strong><span>　{me.hp}／{me.maxHp} HP · 盾 {me.shield}</span><progress value={me.hp} max={me.maxHp}/><span className={styles.badge}>{p.role} · {labels[p.element]} · {p.tier} 階</span></div>
   <p className={styles.muted}>{p.skillName}：{p.description} 消耗 {p.cost} 能量；冷卻剩餘 {me.cooldown} 回合。</p>
   <BeastDuelArchive key={me.cardId} cardId={me.cardId} skillName={p.skillName} description={p.description}/>
   {(switching||forced)&&<div className={styles.panel}><strong>{forced?'選擇下一隻出戰神獸':'切換會占用本回合行動'}</strong><div className={styles.toolbar}>{match.player.team.map((f,index)=><button key={f.cardId} disabled={busy||f.defeated||index===match.player.active} onClick={()=>act({type:'SWITCH',index})}>{f.name} {f.hp} HP</button>)}</div></div>}
   {enemyForced&&!forced&&<button disabled={busy} onClick={()=>act({type:'ATTACK'})}>對手神獸已倒下，繼續下一隻</button>}
   <div className={styles.actions}><button disabled={busy||anim||forced||enemyForced} onClick={()=>act({type:'ATTACK'})}>攻擊</button><button disabled={busy||anim||forced||enemyForced||me.cooldown>0||match.player.energy<p.cost} onClick={()=>act({type:'SKILL'})}>技能 · {p.cost}</button><button disabled={busy||anim||enemyForced} onClick={()=>setSwitching(s=>!s)}>切換</button></div>
   <details open><summary>戰鬥紀錄</summary><div className={styles.log}>{history.length?history.map((t,i)=><p key={i}>{t}</p>):<p>選擇第一個動作開始戰鬥。</p>}</div></details><button disabled={busy} onClick={()=>void send('LEAVE')}>離開戰鬥（不扣卡、不計成長）</button><p className={styles.muted}>切換先於攻擊；其餘按速度。同速由伺服器亂數判定。最多 80 回合，未分勝負則平手。</p><Link href="/audio/beast-voices/credits.html">本體聲音與授權來源</Link>
  </main>;
 }
 return <main ref={screen} className={styles.page}>{top}{match?.status==='FINISHED'&&<div className={styles.result}><h2>{match.winner==='player'?'你獲勝了！':match.winner==='opponent'?'本場對手獲勝':'本場平手'}</h2><p>三隻出戰神獸各獲得 1 點成長。收藏卡不扣除。</p><button disabled={busy} onClick={()=>void send('LEAVE')}>回到組隊</button></div>}
  <nav className={styles.toolbar}>{['組隊','圖鑑','召喚','成長'].map(t=><button key={t} aria-pressed={tab===t} onClick={()=>{setTab(t);setDetail(null);}}>{t}</button>)}</nav>
  <p>已收藏 {account.owned.length}／60</p>
  {tab==='召喚'?<section className={styles.panel}><h2>五元素召喚</h2><p>每天免費一次。60 張神獸各有 1／60 機率；重複取得轉為該卡 1 點成長。</p><p className={styles.muted}>每日以 UTC 00:00（臺灣 08:00）重置。</p><button disabled={busy||account.summonDay===new Date().toISOString().slice(0,10)} onClick={()=>void send('SUMMON')}>召喚神獸</button></section>:<>
  {tab==='組隊'&&<><div className={styles.slots}>{[0,1,2].map(i=><button key={i} onClick={()=>setSelected(s=>s.filter((_,j)=>j!==i))}>{selected[i]?lookup(selected[i]).name:`${i===0?'主戰':'備戰'}・選一張`}</button>)}</div><button disabled={busy||selected.length!==3||!!match} onClick={()=>void send('START',{lineup:selected})}>開始回合對戰</button><p className={styles.muted}>第一隻先出場，其餘可在回合中切換。三張不可重複。</p></>}
  <div className={styles.filters}>{['全部',...Object.keys(labels)].map(e=><button key={e} aria-pressed={filter===e} onClick={()=>setFilter(e)}>{labels[e]??e}</button>)}</div>
  <div className={styles.grid}>{(tab==='圖鑑'?cards:owned).filter(c=>(filter==='全部'||c.element===filter)&&(tab!=='成長'||c.form==='YOUNG')).map(c=>{const has=account.owned.includes(c.id);return <div className={styles.card} key={c.id}><button onClick={()=>{setDetail(c);if(tab==='組隊')setSelected(s=>s.includes(c.id)?s.filter(id=>id!==c.id):s.length<3?[...s,c.id]:s);}} aria-pressed={selected.includes(c.id)} aria-label={`${c.name}${selected.includes(c.id)?'，已上陣':''}`}><img src={has?c.thumbnail:'/beast-game/card-back.webp'} alt={has?c.name:'尚未收藏'} loading="lazy"/><strong>{has?c.name:'未解鎖'}</strong><small>{labels[c.element]} · {c.tier} 階 · {c.role}</small></button>{tab==='成長'&&<><small>成長 {account.experience[c.id]??0}／3</small><button disabled={busy||(account.experience[c.id]??0)<3||account.owned.includes(c.evolution!)} onClick={()=>void send('EVOLVE',{cardId:c.id})}>{account.owned.includes(c.evolution!)?'已收藏成獸':'覺醒成獸'}</button></>}</div>;})}</div>
  </>}
  {detail&&<section className={styles.panel}><h2>{detail.name} · {detail.rarity}</h2><p>{detail.role}／{detail.tier} 階／{labels[detail.element]}</p><p>HP {detail.stats.hp} · 攻 {detail.stats.attack} · 防 {detail.stats.defense} · 速 {detail.stats.speed}</p><p>{detail.skillName}：{detail.description}</p><p>被動：{detail.passive}</p><p className={styles.muted}>{detail.story}</p><button onClick={()=>setDetail(null)}>收起介紹</button></section>}
  {!account.imported&&<button disabled={busy} onClick={()=>void send('IMPORT',{legacyIds:readOwnedCards().all})}>匯入這個瀏覽器原有收藏</button>}
  <p className={styles.muted}>收藏保存在目前伺服器，以此瀏覽器識別；尚未提供跨裝置登入。首次提供三張入門卡。舊收藏匯入不移除原紀錄。</p><Link href="/audio/beast-voices/credits.html">聲音來源與授權</Link>
 </main>;
}
