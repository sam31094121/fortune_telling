/** Collection-only fusion transactions; never reads the orb campaign. */
import type { BeastCollection, CollectionEntry } from '../beast-collection-ledger';
import type { CardEnhancementReceipt } from './card-campaign';
export interface CardCampaignCollection { v:1; token:string; wins:number; pendingToken?:string; fusionReceipts:CardEnhancementReceipt[] }
export function parseCollectionCampaign(value:unknown):CardCampaignCollection|undefined {
 if(value===undefined)return undefined;
 const state=value as CardCampaignCollection;
 if(!state||state.v!==1||typeof state.token!=='string'||!state.token||state.token.length>2000000||state.pendingToken!==undefined&&(typeof state.pendingToken!=='string'||!state.pendingToken)||!Array.isArray(state.fusionReceipts)||!Number.isSafeInteger(state.wins)||state.wins<0||state.fusionReceipts.length>2048)throw new Error('卡片闖關紀錄無法讀取，請保留資料。');
 const operations=new Set<string>(),materials=new Set<string>();
 for(const r of state.fusionReceipts){
  if(!r||[r.operationId,r.targetEntryId,r.materialEntryId,r.targetCardId,r.materialCardId].some(x=>typeof x!=='string'||!x||x.length>160)||operations.has(r.operationId)||materials.has(r.materialEntryId)||!/^beast_y(0[1-9]|1[0-9]|2[0-8])$/.test(r.materialCardId)||!/^beast_(a(0[1-9]|1[0-9]|2[0-8])|g_(qinglong|zhuque|baihu|xuanwu))$/.test(r.targetCardId)||![r.attackBonus,r.totalBonus].every(n=>Number.isSafeInteger(n)&&n>0))throw new Error('培養收據無法核對，請保留資料。');
  const d=r.display;
  if(!d||![d.baseAttack,d.beforeAttack,d.attackBonus,d.afterAttack].every(n=>Number.isSafeInteger(n)&&n>=0)||d.attackBonus!==r.attackBonus||d.afterAttack<d.beforeAttack)throw new Error('培養顯示收據無法核對。');
  operations.add(r.operationId);materials.add(r.materialEntryId);
 }
 return {...state,fusionReceipts:state.fusionReceipts.map(r=>({...r,display:{...r.display}}))};
}
export function cardFusionChoices(collection:BeastCollection):{targets:CollectionEntry[];materials:CollectionEntry[];blockedReason?:string} {
 const blockedReason=collection.storageError??(collection.pending?'戰鬥尚未結算，暫不能培養。':undefined);
 const unique=collection.cards.filter(c=>collection.cards.filter(x=>x.id===c.id).length===1);
 return {targets:unique.filter(c=>/^beast_(a\d{2}|g_(qinglong|zhuque|baihu|xuanwu))$/.test(c.cardId)),materials:unique.filter(c=>/^beast_y\d{2}$/.test(c.cardId)),blockedReason};
}
export function requireFusionCopies(collection:BeastCollection,targetEntryId:string,materialEntryId:string) {
 const choices=cardFusionChoices(collection);if(choices.blockedReason)throw new Error(choices.blockedReason);
 const target=choices.targets.find(c=>c.id===targetEntryId),material=choices.materials.find(c=>c.id===materialEntryId);
 if(!target||!material||target.id===material.id)throw new Error('請選仍持有的成獸或神獸，以及一張幼子副本。');
 const remaining=collection.cards.filter(c=>c.id!==material.id);
 if(remaining.length<5||new Set(remaining.map(c=>c.cardId)).size<5)throw new Error('培養後至少須保留五張不同卡型可出戰。');
 return {target,material};
}
export function fusionReceiptDisplay(receipt:CardEnhancementReceipt) {
 return {...receipt.display};
}
export function commitOwnedFusion(collection:BeastCollection,operationId:string,targetEntryId:string,materialEntryId:string,receipt:CardEnhancementReceipt,token:string,wins:number) {
 const state=parseCollectionCampaign(collection.cardCampaign);
 const previous=state?.fusionReceipts.find(r=>r.operationId===operationId);
 if(previous){if(previous.targetEntryId!==targetEntryId||previous.materialEntryId!==materialEntryId)throw new Error('同一操作不可改用其他副本。');return {collection,receipt:previous,duplicate:true};}
 const {target,material}=requireFusionCopies(collection,targetEntryId,materialEntryId);
 if(!receipt||receipt.operationId!==operationId||receipt.targetEntryId!==target.id||receipt.targetCardId!==target.cardId||receipt.materialEntryId!==material.id||receipt.materialCardId!==material.cardId)throw new Error('培養回應與指定副本不一致，尚未扣卡。');
 if(wins!==(state?.wins??0))throw new Error('培養不可改變闖關進度。');
 const cardCampaign=parseCollectionCampaign({v:1,token,wins,fusionReceipts:[...(state?.fusionReceipts??[]),receipt]})!;
 return {collection:{...collection,cards:collection.cards.filter(c=>c.id!==material.id),cardCampaign},receipt,duplicate:false};
}
export function withCollectionCampaign(collection:BeastCollection,token:string,wins:number,pending=false):BeastCollection {
 const old=parseCollectionCampaign(collection.cardCampaign);
 const state=parseCollectionCampaign({v:1,token:pending?(old?.token??token):token,wins,fusionReceipts:old?.fusionReceipts??[],...(pending?{pendingToken:token}:{})});
 return {...collection,cardCampaign:state};
}

export function clearCollectionCampaignPending(collection:BeastCollection):BeastCollection {
 if(!collection.cardCampaign?.pendingToken)return collection;
 const {pendingToken,...state}=collection.cardCampaign;return {...collection,cardCampaign:state};
}
