const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const ts=require('typescript');
function cleanup(dir){
 const resolved=fs.realpathSync(dir), parent=fs.realpathSync(os.tmpdir());
 assert.equal(path.dirname(resolved),parent);
 assert(path.basename(resolved).startsWith('visitor-'));
 fs.rmSync(resolved,{recursive:true,force:true});
}
function load(dir,vercel=false){
 const m={exports:{}};
 const source=ts.transpileModule(fs.readFileSync('lib/local-visitor-counter.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(source,{module:m,exports:m.exports,process:{env:vercel?{VERCEL:'1'}:{}},require(id){
  if(id==='server-only') return {};
  if(id==='@/lib/local-data-directory')return {resolveLocalDataDirectory:()=>dir};
  if(id==='@/lib/visitor-counter')return {FEATURE_KEYS:{home:'home',music:'music'},VISITOR_MIN_DISPLAY_COUNT:0,VISITOR_SEED_COUNT:0};
  return require(id);
 }});return m.exports;
}
test('retained events are authoritative; originals preserved, GET read-only, no 5000-event truncation, retries deduplicated',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'visitor-integrity-'));
 try {
  const ids=Array.from({length:5001},(_,i)=>`event-${i}`);
  const initial=JSON.stringify({home:{displayCount:110128+5001,visitIds:ids,updatedAt:'2026-01-01T00:00:00Z'}});
  const file=path.join(dir,'visitor-counters.json');fs.writeFileSync(file,initial);
  const api=load(dir);
  assert.equal(await api.readLocalVisitorCount('home'),5001);
  assert.equal(fs.readFileSync(file,'utf8'),initial,'read must not rewrite history');
  assert.deepEqual(await Promise.all([api.recordLocalVisitorVisit('home','new-event'),api.recordLocalVisitorVisit('home','new-event')]),[5002,5002]);
  const saved=JSON.parse(fs.readFileSync(file));
  assert.equal(saved.home.unverifiedHistoricalCount,110128);
  assert.equal(saved.home.visitIds.length,5002);
  assert.equal(saved.home.visitIds[0],'event-0');
  const archive=fs.readdirSync(path.join(dir,'counter-history'));
  assert(archive.some(name=>fs.readFileSync(path.join(dir,'counter-history',name),'utf8')===initial));
  assert.equal(await load(dir).readLocalVisitorCount('home'),5002);
  const before=fs.readFileSync(file,'utf8');await api.readLocalVisitorCount('home');assert.equal(fs.readFileSync(file,'utf8'),before);
  const after=await Promise.all(['a','b','c'].map(id=>api.recordLocalVisitorVisit('home',id)));
  assert.deepEqual(after,[5003,5004,5005]);
 }finally{cleanup(dir);}
});
test('missing/corrupt reads and ephemeral production storage are unavailable, not zero',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'visitor-unavailable-'));
 try {
  await assert.rejects(load(dir).readLocalVisitorCount('home'),/unavailable/);
  fs.writeFileSync(path.join(dir,'visitor-counters.json'),'{broken');
  await assert.rejects(load(dir).recordLocalVisitorVisit('home','test'),/unavailable/);
  await assert.rejects(load(dir,true).readLocalVisitorCount('home'),/Persistent/);
  for (const invalid of [{},{home:null},{home:{displayCount:-1,visitIds:[],updatedAt:'2026-01-01'}},{home:{displayCount:1,visitIds:[null],updatedAt:'2026-01-01'}}]) {
   fs.writeFileSync(path.join(dir,'visitor-counters.json'),JSON.stringify(invalid));
   await assert.rejects(load(dir).readLocalVisitorCount('home'),/unavailable/);
   await assert.rejects(load(dir).recordLocalVisitorVisit('home','test'),/unavailable/);
  }
  fs.writeFileSync(path.join(dir,'visitor-counters.json'),JSON.stringify({music:{displayCount:0,visitIds:[],updatedAt:'2026-01-01'}}));
  await assert.rejects(load(dir).readLocalVisitorCount('home'),/unavailable/);
 }finally{cleanup(dir);}
});
