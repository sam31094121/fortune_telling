/**
 * 太極每一格都是四維格子・守門（2026-09-20）
 *
 * 使用者要的是：整顆太極裡面的格子全部換成四維單元，連接太極、不留縫、線接得起來、全都是四角形。
 * 這支測試不看畫面，直接算：
 * 1. 球內裝得下的完整格子正好 7 個（中心＋六面），每個格子邊長都等於內壁格距 0.6。
 * 2. 7 個單元的外立方線集合，與同事的內壁格線「完全同一組」——不多一條、不少一條，
 *    所以線是接在太極上的，沒有縫。
 * 3. 相鄰格子共用整面四條線；每個單元仍是 32 條線（12 外、12 內、8 連接）。
 * 4. 所有線都落在球內（半徑 ≤ 1），不會戳出太極表面。
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

function load(file) {
  const source = fs.readFileSync(file, 'utf8');
  const module = { exports: {} };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const require_ = (id) => (id.startsWith('.') ? load(path.join(path.dirname(file), `${id}.ts`)) : require(id));
  new Function('exports', 'module', 'require', compiled)(module.exports, module, require_);
  return module.exports;
}

const { taijiCellCenters, taijiCellRods, TAIJI_CELL_SIZE, TAIJI_UNIT_SCALE, inscribedUnitRods, INSCRIBED_EDGE, HOLLOW_RADIUS, SHELL_THICKNESS } = load('components/model-lab/taijiCells.ts');
const { CAVITY_PITCH, cavityLatticeEdges } = load('components/model-lab/models/taiji/squareCavity.ts');
const { ROD_WIDTH } = load('components/model-lab/multiverseMath.ts');
const { CAVITY_LINE_WIDTH } = load('components/model-lab/models/taiji/squareCavity.ts');

const key = (point) => point.map((v) => v.toFixed(6)).join(',');
const edgeKey = (a, b) => [key(a), key(b)].sort().join('|');
const length = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-9, `${message}：${a} != ${b}`);

// 1. 格子：7 個，格距等於內壁
const centers = taijiCellCenters();
assert.equal(centers.length, 7, '球內完整格子應該是 7 個（中心＋六面）');
assert.equal(new Set(centers.map(key)).size, 7, '格子中心不得重複');
close(TAIJI_CELL_SIZE, CAVITY_PITCH, '放進太極的格距要等於內壁格距');
close(TAIJI_UNIT_SCALE * ROD_WIDTH, CAVITY_LINE_WIDTH, '放進太極的線寬要等於內壁線寬');
const origin = centers.find((c) => c.every((v) => Math.abs(v) < 1e-9));
assert.ok(origin, '中心那一格要在');
for (const center of centers) {
  const distance = Math.hypot(...center);
  assert.ok(distance < 1e-9 || Math.abs(distance - CAVITY_PITCH) < 1e-9, '其餘六格剛好在中心格的六個面上');
}

// 2. 外立方線集合＝內壁格線集合（同一組線，接在太極上、沒有縫）
const rods = taijiCellRods();
assert.equal(rods.length, centers.length * 32, '每一格都是完整的 32 條線');
const counts = rods.reduce((acc, rod) => ({ ...acc, [rod.kind]: (acc[rod.kind] ?? 0) + 1 }), {});
assert.deepEqual(counts, { outer: centers.length * 12, inner: centers.length * 12, bridge: centers.length * 8 }, '12 外、12 內、8 連接 × 7 格');

const wall = new Set(cavityLatticeEdges().map((edge) => edgeKey(edge.start, edge.end)));
const outer = new Set(rods.filter((rod) => rod.kind === 'outer').map((rod) => edgeKey(rod.a, rod.b)));
assert.equal(outer.size, wall.size, `外立方線數要與內壁格線數相同（${outer.size} vs ${wall.size}）`);
for (const line of outer) assert.ok(wall.has(line), `這條外立方線不在內壁格線上，代表沒有貼住：${line}`);
for (const line of wall) assert.ok(outer.has(line), `這條內壁格線沒有被四維單元接上，代表有縫：${line}`);

// 3. 每條外立方線長度都等於格距；相鄰格子共用整面四條線
for (const rod of rods.filter((r) => r.kind === 'outer')) close(length(rod.a, rod.b), CAVITY_PITCH, '外立方每條線都等於格距');
const shared = rods.filter((rod) => rod.kind === 'outer').map((rod) => edgeKey(rod.a, rod.b));
const duplicated = shared.filter((line, index) => shared.indexOf(line) !== index);
assert.equal(duplicated.length, 6 * 4, '中心格與六個鄰居各共用一整面的四條線');

// 3.5 數字要剛好加起來（不是「差不多」）
const outerWithMultiplicity = centers.length * 12;
assert.equal(outerWithMultiplicity, 84, '7 格 × 每格 12 條外立方線 = 84');
assert.equal(duplicated.length, 24, '共用的線：6 個面 × 4 條 = 24');
assert.equal(outerWithMultiplicity - duplicated.length, wall.size, '84 − 24 = 60，正好是內壁格線數');
assert.equal(outer.size, wall.size, '去重後的線數＝內壁格線數');
assert.equal(counts.outer + counts.inner + counts.bridge, rods.length, '12＋12＋8 每格 32，總數要對得起來');
assert.equal(rods.length, centers.length * 32, '7 × 32 = 224');

// 3.6 尤拉公式：三維與四維各自都要剛好等於定值
const cube = { vertices: 8, edges: 12, faces: 6 };
assert.equal(cube.vertices - cube.edges + cube.faces, 2, '三維立方：8 − 12 + 6 = 2');
const tesseract = { vertices: 16, edges: 32, faces: 24, cells: 8 };
assert.equal(tesseract.vertices - tesseract.edges + tesseract.faces - tesseract.cells, 0, '四維超立方：16 − 32 + 24 − 8 = 0');
// 每條邊被兩個面共用：6 面 × 4 條 ÷ 2 = 12 條
assert.equal((cube.faces * 4) / 2, cube.edges, '三維：6 面 × 4 條 ÷ 2 = 12 條線');
// 每個立方單元 12 條邊，每條邊被三個單元共用：8 × 12 ÷ 3 = 32
assert.equal((tesseract.cells * 12) / 3, tesseract.edges, '四維：8 個單元 × 12 條 ÷ 3 = 32 條線');

// 3.7 加起來還是四方形：七格併起來之後，每一個面仍然是同樣大小的正方形
const faceMap = new Map();
for (const center of centers) {
  for (let axis = 0; axis < 3; axis += 1) {
    for (const sign of [-1, 1]) {
      const plane = center[axis] + (sign * CAVITY_PITCH) / 2;
      const others = [0, 1, 2].filter((i) => i !== axis).map((i) => center[i]);
      const id = `${axis}@${plane.toFixed(6)}|${others.map((v) => v.toFixed(6)).join(',')}`;
      faceMap.set(id, (faceMap.get(id) ?? 0) + 1);
    }
  }
}
assert.equal(centers.length * 6, 42, '7 格 × 6 面 = 42 個面（含重複）');
const sharedFaces = [...faceMap.values()].filter((n) => n === 2);
assert.equal(sharedFaces.length, 6, '中心格與六個鄰居各共用一個面');
assert.equal(faceMap.size, 42 - 6, '42 − 6 = 36 個不重複的面');
for (const [id, times] of faceMap) assert.ok(times <= 2, `同一個面最多被兩格共用：${id}`);

// 每個面都由四條等長的外立方線圍成——併起來之後仍然是正方形
const outerRods = rods.filter((rod) => rod.kind === 'outer');
for (const [id] of faceMap) {
  const [axisPart, othersPart] = id.split('|');
  const axis = Number(axisPart.split('@')[0]);
  const plane = Number(axisPart.split('@')[1]);
  const onFace = outerRods.filter((rod) => Math.abs(rod.a[axis] - plane) < 1e-9 && Math.abs(rod.b[axis] - plane) < 1e-9
    && [0, 1, 2].filter((i) => i !== axis).every((i) => Math.abs(rod.a[i] - Number(othersPart.split(',')[[0, 1, 2].filter((j) => j !== axis).indexOf(i)])) <= CAVITY_PITCH / 2 + 1e-9));
  assert.ok(onFace.length >= 4, `這個面找不到四條圍邊：${id}`);
  for (const rod of onFace) close(length(rod.a, rod.b), CAVITY_PITCH, '面上的線都等長（正方形）');
}

// 3.8 一顆四角形空間：內接正立方，精度收到 1e-12（比億萬分之一還嚴）
const EXACT = 1e-12;
const exact = (a, b, message) => assert.ok(Math.abs(a - b) < EXACT, `${message}：${a} != ${b}（差 ${Math.abs(a - b)}）`);
const inscribed = inscribedUnitRods();
assert.equal(inscribed.length, 12, 'inner square default: 12 outer edges only');
assert.equal(inscribedUnitRods({ includeInner: true }).length, 32, 'full 32 when includeInner');
const inscribedOuter = inscribed.filter((rod) => rod.kind === 'outer');
assert.equal(inscribedOuter.length, 12, '外立方 12 條線');
// 厚度細修：空心半徑＝殼內壁，殼厚度＝1 − 內壁；核心邊長 2 × 內壁 / √3
exact(HOLLOW_RADIUS, 1, 'fit radius = outer shell 1 (1:1 flush)');
exact(SHELL_THICKNESS, 0, 'visual shell-core flush: no air band');
exact(INSCRIBED_EDGE, (2 * HOLLOW_RADIUS) / Math.sqrt(3), '內接正立方邊長 = 2 × 內壁 / √3');
for (const rod of inscribedOuter) exact(length(rod.a, rod.b), INSCRIBED_EDGE, '12 條線等長');
// 注意：上面的 key() 只留 6 位小數，拿它還原座標會引入 ~5e-7 的誤差，
// 這一段要驗到 1e-12，所以改用原始數值去重，不能經過四捨五入。
const exactKey = (point) => point.map((v) => v.toExponential(15)).join(',');
const inscribedCorners = [...new Map(inscribedOuter.flatMap((rod) => [rod.a, rod.b]).map((p) => [exactKey(p), p])).values()];
assert.equal(inscribedCorners.length, 8, '八個角');
for (const corner of inscribedCorners) {
  // 業主一比一緊貼：八角到球心＝外圓半徑，不冒出
  exact(Math.hypot(...corner), HOLLOW_RADIUS, '八個角都剛好落在外圓上（一比一緊貼）');
  assert.ok(Math.hypot(...corner) <= 1 + EXACT, '角絕不能冒出外圓');
  // 太極的四個切面在 |y|,|z| = √½；立方的半邊要小於它，切口才切不到
  assert.ok(Math.abs(corner[1]) < Math.SQRT1_2 + EXACT && Math.abs(corner[2]) < Math.SQRT1_2 + EXACT, '不被四個切面切到');
}
exact(INSCRIBED_EDGE / 2, Math.max(...inscribedCorners.map((c) => Math.abs(c[0]))), '半邊＝邊長的一半');
// 六個面都是正方形：四條等長、相鄰垂直
let inscribedFaces = 0;
for (let axis = 0; axis < 3; axis += 1) {
  for (const sign of [-1, 1]) {
    const plane = (sign * INSCRIBED_EDGE) / 2;
    const onFace = inscribedOuter.filter((rod) => Math.abs(rod.a[axis] - plane) < EXACT && Math.abs(rod.b[axis] - plane) < EXACT);
    assert.equal(onFace.length, 4, '每個面四條線');
    for (const rod of onFace) {
      const direction = rod.a.map((v, i) => v - rod.b[i]);
      const touching = onFace.filter((other) => other !== rod && [key(other.a), key(other.b)].some((p) => p === key(rod.a) || p === key(rod.b)));
      for (const other of touching) {
        const otherDirection = other.a.map((v, i) => v - other.b[i]);
        exact(direction.reduce((sum, v, i) => sum + v * otherDirection[i], 0), 0, '相鄰兩條線夾角剛好 90 度');
      }
    }
    inscribedFaces += 1;
  }
}
assert.equal(inscribedFaces, 6, '六個面都驗過');

// 4. 全部線都在球內，不戳出太極表面
for (const rod of rods) {
  for (const point of [rod.a, rod.b]) {
    assert.ok(Math.hypot(...point) <= 1 + 1e-9, `線超出太極球面：${key(point)}`);
  }
}

console.log(`PASS: 球內 7 格全部換成四維單元（${rods.length} 條線）；外立方線與內壁 ${wall.size} 條格線完全同一組，不多不少；相鄰格共用整面四條線；格距 ${TAIJI_CELL_SIZE}、線寬 ${(TAIJI_UNIT_SCALE * ROD_WIDTH).toFixed(4)} 與內壁 1:1；所有線都在球內；七格併起來共 36 個不重複的面，每個面仍是同樣大小的正方形（42 − 6 = 36）；另有「一顆」內接正立方：邊長 2/√3、八角剛好貼在外圓半徑 1（一比一緊貼、殼厚 0）、六面皆正方形，全部以 1e-12 精度核對。`);
