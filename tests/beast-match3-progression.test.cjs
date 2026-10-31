const assert = require('node:assert/strict');
const M = require('../.beast-game-build/lib/beast-game/match3');
const pool = require('../.beast-game-build/lib/beast-game/registry').playableCards();
const before = JSON.stringify(pool);
assert.deepEqual([0,1,2].map(n => M.progressionStage(n).minChain), [3,4,5]);
for (let level = 0; level < 3; level++) {
  const minimum = M.progressionStage(level).minChain;
  const board = Array.from({length:7}, (_,r) => Array.from({length:7}, (_,c) => M.MATCH3_ORB_ELEMENTS[(r*2+c)%5]));
  board[6] = Array(7).fill('FIRE');
  const path = board[6].map((_,c) => ({r:6,c}));
  const tooShort = M.resolveDrag(board,path.slice(0,minimum-1),M.seededRng(11),M.emptyMagic(board),1,true,true,minimum);
  if (minimum === 3) {
    assert.equal(tooShort.valid,false); assert.equal(tooShort.reason,'short');
    assert.deepEqual(tooShort.board,board); assert.equal(tooShort.steps.length,0);
  } else {
    assert.equal(tooShort.valid,true); assert.equal(tooShort.attackAllowed,false);
    assert.ok(tooShort.steps.length > 0); assert.notDeepEqual(tooShort.board,board);
    const team=M.MATCH3_ORB_ELEMENTS.map((element,i)=>({id:String(i),element,hp:100,attack:100}));
    assert.ok(M.computeHits(tooShort.steps,team,'EARTH').every(h=>h.amount===0));
  }
  const enough = M.resolveDrag(board,path.slice(0,minimum),M.seededRng(11),M.emptyMagic(board),1,true,true,minimum);
  assert.equal(enough.valid,true); assert.equal(enough.chainLength,minimum);
  assert.equal(enough.attackAllowed,true);
  for(let seed=1;seed<=100;seed++) {
    const generated=M.generateDragBoard(M.seededRng(seed),M.MATCH3_MODES.hard45.rows,M.MATCH3_MODES.hard45.cols,true,minimum);
    assert.ok(M.hasDragMove(generated,true,minimum));
    assert.equal(M.findGroups(generated,true).length,0);
  }
}
// Hard stage: both three and four are valid clear/refill moves; even cascade
// groups cannot leak damage through the five-orb attack gate.
for (const length of [3,4]) {
  const b=Array.from({length:7},()=>Array(7).fill('FIRE'));
  const r=M.resolveDrag(b,Array.from({length},(_,c)=>({r:6,c})),M.seededRng(19),M.emptyMagic(b),10,true,true,5);
  assert.equal(r.valid,true);assert.equal(r.attackAllowed,false);
  assert.ok(r.steps.length>0);assert.ok(r.steps.every(s=>s.attackAllowed===false));
  assert.ok(M.computeHits(r.steps,[{id:'f',element:'FIRE',hp:100,attack:100}],'EARTH').every(h=>h.amount===0));
}
// Connected component size alone is insufficient: a plus has five cells but no
// non-repeating orthogonal path of four. The move finder must follow real paths.
const fork=[['WATER','FIRE','EARTH'],['FIRE','FIRE','FIRE'],['AIR','FIRE','SPACE']];
assert.equal(M.hasDragMove(fork,false,4),false);
assert.deepEqual(['YOUNG', 'ADULT', 'GUARDIAN'].map(f => pool.filter(c => c.form === f).length), [28, 28, 4]);
assert.deepEqual([0, 1, 2, 8].map(n => M.progressionStage(n).label), ['簡單', '中度', '困難', '困難']);
assert.equal(M.nextProgressionWins(0, true), 1);
assert.equal(M.nextProgressionWins(1, true), 2);
assert.equal(M.nextProgressionWins(2, true), 3);
for (const n of [0, 1, 2, 3, 5, 6, 30]) assert.equal(M.nextProgressionWins(n, false), n);
for (const n of [-1, NaN, Infinity]) assert.equal(M.progressionStage(n).index, 0);
assert.deepEqual(Array.from({length:10},(_,n)=>M.progressionStage(n).minChain), [3,4,5,6,7,8,8,8,8,8]);
for (const wins of [2,3,4,5,6,10,100]) {
  const stage=M.progressionStage(wins);
  assert.equal(stage.wins,wins); assert.equal(stage.index,2); assert.equal(stage.form,'GUARDIAN');
  assert.equal(stage.enemyCount,4); assert.equal(stage.simultaneous,true);
  assert.equal(M.nextProgressionWins(wins,true),wins+1);
}
for(const [input,expected] of [[-4,0],[NaN,0],[Infinity,0],[1.8,1],[Number.MAX_VALUE,Number.MAX_SAFE_INTEGER]]) {
  assert.equal(M.progressionStage(input).wins,expected);
  assert.equal(M.nextProgressionWins(input,false),expected);
}
assert.equal(M.nextProgressionWins(Number.MAX_SAFE_INTEGER,true),Number.MAX_SAFE_INTEGER);
const guardian=pool.find(c=>c.form==='GUARDIAN');
for(const wins of [5,6,7,10]) {
  const stage=M.progressionStage(wins), multiplier=1+(wins-5)*.1;
  assert.equal(stage.strengthMultiplier,multiplier);
  assert.equal(stage.hpScale,4*multiplier); assert.equal(stage.attackScale,.075*multiplier);
  const stats=M.progressionEnemyStats(guardian,wins);
  assert.equal(stats.hp,Math.round(guardian.stats.hp*4*multiplier));
  assert.equal(stats.attack,Math.round(guardian.stats.attack*.075*multiplier));
}
assert.deepEqual(M.progressionEnemyStats(guardian,2),M.progressionEnemyStats(guardian,5),'提高門檻時不偷加數值');
const huge=M.progressionEnemyStats(guardian,Number.MAX_SAFE_INTEGER);
assert.ok(Number.isSafeInteger(huge.hp)); assert.ok(Number.isSafeInteger(huge.attack));

const seen = [new Set(), new Set(), new Set()];
const hp = [[], [], []], turnAttack = [[], [], []];
for (let seed = 1; seed <= 500; seed++) for (let level = 0; level < 3; level++) {
  const selected = M.selectProgressionEnemies(pool, M.seededRng(seed), level);
  assert.deepEqual(selected.map(c => c.id), M.selectProgressionEnemies([...pool].reverse(), M.seededRng(seed), level).map(c => c.id));
  assert.equal(selected.length, level === 2 ? 4 : 5);
  assert.equal(new Set(selected.map(c => c.id)).size, selected.length);
  assert.ok(selected.every(c => c.form === M.progressionStage(level).form));
  if (level < 2) assert.equal(new Set(selected.map(c => c.element)).size, 5);
  selected.forEach(c => seen[level].add(c.id));
  const stats = selected.map(c => M.progressionEnemyStats(c, level));
  stats.forEach(s => { assert.equal(s.hp, s.maxHp); assert.equal(s.cd, 1); assert.ok(s.attack > 0); });
  hp[level].push(stats.reduce((sum, s) => sum + s.hp, 0));
  // 第一、二關輪替一張；末關四獸同回合合擊。不把五張牌誤算為五次出手。
  turnAttack[level].push(...(level === 2 ? [stats.reduce((sum, s) => sum + s.attack, 0)] : stats.map(s => s.attack)));
}
assert.deepEqual(seen.map(s => s.size), [28, 28, 4]);
assert.ok(Math.min(...hp[1]) > Math.max(...hp[0]));
assert.ok(Math.min(...hp[2]) > Math.max(...hp[1]));
assert.ok(Math.min(...turnAttack[1]) > Math.max(...turnAttack[0]));
assert.ok(Math.min(...turnAttack[2]) > Math.max(...turnAttack[1]));
assert.equal(JSON.stringify(pool), before, '不得修改原始卡片');
assert.throws(() => M.selectProgressionEnemies(pool.filter(c => c.form !== 'GUARDIAN'), M.seededRng(1), 2));
assert.throws(() => M.selectProgressionEnemies([], M.seededRng(1), 0));
assert.throws(() => M.selectProgressionEnemies(pool, () => 1, 0));
assert.throws(() => M.progressionEnemyStats(pool.find(c => c.form === 'GUARDIAN'), 0));
console.log('PASS: 28+28+4 registry, 500 seeded selections per stage, win/loss progression, roster bounds and immutable stats');
console.log('Stage HP ranges:', hp.map(a => [Math.min(...a), Math.max(...a)]));
console.log('Raw counter-turn attack ranges before elements:', turnAttack.map(a => [Math.min(...a), Math.max(...a)]));

// Eight-orb stage: shorter legal paths clear/refill without any attack leakage.
for (let n=3;n<=8;n++) {
  const b=Array.from({length:7},()=>Array(7).fill('FIRE'));
  const path=[...Array.from({length:7},(_,c)=>({r:6,c})),{r:5,c:6}].slice(0,n);
  const r=M.resolveDrag(b,path,M.seededRng(31),M.emptyMagic(b),1,true,true,8);
  assert.equal(r.valid,true);assert.equal(r.attackAllowed,n>=8);
  assert.equal(r.steps.every(s=>s.attackAllowed===false),n<8);
}
// An unattainable attack search must still leave a real three-orb clearing move.
const fallback=M.generateDragBoard(M.seededRng(71),7,7,true,50);
assert.ok(M.hasDragMove(fallback,true,3));assert.equal(M.findGroups(fallback,true).length,0);
const mark=M.emptyMagic(fallback);mark[0][0]=7;
const shuffled=M.reshuffleKeepMagic(fallback,mark,M.seededRng(82),true,50);
assert.ok(M.hasDragMove(shuffled.board,true,3));
assert.deepEqual(shuffled.magic,mark);assert.equal(shuffled.board[0][0],fallback[0][0]);
console.log('PASS: eight-orb clear-only attacks and playable fallback preserve shield attributes');
