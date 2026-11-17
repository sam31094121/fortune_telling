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

  // F. 前端：四大神獸頁直接用同一個純圖示面板，零文字；舊的自製 FUSE 流程已移除。
  const page = fs.readFileSync(path.join(root, 'components/battlefield/FourBeastsEnhance.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok(/<SharedCultivationPanel iconOnly focus="GUARDIAN"/.test(page), 'four-beasts page reuses the icon panel');
  ok(!/type: 'FUSE'|先鎖定五隻主力|重新讀取<|>強化<|<h1/.test(page), 'no duplicate FUSE flow or visible copy');
  const jsxText = page.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').match(/>([^<>{}]*[\p{L}][^<>{}]*)</gu) || [];
  eq(jsxText.length, 0, 'four-beasts page has no visible text nodes: ' + jsxText.join('|'));
  const entry = fs.readFileSync(path.join(root, 'app/star-beasts/page.tsx'), 'utf8');
  const entryBlock = entry.slice(entry.indexOf('data-four-beasts-entry'), entry.indexOf('</Link>', entry.indexOf('data-four-beasts-entry')));
  // 使用者 23:21 語音：入口卡改成看得到「四大神獸」「點擊直接強化」＋點擊提示（取代 11-16 零文字入口）。
  ok(/>四大神獸</.test(entryBlock), 'entry card shows visible title 四大神獸');
  ok(/>點擊直接強化</.test(entryBlock), 'entry card shows visible CTA 點擊直接強化');
  ok(/<EnhanceIcon name="tap"/.test(entryBlock), 'entry card has a tap affordance icon');
  ok(/aria-label="四大神獸・點擊直接強化"/.test(entryBlock));

  // G. 神獸戰鬥面板：順序、隱藏鎖主力、✕ 還原
  const panel = fs.readFileSync(path.join(root, 'components/battlefield/SharedCultivationPanel.tsx'), 'utf8');
  const icon = panel.slice(panel.indexOf('function IconPanel('));
  const at = s => { const i = icon.indexOf(s); assert.ok(i > 0, s); return i; };
  ok(at('data-target-stage') < at('data-shared-material=') && at('data-shared-material=') < at('data-confirm-shared-fusion') && at('data-confirm-shared-fusion') < at('data-cancel-shared-fusion') && at('data-cancel-shared-fusion') < at('data-main-copy='), 'order: target → material → ✓ ✕ → lock');
  ok(/\{lockChanged&&<button[^>]*data-save-main/.test(icon), '🔒✓ only when five are picked and changed');
  ok(/const lockChanged=!!view&&main\.length===5&&/.test(icon));
  ok(/\{view\.canProtectFive&&!targetCard&&<>/.test(icon), 'lock grid hidden when five types are impossible');
  ok(/data-cancel-shared-fusion aria-label="[^"]+" disabled=\{busy\} onClick=\{p\.reset\}/.test(icon), '✕ has aria-label and resets');
  const reset = panel.match(/reset:\(\)=>\{([^}]*)\}/)[1];
  for (const s of ["setTarget('')", "setMaterial('')", 'setPreview(null)', 'setFeedback(null)', 'operation.current=null']) ok(reset.includes(s), 'reset ' + s);
  ok(!/save\(/.test(reset), '✕ never saves');
  ok(/data-sticky-confirm/.test(icon) && /className=\{foods\.length>0\?`\$\{icon\.dock\} \$\{icon\.stickyConfirm\}`:icon\.dock\}/.test(icon), '✓／✕ dock is sticky when ✓ exists; empty state dock is not sticky (does not cover 🃏＋)');

  // H. 準備畫面全寬度全高；開戰 80/20 不變
  const css = fs.readFileSync(path.join(root, 'components/battlefield/BattleScreen.module.css'), 'utf8');
  const top = css.split(/@media/)[0] + css.split('\n').filter(l => /^\.split\[data-preparing='true'\]/.test(l)).join('\n');
  ok(/^\.split\[data-preparing='true'\] \{ grid-template-columns: minmax\(0, 1fr\); grid-template-rows: minmax\(0, 1fr\); \}$/m.test(css), 'preparing full height at root');
  ok(/^\.split\[data-preparing='true'\] > \[data-battle-visual\] \{ display: none; \}$/m.test(css));
  ok(/grid-template-rows: minmax\(0, 80fr\) minmax\(0, 20fr\);/.test(css), 'battle split 80/20 kept');
  void top;
  console.log(`PASS food chain unify: ${checks} checks — four-beasts API merged without the five-lock rule (v2 trial == PREVIEW, locked/maxed/pending blocked), icon panel order target→material→✓✕→lock, hidden 🔒✓, ✕ restore, preparation full height.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
