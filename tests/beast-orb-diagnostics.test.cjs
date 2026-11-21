const assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (m,f) => m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
global.window = {}; global.document = {hidden:false};
let saved;
global.sessionStorage = {setItem(key,value) { saved = JSON.parse(value); }};
const d = require('../lib/beast-game/match3/orb-diagnostics.ts');
d.setOrbDiagnosticPhase('request',true);
d.recordOrbDiagnostic('response',1200,200);
assert.equal(saved,undefined,'successful traffic does not write storage');
document.hidden=true; d.recordOrbDiagnostic('visibility');
d.recordOrbDiagnostic('aborted',15001);
assert.equal(saved.events.at(-1).hidden,true);
assert.equal(saved.events.at(-1).ms,15001);
document.hidden=false;d.setOrbDiagnosticPhase('idle',false);
assert.equal(saved.events.at(-1).busy,false,'recovery remains with fault evidence');
for(let i=0;i<1000;i++) d.recordOrbDiagnostic('response',i,200);
assert.equal(d.readOrbDiagnostics().length,100,'long sessions have bounded history');
assert(saved.events.every(e=>Object.keys(e).every(k=>['at','event','phase','hidden','busy','ms','status'].includes(k))));
sessionStorage.setItem=()=>{throw Error('quota/private mode')};
assert.doesNotThrow(()=>d.recordOrbDiagnostic('network-error',200));
const copy=d.readOrbDiagnostics();copy[0].phase='ended';
assert.notEqual(d.readOrbDiagnostics()[0].phase,'ended','readers cannot mutate history');
console.log('PASS bounded history, visibility, elapsed time, recovery, field allowlist, storage failure isolation');
const vm = require('node:vm');
const effects=[],listeners=new Set(),timers=new Map();let sequence=0;
document.addEventListener=(_,f)=>listeners.add(f);
document.removeEventListener=(_,f)=>listeners.delete(f);
window.setTimeout=(f)=>{timers.set(++sequence,f);return sequence;};
window.clearTimeout=id=>timers.delete(id);
const hook={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/battlefield/useOrbDiagnostics.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
  exports:hook.exports,require:name=>name==='react'?{useEffect:f=>effects.push(f)}:d,window,document,performance,
});
for(let i=0;i<200;i++){
  effects.length=0;hook.exports.useOrbDiagnostics('fall',true);
  const cleanup=effects.map(f=>f());
  assert.equal(listeners.size,1);assert.equal(timers.size,1);
  if(i===0){document.hidden=true;for(const f of listeners)f();for(const f of timers.values())f();assert.equal(d.readOrbDiagnostics().at(-1).event,'slow');}
  cleanup.forEach(f=>f?.());assert.equal(listeners.size,0);assert.equal(timers.size,0);
}
console.log('PASS 200 observer mount/unmount cycles, visibility evidence, slow watchdog, no leaked listeners/timers');
