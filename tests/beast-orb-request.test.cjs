const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const Module=require('node:module'),m=new Module(__filename);
m._compile(ts.transpileModule(fs.readFileSync('lib/beast-game/match3/orb-request.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,__filename);
const {postOrbTurn}=m.exports;
(async()=>{const original=global.fetch;try{
 const calls=[],body=JSON.stringify({sharedVersion:7,path:[{r:1,c:2}]}),headers={'x-beast-wallet':'test'},signal=new AbortController().signal;
 global.fetch=async(url,options)=>{calls.push({url,...options});if(calls.length===1)throw Error('response lost after commit');return new Response('{"sharedVersion":8}');};
 assert.equal((await (await postOrbTurn(body,headers,signal)).json()).sharedVersion,8);assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1],'retry cannot change version, controls or credentials');
 let count=0;global.fetch=async()=>{count++;return new Response('{}',{status:count===1?503:200});};assert.equal((await postOrbTurn(body,headers,signal)).status,200);assert.equal(count,2,'transient server failure retries once');
 count=0;global.fetch=async()=>{count++;return new Response('{}',{status:503});};assert.equal((await postOrbTurn(body,headers,signal)).status,503);assert.equal(count,2,'persistent server failure is bounded');
 count=0;global.fetch=async()=>{count++;return new Response('{}',{status:400});};assert.equal((await postOrbTurn(body,headers,signal)).status,400);assert.equal(count,1,'validation errors never spin');
 count=0;global.fetch=async()=>{count++;throw Error('offline');};await assert.rejects(postOrbTurn(body,headers,signal));assert.equal(count,2,'offline retry bounded');
 count=0;const controller=new AbortController();global.fetch=async()=>{count++;controller.abort();throw Error('left page');};await assert.rejects(postOrbTurn(body,headers,controller.signal));assert.equal(count,1,'unmount cancels retry');
 console.log('PASS orb command transport: identical retry after lost response, validation no retry, offline bounded, abort stops retry');
}finally{global.fetch=original;}})().catch(e=>{console.error(e);process.exitCode=1;});
