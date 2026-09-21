#!/usr/bin/env node
/**
 * 四維格子・全量窮舉稽核（2026-09-20）
 *
 * 不是抽樣、不是目測：把格子一路鋪到很大，每一條線、每一個面、每一個角全部算出來去重，
 * 再跟閉合公式逐項對答案。任何一項對不上就非零退出。
 *
 * 說明用詞：這是「全量窮舉運算」，不是統計意義上的大數據——本站沒有人群樣本，
 * 依專案鐵律不得自稱大數據。
 *
 * 對答案的閉合公式（N×N×N 個立方格）：
 *   頂點 V = (N+1)³
 *   邊   E = 3N(N+1)²
 *   面   F = 3N²(N+1)
 *   格   C = N³
 *   且 V − E + F − C = ((N+1) − N)³ = 1（恆等式，任何 N 都必須剛好等於 1）
 *
 * 另外用隨機四維旋轉做不變量壓力測試：旋轉不改變長度與直角，
 * 所以 32 條邊長、24 個面的四個直角，在任意旋轉後都必須維持（容許誤差 1e-12）。
 *
 * 用法：node scripts/model-lab-4d-audit.mjs [最大N] [旋轉次數]
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function load(file) {
  const source = fs.readFileSync(file, 'utf8');
  const module = { exports: {} };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const require_ = (id) => (id.startsWith('.') ? load(path.join(path.dirname(file), `${id}.ts`)) : require(id));
  new Function('exports', 'module', 'require', compiled)(module.exports, module, require_);
  return module.exports;
}

const { VERTICES_4D, EDGES_4D } = load('components/model-lab/projectionMath.ts');
const { CELL_SPACING, cellRods } = load('components/model-lab/multiverseMath.ts');

const MAX_N = Number(process.argv[2] ?? 14);
const ROTATIONS = Number(process.argv[3] ?? 200000);
const EXACT = 1e-12;

let failures = 0;
const check = (ok, message) => {
  if (!ok) { failures += 1; console.error(`✗ ${message}`); }
};

// ── 一、格子鋪排：逐條算出來的數字要等於閉合公式 ──────────────────────
console.log('一、鋪排全量窮舉（每一條線、每一個面都算出來去重，再對閉合公式）');
console.log('   N    格數      頂點       邊        面     V−E+F−C  對答案');
let totalLines = 0;
for (let n = 1; n <= MAX_N; n += 1) {
  const vertices = new Set();
  const edges = new Set();
  const faces = new Set();
  for (let x = 0; x < n; x += 1) {
    for (let y = 0; y < n; y += 1) {
      for (let z = 0; z < n; z += 1) {
        for (let corner = 0; corner < 8; corner += 1) {
          vertices.add(`${x + (corner & 1)},${y + ((corner >> 1) & 1)},${z + ((corner >> 2) & 1)}`);
        }
        for (const [axis, a, b, c] of [[0, x, y, z], [1, x, y, z], [2, x, y, z]]) {
          void a; void b; void c;
          for (let i = 0; i < 2; i += 1) {
            for (let j = 0; j < 2; j += 1) {
              const start = [x, y, z];
              start[(axis + 1) % 3] += i;
              start[(axis + 2) % 3] += j;
              edges.add(`${axis}|${start.join(',')}`);
            }
          }
        }
        for (let axis = 0; axis < 3; axis += 1) {
          for (let side = 0; side < 2; side += 1) {
            const at = [x, y, z];
            at[axis] += side;
            faces.add(`${axis}@${at.join(',')}`);
          }
        }
      }
    }
  }
  const cells = n ** 3;
  const expectedV = (n + 1) ** 3;
  const expectedE = 3 * n * (n + 1) ** 2;
  const expectedF = 3 * n ** 2 * (n + 1);
  const euler = vertices.size - edges.size + faces.size - cells;
  const ok = vertices.size === expectedV && edges.size === expectedE && faces.size === expectedF && euler === 1;
  totalLines += edges.size;
  check(ok, `N=${n} 對不上：V ${vertices.size}/${expectedV}、E ${edges.size}/${expectedE}、F ${faces.size}/${expectedF}、Euler ${euler}/1`);
  console.log(`  ${String(n).padStart(2)}  ${String(cells).padStart(6)}  ${String(vertices.size).padStart(8)}  ${String(edges.size).padStart(8)}  ${String(faces.size).padStart(8)}  ${String(euler).padStart(6)}   ${ok ? '✓' : '✗'}`);
}
console.log(`   （累計去重後線段 ${totalLines.toLocaleString('en-US')} 條，全部由程式列舉，不是估的）`);

// ── 二、四維不變量壓力測試：隨機旋轉後長度與直角都不能變 ────────────
console.log(`\n二、隨機四維旋轉壓力測試（${ROTATIONS.toLocaleString('en-US')} 次，容許誤差 ${EXACT}）`);
const rotate = (point, plane, angle) => {
  const [i, j] = plane;
  const out = [...point];
  out[i] = point[i] * Math.cos(angle) - point[j] * Math.sin(angle);
  out[j] = point[i] * Math.sin(angle) + point[j] * Math.cos(angle);
  return out;
};
const PLANES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
// 四個角要照「繞一圈」的順序排，不能只是把符合條件的頂點撈出來——
// 撈出來的順序可能是對角線，量出來的就不是相鄰邊的夾角了（第一版就是這樣算錯的）。
const indexOf = (point) => VERTICES_4D.findIndex((v) => v.every((value, i) => value === point[i]));
const faces4D = [];
for (let a = 0; a < 4; a += 1) {
  for (let b = a + 1; b < 4; b += 1) {
    const rest = [0, 1, 2, 3].filter((axis) => axis !== a && axis !== b);
    for (const s of [-1, 1]) {
      for (const t of [-1, 1]) {
        const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, w]) => {
          const point = [0, 0, 0, 0];
          point[a] = u;
          point[b] = w;
          point[rest[0]] = s;
          point[rest[1]] = t;
          return indexOf(point);
        });
        check(corners.every((index) => index >= 0), `面上的角找不到對應頂點：軸 ${a},${b}`);
        faces4D.push(corners);
      }
    }
  }
}
check(faces4D.length === 24, `四維面數應為 24，實際 ${faces4D.length}`);
check(faces4D.every((face) => face.length === 4), '每個面必須剛好四個角');

let worstEdge = 0;
let worstAngle = 0;
for (let iteration = 0; iteration < ROTATIONS; iteration += 1) {
  const plane = PLANES[iteration % PLANES.length];
  const angle = Math.random() * Math.PI * 2;
  const rotated = VERTICES_4D.map((vertex) => rotate(vertex, plane, angle));
  for (const { from, to } of EDGES_4D) {
    const d = Math.hypot(...rotated[from].map((v, i) => v - rotated[to][i]));
    worstEdge = Math.max(worstEdge, Math.abs(d - 2));
  }
  if (iteration % 1000 === 0) {
    for (const face of faces4D) {
      for (let k = 0; k < 4; k += 1) {
        const o = rotated[face[k]];
        const p = rotated[face[(k + 1) % 4]];
        const q = rotated[face[(k + 3) % 4]];
        const u = o.map((v, i) => p[i] - v);
        const w = o.map((v, i) => q[i] - v);
        worstAngle = Math.max(worstAngle, Math.abs(u.reduce((sum, v, i) => sum + v * w[i], 0)));
      }
    }
  }
}
check(worstEdge < EXACT, `旋轉後邊長最大偏差 ${worstEdge}`);
check(worstAngle < EXACT, `旋轉後直角最大偏差 ${worstAngle}`);
console.log(`   邊長最大偏差 ${worstEdge.toExponential(3)}｜直角內積最大偏差 ${worstAngle.toExponential(3)}`);

// ── 三、單元本身：32 條線、每面四角形 ───────────────────────────────
console.log('\n三、單元本身');
const rods = cellRods();
check(rods.length === 32, `單元邊數 ${rods.length}`);
const kinds = rods.reduce((acc, rod) => ({ ...acc, [rod.kind]: (acc[rod.kind] ?? 0) + 1 }), {});
check(kinds.outer === 12 && kinds.inner === 12 && kinds.bridge === 8, `12/12/8 對不上：${JSON.stringify(kinds)}`);
check(Math.abs(CELL_SPACING - 2) < EXACT, `外立方邊長 ${CELL_SPACING}`);
console.log(`   32 條線＝12 外＋12 內＋8 連接；外立方邊長 ${CELL_SPACING}`);

console.log(`\n${failures === 0 ? '✅ 全部對得上' : `❌ 有 ${failures} 項對不上`}`);
process.exit(failures === 0 ? 0 : 1);
