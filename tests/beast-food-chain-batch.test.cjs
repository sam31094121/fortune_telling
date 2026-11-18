// 食物鏈 2026-11-16 批次吃卡（使用者定案）：長按／連點一口氣加入大量材料，最後一個 ✓ 一次結算、✕ 一次全清。
// 驗：1000 張單一請求（summaryOnly 回應縮小）、伺服端上限（還能吃幾張到五星封頂、五種卡型保守留一張）、
// 超封頂整批拒絕不變、50% 上限照吃 +0 並標 🔒、並發／重送不重扣、預覽不寫入、✕ 全清（前端原始碼檢查）、零文字。
// 經真正的 API 路由＋記憶體 CAS 替身（非正式 Supabase）。
const assert = require('node:assert/strict');
require('./helpers/server-only-runtime.cjs');
const path = require('node:path'), fs = require('node:fs'), ts = require('typescript'), crypto = require('node:crypto');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
delete process.env.BEAST_FOOD_CHAIN_RULE;
const root = path.join(__dirname, '..');
const repoModule = require('../lib/beast-game/cultivation-repository.ts');
const C = require('../lib/beast-game/cultivation.ts');
const Ru = require('../lib/beast-game/cultivation-rules.ts');
// Historical v2 batch/replay regression; production v3 covered separately.
Ru.activeFoodChainRule = () => 'v2';
const Reg = require('../lib/beast-game/registry.ts');
class MemoryRepository {
  constructor() { this.rows = new Map(); this.writes = 0; }
  async read(owner) { const row = this.rows.get(owner); if (!row) throw new Error('共同卡庫暫時無法讀取，未扣材料。'); return structuredClone(row); }
  async create(owner, initial) { if (!this.rows.has(owner)) this.rows.set(owner, structuredClone(initial)); return this.read(owner); }
  async compareAndSwap(owner, revision, next) { C.validateCultivationState(next.state); if (this.rows.get(owner)?.revision !== revision) return false; await new Promise(r => setTimeout(r, 5)); if (this.rows.get(owner)?.revision !== revision) return false; this.rows.set(owner, structuredClone(next)); this.writes++; return true; }
}
const memory = new MemoryRepository();
repoModule.cultivationRepository = () => memory;
const api = require('../app/api/beast-game/cultivation/route.ts');
let checks = 0; const ok = (v, m) => { assert.ok(v, m); checks++; }, eq = (a, b, m) => { assert.equal(a, b, m); checks++; };
const wallet = () => { const key = crypto.randomBytes(32).toString('hex'); return { key, owner: crypto.createHash('sha256').update(key).digest('hex') }; };
const c = (id, cardId, bonus = '0', fed) => ({ id, cardId, bonus, ...(fed !== undefined ? { fed } : {}) });
const seed = async (cards, protectedIds = [], extra = {}) => { const w = wallet(); await memory.create(w.owner, { revision: '0', state: { cards, protectedIds }, pendingBattle: null, receipts: [], ...extra }); return w; };
const post = async (key, body) => { const raw = JSON.stringify(body); const t = performance.now(); const res = await api.POST(new Request('http://localhost/api/beast-game/cultivation', { method: 'POST', headers: { 'x-beast-wallet': key, 'content-type': 'application/json' }, body: raw })); const txt = await res.text(); return { status: res.status, ms: performance.now() - t, bytes: Buffer.byteLength(txt), ...JSON.parse(txt) }; };
const choices = (tid, ids) => ids.map(materialId => ({ targetId: tid, materialId }));
const adult = Reg.playableCards().find(c => c.form === 'ADULT');
const young = Reg.playableCards().find(c => c.form === 'YOUNG' && C.cultivationTarget(c.id) === adult.id);
const guardianId = C.cultivationTarget(adult.id);
const adultsOfG = Reg.playableCards().filter(c => c.form === 'ADULT' && C.cultivationTarget(c.id) === guardianId);
const others = Reg.playableCards().filter(c => c.form === 'YOUNG' && C.cultivationTarget(c.id) !== adult.id && !adultsOfG.some(a => C.cultivationTarget(c.id) === a.id)).slice(0, 5).map((x, i) => c('K' + i, x.id));
const timings = {};
(async () => {
  assert.deepEqual(Ru.starFeedsPerStar(1000), [62, 63, 125, 250, 500]); assert.deepEqual(Ru.starFeedsPerStar(500), [31, 32, 62, 125, 250]); checks += 2;
  // A. 四大神獸＋1005 張同種本體＋5 種不相干卡（卡型 7 種）：上限 = min(封頂 1000, 1005) = 1000；材料疊成一堆。
  const mats = Array.from({ length: 1005 }, (_, i) => c('m' + i, adultsOfG[0].id, i === 3 ? '20' : '0'));
  const A = await seed([c('G', guardianId), ...mats, ...others]);
  const pt = await post(A.key, { type: 'PREVIEW_TARGET', revision: '0', targetId: 'G', piles: true });
  eq(pt.status, 200, pt.error); eq(pt.batch.room, 1000); eq(pt.batch.max, 1000); eq(pt.batch.piles.length, 1); eq(pt.batch.piles[0].ids.length, 1005);
  eq(pt.batch.piles[0].max, 1005, 'one complete pile can be fully eaten when 7 types ≥ 5 + 1');
  eq(pt.batch.piles[0].ids.at(-1), 'm3', 'trained copy (bonus 20) is ordered last');
  eq(pt.options.length, 1, 'options only for pile heads'); ok(pt.bytes < 60000, 'PREVIEW_TARGET piles response small: ' + pt.bytes);
  const legacy = await post(A.key, { type: 'PREVIEW_TARGET', revision: '0', targetId: 'G' });
  eq(legacy.options.length, 200, 'legacy PREVIEW_TARGET shape unchanged'); ok(!('batch' in legacy));
  const ids = pt.batch.piles[0].ids.slice(0, 1000), ch = choices('G', ids);
  const pv = await post(A.key, { type: 'PREVIEW', revision: '0', summaryOnly: true, choices: ch });
  eq(pv.status, 200, pv.error); eq(pv.summary.count, 1000); ok(!('changes' in pv) && !('feedback' in pv), 'summary only');
  ok(pv.bytes < 8000, 'PREVIEW summary < 8 KB: ' + pv.bytes); timings.preview1000Ms = Math.round(pv.ms); timings.preview1000Bytes = pv.bytes;
  eq((await memory.read(A.owner)).revision, '0', 'preview never writes'); eq((await memory.read(A.owner)).state.cards.length, 1011);
  // 總結＝逐張的加總（同一套 v2 規則）
  const full = await post(A.key, { type: 'PREVIEW', revision: '0', choices: ch });
  const sum = full.changes.reduce((a, x) => a + BigInt(x.addedBonus), 0n);
  eq(pv.summary.addedBonus, sum.toString()); eq(pv.summary.afterBonus, full.changes.at(-1).afterBonus); eq(pv.summary.beforeBattleAttack, full.feedback[0].beforeBattleAttack); eq(pv.summary.afterBattleAttack, full.feedback.at(-1).afterBattleAttack);
  eq(pv.summary.zeroCount, full.changes.filter(x => x.addedBonus === '0').length); eq(pv.summary.starsAfter.stars, 5); eq(pv.summary.starsAfter.toNext, null); eq(pv.summary.starsBefore.stars, 0);
  eq(pv.summary.atBonusCap, true, '50% cap reached → 🔒'); eq(pv.summary.capped, true); eq(pv.summary.materials[0].count, 1000);
  ok(full.bytes > 1_000_000, 'old per-card response was > 1 MB: ' + full.bytes); timings.legacyPreviewBytes = full.bytes;
  // 1000 張一次結算；同 operationId 並發 3 次＋重送 1 次只扣一次
  const body = { type: 'FUSE', revision: '0', operationId: 'batch-1000', summaryOnly: true, choices: ch };
  const [f1, f2, f3] = await Promise.all([post(A.key, body), post(A.key, body), post(A.key, body)]);
  const f4 = await post(A.key, body);
  for (const f of [f1, f2, f3, f4]) eq(f.status, 200, f.error);
  eq([f1, f2, f3, f4].filter(f => !f.duplicate).length, 1, 'exactly one real write'); eq(memory.rows.get(A.owner).receipts.length, 1);
  const after = await memory.read(A.owner); eq(after.revision, '1'); eq(after.state.cards.length, 11); eq(after.state.cards.find(x => x.id === 'G').fed, 1000);
  eq(f1.summary.count, 1000); eq(f4.summary.addedBonus, pv.summary.addedBonus, 'replayed summary identical'); eq(f1.receipt.count, 1000); ok(!('changes' in f1));
  ok(f1.bytes < 20000, 'FUSE summary response small: ' + f1.bytes); timings.fuse1000Ms = Math.round(Math.max(f1.ms, f2.ms, f3.ms)); timings.fuse1000Bytes = Math.max(f1.bytes, f2.bytes, f3.bytes);
  eq(after.receipts[0].changes.length, 1000, 'receipt format unchanged: one change per card');
  eq(f1.view.cards.find(x => x.id === 'G').feedRoom, 0, 'view feedRoom 0 after five stars'); ok(!f1.view.cards.some(x => ids.includes(x.id)), 'eaten copies gone');
  // 封頂後：上限 0，再送一張整批拒絕、不扣
  const pt2 = await post(A.key, { type: 'PREVIEW_TARGET', revision: '1', targetId: 'G', piles: true }); eq(pt2.batch.room, 0); eq(pt2.batch.max, 0);
  const over = await post(A.key, { type: 'FUSE', revision: '1', operationId: 'o2', summaryOnly: true, choices: choices('G', ['m3']) });
  eq(over.status, 400); ok(/封頂/.test(over.error)); eq((await memory.read(A.owner)).state.cards.length, 11);
  // 同 operationId 不同內容 → 拒絕
  eq((await post(A.key, { ...body, choices: ch.slice(0, 10) })).status, 400);

  // B. 超過封頂整批拒絕（伺服端行為不變）：本體已吃 499，再送 5 張；上限 room=1
  const B = await seed([c('T', adult.id, '0', 499), ...Array.from({ length: 5 }, (_, i) => c('y' + i, young.id))]);
  const bl = await post(B.key, { type: 'PREVIEW_TARGET', revision: '0', targetId: 'T', piles: true }); eq(bl.batch.room, 1); eq(bl.batch.max, 1);
  const bx = await post(B.key, { type: 'FUSE', revision: '0', operationId: 'b', summaryOnly: true, choices: choices('T', ['y0', 'y1', 'y2', 'y3', 'y4']) });
  eq(bx.status, 400); eq((await memory.read(B.owner)).state.cards.length, 6, 'whole batch rejected, nothing consumed');
  const b1 = await post(B.key, { type: 'FUSE', revision: '0', operationId: 'b1', summaryOnly: true, choices: choices('T', ['y0']) });
  eq(b1.status, 200, b1.error); eq(b1.summary.starsAfter.toNext, null);

  // C. 50% 上限後照吃（+0、累積星級），總結標 🔒
  const per = Math.max(1, Math.floor(young.stats.attack / 10)), cap = Math.floor(adult.stats.attack / 2), need = Math.ceil(cap / per);
  const Cc = await seed([c('T', adult.id), ...Array.from({ length: need + 10 }, (_, i) => c('y' + i, young.id))]);
  const cl = await post(Cc.key, { type: 'PREVIEW_TARGET', revision: '0', targetId: 'T', piles: true });
  const cf = await post(Cc.key, { type: 'FUSE', revision: '0', operationId: 'c', summaryOnly: true, choices: choices('T', cl.batch.piles[0].ids) });
  eq(cf.status, 200, cf.error); eq(cf.summary.count, need + 10); eq(cf.summary.addedBonus, String(cap)); eq(cf.summary.atBonusCap, true); ok(cf.summary.zeroCount >= 10);
  eq((await memory.read(Cc.owner)).state.cards.find(x => x.id === 'T').fed, need + 10);

  // D. 五種卡型保護：剛好 5 種時，吃光一整種會被伺服端拒絕 → 上限保守留一張；伺服端判定不變。
  const D = await seed([c('G', guardianId), ...Array.from({ length: 4 }, (_, i) => c('a' + i, adultsOfG[0].id)), ...others.slice(0, 3)]);
  const dl = await post(D.key, { type: 'PREVIEW_TARGET', revision: '0', targetId: 'G', piles: true });
  eq(dl.batch.piles[0].max, 3, 'keep one copy so the collection stays at five types'); eq(dl.batch.max, 3);
  eq((await post(D.key, { type: 'PREVIEW', revision: '0', summaryOnly: true, choices: choices('G', ['a0', 'a1', 'a2', 'a3']) })).status, 400, 'server still rejects eating the whole type');
  eq((await post(D.key, { type: 'PREVIEW', revision: '0', summaryOnly: true, choices: choices('G', dl.batch.piles[0].ids.slice(0, dl.batch.max)) })).status, 200);
  // 新玩家（不足五種）不受限：唯一一張幼子可吃
  const N = await seed([c('a', 'beast_a01'), c('y', 'beast_y01')]);
  const nl = await post(N.key, { type: 'PREVIEW_TARGET', revision: '0', targetId: 'a', piles: true }); eq(nl.batch.max, 1); eq(nl.batch.room, 500); eq(nl.options[0].feedback.addedBonus, '3');
  const nf = await post(N.key, { type: 'FUSE', revision: '0', operationId: 'n', summaryOnly: true, choices: choices('a', ['y']) });
  eq(nf.status, 200, nf.error); eq(nf.summary.count, 1); eq(nf.summary.addedBonus, '3'); eq(nf.summary.addedPercent.label, '5'); eq(nf.summary.starsAfter.toNext, 30);
  // 鎖定主力不進材料堆
  const five = ['beast_g_qinglong', 'beast_g_baihu', 'beast_g_zhuque', 'beast_g_xuanwu', 'beast_a28'].map((id, i) => c('main:' + i, id));
  const L = await seed([...five, c('t', 'beast_a01'), c('y1', 'beast_y01'), c('y2', 'beast_y01')], ['main:0', 'main:1', 'main:2', 'main:3', 'main:4']);
  const ll = await post(L.key, { type: 'PREVIEW_TARGET', revision: '0', targetId: 't', piles: true }); eq(ll.batch.piles[0].ids.join(), 'y1,y2');
  // 不同目標混在同一批 summaryOnly → 拒絕
  const M = await seed([c('a', 'beast_a01'), c('y', 'beast_y01'), c('a2', 'beast_a02'), c('y2', 'beast_y02')]);
  eq((await post(M.key, { type: 'PREVIEW', revision: '0', summaryOnly: true, choices: [{ targetId: 'a', materialId: 'y' }, { targetId: 'a2', materialId: 'y2' }] })).status, 400);
  // 不同 operationId 並發（兩分頁同時按 ✓）只結算一次
  const P = await seed([c('T', adult.id), ...Array.from({ length: 200 }, (_, i) => c('y' + i, young.id))]);
  const pch = choices('T', Array.from({ length: 200 }, (_, i) => 'y' + i));
  const [p1, p2] = await Promise.all([post(P.key, { type: 'FUSE', revision: '0', operationId: 'pA', summaryOnly: true, choices: pch }), post(P.key, { type: 'FUSE', revision: '0', operationId: 'pB', summaryOnly: true, choices: pch })]);
  eq([p1.status, p2.status].sort().join(), '200,400'); eq((await memory.read(P.owner)).receipts.length, 1);

  // E. 前端：零文字、✕ 一次全清、長按加速＋節流、只送伺服端給的材料 id、⚠ 在 ✓ 旁、等待時 ✓ 顯示 ⏳。
  const panel = fs.readFileSync(path.join(root, 'components/battlefield/SharedCultivationPanel.tsx'), 'utf8');
  const iconPart = panel.slice(panel.indexOf('function IconPanel('));
  const reset = panel.match(/reset:\(\)=>\{([^}]*)\}/)[1];
  ok(reset.includes('setPicks(NO_PICKS)') && reset.includes("setTarget('')") && !/save\(/.test(reset), '✕ clears every pick at once and never saves');
  ok(/piles:true/.test(panel) && /summaryOnly:true/.test(panel), 'requests pile limits and summaries');
  ok(/HOLD_STEPS/.test(panel) && /pointercancel|onPointerCancel/.test(panel), 'hold-to-add with pointer cancel');
  ok(/PREVIEW_DEBOUNCE_MS/.test(panel), 'preview requests throttled');
  ok(/data-batch-hint/.test(iconPart) && /🃏/.test(iconPart) && /⚔/.test(iconPart), 'hint 🃏×N ⚔+N');
  ok(/data-dock-alert/.test(iconPart), '⚠ beside ✓');
  ok(/waiting\?'⏳'/.test(iconPart) || /\?'⏳':'✓'/.test(iconPart), '✓ shows ⏳ while waiting');
  const jsxText = iconPart.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/aria-label=\{[^}]*\}/g, '').replace(/<Sr>[^<]*<\/Sr>/g, '').match(/>([^<>{}=;()]*[\p{Script=Han}][^<>{}=;()]*)</gu) || [];
  assert.deepEqual(jsxText, ['>① 選要強化的神獸<','>② 選要吃掉的材料<','>加入可用材料<','>清空選擇<'], 'approved concise two-step controls');
  console.log(`PASS archived v2 food chain batch: ${checks} checks — 1000 cards in one request (summary ${timings.fuse1000Bytes} B vs legacy ${timings.legacyPreviewBytes} B, preview ${timings.preview1000Ms} ms, fuse ${timings.fuse1000Ms} ms), server room/pile limits, over-cap batch rejected, 50% cap 🔒, five-type keep-one, concurrent/resend single deduction, ✕ clears all, approved concise controls.`);
  if (process.env.BATCH_TIMINGS) fs.writeFileSync(process.env.BATCH_TIMINGS, JSON.stringify(timings, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
