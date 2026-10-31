/** 斜連（per-mode）：medium diagonal:false 只認橫直；hard45 diagonal:true 四方向（橫、直、↘、↙）都認。 */
const assert = require('node:assert/strict');
const M = require('../.beast-game-build/lib/beast-game/match3');
let pass = 0; const t = (n, f) => { f(); pass++; console.log('  ok ' + n); };
const H = M.MATCH3_MODES.hard45, MED = M.MATCH3_MODES.medium;
const EL = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'];
t('七顆普通珠生成單一盾牌；同色再次連入清全盤該色；簡單版不清場', () => {
  for (const element of EL) {
    const b = Array.from({length:7}, (_,r) => Array.from({length:7}, (_,c) => EL[(r*2+c)%5]));
    b[6] = Array(7).fill(element);
    const path = b[6].map((_,c) => ({r:6,c}));
    const born = M.resolveDrag(b,path,M.seededRng(45),M.emptyMagic(b),1,true,true);
    assert.equal(born.valid,true);
    assert.equal(born.magic.flat().filter(n=>n>=7).length,1);
    assert.equal(born.magicSpawn.power,7);
    const six = M.resolveDrag(b,path.slice(0,6),M.seededRng(45),M.emptyMagic(b),1,true,true);
    assert.equal(six.magic.flat().filter(n=>n>=7).length,0);
    const magic = M.emptyMagic(b); magic[6][2]=7;
    const trigger = M.resolveDrag(b,path.slice(0,3),M.seededRng(45),magic,1,true,true);
    assert.equal(trigger.magicSpawn,null);
    assert.equal(trigger.steps[0].groups[0].size,b.flat().filter(e=>e===element).length);
    assert.ok(trigger.steps[0].groups[0].cells.every(p=>b[p.r][p.c]===element));
    assert.equal(trigger.magic.flat().filter(n=>n>=7).length,0);
    const simple = M.resolveDrag(b,path.slice(0,3),M.seededRng(45),magic,1,false,false);
    assert.equal(simple.steps[0].groups[0].size,3);
  }
});
t('困難斜連拒絕穿線、重複珠及重疊邊；合法轉彎保留', () => {
  const b = Array.from({length: 3}, () => Array(3).fill('FIRE'));
  const crossing = [{r:0,c:0},{r:1,c:1},{r:0,c:1},{r:1,c:0}];
  for (const path of [crossing, [...crossing].reverse()]) {
    assert.equal(M.canExtend(b,path.slice(0,-1),path.at(-1),true),false);
    assert.equal(M.isValidPath(b,path,true),false);
    const result = M.resolveDrag(b,path,M.seededRng(9),M.emptyMagic(b),50,true);
    assert.equal(result.valid,false);
    assert.deepEqual(result.board,b);
  }
  assert.equal(M.isValidPath(b,[{r:0,c:0},{r:0,c:1},{r:0,c:0}],true),false);
  assert.equal(M.isValidPath(b,[{r:0,c:0},{r:1,c:1},{r:2,c:1},{r:2,c:2}],true),true);
  assert.equal(M.isValidPath(b,[{r:0,c:0},{r:0,c:1},{r:1,c:1}],false),true);
});
// 棋盤底：依 (r*2+c)%5 上色（橫、直、兩條斜線都不會有 3 連），再把指定 3 格塗成 X＝'FIRE'
const base = (rows, cols) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => EL[(r * 2 + c) % 5]));
const paint = (b, cells, e) => { cells.forEach(([r, c]) => { b[r][c] = e; }); return b; };
const DIRS = { 橫: [0, 1], 直: [1, 0], '↘': [1, 1], '↙': [1, -1] };
const lineCells = (r, c, [dr, dc]) => [0, 1, 2].map((i) => [r + dr * i, c + dc * i]);
t('mode 旗標：medium diagonal=false、hard45 diagonal=true', () => { assert.equal(MED.diagonal, false); assert.equal(H.diagonal, true); });
t('底盤自身在四方向都沒有 3 連', () => { for (const m of [MED, H]) { const b = base(m.rows, m.cols); assert.equal(M.findGroups(b, true).length, 0); assert.equal(M.findGroups(b, false).length, 0); } });
for (const m of [MED, H]) for (const [name, d] of Object.entries(DIRS)) {
  const start = d[1] === -1 ? [1, 4] : [1, 1];
  const cells = lineCells(start[0], start[1], d);
  const diag = name === '↘' || name === '↙';
  const want = !diag || m.diagonal; // medium 拒斜線
  t(`${m.id}｜直線判定 ${name}：${want ? '接受' : '拒絕'}`, () => {
    const b = paint(base(m.rows, m.cols), cells, 'FIRE');
    const g = M.findGroups(b, m.diagonal).filter((x) => x.element === 'FIRE' && x.size >= 3);
    assert.equal(g.length > 0, want);
  });
  t(`${m.id}｜拖曳路徑 ${name}：${want ? '接受' : '拒絕'}`, () => {
    const b = paint(base(m.rows, m.cols), cells, 'FIRE'); const path = cells.map(([r, c]) => ({ r, c }));
    assert.equal(M.isValidPath(b, path, m.diagonal), want);
    const res = M.resolveDrag(b, path, M.seededRng(7), M.emptyMagic(b), 50, m.diagonal);
    assert.equal(res.valid, want);
    if (want) { assert.equal(res.chainLength, 3); assert.equal(res.board.length, m.rows); res.board.forEach((row) => assert.equal(row.length, m.cols)); }
    else assert.equal(res.reason, 'path');
  });
}
t('hard45｜↗↙↖↘ 每一步都算相鄰；medium 斜角不算', () => {
  for (const [dr, dc] of [[-1, 1], [1, -1], [-1, -1], [1, 1]]) {
    assert.equal(M.isAdjacent({ r: 2, c: 2 }, { r: 2 + dr, c: 2 + dc }, true), true);
    assert.equal(M.isAdjacent({ r: 2, c: 2 }, { r: 2 + dr, c: 2 + dc }, false), false);
  }
  assert.equal(M.isAdjacent({ r: 2, c: 2 }, { r: 4, c: 4 }, true), false);
  assert.equal(M.isAdjacent({ r: 2, c: 2 }, { r: 2, c: 2 }, true), false);
});
t('hard45｜混合方向長路徑（→↘↗↓）5 顆＝五珠技＋魔法珠', () => {
  const b = base(H.rows, H.cols); const cells = [[0, 0], [0, 1], [1, 2], [0, 3], [1, 3]]; paint(b, cells, 'WATER');
  const res = M.resolveDrag(b, cells.map(([r, c]) => ({ r, c })), M.seededRng(3), M.emptyMagic(b), 50, true);
  assert.ok(res.valid); assert.equal(res.skill5, true); assert.ok(res.magicSpawn); assert.equal(res.magicSpawn.power, 5);
});
t('300 seed｜hard45 開局四方向都無現成 3 連、且有可拖步（8 方向）', () => {
  for (let s = 1; s <= 300; s++) { const b = M.generateDragBoard(M.seededRng(s), H.rows, H.cols, true);
    assert.equal(M.findGroups(b, true).length, 0); assert.ok(M.hasDragMove(b, true)); }
});
t('300 seed｜medium 預設呼叫與 diagonal=false 完全相同（行為不變）', () => {
  for (let s = 1; s <= 300; s++) { const a = M.generateDragBoard(M.seededRng(s), MED.rows, MED.cols); const b = M.generateDragBoard(M.seededRng(s), MED.rows, MED.cols, false);
    assert.deepEqual(a, b); }
});
t('hard45｜連鎖補珠後的斜線 3 連會被消（cascade 含斜線）', () => {
  let found = 0;
  for (let s = 1; s <= 600; s++) { const rng = M.seededRng(s); const b = M.generateDragBoard(rng, H.rows, H.cols, true);
    let p = null;
    const N8 = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    for (let r = 0; r < 5 && !p; r++) for (let c = 0; c < 9 && !p; c++) { const st = [[{ r, c }]];
      while (st.length && !p) { const q = st.pop(); if (q.length === 3) { p = q; break; } const l = q[q.length - 1];
        for (const [dr, dc] of N8) { const n = { r: l.r + dr, c: l.c + dc }; if (M.canExtend(b, q, n, true)) st.push([...q, n]); } } }
    if (!p) continue; const res = M.resolveDrag(b, p, rng, M.emptyMagic(b), 50, true);
    if (res.steps.length > 1 && M.findRuns(res.steps[0].boardAfter, true).some((x) => x.dir === 'diag' || x.dir === 'anti')) found++;
    if (!res.reshuffled) assert.equal(M.findGroups(res.board, true).length, 0, '結算後盤面不留現成 3 連');
  }
  assert.ok(found > 0, '600 seed 內至少出現一次斜線連鎖');
});
t('不變規則：最少 3、上限 10、≥4 魔法珠、剛好 5 五珠技、能量、反擊間隔、連線公式', () => {
  assert.equal(M.MATCH3_MIN_RUN, 3); assert.equal(M.NORMAL_POWER_CAP, 10); assert.equal(M.MAGIC_ORB_MIN_LENGTH, 4); assert.equal(M.SKILL5_LENGTH, 5);
  assert.equal(M.ENERGY_PER_ORB, 10); assert.equal(M.ENERGY_MAX, 100); assert.equal(MED.counterEvery, 3); assert.equal(H.counterEvery, 1);
  assert.equal(M.linkDamage([10, 10]), 60); assert.equal(M.linkDamage([10, 10, 10]), 135);
});
console.log('beast-match3-diagonal: ' + pass + ' passed');
