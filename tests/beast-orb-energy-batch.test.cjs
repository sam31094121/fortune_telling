const assert=require('node:assert/strict');require('./guest-orb-fixture.cjs');
const {playableCards}=require('../lib/beast-game/registry.ts');
const {resolveEnergyAttack,resolveEnergyBatch,resolveCardAttackTurn}=require('../lib/beast-game/match3/card-attack.ts');
const {initializePlayerSkills}=require('../lib/beast-game/match3/player-skills.ts');
const {initializeAvailableFoes,foeAvailable}=require('../lib/beast-game/match3/enemies.ts');
const {fighterCanAct}=require('../lib/beast-game/match3/damage.ts');
let cases=0;
for(const stage of [1,8,16])for(const card of playableCards()){
 const actor={id:card.id,name:card.name,element:card.element,hp:1000,maxHp:1000,attack:30,energy:100,orbDropCharges:7};
 const team=initializePlayerSkills([actor]).team;
 const foe=playableCards().find(c=>c.form==='ADULT'&&c.id!==card.id);
 const foes=initializeAvailableFoes([{id:foe.id,element:foe.element,hp:10000,maxHp:10000,attack:20,cd:3}],stage);
 if(foes[0].skillRuntime)foes[0].skillRuntime.shield=800;
 const args={team,foes,targetIndex:0,stage,eventId:'batch-equivalence',attackerId:card.id};
 const before=JSON.stringify(args);let t=team,f=foes,hits=[],events=[],damage=0,strikes=0;
 for(let i=0;i<7;i++){
  if(t[0].hp<=0||t[0].energy<100||!fighterCanAct(t[0])||!foeAvailable(f,0,stage))break;
  const r=resolveEnergyAttack({...args,team:t,foes:f,eventId:i?'batch-equivalence:batch:'+i:'batch-equivalence'});
  t=r.team;f=r.foes;hits.push(...r.actualHits);events.push(...r.skillEvents);damage+=r.actualDamage;strikes++;
 }
 const batch=resolveEnergyBatch(args);
 assert.deepEqual(batch.team,t);assert.deepEqual(batch.foes,f);assert.deepEqual(batch.actualHits,hits);assert.deepEqual(batch.skillEvents,events);assert.equal(batch.actualDamage,damage);assert.equal(batch.strikes,strikes);assert.equal(JSON.stringify(args),before);cases++;
}
const cards=playableCards().filter(c=>c.form==='YOUNG').slice(0,5);
const team=cards.map(c=>({id:c.id,element:c.element,hp:100,maxHp:100,attack:10,energy:100,orbDropCharges:256}));
const foes=cards.map(c=>({id:c.id,element:c.element,hp:1000,maxHp:1000,attack:10,cd:3}));
const input={team,foes,target:0,wins:0,mode:'hard45',action:'energy',attackerId:team[0].id,actionId:'one',eventId:'one'};
const r=resolveCardAttackTurn(input);assert.equal(r.strikes,2);assert.equal(r.presentation.groups.length,1);assert.equal(r.presentation.groups[0].amount,r.actualDamage);assert.equal(r.team[0].orbDropCharges,254);assert.equal(r.foes[1].hp,1000,'no overflow or target switch');assert.equal(r.outcome,null,'other enemies remain alive');
for(const n of [2,5]){const q=resolveCardAttackTurn({...input,action:'link',linkIds:team.slice(0,n).map(c=>c.id)});assert.equal(q.presentation.groups.length,n);assert.equal(q.presentation.groups.reduce((s,g)=>s+g.amount,0),q.actualDamage);assert(q.team.every(c=>c.orbDropCharges===256),'link does not consume stored energy charges');}
console.log(`PASS ${cases} sequential/batch equivalents: team, HP, shield, every hit/trigger, charges; target death stops, 256 charges retained, 1/2/5 presentation groups, no damage guessed`);
