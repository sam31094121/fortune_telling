const assert = require('node:assert/strict');
const core = require('../.beast-game-build/lib/beast-game');
(async () => {
  const ids = core.playableCards().map((card) => card.id);
  const lineup = core.buildLineup(ids, core.createRng(1));
  const response = await fetch('http://localhost:8888/api/beast-game', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lineup, replaySeed: 1, stake: ids[0] }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.isReplay, true);
  assert.equal(result.series.pairs.length, 3);
  assert.equal(result.timeline.length,result.series.pairs.reduce((count,pair)=>count+pair.actions.length,0),'戰報必須包含真實交鋒');
  assert.deepEqual(result.series, core.playSeries(lineup, result.opponentLineupIds, 1, result.fusion));
  assert.equal(result.winner, result.series.winner);
  assert.equal(result.stake.verdict, result.winner === 'PLAYER' ? 'WON' : result.winner === 'OPPONENT' ? 'LOST' : 'RETURNED');
  const fusionSlot=[0,1].find(index=>core.seriesFusionMaterial(lineup,index));
  assert.notEqual(fusionSlot,undefined,'測試陣容必須有相生席位');
  if(fusionSlot!==undefined){
    const fusedResponse=await fetch('http://localhost:8888/api/beast-game',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({lineup,replaySeed:1,stake:ids[0],fusionSlot}),
    });
    assert.equal(fusedResponse.status,200);
    const fused=await fusedResponse.json();
    assert.equal(fused.fusion.player,fusionSlot);
    assert.deepEqual(fused.series,core.playSeries(lineup,fused.opponentLineupIds,1,fused.fusion));
    assert.ok(fused.timeline.some(entry=>entry.note.includes('暴怒合體')),'合體須能從前端戰報核對');
    assert.ok(fused.series.pairs.flatMap(pair=>pair.actions).filter(action=>action.side==='PLAYER'&&action.fusion).length<=1);
    if(fused.winner==='PLAYER')assert.ok(fused.stake.gainedCount>=1&&fused.stake.gainedCount<=100,'技術型獎勵由 API 算，不由前端補算');
  }
  const invalid=await fetch('http://localhost:8888/api/beast-game',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({lineup,replaySeed:1,stake:ids[0],fusionSlot:2}),
  });
  assert.equal(invalid.status,400,'沒有未上場相生卡的席位必須由伺服器拒絕');
  console.log('PASS: API 三局資料、重播與押注結算使用同一勝負');
})().catch((error) => { console.error(error); process.exitCode = 1; });
