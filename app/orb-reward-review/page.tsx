'use client';
import { useState } from 'react';
import BattleRewardReveal, { type BattleRewardStatus } from '@/components/battlefield/BattleRewardReveal';
import { BeastCardFace } from '@/components/battlefield/BeastCardTile';
import { playableCards } from '@/lib/beast-game/registry';
export default function Review() {
 const [status,setStatus]=useState<BattleRewardStatus>('saving');
 const [key,setKey]=useState(0);
 const card=playableCards()[0];
 return <main style={{minHeight:'100dvh',background:'#16121d',padding:12,boxSizing:'border-box',color:'white'}}>
 <p>本機視覺驗收，沒有發放獎勵</p>
 {(['saving','saved','failed'] as const).map(s=><button key={s} onClick={()=>{setStatus(s);setKey(k=>k+1)}}>{s}</button>)}
 <BattleRewardReveal key={key} presentation="orb-victory" status={status} message={status==='saved'?'已保存的戰利品測試畫面':status==='saving'?'保存中測試':'保存失敗測試'} card={<BeastCardFace card={{id:card.id,name:card.name,element:card.element,thumbnail:card.art.thumbnail}}/>} onRetry={()=>setStatus('saving')} onViewCards={()=>setStatus('saving')}/>
 </main>;
}
