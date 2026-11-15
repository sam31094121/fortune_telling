const assert = require('node:assert/strict');
require('./helpers/server-only-runtime.cjs');
const path = require('node:path');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const C = require('../lib/beast-game/cultivation.ts');
const T = require('../lib/beast-game/cultivation-transaction.ts');
const R = require('../lib/beast-game/registry.ts');
const G = require('../lib/beast-guardians.ts');
const M = require('../lib/beast-game/cultivation-migration.ts');
const O = require('../lib/beast-game/match3/hard-campaign.ts');
const copy = (id, cardId, bonus = '0') => ({ id, cardId, bonus });
const main = ['beast_g_qinglong', 'beast_g_baihu', 'beast_g_zhuque', 'beast_g_xuanwu', 'beast_a28'].map((id, i) => copy('main:' + i, id));
const state = () => ({ cards: [...main, copy('adult', 'beast_a01'), copy('young', 'beast_y01'), copy('young2', 'beast_y01')], protectedIds: main.map(c => c.id) });
const snapshot = () => ({ revision: '0', state: state(), pendingBattle: null, receipts: [] });
class Repo {
  constructor() { this.value = snapshot(); this.writes = 0; }
  async read() { return structuredClone(this.value); }
  async compareAndSwap(owner, revision, value) { if (this.value.revision !== revision) return false; this.value = structuredClone(value); this.writes++; return true; }
}
(async () => {
  const cards = R.playableCards(); let allowed = 0;
  const old = { cards: main.slice(0, 4).map(c => ({ id: c.id, cardId: c.cardId, source: 'DUEL_WIN', at: '2026-11-14' })), history: [] };
  let orb = O.chooseCampaignHero(O.newCampaign(), 'beast_g_qinglong');
  orb.teamIds = ['beast_g_qinglong', 'beast_y01', 'beast_y02', 'beast_y03', 'beast_y04'];
  const noReward = M.prepareCultivationMigration(old, JSON.stringify(orb));
  assert.equal(noReward.state.cards.length, 4, 'free hero and 28 young do not fill the five-owned-copy floor');
  assert.deepEqual(noReward.state.protectedIds, [], 'never auto-select main team');
  assert.throws(() => C.replaceCultivationMainTeam(noReward.state, noReward.state.cards.map(c => c.id)));
  const withReward = O.campaignWin(orb, 'real-win', 0).profile;
  const migrated = M.prepareCultivationMigration(old, JSON.stringify(withReward));
  assert.equal(migrated.state.cards.length, 5); assert.equal(migrated.summary.orbRewardCopies, 1);
  assert.deepEqual(migrated, M.prepareCultivationMigration(old, JSON.stringify(withReward)), 'migration IDs are repeatable, never freshly mint copies');
  assert.equal(M.prepareCultivationMigration(old, null).state.cards.length, 4);
  assert.throws(() => M.prepareCultivationMigration({ ...old, pending: { id: 'active' } }, null));
  for (const material of cards) for (const target of cards) {
    const expected = material.form === 'YOUNG' && target.form === 'ADULT' && material.mansionId === target.mansionId || material.form === 'ADULT' && target.id === G.guardianOf(material.id).cardId;
    assert.equal(C.cultivationTarget(material.id) === target.id, expected);
    if (expected) allowed++;
  }
  assert.equal(allowed, 56);
  const original = state(), before = JSON.stringify(original);
  const both = C.fuseCultivation(original, [{ targetId: 'adult', materialId: 'young' }, { targetId: 'main:0', materialId: 'adult' }]);
  assert.equal(both.state.cards.length, 6); assert.equal(JSON.stringify(original), before);
  assert.equal(both.changes[1].addedBonus, String(Math.max(1, Math.floor(R.getCard('beast_a01').stats.attack / 10))), 'trained material retains original gain formula');
  assert.throws(() => C.fuseCultivation(original, [{ targetId: 'main:0', materialId: 'young' }]));
  assert.throws(() => C.fuseCultivation(original, [{ targetId: 'main:0', materialId: 'main:4' }]));
  assert.throws(() => C.fuseCultivation(original, [{ targetId: 'main:1', materialId: 'adult' }]));
  assert.throws(() => C.fuseCultivation(original, [{ targetId: 'adult', materialId: 'young' }, { targetId: 'adult', materialId: 'young' }]));
  assert.equal(JSON.stringify(original), before, 'failed batch changes nothing');
  const five = { cards: main, protectedIds: main.map(c => c.id) };
  assert.throws(() => C.fuseCultivation(five, [{ targetId: 'main:0', materialId: 'main:4' }]));
  assert.throws(() => C.replaceCultivationMainTeam({ cards: main.slice(0, 4), protectedIds: [] }, main.map(c => c.id)));
  assert.throws(() => C.replaceCultivationMainTeam(original, ['adult', 'young', 'young2', 'main:0', 'main:1']), /不同/);
  assert.throws(() => C.replaceCultivationMainTeam({ ...original, cards: [...original.cards, copy('fake', 'invalid')] }, main.map(c => c.id)));
  const huge = state(); huge.cards.find(c => c.id === 'adult').bonus = '9'.repeat(400);
  const increased = C.fuseCultivation(huge, [{ targetId: 'adult', materialId: 'young' }]);
  assert.equal(BigInt(increased.changes[0].afterBonus) - BigInt(increased.changes[0].beforeBonus), BigInt(increased.changes[0].addedBonus));
  assert.throws(() => C.exactBonus('Infinity')); assert.throws(() => C.exactBonus('1e100')); assert.throws(() => C.exactBonus('-1'));
  const continued = state();
  const batch = Array.from({ length: 2100 }, (_, i) => ({ targetId: 'adult', materialId: 'batch:' + i }));
  continued.cards.push(...batch.map(c => copy(c.materialId, 'beast_y01')));
  const grown = C.fuseCultivation(continued, batch);
  assert.equal(grown.changes.length, 2100, 'no 100-card requirement or 2048-operation gameplay cap');
  assert.equal(grown.changes.at(-1).afterBonus, String(2100 * Math.max(1, Math.floor(R.getCard('beast_y01').stats.attack / 10))));
  const repo = new Repo(), command = { type: 'FUSE', choices: [{ targetId: 'adult', materialId: 'young' }] };
  const twins = await Promise.all([T.transactCultivation(repo, 'test', 'same', '0', command), T.transactCultivation(repo, 'test', 'same', '0', command)]);
  assert.equal(repo.writes, 1); assert.equal(twins.filter(r => r.duplicate).length, 1);
  assert.deepEqual(twins[0].receipt, twins[1].receipt);
  await assert.rejects(T.transactCultivation(repo, 'test', 'same', '0', { type: 'FUSE', choices: [{ targetId: 'adult', materialId: 'young2' }] }));
  const race = new Repo();
  const results = await Promise.allSettled([T.transactCultivation(race, 'test', 'fuse', '0', command), T.transactCultivation(race, 'test', 'protect', '0', { type: 'MAIN_TEAM', ids: ['young', 'main:0', 'main:1', 'main:2', 'main:3'] })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(race.writes, 1);
  const two = new Repo();
  const competing = await Promise.allSettled([T.transactCultivation(two, 'test', 'one', '0', command), T.transactCultivation(two, 'test', 'two', '0', { type: 'FUSE', choices: [{ targetId: 'adult', materialId: 'young2' }] })]);
  assert.equal(competing.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(two.value.state.cards.length, 7, 'one current revision can consume only one material');
  assert.equal(two.value.state.protectedIds.length, 5);
  const pending = new Repo(); pending.value.pendingBattle = 'battle';
  await assert.rejects(T.transactCultivation(pending, 'test', 'pending', '0', command)); assert.equal(pending.writes, 0);
  const failed = new Repo(); failed.compareAndSwap = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(T.transactCultivation(failed, 'test', 'failed', '0', command)); assert.deepEqual(failed.value, snapshot());
  console.log('PASS shared cultivation: 3600 pair checks / 56 valid pairs; two-stage batch; five locked distinct playable copies; atomic team replacement; exact 400-digit growth; batch rollback; same-operation replay; concurrent protection; failed-save rollback. Repository is an isolated CAS test double, not a production database test.');
})().catch(e => { console.error(e); process.exitCode = 1; });
