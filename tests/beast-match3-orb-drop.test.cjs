const assert=require('node:assert/strict');
require('./guest-orb-fixture.cjs');
const M=require('../lib/beast-game/match3/index.ts');
const D=require('../lib/beast-game/match3/orb-drop.ts');
const T=require('../lib/beast-game/match3/treasures.ts');
const {resolveOrbTurn}=require('../lib/beast-game/match3/resolve-turn.ts');
const pool=require('../lib/beast-game/registry.ts').playableCards();
const elements=['SPACE','AIR','WATER','FIRE','EARTH'];
const team=elements.map(element=>{const c=pool.find(c=>c.element===element&&c.form==='ADULT');return {id:c.id,name:c.name,thumbnail:'',element,hp:25,maxHp:100,attack:1,energy:0,cd:1};});
function fixture(n,seed=1004){
 const board=M.generateBoard(M.seededRng(15),8,7,true),magic=M.emptyMagic(board);
 const path=[...[0,1,2,3,4,5,6].map(c=>({r:6,c})),...[6,5,4,3,2,1,0].map(c=>({r:7,c}))].slice(0,n);
 path.forEach(p=>{board[p.r][p.c]='SPACE';magic[p.r][p.c]=7;});
 return {board,magic,path,team,foes:team.map(u=>({...u,hp:10000,maxHp:10000,attack:0,attackEnergy:0})),mode:'hard45',wins:0,target:0,seed,move:0,chosen:{},rule:'all-attack',attackBoost:1,actionId:'drop-test-'+n,treasures:T.emptyTreasureBook()};
}
for(const n of [9,10,11,14]){
 const input=fixture(n),before=JSON.stringify(input),r=resolveOrbTurn(input);
 assert.equal(JSON.stringify(input),before,'pure input');assert.equal(r.treasure.drops.length,n-8);
 assert.deepEqual(r.treasure.drops,resolveOrbTurn(input).treasure.drops,'same authoritative seed replays exactly');
 const caught=r.treasure.drops.filter(d=>d.ownerId);
 assert.equal(r.treasure.catalog.reduce((s,c)=>s+c.count,0),caught.length,'only caught balls enter inventory');
 for(const drop of caught){const u=r.beforeCounter.team.find(u=>u.id===drop.ownerId);assert.equal(u.hp,u.maxHp);assert.equal(u.energy,100);}
 const repeated=T.grantTreasure({...input,treasures:r.treasure.book},r.res);
 assert.equal(repeated.drops.length,0);assert.deepEqual(repeated.book,r.treasure.book,'no duplicate grant or reroll');
}
assert.equal(resolveOrbTurn(fixture(8)).treasure.earned.variant,4,'eight shields retain fifth-tier grant');
for(const bad of ['mixed','ordinary','medium']){const input=fixture(9);if(bad==='mixed')input.board[6][0]='FIRE';if(bad==='ordinary')input.magic[6][0]=0;if(bad==='medium')input.mode='medium';assert.equal(resolveOrbTurn(input).treasure.drops.length,0);}
const catches=D.dropCatches(team);
let hits=0,misses=0,collisionCount=0;
for(let seed=0;seed<200;seed++){
 const d=D.simulateOrbDrops({count:1,element:'SPACE',seed,launchX:785,catches})[0];
 assert(d.points.every((p,i)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&(!i||p.t>d.points[i-1].t)));
 assert(d.durationMs<=9600);assert(d.points.at(-1).y===650,'trajectory reaches landing plane');
 assert(d.points.every(p=>p.x>=14&&p.x<=986),'wall collision preserves bounds');
 collisionCount+=d.impacts.length;
 if(d.ownerId){hits++;const c=catches.find(c=>c.ownerId===d.ownerId);assert(d.points.at(-1).x>=c.left+14&&d.points.at(-1).x<=c.right-14);}else misses++;
}
assert(hits>0&&misses>0&&collisionCount>0,'both real catches and misses occur');
const dead=team.map(u=>({...u,hp:0}));assert.deepEqual(D.dropCatches(dead),[]);
assert(D.simulateOrbDrops({count:48,element:'FIRE',seed:5,launchX:500,catches:[]}).every(d=>d.ownerId===null));
const one=D.dropCatches(dead.map((u,i)=>i===3?{...u,hp:1}:u));assert.equal(one.length,1);assert.equal(one[0].slot,3);assert.equal(one[0].left,450);
const {resolveCardAttackTurn}=require('../lib/beast-game/match3/card-attack.ts');
const {counterPhase}=require('../lib/beast-game/match3/enemies.ts');
const charged=fixture(9);charged.team=charged.team.map((u,i)=>i?u:{...u,energy:100,orbDropCharges:1});
charged.foes=[{...charged.foes[0],hp:900,maxHp:1000,attack:30,attackEnergy:100,skillRuntime:{uses:{},initialized:{},lastEvents:{},shield:800,modifiers:[]}}];
const shot=resolveCardAttackTurn({...charged,action:'energy',attackerId:charged.team[0].id,eventId:'charged-energy',actionId:'charged-energy'});
assert(900-shot.foes[0].hp>=500,'at least half maximum HP after shield absorption');
assert.equal(shot.actualDamage,900-shot.foes[0].hp);assert.equal(shot.team[0].orbDropCharges,0);assert.equal(shot.team[0].energy,0);
assert.equal(shot.foes[0].orbDropCounterBlocked,true);
const blocked=counterPhase(shot.team,shot.foes,4,undefined,false,1,{turnId:'blocked',energyGate:true});
assert(blocked.hits.length===1&&blocked.hits[0].actualDamage===0);assert.equal(blocked.foes[0].orbDropCounterBlocked,false);assert.equal(blocked.foes[0].attack,30);assert.equal(blocked.foes[0].attackEnergy,0);
const resumed=counterPhase(blocked.team,blocked.foes.map(f=>({...f,attackEnergy:100})),4,undefined,false,1,{turnId:'resumed',energyGate:true});
assert(resumed.hits.some(h=>h.actualDamage>0),'only next counter is blocked');
assert.throws(()=>resolveCardAttackTurn({...charged,team:shot.team,foes:shot.foes,action:'energy',attackerId:charged.team[0].id,eventId:'charged-energy',actionId:'again'}));
const low=resolveCardAttackTurn({...charged,foes:charged.foes.map(f=>({...f,hp:100})),action:'energy',attackerId:charged.team[0].id,eventId:'low-hp',actionId:'low-hp'});
assert.equal(low.foes[0].hp,0);assert.equal(low.actualDamage,100,'overkill never counted');
const {comebackBoard}=require('../lib/beast-game/match3/comeback-board.ts');
const ordinary=fixture(3),allNormal=M.emptyMagic(ordinary.board);
const aided=comebackBoard(ordinary.board,allNormal,'WATER',7);
assert(aided&&aided.path.length===7);assert(M.isValidPath(aided.board,aided.path,true,allNormal,true));
assert(aided.path.every(p=>aided.board[p.r][p.c]==='WATER'));
assert.equal(comebackBoard(ordinary.board,allNormal.map(row=>row.map(()=>7)),'WATER',7),null,'no special bead replacement');
const rescueInput={...ordinary,magic:allNormal,comeback:{version:1,rescue:true,rallies:1,boostLeft:0,strikesLeft:5}};
const rescueTurn=resolveOrbTurn(rescueInput),plainTurn=resolveOrbTurn({...rescueInput,comeback:{...rescueInput.comeback,rescue:false,strikesLeft:0}});
assert.equal(rescueTurn.endDamage,plainTurn.endDamage,'board assistance never adds damage');assert.deepEqual(rescueTurn.counter.foes,plainTurn.counter.foes);
assert(rescueTurn.comeback.strikesLeft===4);assert(rescueTurn.replay.some(f=>f.kind==='shuffle'),'visible board assistance replay');
console.log('PASS nine/ten/eleven shields, legacy eight, real catches/misses, deterministic paths, healing/energy, no duplicate grants; 200 physics seeds');

// Regression: the formerly missed first ball must bounce into a living card.
const allCatches=D.dropCatches(team);
assert.equal(D.dropDividers(allCatches).length,4);
assert.equal(D.dropDividers(D.dropCatches(team.map((u,i)=>({...u,hp:i===2?100:0})))).length,0);
assert.equal(D.dropDividers(D.dropCatches(team.map((u,i)=>({...u,hp:i===1?0:100})))).length,2);
const split=D.simulateOrbDrops({count:2,element:'SPACE',seed:1004,launchX:4500/7,catches:allCatches});
assert.equal(split[0].ownerId,team[1].id);assert.equal(split[1].ownerId,team[4].id);
for(const d of split){const c=allCatches.find(c=>c.ownerId===d.ownerId),last=d.points.at(-1);assert(last.x>=c.left+D.DROP_FIELD.radius&&last.x<=c.right-D.DROP_FIELD.radius);}
console.log('PASS living-card dividers, dead-slot gaps, and former centre-gap miss now physically caught');
