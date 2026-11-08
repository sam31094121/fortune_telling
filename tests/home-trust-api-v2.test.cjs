const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {test}=require('node:test');
const {randomUUID}=require('node:crypto');
function load(file,client) {
 const mod={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module:mod,exports:mod.exports,URL,Number,require(id){
  if(id==='server-only')return {};
  if(id==='@/lib/visitor-counter')return {getVisitorSupabaseClient:()=>client};
  if(id==='@/lib/home-trust-contract')return load('lib/home-trust-contract.ts',client);
  if(id==='@/lib/home-trust-vote-limiter')return {checkVoteRateLimit:()=> 'allow',getClientIp:()=> 'test',releaseVoteEvent(){}};
  return require(id);
 }});return mod.exports;
}
test('GET only reads real zero counts; missing rows fail instead of fabricating zero',async()=>{
 for(const data of [null,{epoch:'home-20261108-v2',agree_count:0,disagree_count:0,view_count:0,revision:0}]){
  const query={select(){return this},eq(){return this},async maybeSingle(){return {data,error:null}}};
  const api=load('lib/home-trust-counters.ts',{from:()=>query,rpc(){throw Error('GET must never write')}});
  const response=await api.handleHomeTrustRead();assert.equal(response.status,data?200:503);
  const result=await response.json();if(data)assert.equal(result.agreeCount,0);else assert.equal(result.agreeCount,undefined);
 }
});
test('old payloads and cross-site writes are rejected; valid event passes unchanged to database',async()=>{
 const calls=[];const api=load('lib/home-trust-counters.ts',{async rpc(name,args){calls.push({name,args});return {data:[{epoch:'home-20261108-v2',agree_count:1,disagree_count:0,view_count:0,revision:1,applied:true}],error:null}}});
 const request=(body,origin)=>new Request('http://localhost/api/home-trust/agree',{method:'POST',headers:{'content-type':'application/json',...(origin?{origin}: {})},body:JSON.stringify(body)});
 const id=randomUUID();
 assert.equal((await api.handleHomeTrustIncrement('agree',request({eventId:id}))).status,400);
 assert.equal((await api.handleHomeTrustIncrement('agree',request({epoch:'home-20261108-v2',eventId:id},'http://other'))).status,403);
 assert.equal(calls.length,0);
 assert.equal((await api.handleHomeTrustIncrement('agree',request({epoch:'home-20261108-v2',eventId:id}))).status,200);
 assert.equal(calls[0].name,'home_trust_increment_v2');assert.equal(calls[0].args.p_event_id,id);
});
