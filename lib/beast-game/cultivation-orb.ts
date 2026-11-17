import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cultivationRepository } from './cultivation-repository';
import { cultivationView } from './cultivation-view';
import { battleBonus, holdCultivationBattle, updateCultivationAccount } from './cultivation-games';
import { initialSharedOrb } from './cultivation-orb-state';
import { adoptLegacyTreasures, normalizeHeroChoice, CampaignConflict } from './cultivation-legacy';
import type { Match3ModeId } from './match3/config';
import { parseCampaign, campaignCardAttack, campaignAdultIds, validateCampaignTeam, type HardCampaign } from './match3/hard-campaign';
import { playableCards } from './registry';
import { combatNumber } from './exact-combat';
import { resolveOrbTurn, type TurnInput } from './match3/resolve-turn';
import { resolveCardAttackTurn } from './match3/card-attack';
import { resolveTreasureUse, emptyTreasureBook } from './match3/treasures';
import { foeAvailable } from './match3/enemies';
import { orbOutcome } from './match3/battle-outcome';

export async function sharedOrbProfile(owner:string,value:unknown):Promise<HardCampaign> {
  if(!value||typeof value!=='object')throw new Error('寶珠進度無法讀取。');
  const raw={...(value as HardCampaign)},teamIds=raw.teamIds,selected=raw.ownedEntries??{};
  delete raw.shared;raw.teamIds=[];
  let snapshot=await cultivationRepository().read(owner);
  // 伺服器從沒存過寶器（上線初期的帳本）：先接受本機寶器一次並寫回，不讓本機變少。
  if(snapshot.orbTreasures===undefined)snapshot=await updateCultivationAccount(owner,current=>adoptLegacyTreasures(current,raw.treasures,emptyTreasureBook()));
  if(snapshot.orbLedger)Object.assign(raw,snapshot.orbLedger);
  raw.treasures=snapshot.orbTreasures??emptyTreasureBook();
  let p:HardCampaign;
  try{p=parseCampaign(JSON.stringify(normalizeHeroChoice(raw)));}
  catch{throw new CampaignConflict(snapshot.orbLedger?.wins??0);}
  const view=cultivationView(snapshot);
  const trial=playableCards().filter(c=>c.form==='YOUNG'&&!p.consumedYoungIds?.includes(c.id)).map(c=>c.id);
  const availableIds=[...new Set([...trial,...(p.heroId?[p.heroId]:[]),...view.cards.map(c=>c.cardId)])];
  const stats:NonNullable<HardCampaign['shared']>['stats']={},entries:{id:string;cardId:string}[]=[];
  for(const c of playableCards()) {
    if(selected[c.id]){
      const copy=snapshot.state.cards.find(x=>x.id===selected[c.id]&&x.cardId===c.id);
      if(!copy){delete selected[c.id];stats[c.id]=campaignCardAttack(p,c.id);continue;}
      const bonus=battleBonus(copy.bonus),attackExact=(BigInt(c.stats.attack)+BigInt(copy.bonus)).toString();
      stats[c.id]={baseAttack:c.stats.attack,bonus,attack:combatNumber(attackExact),...(BigInt(attackExact)>BigInt(Number.MAX_SAFE_INTEGER)?{attackExact}:{})};
      if(teamIds?.includes(c.id))entries.push({id:copy.id,cardId:copy.cardId});
    } else stats[c.id]=campaignCardAttack(p,c.id);
  }
  p.shared={availableIds,cards:view.cards,stats,selectedEntries:entries};
  p.teamIds=Array.isArray(teamIds)&&validateCampaignTeam(p,teamIds)?teamIds:[];
  if(p.teamIds.some(id=>!trial.includes(id)&&id!==p.heroId&&!selected[id]))p.teamIds=[];
  p.ownedEntries=selected;
  return p;
}
interface OrbTicket {owner:string;id:string;wins:number;teamIds:string[];attacks:Record<string,number>;exactAttacks:Record<string,string>;issuedAt:number}
const secret=()=>process.env.BEAST_BATTLE_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.JWT_SECRET;
function mac(value:string){const key=secret();if(!key)throw new Error('寶珠簽章服務尚未就緒。');return createHmac('sha256',key).update('shared-orb:'+value).digest('base64url');}
export async function beginSharedOrb(owner:string,profile:unknown,operationId:string,seed:number,mode:Match3ModeId) {
  if(typeof operationId!=='string'||!operationId||operationId.length>100)throw new Error('戰局識別無效。');
  const p=await sharedOrbProfile(owner,profile);if(!validateCampaignTeam(p,p.teamIds))throw new Error('請選定完整隊伍。');
  const initial=initialSharedOrb(p,seed,mode);
  const id='orb:'+operationId;await holdCultivationBattle(owner,id,'orb',p.shared!.selectedEntries);
  const saved=await updateCultivationAccount(owner,current=>{
    if(current.pendingBattle!==id)throw new Error('戰局已變更。');
    if(current.orbRun?.id===id){if(JSON.stringify(current.orbRun.input.team.map(c=>c.id))!==JSON.stringify(p.teamIds)||current.orbRun.input.mode!==mode)throw new Error('同一戰局不能更換隊伍或模式。');return current;}
    return {...current,orbRun:{id,version:0,seed,input:initial}};
  });
  const ticket:OrbTicket={owner,id,wins:p.wins,teamIds:p.teamIds,attacks:Object.fromEntries(p.teamIds.map(id=>[id,p.shared!.stats[id].attack])),exactAttacks:Object.fromEntries(p.teamIds.map(id=>[id,p.shared!.stats[id].attackExact??String(p.shared!.stats[id].attack)])),issuedAt:Date.now()};
  const payload=Buffer.from(JSON.stringify(ticket)).toString('base64url');
  return {profile:p,battleId:id,token:payload+'.'+mac(payload),initial:saved.orbRun!.input,version:saved.orbRun!.version,outcome:orbOutcome(saved.orbRun!.input.team,saved.orbRun!.input.foes)};
}
/** Read only: resume the saved turn without reopening or granting another reward. */
export async function resumeSharedOrb(owner:string,battleId:unknown) {
  if(typeof battleId!=='string')throw new Error('戰局識別無效。');
  const saved=await cultivationRepository().read(owner),run=saved.orbRun;
  if(!run||run.id!==battleId||(saved.pendingBattle!==battleId&&!saved.creditedIds?.includes('orb-win:'+battleId)))throw new Error('原寶珠戰局暫時無法取得。');
  const input=run.input;
  const ticket:OrbTicket={owner,id:run.id,wins:input.wins,teamIds:input.team.map(c=>c.id),attacks:Object.fromEntries(input.team.map(c=>[c.id,c.attack])),exactAttacks:Object.fromEntries(input.team.map(c=>[c.id,c.attackExact??String(c.attack)])),issuedAt:Date.now()};
  const payload=Buffer.from(JSON.stringify(ticket)).toString('base64url');
  return {battleId:run.id,token:payload+'.'+mac(payload),initial:input,version:run.version,totalDamage:run.totalDamage,lastDamage:run.lastDamage,outcome:orbOutcome(input.team,input.foes)};
}
export async function verifySharedOrb(owner:string,token:unknown) {
  if(typeof token!=='string')throw new Error('寶珠戰局憑證無效。');const [payload,signature,...rest]=token.split('.');
  const expected=Buffer.from(mac(payload)),got=Buffer.from(signature??'');
  if(rest.length||expected.length!==got.length||!timingSafeEqual(expected,got))throw new Error('寶珠戰局憑證無效。');
  const t=JSON.parse(Buffer.from(payload,'base64url').toString()) as OrbTicket;
  if(t.owner!==owner||Date.now()-t.issuedAt>12*60*60*1000)throw new Error('寶珠戰局已過期，請返回選卡。');
  const current=await cultivationRepository().read(owner);
  if(current.pendingBattle!==t.id&&!current.creditedIds?.includes('orb-win:'+t.id))throw new Error('寶珠戰局已離開，請重新開戰。');
  return t;
}
/** Persist the authoritative turn, inventory and victory receipt in one CAS write. */
export async function resolveSharedOrbTurn(t:OrbTicket,request:TurnInput,version:number) {
  if(!Number.isSafeInteger(version)||version<0)throw new Error('戰局版本無效。');
  const controls={path:request.path,target:request.target,rule:request.rule,chosen:request.chosen,action:request.action,attackerId:request.attackerId,linkIds:request.linkIds,treasureElement:request.treasureElement,treasureVariant:request.treasureVariant};
  const command=JSON.stringify(controls);
  const saved=await updateCultivationAccount(t.owner,current=>{
    const run=current.orbRun;
    if(!run||run.id!==t.id)throw new Error('原寶珠戰局暫時無法取得。');
    if(run.last?.version===version){if(run.last.command!==command)throw new Error('上一招已保存，請重新讀取戰局。');return current;}
    if(run.version!==version||current.pendingBattle!==t.id)throw new Error('戰局已更新，請重新讀取。');
    if(!run.input.team.some(c=>c.hp>0)||run.input.foes.every(c=>c.hp<=0))throw new Error('戰鬥已結束。');
    const input:TurnInput={...run.input,...controls,actionId:`${t.id}:${version}`,eventId:`${t.id}:${version}`,seed:request.action?run.seed:(run.seed+run.input.move*2654435761)>>>0};
    if(!foeAvailable(input.foes,input.target,input.wins+1))throw new Error('目標尚未出戰或已倒下。');
    let response:unknown,next:TurnInput;
    if(input.action==='treasure'){
      const r=resolveTreasureUse(input,input.treasureElement!,input.treasureVariant??0);response=r;next={...run.input,team:r.team,foes:r.foes,treasures:r.book,treasureGuard:r.guardScale};
    }else if(input.action==='energy'||input.action==='link'){
      const r=resolveCardAttackTurn(input);response=r;next={...run.input,team:r.team,foes:r.foes};
    }else{
      const r=resolveOrbTurn(input);response=r;
      next={...run.input,board:r.res.board,magic:r.res.magic,team:r.counter.team,foes:r.counter.foes,treasures:r.treasure.book,treasureGuard:r.nextTreasureGuard,attackBoost:r.nextBoost,move:run.input.move+(input.path.length?1:0)};
    }
    const won=orbOutcome(next.team,next.foes)==='win',event='orb-win:'+t.id;
    const reward={matchId:event,cardId:campaignAdultIds()[t.wins%28],win:t.wins+1};
    if(won&&reward.win!==(current.orbLedger?.wins??0)+1)throw new Error('關卡紀錄不符。');
    return {...current,orbTreasures:next.treasures,orbRun:{...run,version:version+1,input:next,last:{version,command,response:{...(response as object),sharedVersion:version+1}}},
      ...(won?{state:{...current.state,cards:[...current.state.cards,{id:event,cardId:reward.cardId,bonus:'0'}]},pendingBattle:null,hold:undefined,orbLedger:{wins:reward.win,rewards:[...(current.orbLedger?.rewards??[]),reward],receipts:[...(current.orbLedger?.receipts??[]),reward]},creditedIds:[...(current.creditedIds??[]),event,'closed:'+t.id]}:{})};
  });
  return saved.orbRun!.last!.response;
}
