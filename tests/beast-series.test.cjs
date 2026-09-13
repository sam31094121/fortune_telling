const assert = require('node:assert/strict');
const core = require('../.beast-game-build/lib/beast-game');
const ids = core.playableCards().map((card) => card.id);
let firstWins = 0;
let secondWins = 0;
let draws = 0;
for (let seed = 0; seed < 1000; seed++) {
  const rng = core.createRng(seed);
  const player = core.buildLineup(ids, rng);
  const opponent = core.buildLineup(ids, rng);
  const before = JSON.stringify([player, opponent]);
  const result = core.playSeries(player, opponent, seed);
  assert.equal(JSON.stringify([player, opponent]), before);
  assert.deepEqual(result, core.playSeries(player, opponent, seed));
  assert.equal(result.pairs.length, 3, '即使二比零也演完第三組');
  let p = 0, o = 0;
  result.pairs.forEach((pair, index) => {
    assert.equal(pair.playerId, player[index]);
    assert.equal(pair.opponentId, opponent[index]);
    assert.ok(pair.actions.length <= 100);
    if (pair.winner === 'PLAYER') { p++; assert.equal(pair.hp.opponent, 0); }
    if (pair.winner === 'OPPONENT') { o++; assert.equal(pair.hp.player, 0); }
    assert.deepEqual(pair.score, { player: p, opponent: o });
  });
  assert.equal(result.winner, p === o ? 'DRAW' : p > o ? 'PLAYER' : 'OPPONENT');
  if (result.winner === 'PLAYER') firstWins++;
  else if (result.winner === 'OPPONENT') secondWins++;
  else draws++;
  if (seed < 20) {
    const swapped = core.playSeries(opponent, player, seed);
    assert.equal(swapped.pairs.length, 3);
  }
}
assert.throws(() => core.playSeries([ids[0], ids[0], ids[0]], ids.slice(0, 3), 1));
let fusionCase = null;
for(let seed=0;seed<1000&&!fusionCase;seed++){
 const rng=core.createRng(seed),lineup=core.buildLineup(ids,rng),opponent=core.buildLineup(ids,rng);
 const slot=[0,1].find(index=>core.seriesFusionMaterial(lineup,index));
 if(slot===undefined)continue;
 const result=core.playSeries(lineup,opponent,seed,{player:slot,opponent:null});
 if(result.pairs.flatMap(pair=>pair.actions).some(action=>action.side==='PLAYER'&&action.fusion))fusionCase={lineup,opponent,seed,slot,result};
}
assert.ok(fusionCase,'應找到能由本次布陣相生卡觸發的合體');
const fusionActions=fusionCase.result.pairs.flatMap(pair=>pair.actions).filter(action=>action.side==='PLAYER'&&action.fusion);
assert.equal(fusionActions.length,1,'每場最多一次真實合體出招');
assert.ok(fusionActions[0].note.includes('暴怒合體'));
assert.deepEqual(fusionCase.result,core.playSeries(fusionCase.lineup,fusionCase.opponent,fusionCase.seed,{player:fusionCase.slot,opponent:null}));
assert.throws(()=>core.playSeries(fusionCase.lineup,fusionCase.opponent,fusionCase.seed,{player:2,opponent:null}));
assert.equal(core.seriesFusionMaterial(fusionCase.lineup,2),null,'已無未上場相生卡，不可合體');
console.log('PASS: 單卡競技明確選擇相生合體、核心真實出招、每場一次、非法席位拒絕、重播一致');
console.log('PASS: 三局配對、累積比分、二比零仍打第三局、重播一致、陣容驗證', { games: 1000, firstWins, secondWins, draws });
