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
const lattice = load('components/model-lab/latticeMath.ts');
const original = load('components/model-lab/models/taiji/geometry.ts');
const cavity = load('components/model-lab/models/taiji/squareCavity.ts', { '../../latticeMath': lattice });
const close = (a, b, eps=1e-8) => assert.ok(Math.abs(a-b)<eps, `${a} != ${b}`);
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
const key = p => p.map(v=>v.toFixed(8)).join(',');
const edgeKey = (a,b) => [key(a),key(b)].sort().join('|');
const edges = cavity.cavityLatticeEdges();
const edgeSet = new Set(edges.map(e=>edgeKey(e.start,e.end)));
assert.equal(edgeSet.size,edges.length,'no decorative duplicate rods');
close(cavity.CAVITY_PITCH,.6); close(cavity.CAVITY_LINE_WIDTH,.0036); close(cavity.CAVITY_CLEAR,.5964);
let faces = 0;
// Verify the central cube and all six neighbours against actual rendered rods.
const cells=[[0,0,-1],[1,0,-1],[-1,0,-1],[0,1,-1],[0,-1,-1],[0,0,0],[0,0,-2]];
for (const origin of cells) for (let axis=0;axis<3;axis++) for (const side of [0,1]) {
  const u=(axis+1)%3,v=(axis+2)%3;
  const corners=[[0,0],[1,0],[1,1],[0,1]].map(([s,t])=>{
    const p=[...origin]; p[axis]+=side; p[u]+=s; p[v]+=t; return lattice.entrancePoint(p);
  });
  const vectors = corners.map((p,i)=>sub(corners[(i+1)%4],p));
  for (let i=0;i<4;i++) {
    close(Math.hypot(...vectors[i]),.6);
    close(dot(vectors[i],vectors[(i+1)%4]),0);
    assert.ok(edgeSet.has(edgeKey(corners[i],corners[(i+1)%4])), 'full face edge is actually rendered');
  }
  faces++;
}
const geometry = cavity.squareCavityGeometry();
const mesh = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})); mesh.updateMatrixWorld();
let maxRadius = 0;
const p=geometry.attributes.position;
for(let i=0;i<p.count;i++) maxRadius=Math.max(maxRadius,Math.hypot(p.getX(i),p.getY(i),p.getZ(i)));
assert.ok(maxRadius<1,'all luminous rods remain inside original outer sphere');
const hit=(o,d,objects=[mesh])=>new THREE.Raycaster(new THREE.Vector3(...o),new THREE.Vector3(...d),0,4).intersectObjects(objects,false);
for(let i=0;i<13;i++)for(let j=0;j<13;j++){
  const x=-.29+i*.58/12,z=-.29+j*.58/12;
  assert.equal(hit([x,2,z],[0,-1,0]).length,0);
  assert.equal(hit([x,-2,z],[0,1,0]).length,0);
}
// Width at an actual grid face, not at an empty space between line edges.
const faceY=lattice.entrancePoint([.5,.5,-1])[1];
for(const d of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]) close(hit([0,faceY,0],d)[0].distance,.5964/2,1e-6);
for (const id of ['yin2','yang1']) {
  const piece=original.PIECES[id];
  for(const g of [original.bandGeometry(piece.side,piece.hemi),original.discGeometry(piece.disc),original.capGeometry(piece.disc)]) {
    const shell=new THREE.Mesh(g,mesh.material);shell.updateMatrixWorld();
    for(const x of [-.29,0,.29])for(const z of [-.29,0,.29])assert.equal(hit([x,2,z],[0,-1,0],[shell]).length,0);
  }
}
console.log(`PASS: ${faces} full cell faces, 0.6 edges/90-degree corners, ${edges.length} unique rods, 0.5964 square clear opening, 338 clearance rays; max radius ${maxRadius.toFixed(6)} < 1`);
