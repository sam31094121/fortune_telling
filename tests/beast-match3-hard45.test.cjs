/** 困難 49 顆模式：盤面 7×7 由 config 給、敵方數值走 config、核心規則與中等完全相同。 */
const assert = require('node:assert/strict');
const M = require('../.beast-game-build/lib/beast-game/match3');
let pass = 0; const t = (n, f) => { f(); pass++; console.log('  ok ' + n); };
const H = M.MATCH3_MODES.hard45, MED = M.MATCH3_MODES.medium;
t('hard45＝7×7＝49 顆；medium 仍 7×5＝35', () => {
  assert.equal(H.cols * H.rows, 49); assert.equal(H.cols, 7); assert.equal(H.rows, 7);
  assert.equal(MED.cols, 7); assert.equal(MED.rows, 5); assert.equal(M.MATCH3_COLS, 7);
});
t('medium 數值與原本相同（HP 300／ATK 8／倒數 3）', () => {
  assert.equal(MED.enemyHp, M.MATCH3_ENEMY_HP); assert.equal(MED.enemyAtk, M.MATCH3_ENEMY_ATK); assert.equal(MED.counterEvery, 3);
  const f = M.makeFoe('x', 'AIR'); assert.equal(f.hp, 300); assert.equal(f.attack, 8); assert.equal(f.cd, 3);
});
t('hard45 敵人比中等強、反擊不慢於中等，且標記為待平衡', () => {
  assert.ok(H.enemyHp > MED.enemyHp); assert.ok(H.enemyAtk > MED.enemyAtk); assert.ok(H.counterEvery <= MED.counterEvery); assert.equal(H.placeholder, true);
  const f = M.makeFoe('x', 'AIR', H); assert.equal(f.hp, H.enemyHp); assert.equal(f.maxHp, H.enemyHp); assert.equal(f.attack, H.enemyAtk); assert.equal(f.cd, H.counterEvery);
});
const findPath = (b) => { // 找一條 3 顆相鄰同色路徑
  const R = b.length, C = b[0].length;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const st = [[{ r, c }]];
    while (st.length) { const p = st.pop(); if (p.length === 3) return p; const l = p[p.length - 1];
      for (const [dr, dc] of [[0,1],[1,0],[0,-1],[-1,0]]) { const n = { r: l.r + dr, c: l.c + dc };
        if (n.r < 0 || n.c < 0 || n.r >= R || n.c >= C || b[n.r][n.c] !== b[r][c] || p.some((q) => q.r === n.r && q.c === n.c)) continue; st.push([...p, n]); } }
  }
  return null;
};
t('300 個 seed：49 顆盤面 7 列×7 欄、五色皆在、開局無現成三連、可拖', () => {
  for (let s = 1; s <= 300; s++) {
    const b = M.generateDragBoard(M.seededRng(s), H.rows, H.cols);
    assert.equal(b.length, 7); b.forEach((row) => assert.equal(row.length, 7));
    assert.equal(b.flat().length, 49);
    for (const e of b.flat()) assert.ok(M.MATCH3_ORB_ELEMENTS.includes(e));
    assert.equal(M.findGroups(b).length, 0);
    assert.ok(findPath(b), 'seed ' + s + ' 沒有可拖路徑');
  }
});
t('49 顆盤拖曳發動後仍是 7×7（含補珠、魔法珠格）', () => {
  let n = 0;
  for (let s = 1; s <= 100; s++) {
    const rng = M.seededRng(s); const b = M.generateDragBoard(rng, H.rows, H.cols); const p = findPath(b);
    const res = M.resolveDrag(b, p, rng, M.emptyMagic(b));
    assert.ok(res.valid); n++;
    assert.equal(res.board.length, 7); res.board.forEach((row) => assert.equal(row.length, 7));
    assert.equal(res.magic.length, 7); res.magic.forEach((row) => assert.equal(row.length, 7));
    assert.equal(res.chainLength, 3);
  }
  assert.equal(n, 100);
});
t('不變規則：普通威力上限 10、≥4 魔法珠、5 顆五珠技、每顆 +10、上限 100、連線公式', () => {
  assert.equal(M.NORMAL_POWER_CAP, 10); assert.equal(M.normalPower(15), 10);
  assert.equal(M.MAGIC_ORB_MIN_LENGTH, 4); assert.equal(M.SKILL5_LENGTH, 5);
  assert.equal(M.ENERGY_PER_ORB, 10); assert.equal(M.ENERGY_MAX, 100); assert.equal(M.MATCH3_MIN_RUN, 3);
  assert.equal(M.linkDamage([10, 10]), 60); assert.equal(M.linkDamage([10, 10, 10]), 135);
});
t('困難每次輪替一張存活卡反擊；倒下不出手；全滅停止', () => {
 const team=[{id:'a',element:'AIR',hp:1000,energy:0}];
 const foes=[M.makeFoe('e1','EARTH',H),M.makeFoe('e2','FIRE',H),{...M.makeFoe('dead','WATER',H),hp:0}];
 for(let turn=0;turn<4;turn++){
  const cp=M.counterPhase(team,foes,H.counterEvery,turn);
  assert.equal(cp.hits.length,1);assert.equal(cp.hits[0].enemy,turn%2);
  assert.ok(cp.team[0].hp<team[0].hp);assert.equal(cp.foes[turn%2].cd,1);
 }
 assert.equal(M.counterPhase(team,foes.map(f=>({...f,hp:0})),1,0).hits.length,0);
 assert.equal(M.counterPhase(team.map(t=>({...t,hp:0})),foes,1,0).hits.length,0);
 const normal=M.counterPhase(team,[M.makeFoe('e','EARTH')]);assert.equal(normal.hits.length,0);assert.equal(normal.foes[0].cd,2);
});
console.log('beast-match3-hard45: ' + pass + ' passed');
