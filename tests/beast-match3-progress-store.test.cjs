const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const SELF = 'match3-hard-progress-self-v1', GUEST = 'match3-hard-progress-guest-v1', LEGACY = 'match3-hard-progress';
class FakeStorage {
  constructor() { this.data = new Map(); this.blockRead = false; this.blockWrite = false; }
  getItem(k) { if (this.blockRead) throw Error('blocked read'); return this.data.get(k) ?? null; }
  setItem(k,v) { if (this.blockWrite) throw Error('blocked write'); this.data.set(k,String(v)); }
}
function fresh(win) {
  const cache = new Map();
  const load = file => {
    file = path.resolve(file); if (cache.has(file)) return cache.get(file).exports;
    const module = {exports:{}}; cache.set(file,module);
    const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInNewContext(code,{module,exports:module.exports,window:win,require:id=>load(path.resolve(path.dirname(file),id+'.ts'))},{filename:file});
    return module.exports;
  };
  return load('lib/beast-game/match3/progress-store.ts');
}
let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const browser=()=>({localStorage:new FakeStorage(),sessionStorage:new FakeStorage()});
test('self persists across module reload and old rounds cannot lower progress',()=>{
  const w=browser(); let p=fresh(w);
  assert(p.saveMatch3Progress('self',8)); assert(p.saveMatch3Progress('self',3));
  p=fresh(w); assert.equal(p.readMatch3Progress('self'),8);
  w.localStorage.setItem(SELF,'12'); assert(p.saveMatch3Progress('self',9));
  assert.equal(w.localStorage.getItem(SELF),'12');
  assert.equal(w.sessionStorage.data.size,0);
});
test('guest resets on every explicit selection without affecting self or legacy',()=>{
  const w=browser(),p=fresh(w);
  p.saveMatch3Progress('self',20); p.saveMatch3Progress(null,11);
  p.saveMatch3Progress('guest',7); p.resetGuestMatch3Progress();
  assert.equal(p.readMatch3Progress('guest'),0);
  p.saveMatch3Progress('guest',2); p.resetGuestMatch3Progress();
  assert.equal(fresh(w).readMatch3Progress('guest'),0);
  assert.equal(p.readMatch3Progress('self'),20); assert.equal(p.readMatch3Progress(null),11);
  assert.deepEqual([...w.localStorage.data.keys()],[SELF]);
  assert.deepEqual([...w.sessionStorage.data.keys()].sort(),[LEGACY,GUEST].sort());
});
test('unlabelled legacy progress is never assigned to self or guest',()=>{
  const w=browser(); w.sessionStorage.setItem(LEGACY,'6'); const p=fresh(w);
  assert.equal(p.readMatch3Progress(null),6); assert.equal(p.readMatch3Progress('self'),0); assert.equal(p.readMatch3Progress('guest'),0);
  p.saveMatch3Progress(null,4); assert.equal(w.sessionStorage.getItem(LEGACY),'6');
});
test('invalid persisted values safely start at zero; progression normalization is retained',()=>{
  for(const raw of ['', 'abc', 'null', '{}', '-1', 'NaN', 'Infinity', '0x10']) {
    const w=browser(); w.localStorage.setItem(SELF,raw); assert.equal(fresh(w).readMatch3Progress('self'),0,raw);
  }
  const w=browser(),p=fresh(w);
  for(const n of [NaN,Infinity,-1]) { p.saveMatch3Progress('self',n); assert.equal(p.readMatch3Progress('self'),0); }
  p.saveMatch3Progress('self',4.9); assert.equal(p.readMatch3Progress('self'),4);
  p.saveMatch3Progress('self',Number.MAX_VALUE); assert.equal(p.readMatch3Progress('self'),Number.MAX_SAFE_INTEGER);
});
test('blocked storage retains memory, reports false, and recovery never rolls back',()=>{
  const w=browser(),p=fresh(w); w.localStorage.blockRead=true; w.localStorage.blockWrite=true;
  assert.equal(p.saveMatch3Progress('self',5),false); assert.equal(p.readMatch3Progress('self'),5);
  assert.equal(p.saveMatch3Progress('self',2),false); assert.equal(p.readMatch3Progress('self'),5);
  w.localStorage.blockRead=false; w.localStorage.blockWrite=false;
  assert(p.saveMatch3Progress('self',1)); assert.equal(fresh(w).readMatch3Progress('self'),5);
});
test('failed guest reset cannot resurrect stale previous guest value',()=>{
  const w=browser(),p=fresh(w); p.saveMatch3Progress('guest',9); w.sessionStorage.blockWrite=true;
  p.resetGuestMatch3Progress(); assert.equal(p.readMatch3Progress('guest'),0);
  assert.equal(p.saveMatch3Progress('guest',1),false); assert.equal(p.readMatch3Progress('guest'),1);
  w.sessionStorage.blockWrite=false; assert(p.saveMatch3Progress('guest',1));
  assert.equal(fresh(w).readMatch3Progress('guest'),1);
});
test('explicit legacy claim preserves the greater self value and never deletes the old record',()=>{
  for (const own of [2,10]) {
    const w=browser(),p=fresh(w); p.saveMatch3Progress(null,6); p.saveMatch3Progress('self',own);
    assert(p.saveMatch3Progress('self',p.readMatch3Progress(null)));
    assert.equal(p.readMatch3Progress('self'),Math.max(own,6));
    assert.equal(p.readMatch3Progress(null),6);
    assert.equal(p.readMatch3Progress('guest'),0);
    p.saveMatch3Progress('self',p.readMatch3Progress(null));
    assert.equal(p.readMatch3Progress('self'),Math.max(own,6));
  }
  const w=browser(),p=fresh(w); p.saveMatch3Progress(null,6); w.localStorage.blockWrite=true;
  assert.equal(p.saveMatch3Progress('self',p.readMatch3Progress(null)),false);
  assert.equal(p.readMatch3Progress('self'),6);
  assert.equal(w.localStorage.getItem(SELF),null);
});

test('throwing Storage getters and server rendering remain safe',()=>{
  const w={get localStorage(){throw Error('SecurityError');},get sessionStorage(){throw Error('SecurityError');}};
  const p=fresh(w); assert.equal(p.saveMatch3Progress('self',4),false); assert.equal(p.readMatch3Progress('self'),4);
  p.saveMatch3Progress('guest',6); p.resetGuestMatch3Progress(); assert.equal(p.readMatch3Progress('guest'),0);
  const server=fresh(undefined); assert.equal(server.saveMatch3Progress('self',5),false); assert.equal(server.readMatch3Progress('self'),0); assert.doesNotThrow(()=>server.resetGuestMatch3Progress());
});
console.log(`progress-store: ${checks} groups passed`);
