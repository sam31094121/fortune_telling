const assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {readBeastCatalog}=require('../lib/beast-game/catalog-request.ts');
(async()=>{const original=global.fetch;try{
let calls=0;global.fetch=async url=>{assert.equal(url,'/api/beast-game');if(++calls===1)throw Error('offline');return new Response(JSON.stringify({ok:true,cards:[{id:'actual'}]}));};assert.equal((await readBeastCatalog(new AbortController().signal)).cards[0].id,'actual');assert.equal(calls,2);
calls=0;global.fetch=async()=>{calls++;return new Response('',{status:503});};await assert.rejects(readBeastCatalog(new AbortController().signal));assert.equal(calls,2);
calls=0;global.fetch=async()=>{calls++;return new Response('',{status:400});};await assert.rejects(readBeastCatalog(new AbortController().signal));assert.equal(calls,1);
calls=0;const cancelled=new AbortController();cancelled.abort();await assert.rejects(readBeastCatalog(cancelled.signal));assert.equal(calls,0);
const timed=new AbortController();calls=0;global.fetch=async(_,options)=>{calls++;return new Promise((_,reject)=>{options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});setTimeout(()=>{},25);});};await assert.rejects(readBeastCatalog(timed.signal,5));assert.equal(calls,2);
console.log('PASS read-only catalog: network retry, bounded timeout/503, no retry 400, cancellation; only GET /api/beast-game');
}finally{global.fetch=original;}})().catch(e=>{console.error(e);process.exitCode=1;});
