/**
 * 寶珠精修測試：普通威力上限 10、魔法珠威力、剛好 5 顆＝五珠技＋魔法珠、落珠補珠與連鎖、
 * 畫面分級與節奏設定、新樣式只用既有色票（不新增 hex）。執行前需 node scripts/beast-build.mjs。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = '../.beast-game-build/lib/beast-game/';
const M = require(B + 'match3');
const V = require(B + 'match3/bead-visual-config');
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('  ok ' + name); };
const base = () => Array.from({ length: 5 }, (_, r) => Array.from({ length: 7 }, (_, c) => ((r + c) % 2 ? 'AIR' : 'SPACE')));
const snake = (el, cells) => { const b = base(); cells.forEach(([r, c]) => { b[r][c] = el; }); return b; };
const P = (cells) => cells.map(([r, c]) => ({ r, c }));
const full = (b) => b.length === 5 && b.every((row) => row.length === 7 && row.every((x) => M.MATCH3_ORB_ELEMENTS.includes(x)));

t('普通威力上限 10：拖 12 顆，第一段威力 10，魔法珠威力 12 不設上限', () => {
  const c12 = [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,6],[1,5],[1,4],[1,3],[1,2]];
  const r = M.resolveDrag(snake('EARTH', c12), P(c12), M.seededRng(7));
  assert.equal(r.valid, true); assert.equal(r.chainLength, 12);
  assert.equal(r.steps[0].groups[0].power, M.NORMAL_POWER_CAP); assert.equal(M.NORMAL_POWER_CAP, 10);
  assert.equal(r.magicSpawn.power, 12); assert.equal(r.skill5, false);
  for (const n of [10, 11]) { const c = c12.slice(0, n); assert.equal(M.resolveDrag(snake('EARTH', c), P(c), M.seededRng(7)).steps[0].groups[0].power, 10); }
});
t('magicPower：路徑含威力 6 的魔法珠，組威力＝普通 2＋魔法 6', () => {
  const c3 = [[2,0],[2,1],[2,2]];
  const b = snake('FIRE', c3); const m = M.emptyMagic(b); m[2][1] = 6;
  const r = M.resolveDrag(b, P(c3), M.seededRng(3), m);
  const g = r.steps[0].groups[0];
  assert.equal(g.magic, true); assert.equal(g.magicPower, 6); assert.equal(g.power, 2 + 6);
  assert.equal(r.magicTriggered.length, 1); assert.equal(r.magicTriggered[0].power, 6);
  const gains = M.energyGains(r); assert.ok(gains.some((x) => x.element === 'FIRE'));
});
t('剛好 5 顆＝五珠技＋威力 5 魔法珠；4 顆只有魔法珠；6 顆不是五珠技', () => {
  const c6 = [[0,0],[0,1],[0,2],[1,2],[1,3],[1,4]];
  const run = (n) => { const c = c6.slice(0, n); return M.resolveDrag(snake('WATER', c), P(c), M.seededRng(4)); };
  const r5 = run(5); assert.equal(r5.skill5, true); assert.equal(r5.magicSpawn.power, 5); assert.deepEqual([r5.magicSpawn.r, r5.magicSpawn.c], [1, 3]);
  const r4 = run(4); assert.equal(r4.skill5, false); assert.equal(r4.magicSpawn.power, 4);
  const r6 = run(6); assert.equal(r6.skill5, false); assert.equal(r6.magicSpawn.power, 6);
  const r3 = run(3); assert.equal(r3.magicSpawn, null); assert.equal(r3.skill5, false);
});
t('落珠補珠：每段後盤面補滿，連鎖段都是直線 3+，最後盤面無現成連線且有可走步', () => {
  let cascades = 0;
  for (let s = 1; s <= 400; s++) {
    const rng = M.seededRng(s); const b = M.generateDragBoard(rng);
    let path = null;
    outer: for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
      const el = b[r][c]; const p = [{ r, c }];
      const dfs = () => { if (p.length === 3) return true; const l = p[p.length - 1];
        for (const [dr, dc] of [[0,1],[1,0],[0,-1],[-1,0]]) { const q = { r: l.r + dr, c: l.c + dc };
          if (b[q.r]?.[q.c] === el && !p.some((x) => x.r === q.r && x.c === q.c)) { p.push(q); if (dfs()) return true; p.pop(); } } return false; };
      if (dfs()) { path = p; break outer; } }
    if (!path) continue;
    const res = M.resolveDrag(b, path, rng);
    assert.equal(res.valid, true);
    res.steps.forEach((st) => assert.ok(full(st.boardAfter), 'boardAfter 補滿'));
    res.steps.slice(1).forEach((st) => st.groups.forEach((g) => assert.ok(g.size >= 3)));
    assert.ok(full(res.board)); assert.equal(M.findGroups(res.board).length, 0);
    if (res.steps.length > 1) cascades++;
  }
  assert.ok(cascades > 0, '400 局內至少出現一次連鎖');
});
t('畫面分級：3 一般、4 魔珠、5 五珠技、10+ 上限；徽章隨 N 長大；節奏有上限', () => {
  assert.deepEqual([2, 3, 4, 5, 6, 9, 10, 14].map((n) => V.linkTier(n)), ['short', 'normal', 'magic', 'skill5', 'magic', 'magic', 'cap', 'cap']);
  for (let n = 3; n < 12; n++) assert.ok(V.badgeScale(n + 1) >= V.badgeScale(n));
  assert.ok(V.stepDuration(30) <= V.BEAD_TIMING.popStaggerMaxMs + V.BEAD_TIMING.popMs + V.BEAD_TIMING.beatMs);
  assert.ok(V.magicIntensity(4) < V.magicIntensity(8) && V.magicIntensity(40) <= 1);
});
t('新樣式只用既有色票（不新增 hex）', () => {
  const root = path.join(__dirname, '..');
  const hexes = (f) => new Set((fs.readFileSync(path.join(root, f), 'utf8').match(/#[0-9a-fA-F]{6}\b/g) || []).map((x) => x.toLowerCase()));
  const allowed = new Set([...hexes('components/battlefield/Match3Board.module.css'), ...hexes('components/battlefield/BeastCardTile.module.css'), ...hexes('lib/beast-game/element-palette.ts')]);
  for (const f of ['components/battlefield/bead/BeadPolish.module.css', 'components/battlefield/bead/TeamPicker.module.css', 'lib/beast-game/match3/bead-visual-config.ts'])
    for (const h of hexes(f)) assert.ok(allowed.has(h), `${f} 用了新色 ${h}`);
});
console.log(`bead-polish: ${pass} 項通過`);