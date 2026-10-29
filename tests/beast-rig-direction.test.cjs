const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const cache = new Map();

// Render the real presentation components. Effects do not run or write inventory.
function load(relative) {
  let file = path.resolve(root, relative);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index');
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const customRequire = id => {
    if (id.endsWith('.css')) return new Proxy({}, { get: (_, key) => String(key) });
    if (id === 'next/link') return function Link({ children, ...props }) { return React.createElement('a', props, children); };
    if (id === 'next/dynamic') return () => () => null;
    return id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
  };
  vm.runInNewContext(source, { module: mod, exports: mod.exports, require: customRequire, console, process, setTimeout, clearTimeout, AbortController, structuredClone, crypto: require('node:crypto').webcrypto }, { filename: file });
  return mod.exports;
}

// Regression probe: same centerline as the medium card stage; no battle data or account writes.
const rigs=load('lib/beast-game/beast-rig.ts');
const stage=load('components/battlefield/BeastRigStage.tsx');
const layouts=[{arenaWidth:390,from:{cx:180,top:250,width:64,height:90},to:{cx:180,top:103,width:64,height:90}},{arenaWidth:640,from:{cx:300,top:580,width:70,height:98},to:{cx:120,top:90,width:96,height:134}},{arenaWidth:640,from:{cx:120,top:580,width:70,height:98},to:{cx:300,top:90,width:96,height:134}}];
let geometry=layouts[0];
function mouth(rig,ms,forceFrame){
 const t=ms/rigs.RIG_STRIKE_MS,frame=rigs.strikeFrame(t,rig.style);
 const layer=frame.layers.reduce((a,b)=>b.alpha>a.alpha?b:a);
 const spec=rig.frames.find(x=>x.id===(forceFrame??layer.frame));
 const image=load('public/beast-game/rig/'+rig.dir+'/manifest.json').frames.find(x=>x.id===spec.id);
 const aspect=image.width/image.height,p=stage.alignRigContact(stage.placeRig(geometry,frame,rig.style.size),frame,spec,aspect,t,geometry,rig);
 const point=spec.contact??[spec.anchors.head[0]-.1,spec.anchors.jaw[1]];
 const d=spec.anchors?rigs.meshDisplace(point[0],point[1],aspect,spec.anchors,rigs.livingPose(t,rig.style),t,rig.style):[0,0];
 const dh=p.unit*spec.norm,angle=p.rotation*(p.mirror?-1:1);
 const x=((point[0]-.5)*dh*aspect+d[0]*dh)*(p.mirror?-1:1),y=((point[1]-.92)*dh+d[1]*dh)*frame.squash;
 return {x:p.x+x*Math.cos(angle)-y*Math.sin(angle),y:p.y+x*Math.sin(angle)+y*Math.cos(angle),angle,mirror:p.mirror,frame:layer.frame,p};
}
const defects=[];
for(const layout of layouts){
 geometry=layout;
for(const id of ['qinglong','zhuque','xuanwu']){
 const rig=rigs.BEAST_RIGS['beast_g_'+id],a=mouth(rig,750),b=mouth(rig,900);
 assert.equal(a.frame,b.frame,'direction samples must use the same visible posture');
 const runA=mouth(rig,650,'run-gather'),runB=mouth(rig,650,'run-reach');
 assert.ok(Math.hypot(runA.x-runB.x,runA.y-runB.y)<1e-5,id+' posture changes must not jump the mouth origin');
 const sign=a.mirror?1:-1,dx=b.x-a.x,dy=b.y-a.y;
 const forward=dx*sign*Math.cos(a.angle)+dy*sign*Math.sin(a.angle);
 if(forward < -1) defects.push({id,fromMs:750,toMs:900,dx:+dx.toFixed(2),dy:+dy.toFixed(2),forward:+forward.toFixed(2)});
 for(const ms of [1120,1250]){ const m=mouth(rig,ms),pull=stage.rigContactPull(m.p,ms/rigs.RIG_STRIKE_MS,geometry.to.width);assert.ok(Math.abs(m.x-geometry.to.cx-pull[0])<1e-5);assert.ok(Math.abs(m.y-geometry.to.top-geometry.to.height*.55-pull[1])<1e-5); }
}
}
console.log('Non-feline forward-charge defects:',JSON.stringify(defects));
assert.deepEqual(defects,[],'head-facing direction must agree with charge; end-point contact alone is insufficient');
console.log('PASS: three non-feline charge directions and locked bite/tear contact');
