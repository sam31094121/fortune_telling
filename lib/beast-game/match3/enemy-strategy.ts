import policy from '../../../docs/技能戰鬥檔案/寶珠阿修羅/敵方策略.json';
import { elementMultiplier, type BeastElement } from '../elements';
import { absorbFoeShieldDamage, foeSkillAttack, orbSkillCanAttack, orbSkillSpeed, runOrbSkillEvent, tickFoeSkillDurations, type SkillFoe, type FoeSkillState, type OrbSkillEvent } from './skill-runtime';
interface Fighter { hp: number; element: BeastElement; id?: string; maxHp?: number; attack?: number; skillRuntime?: FoeSkillState }
interface Enemy extends Fighter { attack: number }
const complete = (f: Fighter): f is SkillFoe => typeof f.id === 'string' && typeof f.maxHp === 'number' && typeof f.attack === 'number';
export function orbCounterDamage(attack: number, from: BeastElement, to: BeastElement, guard: boolean): number {
  return Math.round(attack * elementMultiplier(from, to) * (guard ? .5 : 1));
}
export function orbEnemyStrategy(stage: number) {
  return [...policy.tiers].reverse().find(t => Number.isFinite(stage) && stage >= t.stage) ?? policy.tiers[0];
}
/** Same original event resolver is used by finite previews and the committed counter action. */
export function resolveOrbEnemyAction<F extends SkillFoe,T extends SkillFoe>(actor: F, victim: T, stage: number, guard: boolean, eventId?: string) {
  let source = actor, target = victim;
  const events: OrbSkillEvent[] = [];
  let basic: null | {damage:number;hpBefore:number;hpAfter:number;actualDamage:number} = null;
  const trigger = (kind: 'ON_TURN_START'|'ON_ATTACK'|'ON_TURN_END') => {
    const r=runOrbSkillEvent(source,kind,{target,eventId,incomingDamageScale:guard?.5:1,sourceSide:'enemy',targetSide:'ally'});source=r.source;if(r.target)target=r.target;events.push(...r.events);return r.targetActualDamage;
  };
  if(stage>=9)trigger('ON_TURN_START');
  if(target.hp>0 && orbSkillCanAttack(source)) {
    const damage=orbCounterDamage(foeSkillAttack(source),source.element,target.element,guard),hpBefore=target.hp;
    target=absorbFoeShieldDamage(target,damage).foe;
    basic={damage,hpBefore,hpAfter:target.hp,actualDamage:hpBefore-target.hp};
    let actual=basic.actualDamage;
    if(stage>=10)actual+=trigger('ON_ATTACK');
    if((stage>=11 || target.skillRuntime?.playerSkillsEnabled) && actual>0 && target.hp>0) {
      const r=runOrbSkillEvent(target,'ON_DAMAGED',{target:source,actualDamage:actual,eventId,sourceSide:'ally',targetSide:'enemy'});target=r.source;if(r.target)source=r.target;events.push(...r.events);
    }
  }
  if(stage>=9)trigger('ON_TURN_END');
  if(stage>=8 || source.skillRuntime)source=tickFoeSkillDurations(source);
  return {source,target,basic,events};
}
const better = (a: readonly number[], b: readonly number[]) => { for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]>b[i]}return false; };
/** One planner, public present state only. At most 24 legal same-speed permutations; no future board/RNG. */
export function planOrbCounter(team: readonly Fighter[], foes: readonly Enemy[], eligible: readonly number[], single: boolean, turn: number, stage: number, guard: boolean): { enemy: number; target: number }[] {
  if (!eligible.length) return [];
  const tier=orbEnemyStrategy(stage), speed=(i:number)=>stage>=8&&complete(foes[i])?orbSkillSpeed(foes[i] as SkillFoe):0;
  const baseline=single?[eligible[turn%eligible.length]]:[...eligible].sort((a,b)=>speed(b)-speed(a));
  const orders:number[][]=[baseline];
  if(single&&tier.level>=1)eligible.forEach(i=>orders.push([i]));
  if(!single&&tier.actors==='permutations'&&eligible.length<=4){
    const permute=(prefix:number[],rest:number[])=>{if(!rest.length){if(prefix.every((v,i)=>!i||speed(prefix[i-1])>=speed(v)))orders.push(prefix)}else rest.forEach((v,i)=>permute([...prefix,v],rest.filter((_,j)=>j!==i)))};
    permute([], [...eligible]);
  }
  type Preview={players:Fighter[];enemies:Enemy[];actions:{enemy:number;target:number}[]};
  const initial=():Preview=>({players:team.map(t=>({...t})),enemies:foes.map(f=>({...f})),actions:[]});
  const score=(s:Preview)=>[s.players.filter((p,i)=>team[i].hp>0&&p.hp<=0).length,s.players.reduce((n,p,i)=>n+team[i].hp-p.hp,0),s.enemies.reduce((n,f)=>n+Math.max(0,f.hp)+(f.skillRuntime?.shield??0),0),s.enemies.reduce((n,f)=>n+(f.hp>0?(complete(f)?foeSkillAttack(f):f.attack):0),0)];
  const branches=(s:Preview,enemy:number):Preview[]=>{
    if(s.enemies[enemy].hp<=0)return [s];
    const living=s.players.map((p,i)=>p.hp>0?i:-1).filter(i=>i>=0);if(!living.length)return [s];
    const low=living.reduce((a,b)=>s.players[b].hp<s.players[a].hp?b:a),candidates=[low];
    if(tier.level>=1)candidates.push(living.reduce((a,b)=>elementMultiplier(s.enemies[enemy].element,s.players[b].element)>elementMultiplier(s.enemies[enemy].element,s.players[a].element)?b:a));
    if(tier.level>=2)candidates.push(...living);
    return [...new Set(candidates)].map(target=>{
      const source=s.enemies[enemy],victim=s.players[target];let nextSource=source,nextTarget=victim;
      if((stage>=8||source.skillRuntime||victim.skillRuntime?.playerSkillsEnabled)&&complete(source)&&complete(victim)){const r=resolveOrbEnemyAction(source,victim,stage,guard);nextSource=r.source;nextTarget=r.target}
      else nextTarget=absorbFoeShieldDamage(victim,orbCounterDamage(source.attack,source.element,victim.element,guard)).foe;
      const players=[...s.players],enemies=[...s.enemies];players[target]=nextTarget;enemies[enemy]=nextSource;
      return {players,enemies,actions:[...s.actions,{enemy,target}]};
    });
  };
  const ranked=(states:Preview[])=>states.sort((a,b)=>better(score(a),score(b))?-1:better(score(b),score(a))?1:0);
  const evaluate=(order:number[])=>{
    // Always retain the lower-tier greedy complete action sequence as an explicit candidate.
    let greedy=initial();for(const enemy of order)greedy=ranked(branches(greedy,enemy))[0];
    let best=greedy;
    if(tier.level>=5){let beam=[initial()];for(const enemy of order)beam=ranked(beam.flatMap(s=>branches(s,enemy))).slice(0,4);for(const s of beam)if(better(score(s),score(best)))best=s}
    return {actions:best.actions,score:score(best)};
  };
  let best=evaluate(baseline);for(const order of orders){const next=evaluate(order);if(better(next.score,best.score))best=next}return best.actions;
}
