import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cultivationRepository } from './cultivation-repository';
import { cultivationView } from './cultivation-view';
import { battleBonus, holdCultivationBattle, creditCultivationCards } from './cultivation-games';
import { parseCampaign, campaignCardAttack, campaignAdultIds, validateCampaignTeam, type HardCampaign } from './match3/hard-campaign';
import { playableCards } from './registry';
import { combatNumber } from './exact-combat';

export async function sharedOrbProfile(owner:string,value:unknown):Promise<HardCampaign> {
  if(!value||typeof value!=='object')throw new Error('寶珠進度無法讀取。');
  const raw={...(value as HardCampaign)},teamIds=raw.teamIds,selected=raw.ownedEntries??{};
  delete raw.shared;raw.teamIds=[];
  const snapshot=await cultivationRepository().read(owner);
  if(snapshot.orbLedger)Object.assign(raw,snapshot.orbLedger);
  const p=parseCampaign(JSON.stringify(raw)),view=cultivationView(snapshot);
  const trial=playableCards().filter(c=>c.form==='YOUNG'&&!p.consumedYoungIds?.includes(c.id)).map(c=>c.id);
  const availableIds=[...new Set([...trial,...(p.heroId?[p.heroId]:[]),...view.cards.map(c=>c.cardId)])];
  const stats:NonNullable<HardCampaign['shared']>['stats']={},entries:{id:string;cardId:string}[]=[];
  for(const c of playableCards()) {
    if(selected[c.id]){
      const copy=snapshot.state.cards.find(x=>x.id===selected[c.id]&&x.cardId===c.id);
      if(!copy){delete selected[c.id];continue;}
      const bonus=battleBonus(copy.bonus),attackExact=(BigInt(c.stats.attack)+BigInt(copy.bonus)).toString();
      stats[c.id]={baseAttack:c.stats.attack,bonus,attack:combatNumber(attackExact),attackExact};
      if(teamIds?.includes(c.id))entries.push({id:copy.id,cardId:copy.cardId});
    } else stats[c.id]=campaignCardAttack(p,c.id);
  }
  p.shared={availableIds,cards:view.cards,stats,selectedEntries:entries};
  p.teamIds=Array.isArray(teamIds)&&validateCampaignTeam(p,teamIds)?teamIds:[];
  for(const id of p.teamIds)if(!trial.includes(id)&&id!==p.heroId&&!selected[id])throw new Error('請指定要出戰的收藏副本。');
  return p;
}
interface OrbTicket {owner:string;id:string;wins:number;teamIds:string[];attacks:Record<string,number>;exactAttacks:Record<string,string>;issuedAt:number}
const secret=()=>process.env.BEAST_BATTLE_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.JWT_SECRET;
function mac(value:string){const key=secret();if(!key)throw new Error('寶珠簽章服務尚未就緒。');return createHmac('sha256',key).update('shared-orb:'+value).digest('base64url');}
export async function beginSharedOrb(owner:string,profile:unknown,operationId:string) {
  if(typeof operationId!=='string'||!operationId||operationId.length>100)throw new Error('戰局識別無效。');
  const p=await sharedOrbProfile(owner,profile);if(!validateCampaignTeam(p,p.teamIds))throw new Error('請選定完整隊伍。');
  const id='orb:'+operationId;await holdCultivationBattle(owner,id,'orb',p.shared!.selectedEntries);
  const ticket:OrbTicket={owner,id,wins:p.wins,teamIds:p.teamIds,attacks:Object.fromEntries(p.teamIds.map(id=>[id,p.shared!.stats[id].attack])),exactAttacks:Object.fromEntries(p.teamIds.map(id=>[id,p.shared!.stats[id].attackExact??String(p.shared!.stats[id].attack)])),issuedAt:Date.now()};
  const payload=Buffer.from(JSON.stringify(ticket)).toString('base64url');
  return {profile:p,battleId:id,token:payload+'.'+mac(payload)};
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
export async function completeSharedOrb(t:OrbTicket,team:{hp:number}[],foes:{hp:number}[]) {
  if(!team.some(c=>c.hp>0)||!foes.every(c=>c.hp<=0))return null;
  const cardId=campaignAdultIds()[t.wins%28],matchId='orb-win:'+t.id;
  const reward={matchId,cardId,win:t.wins+1};
  await creditCultivationCards(t.owner,matchId,[{id:matchId,cardId,bonus:'0'}],[],t.id,reward);
  return reward;
}
