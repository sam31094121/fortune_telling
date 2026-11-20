import 'server-only';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { initialSharedOrb } from './cultivation-orb-state';
import { playableCards } from './registry';
import { campaignCardAttack, campaignWin, chooseCampaignHero, parseCampaign, validateCampaignTeam, type HardCampaign } from './match3/hard-campaign';
import { resolveOrbTurn, type TurnInput } from './match3/resolve-turn';
import { resolveCardAttackTurn } from './match3/card-attack';
import { resolveTreasureUse, emptyTreasureBook } from './match3/treasures';
import { orbOutcome } from './match3/battle-outcome';
import { nextComebackRecord } from './match3/comeback';

/** Signed, tab-held guest state. No database, wallet, login or customer collection. */
export interface GuestOrbTicket { kind:'battle'; practice?:true; id:string; version:number; seed:number; input:TurnInput; profile:HardCampaign }
function mac(payload:string) {
  const key=process.env.BEAST_BATTLE_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.JWT_SECRET;
  if(!key)throw new Error('親友戰局驗證服務暫時無法取得。');
  return createHmac('sha256',key).update('guest-orb-v1:'+payload).digest('base64url');
}
/** Server/test harness only; never exposed as a client signing endpoint. */
export function sealGuestOrb(value:GuestOrbTicket|{kind:'profile';profile:HardCampaign}):string {
  const payload=deflateRawSync(Buffer.from(JSON.stringify(value))).toString('base64url');
  return payload+'.'+mac(payload);
}
function open(token:unknown):GuestOrbTicket|{kind:'profile';profile:HardCampaign} {
  if(typeof token!=='string'||token.length>110000)throw new Error('親友戰局憑據無效。');
  const [payload,signature,...rest]=token.split('.'),expected=Buffer.from(mac(payload)),got=Buffer.from(signature??'');
  if(rest.length||expected.length!==got.length||!timingSafeEqual(expected,got))throw new Error('親友戰局憑據無效。');
  return JSON.parse(inflateRawSync(Buffer.from(payload,'base64url'),{maxOutputLength:2000000}).toString());
}
function clean(p:HardCampaign):HardCampaign {const {guestProof,shared,ownedEntries,...rest}=p;return rest;}
function signedProfile(p:HardCampaign):HardCampaign {const profile=clean(p);return {...profile,guestProof:sealGuestOrb({kind:'profile',profile})};}
export function beginGuestOrb(raw:HardCampaign,seed:number,tweakInitial?:(initial:TurnInput)=>TurnInput) {
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error('戰局種子無效。');
  let p:HardCampaign;
  if(raw?.guestProof){
    const proof=open(raw.guestProof);if(proof.kind!=='profile')throw new Error('親友進度憑據無效。');
    p=proof.profile;
    if(raw.heroId!==p.heroId)p=chooseCampaignHero(p,raw.heroId!);
    p={...p,teamIds:raw.teamIds};
  }else{
    // Preserve existing tab-only legacy progress; validate its original receipt format.
    // Historical unsigned progress cannot be retroactively authenticated.
    p=parseCampaign(JSON.stringify(clean(raw)));
    delete p.comebackRecord; // Legacy unsigned data cannot claim losses for new rescue grants.
  }
  if(!validateCampaignTeam(p,p.teamIds))throw new Error('請選定主角，可另選最多四位夥伴。');
  const stats=Object.fromEntries(playableCards().map(c=>[c.id,campaignCardAttack(p,c.id)]));
  const built=initialSharedOrb({...p,shared:{availableIds:p.teamIds,cards:[],stats,selectedEntries:[]}},seed,'hard45');
  const initial=tweakInitial?tweakInitial(built):built; // 只有開發環境捷徑會傳入
  p={...p,treasures:initial.treasures};
  const ticket:GuestOrbTicket={kind:'battle',id:randomUUID(),version:0,seed,input:initial,profile:clean(p)};
  return {initial,profile:signedProfile(p),guestBattleId:ticket.id,guestBattleToken:sealGuestOrb(ticket),guestVersion:0,outcome:orbOutcome(initial.team,initial.foes)};
}
export function openGuestOrb(token:unknown):GuestOrbTicket {
  const ticket=open(token);if(ticket.kind!=='battle'||ticket.input.mode!=='hard45')throw new Error('親友戰局憑據無效。');return ticket;
}
/** The request contributes intentions only. Stats, HP, seed, progress and rewards are signed. */
export function guestOrbInput(ticket:GuestOrbTicket,request:TurnInput):TurnInput {
  const {path,target,rule,chosen,action,attackerId,linkIds,treasureElement,treasureVariant,singleCatchWidth}=request;
  return {...ticket.input,path,target,rule,chosen,action,attackerId,linkIds,treasureElement,treasureVariant,singleCatchWidth,actionId:`guest:${ticket.id}:${ticket.version}`,eventId:`guest:${ticket.id}:${ticket.version}`,seed:action?ticket.seed:(ticket.seed+ticket.input.move*2654435761)>>>0};
}
export function resolveGuestOrb(ticket:GuestOrbTicket,input:TurnInput) {
  if(orbOutcome(ticket.input.team,ticket.input.foes)!==null)throw new Error('本局已結束。');
  let response:object,next:TurnInput;
  if(input.action==='energy'||input.action==='link'){
    const r=resolveCardAttackTurn(input);response=r;next={...ticket.input,team:r.team,foes:r.foes};
  }else if(input.action==='treasure'){
    const r=resolveTreasureUse(input,input.treasureElement!,input.treasureVariant??0);response=r;next={...ticket.input,team:r.team,foes:r.foes,treasures:r.book,treasureGuard:r.guardScale,comeback:r.comeback,comebackText:r.comebackText};
  }else{
    const r=resolveOrbTurn(input);response=r;next={...ticket.input,board:r.res.board,magic:r.res.magic,team:r.counter.team,foes:r.counter.foes,treasures:r.treasure.book,treasureGuard:r.nextTreasureGuard,attackBoost:r.nextBoost,move:ticket.input.move+(input.path.length?1:0),comeback:r.comeback,comebackText:r.comebackText};
  }
  // Existing guest rule: no permanent treasure book; reward stays in this tab only.
  let profile={...ticket.profile,treasures:next.treasures};
  const outcome=orbOutcome(next.team,next.foes);
  if(!ticket.practice&&input.comeback&&(outcome==='win'||outcome==='lose'))profile={...profile,comebackRecord:nextComebackRecord(input.wins,ticket.profile.comebackRecord,outcome)};
  if(!ticket.practice&&outcome==='win')profile={...campaignWin(profile,'guest-win:'+ticket.id,ticket.input.wins).profile,treasures:emptyTreasureBook()};
  const updated:GuestOrbTicket={...ticket,version:ticket.version+1,input:next,profile};
  return {...response,outcome,guestBattleToken:sealGuestOrb(updated),guestVersion:updated.version,guestProfile:signedProfile(profile)};
}
