const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const THREE = require('three');
function load(file, dependencies = {}) {
  const box = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', js)(name => dependencies[name] || require(name), box, box.exports);
  return box.exports;
}
const original = load('components/model-lab/models/taiji/geometry.ts');
const cavity = load('components/model-lab/models/taiji/squareCavity.ts', { './geometry': original });
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const solids = [false, true].map(black => new THREE.Mesh(cavity.squareCavityGeometry(black), material));
solids.forEach(mesh => mesh.updateMatrixWorld());
const hit = (origin, direction, objects = solids) => new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction), 0, 4).intersectObjects(objects, false);
let maximumRadius = 0;
for (const mesh of solids) {
  const p = mesh.geometry.attributes.position;
  let supportVertices = 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    maximumRadius = Math.max(maximumRadius, Math.hypot(x, y, z));
    if (Math.abs(Math.abs(z) - original.A) < 1e-6) {
      assert.ok(x*x + y*y < original.A*original.A); supportVertices++;
    }
  }
  assert.ok(supportVertices > 0, 'support must meet the real existing disc, not float');
}
assert.ok(maximumRadius < 1, 'no thickness vertex may leave the original sphere envelope');
for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
  const x = -.29 + i * .58 / 12, z = -.29 + j * .58 / 12;
  assert.equal(hit([x, 2, z], [0, -1, 0]).length, 0, 'open front-to-back square');
  assert.equal(hit([x, -2, z], [0, 1, 0]).length, 0, 'open back-to-front square');
}
for (const y of [-.54, 0, .54]) for (const d of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]) {
  const intersection = hit([0, y, 0], d)[0];
  assert.ok(intersection, 'all four internal walls must exist');
  assert.ok(Math.abs(intersection.distance - .3) < 1e-6, 'four walls give .6 square clear opening');
}
for (const id of ['yin2', 'yang1']) {
  const piece = original.PIECES[id];
  for (const geometry of [original.bandGeometry(piece.side, piece.hemi), original.discGeometry(piece.disc), original.capGeometry(piece.disc)]) {
    const mesh = new THREE.Mesh(geometry, material); mesh.updateMatrixWorld();
    for (const x of [-.29, 0, .29]) for (const z of [-.29, 0, .29]) assert.equal(hit([x, 2, z], [0,-1,0], [mesh]).length, 0);
  }
}
console.log(`PASS: .60 square aperture, four walls, 338 bidirectional clearance rays, attached disc supports, maximum radius ${maximumRadius.toFixed(6)} < 1`);
