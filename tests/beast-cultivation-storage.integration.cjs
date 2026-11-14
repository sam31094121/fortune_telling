// Explicit opt-in integration test. Uses a random isolated owner and deletes only that owner.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), ts = require('typescript');
require('./helpers/server-only-runtime.cjs');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
require('@next/env').loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');
const { SupabaseCultivationRepository } = require('../lib/beast-game/cultivation-repository.ts');
const { transactCultivation } = require('../lib/beast-game/cultivation-transaction.ts');
const api = require('../app/api/beast-game/cultivation/route.ts');

(async () => {
  if (process.env.BEAST_CULTIVATION_STORAGE_TEST !== '1') throw new Error('Set BEAST_CULTIVATION_STORAGE_TEST=1 to run isolated database verification.');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const capability = crypto.randomBytes(32).toString('hex');
  const owner = crypto.createHash('sha256').update(capability).digest('hex');
  const mainIds = ['beast_g_qinglong', 'beast_g_baihu', 'beast_g_zhuque', 'beast_g_xuanwu', 'beast_a28'];
  const initial = { revision: '0', state: { cards: [...mainIds.map((cardId, i) => ({ id: 'main:' + i, cardId, bonus: '0' })), { id: 'adult', cardId: 'beast_a01', bonus: '0' }, { id: 'young', cardId: 'beast_y01', bonus: '0' }], protectedIds: mainIds.map((_, i) => 'main:' + i) }, pendingBattle: null, receipts: [] };
  const repository = new SupabaseCultivationRepository(client);
  let created = false;
  try {
    await repository.create(owner, initial); created = true;
    const readRequest = new Request('http://localhost:8888/api/beast-game/cultivation', { headers: { 'x-beast-wallet': capability } });
    const readResponse = await api.GET(readRequest);
    assert.equal(readResponse.status, 200);
    const view = (await readResponse.json()).view;
    assert.equal(view.cards.length, 7); assert.equal(view.protectedIds.length, 5);
    assert.equal(typeof view.cards[0].orbAttack, 'string'); assert.equal(typeof view.cards[0].battleAttack, 'string');
    const foreign = await api.POST(new Request('http://localhost:8888/api/beast-game/cultivation', { method: 'POST', headers: { 'x-beast-wallet': capability, origin: 'https://foreign.invalid' }, body: '{}' }));
    assert.equal(foreign.status, 400);
    const previewResponse = await api.POST(new Request('http://localhost:8888/api/beast-game/cultivation', { method: 'POST', headers: { 'x-beast-wallet': capability }, body: JSON.stringify({ type: 'PREVIEW', revision: '0', choices: [{ targetId: 'adult', materialId: 'young' }] }) }));
    assert.equal(previewResponse.status, 200); assert.equal((await repository.read(owner)).revision, '0', 'preview does not consume');
    const command = { type: 'FUSE', choices: [{ targetId: 'adult', materialId: 'young' }] };
    const replies = await Promise.all([transactCultivation(repository, owner, 'repeat', '0', command), transactCultivation(new SupabaseCultivationRepository(client), owner, 'repeat', '0', command)]);
    assert.deepEqual(replies[0].receipt, replies[1].receipt);
    assert.equal(replies.filter(r => r.duplicate).length, 1);
    let saved = await repository.read(owner);
    assert.equal(saved.revision, '1'); assert.equal(saved.state.cards.length, 6); assert.equal(saved.receipts.length, 1);
    assert(saved.state.cards.find(c => c.id === 'adult').bonus !== '0');
    const race = await Promise.allSettled([
      transactCultivation(repository, owner, 'second-stage', '1', { type: 'FUSE', choices: [{ targetId: 'main:0', materialId: 'adult' }] }),
      transactCultivation(new SupabaseCultivationRepository(client), owner, 'protect-adult', '1', { type: 'MAIN_TEAM', ids: ['adult', 'main:0', 'main:1', 'main:2', 'main:3'] }),
    ]);
    assert.equal(race.filter(r => r.status === 'fulfilled').length, 1);
    saved = await repository.read(owner); assert.equal(saved.revision, '2'); assert.equal(saved.state.protectedIds.length, 5); assert(saved.state.cards.length >= 5);
    const replay = await transactCultivation(repository, owner, 'repeat', '0', command);
    assert.deepEqual(replay.receipt, replies[0].receipt); assert.equal(replay.snapshot.revision, '2');
    await assert.rejects(transactCultivation(repository, owner, 'stale', '0', command));
    assert.equal((await repository.read(owner)).revision, '2');
    console.log('PASS real Supabase isolated account: durable cards+growth+receipt commit; concurrent same-op dedupe; fuse/protection race; stale revision rejection; old receipt replay. No customer inventory used.');
  } finally {
    if (created) {
      const removed = await client.from('beast_cultivation_accounts').delete().eq('owner_hash', owner).select('owner_hash');
      assert.ifError(removed.error); assert.equal(removed.data.length, 1);
      console.log('PASS isolated integration account removed');
    }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
