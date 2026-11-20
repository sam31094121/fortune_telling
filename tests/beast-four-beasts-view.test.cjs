// 四大神獸強化頁：伺服器算好的計數／來源／狀態，前端只畫。這裡核對不新增規則、試算不寫入。
// 2026-11-16 整合：來源只做計數（首戰禮等＝OTHER 也是材料，和神獸戰鬥面板一致）；不必先鎖五隻主力；試算走 fuseSnapshot（v2，和 PREVIEW 一致）。
const assert = require('node:assert/strict');
require('./helpers/server-only-runtime.cjs');
const path = require('node:path');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const { createHash } = require('node:crypto');
// Archived v2 mapping/source fixture; production v3 is covered separately.
require('../lib/beast-game/cultivation-rules.ts').activeFoodChainRule=()=> 'v2';
const V = require('../lib/beast-game/four-beasts-view.ts');
const T = require('../lib/beast-game/cultivation-transaction.ts');
const copy = (id, cardId, bonus = '0') => ({ id, cardId, bonus });
const main = ['beast_g_qinglong', 'beast_g_baihu', 'beast_g_zhuque', 'beast_g_xuanwu', 'beast_a28'].map((id, i) => copy('main:' + i, id));
const orbLegacy = createHash('sha256').update('orb-reward').update('\0').update('m1').digest('hex');
const snap = (extra = {}) => ({ revision: '3', pendingBattle: null, receipts: [], orbLedger: { wins: 1, rewards: [{ matchId: 'm1', cardId: 'beast_a02', win: 1 }], receipts: [] },
  state: { protectedIds: main.map(c => c.id), cards: [...main,
    copy('duel:b1:0', 'beast_a01'),          // 本體 → 青龍（神獸戰鬥）
    copy('orb-win:orb:x', 'beast_y01'),      // 幼子 → 角木蛟本體（寶珠）
    copy(orbLegacy, 'beast_a02'),            // 舊進度帶上的寶珠獎卡
    copy('starter:r:3', 'beast_y03'),        // 首戰禮：不列為材料
    copy('duel:b2:0', 'beast_y05'),          // 幼子，但沒有對應本體
  ] }, ...extra });
const before = JSON.stringify(snap());
const s = snap(); const v = V.fourBeastsView(s);
assert.equal(JSON.stringify(s), before, '試算不寫入卡庫');
assert.deepEqual(v.sources, { duel: 2, orb: 2, other: 2 }, '神獸戰鬥／寶珠連線／其他來源（首戰禮、鎖定的本體主力）分開計數');
assert.equal(v.materials.find(m => m.copyId.startsWith('starter:')).source, 'OTHER', '首戰禮也列為材料（來源 OTHER）');
const by = id => v.materials.find(m => m.copyId === id);
assert.equal(by('duel:b1:0').targetCardId, 'beast_g_qinglong'); assert.equal(by('duel:b1:0').tier, 'ADULT_TO_GUARDIAN'); assert.equal(by('duel:b1:0').status, 'READY');
assert.equal(by('orb-win:orb:x').targetCardId, 'beast_a01'); assert.equal(by('orb-win:orb:x').tier, 'YOUNG_TO_ADULT'); assert.equal(by('orb-win:orb:x').status, 'READY');
assert.equal(by(orbLegacy).source, 'ORB');
assert.equal(by('duel:b2:0').status, 'NO_TARGET');
// 加成與既有 FUSE 試算完全一致
const real = T.fuseSnapshot(s, [{ targetId: by('duel:b1:0').targetCopyId, materialId: 'duel:b1:0' }]).changes[0];
assert.equal(by('duel:b1:0').addedBonus, real.addedBonus);
assert.equal(v.enhanceableCount, v.materials.filter(m => m.status === 'READY').length);
assert.equal(v.guardians.length, 4); assert.ok(v.guardians.every(g => g.mansions.length === 7), '四大神獸各統七宿');
const qing = v.guardians.find(g => g.cardId === 'beast_g_qinglong');
assert.ok(qing.ready >= 1); assert.equal(qing.mansions.find(m => m.cardId === 'beast_a01').ready, 1);
// 狀態：主力未鎖也可強化（不再有 NO_MAIN）、戰鬥未結算、主力本身
const unlocked = V.fourBeastsView(snap({ state: { ...snap().state, protectedIds: [] } }));
assert.ok(!('mainTeamReady' in unlocked) && unlocked.materials.every(m => m.status === 'READY' || m.status === 'NO_TARGET'), '未鎖五隻主力也能強化');
assert.equal(unlocked.materials.find(m => m.copyId === 'duel:b1:0').status, 'READY');
assert.equal(V.fourBeastsView(snap({ pendingBattle: 'orb:z' })).enhanceableCount, 0);
const locked = snap(); locked.state.protectedIds = ['main:0', 'main:1', 'main:2', 'main:3', 'duel:b1:0'];
assert.equal(V.fourBeastsView(locked).materials.find(m => m.copyId === 'duel:b1:0').status, 'LOCKED');
// 2026-11-16 統一強化頁：每個節點帶伺服端選好的大卡 copyId（加成最高那張）與星級；固定層級（離線也畫）跟伺服端一致、零數字。
const qNode = v.guardians.find(g => g.cardId === 'beast_g_qinglong');
assert.equal(qNode.copyId, 'main:0', '大卡 copyId 由伺服端給');
assert.ok(qNode.stars && typeof qNode.stars.stars === 'number' && 'toNext' in qNode.stars, '星級由伺服端給');
assert.equal(typeof qNode.bonusPercent, 'string');
const a01 = qNode.mansions.find(m => m.cardId === 'beast_a04');
assert.equal(a01.copyId, null, '沒有這張卡就沒有 copyId'); assert.equal(a01.owned, 0);
const best = V.fourBeastsView(snap({ state: { protectedIds: [], cards: [copy('lo', 'beast_a01', '1'), copy('hi', 'beast_a01', '9'), copy('y', 'beast_y01')] } }));
assert.equal(best.guardians.find(g => g.cardId === 'beast_g_qinglong').mansions.find(m => m.cardId === 'beast_a01').copyId, 'hi', '預設大卡＝加成最高那張');
const S = require('../lib/beast-game/four-beasts-static.ts');
const src = fs.readFileSync(path.join(__dirname, '../lib/beast-game/four-beasts-static.ts'), 'utf8');
assert.ok(!/server-only|cultivation-transaction|cultivation-repository/.test(src), '固定層級可在前端用（不含伺服端程式）');
const offline = S.fourBeastsTree();
assert.equal(offline.length, 4); assert.equal(offline.flatMap(g => g.mansions).length, 28);
const flat = tree => tree.flatMap(g => [g, ...g.mansions.flatMap(m => [m, m.young])]);
assert.deepEqual(flat(offline).map(n => [n.cardId, n.thumb]), flat(v.guardians).map(n => [n.cardId, n.thumb]), '離線層級與卡圖和伺服端一致');
assert.ok(flat(offline).every(n => n.owned === 0 && n.ready === 0 && n.copyId === null), '離線不顯示任何假數字');
assert.ok(flat(offline).every(n => /^\/beast-game\//.test(n.thumb)), '每個節點都有卡圖');
// 讀取流程：同步失敗也要讀 GET；讀不到給照實短句；需要客戶動手的訊息原樣顯示。
const L = require('../lib/beast-game/four-beasts-load.ts');
(async () => {
  let got = 0;
  const r1 = await L.loadFourBeasts(async () => { throw new Error('共同卡庫服務尚未就緒，未扣材料。'); }, async () => { got++; return { ok: 1 }; });
  assert.equal(got, 1, 'IMPORT 失敗仍讀 GET'); assert.deepEqual(r1, { synced: null, view: { ok: 1 }, error: null });
  const r2 = await L.loadFourBeasts(async () => { throw new Error('共同卡庫服務尚未就緒，未扣材料。'); }, async () => { throw new Error('共同卡庫服務尚未就緒，未扣材料。'); });
  assert.equal(r2.error, L.FOUR_BEASTS_READ_ERROR, '讀取畫面不說「未扣材料」'); assert.equal(r2.view, null);
  const r3 = await L.loadFourBeasts(async () => ({ s: 1 }), async () => { throw new Error('找不到這支手機的卡庫識別碼，請用備份碼還原。'); });
  assert.ok(r3.error.startsWith('找不到這支手機的卡庫識別碼'), '需要還原時原樣顯示'); assert.deepEqual(r3.synced, { s: 1 });
  const r4 = await L.loadFourBeasts(async () => { throw new Error('另一分頁正在戰鬥或保存，請先完成。'); }, async () => { throw new Error('x'); });
  assert.ok(r4.error.startsWith('另一分頁正在戰鬥或保存'));
  assert.equal(L.fourBeastsReadMessage(new Error('Failed to fetch')), L.FOUR_BEASTS_READ_ERROR);
  console.log('beast-four-beasts-view: PASS', JSON.stringify({ count: v.enhanceableCount, sources: v.sources, materials: v.materials.map(m => [m.copyId.slice(0, 12), m.status]) }));
})().catch(e => { console.error(e); process.exitCode = 1; });

// Pending battle navigation is read-only and keeps the original fusion lock.
const {cultivationView}=require('../lib/beast-game/cultivation-view.ts');
for(const [pendingBattle,mode,expected] of [[null,null,null],['card:qa',null,'/beast-game/battlefield'],['orb:qa','hard45','/beast-game/match3-hard'],['orb:qa','hard45b','/beast-game/match3-hard2'],['unknown:qa',null,null]]){
 const source=snap({pendingBattle,...(mode?{orbRun:{input:{mode}}}:{})}),before=JSON.stringify(source),result=cultivationView(source);
 assert.equal(result.pendingBattleHref,expected);assert.equal(result.pendingBattle,pendingBattle);assert.equal(JSON.stringify(source),before);if(pendingBattle)assert(result.reason);
}
console.log('PASS pending battle links: card and both orb modes, no battle, unknown type, immutable snapshot and fusion lock retained');
