const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function run(mobile=true,hash='') {
 const events=new Map(),timers=[],calls=[];let cleanup;
 const window={matchMedia:()=>({matches:mobile}),location:{hash},history:{scrollRestoration:'auto'},addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k),requestAnimationFrame:f=>{timers.push(f);return 1},cancelAnimationFrame(){},setTimeout:f=>{timers.push(f);return 2}};
 const mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/useMobileHomeEntry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{window,clearTimeout(){},module:mod,exports:mod.exports,require(){return {useLayoutEffect:fn=>{cleanup=fn()}}}});
 mod.exports.useMobileHomeEntry({current:{scrollIntoView:options=>calls.push(options)}});
 return {window,events,timers,calls,cleanup};
}
test('phone entry aligns tools immediately and finishes bounded settling',()=>{const r=run();assert.equal(r.calls.length,1);r.timers.forEach(f=>f());assert.equal(r.calls.length,4);assert.equal(r.window.history.scrollRestoration,'manual');r.cleanup();assert.equal(r.window.history.scrollRestoration,'auto');assert.equal(r.events.size,0)});
test('a user touch cancels further alignment instead of fighting their scroll',()=>{const r=run();r.events.get('touchstart')();r.timers.forEach(f=>f());assert.equal(r.calls.length,1);r.cleanup()});
test('desktop and explicit deep links keep their own entry behavior',()=>{for(const r of [run(false),run(true,'#home-trust-strip')]){assert.equal(r.calls.length,0);assert.equal(r.window.history.scrollRestoration,'auto')}});
