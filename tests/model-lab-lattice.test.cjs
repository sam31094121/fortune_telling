const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('components/model-lab/latticeMath.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const moduleBox = { exports: {} };
new Function('exports', 'module', compiled)(moduleBox.exports, moduleBox);
const { rebase, latticeEdges, sweepFraction, moveSafely, BEAM, BODY_RADIUS } = moduleBox.exports;
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
close(1 - BEAM, .994);
close((1 - BEAM) / 2 - BODY_RADIUS, .377);
const huge = BigInt('999999999999999999999999999');
for (const local of [-17.2, -8, -1, -.01, 0, 7.99, 8, 16.2]) {
  const rebased = rebase({ chunk: [huge, -huge, BigInt(0)], local: [local, local, local] });
  const shift = Math.floor(local / 8);
  assert.equal(rebased.chunk[0], huge + BigInt(shift));
  assert.equal(rebased.chunk[1], -huge + BigInt(shift));
  close(rebased.local[0] + shift * 8, local);
  assert.ok(rebased.local.every(x => x >= 0 && x < 8));
}
const edges = latticeEdges(6);
assert.equal(edges.length, 3 * 12 * 13 * 13);
assert.equal(new Set(edges.map(e => `${e.axis}:${e.center.join(',')}`)).size, edges.length);
// Every beam endpoint lies on the integer lattice and has unit length.
for (const edge of edges) for (let axis = 0; axis < 3; axis++) {
  assert.ok(Number.isInteger(edge.center[axis] - (axis === edge.axis ? .5 : 0)));
}
const { entrancePoint, portalProjection, ENTRANCE_SCALE, ENTRANCE_Y } = moduleBox.exports;
assert.ok(ENTRANCE_Y < -.55, 'field window must be behind the real cavity walls');
close(ENTRANCE_SCALE * (1 - BEAM), .5964);
close(ENTRANCE_SCALE * (1 + BEAM), .6036);
for (let axis = 0; axis < 3; axis++) {
  const p = [.5, .5, .2], q = [...p]; q[axis] += 1;
  close(Math.hypot(...entrancePoint(q).map((v, i) => v - entrancePoint(p)[i])), .6);
}
for (const eye of [2.7, 5.1, ENTRANCE_Y + .072]) {
  const projection = portalProjection(eye);
  close(2 * projection.distance * Math.tan(projection.fov * Math.PI / 360), 1);
  assert.ok(projection.near < projection.distance);
}
const entry = entrancePoint([.5, .5, -.12]);
close(entry[0], 0); close(entry[1], ENTRANCE_Y + .072); close(entry[2], 0);
// Same 60-degree projection on both sides at transition end: no axis stretch or mirror.
for (const p of [[0, 0, 1], [1, 1, 1], [2, 1, 2]]) {
  const w = entrancePoint(p), depth = entry[1] - w[1];
  close(w[0] / depth, -(p[0] - .5) / (p[2] + .12));
  close(-w[2] / depth, (p[1] - .5) / (p[2] + .12));
}
// Six central openings remain traversable for long sweeps, without needing rendered beams.
for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
  const d = [0, 0, 0]; d[axis] = sign * 100;
  assert.equal(sweepFraction([.5, .5, .5], d), 1);
}
// Hit a rod even when a single movement crosses multiple cells.
close(sweepFraction([.5, .1, .5], [2, 0, 0]), .1885);
const stopped = moveSafely([.5, .1, .5], [2, 0, 0]);
assert.ok(stopped[0] < .877 && stopped[0] > .8769);
assert.equal(sweepFraction([0, 0, .5], [.1, 0, 0]), 0); // initial overlap safely blocked
assert.equal(sweepFraction([.123, .1, .5], [.5, 0, 0]), 1); // leave a touching face
close(sweepFraction([.123, .1, .5], [-.1, 0, 0]), 0); // cannot enter same face
const before = { chunk: [huge, BigInt(0), BigInt(0)], local: [7.99, .5, .5] };
const after = rebase({ ...before, local: moveSafely(before.local, [.02, 0, 0]) });
assert.equal(after.chunk[0], huge + BigInt(1)); close(after.local[0], .01);
console.log('PASS: exact grid dimensions, unique edges, huge signed addresses, six-way openings, continuous conservative collision and rebasing');
