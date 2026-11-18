// 食物鏈 2026-11-15 23:32：吃卡不再強制先鎖五隻主力（新玩家卡少也能強化）。
// 經真正的 /api/beast-game/cultivation 路由＋記憶體 CAS 替身（非正式 Supabase）。
// 保留：已鎖主力不可當材料、已湊滿五種的收藏不能因吃卡掉到不足五種（押卡闖關需五種）、整組換主力仍要五隻、版本檢查與收據不變。
const assert = require('node:assert/strict');
require('./helpers/server-only-runtime.cjs');
const path = require('node:path'), fs = require('node:fs'), ts = require('typescript'), crypto = require('node:crypto');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
// Archived v2 endpoint behavior; the unmocked v3 suite tests current production rules.
require('../lib/beast-game/cultivation-rules.ts').activeFoodChainRule = () => 'v2';
delete process.env.BEAST_FOOD_CHAIN_RULE;
const repoModule = require('../lib/beast-game/cultivation-repository.ts');
const C = require('../lib/beast-game/cultivation.ts');
const Ru = require('../lib/beast-game/cultivation-rules.ts');

class MemoryRepository {
  constructor() { this.rows = new Map(); this.writes = 0; }
  async read(owner) { await new Promise(r => setImmediate(r)); const row = this.rows.get(owner); if (!row) throw new Error('共同卡庫暫時無法讀取，未扣材料。'); return structuredClone(row); }
  async create(owner, initial) { if (!this.rows.has(owner)) this.rows.set(owner, structuredClone(initial)); return this.read(owner); }
  async compareAndSwap(owner, revision, next) {
    await new Promise(r => setImmediate(r));
    C.validateCultivationState(next.state);
    if (next.revision !== (BigInt(revision) + 1n).toString()) throw new Error('卡庫版本無效。');
    if (this.rows.get(owner)?.revision !== revision) return false;
    this.rows.set(owner, structuredClone(next)); this.writes++; return true;
  }
}
const memory = new MemoryRepository();
repoModule.cultivationRepository = () => memory;
const api = require('../app/api/beast-game/cultivation/route.ts');
let checks = 0; const ok = (v, m) => { assert.ok(v, m); checks++; }, eq = (a, b, m) => { assert.equal(a, b, m); checks++; };
const wallet = () => { const key = crypto.randomBytes(32).toString('hex'); return { key, owner: crypto.createHash('sha256').update(key).digest('hex') }; };
const post = async (key, body) => { const res = await api.POST(new Request('http://localhost:3187/api/beast-game/cultivation', { method: 'POST', headers: { 'x-beast-wallet': key, 'content-type': 'application/json' }, body: JSON.stringify(body) })); return { status: res.status, ...(await res.json()) }; };
const c = (id, cardId, bonus = '0') => ({ id, cardId, bonus });
const seed = async (cards, protectedIds = [], extra = {}) => { const w = wallet(); await memory.create(w.owner, { revision: '0', state: { cards, protectedIds }, pendingBattle: null, receipts: [], ...extra }); return w; };

(async () => {
  // 0. 星級常數不動（四大神獸 1000、本體 500，一路減半）。
  assert.deepEqual(Ru.starFeedsPerStar(1000), [62, 63, 125, 250, 500]); assert.deepEqual(Ru.starFeedsPerStar(500), [31, 32, 62, 125, 250]);
  eq(Ru.starProgress('GUARDIAN', 0).capFeeds, 1000); eq(Ru.starProgress('ADULT', 0).capFeeds, 500); checks += 2;

  // 1. 全新玩家只有本體＋幼子、沒有鎖主力：選目標→即時預覽→確認→材料消耗→重讀仍消失。
  const fresh = await seed([c('growth:beast_a01', 'beast_a01'), c('growth:beast_y01', 'beast_y01')]);
  const live = await post(fresh.key, { type: 'PREVIEW_TARGET', revision: '0', targetId: 'growth:beast_a01' });
  eq(live.status, 200, live.error); eq(live.options.length, 1); ok(!live.options[0].error, live.options[0].error);
  eq(live.options[0].feedback.addedBonus, '3'); eq(live.options[0].feedback.addedPercent.label, '5'); eq(live.options[0].feedback.starsAfter.toNext, 30);
  const pre = await post(fresh.key, { type: 'PREVIEW', revision: '0', choices: [{ targetId: 'growth:beast_a01', materialId: 'growth:beast_y01' }] });
  eq(pre.status, 200, pre.error); eq(pre.feedback[0].addedBonus, '3'); eq(memory.writes, 0, 'preview never writes');
  const fuse = await post(fresh.key, { type: 'FUSE', revision: '0', operationId: 'np-1', choices: [{ targetId: 'growth:beast_a01', materialId: 'growth:beast_y01' }] });
  eq(fuse.status, 200, fuse.error); eq(fuse.feedback[0].consumed, true); eq(fuse.receipt.rule, 'v2');
  eq(fuse.view.cards.length, 1); eq(fuse.view.cards[0].bonus, '3'); eq(fuse.view.cards[0].stars.fed, 1); eq(fuse.view.cards[0].stars.toNext, 30); eq(fuse.view.reason, null);
  const reread = await memory.read(fresh.owner);
  ok(!reread.state.cards.some(x => x.id === 'growth:beast_y01'), 'eaten card stays gone'); eq(reread.state.protectedIds.length, 0); eq(reread.receipts.length, 1);
  // 同一 operationId 重送：同一張收據、不重扣。
  const dup = await post(fresh.key, { type: 'FUSE', revision: '0', operationId: 'np-1', choices: [{ targetId: 'growth:beast_a01', materialId: 'growth:beast_y01' }] });
  eq(dup.status, 200, dup.error); eq(dup.duplicate, true); eq(memory.writes, 1);
  // 過期版本照舊拒絕。
  eq((await post(fresh.key, { type: 'PREVIEW', revision: '0', choices: [{ targetId: 'growth:beast_a01', materialId: 'growth:beast_y01' }] })).status, 400);
  // 整組換主力仍要五隻不同卡型。
  const team = await post(fresh.key, { type: 'MAIN_TEAM', revision: '1', operationId: 'np-team', ids: ['growth:beast_a01'] });
  eq(team.status, 400); ok(/請親選五隻/.test(team.error));

  // 2. 已鎖定的主力仍不可當材料（伺服端拒絕、不扣、不寫入；即時預覽也不列出）。
  const lockedMain = [c('m:a01', 'beast_a01'), c('m:zq', 'beast_g_zhuque'), c('m:bh', 'beast_g_baihu'), c('m:xw', 'beast_g_xuanwu'), c('m:a28', 'beast_a28')];
  const locked = await seed([...lockedMain, c('ql', 'beast_g_qinglong'), c('a01b', 'beast_a01')], lockedMain.map(x => x.id));
  const before = memory.writes;
  const lp = await post(locked.key, { type: 'PREVIEW', revision: '0', choices: [{ targetId: 'ql', materialId: 'm:a01' }] });
  eq(lp.status, 400); ok(/鎖定主力不能作為材料/.test(lp.error), lp.error);
  const lf = await post(locked.key, { type: 'FUSE', revision: '0', operationId: 'lk-1', choices: [{ targetId: 'ql', materialId: 'm:a01' }] });
  eq(lf.status, 400); ok(/鎖定主力不能作為材料/.test(lf.error)); eq(memory.writes, before, 'nothing written');
  const lt = await post(locked.key, { type: 'PREVIEW_TARGET', revision: '0', targetId: 'ql' });
  assert.deepEqual(lt.options.map(o => o.materialId), ['a01b']); checks++;
  // 未鎖的同款副本照常可吃，鎖定五隻原封不動。
  const lok = await post(locked.key, { type: 'FUSE', revision: '0', operationId: 'lk-2', choices: [{ targetId: 'ql', materialId: 'a01b' }] });
  eq(lok.status, 200, lok.error); assert.deepEqual(lok.view.protectedIds, lockedMain.map(x => x.id)); checks++;

  // 3. 已湊滿五種（可押卡闖關）且未鎖：吃掉唯一的一種仍會被擋（原保護保留）；有重複副本則可吃。
  const fiveTypes = [c('a01', 'beast_a01'), c('y01', 'beast_y01'), c('zq', 'beast_g_zhuque'), c('bh', 'beast_g_baihu'), c('xw', 'beast_g_xuanwu')];
  const five = await seed(fiveTypes);
  const fp = await post(five.key, { type: 'PREVIEW', revision: '0', choices: [{ targetId: 'a01', materialId: 'y01' }] });
  eq(fp.status, 400); ok(/至少須保留五隻/.test(fp.error), fp.error);
  const fiveDup = await seed([...fiveTypes, c('y01b', 'beast_y01')]);
  eq((await post(fiveDup.key, { type: 'FUSE', revision: '0', operationId: 'fd-1', choices: [{ targetId: 'a01', materialId: 'y01b' }] })).status, 200);

  // 4. 本來就不足五種（四種）：可吃（目標一定保留，不會吃光）。
  const four = await seed([c('a01', 'beast_a01'), c('y01', 'beast_y01'), c('zq', 'beast_g_zhuque'), c('bh', 'beast_g_baihu')]);
  const ff = await post(four.key, { type: 'FUSE', revision: '0', operationId: 'f4-1', choices: [{ targetId: 'a01', materialId: 'y01' }] });
  eq(ff.status, 200, ff.error); eq(ff.view.cards.length, 3); ok(ff.view.cards.some(x => x.id === 'a01'), 'target survives');

  // 5. 戰鬥保留中仍不能吃。
  const held = await seed([c('a01', 'beast_a01'), c('y01', 'beast_y01')], [], { pendingBattle: 'card:x' });
  eq((await post(held.key, { type: 'PREVIEW', revision: '0', choices: [{ targetId: 'a01', materialId: 'y01' }] })).status, 400);

  // 6. 純函式：未鎖也可吃、已鎖主力不能當材料、輸入不被改動。
  const st = { cards: [c('a', 'beast_a01'), c('y', 'beast_y01')], protectedIds: [] }, snap = JSON.stringify(st);
  eq(C.fuseCultivation(st, [{ targetId: 'a', materialId: 'y' }], { rule: 'v2' }).state.cards.length, 1); eq(JSON.stringify(st), snap);

  // 7. 前端：確認鈕黏底（sticky）、停用條件不看主力是否鎖滿。
  const panel = fs.readFileSync(path.join(__dirname, '../components/battlefield/SharedCultivationPanel.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../components/battlefield/FoodChainIcons.module.css'), 'utf8');
  ok(panel.includes('data-sticky-confirm') && /\.stickyConfirm \{position:sticky;bottom:/.test(css));
  const confirm = panel.split('\n').find(l => l.includes('data-confirm-shared-fusion aria-label'));
  ok(confirm && !/protectedIds|main\.length/.test(confirm), 'confirm button does not require a locked five');
  // 23:52 強化畫面零文字：無材料不顯示確認鈕、改空材料槽＋🃏＋取卡入口；封頂目標不可點；卡面未載入只顯示 ⏳。
  const iconPart = panel.slice(panel.indexOf('function IconPanel('));
  ok(/\{foods\.length>0&&<button ref=\{confirmRef\}/.test(iconPart) && /\{targetCard&&<div className=\{foods\.length>0\?`\$\{icon\.dock\}/.test(iconPart), 'no confirm without material (2026-11-16: ✓ lives in the target dock beside ✕)');
  ok(iconPart.includes('data-get-cards') && iconPart.includes('href="/growth-center#beast-collection"') && /\.emptySlot \{[^}]*animation:breathe/.test(css));
  ok(iconPart.includes('data-maxed={card.stars?.toNext===null?') && iconPart.includes('disabled={busy} aria-pressed={target===card.id}'), 'maxed target inspectable; backend still blocks feeding');
  ok(!/卡面載入中|卡面暫時無法取得/.test(iconPart), 'no loading words in icon panel');
  console.log(`PASS food chain new player: ${checks} checks — eat without locking five, locked main never eaten, five-type campaign protection kept, MAIN_TEAM still five, revision/receipt/replay unchanged, sticky confirm.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
