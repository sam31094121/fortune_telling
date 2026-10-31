'use strict';
/* 四象魔法珠（10/31）：對照表、隊伍限定、地珠隨機、1.5 倍與上限、旗標預設關、無舊卡、不動 MAGIC_BEAD_VISUALS_ENABLED。 */
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
delete process.env.NEXT_PUBLIC_GUARDIAN_MAGIC;
const M = require('../.beast-game-build/lib/beast-game/match3');
let pass = 0; const t = (n, f) => { f(); pass++; console.log('  ✓ ' + n); };
const G = M.GUARDIAN_BY_ELEMENT;
const team = (ids) => ids.map((id) => ({ id, hp: 100 }));
const trig = (element, chain = 1, power = 4) => ({ r: 0, c: 0, element, power, chain });
const ALL = ['beast_g_qinglong', 'beast_g_zhuque', 'beast_g_baihu', 'beast_g_xuanwu'];

t('對照：風青龍、火朱雀、空白虎、水玄武；地沒有固定神獸', () => {
  assert.equal(G.AIR.id, 'beast_g_qinglong'); assert.equal(G.FIRE.id, 'beast_g_zhuque');
  assert.equal(G.SPACE.id, 'beast_g_baihu'); assert.equal(G.WATER.id, 'beast_g_xuanwu'); assert.equal(G.EARTH, undefined);
});
t('技能 id／名稱與 cards/skills、卡片元素一致', () => {
  const sk = fs.readFileSync(path.join(root, 'cards/skills/index.ts'), 'utf8');
  for (const g of M.GUARDIAN_LIST) {
    assert.ok(sk.includes(`id: '${g.skillId}', name: '${g.skillName}'`), g.skillId);
    const card = fs.readFileSync(path.join(root, `cards/beasts/guardian-${g.id.slice(8)}.ts`), 'utf8');
    assert.ok(card.includes(`id: '${g.id}'`) && card.includes(`element: '${g.element}'`) && card.includes(`'${g.skillId}'`) && card.includes("rarity: 'UR'"), g.id);
  }
});
t('旗標預設關閉', () => { assert.equal(M.GUARDIAN_MAGIC_SKILL_ENABLED, false); assert.equal(M.isGuardianMagicEnabled(), false); });
t('四屬性：隊伍有對應四象才觸發', () => {
  for (const el of ['AIR', 'FIRE', 'SPACE', 'WATER']) {
    const on = M.resolveGuardianActivations([trig(el)], team([G[el].id, 'beast_a01']), () => 0.5);
    assert.equal(on.length, 1); assert.equal(on[0].guardian.id, G[el].id);
    assert.equal(M.resolveGuardianActivations([trig(el)], team(ALL.filter((x) => x !== G[el].id)), () => 0.5).length, 0);
  }
});
t('倒下的四象不觸發', () => {
  assert.equal(M.resolveGuardianActivations([trig('AIR')], [{ id: 'beast_g_qinglong', hp: 0 }], () => 0).length, 0);
});
t('地珠：只從隊伍裡在場的四象隨機挑；沒有就不觸發', () => {
  const tm = team(['beast_g_zhuque', 'beast_g_xuanwu', 'beast_a01']);
  const seen = new Set();
  for (const r of [0, 0.3, 0.6, 0.99]) seen.add(M.resolveGuardianActivations([trig('EARTH')], tm, () => r)[0].guardian.id);
  assert.deepEqual([...seen].sort(), ['beast_g_xuanwu', 'beast_g_zhuque']);
  assert.equal(M.resolveGuardianActivations([trig('EARTH')], team(['beast_a01']), () => 0).length, 0);
});
t('同段同色多顆魔法珠只發動一次（威力合併）', () => {
  const a = M.resolveGuardianActivations([trig('AIR', 1, 4), trig('AIR', 1, 6), trig('AIR', 2, 5)], team(['beast_g_qinglong']), () => 0);
  assert.equal(a.length, 2); assert.equal(a[0].power, 10);
});
t('傷害 ×1.5，多出部分有上限 GUARDIAN_MAGIC_BONUS_CAP', () => {
  assert.equal(M.GUARDIAN_MAGIC_MULT, 1.5); assert.ok(M.GUARDIAN_MAGIC_BONUS_CAP > 0);
  assert.equal(M.guardianBonus(100), 50); assert.equal(M.guardianBonus(0), 0);
  assert.equal(M.guardianBonus(10000), M.GUARDIAN_MAGIC_BONUS_CAP);
});
t('只加在同段同色、有傷害的那幾筆；其他不變、不改原陣列', () => {
  const hits = [
    { attackerId: 'beast_g_qinglong', element: 'AIR', orbs: 4, length: 4, chain: 1, amount: 80 },
    { attackerId: 'x', element: 'FIRE', orbs: 3, length: 3, chain: 1, amount: 40 },
    { attackerId: null, element: 'AIR', orbs: 3, length: 3, chain: 2, amount: 0 },
  ];
  const acts = M.resolveGuardianActivations([trig('AIR')], team(['beast_g_qinglong']), () => 0);
  const out = M.applyGuardianBonus(hits, acts);
  assert.equal(out[0].amount, 120); assert.equal(out[0].guardianBonus, 40);
  assert.equal(out[1].amount, 40); assert.equal(out[2].amount, 0); assert.equal(hits[0].amount, 80);
  assert.deepEqual(M.applyGuardianBonus(hits, []), hits);
});
t('MAGIC_BEAD_VISUALS_ENABLED 仍為 false；魔法珠基本規則不變', () => {
  const pal = fs.readFileSync(path.join(root, 'lib/beast-game/element-palette.ts'), 'utf8');
  assert.ok(/MAGIC_BEAD_VISUALS_ENABLED = false/.test(pal));
  assert.equal(M.MAGIC_ORB_MIN_LENGTH, 4); assert.equal(M.NORMAL_POWER_CAP, 10); assert.equal(M.BASE_RATIO, 0.5);
});
t('演出元件：不用舊卡 ID／舊圖、不以 thumbnail 直接畫、有略過按鈕、不碰 lx-cards.css', () => {
  for (const f of ['components/battlefield/bead/GuardianSkillFx.tsx', 'components/battlefield/bead/GuardianSkillFx.module.css', 'lib/beast-game/match3/guardian-magic.ts']) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of s.matchAll(/\bbeast_[a-z0-9_]+\b/g)) assert.ok(/^beast_(g_[a-z]+|[ay]\d{2})$/.test(m[0]), `${f}: ${m[0]}`);
    assert.ok(!/lx-cards/.test(s)); assert.ok(!/\.thumbnail\b/.test(s));
  }
  assert.ok(/guardian-fx-skip/.test(fs.readFileSync(path.join(root, 'components/battlefield/bead/GuardianSkillFx.tsx'), 'utf8')));
});
console.log(`guardian-magic-orb: ${pass} 項通過`);