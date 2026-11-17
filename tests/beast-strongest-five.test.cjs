// Formula/transaction fixtures keep five higher-bonus guards so consumable trained cards are outside the protected top five.
// 食物鏈：經由真正的 /api/beast-game/cultivation 路由（伺服端權威）＋記憶體 CAS 儲存替身驗證併發與防竄改。
// 這不是正式 Supabase 測試：本機沒有金鑰，儲存層換成與 SupabaseCultivationRepository 同介面的記憶體版（條件式比對版本號）。
const assert = require('node:assert/strict');
require('./helpers/server-only-runtime.cjs');
const path = require('node:path'), fs = require('node:fs'), ts = require('typescript'), crypto = require('node:crypto');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
delete process.env.BEAST_FOOD_CHAIN_RULE;
const repoModule = require('../lib/beast-game/cultivation-repository.ts');
const { validateCultivationState } = require('../lib/beast-game/cultivation.ts');

class MemoryRepository {
  constructor() { this.rows = new Map(); this.writes = 0; }
  async read(owner) { await new Promise(r => setImmediate(r)); const row = this.rows.get(owner); if (!row) throw new Error('共同卡庫暫時無法讀取，未扣材料。'); return structuredClone(row); }
  async create(owner, initial) { if (!this.rows.has(owner)) this.rows.set(owner, structuredClone(initial)); return this.read(owner); }
  async compareAndSwap(owner, revision, next) {
    await new Promise(r => setImmediate(r));
    validateCultivationState(next.state);
    if (next.revision !== (BigInt(revision) + 1n).toString()) throw new Error('卡庫版本無效。');
    if (this.rows.get(owner)?.revision !== revision) return false;
    this.rows.set(owner, structuredClone(next)); this.writes++; return true;
  }
}
const memory = new MemoryRepository();
repoModule.cultivationRepository = () => memory;
const api = require('../app/api/beast-game/cultivation/route.ts');

const key = crypto.randomBytes(32).toString('hex'), owner = crypto.createHash('sha256').update(key).digest('hex');
const post = async (body, k = key) => { const res = await api.POST(new Request('http://localhost:3150/api/beast-game/cultivation', { method: 'POST', headers: { 'x-beast-wallet': k, 'content-type': 'application/json' }, body: JSON.stringify(body) })); return { status: res.status, ...(await res.json()) }; };

const C=require('../lib/beast-game/cultivation.ts'),T=require('../lib/beast-game/cultivation-transaction.ts'),V=require('../lib/beast-game/cultivation-view.ts');
const mainTypes=['beast_g_qinglong','beast_g_baihu','beast_g_zhuque','beast_g_xuanwu','beast_a01'];
const main=mainTypes.map((cardId,i)=>({id:'main:'+i,cardId,bonus:'0'}));
const snap=(extra=[])=>({revision:'0',state:{cards:[...structuredClone(main),...extra],protectedIds:main.map(c=>c.id)},receipts:[],pendingBattle:null});
const copy=(id,cardId,bonus='0')=>({id,cardId,bonus});
(async()=>{
  const original=snap([copy('strong','beast_a01','20'),copy('young','beast_y02')]);
  const before=JSON.stringify(original);const policy=C.cultivationProtection(original.state);
  assert(policy.strongestIds.includes('strong'));assert(!policy.strongestIds.includes('main:4'));
  assert(policy.protectedIds.includes('main:4'),'old manual protection survives');
  assert.equal(new Set(policy.strongestIds.map(id=>original.state.cards.find(c=>c.id===id).cardId)).size,5);
  for(const cards of [original.state.cards,[...original.state.cards].reverse()])assert.deepEqual(C.cultivationProtection({...original.state,cards}).strongestIds,policy.strongestIds,'order-independent ties');
  const ties=snap([copy('aaa','beast_a01')]);assert(C.cultivationProtection(ties.state).strongestIds.includes('main:4'),'manual lock wins equal bonus');
  const noLocks={cards:[copy('z','beast_a01'),copy('a','beast_a01'),copy('c','beast_a02')],protectedIds:[]};
  assert.deepEqual(C.cultivationProtection(noLocks).strongestIds,['a','c']);
  assert.deepEqual(C.cultivationProtection({cards:[],protectedIds:[]}).strongestIds,[]);
  for(let n=1;n<5;n++)assert.equal(C.cultivationProtection({cards:main.slice(0,n),protectedIds:[]}).strongestIds.length,n);
  const huge=snap([copy('huge','beast_a01','9'.repeat(400)),copy('almost','beast_a01','8'.repeat(400))]);assert.equal(C.cultivationProtection(huge.state).strongestIds[0],'huge');
  assert.throws(()=>T.fuseSnapshot(original,[{targetId:'main:0',materialId:'strong'}]),/培養/);assert.equal(JSON.stringify(original),before);
  const view=V.cultivationView(original);const shown=view.cards.find(c=>c.id==='strong');assert(shown.protected&&shown.strongestProtected&&!shown.manuallyProtected);assert.equal(BigInt(shown.orbAttack)-BigInt(require('../lib/beast-game/registry.ts').getCard(shown.cardId).stats.attack),20n);assert.equal(BigInt(shown.battleAttack)-V.battleBaseAttack(shown.cardId),20n);
  assert.deepEqual(view.strongestProtectedIds,policy.strongestIds);assert(view.protectionReason.includes('心血'));
  memory.rows.set(owner,structuredClone(original));
  const denied=await post({type:'FUSE',revision:'0',operationId:'deny',protectionRule:'manual-five-v1',choices:[{targetId:'main:0',materialId:'strong'}]});assert.equal(denied.ok,false);assert.equal(memory.writes,0,'client cannot choose old protection policy');
  const options=await post({type:'PREVIEW_TARGET',revision:'0',targetId:'main:0'});assert(!options.options.some(x=>x.materialId==='strong'),'both UI variants only get legal candidates');
  const moving=snap([copy('rising','beast_a01'),copy('food','beast_y01'),copy('food2','beast_y01')]);memory.rows.set(owner,structuredClone(moving));
  // One transaction must not grow a card into the top five then consume it later in the batch.
  const batch=await post({type:'FUSE',revision:'0',operationId:'batch',choices:[{targetId:'rising',materialId:'food'},{targetId:'main:0',materialId:'rising'}]});assert.equal(batch.ok,false);assert.deepEqual(await memory.read(owner),moving);
  const commands={type:'FUSE',revision:'0',operationId:'grow',choices:[{targetId:'rising',materialId:'food'}]};
  const [a,b]=await Promise.all([post(commands),post(commands)]);assert(a.ok&&b.ok);assert.equal(memory.writes,1);assert.equal([a,b].filter(x=>x.duplicate).length,1);
  const saved=await memory.read(owner);assert(a.view.strongestProtectedIds.includes('rising'));assert(a.view.cards.find(c=>c.id==='main:4').protected);assert.equal(a.receipt.protectionRule,'strongest-five-v1');
  const blockAfter=await post({type:'FUSE',revision:saved.revision,operationId:'eat-rising',choices:[{targetId:'main:0',materialId:'rising'}]});assert.equal(blockAfter.ok,false);assert.deepEqual(await memory.read(owner),saved);
  assert((await post(commands)).duplicate);assert.deepEqual(await memory.read(owner),saved);
  // Concurrent grow/consume at the same revision: one CAS winner; stale writers cannot bypass the new list.
  memory.rows.set(owner,structuredClone(moving));const oldWrites=memory.writes;
  const race=await Promise.all([post({...commands,operationId:'grow-race'}),post({type:'FUSE',revision:'0',operationId:'eat-race',choices:[{targetId:'main:0',materialId:'rising'}]})]);assert.equal(race.filter(x=>x.ok).length,1);assert.equal(memory.writes,oldWrites+1);
  // Old receipts remain auditable under their historical protection; new requests cannot use that path.
  const legacy={operationId:'old',command:JSON.stringify({type:'FUSE',choices:[{targetId:'main:0',materialId:'strong'}]}),revision:'1',changes:[],rule:'v2'};
  assert.equal(T.replayCultivationReceipt(original,legacy).changes.length,1);
  assert.throws(()=>T.replayCultivationReceipt(original,{...legacy,protectionRule:'strongest-five-v1'}),/培養/);
  console.log('PASS strongest-five: exact bonus ranking, distinct kinds, deterministic ties, 0-4 kinds, 400 digits, manual locks preserved, both attack views, API protection, batch promotion rollback, concurrent CAS, same-operation replay, versioned historical audit. Synthetic memory only.');
})().catch(e=>{console.error(e);process.exitCode=1});
