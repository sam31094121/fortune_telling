// Real route + real compiled battle engine, with memory-only account storage.
// No HTTP server, customer cookie, real account directory or browser collection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const engine = require('../.beast-game-build/lib/beast-game/interactive.js');
let stored = null, writes = 0;
const virtualFs = {
  mkdir: async () => {}, stat: async () => { throw Object.assign(new Error(), {code:'ENOENT'}); }, rm: async () => {},
  readFile: async () => { if(stored === null) throw Object.assign(new Error(), {code:'ENOENT'}); return stored; },
  writeFile: async (_, value) => { stored = value; writes++; }, rename: async () => {},
};
const sandbox = {exports:{}, process, console, URL, require(name) {
  if(name === 'node:fs/promises') return virtualFs;
  if(name === 'next/server') return {NextResponse:{json:(data,options={})=>({data,status:options.status??200,cookies:{set(){}}})}};
  if(name.startsWith('@/lib/beast-game/')) return require(path.resolve('.beast-game-build',name.slice(2)+'.js'));
  return require(name);
}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/beast-game/turns/route.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},
}).outputText,sandbox);
const headers={cookie:'beast_turn_account=11111111-1111-4111-8111-111111111111',origin:'http://127.0.0.1','content-type':'application/json'};
const get=()=>sandbox.exports.GET(new Request('http://127.0.0.1/api/beast-game/turns',{headers}));
const post=body=>sandbox.exports.POST(new Request('http://127.0.0.1/api/beast-game/turns',{method:'POST',headers,body:JSON.stringify(body)}));
(async()=>{
  let response=await get();
  const owned=[...response.data.account.owned];
  const lineup=engine.interactiveCatalog().slice(0,3).map(c=>c.id);
  response=await post({type:'START',lineup,revision:0,requestId:'start',difficulty:'NORMAL'});
  assert.equal(response.status,200); assert.equal(response.data.account.match.status,'PLAYING');
  const playing=stored, count=writes;
  await get(); assert.equal(stored,playing); assert.equal(writes,count);
  const rejected=await post({type:'START',lineup,revision:1,requestId:'replace-live'});
  assert.equal(rejected.status,400); assert.equal(stored,playing,'Cannot replace an unfinished match');
  let lastBody;
  for(let i=0;i<200&&response.data.account.match.status==='PLAYING';i++){
    lastBody={type:'ACTION',action:engine.chooseAI(response.data.account.match,'player'),revision:response.data.account.revision,requestId:`move-${i}`,ticket:response.data.ticket};
    response=await post(lastBody);
    assert.equal(response.status,200); assert.equal(response.data.ok,true);
  }
  assert.equal(response.data.account.match.status,'FINISHED');
  for(const id of lineup)assert.equal(response.data.account.experience[id],1);
  assert.deepEqual([...response.data.account.owned],owned,'Free battle does not alter owned cards');
  const finished=stored, finishedWrites=writes;
  await get(); await get(); assert.equal(stored,finished);assert.equal(writes,finishedWrites);
  await post(lastBody); assert.equal(stored,finished,'Duplicate final action cannot award twice');
  const stale=await post({...lastBody,requestId:'stale-final'});
  assert.equal(stale.status,400);assert.equal(stored,finished);
  response=await post({type:'START',lineup,revision:response.data.account.revision,requestId:'next-match'});
  assert.equal(response.data.account.match.status,'PLAYING');
  for(const id of lineup)assert.equal(response.data.account.experience[id],1);
  console.log('PASS isolated real-route flow: start, complete battle, single award, repeat GET, duplicate/stale action, next match; no real storage');
})().catch(error=>{console.error(error);process.exitCode=1;});
