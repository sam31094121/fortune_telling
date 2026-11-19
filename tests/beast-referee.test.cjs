// 寶石捷連線裁判守門：前端先演、後端判決；前端不自己判對錯。
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('./guest-orb-fixture.cjs');
const { predictOrbBoard } = require('../lib/beast-game/match3/board-prediction.ts');
const { resolveOrbTurn } = require('../lib/beast-game/match3/resolve-turn.ts');
const { replayDigest, judgeClaim, withReferee } = require('../lib/beast-game/match3/referee.ts');
const M = require('../lib/beast-game/match3/index.ts');
const cards = require('../lib/beast-game/registry.ts').playableCards().slice(0, 5);
const team = cards.map(c => ({ id: c.id, name: c.name, thumbnail: '', element: c.element, hp: 100, maxHp: 100, attack: 1, energy: 0, cd: 2 }));
let pass = 0, foul = 0, none = 0;
for (let seed = 1; seed <= 100; seed++) {
  const board = M.generateBoard(M.seededRng(seed), 8, 7, true), magic = M.emptyMagic(board);
  const path = Array.from({ length: 3 + seed % 5 }, (_, c) => ({ r: 7, c }));
  path.forEach(p => { board[p.r][p.c] = 'WATER'; });
  const prediction = predictOrbBoard(board, magic, path, seed, true, 3);
  const server = resolveOrbTurn({ board, magic, path, seed, team, foes: team.map(c => ({ ...c, hp: 10000, maxHp: 10000, attack: 0 })), mode: 'hard45', wins: 0, target: 0, move: 0, chosen: {}, rule: 'all-attack', attackBoost: 1 });
  // 演得對：PASS，留動畫
  const ok = withReferee(server, replayDigest(prediction.replay)).referee;
  assert.equal(ok.verdict, 'PASS'); assert.equal(ok.action, 'KEEP_ANIMATION'); pass++;
  // 前端作假（改一格盤面）：FOUL，要求恢復並重播後端版本
  const cheat = structuredClone(prediction.replay);
  cheat[0].boardBefore[0][0] = cheat[0].boardBefore[0][0] === 'FIRE' ? 'WATER' : 'FIRE';
  const bad = withReferee(server, replayDigest(cheat)).referee;
  assert.equal(bad.verdict, 'FOUL'); assert.equal(bad.action, 'RESTORE_AND_REPLAY'); foul++;
  // 沒預演：直接播後端版
  assert.equal(withReferee(server, undefined).referee.action, 'PLAY_SERVER'); none++;
  // 亂填指紋不能當 PASS
  assert.equal(judgeClaim(server.replay, 'zzzz').verdict, 'NO_CLAIM');
  assert.equal(judgeClaim(server.replay, 12345).verdict, 'NO_CLAIM');
  // 判決不改後端結算
  assert.equal(JSON.stringify({ ...withReferee(server, 'x'), referee: undefined }), JSON.stringify({ ...server, referee: undefined }));
}
// 沒有 replay 的回合（寶器、能量技）不產生判決
assert.equal(withReferee({ a: 1 }, 'abc').referee, undefined);
// 前端守門：不得自己比對判對錯，必須讀後端判決，且請求要帶指紋
const board = fs.readFileSync('components/battlefield/Match3Board.tsx', 'utf8');
assert(!/predictionMatches/.test(board), '前端不得自己用 predictionMatches 判對錯');
assert(/referee\?\.verdict === 'PASS'/.test(board) || /ruling\?\.verdict === 'PASS'/.test(board), '前端須以後端判決決定是否保留預演');
assert(/claim, guestBattleToken/.test(board), '請求須帶預演指紋 claim');
const route = fs.readFileSync('app/api/beast-game/orb-turn/route.ts', 'utf8');
assert((route.match(/withReferee\(/g) || []).length >= 3, '後端三條回合路徑都要掛判決');
console.log(`PASS 裁判：${pass} 次 PASS、${foul} 次 FOUL 恢復重播、${none} 次無預演，前端判決由後端決定`);
