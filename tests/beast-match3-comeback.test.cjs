const assert=require('node:assert/strict');
require('./guest-orb-fixture.cjs');
const C=require('../lib/beast-game/match3/comeback.ts');
const T=require('../lib/beast-game/match3/treasures.ts');
const {resolveOrbTurn}=require('../lib/beast-game/match3/resolve-turn.ts');
const {ELEMENTS}=require('../lib/beast-game/elements.ts');
const cards=require('../lib/beast-game/registry.ts').playableCards();
function fixture(element='FIRE'){
 const team=cards.filter(c=>c.element===element).slice(0,5).map((c,i)=>({id:c.id,name:c.name,thumbnail:'',element,hp:i===0?0:400,maxHp:1000,attack:1,energy:0}));
 return {team,foes:[{...team[1],id:'foe',hp:1000,maxHp:1000,attack:0,cd:1,skillRuntime:{shield:5000}}],board:Array.from({length:8},(_,r)=>Array.from({length:7},(_,c)=>ELEMENTS[(r+c)%5])),magic:Array.from({length:8},()=>Array(7).fill(0)),path:[],mode:'hard45',wins:0,seed:71,move:0,chosen:{},rule:'all-attack',attackBoost:1,target:0,actionId:'rare',comeback:C.initialComeback(0),treasures:{...T.emptyTreasureBook(),variants:{[element+':4']:1}}};
}
for(const e of ELEMENTS){
 const input=fixture(e), before=JSON.stringify(input),r=T.resolveTreasureUse(input,e,4);
 assert.equal(JSON.stringify(input),before,'input immutable');
 assert.equal(r.effect.damage,500,'half max HP actually removed despite shield');
 assert.equal(r.foes[0].hp,500);assert.equal(r.team[0].hp,0,'dead stays dead');
 assert(r.team.slice(1).every(u=>u.hp===900),'half-max healing');
 assert.equal(r.effect.healing.reduce((n,h)=>n+h.actual,0),2000);
 assert.equal(T.treasureCount(r.book,e,4),0);
 assert.throws(()=>T.resolveTreasureUse({...input,treasures:r.book},e,4),'cannot reuse spent inventory');
 const low=T.resolveTreasureUse({...input,foes:[{...input.foes[0],hp:99}],team:input.team.map(u=>u.hp?{...u,hp:950}:u)},e,4);
 assert.equal(low.effect.damage,99);assert.equal(low.foes[0].hp,0);assert(low.team.slice(1).every(u=>u.hp===1000));
 const strong=T.resolveTreasureUse({...input,team:input.team.map(u=>({...u,attack:100000})),foes:[{...input.foes[0],skillRuntime:undefined}]},e,4);
 assert.equal(strong.effect.damage,1000,'strong attack not double counted');
 const legacy=T.resolveTreasureUse({...input,comeback:undefined},e,4);
 assert.deepEqual(legacy.team,input.team,'legacy battle not retroactively healed');
}
let p=fixture();p.team=p.team.map(u=>({...u,hp:300}));
let r=C.finishComeback(p.team,p.foes,p.comeback,false);
assert(r.team.every(u=>u.hp===650));assert.equal(r.state.boostLeft,3);
for(let i=0;i<3;i++)r=C.finishComeback(r.team,p.foes,r.state,true);
assert.equal(r.state.boostLeft,0);assert.equal(r.state.rallies,1);
assert(C.finishComeback(p.team.map(u=>({...u,hp:301})),p.foes,p.comeback,false).facts.length===0);
assert(C.finishComeback(p.team.map(u=>({...u,hp:0})),p.foes,p.comeback,false).team.every(u=>u.hp===0));
assert.equal(C.finishComeback(p.team,p.foes.map(u=>({...u,hp:0})),p.comeback,false).facts.length,0);
let record=C.nextComebackRecord(0,undefined,'lose');assert(!C.initialComeback(0,record).rescue);
record=C.nextComebackRecord(0,record,'lose');let state=C.initialComeback(0,record);assert(state.rescue);
assert(!C.initialComeback(1,record).rescue);assert.deepEqual(C.nextComebackRecord(0,record,'win'),{wins:1,losses:0});
let strike=C.rescueStrike(p.foes,state,0,0,true);assert.equal(strike.damage,1000);assert.equal(strike.facts[0].shieldAbsorbed,5000);assert.equal(strike.state.strikesLeft,4);
assert.equal(C.rescueStrike(p.foes,state,0,0,false).state.strikesLeft,5);
p.team=p.team.map(u=>({...u,hp:1}));const invalid=resolveOrbTurn(p);assert.deepEqual(invalid.counter.team,p.team);assert.equal(invalid.comeback.rallies,0);
const formed=fixture();formed.board[0].fill('FIRE');formed.path=Array.from({length:7},(_,c)=>({r:0,c}));
const formation=resolveOrbTurn(formed);assert(formation.res.valid);assert.equal(formation.heals.filter(h=>h.reason==='formation').length,4);assert(formation.heals.filter(h=>h.reason==='formation').every(h=>h.actual===100));assert.equal(formation.counter.team[0].hp,0);
const conversion=structuredClone(formed);conversion.path=Array.from({length:4},(_,c)=>({r:0,c}));conversion.magic[0].fill(7,0,4);
assert.equal(resolveOrbTurn(conversion).heals.filter(h=>h.reason==='formation').length,0,'existing shield fusion is not new formation healing');
console.log('PASS comeback: all five rare elements, actual half-max HP through shields, half-max heal/cap/dead, overkill, inventory, legacy, threshold, once, duration, losses, rescue and invalid gestures');
