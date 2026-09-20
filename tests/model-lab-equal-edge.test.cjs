/**
 * 等長投影・對照權威資料的交叉比對（2026-09-20）
 *
 * 概念：太極裡看到的四維單元是透視投影，外立方大、內立方小、連接邊斜——那是眼睛被騙。
 * 四維裡 32 條邊本來等長、24 個面本來都是正方形。這支測試用平行投影（方向 1,1,1,1）把它壓到三維，
 * 壓完之後 32 條邊長度完全相同，證明「其實全部都是四方形，只是視覺被騙」。
 *
 * 權威對照（外部資料，非本站自說自話）：
 * - Wolfram MathWorld「Tesseract」：16 頂點、32 邊、24 個正方形面、8 個立方單元；
 *   Schläfli 符號 {4,3,3}；頂點座標 (±1,±1,±1,±1)。
 *   https://mathworld.wolfram.com/Tesseract.html
 * - Wikipedia「Tesseract」「Rhombic dodecahedron」：沿體對角線（頂點優先）的平行投影，
 *   外殼是菱形十二面體——12 個全等菱形面、24 條邊、14 個頂點分兩種；
 *   8 個立方單元投影成 8 個平行六面體。
 *   https://en.wikipedia.org/wiki/Tesseract ・ https://en.wikipedia.org/wiki/Rhombic_dodecahedron
 *
 * 精度：全部以 1e-12 比對（比億萬分之一還嚴）。
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

const { parallelProject4D, equalEdgeRods, EQUAL_EDGE_LENGTH } = load('components/model-lab/equalEdgeProjection.ts');
const { VERTICES_4D, EDGES_4D } = load('components/model-lab/projectionMath.ts');

const EXACT = 1e-12;
const exact = (a, b, message) => assert.ok(Math.abs(a - b) < EXACT, `${message}：${a} != ${b}（差 ${Math.abs(a - b)}）`);
const zero = (v) => (Object.is(v, -0) ? 0 : v);
const key = (point) => point.map((v) => zero(Number(v.toFixed(12)))).join(',');
const norm = (point) => Math.hypot(...point);

// 1. 頂點座標與數量，對得上 MathWorld 的 (±1,±1,±1,±1)
assert.equal(VERTICES_4D.length, 16, 'MathWorld：16 個頂點');
assert.equal(EDGES_4D.length, 32, 'MathWorld：32 條邊');
for (const vertex of VERTICES_4D) {
  assert.equal(vertex.length, 4, '四維座標');
  for (const value of vertex) assert.ok(value === 1 || value === -1, 'MathWorld：頂點座標只有 ±1');
}
assert.equal(new Set(VERTICES_4D.map((v) => v.join(','))).size, 16, '16 個頂點互不相同');

// 2. 等長投影：32 條邊長度完全相同（這就是「其實都是四方形、眼睛被騙」的證據）
const rods = equalEdgeRods();
assert.equal(rods.length, 32, '投影後仍是 32 條邊');
for (const rod of rods) {
  exact(Math.hypot(...rod.a.map((v, i) => v - rod.b[i])), EQUAL_EDGE_LENGTH, '每條邊長度都等於 √3');
}
exact(EQUAL_EDGE_LENGTH, Math.sqrt(3), '理論值 √3');
// 原本透視投影下「連接邊」比較短，等長投影後跟其他邊一樣長
const bridges = rods.filter((rod) => rod.axis === 3);
assert.equal(bridges.length, 8, '8 條連接邊');
for (const rod of bridges) exact(Math.hypot(...rod.a.map((v, i) => v - rod.b[i])), EQUAL_EDGE_LENGTH, '連接邊也一樣長');

// 3. 外殼對照菱形十二面體：14 個頂點分兩種、2 個頂點落在投影軸上
const projected = VERTICES_4D.map(parallelProject4D);
const distinct = new Set(projected.map(key));
assert.equal(distinct.size, 15, '16 個頂點投影後剩 15 個不同的點（兩個疊在中心）');
const onAxis = projected.filter((point) => norm(point) < EXACT);
assert.equal(onAxis.length, 2, '沿投影方向的那兩個頂點疊在中心');
// 分組只用來數數量（所以可以四捨五入），比對長度一律用原始數值，不能拿四捨五入過的值去比 1e-12
const radii = new Map();
for (const point of projected) {
  const radius = norm(point);
  if (radius < EXACT) continue;
  const group = radius.toFixed(9);
  const entry = radii.get(group) ?? { count: 0, radius };
  radii.set(group, { count: entry.count + 1, radius: entry.radius });
}
assert.equal([...radii.values()].reduce((sum, entry) => sum + entry.count, 0), 14, '外殼 14 個頂點');
assert.equal(radii.size, 2, 'Wikipedia：菱形十二面體的頂點分兩種');
const [far, near] = [...radii.values()].sort((a, b) => b.radius - a.radius);
assert.equal(far.count, 6, '遠的一種 6 個');
assert.equal(near.count, 8, '近的一種 8 個');
exact(far.radius, 2, '遠頂點半徑 2');
exact(near.radius, Math.sqrt(3), '近頂點半徑 √3');

console.log(`PASS: 頂點 (±1,±1,±1,±1)、16 頂點 32 邊（對照 Wolfram MathWorld {4,3,3}）；等長投影後 32 條邊長度全部等於 √3=${EQUAL_EDGE_LENGTH.toFixed(12)}；外殼 14 個頂點分兩種（6 個半徑 2、8 個半徑 √3）、兩個頂點疊在投影軸中心，與 Wikipedia 菱形十二面體描述一致。精度 1e-12。`);
