/** 5v5 敵方：五隻正式 .v2 神獸、HP/倒數、選目標、反擊、連線攻擊。 */
const assert = require('node:assert/strict');
const M = require('../.beast-game-build/lib/beast-game/match3');
let pass = 0; const t = (n, f) => { f(); pass++; console.log('  ok ' + n); };
t('敵方剛好 5 隻、不重複、都在 60 張 .v2 卡池', () => {
  const pool = require('../.beast-game-build/lib/beast-game/registry').playableCards();
  assert.equal(M.MATCH3_ENEMY_NAMES.length, 5);
  assert.equal(new Set(M.MATCH3_ENEMY_NAMES).size, 5);
  for (const n of M.MATCH3_ENEMY_NAMES) { const c = pool.find((x) => x.name === n); assert.ok(c, n); assert.match(c.art.thumbnail, /\.v2/); }
});
t('makeFoe：HP 滿、倒數 3', () => {
  const f = M.makeFoe('beast_a22', 'WATER');
  assert.equal(f.hp, M.MATCH3_ENEMY_HP); assert.equal(f.maxHp, M.MATCH3_ENEMY_HP); assert.equal(f.cd, 3);
});
const foes = () => M.MATCH3_ENEMY_NAMES.map((id, i) => M.makeFoe(id, ['WATER', 'EARTH', 'FIRE', 'AIR', 'SPACE'][i]));
t('damageFoe 只傷指定那隻、不低於 0', () => {
  const f = M.damageFoe(foes(), 2, 999);
  assert.equal(f[2].hp, 0); assert.equal(f[0].hp, M.MATCH3_ENEMY_HP); assert.equal(f[4].hp, M.MATCH3_ENEMY_HP);
});
t('aliveTarget：目標倒下自動換活著的', () => {
  const f = M.damageFoe(foes(), 1, 999);
  assert.equal(M.aliveTarget(f, 0), 0);
  assert.notEqual(M.aliveTarget(f, 1), 1);
  assert.ok(f[M.aliveTarget(f, 1)].hp > 0);
});
const team = () => [
  { id: 'a', element: 'FIRE', attack: 30, hp: 40, energy: 0 },
  { id: 'b', element: 'WATER', attack: 20, hp: 25, energy: 0 },
];
t('每 3 步反擊一次：前兩步不打、第三步打並重置 3', () => {
  let tm = team(), f = foes(), r;
  r = M.counterPhase(tm, f); assert.equal(r.hits.length, 0); assert.equal(r.foes[0].cd, 2);
  r = M.counterPhase(r.team, r.foes); assert.equal(r.hits.length, 0);
  r = M.counterPhase(r.team, r.foes); assert.equal(r.hits.length, 5);
  assert.ok(r.foes.every((x) => x.cd === 3));
  const lost = tm.reduce((s, u) => s + u.hp, 0) - r.team.reduce((s, u) => s + u.hp, 0);
  assert.ok(lost > 0);
});
t('倒下的敵人不反擊', () => {
  let f = foes().map((x) => ({ ...x, cd: 1 })); f = M.damageFoe(f, 0, 999);
  const r = M.counterPhase(team(), f); assert.equal(r.hits.length, 4);
});
t('連線攻擊：至少 2 張、每張 50 能量、倍率遞增', () => {
  assert.equal(M.linkProblem([{ id: 'a', element: 'FIRE', attack: 1, hp: 1, energy: 100 }], ['a']), 'tooFew');
  const tm = [{ id: 'a', element: 'FIRE', attack: 10, hp: 1, energy: 50 }, { id: 'b', element: 'AIR', attack: 10, hp: 1, energy: 40 }];
  assert.equal(M.linkProblem(tm, ['a', 'b']), 'energyLow');
  tm[1].energy = 60; assert.equal(M.linkProblem(tm, ['a', 'b']), null);
  assert.equal(M.linkMultiplier(2), 1); assert.equal(M.linkMultiplier(4), 2);
  assert.equal(M.linkDamage([10, 10]), 60);
});
console.log(`beast-match3-enemies: ${pass} passed`);
