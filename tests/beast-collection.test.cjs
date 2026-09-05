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
  let locked = false, fail = () => false;
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
    if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const customRequire = (id) => {
      if (id.endsWith('.css')) return new Proxy({}, { get: (_, prop) => prop });
      if (id === 'next/link') return ({ children, ...props }) => require('react').createElement('a', props, children);
      return id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
    };
    vm.runInNewContext(source, { module, exports: module.exports, require: customRequire, window: { localStorage, dispatchEvent: events.dispatchEvent.bind(events), addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) }, navigator, crypto: require('node:crypto').webcrypto, Event, console, setTimeout, clearTimeout }, { filename: file });
    return module.exports;
  }
  return { data, load, failWrites: (predicate) => { fail = predicate; }, navigator };
}

async function main() {
  let checks = 0;
  const check = (message, fn) => { fn(); checks++; console.log('PASS:', message); };
  const h = harness(new Map([[MODULES, JSON.stringify(['number', 'number'])]]));
  const store = h.load('lib/beast-collection.ts');
  const rules = h.load('lib/beast-game/stake.ts');
  const result = (winner, player = a, opponent = b) => ({ ok: true, isReplay: false, stake: rules.resolveStake({ playerStake: player, opponentStake: opponent, winner }) });
  check('one earned pair supplies exactly two independent copies', () => assert.deepEqual(JSON.parse(JSON.stringify([...store.countByCard(store.readCollection())])), [[a, 1], [y, 1]]));
  let calls = 0;
  await assert.rejects(store.runOwnedDuel(b, async () => { calls++; return result('PLAYER', b); }), /不在/);
  check('unowned stake is blocked before any battle request', () => assert.equal(calls, 0));
  const lost = await store.runOwnedDuel(a, async () => result('OPPONENT'));
  check('losing growth copy actually removes one and reports remaining zero', () => { assert.equal(lost.settlement.saved, true); assert.equal(lost.settlement.receipt.remaining, 0); assert.equal(store.countByCard(store.readCollection()).has(a), false); });
  check('reload cannot silently regrant a lost growth reward', () => assert.equal(harness(h.data).load('lib/beast-collection.ts').readCollection().cards.some(c => c.cardId === a), false));
  const duplicate = await store.retryStakeSettlement(lost.settlement.matchId, lost.result.stake);
  check('duplicate loss receipt does not take a second card', () => { assert.equal(duplicate.saved, true); assert.equal(store.readCollection().cards.length, 1); assert.equal(store.readCollection().history.length, 1); });
  const won = await store.runOwnedDuel(y, async () => result('PLAYER', y, a));
  check('win keeps original stake and adds opponent card to same growth inventory', () => { assert.equal(won.settlement.receipt.total, 2); assert.equal(h.load('lib/beast-owned-cards.ts').readOwnedCards().counts.get(a), 1); });
  await store.runOwnedDuel(y, async () => result('PLAYER', y, a));
  const oneLost = await store.runOwnedDuel(a, async () => result('OPPONENT'));
  check('two equal cards lose only one copy', () => { assert.equal(oneLost.settlement.receipt.remaining, 1); assert.equal(store.countByCard(store.readCollection()).get(a), 1); });
  const beforeDraw = store.readCollection().cards.length;
  await store.runOwnedDuel(y, async () => result('DRAW', y));
  check('draw leaves inventory count unchanged', () => assert.equal(store.readCollection().cards.length, beforeDraw));
  await assert.rejects(store.runOwnedDuel(y, async () => ({ ...result('PLAYER', y), isReplay: true })), /有效戰果/);
  check('replay cannot award or confiscate', () => assert.equal(store.readCollection().cards.length, beforeDraw));

  h.failWrites((key) => key === KEY);
  await assert.rejects(store.runOwnedDuel(y, async () => { calls++; return result('PLAYER', y); }), /QuotaExceeded/);
  check('blocked storage prevents initiating wager', () => assert.equal(calls, 0));
  h.failWrites((key, value) => key === KEY && JSON.parse(value).pending === null);
  const failed = await store.runOwnedDuel(y, async () => result('OPPONENT', y));
  check('failed settlement never claims a committed receipt', () => { assert.equal(failed.settlement.saved, false); assert.equal(failed.settlement.receipt, null); assert.equal(store.countByCard(store.readCollection()).get(y), 1); });
  await assert.rejects(store.runOwnedDuel(a, async () => result('PLAYER')), /尚待結算/);
  h.failWrites(() => false);
  const recovered = await harness(h.data).load('lib/beast-collection.ts').recoverPendingDuel();
  check('reload recovers journal and settles exactly once', () => { assert.equal(recovered.settlement.saved, true); assert.equal(store.countByCard(store.readCollection()).has(y), false); });
  await store.retryStakeSettlement(failed.settlement.matchId, failed.result.stake);
  check('retry after recovery remains idempotent', () => assert.equal(store.readCollection().cards.length, 1));

  const parallel = harness(new Map([[MODULES, '["number"]']]));
  const ps = parallel.load('lib/beast-collection.ts');
  let release;
  const first = ps.runOwnedDuel(a, () => new Promise(resolve => { release = () => resolve(result('DRAW')); }));
  await assert.rejects(ps.runOwnedDuel(a, async () => result('OPPONENT')), /另一個分頁/);
  await assert.rejects(ps.recoverPendingDuel(), /另一個分頁/);
  release(); await first;
  check('cross-tab concurrent start/recovery cannot consume reserved card', () => assert.equal(ps.readCollection().cards.length, 2));
  await assert.rejects(ps.runOwnedDuel(a, async () => { throw new Error('offline'); }), /offline/);
  check('connection failure releases reservation without confiscation', () => { assert.equal(ps.readCollection().pending, null); assert.equal(ps.readCollection().cards.length, 2); });
  for (let i = 0; i < 65; i++) await ps.runOwnedDuel(a, async () => result('DRAW'));
  await ps.retryStakeSettlement((await first).settlement.matchId, result('DRAW').stake);
  check('receipt deduplication survives visible history truncation', () => assert.equal(ps.readCollection().history.length, 60));

  const legacy = harness(new Map([[MODULES, '["number"]'], [KEY, JSON.stringify({ cards: [{ cardId: a, at: '2026-09-01', source: 'DUEL_WIN' }, { cardId: a, at: '2026-09-02', source: 'DUEL_WIN' }], history: [] })]]));
  check('legacy won duplicates preserved alongside one earned pair', () => assert.equal(legacy.load('lib/beast-collection.ts').readCollection().cards.length, 4));
  const corrupted = harness(new Map([[KEY, '{broken']]));
  await assert.rejects(corrupted.load('lib/beast-collection.ts').runOwnedDuel(a, async () => result('PLAYER')));
  check('corrupt collection never overwritten with an empty collection', () => assert.equal(corrupted.data.get(KEY), '{broken'));
  const growth = h.load('lib/beast-growth-rewards.ts');
  check('malformed progress cannot grant phantom rewards', () => assert.equal(growth.deriveUnlockedMansions({}, ['2026-09-01']).length, 0));
  check('four cumulative tasks unlock a pair without streak requirement', () => assert.equal(growth.deriveUnlockedMansions([], { d1: '2026-08-01', d2: '2026-08-10', d3: '2026-08-20', d4: '2026-09-05' })[0], 9));

  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  const Panel = h.load('components/BeastStakeResult.tsx').default;
  const props = { outcome: { ...result('OPPONENT').stake, playerStakeName: '角木蛟', opponentStakeName: '亢金龍', gainedCardName: null, forfeitedCardName: '角木蛟' }, card: { name: '角木蛟', thumbnail: '/test.png' }, isReplay: false, retrying: false, onRetry() {} };
  const html = (settlement, isReplay = false) => renderToStaticMarkup(React.createElement(Panel, { ...props, settlement, isReplay }));
  check('saved loss names card, minus one, and actual remaining copies', () => { const text = html(oneLost.settlement); assert.match(text, /輸掉 −1/); assert.match(text, /角木蛟/); assert.match(text, /還有 1 張/); });
  check('failed storage never displays saved loss or removal overlay', () => { const text = html(failed.settlement); assert.match(text, /待保存/); assert.doesNotMatch(text, /輸掉 −1|已從成長中心扣除|grayscale/); });
  check('replay clearly says no new inventory change', () => { const text = html(oneLost.settlement, true); assert.match(text, /本次不發獎，也不扣卡/); assert.doesNotMatch(text, /輸掉 −1/); });
  check('saved win explicitly names prize and links the growth collection', () => {
    const text = renderToStaticMarkup(React.createElement(Panel, { ...props, outcome: { ...props.outcome, verdict: 'WON', gainedCardName: '亢金龍', forfeitedCardName: null }, settlement: won.settlement }));
    assert.match(text, /獲得 ＋1/); assert.match(text, /你多了一張「亢金龍」/); assert.match(text, /growth-center#beast-collection/);
  });
  const ledger = h.load('lib/beast-collection-ledger.ts');
  const reserved = ledger.reserveCard(ledger.grantGrowthCards({ cards: [], history: [] }, [a], '2026-09-05'), a, 'mismatch', '2026-09-05');
  check('mismatched or absent reserved copy cannot be falsely confiscated', () => {
    assert.throws(() => ledger.settleCard(reserved, 'mismatch', result('OPPONENT', b).stake, '2026-09-05'), /不一致/);
    assert.throws(() => ledger.settleCard({ ...reserved, cards: [] }, 'mismatch', result('OPPONENT').stake, '2026-09-05'), /不存在/);
    assert.equal(reserved.cards.length, 1);
  });
  console.log('PASS:', checks, 'collection and customer-receipt regression checks');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
