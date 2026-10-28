const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('app/bazi/page.tsx','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const profile = { name:'測試甲', birthDate:'1990-01-01', gender:'male', timeUnknown:true, birthHourBranch:'unknown' };
function mount() {
  let cursor=0, dirty=true, tree, writes=0;
  const hooks=[], queue=[], jobs=[], listeners=new Map();
  const jsx=(type,props)=>({type,props:props||{}});
  const react={
    useState(initial) { const i=cursor++; if(!hooks[i]) hooks[i]={value:initial}; return [hooks[i].value,next=>{const value=typeof next==='function'?next(hooks[i].value):next; if(!Object.is(value,hooks[i].value)){hooks[i].value=value;dirty=true;}}]; },
    useRef(initial) { const i=cursor++;return hooks[i]??={current:initial}; },
    useCallback(fn,deps) { const i=cursor++,old=hooks[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j])))hooks[i]={deps,fn};return hooks[i].fn; },
    useEffect(fn,deps) { const i=cursor++,old=hooks[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j]))){hooks[i]={deps,cleanup:old?.cleanup};queue.push(()=>{hooks[i].cleanup?.();hooks[i].cleanup=fn();});} },
  };
  const module={exports:{}};
  vm.runInNewContext(source,{module,exports:module.exports,console,crypto:{randomUUID:()=> 'synthetic-session'},
    window:{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),localStorage:{getItem:()=>null,setItem(){}},sessionStorage:{getItem:()=>null,setItem(){}}},
    document:{querySelector:()=>null},
    require(id){
      if(id==='react')return react;
      if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
      if(id==='@/components/UnifiedBirthForm')return {UnifiedBirthForm:'BirthForm',HOUR_BRANCH_PENDING:'pending'};
      if(id==='@/components/bazi/customer/BaziCustomerShell')return {BaziCustomerShell:'Result'};
      if(id==='@/components/bazi/customer/BaziCalculationProgress')return {BaziCalculationCeremony:'Ceremony',BaziGateFailed:'GateFailed',runBaziFinalGate:()=>({passed:true,issues:[]}),toBaziProgressView:()=>({})};
      if(id==='@/lib/identity-split-client')return {getAnalysisIdentityTarget:()=> 'guest',getIdentityRequiredMessage:()=> '選擇對象',IDENTITY_TARGET_UPDATED_EVENT:'identity'};
      if(id==='@/lib/analysis-job-client')return {runAnalysisJobClient:options=>new Promise((resolve,reject)=>jobs.push({options,resolve,reject}))};
      if(id==='@/lib/growth-center-client')return {markGrowthModuleCompleted:()=>writes++};
      if(id==='@/lib/daily-analysis-limit')return {readDailyAnalysis:()=>null,clearDailyAnalysis(){},saveDailyAnalysis(){writes++;return null;},getDailyAnalysisButtonLabel:()=> '立即開始'};
      return ()=>null;
    },
  });
  function render(){for(let n=0;n<20;n++){dirty=false;cursor=0;tree=module.exports.default();while(queue.length)queue.shift()();if(!dirty)return tree;}throw new Error('Unsettled render');}
  function find(node,p){if(!node||typeof node!=='object')return;if(Array.isArray(node)){for(const x of node){const found=find(x,p);if(found)return found;}return;}if(p(node))return node;return find(node.props?.children,p);}
  const form=()=>find(render(),n=>n.type==='BirthForm');
  return {jobs,
    edit(next){form().props.onChange(next);render();},
    submit(){form().props.onSubmit();render();},
    open(){find(render(),n=>n.type==='Ceremony')?.props.onOpenResult();render();},
    result(){return find(render(),n=>n.type==='Result')?.props.result;},
    busy(){return form().props.isSubmitting;},
    input(){return form().props.value;},
    identity(){listeners.get('identity')?.();render();},
    unmount(){hooks.forEach(h=>h?.cleanup?.());},
    writes:()=>writes,
    text(){return JSON.stringify(render());},
  };
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('editing an existing chart clears it, while no-op input retains it',async()=>{
  const p=mount();p.edit(profile);p.submit();p.jobs[0].resolve({fixture:'A'});await tick();p.open();assert.equal(p.result().fixture,'A');
  p.edit({...profile});assert.equal(p.result().fixture,'A');
  p.edit({...profile,name:'測試乙'});assert.equal(p.result(),undefined);
});
test('late job progress/success/error/finally cannot affect new customer',async()=>{
  for(const error of [false,true]){
    const p=mount();p.edit(profile);p.submit();p.edit({...profile,birthDate:'1995-02-23'});p.submit();assert.equal(p.jobs.length,2);
    p.jobs[0].options.onJob({message:'OLD JOB PROGRESS'});error?p.jobs[0].reject(new Error('OLD ERROR')):p.jobs[0].resolve({fixture:'A'});await tick();
    assert.ok(p.busy());assert.equal(p.writes(),0);assert.doesNotMatch(p.text(),/OLD JOB|OLD ERROR/);
    p.jobs[1].resolve({fixture:'B'});await tick();p.open();assert.equal(p.result().fixture,'B');assert.equal(p.busy(),false);
  }
});
test('identity change and unmount prevent pending output and persistence',async()=>{
  for(const action of ['identity','unmount']){const p=mount();p.edit(profile);p.submit();p[action]();p.jobs[0].resolve({fixture:'A'});await tick();assert.equal(p.writes(),0);}
});
test('failed job keeps form and allows retry',async()=>{
  const p=mount();p.edit(profile);p.submit();p.jobs[0].reject(new Error('synthetic failure'));await tick();assert.equal(p.input().birthDate,profile.birthDate);assert.equal(p.busy(),false);
  p.submit();assert.equal(p.jobs.length,2);p.jobs[1].resolve({fixture:'B'});await tick();p.open();assert.equal(p.result().fixture,'B');
});
