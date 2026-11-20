// 食物鏈 2026-11-16 一氣貫通整合（使用者 00:35 授權）：
// 1) 四大神獸 API（原 fourbeast-1115）併入共同卡庫規則：不必先鎖五隻主力、試算走同一套 v2（和 PREVIEW 數字一致）、鎖定主力仍不可吃、五星封頂不可吃。
// 2) 神獸戰鬥純圖示面板：要強化的卡在上 → 可吃的卡在下 → ✓／✕ → 鎖主力最後；🔒✓ 只在選滿五隻（而且有變動）才出現；✕ 清掉目標、材料、預覽。
// 3) 準備畫面在所有寬度全高（入口、面板、✓ 不被底部列／分頁列蓋住）；開戰後 80/20 不變。
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
class MemoryRepository {
  constructor() { this.rows = new Map(); }
  async read(owner) { const row = this.rows.get(owner); if (!row) throw new Error('共同卡庫暫時無法讀取，未扣材料。'); return structuredClone(row); }
  async create(owner, initial) { if (!this.rows.has(owner)) this.rows.set(owner, structuredClone(initial)); return this.read(owner); }
  async compareAndSwap(owner, revision, next) { C.validateCultivationState(next.state); if (this.rows.get(owner)?.revision !== revision) return false; this.rows.set(owner, structuredClone(next)); return true; }
}
const memory = new MemoryRepository();
repoModule.cultivationRepository = () => memory;
const four = require('../app/api/beast-game/four-beasts/route.ts');
const api = require('../app/api/beast-game/cultivation/route.ts');
let checks = 0; const ok = (v, m) => { assert.ok(v, m); checks++; }, eq = (a, b, m) => { assert.equal(a, b, m); checks++; };
const wallet = () => { const key = crypto.randomBytes(32).toString('hex'); return { key, owner: crypto.createHash('sha256').update(key).digest('hex') }; };
const c = (id, cardId, bonus = '0', fed) => ({ id, cardId, bonus, ...(fed !== undefined ? { fed } : {}) });
const seed = async (cards, protectedIds = [], extra = {}) => { const w = wallet(); await memory.create(w.owner, { revision: '0', state: { cards, protectedIds }, pendingBattle: null, receipts: [], ...extra }); return w; };
const get = async key => { const res = await four.GET(new Request('http://localhost/api/beast-game/four-beasts', { headers: key ? { 'x-beast-wallet': key } : {} })); return { status: res.status, ...(await res.json()) }; };
const post = async (key, body) => { const res = await api.POST(new Request('http://localhost/api/beast-game/cultivation', { method: 'POST', headers: { 'x-beast-wallet': key, 'content-type': 'application/json' }, body: JSON.stringify(body) })); return { status: res.status, ...(await res.json()) }; };

(async () => {
  // 星級常數不動
  assert.deepEqual(Ru.starFeedsPerStar(1000), [62, 63, 125, 250, 500]); assert.deepEqual(Ru.starFeedsPerStar(500), [31, 32, 62, 125, 250]); checks += 2;

  // A. 新玩家（2 張、沒鎖主力、成長卡來源）：四大神獸 API 直接列為可強化，不再有「先鎖五隻」狀態。
  const np = await seed([c('growth:beast_a01', 'beast_a01'), c('growth:beast_y01', 'beast_y01')]);
  const r = await get(np.key);
  eq(r.status, 200); eq(r.ok, true);
  ok(!('mainTeamReady' in r.view), 'no mainTeamReady field');
  ok(r.view.materials.every(m => m.status !== 'NO_MAIN'), 'no NO_MAIN status');
  const m = r.view.materials.find(x => x.copyId === 'growth:beast_y01');
  ok(m, 'growth cards are listed (same set as the battle panel)'); eq(m.status, 'READY'); eq(m.source, 'OTHER'); eq(r.view.enhanceableCount, 1);
  eq(r.view.sources.other, 2); eq(r.view.materials.find(x => x.copyId === 'growth:beast_a01').status, 'NO_TARGET', 'adult waits for its guardian');
  // 試算數字和 PREVIEW（同一套 v2 規則）一致
  const pv = await post(np.key, { type: 'PREVIEW', revision: '0', choices: [{ targetId: 'growth:beast_a01', materialId: 'growth:beast_y01' }] });
  eq(pv.status, 200); eq(m.addedBonus, pv.changes[0].addedBonus, 'four-beasts trial == server PREVIEW');
  eq(JSON.stringify((await memory.read(np.owner)).state.cards.length), '2', 'GET does not write');
  // 真吃一次（不鎖五隻），四大神獸 API 重讀後材料消失
  const fu = await post(np.key, { type: 'FUSE', revision: '0', operationId: 'op-np-1', choices: [{ targetId: 'growth:beast_a01', materialId: 'growth:beast_y01' }] });
  eq(fu.status, 200, fu.error);
  const r2 = await get(np.key); ok(!r2.view.materials.some(x => x.copyId === 'growth:beast_y01'), 'eaten card gone'); eq(r2.view.enhanceableCount, 0);

  // B. 鎖定主力仍不能當材料
  const five = ['beast_g_qinglong', 'beast_g_baihu', 'beast_g_zhuque', 'beast_g_xuanwu', 'beast_a28'].map((id, i) => c('main:' + i, id));
  const lk = await seed([...five, c('duel:b1:0', 'beast_a01'), c('duel:b2:0', 'beast_a02')], ['main:0', 'main:1', 'main:2', 'main:3', 'duel:b1:0']);
  const rl = await get(lk.key);
  eq(rl.view.materials.find(x => x.copyId === 'duel:b1:0').status, 'LOCKED');
  eq(rl.view.materials.find(x => x.copyId === 'duel:b2:0').status, 'READY');
  eq(rl.view.sources.duel, 2);

  // C. 五星封頂（本體 500 張）不能再吃
  const mx = await seed([c('a', 'beast_a01', '0', 500), c('y', 'beast_y01')]);
  eq((await get(mx.key)).view.materials.find(x => x.copyId === 'y').status, 'BLOCKED');
  // D. 戰鬥未結算
  const hd = await seed([c('a', 'beast_a01'), c('y', 'beast_y01')], [], { pendingBattle: 'card:x' });
  eq((await get(hd.key)).view.materials.find(x => x.copyId === 'y').status, 'PENDING');
  // E. 沒有識別碼 → 400（不建卡庫）
  eq((await get(null)).status, 400);

  // F. 前端（2026-11-16 統一）：只有一個強化畫面 components/beast-enhance/EnhancePage；舊面板全部移除；
  //    全站只有它送 FUSE；入口卡共用一張，只有「四大神獸」「點擊直接強化」兩段短字。
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  for (const gone of ['SharedCultivationPanel.tsx', 'OwnedCardCultivation.tsx', 'FourBeastsEnhance.tsx', 'FoodChainFeedback.tsx', 'FoodChainIcons.module.css']) ok(!fs.existsSync(path.join(root, 'components/battlefield', gone)), 'removed ' + gone);
  const route = fs.readFileSync(path.join(root, 'app/beast-game/four-beasts/page.tsx'), 'utf8');
  ok(/import EnhancePage from '@\/components\/beast-enhance\/EnhancePage'/.test(route) && /<EnhancePage \/>/.test(route), 'route renders the unified page');
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
  const fusers = [...walk(path.join(root, 'components')), ...walk(path.join(root, 'app')).filter(f => !f.includes(`${path.sep}api${path.sep}`))].filter(f => /type: ?'FUSE'/.test(fs.readFileSync(f, 'utf8')));
  eq(fusers.map(f => path.relative(root, f)).join(','), path.join('components', 'beast-enhance', 'EnhancePage.tsx'), 'only one client FUSE flow');
  const page = strip(fs.readFileSync(path.join(root, 'components/beast-enhance/EnhancePage.tsx'), 'utf8'));
  const texts = (page.match(/>([^<>{}]*[\u3400-\u9fff][^<>{}]*)</gu) || []).map(x => x.slice(1, -1).trim());
  // 2026-11-20 疊到 v4 主線：加上業主 11-18 確認的簡短文字（兩款攻擊與下一星張數、預覽尚未消耗、保存成功、未收藏原因、加入可用材料／清空選擇、返回原戰局）。
  const allowed = new Set(['四大神獸', '重新讀取', '戰鬥還沒結束：可以先看，結算後才能強化', '返回原戰局', '結束未完成戰局', '回到戰鬥', '神獸戰鬥', '寶石捷連線', '確認主力', '強化', '再強化', '看全部',
    '尚未收藏這隻神獸，可先選下方已持有的卡片。', '連線攻擊', '· 神獸戰鬥', '下一星還差', '張', '加入可用材料', '清空選擇', '比例成長還沒滿一點攻擊，進度已累積']);
  for (const x of texts) ok(allowed.has(x), 'only short action labels on the enhance page: ' + x);
  ok(!/先鎖定五隻主力|規則|說明/.test(page), 'no rule-explaining copy');
  // 2026-11-17 P1-8：可強化 0 張且伺服端逐張回 NO_TARGET → 底部提示（缺的大卡剪影＋⬆＋⚔ 去神獸戰鬥），只照伺服端狀態畫。
  ok(/function NoTargetCue/.test(page) && /status === 'NO_TARGET'/.test(page) && /enhanceableCount === 0/.test(page), 'no-target cue is driven by server per-card status');
  ok(/data-no-target-cue/.test(page) && /data-get-guardian/.test(page) && /href=\{GAME_PATH\.battle\}/.test(page), 'cue has silhouette chain and a go-get-guardian button');
  ok(/<NoTargetCue view=\{view\} \/>/.test(page), 'cue rendered on the overview');
  const entry = fs.readFileSync(path.join(root, 'app/star-beasts/page.tsx'), 'utf8');
  ok(/<FourBeastsEntryCard \/>/.test(entry) && !entry.includes('FOUR_BEAST_ENTRY_ART'), 'star-beasts uses the shared entry card');
  const card = strip(fs.readFileSync(path.join(root, 'components/beast-enhance/FourBeastsEntryCard.tsx'), 'utf8'));
  eq((card.match(/>([^<>{}]*[\p{L}][^<>{}]*)</gu) || []).map(x => x.slice(1, -1).trim()).join('|'), '四大神獸|點擊直接強化', 'entry card copy (owner 23:21)');
  // 2026-11-17 P1-7：入口卡看得到「四大神獸」「點擊直接強化」＋點擊提示圖示。
  ok(/<strong className=\{s\.title\}>四大神獸<\/strong>/.test(card) && /點擊直接強化<EnhanceIcon name="tap"/.test(card), 'entry card shows visible title, CTA and tap affordance');
  ok(/aria-label=\{`四大神獸，點擊直接強化/.test(card), 'entry card accessible name');
  ok(/data-entry-count=\{count\}/.test(card) && /\/api\/beast-game\/four-beasts/.test(card) && !/method: ?'POST'/.test(card), 'entry count comes from the read-only server GET');
  for (const f of ['app/beast-game/battlefield/page.tsx', 'components/battlefield/HardCampaignEntry.tsx']) ok(/<FourBeastsEntryCard from="(battle|orb)" compact \/>/.test(fs.readFileSync(path.join(root, f), 'utf8')), 'game prep screen links to the same page: ' + f);

  // G. 強化頁：順序（大卡 → 材料 → ✓✕）、主力鎖只在可鎖五種時出現且改動後才有確認、✕ 只清掉選擇不存檔。
  const at = s => { const i = page.indexOf(s); assert.ok(i > 0, s); return i; };
  ok(at('className={s.stageCard}') < at('data-pile={p.cardId}') && at('data-pile={p.cardId}') < at('data-cancel aria-label') && at('data-cancel aria-label') < at('data-confirm-fuse') && at('data-confirm-fuse') < at('data-result-step'), 'order: target → material → ✕ ✓ → result');
  ok(/\{lockChanged && <button[^>]*data-save-main/.test(page), '🔒✓ only when five are picked and changed');
  ok(/const lockChanged = !!shared && main\.length === 5 &&/.test(page));
  ok(/\{shared\?\.canProtectFive && <button/.test(page), 'lock entry hidden when five types are impossible');
  const cancel = page.split('\n').find(l => l.includes('data-cancel aria-label'));
  ok(/aria-label="[^"]+"/.test(cancel) && cancel.includes('picksRef.current = {}; setPicks({}); setPreview(null);') && !/FUSE|sharedRequest/.test(cancel), '✕ resets picks and never saves');
  // 前端不判斷誰能吃誰：可吃的堆與上限來自 PREVIEW_TARGET piles；加成來自 PREVIEW／FUSE summary。
  ok(/type: 'PREVIEW_TARGET'[^\n]*piles: true/.test(page) && /type: 'PREVIEW', summaryOnly: true/.test(page) && /type: 'FUSE', summaryOnly: true/.test(page));
  ok(!/cultivationTarget|fuseSnapshot|getCard\(/.test(page), 'no client-side food-chain rule');

  // H. 準備畫面全寬度全高；開戰 80/20 不變
  const css = fs.readFileSync(path.join(root, 'components/battlefield/BattleScreen.module.css'), 'utf8');
  const top = css.split(/@media/)[0] + css.split('\n').filter(l => /^\.split\[data-preparing='true'\]/.test(l)).join('\n');
  ok(/^\.split\[data-preparing='true'\] \{ grid-template-columns: minmax\(0, 1fr\); grid-template-rows: minmax\(0, 1fr\); \}$/m.test(css), 'preparing full height at root');
  ok(/^\.split\[data-preparing='true'\] > \[data-battle-visual\] \{ display: none; \}$/m.test(css));
  ok(/grid-template-rows: minmax\(0, 80fr\) minmax\(0, 20fr\);/.test(css), 'battle split 80/20 kept');
  void top;
  console.log(`PASS food chain unify: ${checks} checks — four-beasts API merged without the five-lock rule (v2 trial == PREVIEW, locked/maxed/pending blocked), one enhance page (only client FUSE), entry card copy, order target→material→✕✓→result, hidden 🔒✓, ✕ restore, preparation full height.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
