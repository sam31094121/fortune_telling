/** 自選隊伍：5 張、同屬性可、點選主攻（預設第一張、倒下換下一張）其餘半能量、沒卡不出手。 */
const assert = require('node:assert/strict');
const M = require('../.beast-game-build/lib/beast-game/match3');
let pass = 0; const t = (n, f) => { f(); pass++; console.log('  ✓ ' + n); };
const team = [
  { id: 'e1', element: 'EARTH', attack: 29, hp: 40, energy: 0 },
  { id: 'f1', element: 'FIRE', attack: 31, hp: 40, energy: 0 },
  { id: 'f2', element: 'FIRE', attack: 77, hp: 40, energy: 0 },
  { id: 'e2', element: 'EARTH', attack: 50, hp: 40, energy: 0 },
  { id: 'a1', element: 'AIR', attack: 30, hp: 40, energy: 0 },
];
const step = (el) => [{ chain: 1, groups: [{ element: el, size: 3, longest: 3, cells: [] }] }];
t('預設規則：同屬性只有第一張出手', () => {
  const h = M.computeHits(step('FIRE'), M.attackingTeam(team), 'AIR');
  assert.deepEqual(h.map((x) => x.attackerId), ['f1']);
});
t('第一張倒下：下一張同屬性接手', () => {
  const k = team.map((u) => (u.id === 'f1' ? { ...u, hp: 0 } : u));
  assert.deepEqual(M.computeHits(step('FIRE'), M.attackingTeam(k), 'AIR').map((x) => x.attackerId), ['f2']);
});
t('all-attack：同屬性全員出手', () => {
  assert.deepEqual(M.computeHits(step('EARTH'), M.attackingTeam(team, 'all-attack'), 'AIR').map((x) => x.attackerId), ['e1', 'e2']);
});
t('能量：主攻全額，其餘一半；集滿只給主攻', () => {
  const r = M.shareEnergy(team, [{ element: 'FIRE', gain: 30, fill: false }]);
  assert.equal(r.find((u) => u.id === 'f1').energy, 30); assert.equal(r.find((u) => u.id === 'f2').energy, 15);
  const f = M.shareEnergy(team, [{ element: 'EARTH', gain: 50, fill: true }]);
  assert.equal(f.find((u) => u.id === 'e1').energy, M.ENERGY_MAX); assert.equal(f.find((u) => u.id === 'e2').energy, 25);
});
t('沒有該屬性：不出手', () => {
  const h = M.computeHits(step('WATER'), M.attackingTeam(team), 'AIR');
  assert.equal(h.length, 1); assert.equal(h[0].attackerId, null); assert.equal(h[0].amount, 0);
});
t('teamIds 驗證：5 張、不重複、在卡池', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.equal(M.validTeamIds(['a', 'b', 'c', 'd', 'e'], pool), true);
  assert.equal(M.validTeamIds(['a', 'b', 'c', 'd'], pool), false);
  assert.equal(M.validTeamIds(['a', 'a', 'c', 'd', 'e'], pool), false);
  assert.equal(M.validTeamIds(['a', 'b', 'c', 'd', 'z'], pool), false);
  assert.equal(M.validTeamIds(null, pool), false);
});
t('點選主攻：點第二張火，第二張出手、第一張只拿一半能量', () => {
  const c = M.chooseLead(team, {}, 'f2');
  assert.deepEqual(M.computeHits(step('FIRE'), M.attackingTeam(team, 'tap-lead', c), 'AIR').map((x) => x.attackerId), ['f2']);
  const r = M.shareEnergy(team, [{ element: 'FIRE', gain: 30, fill: false }], 'tap-lead', c);
  assert.equal(r.find((u) => u.id === 'f2').energy, 30); assert.equal(r.find((u) => u.id === 'f1').energy, 15);
});
t('預設規則是 tap-lead；沒點過＝第一張', () => {
  assert.equal(M.DEFAULT_SAME_ELEMENT_RULE, 'tap-lead');
  assert.deepEqual([...M.leadIds(team, {})].sort(), ['a1', 'e1', 'f1']);
});
t('選擇會保留，直到點同屬性另一張；點別屬性不影響', () => {
  let c = M.chooseLead(team, {}, 'f2'); c = M.chooseLead(team, c, 'e2');
  assert.equal(c.FIRE, 'f2'); assert.equal(c.EARTH, 'e2');
  c = M.chooseLead(team, c, 'f1'); assert.equal(c.FIRE, 'f1'); assert.equal(c.EARTH, 'e2');
});
t('點單張屬性或倒下的卡：不改選擇', () => {
  assert.deepEqual(M.chooseLead(team, {}, 'a1'), {});
  const k = team.map((u) => (u.id === 'f2' ? { ...u, hp: 0 } : u));
  assert.deepEqual(M.chooseLead(k, {}, 'f2'), {});
});
t('被點的主攻倒下：換下一張存活的同屬性（繞回開頭）', () => {
  const t3 = [...team, { id: 'f3', element: 'FIRE', attack: 20, hp: 40, energy: 0 }];
  const k = t3.map((u) => (u.id === 'f2' ? { ...u, hp: 0 } : u));
  assert.deepEqual(M.attackingTeam(k, 'tap-lead', { FIRE: 'f2' }).filter((u) => u.element === 'FIRE').map((u) => u.id), ['f3']);
  const k2 = t3.map((u) => (u.id === 'f3' ? { ...u, hp: 0 } : u));
  assert.deepEqual(M.attackingTeam(k2, 'tap-lead', { FIRE: 'f3' }).filter((u) => u.element === 'FIRE').map((u) => u.id), ['f1']);
});
t('first-attacks 忽略點選', () => {
  assert.deepEqual(M.attackingTeam(team, 'first-attacks', { FIRE: 'f2' }).filter((u) => u.element === 'FIRE').map((u) => u.id), ['f1']);
});
console.log(`beast-match3-team: ${pass} 項通過`);
