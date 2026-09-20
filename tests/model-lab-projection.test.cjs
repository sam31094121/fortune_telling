const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),THREE=require('three');
const source=fs.readFileSync('components/model-lab/projectionMath.ts','utf8');const m={exports:{}};
new Function('exports','module',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(m.exports,m);
const {VERTICES_4D:V,EDGES_4D:E,project4D,PROJECTION:P}=m.exports;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const difference=(a,b)=>a.map((v,i)=>v-b[i]);const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
assert.equal(V.length,16);assert.equal(new Set(V.map(v=>v.join(','))).size,16);assert.equal(E.length,32);
assert.equal(new Set(E.map(e=>`${e.from}:${e.to}`)).size,32);
for(let i=0;i<16;i++)assert.equal(E.filter(e=>e.from===i||e.to===i).length,4);
for(const e of E)close(Math.hypot(...difference(V[e.from],V[e.to])),2);
let cells=0,faces=0;
for(let axis=0;axis<4;axis++)for(const sign of [-1,1]){
 const ids=V.map((v,i)=>v[axis]===sign?i:-1).filter(i=>i>=0);assert.equal(ids.length,8);
 assert.equal(E.filter(e=>ids.includes(e.from)&&ids.includes(e.to)).length,12);cells++;
}
for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
 const fixed=[0,1,2,3].filter(i=>i!==a&&i!==b);
 for(const s of [-1,1])for(const t of [-1,1]){
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const p=[0,0,0,0];p[a]=u;p[b]=v;p[fixed[0]]=s;p[fixed[1]]=t;assert.ok(V.some(q=>q.every((x,i)=>x===p[i])));return p});
  const edges=corners.map((p,i)=>difference(corners[(i+1)%4],p));
  for(let i=0;i<4;i++){close(Math.hypot(...edges[i]),2);close(dot(edges[i],edges[(i+1)%4]),0)}faces++;
 }
}
assert.equal(cells,8);assert.equal(faces,24);
// Lock the user's approved preview parameters, including colour and projection.
assert.equal(P.distance4D,3);assert.equal(P.numerator,2);assert.equal(P.lineRadius,.008);
assert.deepEqual([P.outer,P.bridge,P.inner],['#55dcff','#ffc768','#c891fa']);
assert.equal(P.glowScale,2.8);assert.equal(P.glowOpacity,.09);assert.deepEqual(P.camera,[3.7,2.6,5.3]);assert.equal(P.cameraScale,1.16);
const projected=V.map(v=>new THREE.Vector3(...project4D(v)));
for(const e of E){const length=projected[e.from].distanceTo(projected[e.to]);close(length,e.axis===3?Math.sqrt(3)/2:V[e.from][3]===1?2:1)}
// All representative viewing rotations preserve the existing projected metric.
for(const angles of [[0,0,0],[.4,.7,0],[Math.PI/2,Math.PI/4,0],[Math.PI,Math.PI*.7,0]]){
 const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...angles));const r=projected.map(p=>p.clone().applyQuaternion(q));
 for(const e of E)close(r[e.from].distanceTo(r[e.to]),projected[e.from].distanceTo(projected[e.to]));
}
assert.ok(Math.sqrt(3)*P.taijiScale+P.lineRadius*P.glowScale*P.taijiScale<1,'projection fits inside original R1 sphere');
console.log('PASS: approved preview parameters; 16 vertices, 32 unique edges, 8 cubic cells; all 24 source faces have four length-2 edges and 90-degree corners; 4 viewing rotations preserve geometry; 3D bridge length sqrt(3)/2 is intentionally not the outer edge length 2.');
