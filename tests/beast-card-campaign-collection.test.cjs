const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const KEY = 'tdh_beast_collection_v1';
const MODULES = 'tdh_growth_completed_modules_v1';
const a = 'beast_a01', y = 'beast_y01', b = 'beast_a02';

function harness(data = new Map()) {
  const events = new EventTarget();
  const cache = new Map();
  let locked = false, fail = () => false, fetcher = async()=>{throw Error('No test server')};
  const localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem(key, value) { if (fail(key, value)) throw new Error('QuotaExceeded'); data.set(key, value); },
    removeItem: (key) => data.delete(key),
  };
  const navigator = { locks: { async request(_name, options, fn) {
    assert.equal(options.ifAvailable, true);
    if (locked) return fn(null);
    locked = true;
    try { return await fn({}); } finally { locked = false; }
  } } };
  function load(rel) {
    let file = path.resolve(root, rel);
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!path.extname(file)) {
      const resolved = [file + '.ts', file + '.tsx', path.join(file, 'index.ts'), path.join(file, 'index.tsx')].find(candidate => fs.existsSync(candidate));
      if (!resolved) throw new Error('Unresolved test module: ' + file);
      file = resolved;
    }
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const customRequire = (id) => {
      if (id.endsWith('.css')) return new Proxy({}, { get: (_, prop) => prop });
      if (id === 'next/link') return ({ children, ...props }) => require('react').createElement('a', props, children);
      return id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
    };
    vm.runInNewContext(source, { module: mod, exports: mod.exports, require: customRequire, fetch:(...args)=>fetcher(...args), window: { localStorage, dispatchEvent: events.dispatchEvent.bind(events), addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) }, navigator, crypto: require('node:crypto').webcrypto, AbortSignal, Event, console, setTimeout, clearTimeout }, { filename: file });
    return mod.exports;
  }
  return { data, load, serve:fn=>{fetcher=fn}, failWrites: (predicate) => { fail = predicate; }, navigator };
}


(async()=>{
 const entries=['beast_a01','beast_y01','beast_y02','beast_y03','beast_y04','beast_y05'].map((cardId,i)=>({id:'copy:'+i,cardId,at:'2026-11-03',source:'GROWTH'}));
 const original={cards:entries,history:[],granted:entries.map(c=>c.cardId),receipts:{}};
 const h=harness(new Map([[KEY,JSON.stringify(original)]])),store=h.load('lib/beast-collection.ts'),core=h.load('lib/beast-game/card-campaign.ts');
 const initial={v:1,kind:'card-campaign',id:'test',seed:1,wins:0,pending:null,enhancements:[]};let requests=0;const states=new Map();
 h.serve(async(url,options)=>{requests++;const b=JSON.parse(options.body),c=states.get(b.campaignToken)||initial;let reply;
  if(b.type==='PROGRESS')reply={campaignToken:b.campaignToken||'progress:0',campaign:core.cardCampaignStage(c.wins)};
  else if(b.preview)reply={preview:core.cardCampaignEnhancementPreview(c,b.target,b.material),campaign:core.cardCampaignStage(c.wins)};
  else{const out=core.enhanceCardCampaign(c,b.operationId,b.target,b.material),token='signed:'+requests;states.set(token,out.campaign);reply={receipt:out.receipt,campaignToken:token,campaign:core.cardCampaignStage(c.wins)}}
  return {ok:true,json:async()=>({ok:true,...reply})};
 });
 const preview=await store.previewOwnedCardEnhancement('copy:0','copy:1');assert(preview.allowed);assert(preview.preview.beforeAttack>0);
 h.failWrites(key=>key===KEY);
 const failed=await store.enhanceOwnedCard('op:1','copy:0','copy:1');assert.equal(failed.saved,false);assert.equal(failed.receipt,undefined);assert.equal(h.data.get(KEY),JSON.stringify(original));
 h.failWrites(()=>false);
 const success=await store.enhanceOwnedCard('op:1','copy:0','copy:1');assert.equal(success.saved,true);assert.equal(success.collection.cards.length,5);assert(!success.collection.cards.some(c=>c.id==='copy:1'));
 const calls=requests,token=success.collection.cardCampaign.token,again=await store.enhanceOwnedCard('op:1','copy:0','copy:1');assert.equal(again.saved,true);assert.equal(requests,calls);assert.equal(JSON.stringify(again.display),JSON.stringify(success.receipt.display));
 const changed=await store.enhanceOwnedCard('op:1','copy:0','copy:2');assert.equal(changed.saved,false);
 const low=await store.enhanceOwnedCard('op:2','copy:0','copy:2');assert.equal(low.saved,false);assert.equal(requests,calls,'retain five distinct playable cards before request');
 assert.equal(store.readCollection().cardCampaign.token,token,'migration retains signed token and receipts');
 const pending={...success.collection,pending:{id:'match',cardId:'beast_a01',entryId:'copy:0',at:'now'}};h.data.set(KEY,JSON.stringify(pending));
 assert.equal((await store.previewOwnedCardEnhancement('copy:0','copy:2')).allowed,false);assert.equal((await store.enhanceOwnedCard('op:3','copy:0','copy:2')).saved,false);assert.equal(requests,calls);
 h.data.set(KEY,JSON.stringify(success.collection));let played=false;
 await assert.rejects(store.runOwnedStakesDuel(['copy:0'],async()=>{played=true;return {ok:false}},'stale'),/更新/);assert.equal(played,false);assert(!store.readCollection().pending);
 // Failed settlement keeps both award and progress pending, then journal retry commits once.
 let matchId,outcome;
 const playedResult=await store.runOwnedStakesDuel(['copy:0'],async selected=>{
  matchId=store.readCollection().pending.id;
  store.saveLiveBattle({matchId,token:'battle:start',startedAt:Date.now(),stakeCardId:'beast_a01',table:{},campaignToken:'pending:token',campaignWins:0});
  outcome={...h.load('lib/beast-game/stake.ts').resolveStake({playerStake:'beast_a01',opponentStake:'beast_a02',winner:'PLAYER'}),selectedEntries:selected};
  h.failWrites(key=>key===KEY);return {ok:true,stake:outcome,campaignToken:'finished:token',campaign:{wins:1}};
 },token);
 assert.equal(playedResult.settlement.saved,false);assert.equal(store.readCollection().cardCampaign.wins,0);assert(store.readCollection().pending);
 h.failWrites(()=>false);
 const retried=await store.retryStakeSettlement(matchId,outcome);assert.equal(retried.saved,true);
 const settled=store.readCollection();assert.equal(settled.cardCampaign.wins,1);assert.equal(settled.cardCampaign.token,'finished:token');assert(!settled.cardCampaign.pendingToken);assert(!settled.pending);
 const count=settled.cards.length;assert.equal((await store.retryStakeSettlement(matchId,outcome)).saved,true);assert.equal(store.readCollection().cards.length,count);assert.equal(store.readCollection().cardCampaign.wins,1);
 // Missing progress metadata cannot settle a pending campaign.
 h.data.set(KEY,JSON.stringify({...success.collection,pending:{id:'missing',entryId:'copy:0',cardId:'beast_a01',entries:[{id:'copy:0',cardId:'beast_a01'}],at:'now'},cardCampaign:{...success.collection.cardCampaign,pendingToken:'pending:missing'}}));
 assert.equal((await store.retryStakeSettlement('missing',outcome)).saved,false);assert(store.readCollection().pending);
 assert.equal((await store.retryStakeSettlement('missing',outcome,{campaignToken:'rescue:token',wins:1})).saved,true);assert.equal(store.readCollection().cardCampaign.token,'rescue:token');
 // Failure to store the live signed session restores the pre-battle campaign token.
 h.data.set(KEY,JSON.stringify(success.collection));h.failWrites(key=>key==='tdh_beast_field_live_v1');
 await assert.rejects(store.runOwnedStakesDuel(['copy:0'],async()=>{
  const id=store.readCollection().pending.id;
  store.saveLiveBattle({matchId:id,token:'battle',startedAt:Date.now(),stakeCardId:'beast_a01',table:{},campaignToken:'pending:failed',campaignWins:0});
  throw Error('unreachable');
 },token));
 assert.equal(store.readCollection().cardCampaign.token,token);assert(!store.readCollection().pending);assert(!store.readCollection().cardCampaign.pendingToken);
 h.failWrites(()=>false);
 h.data.set('tdh_beast_field_live_v1',JSON.stringify({v:1,matchId:'live',token:'old',campaignToken:'pending:live',savedAt:Date.now(),startedAt:Date.now(),table:{}}));
 h.failWrites(key=>key==='tdh_beast_field_live_v1');assert.throws(()=>store.updateLiveBattleToken('live','new',true),/尚未保存/);assert.equal(JSON.parse(h.data.get('tdh_beast_field_live_v1')).token,'old');h.failWrites(()=>false);
 // A lost strengthened copy never transfers its receipt to another copy of the same card.
 const replacement={...success.collection,cards:[...success.collection.cards.filter(c=>c.id!=='copy:0'),{...entries[0],id:'new-copy'}]};
 h.data.set(KEY,JSON.stringify(replacement));assert.equal(store.readCollection().cardCampaign.fusionReceipts[0].targetEntryId,'copy:0');
 assert(store.cardFusionChoices(store.readCollection()).targets.some(c=>c.id==='new-copy'));
 h.data.set(KEY,JSON.stringify(original));h.serve(async(url,options)=>{assert(options.signal instanceof AbortSignal);throw {name:'TimeoutError'};});
 const timeout=await store.enhanceOwnedCard('timeout','copy:0','copy:1');assert.equal(timeout.saved,false);assert.match(timeout.error,/逾時/);assert.equal(h.data.get(KEY),JSON.stringify(original));
 h.navigator.locks=undefined;const unsafe=await store.enhanceOwnedCard('nolock','copy:0','copy:1');assert.equal(unsafe.saved,false);assert.match(unsafe.error,/不支援/);
 console.log('PASS collection fusion: server display, failed-write rollback, same-op dedupe, pending lock, five-card retention, stale DEAL guard, migration and copy-bound receipt');
})().catch(e=>{console.error(e);process.exitCode=1});
