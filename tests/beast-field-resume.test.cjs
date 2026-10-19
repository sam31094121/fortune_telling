// Regression (2026-10-19): hard battlefield resumes the same staked battle after a reload.
// Real battlefield route + real collection runtime/ledger; synthetic qa-synth collection in a fake localStorage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const build = (p) => path.resolve('.beast-game-build', p);
const transpile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;

// ---- battlefield route (server) ----
const route = { exports: {} };
vm.runInNewContext(transpile('app/api/beast-game/battlefield/route.ts'), { exports: route.exports, process, console, URL, Buffer, require(name) {
  if (name === 'next/server') return { NextResponse: { json: (data, options = {}) => ({ data, status: options.status ?? 200 }) } };
  if (name.startsWith('@/lib/')) return require(build(name.slice(2) + '.js'));
  return require(name);
} });
const call = async (body) => { const r = await route.exports.POST(new Request('http://127.0.0.1/api/beast-game/battlefield', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })); return { status: r.status, ...r.data }; };

// ---- browser storage + Web Locks (a "reload" drops the page's held lock) ----
const store = new Map();
let lockHeld = false;
const window = { localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } }, dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} };
const navigator = { locks: { request: async (_name, options, callback) => { const fn = callback ?? options; if (lockHeld && callback && options.ifAvailable) return fn(null); lockHeld = true; try { return await fn({}); } finally { lockHeld = false; } } } };
const col = { exports: {} };
vm.runInNewContext(transpile('lib/beast-collection.ts'), { exports: col.exports, window, navigator, crypto: globalThis.crypto, Event: class {}, console, Date, JSON, Promise, Error, Object, Array, Map, Set, Math, require(name) {
  if (name === './beast-growth-rewards') return { deriveUnlockedMansions: () => [], gameCardIdsForMansion: () => [] };
  if (name === './beast-collection-ledger') return require(build('lib/beast-collection-ledger.js'));
  return require(name);
} });
const C = col.exports;
const COLLECTION = 'tdh_beast_collection_v1', LIVE = 'tdh_beast_field_live_v1', JOURNAL = 'tdh_beast_duel_pending_v1';
const seed = (tag, stakeCard) => { store.clear(); store.set(COLLECTION, JSON.stringify({ cards: [0, 1, 2, 3].map(i => ({ id: `qa-synth:${tag}:${i}`, cardId: i < 2 ? stakeCard : 'beast_y02', source: 'DUEL_WIN', at: '2026-10-19T00:00:00Z' })), history: [], receipts: {}, granted: [] })); };
const collection = () => JSON.parse(store.get(COLLECTION));
const reload = () => { lockHeld = false; }; // the browser releases the page's lock on reload
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const tick = () => new Promise(r => setTimeout(r, 0));

/** Start a staked battle, play `moves` turns, then the page is reloaded (pending never resolves). */
async function startAndReload(tag, moves) {
  const deal = await call({ type: 'DEAL' });
  const team = deal.table.player.hand.slice(0, 3);
  seed(tag, team[0]);
  const stakes = [`qa-synth:${tag}:0`, `qa-synth:${tag}:1`];
  const opened = await call({ type: 'START', tableToken: deal.tableToken, playerTeam: team, stakeCardId: team[0], stakeCount: stakes.length });
  assert.equal(opened.match.difficulty, 'HARD');
  let last = opened;
  void C.runOwnedStakesDuel(stakes, () => new Promise(() => {
    const matchId = collection().pending.id;
    C.saveLiveBattle({ matchId, token: opened.token, startedAt: Date.now(), stakeCardId: team[0], table: deal.table });
    (async () => { for (let i = 0; i < moves && last.match.status === 'PLAYING'; i++) { last = await call({ type: 'AUTO', token: last.token }); C.updateLiveBattleToken(matchId, last.token); } })();
  }));
  for (let i = 0; i < 200 && (last.match.revision < Math.min(moves, 1) || (moves && last === opened)); i++) await tick();
  for (let i = 0; i < 50; i++) await tick();
  reload();
  return { stakes, last, before: 4 };
}
async function finishResumed(live) {
  const resumed = await call({ type: 'RESUME', token: live.token });
  assert.equal(resumed.status, 200);
  let last = resumed;
  return C.resumeOwnedStakesDuel(live.matchId, async (entries) => {
    while (last.match.status === 'PLAYING') last = await call({ type: 'AUTO', token: last.token });
    return { ok: true, stake: { ...last.outcome, selectedEntries: entries, forfeitedEntryIds: last.outcome.verdict === 'LOST' ? entries.map(e => e.id) : [] } };
  });
}

(async () => {
  let checks = 0;
  const seen = { WON: false, LOST: false };
  for (let round = 0; round < 40 && !(seen.WON && seen.LOST); round++) {
    const tag = `r${round}`;
    const { stakes, last } = await startAndReload(tag, 3);
    // 1. After reload: same battle offered for resume, stake still held, nothing charged or paid.
    const recovered = await C.recoverPendingDuel();
    assert.ok(recovered.liveBattle, 'reload offers the live battle');
    same(collection().pending.entries.map(e => e.id), stakes, 'stake stays held (not released, not re-staked)');
    assert.equal(collection().cards.length, 4);
    const resumed = await call({ type: 'RESUME', token: recovered.liveBattle.token });
    same(resumed.match, last.match, 'RESUME restores the exact battle state');
    // A second reload before finishing still offers the same battle.
    reload(); assert.equal((await C.recoverPendingDuel()).liveBattle.matchId, recovered.liveBattle.matchId);
    // 2/3. Finish the resumed battle: settles exactly once (a reload while losing still ends as a loss).
    const { result, settlement } = await finishResumed(recovered.liveBattle);
    const verdict = result.stake.verdict;
    assert.equal(settlement.saved, true);
    const after = collection();
    const expected = verdict === 'LOST' ? 2 : verdict === 'WON' ? 4 + Math.max(2, result.stake.gainedCount ?? 0) : 4;
    assert.equal(after.cards.length, verdict === 'LOST' ? 2 : expected, `${verdict} settles once`);
    if (verdict === 'LOST') assert.ok(stakes.every(id => !after.cards.some(c => c.id === id)), 'lost stake removed');
    assert.equal(Object.keys(after.receipts).length, 1);
    assert.equal(after.pending, null); assert.equal(store.has(LIVE), false); assert.equal(store.has(JOURNAL), false);
    // No second charge/pay: reload again, retry save, leftover journal replayed twice.
    reload(); same(await C.recoverPendingDuel(), {});
    await C.retryStakeSettlement(settlement.matchId, result.stake);
    store.set(JOURNAL, JSON.stringify({ matchId: settlement.matchId, result }));
    await C.recoverPendingDuel(); await C.recoverPendingDuel();
    assert.equal(collection().cards.length, after.cards.length, 'no double charge or double pay');
    assert.equal(Object.keys(collection().receipts).length, 1);
    seen[verdict] = true; checks++;
  }
  assert.ok(seen.LOST, 'covered a reload during a battle that ends lost');
  assert.ok(seen.WON, 'covered a reload during a battle that ends won');

  // 4a. Expired live record: falls back to current behaviour (stake released, nothing charged).
  {
    const { stakes } = await startAndReload('exp', 2);
    const live = JSON.parse(store.get(LIVE)); live.startedAt -= 13 * 60 * 60 * 1000; store.set(LIVE, JSON.stringify(live));
    const recovered = await C.recoverPendingDuel();
    assert.equal(recovered.interrupted, true); assert.equal(recovered.liveBattle, undefined);
    assert.equal(collection().pending, null); assert.equal(collection().cards.length, 4); assert.equal(store.has(LIVE), false);
    assert.ok(stakes.every(id => collection().cards.some(c => c.id === id)));
  }
  // 4b. Invalid/expired server ticket: RESUME is refused (410) and the page releases the stake.
  {
    await startAndReload('bad', 2);
    const recovered = await C.recoverPendingDuel();
    const refused = await call({ type: 'RESUME', token: recovered.liveBattle.token.slice(0, -3) + 'xyz' });
    assert.equal(refused.status, 410);
    await C.releaseLiveBattle(recovered.liveBattle.matchId);
    assert.equal(collection().pending, null); assert.equal(collection().cards.length, 4); assert.equal(store.has(LIVE), false);
  }
  // 5. Leaving the page (SPA unmount) holds the battle instead of releasing it.
  {
    const deal = await call({ type: 'DEAL' });
    seed('held', deal.table.player.hand[0]);
    let failed;
    await C.runOwnedStakesDuel(['qa-synth:held:0'], () => { const matchId = collection().pending.id; C.saveLiveBattle({ matchId, token: 'x', startedAt: Date.now(), stakeCardId: null, table: null }); return Promise.reject(Object.assign(new Error('held'), { name: C.BATTLE_HELD })); }).catch(e => { failed = e; });
    assert.equal(failed.name, C.BATTLE_HELD); assert.ok(collection().pending, 'held battle keeps the stake reserved');
    assert.ok((await C.recoverPendingDuel()).liveBattle);
  }
  // 6. Medium-mode reservation without a live battle keeps the old release behaviour.
  {
    seed('medium', 'beast_y01');
    void C.runOwnedDuel('beast_y01', () => new Promise(() => {}));
    await tick(); reload();
    same(await C.recoverPendingDuel(), { interrupted: true });
    assert.equal(collection().pending, null);
  }
  console.log(`PASS battlefield resume: ${checks} reloaded battles (won+lost) resumed exactly, settled once, no double charge/pay; expired + invalid ticket fall back to release; leaving holds; medium unchanged`);
})().catch(error => { console.error(error); process.exitCode = 1; });
