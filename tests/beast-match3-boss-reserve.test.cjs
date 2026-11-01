const assert=require('node:assert/strict');
const M=require('../.beast-game-build/lib/beast-game/match3');
const pool=require('../.beast-game-build/lib/beast-game/registry').playableCards();
const adults=pool.filter(c=>c.form==='ADULT').slice(0,4);
const guardian=pool.find(c=>c.id==='beast_g_xuanwu');
const make=c=>({...M.makeFoe(c.id,c.element),attack:20,cd:1});
const foes=[...adults,guardian].map(make);
const team=pool.filter(c=>c.form==='YOUNG').slice(0,5).map(c=>({id:c.id,element:c.element,hp:200,maxHp:200,attack:20,energy:0}));
for(const stage of [8,9,10,11,12,30]) {
  for(let escort=0;escort<4;escort++) {
    const f=foes.map((f,i)=>({...f,hp:i===escort||i===4?f.hp:0}));
    const before=JSON.stringify(f),ready=M.initializeAvailableFoes(f,stage);
    assert.equal(ready[4].skillRuntime,undefined);
    assert.equal(M.foeAvailable(f,4,stage),false);
    assert.equal(M.availableFoeTarget(f,4,stage),escort);
    for(const index of [4,-1,99,NaN]) {
      const hit=M.damageFoeWithSkills(f,index,9999,stage,'blocked',team,team[0].id);
      assert.equal(hit.actualDamage,0);assert.deepEqual(hit.foes,f);assert.deepEqual(hit.skillEvents,[]);
    }
    const counter=M.counterPhase(team,f,1,0,false,stage,{turnId:'wait'});
    assert(counter.hits.every(h=>h.enemy!==4));assert.equal(counter.foes[4].skillRuntime,undefined);
    assert(!counter.skillEvents.some(e=>e.sourceId===guardian.id));
    assert.equal(JSON.stringify(f),before);
    const killed=M.damageFoeWithSkills(f,escort,9999,stage,'last-escort',team,team[0].id);
    assert(M.foeAvailable(killed.foes,4,stage));
    const unlocked=M.initializeAvailableFoes(killed.foes,stage);
    assert(unlocked[4].skillRuntime.shield>0,'original Xuanwu summon shield starts only now');
    assert.deepEqual(M.initializeAvailableFoes(unlocked,stage),unlocked,'summon must not double-stack');
    const active=M.counterPhase(team,unlocked,1,0,false,stage,{turnId:'active'});
    assert(active.hits.some(h=>h.enemy===4));
    const dead=unlocked.map(f=>({...f,hp:0}));
    assert.equal(M.availableFoeTarget(dead,4,stage),-1);
    assert.equal(M.counterPhase(team,dead,1,0,false,stage).hits.length,0);
  }
}
for(const stage of [0,1,7])assert(M.foeAvailable(foes,4,stage),'legacy and early stages unchanged');
assert(M.foeAvailable(foes.slice(1),3,12),'other four-card lineup unchanged');
console.log('PASS reserved boss: locked target/counter/initialization, original summon once after escort defeat, dead/invalid guards, early/legacy unchanged');
