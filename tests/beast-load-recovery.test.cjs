// Exercise the real load function with isolated fetch and state setters.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('components/BeastTurnGame.tsx','utf8');
const start=source.indexOf('  async function load('), end=source.indexOf('\n  useEffect(',start);
assert.ok(start>=0&&end>start);
let error='', account=null, fetchResult, requests=[];
const sandbox={AbortSignal, ticketRef:{current:null}, setCards(){},setBattleView(){},setAccount(value){account=value;},setError(value){error=value;},async fetch(url,options){requests.push({url,options});if(fetchResult instanceof Error)throw fetchResult;return fetchResult;}};
vm.createContext(sandbox);
vm.runInContext(ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
(async()=>{
  fetchResult={ok:false,json:async()=>({ok:false,error:'Internal diagnostic /private/path'})};
  await sandbox.load();
  assert.equal(error,'戰況暫時無法讀取，請按「重新載入」再試。');
  assert.equal(account,null);
  fetchResult=new TypeError('Failed to fetch'); await sandbox.load();assert.doesNotMatch(error,/fetch|TypeError/);
  fetchResult={ok:true,json:async()=>{throw new SyntaxError('Unexpected token');}};await sandbox.load();assert.doesNotMatch(error,/SyntaxError|token/);
  const controller=new AbortController();controller.abort();error='preserve';await sandbox.load(controller.signal);assert.equal(error,'preserve');
  const saved={revision:7,match:{status:'FINISHED'}};
  fetchResult={ok:true,json:async()=>({ok:true,account:saved,cards:[],view:null,ticket:'synthetic'})};
  await sandbox.load();assert.equal(account,saved);assert.equal(error,'');
  assert.ok(requests.every(r=>r.url==='/api/beast-game/turns'&&!r.options.method&&!r.options.body),'Recovery only reads; never resubmits a battle or settlement');
  console.log('PASS real load recovery: sanitized errors, cancelled request ignored, saved battle restored by GET only');
})().catch(error=>{console.error(error);process.exitCode=1;});
