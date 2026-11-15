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
const mainIds = ['beast_g_zhuque', 'beast_g_baihu', 'beast_g_xuanwu', 'beast_a28', 'beast_a27'];
const cards = [...mainIds.map((cardId, i) => ({ id: 'main:' + i, cardId, bonus: '0' })), { id: 'qinglong', cardId: 'beast_g_qinglong', bonus: '0' }, { id: 'adult', cardId: 'beast_a01', bonus: '0' }, { id: 'young', cardId: 'beast_y01', bonus: '0' }, { id: 'young2', cardId: 'beast_y01', bonus: '0' }];

(async () => {
  await memory.create(owner, { revision: '0', state: { cards, protectedIds: mainIds.map((_, i) => 'main:' + i) }, pendingBattle: null, receipts: [] });
  // 預覽：伺服端回 feedback，數字由伺服端算好；客戶端塞的 bonus／attack 欄位一律無效。
  const preview = await post({ type: 'PREVIEW', revision: '0', choices: [{ targetId: 'adult', materialId: 'young', bonus: '99999', addedBonus: '99999' }], addedBonus: '99999', attack: 9999 });
  assert.equal(preview.status, 200, preview.error); assert.equal(preview.feedback[0].addedBonus, '3'); assert.equal(preview.feedback[0].afterOrbAttack, '59');
  assert.equal(memory.writes, 0, 'preview never writes');
  // 即時預覽：選定目標一次回每張候選材料的加成與星級變化（只讀）。
  const live = await post({ type: 'PREVIEW_TARGET', revision: '0', targetId: 'adult' });
  assert.equal(live.status, 200, live.error); assert.deepEqual(live.options.map(o => o.materialId).sort(), ['young', 'young2']);
  assert.ok(live.options.every(o => o.feedback.addedBonus === '3' && o.feedback.addedPercent.label === '5' && o.feedback.starsBefore.stars === 0 && o.feedback.starsAfter.toNext === 30));
  const liveQ = await post({ type: 'PREVIEW_TARGET', revision: '0', targetId: 'qinglong' });
  assert.deepEqual(liveQ.options.map(o => o.materialId), ['adult'], 'only the strict next layer is offered');
  assert.equal((await post({ type: 'PREVIEW_TARGET', revision: '9', targetId: 'adult' })).ok, false);
  assert.equal(memory.writes, 0, 'live preview never writes');
  // 兩台裝置同時吃同一張材料：只能一成一敗，材料只少一張、加成只加一次。
  const [a, b] = await Promise.all([
    post({ type: 'FUSE', revision: '0', operationId: 'device-A', choices: [{ targetId: 'adult', materialId: 'young' }] }),
    post({ type: 'FUSE', revision: '0', operationId: 'device-B', choices: [{ targetId: 'adult', materialId: 'young' }] }),
  ]);
  const wins = [a, b].filter(r => r.ok), loses = [a, b].filter(r => !r.ok);
  assert.equal(wins.length, 1, JSON.stringify([a.error, b.error])); assert.equal(loses.length, 1);
  assert.match(loses[0].error, /卡庫已更新/);
  let saved = await memory.read(owner);
  assert.equal(saved.state.cards.filter(c => c.cardId === 'beast_y01').length, 1); assert.equal(saved.state.cards.find(c => c.id === 'adult').bonus, '3');
  assert.equal(saved.receipts.length, 1); assert.equal(saved.receipts[0].rule, 'v2'); assert.equal(memory.writes, 1);
  assert.equal(wins[0].feedback[0].materialName, '角木蛟・幼子'); assert.equal(wins[0].feedback[0].targetName, '角木蛟');
  // 同一 operationId 重送三次：回同一張收據，不重扣。
  const winner = wins[0] === a ? 'device-A' : 'device-B';
  const resend = await Promise.all([1, 2, 3].map(() => post({ type: 'FUSE', revision: '0', operationId: winner, choices: [{ targetId: 'adult', materialId: 'young' }] })));
  assert.ok(resend.every(r => r.ok && r.duplicate && JSON.stringify(r.receipt) === JSON.stringify(wins[0].receipt)));
  assert.equal(memory.writes, 1);
  // 同 operationId 換內容：拒絕。
  assert.equal((await post({ type: 'FUSE', revision: '0', operationId: winner, choices: [{ targetId: 'adult', materialId: 'young2' }] })).ok, false);
  // 不存在的材料：錯誤且不扣卡。
  const ghost = await post({ type: 'FUSE', revision: '1', operationId: 'ghost', choices: [{ targetId: 'adult', materialId: 'nope' }] });
  assert.equal(ghost.ok, false); assert.match(ghost.error, /未扣材料/); assert.equal(memory.writes, 1);
  // 越級（幼子直接餵四大神獸）：拒絕。
  assert.equal((await post({ type: 'FUSE', revision: '1', operationId: 'skip', choices: [{ targetId: 'qinglong', materialId: 'young2' }] })).ok, false);
  // 本體被四大神獸吃：傳承 floor(3 × 50%) = 1，加 56/10 = 5 → +6。
  const up = await post({ type: 'FUSE', revision: '1', operationId: 'up', choices: [{ targetId: 'qinglong', materialId: 'adult' }] });
  assert.equal(up.status, 200, up.error); assert.equal(up.feedback[0].addedBonus, '6'); assert.equal(up.feedback[0].inheritedBonus, '1');
  assert.equal(up.view.cards.find(c => c.id === 'qinglong').orbAttack, '80'); assert.equal(up.view.cards.find(c => c.id === 'qinglong').stars.fed, 1);
  // 戰鬥保留中：拒絕合體、不扣卡。
  saved = await memory.read(owner); saved.pendingBattle = 'orb:x'; memory.rows.set(owner, saved);
  const held = await post({ type: 'FUSE', revision: saved.revision, operationId: 'held', choices: [{ targetId: 'qinglong', materialId: 'young2' }] });
  assert.equal(held.ok, false); assert.match(held.error, /戰鬥尚未結算/);
  const heldPreview = await post({ type: 'PREVIEW', revision: saved.revision, choices: [{ targetId: 'qinglong', materialId: 'young2' }] });
  assert.equal(heldPreview.ok, false);
  // 別人的識別碼看不到這份卡庫。
  assert.equal((await post({ type: 'PREVIEW', revision: '0', choices: [] }, crypto.randomBytes(32).toString('hex'))).ok, false);
  // GET view 帶星級／上限欄位。
  const got = await (await api.GET(new Request('http://localhost:3150/api/beast-game/cultivation', { headers: { 'x-beast-wallet': key } }))).json();
  assert.equal(got.view.cards.find(c => c.id === 'qinglong').bonusCap, '37');
  console.log('PASS food chain concurrency via API route: two devices eating the same card → one success / one rejection; same-operation resend ×3 never deducts twice; changed resend rejected; missing material / skip-layer rejected without deducting; adult→guardian inheritance; held battle rejected; client-sent bonus/attack ignored. Storage = in-memory CAS double, not Supabase.');
})().catch(e => { console.error(e); process.exitCode = 1; });
