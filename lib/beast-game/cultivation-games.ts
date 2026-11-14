import 'server-only';
import { createHash } from 'node:crypto';
import { cultivationRepository } from './cultivation-repository';
import type { CultivationSnapshot } from './cultivation-transaction';
import type { CultivationCopy } from './cultivation';
import { exactBonus } from './cultivation';
import { combatNumber } from './exact-combat';
import { getCard } from './registry';
import type { StakeOutcome } from '../beast-collection-ledger';
import { creditBattleReward, exchangeShards, grantStarterPack, migrateCollection } from '../beast-collection-ledger';
import { openBattleSession } from './battle-session';
import { battleRewardFor } from './battle-reward-server';
import type { ShardExchangeKind } from './battle-reward';

export function cultivationOwner(request: Request): string | null {
  const key = request.headers.get('x-beast-wallet');
  if (!key) return null;
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('共同卡庫識別無效。');
  return createHash('sha256').update(key).digest('hex');
}
/** Compatibility projection only; combat also carries the complete decimal attack. */
export function battleBonus(value: string): number {
  exactBonus(value);return combatNumber(value);
}
export async function updateCultivationAccount(owner:string, action:(current:CultivationSnapshot)=>CultivationSnapshot):Promise<CultivationSnapshot> {
  const repository = cultivationRepository();
  for(let attempt=0;attempt<5;attempt++) {
    const current=await repository.read(owner), next=action(current);
    if(next===current)return current;
    next.revision=(BigInt(current.revision)+1n).toString();
    if(await repository.compareAndSwap(owner,current.revision,next))return next;
  }
  throw new Error('卡庫正在更新，請重試同一次操作。');
}
const update=updateCultivationAccount;
export async function holdCultivationBattle(owner:string,id:string,kind:'card'|'orb',entries:{id:string;cardId:string}[],stakeIds:string[]=[]) {
  const result=await update(owner,current=>{
    if(current.pendingBattle===id&&current.hold){
      if(JSON.stringify(current.hold.entries)!==JSON.stringify(entries)||JSON.stringify(current.hold.stakeIds)!==JSON.stringify(stakeIds))throw new Error('同一戰局不可更換副本。');
      return current;
    }
    if(current.pendingBattle)throw new Error('請先接續或離開原戰鬥，再使用共同卡庫。');
    if(current.creditedIds?.includes('closed:'+id))throw new Error('此戰局已結束，請重新開戰。');
    if(!id||id.length>200||!Array.isArray(entries)||entries.length>5||new Set(entries.map(e=>e.id)).size!==entries.length||new Set(entries.map(e=>e.cardId)).size!==entries.length)throw new Error('出戰副本無效。');
    const bonuses:Record<string,string>={};
    for(const e of entries){const copy=current.state.cards.find(c=>c.id===e.id&&c.cardId===e.cardId);if(!copy)throw new Error('出戰卡已消耗或不在收藏，請重新選卡。');battleBonus(copy.bonus);bonuses[e.id]=copy.bonus;}
    if(new Set(stakeIds).size!==stakeIds.length||stakeIds.some(id=>!current.state.cards.some(c=>c.id===id)))throw new Error('押注副本已變更。');
    return {...current,pendingBattle:id,hold:{id,kind,entries,bonuses,stakeIds}};
  });
  return result.hold!;
}
export async function releaseCultivationBattle(owner:string,id:string) {
  return update(owner,current=>{
    if(!current.pendingBattle)return current;
    if(current.pendingBattle!==id)throw new Error('戰局不符，未解除其他戰鬥。');
    return {...current,pendingBattle:null,hold:undefined,creditedIds:[...(current.creditedIds??[]),'closed:'+id]};
  });
}
/** Only server-verified game outcomes call this helper. It is not exposed as a client grant API. */
export async function creditCultivationCards(owner:string,eventId:string,cards:CultivationCopy[],removeIds:string[]=[],battleId?:string,orbWin?:{matchId:string;cardId:string;win:number}) {
  return update(owner,current=>{
    if(current.creditedIds?.includes(eventId))return current;
    if(battleId&&current.pendingBattle!==battleId)throw new Error('戰局卡庫保留紀錄不符，請重試結算。');
    if(cards.some(c=>!getCard(c.cardId)||current.state.cards.some(old=>old.id===c.id)))throw new Error('獎卡副本識別不符。');
    const nextCards=[...current.state.cards.filter(c=>!removeIds.includes(c.id)),...cards];
    const protectedIds=current.state.protectedIds.some(id=>removeIds.includes(id))?[]:current.state.protectedIds;
    if(orbWin&&orbWin.win!==(current.orbLedger?.wins??0)+1)throw new Error('寶珠關卡已更新，未重複發卡。');
    return {...current,state:{cards:nextCards,protectedIds},...(orbWin?{orbLedger:{wins:orbWin.win,rewards:[...(current.orbLedger?.rewards??[]),orbWin],receipts:[...(current.orbLedger?.receipts??[]),orbWin]}}:{}),...(battleId?{pendingBattle:null,hold:undefined}:{}),creditedIds:[...(current.creditedIds??[]),eventId,...(battleId?['closed:'+battleId]:[])]};
  });
}
export async function settleCultivationCards(owner:string,battleId:string,outcome:StakeOutcome|null) {
  const snapshot=await cultivationRepository().read(owner);
  if(snapshot.creditedIds?.includes('card:'+battleId))return snapshot;
  if(snapshot.pendingBattle!==battleId||!snapshot.hold)throw new Error('戰局卡庫紀錄不符。');
  const ids=outcome?.verdict==='WON'?outcome.rewardCardIds??[]:[];
  return creditCultivationCards(owner,'card:'+battleId,ids.map((cardId,i)=>({id:`duel:${battleId}:${i}`,cardId,bonus:'0'})),outcome?.verdict==='LOST'?snapshot.hold.stakeIds:[],battleId);
}

/** Preserve existing non-battle local reward entitlements; never accept arbitrary copy IDs.
 * Battle and orb winnings are credited by their server handlers, not by this import path.
 */
export async function importExistingGrants(owner:string,value:unknown) {
  const ledger=migrateCollection(value);
  return update(owner,current=>{
    const seen=new Set([...(current.creditedIds??[]),...current.state.cards.map(c=>'copy:'+c.id),...current.receipts.flatMap(r=>r.changes.map(c=>'copy:'+c.materialId))]);
    const cards=ledger.cards.filter(c=>!seen.has('copy:'+c.id)&&(
      c.id===`growth:${c.cardId}`&&ledger.granted?.includes(c.cardId)
    ));
    if(!cards.length)return current;
    return {...current,state:{...current.state,cards:[...current.state.cards,...cards.map(c=>({id:c.id,cardId:c.cardId,bonus:'0'}))]},creditedIds:[...seen,...cards.map(c=>'copy:'+c.id)]};
  });
}

export async function creditSharedShards(owner:string,proof:unknown) {
  const session=openBattleSession(proof);
  if(!session||session.cultivation&&session.cultivation.owner!==owner)throw new Error('戰績憑證無效。');
  const reward=battleRewardFor(session.match,{campaign:session.campaign,selectedEntries:session.selectedEntries,sharedBonuses:session.cultivation?.bonuses});
  if(!reward)throw new Error('本場戰績尚未確認。');
  return update(owner,current=>{
    const event='shards:'+reward.key;
    if(current.creditedIds?.includes(event))return current;
    const result=creditBattleReward({cards:[],history:[],shards:current.shards},reward,new Date().toISOString());
    return {...current,shards:result.collection.shards,creditedIds:[...(current.creditedIds??[]),event]};
  });
}
export async function exchangeSharedShards(owner:string,kind:ShardExchangeKind,operationId:string) {
  if(!['ADULT','GUARDIAN'].includes(kind)||typeof operationId!=='string'||!operationId||operationId.length>100)throw new Error('兌換操作無效。');
  return update(owner,current=>{
    const prior=current.exchanges?.[operationId];
    if(prior){if(prior.kind!==kind)throw new Error('重送內容不一致。');return current;}
    if(current.pendingBattle)throw new Error('請先完成原戰鬥再兌換。');
    const result=exchangeShards({cards:[],history:[],shards:current.shards},kind,new Date().toISOString());
    const copy=result.collection.cards[0];
    return {...current,shards:result.collection.shards,state:{...current.state,cards:[...current.state.cards,{id:copy.id,cardId:copy.cardId,bonus:'0'}]},exchanges:{...current.exchanges,[operationId]:{kind,cardId:copy.cardId}},creditedIds:[...(current.creditedIds??[]),'copy:'+copy.id]};
  });
}
export async function grantSharedStarter(owner:string,receipt:string) {
  return update(owner,current=>{
    if(current.starterPack)return current;
    const grant=grantStarterPack({cards:[],history:[]},receipt,new Date().toISOString());
    return {...current,starterPack:receipt,state:{...current.state,cards:[...current.state.cards,...grant.cards.map(c=>({id:c.id,cardId:c.cardId,bonus:'0'}))]},creditedIds:[...(current.creditedIds??[]),...grant.cards.map(c=>'copy:'+c.id)]};
  });
}
