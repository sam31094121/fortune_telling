/**
 * 四角形多重宇宙的鋪排守門（2026-09-20）
 *
 * 鎖住三件事：
 * 1. 一個單元就是同事那顆正八胞體投影：32 根邊，12 外、12 內、8 連接，顏色不得改。
 * 2. 外立方投影後邊長 2、六個面都是正方形——「全部都是四角形」要算得出來，不是用講的。
 * 3. 間距等於邊長，所以相鄰單元面貼面：共用那一面的四條邊，不重疊也不留縫。
 */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');

const path = require('node:path');

/** 直接跑 .ts：相對匯入照檔案位置解析，套件（three）交給 node 自己 require。 */
function load(file) {
  const source = fs.readFileSync(file, 'utf8');
  const module = { exports: {} };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const require_ = (id) => (id.startsWith('.') ? load(path.join(path.dirname(file), `${id}.ts`)) : require(id));
  new Function('exports', 'module', 'require', compiled)(module.exports, module, require_);
  return module.exports;
}

const { CELL_SPACING, ROD_WIDTH, cellRods, multiverseCells, multiverseRods } = load('components/model-lab/multiverseMath.ts');
const { PROJECTION } = load('components/model-lab/projectionMath.ts');
const { BEAM, ENTRANCE_SCALE } = load('components/model-lab/latticeMath.ts');
const { CAVITY_PITCH, CAVITY_LINE_WIDTH } = load('components/model-lab/models/taiji/squareCavity.ts');

const key = (point) => point.map((v) => v.toFixed(6)).join(',');
const edgeKey = (rod) => [key(rod.a), key(rod.b)].sort().join('|');
const length = (rod) => Math.hypot(...rod.a.map((v, i) => v - rod.b[i]));
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-9, `${message}：${a} != ${b}`);

// 1. 單元結構與顏色
const rods = cellRods();
assert.equal(rods.length, 32, '一個單元要有 32 根邊');
const counts = rods.reduce((acc, rod) => ({ ...acc, [rod.kind]: (acc[rod.kind] ?? 0) + 1 }), {});
assert.deepEqual(counts, { outer: 12, inner: 12, bridge: 8 }, '12 外、12 內、8 連接');
assert.deepEqual(
  [...new Set(rods.map((r) => r.color))].sort(),
  [PROJECTION.inner, PROJECTION.outer, PROJECTION.bridge].sort(),
  '顏色只能來自 PROJECTION，不得在這裡另外指定',
);
for (const rod of rods) assert.ok([...rod.a, ...rod.b].every(Number.isFinite), '座標不得有 NaN');

// 2. 外立方：邊長 2、頂點落在 ±1、六個面都是正方形
const outer = rods.filter((rod) => rod.kind === 'outer');
for (const rod of outer) {
  close(length(rod), CELL_SPACING, '外立方邊長要等於間距');
  for (const value of [...rod.a, ...rod.b]) close(Math.abs(value), 1, '外立方頂點要落在 ±1');
}
const outerVertices = [...new Set(outer.flatMap((rod) => [key(rod.a), key(rod.b)]))];
assert.equal(outerVertices.length, 8, '外立方要有 8 個頂點');
let squareFaces = 0;
for (let axis = 0; axis < 3; axis += 1) {
  for (const sign of [-1, 1]) {
    const onFace = outer.filter((rod) => Math.abs(rod.a[axis] - sign) < 1e-9 && Math.abs(rod.b[axis] - sign) < 1e-9);
    assert.equal(onFace.length, 4, '每個面由四條邊圍成');
    for (const rod of onFace) close(length(rod), CELL_SPACING, '面上的四條邊等長');
    // 四條邊兩兩垂直：同一面上取方向向量，互相垂直或平行
    const directions = onFace.map((rod) => rod.a.map((v, i) => v - rod.b[i]));
    for (const d1 of directions) {
      for (const d2 of directions) {
        const dot = d1.reduce((sum, v, i) => sum + v * d2[i], 0);
        const parallel = Math.abs(Math.abs(dot) - CELL_SPACING * CELL_SPACING) < 1e-9;
        assert.ok(parallel || Math.abs(dot) < 1e-9, '面上的邊只能互相平行或垂直（正方形）');
      }
    }
    squareFaces += 1;
  }
}
assert.equal(squareFaces, 6, '外立方六個面都要檢查過');

// 3. 鋪排：單元數、面貼面、不重疊
close(CELL_SPACING, 2, '投影後外立方邊長');
for (const radius of [0, 1, 2]) {
  const cells = multiverseCells(radius);
  assert.equal(cells.length, (2 * radius + 1) ** 3, '單元數要是 (2r+1)³');
  assert.equal(new Set(cells.map(key)).size, cells.length, '單元位置不得重複');
  assert.ok(cells.some((c) => c.every((v) => v === 0)), '原點單元要在裡面');
  assert.equal(multiverseRods(radius).length, cells.length * 32, '每個單元 32 根邊');
}

// 相鄰兩個單元：外立方剛好共用一整面的四條邊，其餘都不重疊
const single = new Set(cellRods().map(edgeKey));
const neighbour = cellRods().map((rod) => ({ ...rod, a: [rod.a[0] + CELL_SPACING, rod.a[1], rod.a[2]], b: [rod.b[0] + CELL_SPACING, rod.b[1], rod.b[2]] }));
const shared = neighbour.filter((rod) => single.has(edgeKey(rod)));
assert.equal(shared.length, 4, '相鄰單元只共用那一面的四條邊');
for (const rod of shared) {
  assert.equal(rod.kind, 'outer', '共用的必須是外立方的邊');
  close(rod.a[0], 1, '共用面落在 x=+1');
  close(rod.b[0], 1, '共用面落在 x=+1');
}
const gap = Math.min(...neighbour.filter((rod) => !single.has(edgeKey(rod))).map((rod) => Math.min(rod.a[0], rod.b[0])));
assert.ok(gap >= 1 - 1e-9, '鄰居的其餘邊都在共用面之外，不會穿進來');

// 4. 線寬借太極內壁的同一個比例：線寬占格距的比例，兩邊必須一模一樣（1:1 貼面）
close(CAVITY_LINE_WIDTH / CAVITY_PITCH, BEAM, '太極內壁：線寬占格距的比例');
close(ROD_WIDTH / CELL_SPACING, BEAM, '多重宇宙：線寬占格距的比例要跟太極內壁一致');
close(CAVITY_PITCH, ENTRANCE_SCALE, '太極內壁格距就是方口尺寸');
assert.ok(ROD_WIDTH < CELL_SPACING / 20, '線只能是細線，不能粗到吃掉格子');

console.log('PASS: 一單元 32 邊（12 外 12 內 8 連接）、顏色來自 PROJECTION；外立方邊長 2、六面皆正方形；間距＝邊長，相鄰單元只共用一面四條邊，不重疊不留縫；線寬占格距的比例與太極方形內壁 1:1。');
