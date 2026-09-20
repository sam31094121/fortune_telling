const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
const THREE = require('three');
function load(file, dependencies = {}) {
  const m = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(n => dependencies[n] || require(n), m, m.exports);
  return m.exports;
}
const projection = load('components/model-lab/projectionMath.ts');
const body = load('components/model-lab/models/taiji/geometry.ts');
const { createContactRibs, RIB_THICKNESS } = load('components/model-lab/models/taiji/contactRibs.ts', { '../../projectionMath': projection });
const surfaces = ['yin2', 'yang1'].flatMap(id => { const p = body.PIECES[id]; return [body.bandGeometry(p.side, p.hemi), body.discGeometry(p.disc), body.capGeometry(p.disc)]; });
const ribs = createContactRibs(surfaces);
assert.equal(ribs.length, 12);
const reports = [];
for (const rib of ribs) {
  assert(Math.abs(rib.a.distanceTo(rib.b) - .6) < 1e-12);
  assert(rib.padArea > 0 && RIB_THICKNESS > 0);
  const p = rib.geometry.getAttribute('position');
  // Every vertex, and thus the whole convex rib, lies in one exterior supporting
  // half-space of the cavity. No new rib material can enter the open cube.
  for (let i = 0; i < p.count; i++) assert(p.getComponent(i, rib.supportAxis) * rib.supportSign >= .3 - 2e-7);
  const tri = new THREE.Triangle(); let volume = 0;
  for (let i = 0; i < p.count; i += 3) {
    tri.a.fromBufferAttribute(p, i); tri.b.fromBufferAttribute(p, i + 1); tri.c.fromBufferAttribute(p, i + 2);
    volume += tri.a.dot(tri.b.clone().cross(tri.c)) / 6;
    const plane = new THREE.Plane().setFromCoplanarPoints(tri.a, tri.b, tri.c);
    // Complete straight base segment lies inside/on every hull plane, not merely its ends.
    for (let k = 0; k <= 100; k++) assert(plane.distanceToPoint(rib.a.clone().lerp(rib.b, k / 100)) < 2e-6);
  }
  assert(volume > 1e-9, 'finite volume, not a zero-thickness decorative sheet');
  assert(rib.anchorTriangle.containsPoint(rib.anchor), 'contact originates on actual body triangle');
  reports.push({ edge: rib.edge, length: rib.a.distanceTo(rib.b), ribVolume: volume, contactArea: rib.padArea, thickness: RIB_THICKNESS });
}
// After actual XW rotation all six faces of the unchanged source cell are squares.
for (const face of projection.CONTACT_CELL_FACES) {
  const p = face.ids.map(id => new THREE.Vector3(...projection.project4D(projection.rotate4D(projection.VERTICES_4D[id], Math.PI / 2, 0))));
  for (let i = 0; i < 4; i++) {
    assert(Math.abs(p[i].distanceTo(p[(i + 1) % 4]) - 2) < 1e-12);
    assert(Math.abs(p[(i + 1) % 4].clone().sub(p[i]).dot(p[(i + 3) % 4].clone().sub(p[i]))) < 1e-12);
  }
}
console.log(JSON.stringify({ passed: true, ribs: reports, cavityEdge: .6, rodDiameter: .0048, rodLimitedClearWidth: .5952, note: 'Local overlapping closed ribs/pads; no global Boolean/manifold certification or visual approval implied.' }, null, 2));
