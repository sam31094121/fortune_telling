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
    /*
      合體只在那一格輪到玩家出手時發動；對手先手一擊打倒那一格，合體就沒機會用，戰報照實不寫。
      2026-09-15 中等易經改為聰明組陣後，種子 1 正好是玄武先手一擊——所以改成「真的發動才驗」，
      並在下面另找一場真的發動的來驗，這條檢查不會變成空跑。
    */
    const firedOnSeed1=fused.series.pairs.flatMap(pair=>pair.actions).some(action=>action.side==='PLAYER'&&action.fusion);
    if(firedOnSeed1)assert.ok(fused.timeline.some(entry=>entry.note.includes('暴怒合體')),'合體須能從前端戰報核對');
    let covered=firedOnSeed1;
    for(let seed=2;seed<40&&!covered;seed++){
      const res=await (await fetch('http://localhost:8888/api/beast-game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lineup,replaySeed:seed,stake:ids[0],fusionSlot})})).json();
      assert.deepEqual(res.series,core.playSeries(lineup,res.opponentLineupIds,seed,res.fusion));
      if(res.series.pairs.flatMap(pair=>pair.actions).some(action=>action.side==='PLAYER'&&action.fusion)){
        assert.ok(res.timeline.some(entry=>entry.note.includes('暴怒合體')),'合體須能從前端戰報核對');
        covered=true;
      }
    }
    assert.ok(covered,'至少要有一場真的發動合體，才驗得到戰報');
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
