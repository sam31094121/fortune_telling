// 餵食／合體鏈 P0（DESIGN.md v1＋v2）：每條規則一個自動測試；開關關閉時存檔逐位元組與 4391425b 相同。
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) { return resolve.call(this, id.startsWith('@/') ? path.resolve(ROOT, id.slice(2)) : id, ...args); };
delete process.env.NEXT_PUBLIC_M3_FEED_CHAIN;
const C = require('../lib/beast-game/match3/hard-campaign.ts');
const F = require('../lib/beast-game/match3/feed-chain.ts');
const L = require('../lib/beast-game/match3/import-ledger.ts');
const S = require('../lib/beast-game/match3/hard-campaign-store.ts');
const Face = require('../lib/beast-game/card-face-stats.ts').CARD_FACE_STATS;

const HERO = 'beast_g_qinglong', TEAM = [HERO, 'beast_y05', 'beast_y06', 'beast_y07', 'beast_y08'];
const ON = { enabled: true, inBattle: false };
function campaign(wins) {
  let p = C.chooseCampaignHero(C.newCampaign(), HERO);
  p = { ...p, teamIds: [...TEAM] };
  for (let i = 0; i < wins; i++) p = C.campaignWin(p, 'm' + i, i).profile;
  return p;
}
const rewardRef = (p, cardId, nth = 0) => 'reward:' + p.rewards.filter(r => r.cardId === cardId)[nth].matchId;
const stat = (cardId, effectiveAttack, startEnergy = 0) => ({ cardId, form: 'ADULT', faceAttack: effectiveAttack, youngBonus: 0, chainBonus: 0, effectiveAttack, startEnergy, copies: 1 });
function memStore() { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), data: m }; }
function installStorage() {
  const local = memStore(), session = memStore();
  global.window = { localStorage: local, sessionStorage: session };
  let queue = Promise.resolve();
  Object.defineProperty(global, 'navigator', { configurable: true, value: { locks: { request: (_k, fn) => { const run = queue.then(fn); queue = run.catch(() => {}); return run; } } } });
  return local;
}
const KEY = 'match3-hard-campaign-self-v1';

// ── 功能開關 ─────────────────────────────────────────────
test('開關：未設定／空字串／0／true 都是關，只有 1 才開', () => {
  assert.equal(F.feedChainEnabled(), false);
  for (const v of [undefined, '', '0', 'true', 'on', ' 1']) assert.equal(F.feedChainEnabled(v), false, String(v));
  assert.equal(F.feedChainEnabled('1'), true);
  assert.equal(F.FEED_CHAIN_FLAG, 'NEXT_PUBLIC_M3_FEED_CHAIN');
});
test('開關關：不讀新欄位（就算是壞資料也不讀）、預覽拒絕、寫入拋錯', () => {
  const p = { ...campaign(8), chainReceipts: 'garbage', consumedRewardMatchIds: 42 };
  assert.deepEqual(F.readFeedChainState(p), { enabled: false, ok: true, chainReceipts: [], consumedRewardMatchIds: [] });
  const pv = F.previewFeed(p, rewardRef(p, 'beast_a03'), HERO, { inBattle: false });
  assert.equal(pv.allowed, false); assert.deepEqual(pv.reasons, ['FLAG_OFF']);
  assert.throws(() => F.applyFeed(p, 'op', rewardRef(p, 'beast_a03'), HERO, { inBattle: false }), /尚未開放/);
  const view = F.feedChainView(p, {});
  assert.equal(view.enabled, false); assert.deepEqual(view.lockedTop, []);
});
test('開關關：存檔層函式不寫入，存檔逐位元組不變', async () => {
  const local = installStorage(), p = campaign(8), raw = JSON.stringify(p);
  local.setItem(KEY, raw);
  const r = await S.feedCampaignChain('self', 'op-off', rewardRef(p, 'beast_a03'), HERO, raw, { inBattle: false });
  assert.equal(r.ok, false); assert.equal(local.getItem(KEY), raw);
});
test('開關關：同一劇本的每一次存檔寫入與回傳值，與 4391425b 黃金檔逐位元組相同（未設定與 =0 各跑一次）', () => {
  const golden = fs.readFileSync(path.join(ROOT, 'tests/fixtures/match3-feed-chain/campaign-writes-4391425b.json'), 'utf8');
  const g = JSON.parse(golden);
  assert.equal(g.writes.length, 29);
  for (const value of [undefined, '0']) {
    const env = { ...process.env }; if (value === undefined) delete env.NEXT_PUBLIC_M3_FEED_CHAIN; else env.NEXT_PUBLIC_M3_FEED_CHAIN = value;
    const run = spawnSync(process.execPath, [path.join(ROOT, 'tests/helpers/match3-campaign-golden-scenario.cjs'), ROOT], { env, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, golden, 'scenario output must be byte-identical with flag ' + String(value));
    const now = JSON.parse(run.stdout);
    now.writes.forEach((w, i) => assert.equal(Buffer.compare(Buffer.from(w[2]), Buffer.from(g.writes[i][2])), 0));
  }
});
test('舊存檔（無新欄位）在開關開時可讀，鏈狀態為空', () => {
  const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/match3-feed-chain/campaign-writes-4391425b.json'), 'utf8'));
  const p = C.parseCampaign(g.finalLocal[KEY]);
  assert.equal(p.chainReceipts, undefined);
  assert.deepEqual(F.readFeedChainState(p, true), { enabled: true, ok: true, chainReceipts: [], consumedRewardMatchIds: [] });
});

// ── 排名與鎖定（v2-4）────────────────────────────────────
test('排名：有效攻擊→開局能量→卡片 ID，名次固定', () => {
  const stats = [stat('c', 50, 0), stat('b', 50, 5), stat('a', 50, 0), stat('z', 60, 0), stat('d', 50, 5)];
  const order = F.rankFeedCards(stats).ranked.map(s => s.cardId);
  assert.deepEqual(order, ['z', 'b', 'd', 'a', 'c']);
  assert.deepEqual(F.rankFeedCards([...stats].reverse()).ranked.map(s => s.cardId), order, 'input order must not matter');
});
test('鎖定：能量第一名在第 7 名時仍被鎖，最多鎖 6 張（不含隊伍與四大神獸）', () => {
  const stats = [stat('a', 90), stat('b', 80), stat('c', 70), stat('d', 60), stat('e', 50), stat('f', 40), stat('g', 30, 12), stat('h', 20)];
  const r = F.rankFeedCards(stats);
  assert.deepEqual(r.topFive, ['a', 'b', 'c', 'd', 'e']); assert.equal(r.energyLeader, 'g');
  const locks = F.feedLocks({ teamIds: [] }, stats);
  assert.deepEqual(locks.get('g'), ['TOP_ENERGY']); assert.equal(locks.has('f'), false); assert.equal(locks.has('h'), false);
  assert.equal(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].filter(id => locks.has(id)).length, 6);
});
test('鎖定：同能量時能量第一依排名順序只取一張', () => {
  const r = F.rankFeedCards([stat('x', 10, 7), stat('y', 30, 7), stat('w', 20, 7)]);
  assert.equal(r.energyLeader, 'y');
});
test('鎖定清單：前五＋能量第一＋出戰隊伍＋全部四大神獸', () => {
  const p = campaign(8), st = F.readFeedChainState(p, true), stats = F.feedCardStats(p, st, F.feedPool(p, st)), locks = F.feedLocks(p, stats);
  for (const g of C.campaignGuardianIds()) assert(locks.get(g).includes('GUARDIAN'), g);
  for (const id of TEAM) assert(locks.get(id).includes('TEAM'), id);
  const top = F.rankFeedCards(stats).topFive; assert.equal(top.length, 5);
  for (const id of top) assert(locks.get(id).includes('TOP_FIVE'), id);
  assert(!locks.has('beast_a03'), 'low attack adult outside team is free');
});

// ── 第 10 點 1–6（各一個被拒測試）＋往上吃＋解鎖 ─────────────────
test('第10點-1（PLAN-v2 B9 改）只有一張時不能自己吃自己；同一種卡的第二張起改放進自己的共鳴格', () => {
  const p = campaign(30); // beast_a01、beast_a02 各兩張，beast_a03 只有一張
  const dup = F.previewFeed(p, rewardRef(p, 'beast_a01', 1), 'beast_a01', ON);
  assert.equal(dup.kind, 'RESONANCE'); assert.equal(dup.allowed, true, dup.reasons.join());
  const single = F.previewFeed(p, rewardRef(p, 'beast_a03', 0), 'beast_a03', ON);
  assert.equal(single.allowed, false); assert(single.reasons.includes('SELF'));
});
test('第10點-2 四大神獸不能被吃（主角也不行）', () => {
  const p = campaign(8), imports = [{ key: 'collection:duel:x:0', sourceEntryId: 'duel:x:0', cardId: 'beast_g_baihu', source: 'DUEL_WIN', status: 'AVAILABLE' }];
  const pv = F.previewFeed(p, 'hero:' + HERO, 'beast_g_baihu', { ...ON, imports });
  assert.equal(pv.allowed, false); assert(pv.reasons.includes('GUARDIAN_MATERIAL'));
});
test('第10點-3 出戰隊伍的卡不能當材料', () => {
  const p = campaign(8), pv = F.previewFeed(p, 'young:beast_y05', HERO, ON);
  assert.equal(pv.allowed, false); assert.deepEqual(pv.reasons, ['TEAM_MEMBER']);
});
test('第10點-4 攻擊前五名不能當材料', () => {
  const p = campaign(8), pv = F.previewFeed(p, rewardRef(p, 'beast_a02'), HERO, ON); // a02=62 在前五
  assert.equal(pv.allowed, false); assert.deepEqual(pv.reasons, ['TOP_FIVE']);
});
test('第10點-5 開局能量第一名不能當材料', () => {
  const p = { ...campaign(12), heroId: HERO }; // a11=82 排第一，全員能量 0 → 能量第一＝排名第一
  const pv = F.previewFeed(p, rewardRef(p, 'beast_a11'), HERO, ON);
  assert.equal(pv.allowed, false); assert(pv.reasons.includes('TOP_ENERGY')); assert(pv.reasons.includes('TOP_FIVE'));
});
test('第10點-6 吃完至少要留 5 張不同的可出戰卡', () => {
  const allYoung = C.campaignCollection(C.newCampaign()).youngIds;
  const p = { ...C.newCampaign(4), heroId: HERO, teamIds: [], consumedYoungIds: allYoung.slice(4) }; // 卡池＝主角＋4 幼子
  const pv = F.previewFeed(p, 'young:' + allYoung[0], HERO, ON);
  assert.equal(pv.allowed, false); assert(pv.reasons.includes('MIN_FIVE')); assert.equal(pv.remainingPlayable, 4);
});
test('第10點-6 其中要有主角四大神獸（沒有主角就拒絕）', () => {
  const p = { ...campaign(8), heroId: null, teamIds: [] };
  const pv = F.previewFeed(p, 'young:beast_y01', 'beast_a01', ON);
  assert.equal(pv.allowed, false); assert(pv.reasons.includes('NO_HERO'));
});
test('只能往上吃：幼子吃幼子、成獸吃成獸、成獸吃到幼子、幼子當接收者都拒絕', () => {
  const p = campaign(8);
  assert.deepEqual(F.previewFeed(p, 'young:beast_y01', 'beast_y02', ON).reasons, ['NOT_UPWARD']);
  assert.deepEqual(F.previewFeed(p, rewardRef(p, 'beast_a03'), 'beast_a06', ON).reasons, ['NOT_UPWARD']);
  assert.deepEqual(F.previewFeed(p, rewardRef(p, 'beast_a03'), 'beast_y01', ON).reasons, ['NOT_UPWARD']);
  assert.equal(F.previewFeed(p, 'young:beast_y01', 'beast_a03', ON).allowed, true, 'young → adult is upward');
  assert.equal(F.previewFeed(p, rewardRef(p, 'beast_a03'), HERO, ON).allowed, true, 'adult → guardian is upward');
});
test('解鎖：本體→四大神獸 7 勝拒絕、8 勝允許；幼子→本體 3 勝拒絕、4 勝允許', () => {
  const p7 = campaign(7), p8 = campaign(8);
  assert.deepEqual(F.previewFeed(p7, rewardRef(p7, 'beast_a03'), HERO, ON).reasons, ['LOCKED_BY_WINS']);
  assert.equal(F.previewFeed(p8, rewardRef(p8, 'beast_a03'), HERO, ON).allowed, true);
  const p3 = campaign(3), p4 = campaign(4);
  assert.deepEqual(F.previewFeed(p3, 'young:beast_y01', 'beast_a03', ON).reasons, ['LOCKED_BY_WINS']);
  assert.equal(F.previewFeed(p4, 'young:beast_y01', 'beast_a03', ON).allowed, true);
});
test('戰鬥中拒絕餵卡', () => {
  const p = campaign(8);
  assert(F.previewFeed(p, rewardRef(p, 'beast_a03'), HERO, { enabled: true, inBattle: true }).reasons.includes('IN_BATTLE'));
});
test('攻擊上限：幼子＋鏈加成合計不超過卡面 50%，超過就拒絕', () => {
  const cap = Math.floor(Face[HERO].attack * .5), p = { ...campaign(8), enhancements: { [HERO]: cap - 1 } };
  const pv = F.previewFeed(p, rewardRef(p, 'beast_a03'), HERO, ON);
  assert.deepEqual(pv.reasons, ['ATTACK_CAP']); assert.equal(pv.maxBonus, cap);
});
test('鎖定卡可以當接收者（主角同時是四大神獸＋隊伍＋前五）', () => {
  const p = campaign(8), pv = F.previewFeed(p, rewardRef(p, 'beast_a03'), HERO, ON);
  assert.equal(pv.allowed, true);
  assert.equal(pv.attackBonus, Math.max(1, Math.floor(Face.beast_a03.attack * .1))); assert.equal(pv.energyBonus, 5);
});
test('元素：最後一張某元素的卡只提醒、不鎖', () => {
  const allYoung = C.campaignCollection(C.newCampaign()).youngIds;
  const earthYoung = allYoung.filter(id => ['beast_y03', 'beast_y10', 'beast_y17', 'beast_y24'].includes(id));
  const p = { ...campaign(8), consumedYoungIds: earthYoung };
  const pv = F.previewFeed(p, rewardRef(p, 'beast_a03'), HERO, ON);
  assert.equal(pv.allowed, true); assert.deepEqual(pv.warnings, ['LAST_ELEMENT']);
});

// ── 前→後預覽、寫入、重送、存檔層 ─────────────────────────
test('預覽「前→後」等於寫入後的實際數字與排名', () => {
  const p = campaign(8), ref = rewardRef(p, 'beast_a03');
  const pv = F.previewFeed(p, ref, HERO, ON), done = F.applyFeed(p, 'op-1', ref, HERO, ON);
  assert.equal(done.duplicate, false);
  const st = F.readFeedChainState(done.profile, true); assert(st.ok);
  const stats = F.feedCardStats(done.profile, st, F.feedPool(done.profile, st)), hero = stats.find(s => s.cardId === HERO);
  assert.equal(hero.effectiveAttack, pv.after.attack); assert.equal(hero.startEnergy, pv.after.energy);
  assert.equal(pv.after.attack, pv.before.attack + pv.attackBonus);
  assert.deepEqual(F.rankFeedCards(stats).topFive, pv.topFiveAfter);
  assert.deepEqual(F.rankFeedCards(stats).ranked.map(s => s.cardId), pv.rankingAfter);
  assert(!F.feedPool(done.profile, st).some(u => u.ref === ref), 'eaten card leaves the pool');
  const reparsed = C.parseCampaign(JSON.stringify(done.profile)); // existing parser still accepts the save
  assert.deepEqual(reparsed.chainReceipts, done.profile.chainReceipts); assert.deepEqual(reparsed.consumedRewardMatchIds, done.profile.consumedRewardMatchIds);
});
test('傳承：本體被吃時帶上已累積強化的 50%（捨去）', () => {
  let p = campaign(8);
  p = C.enhanceCampaignProfile(p, 'y1', 'beast_y11', 'beast_a03').profile; // +4
  p = C.enhanceCampaignProfile(p, 'y2', 'beast_y13', 'beast_a03').profile; // +4 → 8
  const accumulated = C.enhancementBonus(p, 'beast_a03');
  const pv = F.previewFeed(p, rewardRef(p, 'beast_a03'), HERO, ON);
  assert.equal(pv.inheritedAttack, Math.floor(accumulated * .5));
  assert.equal(pv.attackBonus, Math.max(1, Math.floor(Face.beast_a03.attack * .1)) + Math.floor(accumulated * .5));
  assert.equal(F.applyFeed(p, 'chain', rewardRef(p, 'beast_a03'), HERO, ON).profile.chainReceipts[0].inheritedAttack, pv.inheritedAttack);
});
test('幼子路徑沿用現行收據（攻擊），P0 能量加成為 0', () => {
  const p = campaign(8), pv = F.previewFeed(p, 'young:beast_y01', 'beast_a03', ON);
  assert.equal(pv.energyBonus, 0);
  const done = F.applyFeed(p, 'y-op', 'young:beast_y01', 'beast_a03', ON).profile;
  assert.equal(done.enhancementReceipts.at(-1).youngId, 'beast_y01'); assert.equal(done.chainReceipts, undefined);
  assert.equal(C.campaignAttack(done, 'beast_a03'), pv.after.attack);
});
test('開局能量：單卡最多 20', () => {
  let p = campaign(28);
  const mats = ['beast_a01', 'beast_a03', 'beast_a06', 'beast_a07', 'beast_a10'];
  mats.forEach((id, i) => { p = F.applyFeed(p, 'e' + i, rewardRef(p, id), HERO, ON).profile; });
  const st = F.readFeedChainState(p, true), hero = F.feedCardStats(p, st, F.feedPool(p, st)).find(s => s.cardId === HERO);
  assert.equal(hero.startEnergy, 20); assert.equal(F.FEED_CHAIN_RULES.teamEnergyCap, 60);
  assert(hero.effectiveAttack <= Face[HERO].attack + Math.floor(Face[HERO].attack * .5));
});
test('同一 operationId 重送不重複扣卡；參數不同就拒絕', () => {
  const p = campaign(8), ref = rewardRef(p, 'beast_a03'), once = F.applyFeed(p, 'op', ref, HERO, ON).profile;
  const again = F.applyFeed(once, 'op', ref, HERO, ON);
  assert.equal(again.duplicate, true); assert.equal(again.profile, once); assert.equal(once.consumedRewardMatchIds.length, 1);
  assert.throws(() => F.applyFeed(once, 'op', rewardRef(p, 'beast_a01'), HERO, ON), /不一致/);
});
test('存檔層：鎖定卡就算繞過畫面直接送也會被拒，存檔不變', async () => {
  const local = installStorage(), p = campaign(8), raw = JSON.stringify(p); local.setItem(KEY, raw);
  const r = await S.feedCampaignChain('self', 'bypass', rewardRef(p, 'beast_a02'), HERO, raw, ON);
  assert.equal(r.ok, false); assert.match(r.error, /前五/); assert.equal(local.getItem(KEY), raw);
});
test('存檔層：兩個分頁同時確認，第二個被拒並要求重新讀取', async () => {
  const local = installStorage(), p = campaign(8); local.setItem(KEY, JSON.stringify(p));
  const snap = S.readCampaignSnapshot('self');
  const [a, b] = await Promise.all([
    S.feedCampaignChain('self', 'tab-a', rewardRef(p, 'beast_a03'), HERO, snap, ON),
    S.feedCampaignChain('self', 'tab-b', rewardRef(p, 'beast_a06'), HERO, snap, ON),
  ]);
  assert.equal(a.ok, true); assert.equal(b.ok, false); assert.match(b.error, /重新讀取/);
  assert.equal(S.readCampaign('self').profile.chainReceipts.length, 1);
  const retry = await S.feedCampaignChain('self', 'tab-a', rewardRef(p, 'beast_a03'), HERO, snap, ON);
  assert.equal(retry.ok, true); assert.equal(retry.duplicate, true);
});
test('新欄位被竄改：只停用餵食鏈，整份寶珠存檔照樣讀得到', () => {
  const local = installStorage(), p = campaign(8), done = F.applyFeed(p, 'op', rewardRef(p, 'beast_a03'), HERO, ON).profile;
  const bad = { ...done, chainReceipts: [{ ...done.chainReceipts[0], attackBonus: 999 }] };
  local.setItem(KEY, JSON.stringify(bad));
  const read = S.readCampaign('self'); assert.equal(read.ok, true);
  const st = F.readFeedChainState(read.profile, true); assert.equal(st.ok, false);
  assert.deepEqual(F.previewFeed(read.profile, rewardRef(p, 'beast_a06'), HERO, ON).reasons, ['CHAIN_STATE_INVALID']);
  for (const tamper of [{ consumedRewardMatchIds: ['m2', 'm2'] }, { consumedRewardMatchIds: ['nope'] }, { chainReceipts: {} }, { startEnergy: [] }, { consumedRewardMatchIds: [] }])
    assert.equal(F.readFeedChainState({ ...done, ...tamper }, true).ok, false, JSON.stringify(tamper));
});

// ── 匯入帳本結構（v2-3）──────────────────────────────────
const entries = [
  { id: 'duel:m1:0', cardId: 'beast_a05', source: 'DUEL_WIN' },
  { id: 'duel:m2', cardId: 'beast_a09', source: 'DUEL_WIN' },
  { id: 'shard:GUARDIAN:1', cardId: 'beast_g_baihu', source: 'GROWTH' },
  { id: 'starter:r:1', cardId: 'beast_y01', source: 'GROWTH' },
  { id: 'growth:beast_a01', cardId: 'beast_a01', source: 'GROWTH' },
  { id: 'reward:task1', cardId: 'beast_a02', source: 'GROWTH' },
];
test('匯入：只接押卡贏來與碎片兌換的卡；新手包／成長贈卡／任務領取不接', () => {
  const { added } = L.planCollectionImport(L.emptyImportLedger(), entries);
  assert.deepEqual(added.map(r => r.key), ['collection:duel:m1:0', 'collection:duel:m2', 'collection:shard:GUARDIAN:1']);
  assert.deepEqual(added.map(r => r.source), ['DUEL_WIN', 'DUEL_WIN', 'SHARD']);
});
test('匯入：同一筆匯入兩次卡數不變（冪等）、游標只處理新增；來源清單不被改動', () => {
  const frozen = JSON.stringify(entries);
  const first = L.planCollectionImport(L.emptyImportLedger(), entries).ledger;
  const second = L.planCollectionImport(first, entries);
  assert.equal(second.added.length, 0); assert.equal(second.ledger.receipts.length, 3);
  const third = L.planCollectionImport(second.ledger, [...entries, { id: 'duel:m3', cardId: 'beast_a10', source: 'DUEL_WIN' }]);
  assert.deepEqual(third.added.map(r => r.key), ['collection:duel:m3']);
  assert.equal(JSON.stringify(entries), frozen);
  assert.deepEqual(L.parseImportLedger(JSON.stringify(third.ledger)), third.ledger);
});
test('匯入：來源卡不見了 → 還沒用的作廢，已用的保留；壞帳本回 null 不拋錯', () => {
  const ledger = L.planCollectionImport(L.emptyImportLedger(), entries).ledger;
  ledger.receipts[1] = { ...ledger.receipts[1], status: 'USED', usedByOperationId: 'op' };
  const after = L.reconcileImportedSources(ledger, entries.filter(e => e.id !== 'duel:m1:0' && e.id !== 'duel:m2'));
  assert.deepEqual(after.receipts.map(r => r.status), ['VOID', 'USED', 'AVAILABLE']);
  assert.deepEqual(L.availableImportedCards(after).map(r => r.key), ['collection:shard:GUARDIAN:1']);
  for (const bad of ['{bad', 'null', '{"version":2,"receipts":[],"cursor":[]}', JSON.stringify({ version: 1, receipts: [{ key: 'x', sourceEntryId: 'y', cardId: 'beast_a01', source: 'DUEL_WIN', status: 'AVAILABLE' }], cursor: [] })]) assert.equal(L.parseImportLedger(bad), null, bad);
  assert.deepEqual(L.parseImportLedger(null), L.emptyImportLedger());
  assert.equal(L.IMPORT_LEDGER_KEY, 'match3-imported-cards-v1');
});
test('合併匯入卡後重排：匯入卡計入卡池與排名，但 P0 不能當材料', () => {
  const p = campaign(8), imports = [{ key: 'collection:duel:z', sourceEntryId: 'duel:z', cardId: 'beast_a11', source: 'DUEL_WIN', status: 'AVAILABLE' }];
  const st = F.readFeedChainState(p, true), stats = F.feedCardStats(p, st, F.feedPool(p, st, imports));
  assert.equal(F.rankFeedCards(stats).topFive[0], 'beast_a11', 'imported a11 (82) ranks first');
  const lowImport = [{ key: 'collection:duel:w', sourceEntryId: 'duel:w', cardId: 'beast_a24', source: 'DUEL_WIN', status: 'AVAILABLE' }];
  assert.deepEqual(F.previewFeed(p, 'import:collection:duel:w', HERO, { ...ON, imports: lowImport }).reasons, ['IMPORT_MATERIAL_PENDING']);
  const voided = [{ ...lowImport[0], status: 'VOID' }];
  assert.deepEqual(F.previewFeed(p, 'import:collection:duel:w', HERO, { ...ON, imports: voided }).reasons, ['MATERIAL_UNAVAILABLE']);
});

// ── 只讀顯示資料（v2-2）──────────────────────────────────
test('四象分組：mansionId 1–7 青龍、8–14 玄武、15–21 白虎、22–28 朱雀', () => {
  assert.deepEqual(['beast_a01', 'beast_a07', 'beast_a08', 'beast_a14', 'beast_a15', 'beast_a21', 'beast_a22', 'beast_a28'].map(F.fourSymbolOf), ['QINGLONG', 'QINGLONG', 'XUANWU', 'XUANWU', 'BAIHU', 'BAIHU', 'ZHUQUE', 'ZHUQUE']);
  assert.deepEqual(['beast_g_qinglong', 'beast_g_xuanwu', 'beast_g_baihu', 'beast_g_zhuque'].map(F.fourSymbolOf), ['QINGLONG', 'XUANWU', 'BAIHU', 'ZHUQUE']);
  assert.equal(F.fourSymbolOf('nope'), null);
});
test('疊卡 ×N＝可用張數；被吃掉一張就少一張；四象組預設收合；鎖定排最多 6 張', () => {
  let p = campaign(30);
  const count = (q) => F.feedChainView(q, { enabled: true }).groups.QINGLONG.find(c => c.cardId === 'beast_a01').count;
  assert.equal(count(p), 2);
  p = F.applyFeed(p, 'eat-a01', rewardRef(p, 'beast_a01', 0), HERO, ON).profile;
  assert.equal(count(p), 1);
  const view = F.feedChainView(p, { enabled: true });
  assert.equal(view.groupsCollapsedByDefault, true); assert.deepEqual(view.team, TEAM); assert.deepEqual(view.suggestions, []);
  assert(view.lockedTop.length >= 5 && view.lockedTop.length <= 6);
  assert.deepEqual(Object.keys(view.groups), ['QINGLONG', 'XUANWU', 'BAIHU', 'ZHUQUE']);
});
