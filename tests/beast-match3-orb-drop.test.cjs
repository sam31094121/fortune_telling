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
 assert.equal(JSON.stringify(input),before,'pure input');assert.equal(r.treasure.drops.length,Math.min(256,2**(n-9)));
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
 assert(d.durationMs<=D.DROP_MAX_MS);assert(d.points.at(-1).y===650,'trajectory reaches landing plane');
 assert(d.points.every(p=>p.x>=14&&p.x<=986),'wall collision preserves bounds');
 collisionCount+=d.impacts.length;
 if(d.ownerId){hits++;const c=catches.find(c=>c.ownerId===d.ownerId);assert(d.points.at(-1).x>=c.left+14&&d.points.at(-1).x<=c.right-14);}else misses++;
}
assert(hits>0&&misses>0&&collisionCount>0,'both real catches and misses occur');
const dead=team.map(u=>({...u,hp:0}));assert.deepEqual(D.dropCatches(dead),[]);
assert(D.simulateOrbDrops({count:48,element:'FIRE',seed:5,launchX:500,catches:[]}).every(d=>d.ownerId===null));
const one=D.dropCatches(dead.map((u,i)=>i===3?{...u,hp:1}:u));assert.equal(one.length,1);assert.equal(one[0].slot,3);assert.equal(one[0].left,140);
assert.deepEqual(D.dropCatches(dead.map((u,i)=>i===3?{...u,hp:1}:u),400)[0],{ownerId:dead[3].id,slot:3,left:300,right:700});
assert.throws(()=>D.dropCatches(dead,900));
const {resolveCardAttackTurn}=require('../lib/beast-game/match3/card-attack.ts');
const {counterPhase}=require('../lib/beast-game/match3/enemies.ts');
const charged=fixture(9);charged.team=charged.team.map((u,i)=>i?u:{...u,energy:100,orbDropCharges:1});
charged.foes=[{...charged.foes[0],hp:900,maxHp:1000,attack:30,attackEnergy:100,skillRuntime:{uses:{},initialized:{},lastEvents:{},shield:800,modifiers:[]}}];
const shot=resolveCardAttackTurn({...charged,action:'energy',attackerId:charged.team[0].id,eventId:'charged-energy',actionId:'charged-energy'});
assert(900-shot.foes[0].hp>=500,'at least half maximum HP after shield absorption');
assert.equal(shot.actualDamage,900-shot.foes[0].hp);assert.equal(shot.team[0].orbDropCharges,0);assert.equal(shot.team[0].energy,0);
assert.equal(shot.foes[0].orbDropCounterBlocked,true);
const stacked = resolveCardAttackTurn({...charged,team:charged.team.map((u,i)=>i?u:{...u,orbDropCharges:3}),action:'energy',attackerId:charged.team[0].id,eventId:'stacked',actionId:'stacked'});
assert.equal(stacked.team[0].orbDropCharges,1,'batch spends two original hits to finish this target, retains unused charge');
assert.equal(stacked.team[0].energy,100,'remaining caught orbs stay ready for the next manual click');
assert.equal(charged.team[0].orbDropCharges,1,'manual attack does not mutate its input');
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
const soloCatches=D.dropCatches(team.map((u,i)=>({...u,hp:i===2?100:0})));
assert.deepEqual(D.dropDividers(soloCatches),[{x:soloCatches[0].left,y:555},{x:soloCatches[0].right,y:555}]);
assert.equal(D.dropDividers(D.dropCatches(team.map((u,i)=>({...u,hp:i===1?0:100})))).length,2);
const split=D.simulateOrbDrops({count:2,element:'SPACE',seed:1004,launchX:4500/7,catches:allCatches});
// Radius now matches the visible sphere; the deterministic destinations change accordingly.
assert.equal(split[0].ownerId,team[2].id);assert.equal(split[1].ownerId,team[3].id);
for(const d of split){const c=allCatches.find(c=>c.ownerId===d.ownerId),last=d.points.at(-1);assert(last.x>=c.left+D.DROP_FIELD.radius&&last.x<=c.right-D.DROP_FIELD.radius);}
console.log('PASS living-card dividers, dead-slot gaps, and former centre-gap miss now physically caught');

// The visible sphere and triangle edge use the same physical radius.
for(let seed=1;seed<=300;seed++){
 const d=D.simulateOrbDrops({count:1,seed,element:'SPACE',launchX:500,catches:allCatches})[0];
 for(const p of d.points)for(const q of D.dropDividers(allCatches))for(const side of [-1,1]){
  const ex=side*48,ey=650-q.y,l=ex*ex+ey*ey;
  const t=Math.max(0,Math.min(1,((p.x-q.x)*ex+(p.y-q.y)*ey)/l));
  assert(Math.hypot(p.x-q.x-ex*t,p.y-q.y-ey*t)>=D.DROP_FIELD.radius-.2,'sphere penetrated divider edge');
 }
}
console.log('PASS 300 trajectories do not penetrate either triangle edge');
for(const width of [360,540,720])for(let seed=1;seed<=100;seed++){
 const catches=D.dropCatches(team.map((u,i)=>({...u,hp:i===2?100:0})),width);
 const ds=D.simulateOrbDrops({count:3,seed,element:'FIRE',launchX:seed%2?catches[0].left:catches[0].right,catches});
 for(const d of ds)for(const p of d.points)for(const q of D.dropDividers(catches))for(const side of [-1,1]){
  const ex=side*48,ey=650-q.y,l=ex*ex+ey*ey,t=Math.max(0,Math.min(1,((p.x-q.x)*ex+(p.y-q.y)*ey)/l));
  assert(Math.hypot(p.x-q.x-ex*t,p.y-q.y-ey*t)>=D.DROP_FIELD.radius-.2,'solo card corner was penetrated');
 }
}
console.log('PASS 900 balls respect both enlarged-card corner colliders');

let pairContacts=0;
for(const count of [2,3,12,48])for(let seed=1;seed<=5;seed++){
 const ds=D.simulateOrbDrops({count,seed,element:'SPACE',launchX:500,catches:allCatches}),frames=new Map();
 for(const d of ds){pairContacts+=(d.pairImpacts??[]).length;for(const p of d.points){if(p.y>=650)continue;const frame=Math.round((d.delayMs+p.t)/(1000/120*D.DROP_TIME_SCALE));const list=frames.get(frame)??[];for(const q of list)assert(Math.hypot(p.x-q.x,p.y-q.y)>=2*D.DROP_FIELD.radius-.2,'two sphere bodies overlap');list.push(p);frames.set(frame,list);}}
}
assert(pairContacts>0,'real pair collision impulses are recorded');
const ceremony=resolveOrbTurn(fixture(14));
assert.deepEqual(ceremony.treasure.drops.map(d=>d.source.c),Array.from({length:32},(_,i)=>[3,2,4,0,6][i%5]));
for(const d of ceremony.treasure.drops)assert.equal(d.element,ceremony.res.board[d.source.r][d.source.c]);
console.log('PASS shared-clock collisions for 2/3/12/48 balls, centre-out birth order and true source colours');

const aidedBirth=resolveOrbTurn({...fixture(14),comeback:{version:1,rescue:true,rallies:1,boostLeft:0,strikesLeft:5}});
for(const d of aidedBirth.treasure.drops)assert.equal(d.element,aidedBirth.res.board[d.source.r][d.source.c],'birth colour follows final assisted board');

// ===== 柏青哥釘陣鎖死規則（業主定案：每顆珠子一定撞到釘子，禁止直線掉下去，禁止重疊或穿越）=====
{
  const R=D.DROP_FIELD.radius,CONTACT=R+13,pegs=D.DROP_FIELD.pegs;
  // 1) 沒有任何一條垂直的縫：釘子 x 座標（含牆邊）相鄰間距必須小於珠子能擠過去的距離（2×CONTACT=98）
  const xs=[...new Set(pegs.map(p=>p.x))].sort((a,b)=>a-b);
  assert(xs[0]<=CONTACT-R+13&&xs.at(-1)>=1000-(CONTACT-R+13),'牆邊有貼牆釘');
  for(let i=1;i<xs.length;i++)assert(xs[i]-xs[i-1]<2*CONTACT,'垂直縫：x '+xs[i-1]+'→'+xs[i]+' 間距必須小於 98');
  assert(xs[0]-R<CONTACT&&1000-R-xs.at(-1)<CONTACT,'左右牆邊不留可直落的縫');
  // 2) 釘子彼此不重疊（同排間距不得小於珠子過不去又卡得住的 98，以免夾住珠子）
  for(let i=0;i<pegs.length;i++)for(let j=i+1;j<pegs.length;j++){const d=Math.hypot(pegs[i].x-pegs[j].x,pegs[i].y-pegs[j].y);assert(d>=26,'兩根釘子重疊');}
  // 3) 五個出發點（五張卡正上方），一次落 50 顆：每一顆都要撞釘子、不穿越、不重疊、不卡住
  const catches5=D.dropCatches([0,1,2,3,4].map(i=>({id:'k'+i,hp:10})));
  const order=[500,300,700,100,900];
  let balls=0,minHits=99;
  for(const seed of [1004,1,2,3,4,5,6,7]){
    const sources=Array.from({length:50},(_,i)=>({r:0,c:0,element:'FIRE',x:order[i%5]}));
    for(const d of D.simulateOrbDrops({count:50,element:'FIRE',seed,launchX:500,catches:catches5,sources})){
      balls++;assert.equal(d.points.at(-1).y,650,'珠子必須落到底，不得卡住');
      const hit=new Set();
      d.points.forEach((p,i)=>{pegs.forEach((g,k)=>{
        const dd=Math.hypot(p.x-g.x,p.y-g.y);
        assert(dd>=CONTACT-1.5,'珠子與釘子重疊');
        if(dd<=CONTACT+2)hit.add(k);
        if(i){const a=d.points[i-1],dx=p.x-a.x,dy=p.y-a.y,l=dx*dx+dy*dy;let t=l?((g.x-a.x)*dx+(g.y-a.y)*dy)/l:0;t=Math.max(0,Math.min(1,t));
          assert(Math.hypot(a.x+t*dx-g.x,a.y+t*dy-g.y)>=CONTACT-3,'珠子穿越釘子');}
      });});
      minHits=Math.min(minHits,hit.size);
      assert(hit.size>=3,'每顆珠子至少撞到 3 根釘子（不得直線掉下去）');
    }
  }
  assert(balls===400);
  console.log('PASS 釘陣鎖死：無垂直縫、400 顆（50×8 組）皆落底、每顆至少撞 3 根釘、無重疊無穿越，最少撞',minHits,'根');
}
{
  // 左右兩側不准有「貼著釘子直直滑下去」的窄道：x<130 或 x>870 區，橫向偏移 ≤18 的連續下滑不得超過 180
  const catchesE=D.dropCatches([0,1,2,3,4].map(i=>({id:'e'+i,hp:10}))),orderE=[500,300,700,100,900];
  let worst=0;
  for(const seed of [1004,1,2,3,4,5,6,7])for(const count of [17,50]){
    const sources=Array.from({length:count},(_,i)=>({r:0,c:0,element:'FIRE',x:orderE[i%5]}));
    for(const d of D.simulateOrbDrops({count,element:'FIRE',seed,launchX:500,catches:catchesE,sources})){
      const P=d.points;
      for(const inZone of [p=>p.x<130,p=>p.x>870]){
        let i=0;while(i<P.length){
          if(P[i].y<30||!inZone(P[i])){i++;continue;}
          let j=i;while(j+1<P.length&&P[j+1].y<560&&Math.abs(P[j+1].x-P[i].x)<=18&&P[j+1].y>=P[j].y-1)j++;
          worst=Math.max(worst,P[j].y-P[i].y);i=Math.max(j,i+1);
        }
      }
    }
  }
  assert(worst<=180,'左右兩側有直線滑落的窄道：'+Math.round(worst)+'px');
  console.log('PASS 左右兩側無直線窄道，最長貼釘滑落',Math.round(worst),'px');
}
{
  // 每一根釘子的位置都要有規則可驗：左右鏡像對稱、排距固定、最下排精準對準分隔尖端
  const pegs=D.DROP_FIELD.pegs,set=new Set(pegs.map(p=>p.x+','+p.y));
  for(const p of pegs)assert(set.has((1000-p.x)+','+p.y),'釘子左右必須鏡像對稱：'+p.x+','+p.y);
  const ys=[...new Set(pegs.map(p=>p.y))].sort((a,b)=>a-b);
  ys.slice(1).forEach((y,i)=>assert.equal(y-ys[i],65,'排距必須固定 65'));
  const bottom=pegs.filter(p=>p.y===ys.at(-1)).map(p=>p.x);
  for(const tip of [200,400,600,800])assert(bottom.includes(tip),'最下排必須正對分隔尖端 x='+tip);
  for(const y of ys){const xs=pegs.filter(p=>p.y===y&&p.x>100&&p.x<900).map(p=>p.x).sort((a,b)=>a-b);
    if(y===ys.at(-1))continue;
    xs.slice(1).forEach((x,i)=>assert.equal(x-xs[i],192,'內部間距必須固定 192（y='+y+'）'));}
  console.log('PASS 釘子位置規則：45 根左右鏡像、排距 65、內部間距 192、最下排對準分隔尖端');
}
{
  // 客戶情境：17 顆盾牌連線 → 後端算出 256 顆落珠（五個出發點），每一顆都要撞釘、落到底、不重疊
  const path17=[...[0,1,2,3,4,5,6].map(c=>({r:7,c})),...[6,5,4,3,2,1,0].map(c=>({r:6,c})),{r:5,c:0},{r:5,c:1},{r:5,c:2}];
  const pegs=D.DROP_FIELD.pegs,CONTACT=D.DROP_FIELD.radius+13;
  for(const seed of [1004,7,99]){
    const board=M.generateBoard(M.seededRng(15),8,7,true),magic=M.emptyMagic(board);
    path17.forEach(p=>{board[p.r][p.c]='SPACE';magic[p.r][p.c]=7;});
    const r=resolveOrbTurn({board,magic,path:path17,team,foes:team.map(u=>({...u,hp:10000,maxHp:10000,attack:0,attackEnergy:0})),mode:'hard45',wins:0,target:0,seed,move:0,chosen:{},rule:'all-attack',attackBoost:1,actionId:'real-17-'+seed,treasures:T.emptyTreasureBook()});
    const drops=r.treasure.drops;assert.equal(drops.length,256,'17 顆連線掉出 256 顆');
    assert.deepEqual([...new Set(drops.map(d=>Math.round(d.points[0].x)))].sort((a,b)=>a-b),[100,300,500,700,900],'從五張卡正上方五個位置出發');
    for(const d of drops){
      assert.equal(d.points.at(-1).y,650,'每顆都落到底');
      const hit=new Set();
      d.points.forEach(p=>pegs.forEach((g,k)=>{const dd=Math.hypot(p.x-g.x,p.y-g.y);assert(dd>=CONTACT-1.5,'重疊');if(dd<=CONTACT+2)hit.add(k);}));
      assert(hit.size>=3,'17 顆連線的每一顆珠子都至少撞到釘子（不得直接掉下去）');
    }
  }
  console.log('PASS 客戶情境：17 顆盾牌連線 → 256 顆、三組種子，每顆都撞釘、落到底、無重疊');
}
