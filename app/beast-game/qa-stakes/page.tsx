'use client';
import {useState,useEffect} from 'react';
import BeastStakeResult from '@/components/BeastStakeResult';
import BattlefieldPage from '../battlefield/page';
import {namedStakeOutcome} from '@/lib/beast-stake-presentation';
import type {StakeOutcome} from '@/lib/beast-collection-ledger';
import type {Settlement} from '@/lib/beast-collection';
import fixtures from './fixtures.json';
export default function QA(){
 const [cards,setCards]=useState<Array<{id:string;name:string;thumbnail:string}>>([]);
 const [mode,setMode]=useState('won');
 const [retry,setRetry]=useState(false);
 useEffect(()=>{fetch('/api/beast-game').then(r=>r.json()).then(d=>setCards(d.cards));},[]);
 const sample=fixtures[(mode==='failed'||mode==='replay'?'won':mode) as keyof typeof fixtures]??fixtures.won;
 if(mode==='field')return <BattlefieldPage/>;
 return <main className="mx-auto max-w-md p-3 text-white bg-slate-950">
  <p>工程驗證：獨立測試卡片</p>
  <nav className="flex flex-wrap gap-2">{['won','lost3','lost5','draw','failed','replay'].map(key=><button className="min-h-11 border p-2" key={key} onClick={()=>{setMode(key);setRetry(false);}}>{key}</button>)}</nav>
  <button className="min-h-11 border p-2" onClick={()=>{
    if(location.hostname!=='127.0.0.1')return;
    localStorage.setItem('tdh_beast_collection_v1',JSON.stringify({cards:Array.from({length:6},(_,i)=>({id:`qa:${i}`,cardId:i<3?'beast_a01':'beast_y01',source:'DUEL_WIN',at:'2026-09-07'})),history:[],receipts:{},granted:[]}));
    localStorage.removeItem('tdh_beast_duel_pending_v1');setMode('field');
  }}>獨立測試卡組進入戰場</button>
  <BeastStakeResult key={mode} outcome={namedStakeOutcome(sample.outcome as StakeOutcome,id=>cards.find(c=>c.id===id)?.name??id)} cards={cards}
   card={cards.find(c=>c.id===(sample.outcome.gainedCardId??sample.outcome.forfeitedCardId??sample.outcome.stakes.player))}
   settlement={mode==='failed'&&!retry?{saved:false,receipt:null,matchId:'qa:failed',error:'測試保存失敗'}:sample.settlement as Settlement}
   isReplay={mode==='replay'} retrying={false} onRetry={()=>setRetry(true)}/>
 </main>;
}
