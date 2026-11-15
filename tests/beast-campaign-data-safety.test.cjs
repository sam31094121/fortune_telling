// 2026-11-15 業主：修好三種掉資料問題（舊進度帶上去、同步不讓本機變少、覆蓋前先備份、照實文案＋按鈕、修復存檔不得先刪）。
const assert = require('node:assert/strict');
require('./helpers/server-only-runtime.cjs');
const path = require('node:path'), fs = require('node:fs'), ts = require('typescript');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const S = require('../lib/beast-game/match3/campaign-safety.ts');
const L = require('../lib/beast-game/cultivation-legacy.ts');
const O = require('../lib/beast-game/match3/hard-campaign.ts');
const src = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const adults = O.campaignAdultIds();
const camp = (n, extra = {}) => { const rec = Array.from({ length: n }, (_, i) => ({ matchId: 'm' + i, cardId: adults[i % 28], win: i + 1 })); return { version: 1, wins: n, heroId: 'beast_g_qinglong', heroChoiceUsed: false, teamIds: [], rewards: rec, receipts: rec, ...extra }; };
const snap = (extra = {}) => ({ revision: '3', state: { cards: [], protectedIds: [] }, pendingBattle: null, receipts: [], creditedIds: [], orbLedger: { wins: 0, rewards: [], receipts: [] }, ...extra });

// ── A：舊進度帶上去 ──
assert.equal(JSON.parse(S.orbProfileForImport(null, '5')).wins, 5, 'only legacy key → IMPORT carries 5 wins (was null → 0)');
assert.equal(S.orbProfileForImport(null, null), null);
assert.equal(JSON.parse(S.orbProfileForImport(JSON.stringify(O.newCampaign(0)), '5')).wins, 5, 'save overwritten to 0 without receipts → legacy key wins');
assert.equal(JSON.parse(S.orbProfileForImport(JSON.stringify(camp(3)), '9')).wins, 3, 'save with receipts is authoritative (never invent wins past receipts)');
assert.equal(JSON.parse(S.orbProfileForImport(null, '99999')).wins, S.LEGACY_CLAIM_MAX_WINS, 'capped');
assert.equal(S.localLegacyWins(O.newCampaign(0), '7'), 7); assert.equal(S.localLegacyWins(camp(2), null), 0);
const claimed = L.applyLegacyClaim(snap(), 5);
assert.equal(claimed.orbLedger.wins, 5); assert.deepEqual(claimed.orbLedger.rewards, [], 'claim mints no reward cards');
assert.ok(claimed.creditedIds.includes(L.LEGACY_CLAIM_ID) && claimed.creditedIds.includes(L.LEGACY_CLAIM_ID + ':5'), 'claim is logged in ledger');
assert.throws(() => L.applyLegacyClaim({ ...claimed, orbLedger: { wins: 0, rewards: [], receipts: [] } }, 6), /認領過/, 'once per ledger');
assert.throws(() => L.applyLegacyClaim(snap({ orbLedger: { wins: 1, rewards: [camp(1).rewards[0]], receipts: [camp(1).receipts[0]] } }), 5), /已有寶珠闖關紀錄/);
assert.throws(() => L.applyLegacyClaim(snap(), L.LEGACY_MAX_WINS + 1)); assert.throws(() => L.applyLegacyClaim(snap(), 0)); assert.throws(() => L.applyLegacyClaim(snap(), 2.5));
assert.throws(() => L.applyLegacyClaim(snap({ pendingBattle: 'orb:x' }), 5), /進行中/);
assert.match(src('lib/beast-cultivation-client.ts'), /orbProfile:orbProfileForImport\(/, 'IMPORT uses legacy-aware profile');
assert.match(src('app/api/beast-game/cultivation/route.ts'), /ORB_LEGACY_CLAIM[\s\S]*applyLegacyClaim[\s\S]*console\.info\('\[beast-legacy-claim\]'/);
assert.match(src('lib/beast-game/match3/hard-campaign-store.ts'), /type:'ORB_LEGACY_CLAIM'/);

// ── B：同步不讓本機變少 ──
const shards = { v: 1, shards: 5, streak: 1, bestStreak: 2, totalEarned: 7, exchanged: { ADULT: 0, GUARDIAN: 0 }, receipts: { a: { key: 'a', outcome: 'win', gained: 3 }, b: { key: 'b', outcome: 'win', gained: 4 } } };
const filled = L.backfillLegacyCollection(snap(), { shards, starterPack: 'sp-1' });
assert.equal(filled.shards.shards, 5); assert.equal(filled.starterPack, 'sp-1'); assert.ok(filled.creditedIds.includes(L.LEGACY_BACKFILL_ID));
assert.equal(L.backfillLegacyCollection(filled, { shards: { ...shards, shards: 7 } }), filled, 'backfill only once');
assert.equal(L.backfillLegacyCollection(snap(), { shards: { ...shards, shards: 999 } }).shards, undefined, 'shards above totalEarned rejected');
assert.equal(L.backfillLegacyCollection(snap(), { shards: { ...shards, totalEarned: 70, shards: 50 } }).shards, undefined, 'totalEarned must equal receipts');
const keep = { v: 1, shards: 1, streak: 0, bestStreak: 0, totalEarned: 1, exchanged: { ADULT: 0, GUARDIAN: 0 }, receipts: { z: { key: 'z', gained: 1 } } };
assert.equal(L.backfillLegacyCollection(snap({ shards: keep }), { shards }).shards, keep, 'server value is never replaced');
const book = { version: 1, counts: { SPACE: 1, AIR: 0, WATER: 2, FIRE: 0, EARTH: 0 }, receipts: ['r1', 'r2', 'r3'] };
const empty = { version: 1, counts: { SPACE: 0, AIR: 0, WATER: 0, FIRE: 0, EARTH: 0 }, receipts: [] };
assert.deepEqual(L.adoptLegacyTreasures(snap(), book, empty).orbTreasures, book);
assert.deepEqual(L.adoptLegacyTreasures(snap(), { ...book, counts: { ...book.counts, FIRE: 50 } }, empty).orbTreasures, empty, 'more treasures than receipts rejected');
const has = snap({ orbTreasures: empty }); assert.equal(L.adoptLegacyTreasures(has, book, empty), has, 'server treasures are authoritative once stored');
const client = src('lib/beast-cultivation-client.ts');
assert.match(client, /shards:view\.shards\?\?old\.shards/); assert.match(client, /starterPack:view\.starterPack\?\?old\.starterPack/);
assert.match(src('lib/beast-game/cultivation-orb.ts'), /orbTreasures===undefined\)snapshot=await updateCultivationAccount\(owner,current=>adoptLegacyTreasures/);
assert.match(src('lib/beast-game/cultivation-games.ts'), /backfillLegacyCollection\(existing,value\)/);

// ── C：覆蓋前先備份（有上限） ──
let list = [];
for (let i = 0; i < 6; i++) list = S.appendBackup(list, { at: 't' + i, kind: 'orb', raw: 'r' + i });
list = S.appendBackup(list, { at: 'x', kind: 'collection', raw: 'c' });
assert.deepEqual(list.filter(b => b.kind === 'orb').map(b => b.raw), ['r3', 'r4', 'r5'], 'bounded to 3 per kind, oldest dropped');
assert.equal(S.appendBackup(list, { at: 'y', kind: 'orb', raw: 'r5' }).length, list.length, 'identical consecutive backup skipped');
assert.equal(S.campaignWouldChange(JSON.stringify(camp(5)), O.parseCampaign(JSON.stringify(camp(5)))), false);
assert.equal(S.campaignWouldChange(JSON.stringify(camp(5)), O.newCampaign(0)), true);
const store = src('lib/beast-game/match3/hard-campaign-store.ts');
assert.match(store, /function writeFromServer[\s\S]*?backupLocal\('orb-campaign-'\+owner,old\)|function writeFromServer[\s\S]*?backupLocal\('orb-campaign-' \+ owner, old\)/);
assert.doesNotMatch(store, /return write\('self',reply\.profile\);\},failed\);\nexport interface CampaignEnhancementResult/, 'refresh no longer writes server data without backup');
assert.match(client, /backupLocal\('collection',oldRaw\)/);
assert.match(src('lib/beast-local-backup.ts'), /throw new Error\('本機備份沒有存成功/, 'failed backup blocks overwrite');

// ── D：對不起來時照實說＋兩個選擇 ──
assert.equal(L.normalizeHeroChoice({ wins: 5, heroChoiceUsed: true, heroId: 'beast_g_qinglong' }).heroChoiceUsed, false);
assert.equal(L.normalizeHeroChoice({ wins: 9, heroChoiceUsed: true, heroId: 'beast_g_qinglong' }).heroChoiceUsed, true);
const conflict = new L.CampaignConflict(5); assert.equal(conflict.code, 'ORB_MISMATCH'); assert.match(conflict.message, /已過 5 關/);
assert.equal(S.campaignAhead(camp(9), O.parseCampaign(JSON.stringify(camp(5)))), true); assert.equal(S.campaignAhead(camp(5), O.parseCampaign(JSON.stringify(camp(5)))), false);
const base = S.serverBaselineProfile(JSON.stringify(camp(9, { heroChoiceUsed: true })));
assert.equal(base.heroId, 'beast_g_qinglong'); assert.equal(base.wins, 0); assert.equal(base.heroChoiceUsed, false);
assert.match(src('app/api/beast-game/cultivation/route.ts'), /status: conflict\.code \? 409 : 400/);
const entry = src('components/battlefield/HardCampaignEntry.tsx');
assert.match(entry, /data-testid="mismatch-use-server"/); assert.match(entry, /data-testid="mismatch-keep-local"/); assert.match(entry, /data-testid="go-card-settle"/);
for (const f of ['components/battlefield/HardCampaignEntry.tsx', 'lib/beast-game/match3/hard-campaign.ts', 'lib/beast-game/match3/hard-campaign-store.ts']) {
  assert.doesNotMatch(src(f), /主角選擇紀錄不一致/, f); assert.doesNotMatch(src(f), /請先接續神獸戰鬥/, f);
}
assert.match(entry, /無法從中途接續；已用同一隊從這一關開頭重新開始/, 'refresh restart copy is honest (restart, not resume)');

// ── E：修復存檔不得先刪、不得觸發 A ──
const flags = S.salvageCampaign(JSON.stringify(camp(5, { heroChoiceUsed: true })));
assert.equal(flags.level, 'flags'); assert.equal(flags.profile.wins, 5); assert.equal(flags.profile.receipts.length, 5);
const badEnh = S.salvageCampaign(JSON.stringify(camp(4, { enhancements: { beast_a01: 99 }, enhancementReceipts: [], consumedYoungIds: [] })));
assert.equal(badEnh.level, 'no-enhancements'); assert.equal(badEnh.profile.wins, 4);
assert.equal(S.salvageCampaign('{not json', 6).profile.wins, 6, 'garbage → legacy wins, not 0');
const brokenReceipts = S.salvageCampaign(JSON.stringify({ ...camp(6), receipts: [{ matchId: 'm0', cardId: 'nope', win: 1 }] }));
assert.ok(brokenReceipts.profile.wins <= 1, 'broken receipts never inflate wins');
assert.equal(S.salvageCampaign(JSON.stringify(camp(3))).level, 'intact');
const repair = store.slice(store.indexOf('export const repairUnreadableCampaign'), store.indexOf('/** A file transfer'));
assert.doesNotMatch(repair, /removeItem/, 'repair never deletes the save'); assert.match(repair, /backupLocal\('orb-campaign-self', raw\)/); assert.match(repair, /salvageCampaign\(raw, legacy\)/);
console.log('PASS campaign data safety: A legacy carry+one-time claim, B no-shrink backfill, C bounded backups, D honest mismatch, E salvage-not-delete');
