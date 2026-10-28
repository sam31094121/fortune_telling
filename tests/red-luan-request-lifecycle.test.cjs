// Execute the page's actual request/edit handlers with controlled transport/timers.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('app/red-luan-heartbeat/page.tsx','utf8');
const ast = ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names = new Set(['cancelPending','invalidateReading','updateBirthProfile','birthMissingFields','effectivePartnerGender','submit','updateContext']);
const pieces=[];
function visit(node) {
  if(ts.isFunctionDeclaration(node) && names.has(node.name?.text)) pieces.push(node.getText(ast));
  if(ts.isVariableDeclaration(node) && names.has(node.name?.text)) pieces.push('const '+node.getText(ast)+';');
  ts.forEachChild(node,visit);
}
visit(ast);
assert.equal(pieces.length,names.size);
const code=ts.transpileModule(pieces.join('\n')+'\nexports.api={submit,cancelPending,invalidateReading,updateBirthProfile,updateContext};',{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
function mount() {
  let timerId=0,writes=0;
  const requests=[],timers=new Map(),module={exports:{}};
  const ctx={module,exports:module.exports,AbortController,JSON,Promise,Error,
    useCallback:fn=>fn,
    requestRef:{current:null},deadlineRef:{current:null},submitLock:{current:false},
    form:{birthDate:'1990-01-01',gender:'male',timeUnknown:true,birthHourBranch:'unknown'},
    context:{},guidedQuestion:0,CONTEXT_GROUPS:[{},{},{},{}],partnerChoice:'auto',returningName:null,loading:false,reading:null,error:'',ritualStep:-1,retryMode:null,
    HOUR_BRANCH_PENDING:'pending',RITUAL_LINES:['one','two','done'],RITUAL_WAITING_STEP:5,
    getAnalysisIdentityTarget:()=> 'guest',getIdentityRequiredMessage:()=> 'identity',
    toTraditionalHourBranch:()=>undefined,scrollToTarget(){},saveCanonicalBirthProfile(){},fromUnifiedBirthProfile:x=>x,
    giftFoldKeysOf:()=>[],saveRedLuanReturnVisit(){writes++;},taipeiToday:()=> '2026-10-26',friendlyRequestError:e=>e.message,
    setTimeout:fn=>setImmediate(fn),
    window:{setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);}},
    fetch(url,options){return new Promise((resolve,reject)=>requests.push({url,options,resolve,reject}));},
  };
  for(const key of ['form','context','guidedQuestion','reading','loading','error','ritualStep','retryMode'])ctx['set'+key[0].toUpperCase()+key.slice(1)]=value=>ctx[key]=value;
  for(const name of ['setMissing','setReturningName','setEditingBirth','setAppliedContext','setAlignmentChoice','setOpenedLayer','setReflectionChoice','setPeeled','setTeacherKey','setOpenedFolds','setFollowUp','setShowReminderMonths','setRevealedEntrances'])ctx[name]=()=>{};
  vm.runInNewContext(code,ctx);
  return {ctx,api:module.exports.api,requests,timers,writes:()=>writes,
    success(i,id){requests[i].resolve({ok:true,json:async()=>({result:{id},person:{hourKnown:false}})});},
  };
}
test('birth edits remove old reading; no-op preserves it',()=>{
  const p=mount();p.ctx.reading={result:{id:'A'}};p.api.updateBirthProfile({...p.ctx.form});assert.ok(p.ctx.reading);
  p.api.updateBirthProfile({...p.ctx.form,birthDate:'1995-02-23'});assert.equal(p.ctx.reading,null);
});
test('old success/error/finally cannot overwrite a new reading or loading state',async()=>{
  for(const fails of [false,true]){
    const p=mount();const a=p.api.submit(p.ctx.form);p.api.updateBirthProfile({...p.ctx.form,birthDate:'1995-02-23'});
    assert.ok(p.requests[0].options.signal.aborted);const b=p.api.submit(p.ctx.form);
    fails?p.requests[0].reject(new Error('old failure')):p.success(0,'A');await a;
    assert.equal(p.ctx.reading,null);assert.equal(p.ctx.loading,true);assert.equal(p.ctx.error,'');assert.equal(p.writes(),0);
    p.success(1,'B');await b;assert.equal(p.ctx.reading.result.id,'B');assert.equal(p.ctx.loading,false);assert.equal(p.writes(),1);
  }
});
test('identity invalidation and unmount cancellation suppress pending result and persistence',async()=>{
  for(const cancel of ['invalidateReading','cancelPending']){
    const p=mount();const run=p.api.submit(p.ctx.form);p.api[cancel]();p.success(0,'A');await run;
    assert.equal(p.ctx.reading,null);assert.equal(p.writes(),0);assert.equal(p.timers.size,0);
  }
});
test('failure keeps birth data, retry succeeds and duplicate submit stays locked',async()=>{
  const p=mount();const a=p.api.submit(p.ctx.form);await p.api.submit(p.ctx.form);assert.equal(p.requests.length,1);
  p.requests[0].reject(new Error('synthetic error'));await a;assert.equal(p.ctx.form.birthDate,'1990-01-01');assert.equal(p.ctx.loading,false);assert.equal(p.ctx.retryMode,'initial');
  const b=p.api.submit(p.ctx.form);p.success(1,'B');await b;assert.equal(p.ctx.reading.result.id,'B');
});

test('last choice submits its fresh value; clearing and loading do not submit',()=>{
  const p=mount();p.ctx.guidedQuestion=3;
  p.api.updateContext('familyResponsibility','HAS_CHILDREN');
  assert.equal(p.requests.length,1);
  assert.equal(JSON.parse(p.requests[0].options.body).familyResponsibility,'HAS_CHILDREN');
  p.api.updateContext('familyResponsibility','CARE_FOR_OTHER_FAMILY');
  assert.equal(p.requests.length,1);
  const q=mount();q.ctx.guidedQuestion=3;q.api.updateContext('familyResponsibility','');
  assert.equal(q.requests.length,0);assert.equal(q.ctx.guidedQuestion,3);
});
