import { runOrbSkillEvent, orbSkillCanAttack, orbSkillSpeed, type SkillFoe, type OrbSkillEvent } from './skill-runtime';
import { damageFoeWithSkills, availableFoeTarget, type Match3Foe } from './enemies';
import { fighterEffectiveAttack, hitAmount, type Match3Hit } from './damage';
import type { BeastElement } from '../elements';

type Player = SkillFoe & { energy: number };
export function recalculatePlayerHit(hit:Match3Hit,team:readonly Player[],enemyElement:BeastElement):Match3Hit {
  const actor=team.find(u=>u.id===hit.attackerId);
  if(hit.amount<=0||!actor||!orbSkillCanAttack(actor))return {...hit,amount:0};
  return {...hit,amount:hitAmount(fighterEffectiveAttack(actor),hit.power??hit.length,hit.chain,hit.element,enemyElement)};
}
export function orderPlayerHits<H extends {attackerId:string|null;chain?:number}>(hits:readonly H[],team:readonly SkillFoe[]):H[] {
  const speed=(id:string|null)=>{const unit=team.find(u=>u.id===id);return unit?orbSkillSpeed(unit):0};
  return [...hits].sort((a,b)=>(a.chain??0)-(b.chain??0)||speed(b.attackerId)-speed(a.attackerId));
}
export function initializePlayerSkills<T extends Player>(team: readonly T[]) {
  const skillEvents: OrbSkillEvent[] = [], notApplicable: {skillId:string;reason:'no_deck'|'no_target'}[] = [];
  const next = team.map(unit => {
    const summon=runOrbSkillEvent(unit,'ON_SUMMON',{sourceSide:'ally'});
    const passive=runOrbSkillEvent(summon.source,'PASSIVE',{sourceSide:'ally'});
    skillEvents.push(...summon.events,...passive.events);notApplicable.push(...summon.notApplicable,...passive.notApplicable);
    return {...passive.source,skillRuntime:{...passive.source.skillRuntime!,playerSkillsEnabled:true}};
  });
  return {team:next,skillEvents,notApplicable};
}

/** Original holder triggers, in original speed order. Duration tick remains a separate single call. */
export function runPlayerTurnSkills<T extends Player,F extends Match3Foe>(team:readonly T[],foes:readonly F[],trigger:'ON_TURN_START'|'ON_TURN_END',stage:number,eventId:string,targetIndex:number) {
  const next=[...team],enemies=[...foes],skillEvents:OrbSkillEvent[]=[];let actualDamage=0;
  const order=next.map((u,i)=>({i,speed:orbSkillSpeed(u)})).sort((a,b)=>b.speed-a.speed||a.i-b.i);
  for(const {i} of order) {
    const ti=availableFoeTarget(enemies,targetIndex,stage);
    const event=runOrbSkillEvent(next[i],trigger,{target:ti>=0?enemies[ti]:undefined,eventId,sourceSide:'ally',targetSide:'enemy'});
    next[i]=event.source;if(ti>=0&&event.target)enemies[ti]=event.target;
    skillEvents.push(...event.events);actualDamage+=event.targetActualDamage;
  }
  return {team:next,foes:enemies,skillEvents,actualDamage};
}

/** One recorded basic hit, then each actual participant's original ON_ATTACK skills. */
export function resolvePlayerCardAttack<T extends Player,F extends Match3Foe>(input:{team:readonly T[];foes:readonly F[];attackerIds:readonly string[];targetIndex:number;baseDamage:number;stage:number;eventId:string;allowEnemyReaction:boolean}) {
  let team=[...input.team],foes=[...input.foes];const skillEvents:OrbSkillEvent[]=[],actualHits:{attackerId:string;amount:number}[]=[];
  const result=()=>({team,foes,skillEvents,actualHits,actualDamage:actualHits.reduce((sum,h)=>sum+h.amount,0)});
  const ids=[...new Set(input.attackerIds)];
  const actors=ids.map(id=>team.findIndex(u=>u.id===id));
  if(!input.eventId||!Number.isFinite(input.baseDamage)||input.baseDamage<=0||!actors.length||actors.some(i=>i<0||!orbSkillCanAttack(team[i]))||actors.some(i=>team[i].skillRuntime?.playerAttackReceipts?.includes(input.eventId)))return result();
  // Do not redirect an explicitly invalid/locked target into a surprise attack.
  if(availableFoeTarget(foes,input.targetIndex,input.stage)!==input.targetIndex)return result();
  const lead=actors[0];
  const basic=damageFoeWithSkills(foes,input.targetIndex,input.baseDamage,input.stage,input.eventId,team,team[lead].id,false);
  team=basic.team;foes=basic.foes;
  actualHits.push({attackerId:team[lead].id,amount:basic.actualDamage});
  const order=[...actors].sort((a,b)=>orbSkillSpeed(team[b])-orbSkillSpeed(team[a])||a-b);
  for(const index of order) {
    const attack=runOrbSkillEvent(team[index],'ON_ATTACK',{target:foes[input.targetIndex],eventId:input.eventId,sourceSide:'ally',targetSide:'enemy'});
    team[index]=attack.source;if(attack.target)foes[input.targetIndex]=attack.target;
    skillEvents.push(...attack.events);
    actualHits.push({attackerId:team[index].id,amount:attack.targetActualDamage});
    const runtime=team[index].skillRuntime!;
    team[index]={...team[index],skillRuntime:{...runtime,playerSkillsEnabled:true,playerAttackReceipts:[...(runtime.playerAttackReceipts??[]),input.eventId].slice(-512)}};
  }
  const total=actualHits.reduce((sum,h)=>sum+h.amount,0);
  if(input.allowEnemyReaction&&input.stage>=11&&total>0&&foes[input.targetIndex].hp>0) {
    const reaction=runOrbSkillEvent(foes[input.targetIndex],'ON_DAMAGED',{target:team[lead],actualDamage:total,eventId:input.eventId,sourceSide:'enemy',targetSide:'ally'});
    foes[input.targetIndex]=reaction.source;if(reaction.target)team[lead]={...reaction.target,energy:reaction.target.hp<=0?0:reaction.target.energy};
    skillEvents.push(...reaction.events);
  }
  return result();
}
