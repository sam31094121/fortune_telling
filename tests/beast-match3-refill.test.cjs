const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const M = require('../.beast-game-build/lib/beast-game/match3');
const { refillPresentation, refillLandingTimes, fusionShieldLayout } = require('../.beast-game-build/lib/beast-game/match3/refill-presentation');
for (const count of [3, 4, 5, 8, 56]) {
  const layout=fusionShieldLayout(count);
  assert.equal(layout.length,count);assert.equal(layout.filter(p=>p.primary).length,1);
  for(const p of layout){assert(Math.abs(p.x)*p.size/100+p.size/2<=50);assert(Math.abs(p.y)*p.size/100+p.size/2<=50);assert.equal(p.size*p.scale,52);}
}
assert.deepEqual(refillLandingTimes([{r:1,c:0,fromRow:0,delayMs:0,durationMs:0}]),[],'no falling motion means no landing cue');
const landings=refillLandingTimes(Array.from({length:56},(_,i)=>({r:7,c:i%7,fromRow:-1,delayMs:i*12,durationMs:400})));
assert(landings.every((t,i)=>i===0||t-landings[i-1]>=140));assert(landings.length<=5,'56 beads produce bounded landing pulses');
// Published legacy-mode outputs remain frozen; hard rewards are explicitly upgraded.
const baseline = {
  three: '45bbbf3dd3d2b00d5072c0296e395e2631e77f4c191e90d198169ea17270bf72',
  four: 'bb76518daa21104bedde8780a2cbc7130930456de019b66c4a08589515ba39e4',
  seven: '9367bb5f0d50f287e69d4f473419161c155b1ae1ea017a7b5846b4b6299d8388',
  shield: '548104da0280cf01bc696cd396fa77d6e47e7b984abc6f5d517c79e6b7e5ff99',
  fusion: '9cd54075701a8ef3cf2dcdd684d753009f21adf9b1ec0fcb56aa3ea4a5a279e6',
};
for (const kind of Object.keys(baseline)) {
  const b = Array.from({length:7},(_,r)=>Array.from({length:7},(_,c)=>M.MATCH3_ORB_ELEMENTS[(r*2+c)%5]));
  b[6] = Array(7).fill('FIRE'); const magic = M.emptyMagic(b);
  const n = kind === 'four' ? 4 : kind === 'seven' ? 7 : 3;
  if (kind === 'shield') magic[6][0] = 7;
  if (kind === 'fusion') { b[6][1]='WATER'; b[6][2]='AIR'; magic[6][0]=magic[6][1]=magic[6][2]=7; }
  const path = Array.from({length:n},(_,c)=>({r:6,c}));
  const result = M.resolveDrag(b,path,M.seededRng(91),magic,50,true,true,3);
  const legacy=M.resolveDrag(b,path,M.seededRng(91),magic,50,false,false,3);
  assert.equal(createHash('sha256').update(JSON.stringify(legacy)).digest('hex'), baseline[kind], 'legacy RNG, boards, magic, damage and rewards stay unchanged');
  let before = b, previousEmpty=new Set();
  for (const step of result.steps) {
    const removed = new Set(step.clearedCells.map(p=>p.r*1000+p.c));
    assert.equal(new Set(step.falls.map(p=>p.r*1000+p.c)).size,step.falls.length);
    assert.equal(step.falls.filter(p=>p.fromRow<0).length+(step.emptyCells?.length??0),previousEmpty.size+removed.size,'all cleared slots become explicit holes or replenished beads');
    for (const fall of step.falls) {
      assert(fall.fromRow<fall.r,'gravity only moves downward');
      if (fall.fromRow>=0) { assert(!removed.has(fall.fromRow*1000+fall.c));assert(!previousEmpty.has(fall.fromRow*1000+fall.c)); assert.equal(step.boardAfter[fall.r][fall.c],before[fall.fromRow][fall.c]); }
    }
    for(const reward of step.rewards??[]) assert.equal(step.magicAfter[reward.r][reward.c],reward.power);
    before = step.boardAfter;previousEmpty=new Set((step.emptyCells??[]).map(p=>p.r*1000+p.c));
  }
  if (kind==='four'||kind==='seven') assert(!result.steps[0].clearedCells.some(p=>p.r===6&&p.c===n-1),'retained reward must not flash away');
  const timeline = refillPresentation(result.steps);
  timeline.frames.forEach((frame,i)=> {
    assert(frame.fallAt>=frame.clearAt);
    if(i) assert.equal(frame.clearAt,timeline.frames[i-1].endAt);
    assert.equal(new Set(frame.motions.map(m=>m.delayMs)).size,frame.motions.length,'each falling orb has its own start');
    for(const motion of frame.motions) assert(frame.fallAt+motion.delayMs+motion.durationMs<=frame.endAt+1e-7);
  });
  assert(timeline.durationMs<=5000);
  const reduced=refillPresentation(result.steps,true);assert(reduced.frames.every(f=>f.motions.every(m=>m.delayMs===0&&m.durationMs===0)));
  const simple=M.resolveDrag(b,path,M.seededRng(91),magic,1,false,false,3);
  assert(simple.steps.every(s=>!('falls'in s)&&!('clearedCells'in s)),'legacy contract unchanged');
}
const heavy=refillPresentation(Array.from({length:50},()=>({falls:Array.from({length:49},(_,i)=>({r:Math.floor(i/7),c:i%7,fromRow:Math.floor(i/7)-7}))})));
assert(heavy.durationMs<=5000.000001,'many cascades must not lock the player out for a minute');
console.log('PASS refill provenance, unchanged legacy outcomes, sparse reward conservation, stagger, reduced motion and bounded wait');

function fusionFixture(seed) {
  const board=M.generateBoard(M.seededRng(seed),7,7,true),magic=M.emptyMagic(board);
  board[0].splice(0,3,'AIR','FIRE','SPACE');magic[0].splice(0,3,7,7,7);
  return {board,magic,path:[{r:0,c:0},{r:0,c:1},{r:0,c:2}]};
}
// Known survivor layout: WATER four -> stored four -> two ordinary WATER -> stored six.
{
  const {board,magic,path}=fusionFixture(229);
  const result=M.resolveDrag(board,path,M.seededRng(1229),magic,50,true,true,8);
  const firstRefill=result.steps.findIndex(s=>s.groups.length===0);
  assert.equal(firstRefill,3,'all survivor consolidations happen before new colors refill');
  assert.deepEqual(result.steps[1].rewards,[{r:6,c:4,element:'WATER',power:4}]);
  assert.deepEqual(result.steps[2].rewards,[{r:6,c:6,element:'WATER',power:6}]);
  assert.equal(result.steps[2].groups[0].size,3,'stored four plus two physical beads keeps its accumulated six');
  assert(result.steps[1].groups.some(g=>g.element==='EARTH'&&g.size===3));
  assert(!result.steps[1].rewards.some(r=>r.element==='EARTH'),'three ordinary beads disappear without a number');
  for(const step of result.steps.slice(0,firstRefill)) {
    assert(!step.falls.some(f=>f.fromRow<0),'no random refill mixed into survivor reward stages');
    const empty=new Set(step.emptyCells.map(p=>p.r*1000+p.c));
    step.boardAfter.forEach((row,r)=>row.forEach((e,c)=>{if(!empty.has(r*1000+c))assert(['WATER','EARTH'].includes(e))}));
  }
  const gains=M.energyGains({...result,steps:result.steps.slice(0,3)});
  assert.deepEqual(gains,[{element:'AIR',gain:90,fill:false},{element:'FIRE',gain:130,fill:false},{element:'SPACE',gain:90,fill:false},{element:'WATER',gain:50,fill:false},{element:'EARTH',gain:30,fill:false}]);
  assert.equal(M.applyEnergy(0,gains[1]),100,'existing skill bar cap');
  assert.equal(M.applyEnergy(35,gains[3]),85,'survivor retained cells are not charged twice');
  const duplicate={...result,steps:[{...result.steps[0],groups:[...result.steps[0].groups,...result.steps[0].groups]}]};
  assert.deepEqual(M.energyGains(duplicate),gains.slice(0,3),'shared cells only charge once per stage');
  assert(result.steps.every(s=>s.attackAllowed===false&&s.groups.every(g=>g.power===0)));
  assert.equal(result.cascadeCount,result.steps.filter(s=>s.groups.length).length,'refill frames do not inflate combo count');
  const events=M.buildEvents(result.steps,[],{magicSpawn:result.magicSpawn,energy:gains});
  assert.equal(events.filter(e=>e.type==='magicOrbSpawn').length,result.steps.reduce((n,s)=>n+s.rewards.length,0));
  assert(!events.some(e=>e.type==='magicOrbCandidate'),'real rewards are reported as real spawns');
  assert(events.some(e=>e.type==='magicOrbSpawn'&&e.power===4)&&events.some(e=>e.type==='magicOrbSpawn'&&e.power===6));
}
{
  const {board,magic,path}=fusionFixture(1);
  const result=M.resolveDrag(board,path,M.seededRng(1001),magic,50,true,true,8);
  const index=result.steps.findIndex(s=>s.rewards.some(r=>r.power>=7));assert(index>=0);
  let reward={...result.steps[index].rewards.find(r=>r.power>=7)};
  for(const step of result.steps.slice(index+1)) {
    assert(!step.clearedCells.some(p=>p.r===reward.r&&p.c===reward.c),'earned shield cannot be auto-consumed');
    const fall=step.falls.find(p=>p.fromRow===reward.r&&p.c===reward.c);
    if(fall)reward.r=fall.r;
    assert.equal(step.magicAfter[reward.r][reward.c],reward.power);
  }
  assert.equal(result.magic[reward.r][reward.c],reward.power,'shield remains usable after refill/reshuffle');
  const limited=M.resolveDrag(board,path,M.seededRng(1001),magic,1,true,true,8);
  assert.equal(limited.cascadeCount,1);assert.equal(limited.steps.at(-1).emptyCells.length,0,'safety cap still refills all49 slots');
}
assert.equal(M.findGroups([['WATER','WATER','WATER','WATER']],false,new Set([1])).length,0,'a hole cannot bridge a natural match');
{
  const board=M.generateBoard(M.seededRng(3),7,7,true);board[6].fill('FIRE');
  const result=M.resolveDrag(board,Array.from({length:4},(_,c)=>({r:6,c})),M.seededRng(4),M.emptyMagic(board),1,true,true,3);
  assert.deepEqual(M.energyGains(result),[{element:'FIRE',gain:40,fill:false}],'ordinary manual four preserves existing energy even though it retains one number');
}
console.log('PASS multi-color fusion, survivor 4→6 accumulation, real rewards, shield retention, actual capped energy and sparse-match boundaries');

// Approved official hard board: 7 columns × 8 rows, same fusion rules.
{
  const board=M.generateBoard(M.seededRng(49),8,7,true),magic=M.emptyMagic(board);
  board[0].splice(0,3,'AIR','FIRE','SPACE');magic[0].splice(0,3,7,7,7);
  const result=M.resolveDrag(board,[{r:0,c:0},{r:0,c:1},{r:0,c:2}],M.seededRng(1049),magic,50,true,true,8);
  assert.equal(result.steps.findIndex(s=>s.groups.length===0),3,'56-orb survivors finish merging before refill');
  assert(result.steps[1].rewards.some(r=>r.element==='WATER'&&r.power===4&&r.r===7&&r.c===2));
  assert.deepEqual(result.steps[2].rewards,[{r:7,c:4,element:'WATER',power:6}]);
  assert.equal(result.board.length,8);assert(result.board.every(row=>row.length===7));
  assert.equal(result.magic.length,8);assert(result.magic.every(row=>row.length===7));
  assert.equal(result.steps.at(-1).emptyCells.length,0);
  assert(result.steps.every(s=>s.attackAllowed===false));
  assert(result.steps.slice(0,3).every(s=>s.falls.every(f=>f.fromRow>=0)));
  console.log('beast-match3-refill: official 56-orb fusion retained 4 to 6 passed');
}
