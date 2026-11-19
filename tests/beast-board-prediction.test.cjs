const assert = require('node:assert/strict');
require('./guest-orb-fixture.cjs');
const { predictOrbBoard, predictionMatches } = require('../lib/beast-game/match3/board-prediction.ts');
const { resolveOrbTurn } = require('../lib/beast-game/match3/resolve-turn.ts');
const M = require('../lib/beast-game/match3/index.ts');
const cards = require('../lib/beast-game/registry.ts').playableCards().slice(0,5);
const team = cards.map(c=>({id:c.id,name:c.name,thumbnail:'',element:c.element,hp:100,maxHp:100,attack:1,energy:0,cd:2}));
for(let seed=1;seed<=100;seed++) {
  const board=M.generateBoard(M.seededRng(seed),8,7,true), magic=M.emptyMagic(board);
  const path=Array.from({length:3+seed%5},(_,c)=>({r:7,c}));
  path.forEach(p=>board[p.r][p.c]='WATER');
  const original=JSON.stringify({board,magic,team});
  const prediction=predictOrbBoard(board,magic,path,seed,true,3);
  const server=resolveOrbTurn({board,magic,path,seed,team,foes:team.map(c=>({...c,hp:10000,maxHp:10000,attack:0})),mode:'hard45',wins:0,target:0,move:0,chosen:{},rule:'all-attack',attackBoost:1});
  assert(predictionMatches(prediction,server.replay),'same game rules must produce the server board');
  assert.equal(JSON.stringify({board,magic,team}),original,'prediction cannot mutate authoritative input');
  const changed=structuredClone(server.replay);
  changed[0].boardBefore[0][0]=changed[0].boardBefore[0][0]==='FIRE'?'WATER':'FIRE';
  assert(!predictionMatches(prediction,changed),'a divergent server board must trigger reconciliation');
}
console.log('PASS 100 board predictions, authority divergence and input isolation');
