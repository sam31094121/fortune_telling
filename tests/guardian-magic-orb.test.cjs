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
t('傷害 ×1.6，多出部分上限 90（10/31 平衡，敵 HP 450 的 20%）', () => {
  assert.equal(M.GUARDIAN_MAGIC_MULT, 1.6); assert.equal(M.GUARDIAN_MAGIC_BONUS_CAP, 90);
  assert.equal(M.guardianBonus(100), 60); assert.equal(M.guardianBonus(0), 0);
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
  assert.equal(out[0].amount, 128); assert.equal(out[0].guardianBonus, 48);
  assert.equal(out[1].amount, 40); assert.equal(out[2].amount, 0); assert.equal(hits[0].amount, 80);
  assert.deepEqual(M.applyGuardianBonus(hits, []), hits);
});
t('MAGIC_BEAD_VISUALS_ENABLED 仍為 false；魔法珠基本規則不變', () => {
  // HARD II 分支沒有 element-palette.ts／MAGIC_BEAD_VISUALS_ENABLED：若之後出現，必須仍為 false。
  const palP = path.join(root, 'lib/beast-game/element-palette.ts');
  if (fs.existsSync(palP)) assert.ok(/MAGIC_BEAD_VISUALS_ENABLED = false/.test(fs.readFileSync(palP, 'utf8')));
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
/* 10/31 HARD II 移植：加成獨立計算、目標倒下轉給下一隻、困難・戰鬥寶珠 7×7 */
const tm2 = [{ id: 'beast_g_qinglong', attack: 80, hp: 100 }];
t('加成：同色有傷害 → 1.6 倍差額；同色 0 傷害（如地珠無地屬性主攻）→ 四象卡面攻擊為底，仍有上限', () => {
  const act = M.resolveGuardianActivations([trig('AIR', 1, 4)], team(['beast_g_qinglong']), () => 0)[0];
  assert.deepEqual(M.guardianStrikeBonuses([{ attackerId: 'x', element: 'AIR', orbs: 4, length: 4, chain: 1, amount: 60 }], [act], tm2), [36]);
  const b0 = M.guardianStrikeBonuses([{ attackerId: null, element: 'AIR', orbs: 4, length: 4, chain: 1, amount: 0 }], [act], tm2)[0];
  assert.ok(b0 > 0 && b0 <= M.GUARDIAN_MAGIC_BONUS_CAP, 'fallback ' + b0);
  assert.equal(M.guardianStrikeBonuses([{ attackerId: 'x', element: 'AIR', orbs: 9, length: 9, chain: 1, amount: 9999 }], [act], tm2)[0], M.GUARDIAN_MAGIC_BONUS_CAP);
});
t('目標已倒下：加成轉給下一隻存活敵人；全滅不加', () => {
  const foes = [{ hp: 10 }, { hp: 0 }, { hp: 100 }];
  const r = M.applyGuardianStrike(foes, 0, 50, 30);
  assert.equal(r.foes[0].hp, 0); assert.equal(r.bonusTarget, 2); assert.equal(r.foes[2].hp, 70);
  const r2 = M.applyGuardianStrike(foes, 2, 5, 30); assert.equal(r2.bonusTarget, 2); assert.equal(r2.foes[2].hp, 65);
  const r3 = M.applyGuardianStrike([{ hp: 5 }], 0, 50, 30); assert.equal(r3.bonusTarget, -1); assert.equal(r3.foes[0].hp, 0);
});
t('困難・戰鬥寶珠 hard49g：7×7＝49、斜連、四象、精簡畫面、HARD2 敵方、300 seed 合法；hard45b 仍 9×5', () => {
  const G7 = M.MATCH3_MODES.hard49g, H2 = M.MATCH3_MODES.hard45b;
  assert.deepEqual([G7.cols, G7.rows, G7.diagonal, G7.guardian, G7.minimal], [7, 7, true, true, true]);
  assert.deepEqual([G7.enemyHp, G7.enemyAtk, G7.counterEvery], [H2.enemyHp, H2.enemyAtk, H2.counterEvery]);
  assert.deepEqual([H2.cols, H2.rows], [9, 5]);
  assert.deepEqual([...M.enemyNamesFor('hard49g')], [...M.HARD2_ENEMY_NAMES]);
  for (let s = 1; s <= 300; s++) { const b = M.generateDragBoard(M.seededRng(s), 7, 7, true); assert.equal(b.flat().length, 49); assert.equal(M.findGroups(b, true).length, 0); assert.ok(M.hasDragMove(b, true), 'seed ' + s); }
  const page = fs.readFileSync(path.join(root, 'app/beast-game/match3-hard2g/page.tsx'), 'utf8'); assert.ok(page.includes('mode="hard49g"'));
  assert.ok(fs.readFileSync(path.join(root, 'app/star-beasts/page.tsx'), 'utf8').includes("title: '困難・戰鬥寶珠'"));
});

/* 10/31 平衡＋回歸：地珠加成不得為 0；不會一擊打倒滿血敵人；hard49g 八方向消除 */
const G7 = M.MATCH3_MODES.hard49g;
t('回歸：地珠在 600 個隨機盤面＋隨機隊伍（含/不含地屬性主攻）中，只要場上有四象，加成一律 > 0 且 ≤ 上限', () => {
  const pool = require('../.beast-game-build/lib/beast-game/registry').playableCards();
  let stats = {}; try { stats = require('../.beast-game-build/lib/beast-game/card-face-stats').CARD_FACE_STATS; } catch { /* build 不含就用固定攻擊 */ }
  const fighters = pool.map((c) => ({ id: c.id, element: c.element, attack: stats[c.id]?.attack ?? 100, hp: 100 }));
  const guards = fighters.filter((f) => ALL.includes(f.id)), others = fighters.filter((f) => !ALL.includes(f.id));
  for (let s = 1; s <= 600; s++) {
    const rng = M.seededRng(s);
    const tm = [guards[s % 4], ...[0, 1, 2, 3].map(() => others[Math.floor(rng() * others.length)])];
    const b = M.generateDragBoard(rng, 7, 7, true); const mg = b.map((row) => row.map(() => 0));
    for (let c = 0; c < 4; c++) b[0][c] = 'EARTH';
    for (let c = 0; c < 4; c++) if (b[1][c] === 'EARTH') b[1][c] = 'FIRE';
    if (b[0][4] === 'EARTH') b[0][4] = 'WATER'; if (b[1][4] === 'EARTH') b[1][4] = 'WATER';
    mg[0][0] = 4;
    const res = M.resolveDrag(b, [0, 1, 2, 3].map((c) => ({ r: 0, c })), rng, mg, 50, true);
    assert.ok(res.valid && res.magicTriggered.some((x) => x.element === 'EARTH'), 'seed ' + s);
    const hits = M.computeHits(res.steps, tm, 'AIR');
    const acts = M.resolveGuardianActivations(res.magicTriggered, tm, rng);
    const bon = M.guardianStrikeBonuses(hits, acts, tm);
    const ea = acts.findIndex((a) => a.orbElement === 'EARTH');
    assert.ok(ea >= 0, 'earth act seed ' + s); assert.ok(bon[ea] > 0 && bon[ea] <= 90, `seed ${s} bonus ${bon[ea]}`);
  }
});
t('平衡：任何一次四象加成 ≤ 敵 HP 450 的 20%；大連鎖 245＋上限 < 450（不一擊打倒）', () => {
  assert.ok(M.GUARDIAN_MAGIC_BONUS_CAP <= G7.enemyHp * 0.2); assert.ok(245 + M.GUARDIAN_MAGIC_BONUS_CAP < G7.enemyHp);
  assert.ok(M.guardianBonus(80) >= 40, '4 珠段加成要有感');
});
const blank = () => { const b = []; for (let r = 0; r < 7; r++) { b.push([]); for (let c = 0; c < 7; c++) b[r].push(['AIR', 'FIRE', 'WATER', 'SPACE'][(r * 2 + c * 3 + (r >> 1)) % 4]); } return b; };
const DIRS = { '→': [0, 1], '←': [0, -1], '↓': [1, 0], '↑': [-1, 0], '↘': [1, 1], '↖': [-1, -1], '↙': [1, -1], '↗': [-1, 1] };
for (const [name, [dr, dc]] of Object.entries(DIRS)) t(`hard49g 拖曳 ${name}：3 顆直線可連可消`, () => {
  const b = blank(); const path = [0, 1, 2].map((i) => ({ r: 3 + dr * i, c: 3 + dc * i })); path.forEach((p) => { b[p.r][p.c] = 'EARTH'; });
  assert.ok(M.isValidPath(b, path, G7.diagonal), name);
  const res = M.resolveDrag(b, path, M.seededRng(7), undefined, 50, G7.diagonal); assert.ok(res.valid, name); assert.equal(res.steps[0].groups[0].size, 3);
});
for (const [name, cells] of Object.entries({ '橫': [[2, 1], [2, 2], [2, 3]], '直': [[1, 4], [2, 4], [3, 4]], '斜↘': [[1, 1], [2, 2], [3, 3]], '斜↙': [[1, 5], [2, 4], [3, 3]] })) t(`hard49g 自動／連鎖判定 ${name} 3 連`, () => {
  const b = blank(); for (const [r, c] of cells) b[r][c] = 'EARTH';
  const gs = M.findGroups(b, G7.diagonal).filter((g) => g.element === 'EARTH'); assert.equal(gs.length, 1, name);
  assert.deepEqual(gs[0].cells.map((p) => p.r * 10 + p.c).sort(), cells.map(([r, c]) => r * 10 + c).sort());
});
t('hard49g 連鎖：補珠後的橫／直／斜 3 連都會被消（每段 boardAfter 不再有任何方向的 3 連）', () => {
  for (let s = 1; s <= 200; s++) {
    const rng = M.seededRng(s); const b = M.generateDragBoard(rng, 7, 7, true);
    const p = []; outer: for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) { const ns = [[0, 1], [1, 0], [1, 1], [1, -1]]; for (const [dr, dc] of ns) for (const [er, ec] of ns) { const a = { r: r + dr, c: c + dc }, z = { r: a.r + er, c: a.c + ec }; if ([a, z].every((q) => q.r >= 0 && q.r < 7 && q.c >= 0 && q.c < 7) && b[a.r][a.c] === b[r][c] && b[z.r][z.c] === b[r][c] && !(z.r === r && z.c === c)) { p.push({ r, c }, a, z); break outer; } } }
    if (p.length < 3) continue;
    const res = M.resolveDrag(b, p, rng, undefined, 50, true); if (!res.valid) continue;
    assert.equal(M.findGroups(res.steps[res.steps.length - 1].boardAfter, true).length, 0, 'seed ' + s);
  }
});
console.log(`guardian-magic-orb (hard2 port): ${pass} passed`);
