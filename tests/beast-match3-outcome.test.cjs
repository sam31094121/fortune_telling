/** 回歸測試：「我方沒有地／火屬性主卡可出手」誤報（10/30）。 */
const assert = require('node:assert/strict');
const M = require('../.beast-game-build/lib/beast-game/match3');
let pass = 0; const t = (n, f) => { f(); pass++; console.log('  ✓ ' + n); };
const team = [
  { id: 'e1', name: '地卡', element: 'EARTH', attack: 29, hp: 0 },
  { id: 'f1', name: '火卡', element: 'FIRE', attack: 31, hp: 50 },
  { id: 'w1', name: '水卡', element: 'WATER', attack: 30, hp: 50 },
];
t('地卡被打倒：顯示「已倒下」，不再說「沒有」', () => {
  const o = M.attackOutcome(team, [{ element: 'EARTH', amount: 0 }], 'EARTH');
  assert.equal(o.kind, 'ko');
  const s = M.attackOutcomeText(o, '地'); assert.match(s, /已倒下/); assert.doesNotMatch(s, /沒有/);
});
t('火卡活著：拖火珠一定有傷害', () => {
  const steps = [{ chain: 1, groups: [{ element: 'FIRE', size: 3, longest: 3, cells: [] }] }];
  const hits = M.computeHits(steps, team, 'WATER');
  const o = M.attackOutcome(team, hits, 'FIRE'); assert.equal(o.kind, 'hit'); assert.ok(o.amount > 0);
});
t('隊伍真的沒有該屬性：才說「沒有」', () => {
  const o = M.attackOutcome(team, [], 'SPACE'); assert.equal(o.kind, 'absent');
  assert.match(M.attackOutcomeText(o, '空'), /沒有空屬性主卡/);
});
t('連鎖傷害來自其他顏色：不算到拖曳顏色', () => {
  const o = M.attackOutcome(team, [{ element: 'WATER', amount: 18 }, { element: 'SPACE', amount: 0 }], 'SPACE');
  assert.equal(o.kind, 'absent');
});
t('地＋火隊伍（全員存活）消地、消火都出手', () => {
  const alive = team.map((u) => ({ ...u, hp: 50 }));
  for (const el of ['EARTH', 'FIRE']) {
    const hits = M.computeHits([{ chain: 1, groups: [{ element: el, size: 3, longest: 3, cells: [] }] }], alive, 'AIR');
    assert.equal(M.attackOutcome(alive, hits, el).kind, 'hit'); assert.ok(hits.every((h) => h.amount > 0));
  }
});
console.log(`beast-match3-outcome: ${pass} 項通過`);
