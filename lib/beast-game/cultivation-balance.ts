import 'server-only';
import { starProgress } from './cultivation-rules';
import { ELEMENT_GENERATES } from './elements';
import { getCard } from './registry';
import type { CultivationSnapshot } from './cultivation-transaction';

/** Half-basis-point units: each star grants 10%, affinity materials grant 15%.
 * Progress inside each star is proportional to that star's feed requirement.
 * Thus five stars are +50% to +75%, never thousands of flat attack points. */
export function starPower(form: 'ADULT'|'GUARDIAN', fed: number): number {
  const s=starProgress(form,fed);if(s.maxed)return 10000;
  const start=s.stars?s.thresholds[s.stars-1]:0,end=s.thresholds[s.stars];
  return s.stars*2000+Math.floor((Math.max(0,fed)-start)*2000/(end-start));
}
export function affinityMaterial(materialId:string,targetId:string):boolean {
  const m=getCard(materialId),t=getCard(targetId);
  return !!m&&!!t&&(m.element===t.element||ELEMENT_GENERATES[m.element]===t.element);
}
export function feedPower(form:'ADULT'|'GUARDIAN',fed:number,affinity:boolean):number {
  const step=starPower(form,fed+1)-starPower(form,fed);
  // Units use 1/20000 of the original attack, not of the already enhanced attack.
  return affinity?Math.floor(starPower(form,fed+1)*3/2)-Math.floor(starPower(form,fed)*3/2):step;
}
export function proportionalBonus(base:number|bigint,power:number):bigint {
  return BigInt(base)*BigInt(Math.max(0,Math.min(15000,power)))/20000n;
}
/** Read-only migration: preserve original values and receipts. Persist only with a
 * later authorized transaction. Reconstruct affinity from actual eaten cards. */
export function balancedSnapshot(snapshot:CultivationSnapshot):CultivationSnapshot {
  const history=new Map<string,{fed:number;extra:number}>();
  for(const receipt of snapshot.receipts??[])for(const change of receipt.changes??[]){
    const target=getCard(change.targetCardId);if(!target||target.form==='YOUNG')continue;
    const h=history.get(change.targetId)??{fed:0,extra:0};
    const position=change.fedBefore??h.fed;
    if(affinityMaterial(change.materialCardId,change.targetCardId))h.extra+=feedPower(target.form,position,true)-feedPower(target.form,position,false);
    h.fed=Math.max(h.fed,position+1);history.set(change.targetId,h);
  }
  return {...snapshot,state:{...snapshot.state,cards:snapshot.state.cards.map(copy=>{
    const card=getCard(copy.cardId);if(!card||card.form==='YOUNG')return copy;
    const h=history.get(copy.id),fed=copy.fed??h?.fed??0;
    const power=copy.powerUnits??Math.min(15000,starPower(card.form,fed)+(h?.extra??0));
    return {...copy,fed,powerUnits:power,legacyBonus:copy.legacyBonus??copy.bonus,bonus:proportionalBonus(card.stats.attack,power).toString()};
  })}};
}
