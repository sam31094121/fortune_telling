const assert=require('node:assert/strict');
const {fixture}=require('./beast-orb-turn.test.cjs');
const {resolveOrbTurn}=require('../lib/beast-game/match3/resolve-turn.ts');
const {ELEMENTS}=require('../lib/beast-game/elements.ts');
let checked=0;
for(const wins of [0,7,15,31]) for(let seed=1;seed<=250;seed++) {
 const p=fixture();p.wins=wins;p.seed=seed;p.move=seed;p.attackBoost=seed%2?1:1.5;
 if(seed%2){p.team.reverse();p.foes.reverse();}
 p.team=p.team.map((u,i)=>({...u,hp:(seed+i)%5===0?0:20+(seed+i)%80}));
 p.foes=p.foes.map((u,i)=>({...u,hp:(seed+i)%7===0?0:50+(seed+i)%100}));
 const count=3+seed%5,shield=seed%3===0;
 p.path=Array.from({length:count},(_,c)=>({r:0,c}));
 for(let c=0;c<count;c++){p.board[0][c]=ELEMENTS[shield?(seed+c)%5:seed%5];p.magic[0][c]=shield?7:0;}
 const before=JSON.stringify(p),r=resolveOrbTurn(p);
 assert.equal(JSON.stringify(p),before,'turn must not mutate caller state');
 for(const [original,next] of [[p.team,r.counter.team],[p.foes,r.counter.foes]])for(let i=0;i<next.length;i++){
  assert(Number.isInteger(next[i].hp)&&next[i].hp>=0&&next[i].hp<=next[i].maxHp);
  // Existing card skills are allowed to revive; generating/shield facts never are.
  assert.equal(next[i].maxHp,original[i].maxHp);
 }
 for(const facts of [r.heals,r.enemyHeals]){
  for(const h of facts){assert(h.hpBefore>0);assert.equal(h.actual,h.hpAfter-h.hpBefore);assert(h.actual>0);}
  const side=facts===r.heals?p.team:p.foes;
  for(const u of side){const actual=facts.filter(h=>h.id===u.id&&h.reason==='generating').reduce((n,h)=>n+h.actual,0);assert(actual<=Math.floor(u.maxHp*.1));}
 }
 assert([1,1.5].includes(r.nextBoost));assert([1,.5,.4,.3].includes(r.guardScale));
 if(r.summon)assert(r.actualHits.some(h=>h.attackerId===r.summon.sourceId&&h.amount>0));
 checked++;
}
console.log(`PASS ${checked} seeded turn snapshots across stages 1/8/16/32 and reversed lineups: bounded HP/healing, no input mutation, true summons. This is not a full-match balance verdict.`);
