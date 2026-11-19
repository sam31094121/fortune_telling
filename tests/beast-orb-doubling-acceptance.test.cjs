/** User-approved doubling contract. Exercises actual server rewards, not a formula mock. */
const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const { performance } = require('node:perf_hooks');
require('./guest-orb-fixture.cjs');
const M = require('../lib/beast-game/match3/index.ts');
const { grantTreasure, emptyTreasureBook } = require('../lib/beast-game/match3/treasures.ts');
const pool = require('../lib/beast-game/registry.ts').playableCards();
const team = ['SPACE','AIR','WATER','FIRE','EARTH'].map(element => {
  const c = pool.find(c => c.element === element && c.form === 'ADULT');
  return {id:c.id,name:c.name,thumbnail:'',element,hp:25,maxHp:100,attack:1,energy:0,cd:1};
});
const rows = [];
for (const shields of [9,10,11,12,13,14,15,16,17,18,56]) {
  const board = M.generateBoard(M.seededRng(15),8,7,true), magic = M.emptyMagic(board);
  const path = Array.from({length:8},(_,r) => Array.from({length:7},(_,i) => ({r,c:r%2 ? 6-i : i}))).flat().slice(0,shields);
  path.forEach(p => {board[p.r][p.c]='SPACE';magic[p.r][p.c]=7;});
  const input = {board,magic,path,team,foes:team.map(u=>({...u,hp:10000,maxHp:10000,attack:0,attackEnergy:0})),mode:'hard45',wins:0,target:0,seed:1004,move:0,chosen:{},rule:'all-attack',attackBoost:1,actionId:'doubling-acceptance-'+shields,treasures:emptyTreasureBook()};
  const res = M.resolveDrag(board,path,M.seededRng(1004),magic,50,true,true,3);
  assert(res.valid,'fixture must be a valid real shield connection');
  const started = performance.now();
  const reward = grantTreasure(input,res);
  const expected = Math.min(256, 2 ** (shields-9)), actual = reward.drops.length;
  const caught = reward.drops.filter(d=>d.ownerId).length;
  for(let i=7;i<reward.drops.length;i+=7){
    const released=reward.drops[i].delayMs;
    for(const prior of reward.drops.slice(i-7,i)){
      if(prior.delayMs+prior.durationMs<=released)continue;
      const point=prior.points.findLast(p=>prior.delayMs+p.t<=released);
      assert(point && point.y-36>=275-.1,'next wave must wait until entire prior wave clears third row');
    }
  }
  const credited = reward.catalog.reduce((sum,c)=>sum+c.count,0);
  if(shields===17){
    const frames = new Map();
    for(const drop of reward.drops)for(const point of drop.points){
      if(point.y>=650)continue;
      const time=Math.round((drop.delayMs+point.t)/(1000/120*1.6));
      const frame=frames.get(time)??[];
      for(const other of frame)assert(Math.hypot(point.x-other.x,point.y-other.y)>=71.8,'256-ball simulation must keep sphere bodies separated');
      frame.push(point);frames.set(time,frame);
    }
  }
  assert.equal(credited,caught,'misses must not earn rewards');
  const retry = grantTreasure({...input,treasures:reward.book},res);
  assert.equal(retry.drops.length,0,'retries cannot issue a second batch');
  rows.push({shields,expected,actual,caught,credited,duplicatePrevented:true,waveGatePassed:true,passed:actual===expected,elapsedMs:Math.round(performance.now()-started),payloadBytes:Buffer.byteLength(JSON.stringify(reward)),playbackSeconds:Math.ceil(Math.max(...reward.drops.map(d=>d.delayMs+d.durationMs))*1.2/1000)});
}
const result = {scope:'actual server doubling reward count; visual and persistent wave playback not certified',passed:rows.every(r=>r.passed),rows};
mkdirSync('reports/beast-game/orb-doubling-2026-11-19',{recursive:true});
writeFileSync('reports/beast-game/orb-doubling-2026-11-19/acceptance.json',JSON.stringify(result,null,2)+'\n');
console.table(rows);
assert(result.passed,'doubling acceptance failed: actual server still differs from approved counts');
