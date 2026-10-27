const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const { NextResponse } = require('next/server');
function route(row) {
  let reads = 0, writes = 0;
  const query = { select(){return this}, eq(){return this}, async maybeSingle(){ reads++; return {data:row,error:null} } };
  const client = {from(){return query}, async rpc(){ writes++; return {data:[row],error:null} } };
  const out = {exports:{}};
  const source=ts.transpileModule(fs.readFileSync('app/api/visitor/record/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{module:out,exports:out.exports,URL,console:{error(){}},require(id){
    if(id==='next/server') return {NextResponse};
    if(id==='node:crypto') return require(id);
    if(id==='@/lib/local-visitor-counter') return {readLocalVisitorCount(){throw Error('must not fall back')},recordLocalVisitorVisit(){throw Error('must not fall back')}};
    if(id==='@/lib/trust-counter-floors') return {visitorFloorFor:()=>0,monotonicCount:(...values)=>Math.max(0,...values.filter(v=>Number.isSafeInteger(v)&&v>0))};
    if(id==='@/lib/visitor-counter') return {VISITOR_MIN_DISPLAY_COUNT:0,getVisitorSupabaseClient:()=>client,isFeatureKey:v=>v==='home'};
    throw Error(id);
  }});
  return {...out.exports,counts:()=>({reads,writes})};
}
const request=()=>new Request('http://localhost/api/visitor/record?featureKey=home',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({featureKey:'home',visitId:'00000000-0000-4000-8000-000000000001'})});
test('valid database counts preserve the existing result and GET never records a visit',async()=>{
  for(const value of [0,12,'0','123']) {
    const api=route({feature_key:'home',real_count:value});
    const get=await api.GET(new Request('http://localhost/api/visitor/record?featureKey=home'));
    assert.equal(get.status,200);assert.equal((await get.json()).displayCount,Number(value));
    assert.deepEqual(api.counts(),{reads:1,writes:0});
    const post=await api.POST(request());assert.equal(post.status,200);assert.equal((await post.json()).displayCount,Number(value));
  }
});
test('invalid, missing or mismatched database counts fail explicitly, never become a successful zero',async()=>{
  const rows=[null,{feature_key:'home'},... [null,'',' ',NaN,Infinity,-1,'-1','no-count',1.2,Number.MAX_SAFE_INTEGER+1].map(real_count=>({feature_key:'home',real_count})),{feature_key:'music',real_count:12}];
  for(const row of rows) {
    const api=route(row);
    for(const response of [await api.GET(new Request('http://localhost/api/visitor/record?featureKey=home')),await api.POST(request())]) {
      assert.equal(response.status,503,`row ${JSON.stringify(row)} must be unavailable`);
      assert.equal(response.headers.get('cache-control'),'no-store');
      const result=await response.json();assert.equal(result.ok,false);assert.equal(result.displayCount,undefined);
    }
  }
});
