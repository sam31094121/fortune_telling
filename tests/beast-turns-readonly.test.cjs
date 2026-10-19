// Execute the actual GET handler with a virtual filesystem, never customer data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('app/api/beast-game/turns/route.ts', 'utf8');
const existing = {owned:['beast_a01'], experience:{}, match:{status:'FINISHED', seed:42}, revision:7, lastRequest:'preserve'};
let stored = JSON.stringify(existing), writes = 0;
const issuedCookies = [];
const mockFs = {
  mkdir: async()=>{}, stat:async()=>{throw Object.assign(new Error(),{code:'ENOENT'});}, rm:async()=>{},
  readFile:async()=>{if(stored===null)throw Object.assign(new Error(),{code:'ENOENT'});return stored;},
  writeFile:async(_file,text)=>{writes++;stored=text;}, rename:async()=>{},
};
const sandbox = {exports:{}, process, console, URL, require(name) {
  if(name==='node:fs/promises')return mockFs;
  if(name==='next/server')return {NextResponse:{json:(data)=>({data,cookies:{set(...args){issuedCookies.push(args);}}})}};
  if(name==='@/lib/beast-game/interactive')return {interactiveCatalog:()=>Array.from({length:6},(_,i)=>({id:`beast_a0${i+1}`}))};
  if(name==='@/lib/beast-game/battle-view')return {battleViewFor:()=>({})};
  if(name==='@/lib/beast-game/battle-session')return {signBattleSession:()=> 'test-ticket'};
  if(name==='@/lib/beast-game/iching-skill-archive')return {TURNS_START_DEFAULT_DIFFICULTY:'NORMAL'};
  return require(name);
}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,sandbox);
(async()=>{
 const req=new Request('http://127.0.0.1/api/beast-game/turns',{headers:{cookie:'beast_turn_account=11111111-1111-4111-8111-111111111111'}});
 const before=stored;
 for(let i=0;i<3;i++)assert.equal((await sandbox.exports.GET(req)).data.account.revision,7);
 assert.equal(stored,before);assert.equal(writes,0,'Existing record must never be rewritten by GET');
 assert.equal(issuedCookies.length,3);
 for(const [name,value,options] of issuedCookies){
   assert.equal(name,'beast_turn_account');
   assert.equal(value,'11111111-1111-4111-8111-111111111111','Reload keeps the same player identity');
   assert.equal(options.httpOnly,true);
   assert.equal(options.path,'/');
 }
 stored=null;
 const first=await sandbox.exports.GET(req);
 assert.equal(first.data.account.match,null);assert.equal(writes,1,'A new account is initialized once');
 await sandbox.exports.GET(req);assert.equal(writes,1);
 console.log('PASS existing battle GET: bytes preserved, zero writes; new account initialized once');
})().catch(e=>{console.error(e);process.exitCode=1;});
