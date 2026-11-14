/** Card-only campaign. Never imports or alters the orb campaign. */
import { getCard, playableCards } from './registry';
import { createRng } from './turn';
import { newMatch, type Match, type Difficulty } from './interactive';
export interface OwnedCardRef { id:string; cardId:string }
export interface CardEnhancementReceipt { operationId:string; targetEntryId:string; targetCardId:string; materialEntryId:string; materialCardId:string; attackBonus:number; totalBonus:number; display:{baseAttack:number;beforeAttack:number;attackBonus:number;afterAttack:number} }
export interface CardCampaign { v:1; kind:'card-campaign'; id:string; seed:number; wins:number; pending:string|null; enhancements:CardEnhancementReceipt[] }
export function validOwnedCard(value:unknown):value is OwnedCardRef {
  const v=value as OwnedCardRef;return !!v&&typeof v.id==='string'&&v.id.length>0&&v.id.length<=160&&typeof v.cardId==='string'&&!!getCard(v.cardId);
}
function knownCopyMatches(c:CardCampaign,ref:OwnedCardRef):boolean {
  return c.enhancements.every(r=>(r.targetEntryId!==ref.id||r.targetCardId===ref.cardId)&&(r.materialEntryId!==ref.id||r.materialCardId===ref.cardId));
}
export function cardCampaignStage(wins:number):{wins:number;stage:number;difficulty:Difficulty;enemyMultiplier:number} {
  if(!Number.isSafeInteger(wins)||wins<0||wins>1000000)throw new Error('關卡紀錄無效。');
  return {wins,stage:wins+1,difficulty:wins>=7?'HARD':wins>=3?'NORMAL':'EASY',enemyMultiplier:1+wins*.02};
}
export function cardCampaignSeed(c:CardCampaign):number {return (Math.imul(c.seed^c.wins,1664525)+1013904223)>>>0;}
export function cardCampaignOpponent(c:CardCampaign):string[] {
  const ids=playableCards().map(card=>card.id),rng=createRng(cardCampaignSeed(c));
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  return ids.slice(0,5);
}
export function cardCampaignEnhancementPreview(c:CardCampaign,target:OwnedCardRef,material:OwnedCardRef) {
  const to=validOwnedCard(target)?getCard(target.cardId):null,from=validOwnedCard(material)?getCard(material.cardId):null;
  const baseAttack=to?to.stats.attack:0;
  const currentBonus=c.enhancements.filter(r=>r.targetEntryId===target?.id).reduce((n,r)=>n+r.attackBonus,0);
  const attackBonus=from?Math.max(1,Math.floor(from.stats.attack*.1)):0,maxBonus=Math.floor(baseAttack*.5),newTotal=currentBonus+attackBonus;
  const reason=c.pending?'戰鬥尚未結束，暫不能培養。':c.enhancements.length>=2048?'培養紀錄已達此版容量，未消耗材料。':!to||to.form==='YOUNG'?'請選成獸或四象主卡。':!from||from.form!=='YOUNG'?'材料必須是幼子。':target.id===material.id?'不能把主卡當材料。':!knownCopyMatches(c,target)||!knownCopyMatches(c,material)?'卡片副本資料不符。':c.enhancements.some(r=>r.materialEntryId===material.id||r.materialEntryId===target.id)?'這張卡片已消耗。':newTotal>maxBonus?'已達永久強化上限。':undefined;
  const battleBaseAttack=to?newMatch([to.id],[to.id],0).player.team[0].attack:0;
  return {baseAttack,currentBonus,attackBonus,newTotal,afterAttack:baseAttack+newTotal,maxBonus,battleBaseAttack,beforeAttack:battleBaseAttack+currentBonus,battleCurrentAttack:battleBaseAttack+currentBonus,battleAfterAttack:battleBaseAttack+newTotal,display:{baseAttack:battleBaseAttack,beforeAttack:battleBaseAttack+currentBonus,attackBonus,afterAttack:battleBaseAttack+newTotal},allowed:!reason,reason};
}
export function enhanceCardCampaign(c:CardCampaign,operationId:string,target:OwnedCardRef,material:OwnedCardRef) {
  if(c.pending)throw new Error('戰鬥尚未結束，暫不能培養。');
  if(typeof operationId!=='string'||!operationId.trim()||operationId.length>160)throw new Error('培養操作識別無效。');
  const previous=c.enhancements.find(r=>r.operationId===operationId);
  if(previous){if(previous.targetEntryId!==target.id||previous.targetCardId!==target.cardId||previous.materialEntryId!==material.id||previous.materialCardId!==material.cardId)throw new Error('培養重送內容不符。');return {campaign:c,receipt:previous,duplicate:true};}
  const p=cardCampaignEnhancementPreview(c,target,material);if(!p.allowed)throw new Error(p.reason);
  const receipt={operationId,targetEntryId:target.id,targetCardId:target.cardId,materialEntryId:material.id,materialCardId:material.cardId,attackBonus:p.attackBonus,totalBonus:p.newTotal,display:p.display};
  return {campaign:{...c,enhancements:[...c.enhancements,receipt]},receipt,duplicate:false};
}
export function parseCardCampaign(value:unknown):CardCampaign|null {
  const c=value as CardCampaign;
  if(!c||c.v!==1||c.kind!=='card-campaign'||typeof c.id!=='string'||!c.id||c.id.length>100||!Number.isInteger(c.seed)||c.seed<0||c.seed>2147483647||!(c.pending===null||typeof c.pending==='string'&&c.pending.length>0&&c.pending.length<=100)||!Array.isArray(c.enhancements)||c.enhancements.length>2048)return null;
  try {cardCampaignStage(c.wins);let replay:CardCampaign={...c,pending:null,enhancements:[]};for(const r of c.enhancements){const next=enhanceCardCampaign(replay,r.operationId,{id:r.targetEntryId,cardId:r.targetCardId},{id:r.materialEntryId,cardId:r.materialCardId});if(next.duplicate||JSON.stringify(next.receipt)!==JSON.stringify(r))return null;replay=next.campaign;}return c;}catch{return null;}
}
export function applyCardCampaignStats(match:Match,c:CardCampaign,entries?:readonly OwnedCardRef[],sharedBonuses?:Record<string,number>):Match {
  if(entries&&(entries.length!==5||new Set(entries.map(e=>e.id)).size!==5||new Set(entries.map(e=>e.cardId)).size!==5||entries.some(e=>!validOwnedCard(e)||c.enhancements.some(r=>r.materialEntryId===e.id))))throw new Error('請親選五張仍持有且卡型不同的卡片。');
  if(match.player.team.length!==5||match.opponent.team.length!==5)throw new Error('闖關必須五對五。');
  const multiplier=cardCampaignStage(c.wins).enemyMultiplier;
  return {...match,player:{...match.player,team:match.player.team.map(f=>{const e=entries?.find(e=>e.cardId===f.cardId);if(entries&&!e)throw new Error('上陣副本不符。');const bonus=sharedBonuses?(sharedBonuses[e?.id??'']??0):c.enhancements.filter(r=>r.targetEntryId===e?.id&&r.targetCardId===e?.cardId).reduce((n,r)=>n+r.attackBonus,0);if(!Number.isSafeInteger(bonus)||bonus<0||!Number.isSafeInteger(f.attack+bonus))throw new Error('戰鬥攻擊無法精確表示。');return {...f,attack:f.attack+bonus};})},opponent:{...match.opponent,team:match.opponent.team.map(f=>({...f,hp:Math.round(f.hp*multiplier),maxHp:Math.round(f.maxHp*multiplier),attack:Math.round(f.attack*multiplier)}))}};
}
export function settleCardCampaign(c:CardCampaign,match:Match):CardCampaign {
  return match.status==='FINISHED'?{...c,pending:null,wins:c.wins+(match.winner==='player'?1:0)}:c;
}
