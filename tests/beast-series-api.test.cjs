const assert = require('node:assert/strict');
const core = require('../.beast-game-build/lib/beast-game');
(async () => {
  const ids = core.playableCards().map((card) => card.id);
  const lineup = core.buildLineup(ids, core.createRng(11));
  const response = await fetch('http://localhost:8888/api/beast-game', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lineup, replaySeed: 11, stake: ids[0] }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.isReplay, true);
  assert.equal(result.series.pairs.length, 3);
  assert.deepEqual(result.series, core.playSeries(lineup, result.opponentLineupIds, 11));
  assert.equal(result.winner, result.series.winner);
  assert.equal(result.stake.verdict, result.winner === 'PLAYER' ? 'WON' : result.winner === 'OPPONENT' ? 'LOST' : 'RETURNED');
  console.log('PASS: API 三局資料、重播與押注結算使用同一勝負');
})().catch((error) => { console.error(error); process.exitCode = 1; });
