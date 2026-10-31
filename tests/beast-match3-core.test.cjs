/**
 * 神獸戰隊 v0.8｜三消核心測試：尺寸、3–7 連、L／十字、連鎖、長度與連鎖倍率分開、
 * 非主屬性傷害 0、數值凍結、盤面無現成連線且有可走步；
 * 10/30 拖曳連珠：路徑規則、未滿 3 取消、4 顆魔法珠、剛好 5 顆五珠技、普通威力上限 10、屬性能量。
 */
const assert = require('node:assert/strict');
const B = '../.beast-game-build/lib/beast-game/';
const M = require(B + 'match3');
const { elementMultiplier } = require(B + 'elements');
const { playableCards } = require(B + 'registry');
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };
const E = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'];
// 風／空棋盤格底（無任何連線），再手動放線
const base = () => Array.from({ length: 5 }, (_, r) => Array.from({ length: 7 }, (_, c) => ((r + c) % 2 ? 'AIR' : 'SPACE')));

t('盤面 7 欄 × 5 列、五元素單一來源', () => {
  assert.equal(M.MATCH3_COLS, 7); assert.equal(M.MATCH3_ROWS, 7); // 10/31：中等改 7×7＝49
  assert.deepEqual([...M.MATCH3_ORB_ELEMENTS].sort(), [...E].sort());
  const b = M.generateBoard(M.seededRng(1));
  assert.equal(b.length, 7); b.forEach((row) => assert.equal(row.length, 7));
  assert.equal(M.findGroups(base()).length, 0);
});
t('生成 300 盤：無現成連線、至少一步可走', () => {
  for (let s = 1; s <= 300; s++) { const b = M.generateBoard(M.seededRng(s)); assert.equal(M.findGroups(b).length, 0); assert.ok(M.findValidMoves(b).length > 0); }
});
t('橫向 3～7 連都能判定，長度正確', () => {
  for (let n = 3; n <= 7; n++) { const b = base(); for (let c = 0; c < n; c++) b[0][c] = 'FIRE';
    const g = M.findGroups(b).filter((x) => x.element === 'FIRE'); assert.equal(g.length, 1); assert.equal(g[0].longest, n); assert.equal(g[0].size, n); }
});
t('直向 3～5 連', () => {
  for (let n = 3; n <= 5; n++) { const b = base(); for (let r = 0; r < n; r++) b[r][3] = 'WATER';
    const g = M.findGroups(b).filter((x) => x.element === 'WATER'); assert.equal(g.length, 1); assert.equal(g[0].longest, n); }
});
t('L 形：交點不重複計顆（3+3→5 顆）', () => {
  const b = base(); for (let c = 0; c < 3; c++) b[2][c] = 'EARTH'; b[3][0] = 'EARTH'; b[4][0] = 'EARTH';
  const g = M.findGroups(b).filter((x) => x.element === 'EARTH'); assert.equal(g.length, 1); assert.equal(g[0].size, 5); assert.equal(g[0].longest, 3);
});
t('十字：交點不重複計顆（5+3→7 顆）', () => {
  const b = base(); for (let c = 1; c < 6; c++) b[2][c] = 'FIRE'; b[1][3] = 'FIRE'; b[3][3] = 'FIRE';
  const g = M.findGroups(b).filter((x) => x.element === 'FIRE'); assert.equal(g.length, 1); assert.equal(g[0].size, 7); assert.equal(g[0].longest, 5);
});
t('長度倍率與連鎖倍率分開、不寫死 3/4/5', () => {
  assert.equal(M.lengthMultiplier(3), 1); assert.ok(M.lengthMultiplier(6) > M.lengthMultiplier(5)); assert.ok(M.lengthMultiplier(7) > M.lengthMultiplier(6));
  assert.equal(M.chainMultiplier(1), 1); assert.ok(M.chainMultiplier(3) > M.chainMultiplier(2));
  const a = M.hitAmount(100, 5, 1, 'FIRE', 'EARTH'), b = M.hitAmount(100, 3, 3, 'FIRE', 'EARTH');
  assert.equal(a, Math.round(100 * M.BASE_RATIO * M.lengthMultiplier(5)));
  assert.equal(b, Math.round(100 * M.BASE_RATIO * M.chainMultiplier(3)));
});
t('克制倍率沿用 elements.ts', () => {
  assert.equal(M.hitAmount(100, 3, 1, 'FIRE', 'SPACE'), Math.round(50 * elementMultiplier('FIRE', 'SPACE')));
  assert.equal(M.hitAmount(100, 3, 1, 'SPACE', 'FIRE'), Math.round(50 * elementMultiplier('SPACE', 'FIRE')));
});
t('連鎖：掉落後再成線會記第 2 段以上', () => {
  let found = false;
  for (let s = 1; s <= 400 && !found; s++) { const rng = M.seededRng(s); const b = M.generateBoard(rng);
    for (const [a, d] of M.findValidMoves(b)) { const r = M.resolveSwap(b, a, d, M.seededRng(s * 7)); if (r.steps.length >= 2) { found = true; assert.equal(r.steps[1].chain, 2); break; } } }
  assert.ok(found, '應找得到連鎖');
});
t('無效交換不動盤面；非相鄰不可交換', () => {
  const b = base(); const r = M.resolveSwap(b, { r: 0, c: 0 }, { r: 0, c: 1 }, M.seededRng(1));
  assert.equal(r.valid, false); assert.deepEqual(r.board, b);
  assert.equal(M.resolveSwap(b, { r: 0, c: 0 }, { r: 2, c: 2 }, M.seededRng(1)).valid, false);
});
t('只有主屬性出手：其他顏色可消、傷害 0', () => {
  const team = [{ id: 'x1', element: 'FIRE', attack: 60, hp: 50 }, { id: 'x2', element: 'WATER', attack: 60, hp: 50 }];
  const step = (el) => [{ chain: 1, groups: [{ element: el, cells: [], size: 3, longest: 3, runs: [3] }], boardAfter: [] }];
  const h1 = M.computeHits(step('EARTH'), team, 'AIR'); assert.equal(h1.length, 1); assert.equal(h1[0].amount, 0); assert.equal(h1[0].attackerId, null);
  const h2 = M.computeHits(step('FIRE'), team, 'AIR'); assert.equal(h2.length, 1); assert.equal(h2[0].attackerId, 'x1'); assert.ok(h2[0].amount > 0);
  const dead = [{ id: 'x1', element: 'FIRE', attack: 60, hp: 0 }]; assert.equal(M.computeHits(step('FIRE'), dead, 'AIR')[0].amount, 0);
});
t('數值凍結：打完 200 步，60 張卡面數值不變', () => {
  const cards = playableCards(); assert.equal(cards.length, 60);
  const snap = JSON.stringify(cards.map((c) => [c.id, c.cost, c.stats]));
  const team = cards.slice(0, 3).map((c) => ({ id: c.id, element: c.element, attack: c.stats.attack, hp: c.stats.hp }));
  const rng = M.seededRng(9); let b = M.generateBoard(rng);
  for (let i = 0; i < 200; i++) { const [a, d] = M.findValidMoves(b)[0]; const r = M.resolveSwap(b, a, d, rng); M.computeHits(r.steps, team, cards[5].element); b = r.board; }
  assert.equal(JSON.stringify(cards.map((c) => [c.id, c.cost, c.stats])), snap);
});
t('clear 事件含 element/count/cascadeStep/eligible', () => {
  const steps=[{chain:1,groups:[{element:'FIRE',size:3,longest:3,cells:[]},{element:'AIR',size:3,longest:3,cells:[]}]}];
  const team=[{id:'f',element:'FIRE',attack:100,hp:10}];
  const hits=M.computeHits(steps,team,'EARTH');
  const cl=M.buildEvents(steps,hits).filter((e)=>e.type==='clear');
  assert.deepEqual(cl.map((e)=>[e.element,e.count,e.cascadeStep,e.eligible]),[['FIRE',3,1,true],['AIR',3,1,false]]);
});
t('選取的神獸優先攻擊', () => {
  const team=[{id:'a',element:'FIRE',attack:10,hp:5},{id:'b',element:'FIRE',attack:20,hp:5},{id:'c',element:'FIRE',attack:20,hp:0}];
  assert.deepEqual(M.eligibleAttackers(team,'FIRE','b').map((f)=>f.id),['b','a']);
  assert.deepEqual(M.eligibleAttackers(team,'FIRE','c').map((f)=>f.id),['a','b']);
  assert.deepEqual(M.eligibleAttackers(team,'FIRE').map((f)=>f.id),['a','b']);
  const steps=[{chain:1,groups:[{element:'FIRE',size:3,longest:3,cells:[]}]}];
  assert.equal(M.computeHits(steps,team,'EARTH','b')[0].attackerId,'b');
});
t('魔珠設定：開啟生成、4 顆起、剛好 5 顆五珠技、普通威力上限 10', () => {
  assert.equal(M.MAGIC_ORB_SPAWN_ENABLED, true); assert.equal(M.MAGIC_ORB_MIN_LENGTH, 4); assert.equal(M.SKILL5_LENGTH, 5);
  assert.equal(M.NORMAL_POWER_CAP, 10); assert.equal(M.normalPower(14), 10); assert.equal(M.normalPower(7), 7); assert.equal(M.TEAM_SIZE, 5);
  // 直線組（掉落連鎖）沒有 power 時仍發 magicOrbCandidate
  const mk = (n) => [{ chain: 2, groups: [{ element: 'FIRE', cells: [], size: n, longest: n, runs: [n] }], boardAfter: [] }];
  assert.equal(M.buildEvents(mk(3), []).filter((e) => e.type === 'magicOrbCandidate').length, 0);
  assert.equal(M.buildEvents(mk(4), []).filter((e) => e.type === 'magicOrbCandidate').length, 1);
});
// 拖曳測試盤：第 0 列放一條蛇形同色路徑
const snake = (el, cells) => { const b = base(); cells.forEach(([r, c]) => { b[r][c] = el; }); return b; };
const P = (cells) => cells.map(([r, c]) => ({ r, c }));
t('拖曳：相鄰、同色、不重複才可延伸；斜角不行', () => {
  const b = snake('FIRE', [[0, 0], [0, 1], [1, 1]]);
  assert.equal(M.canExtend(b, P([[0, 0]]), { r: 0, c: 1 }), true);
  assert.equal(M.canExtend(b, P([[0, 0]]), { r: 1, c: 1 }), false, '斜角');
  assert.equal(M.canExtend(b, P([[0, 0], [0, 1]]), { r: 0, c: 0 }), false, '走回頭');
  assert.equal(M.canExtend(b, P([[0, 0], [0, 1]]), { r: 0, c: 2 }), false, '異色');
  assert.equal(M.canExtend(b, P([[0, 0], [0, 1]]), { r: 1, c: 1 }), true, '轉彎可以');
});
t('拖曳：未滿 3 顆取消、盤面不變', () => {
  const b = snake('FIRE', [[0, 0], [0, 1]]);
  const r = M.resolveDrag(b, P([[0, 0], [0, 1]]), M.seededRng(1));
  assert.equal(r.valid, false); assert.equal(r.reason, 'short'); assert.deepEqual(r.board, b);
  assert.equal(M.resolveDrag(b, P([[0, 0], [1, 1], [0, 2]]), M.seededRng(1)).reason, 'path');
});
t('拖曳 3 顆：消除、不生成魔法珠、事件格式不變', () => {
  const b = snake('FIRE', [[1, 0], [1, 1], [2, 1]]);
  const r = M.resolveDrag(b, P([[1, 0], [1, 1], [2, 1]]), M.seededRng(2));
  assert.equal(r.valid, true); assert.equal(r.chainLength, 3); assert.equal(r.magicSpawn, null); assert.equal(r.skill5, false);
  assert.equal(r.steps[0].groups[0].size, 3); assert.equal(r.steps[0].groups[0].power, 3);
  assert.equal(r.magic.flat().filter((x) => x > 0).length, 0);
  const team = [{ id: 'f', element: 'FIRE', attack: 100, hp: 10 }];
  const cl = M.buildEvents(r.steps, M.computeHits(r.steps, team, 'EARTH'), { magicSpawn: r.magicSpawn }).filter((e) => e.type === 'clear')[0];
  assert.deepEqual([cl.element, cl.count, cl.cascadeStep, cl.eligible], ['FIRE', 3, 1, true]);
  assert.equal(cl.magic, undefined); assert.equal(cl.skill5, undefined);
});
t('拖曳 4 顆：在放開那格（掉落後）生成魔法珠，威力 4', () => {
  const cells = [[4, 0], [4, 1], [4, 2], [4, 3]];
  const b4 = snake('WATER', cells); b4[0][4] = b4[0][5] = b4[0][6] = 'FIRE'; // 右上留一組可拖，避免重洗盤
  const r = M.resolveDrag(b4, P(cells), M.seededRng(3)); assert.equal(r.reshuffled, false);
  assert.ok(r.magicSpawn); assert.equal(r.magicSpawn.power, 4); assert.equal(r.magicSpawn.element, 'WATER');
  assert.equal(r.magicSpawn.r, 4); assert.equal(r.magicSpawn.c, 3);
  assert.equal(r.skill5, false);
  if (r.steps.length === 1) { assert.equal(r.magic[4][3], 4); assert.equal(r.board[4][3], 'WATER'); }
  const ev = M.buildEvents(r.steps, [], { magicSpawn: r.magicSpawn });
  assert.equal(ev.filter((e) => e.type === 'magicOrbSpawn').length, 1);
  assert.equal(ev.filter((e) => e.type === 'magicOrbCandidate' && e.chain === 1).length, 0);
});
t('拖曳剛好 5 顆：五珠技＋能量集滿；6 顆不是五珠技', () => {
  const c5 = [[0, 0], [0, 1], [0, 2], [1, 2], [1, 3]];
  const r5 = M.resolveDrag(snake('EARTH', c5), P(c5), M.seededRng(4));
  assert.equal(r5.skill5, true); assert.equal(r5.magicSpawn.power, 5);
  const g = M.energyGains(r5).find((x) => x.element === 'EARTH'); assert.equal(g.fill, true);
  assert.equal(M.applyEnergy(0, g), M.ENERGY_MAX);
  assert.equal(r5.steps[0].groups[0].skill5, true);
  const c6 = [...c5, [1, 4]];
  const r6 = M.resolveDrag(snake('EARTH', c6), P(c6), M.seededRng(4));
  assert.equal(r6.skill5, false); assert.equal(r6.magicSpawn.power, 6);
});
t('連線不設上限、普通威力最多 10；魔法珠威力不設上限', () => {
  const cells = []; for (let c = 0; c < 7; c++) cells.push([0, c]); for (let c = 6; c >= 0; c--) cells.push([1, c]); // 14 顆蛇形
  const b = snake('AIR', cells); const r = M.resolveDrag(b, P(cells), M.seededRng(5));
  assert.equal(r.valid, true); assert.equal(r.chainLength, 14); assert.equal(r.steps[0].groups[0].power, 10);
  assert.equal(r.magicSpawn.power, 14, '魔法珠威力＝連線顆數，不受 10 上限');
  // 含威力 14 的魔法珠再連 3 顆：power＝2（普通）＋14（魔法）
  const b2 = snake('FIRE', [[2, 0], [2, 1], [2, 2]]); const m2 = M.emptyMagic(b2); m2[2][1] = 14;
  const r2 = M.resolveDrag(b2, P([[2, 0], [2, 1], [2, 2]]), M.seededRng(6), m2);
  assert.equal(r2.steps[0].groups[0].power, 16); assert.equal(r2.steps[0].groups[0].magic, true); assert.equal(r2.steps[0].groups[0].magicPower, 14);
  assert.equal(r2.magicTriggered.length, 1);
  assert.equal(M.energyGains(r2).find((x) => x.element === 'FIRE').fill, true, '魔法珠被消→對應屬性卡集滿');
  assert.ok(M.hitAmount(100, 16, 1, 'FIRE', 'FIRE') > M.hitAmount(100, 10, 1, 'FIRE', 'FIRE'));
});
t('屬性分工：消哪色充哪色，每顆 ENERGY_PER_ORB', () => {
  const b = snake('SPACE', [[3, 0], [3, 1], [3, 2]]);
  const r = M.resolveDrag(b, P([[3, 0], [3, 1], [3, 2]]), M.seededRng(7));
  const g = M.energyGains(r); const sp = g.find((x) => x.element === 'SPACE');
  assert.ok(sp.gain >= 3 * M.ENERGY_PER_ORB); assert.equal(sp.fill, false);
  assert.equal(M.applyEnergy(95, { element: 'SPACE', gain: 30, fill: false }), M.ENERGY_MAX);
});
t('拖曳後盤面仍有可拖步；300 盤生成都可拖', () => {
  for (let s = 1; s <= 300; s++) { const b = M.generateDragBoard(M.seededRng(s)); assert.ok(M.hasDragMove(b)); assert.equal(M.findGroups(b).length, 0); }
  const rng = M.seededRng(11); let b = M.generateDragBoard(rng); let m = M.emptyMagic(b);
  for (let i = 0; i < 150; i++) {
    // 找一條 3 顆的路徑
    let path = null;
    outer: for (let r = 0; r < b.length; r++) for (let c = 0; c < b[0].length; c++) {
      const dfs = (p) => { if (p.length === 3) return p; const l = p[p.length - 1];
        for (const q of [{ r: l.r + 1, c: l.c }, { r: l.r - 1, c: l.c }, { r: l.r, c: l.c + 1 }, { r: l.r, c: l.c - 1 }]) if (M.canExtend(b, p, q)) { const x = dfs([...p, q]); if (x) return x; } return null; };
      path = dfs([{ r, c }]); if (path) break outer;
    }
    assert.ok(path, '應有可拖路徑');
    const res = M.resolveDrag(b, path, rng, m); assert.equal(res.valid, true); b = res.board; m = res.magic;
    assert.ok(M.hasDragMove(b));
  }
});

t('無步可走洗盤時魔法珠原地保留（位置、顏色、威力）', () => {
  const b = Array.from({ length: 5 }, (_, r) => Array.from({ length: 7 }, (_, c) => E[(r * 2 + c) % 5]));
  assert.equal(M.hasDragMove(b), false);
  const m = M.emptyMagic(b); m[1][1] = 4; m[3][4] = 7;
  const r = M.reshuffleKeepMagic(b, m, M.seededRng(9));
  assert.equal(r.magic[1][1], 4); assert.equal(r.magic[3][4], 7);
  assert.equal(r.board[1][1], b[1][1]); assert.equal(r.board[3][4], b[3][4]);
  assert.equal(r.magic.flat().filter((x) => x > 0).length, 2);
  assert.equal(M.hasDragMove(r.board), true);
  assert.equal(M.findGroups(r.board).length, 0);
});
console.log(`beast-match3-core: ${pass} 項通過`);
