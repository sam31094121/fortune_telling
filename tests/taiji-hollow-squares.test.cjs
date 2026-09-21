/**
 * 空心太極・往內無限四方形守門（2026-09-21）
 *
 * 業主定調：太極外圍是球只是視覺；把太極當空心殼，殼有厚度，裡面剛好是四角形空間，
 * 往內一路伸展進去還是四方形。
 *
 * 厚度細修後必須成立：
 * 1. 任何一條線都不能進入殼的厚度——最遠點剛好停在殼內壁 0.995（精度 1e-12）。
 * 2. 核心 12 條線等長，八個角剛好貼在殼內壁上。
 * 3. 往內每一層都是完整的 12 條線，層與層的邊長比例剛好是 IN_RATIO。
 * 4. 六面同心方框的每一條線都平行某一個軸——每一圈都是四方形。
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

const hollow = load('components/model-lab/models/taiji/infiniteHollowSquares.ts');
const { HOLLOW_RADIUS, SHELL_THICKNESS, INSCRIBED_EDGE } = load('components/model-lab/taijiCells.ts');
const { INNER_RADIUS } = load('components/model-lab/models/taiji/squareCavity.ts');

const EXACT = 1e-12;
const exact = (a, b, message) => assert.ok(Math.abs(a - b) < EXACT, `${message}：${a} != ${b}（差 ${Math.abs(a - b)}）`);
const length = (s) => Math.hypot(...s.a.map((v, i) => v - s.b[i]));
const radius = (p) => Math.hypot(...p);

// 0. 單一來源：空心半徑就是 squareCavity 的殼內壁，夾邊半徑也用它
exact(HOLLOW_RADIUS, INNER_RADIUS, '空心半徑與殼內壁是同一個值');
exact(hollow.SPHERE_R, HOLLOW_RADIUS, '夾邊半徑＝殼內壁，不是外表面 1');
exact(SHELL_THICKNESS, 1 - INNER_RADIUS, '殼厚度＝1 − 內壁');

for (const options of [{}, { outDepth: 5 }, { withSpin: true }, { inDepth: 14, faceDepth: 10 }]) {
  const segments = hollow.buildInfiniteHollowSquareSegments(options);
  const label = JSON.stringify(options);

  // 1. 不進殼的厚度
  const farthest = Math.max(...segments.flatMap((s) => [radius(s.a), radius(s.b)]));
  assert.ok(farthest <= HOLLOW_RADIUS + EXACT, `${label} 有線伸進殼的厚度：最遠 ${farthest}`);
  for (const s of segments) assert.ok([...s.a, ...s.b].every(Number.isFinite), `${label} 座標不得有 NaN`);

  // 2. 核心 12 條、等長、角貼內壁
  const core = segments.filter((s) => s.dir === 'core');
  assert.equal(core.length, 12, `${label} 核心 12 條線`);
  for (const s of core) exact(length(s), INSCRIBED_EDGE, `${label} 核心每條線等長`);
  for (const s of core) {
    exact(radius(s.a), HOLLOW_RADIUS, `${label} 核心的角貼在殼內壁`);
    exact(radius(s.b), HOLLOW_RADIUS, `${label} 核心的角貼在殼內壁`);
  }

  // 3. 往內每層完整 12 條，層間比例剛好 IN_RATIO
  const inward = segments.filter((s) => s.dir === 'in' && s.kind === 'nested');
  const nests = [...new Set(inward.map((s) => s.nest))].sort((a, b) => a - b);
  assert.equal(nests.length, options.inDepth ?? hollow.IN_DEPTH, `${label} 往內層數`);
  let previous = INSCRIBED_EDGE;
  for (const nest of nests) {
    const layer = inward.filter((s) => s.nest === nest);
    assert.equal(layer.length, 12, `${label} 第 ${nest} 層要是完整 12 條線`);
    const edge = length(layer[0]);
    for (const s of layer) exact(length(s), edge, `${label} 第 ${nest} 層 12 條線等長`);
    exact(edge / previous, hollow.IN_RATIO, `${label} 第 ${nest} 層與上一層的比例剛好是 IN_RATIO`);
    previous = edge;
  }

  // 4. 六面同心方框：每條線只沿一個軸（四方形的邊）
  const faces = segments.filter((s) => s.dir === 'face');
  assert.ok(faces.length > 0, `${label} 要有六面同心方框`);
  for (const s of faces) {
    const moving = s.a.filter((v, i) => Math.abs(v - s.b[i]) > EXACT).length;
    assert.equal(moving, 1, `${label} 方框的每條線都要平行某一個軸`);
  }
}

console.log(`PASS: 空心半徑＝殼內壁 ${HOLLOW_RADIUS}、殼厚度 ${SHELL_THICKNESS.toFixed(3)} 一點都沒被線碰到；核心 12 條等長、角貼內壁；往內每層完整 12 條、層間比例 ${hollow.IN_RATIO}；六面同心方框全是四方形。四組參數、精度 1e-12。`);
