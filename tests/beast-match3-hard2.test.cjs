/** 寶珠戰・困難 II（hard45b）：數值／盤面同 hard45、斜連開、敵方五隻依固定規則、與 hard45 敵方及守護獸／幼子不重疊；medium／hard45 不變。 */
const assert = require('node:assert/strict');
const M = require('../.beast-game-build/lib/beast-game/match3');
const pool = require('../.beast-game-build/lib/beast-game/registry').playableCards();
let pass = 0; const t = (n, f) => { f(); pass++; console.log('  ok ' + n); };
const H = M.MATCH3_MODES.hard45, H2 = M.MATCH3_MODES.hard45b, MED = M.MATCH3_MODES.medium;
t('hard45b：9×5＝45、diagonal=true、數值＝hard45（450/12/2）且待平衡', () => {
  assert.equal(H2.id, 'hard45b'); assert.equal(H2.cols, 9); assert.equal(H2.rows, 5); assert.equal(H2.diagonal, true);
  assert.equal(H2.enemyHp, H.enemyHp); assert.equal(H2.enemyAtk, H.enemyAtk); assert.equal(H2.counterEvery, H.counterEvery); assert.equal(H2.placeholder, true);
});
t('medium／hard45 原值不變', () => {
  assert.deepEqual([MED.cols, MED.rows, MED.enemyHp, MED.enemyAtk, MED.counterEvery, MED.diagonal], [7, 5, 300, 8, 3, false]);
  assert.deepEqual([H.cols, H.rows, H.enemyHp, H.enemyAtk, H.counterEvery, H.diagonal], [9, 5, 450, 12, 2, true]);
});
t('規則選出的五隻＝HARD2_ENEMY_NAMES（可重現）', () => {
  assert.deepEqual(M.selectHard2Enemies(pool).map((c) => c.name), [...M.HARD2_ENEMY_NAMES]);
  assert.deepEqual(M.selectHard2Enemies(pool.slice().reverse()).map((c) => c.name), [...M.HARD2_ENEMY_NAMES]);
});
t('五隻：不重複、五屬性各一、都是 .v2 成年卡、非守護獸、不在 hard45 敵方', () => {
  const cs = M.HARD2_ENEMY_NAMES.map((n) => pool.find((x) => x.name === n));
  cs.forEach((c, i) => { assert.ok(c, M.HARD2_ENEMY_NAMES[i]); assert.match(c.art.thumbnail, /\.v2/); assert.equal(c.form, 'ADULT'); assert.ok(!M.MATCH3_ENEMY_NAMES.includes(c.name)); });
  assert.deepEqual(cs.map((c) => c.element), ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH']);
  assert.equal(new Set(M.HARD2_ENEMY_NAMES).size, 5);
});
t('enemyNamesFor：hard45b→HARD2；medium／hard45／未給→原名單', () => {
  assert.deepEqual([...M.enemyNamesFor('hard45b')], [...M.HARD2_ENEMY_NAMES]);
  for (const id of ['medium', 'hard45', undefined, null]) assert.deepEqual([...M.enemyNamesFor(id)], [...M.MATCH3_ENEMY_NAMES]);
});
t('hard45b 300 seed：開局四方向無現成 3 連、且有可拖步', () => {
  for (let s = 1; s <= 300; s++) { const b = M.generateDragBoard(M.seededRng(s), H2.rows, H2.cols, H2.diagonal); assert.equal(b.flat().length, 45); assert.equal(M.findGroups(b, true).length, 0); assert.ok(M.hasDragMove(b, true), 'seed ' + s); }
});
t('makeFoe(hard45b)：HP 450／ATK 12／倒數 2', () => { const f = M.makeFoe('x', 'AIR', H2); assert.deepEqual([f.hp, f.attack, f.cd], [450, 12, 2]); });
console.log('beast-match3-hard2: ' + pass + ' passed');
