// PLAN-v2 合併強化（神獸戰鬥 × 寶石捷連線）：每個修正一個自動測試。只用新正式卡 cards/beasts；平衡數字皆為【待平衡暫定值】。
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ROOT = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, resolveJsonModule: true, esModuleInterop: true } }).outputText, filename);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) { return resolve.call(this, id.startsWith('@/') ? path.resolve(ROOT, id.slice(2)) : id, ...args); };
const ON = () => { process.env.NEXT_PUBLIC_M3_FEED_CHAIN = '1'; };
const OFF = () => { delete process.env.NEXT_PUBLIC_M3_FEED_CHAIN; };
OFF();
const C = require('../lib/beast-game/match3/hard-campaign.ts');
const F = require('../lib/beast-game/match3/feed-chain.ts');
const T = require('../lib/beast-game/match3/merge-tier.ts');
const B = require('../lib/beast-game/match3/merge-balance.ts');
const S = require('../lib/beast-game/match3/hard-campaign-store.ts');
const P = require('../lib/beast-game/match3/progression.ts');
const E = require('../lib/beast-game/match3/enemies.ts');
const CA = require('../lib/beast-game/match3/card-attack.ts');
const R = require('../lib/beast-game/registry.ts');
const Face = require('../lib/beast-game/card-face-stats.ts').CARD_FACE_STATS;

const guardians = C.campaignGuardianIds();
const HERO = guardians.find(id => R.getCard(id).name === '青龍');
const youngs = R.playableCards().filter(c => c.form === 'YOUNG').map(c => c.id).sort();
const adults = C.campaignAdultIds();
const byName = n => R.playableCards().find(c => c.name === n).id;
const CTX = { enabled: true, inBattle: false };
function campaign(wins, team = [HERO, ...youngs.slice(24, 28)]) {
  let p = C.chooseCampaignHero(C.newCampaign(), HERO);
  p = { ...p, teamIds: [...team] };
  for (let i = 0; i < wins; i++) p = C.campaignWin(p, 'm' + i, i).profile;
  return p;
}
const rewardRef = (p, cardId, nth = 0) => 'reward:' + p.rewards.filter(r => r.cardId === cardId)[nth].matchId;
function memStore() { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), data: m }; }
function installStorage() {
  const local = memStore(), session = memStore();
  global.window = { localStorage: local, sessionStorage: session };
  let queue = Promise.resolve();
  Object.defineProperty(global, 'navigator', { configurable: true, value: { locks: { request: (_k, fn) => { const run = queue.then(fn); queue = run.catch(() => {}); return run; } } } });
  return local;
}
const KEY = 'match3-hard-campaign-self-v1';

test('只用新正式卡：60 張（28 幼子＋28 成獸＋4 四象），全部有卡面數值', () => {
  assert.equal(youngs.length, 28); assert.equal(adults.length, 28); assert.equal(guardians.length, 4);
  for (const id of [...youngs, ...adults, ...guardians]) assert(Face[id], id);
});

test('A5 跨層級天花板：開關開＝成獸 ≤ 同方位四象卡面；四象仍 ×1.5；開關關＝舊的 50%', () => {
  ON();
  for (const id of adults) {
    const g = T.guardianOfSymbol(T.fourSymbolOf(id));
    assert(Face[id].attack + T.tierAttackCap(id) <= Math.max(Face[g].attack, Face[id].attack), id);
  }
  assert.equal(T.tierAttackCap(byName('虛日鼠')), 0, '虛日鼠卡面 82 已高於玄武 77：不能再往上強化');
  assert.equal(T.tierAttackCap(byName('觜火猴')), 0);
  assert.equal(T.tierAttackCap(byName('室火豬')), 77 - 68);
  for (const g of guardians) assert.equal(T.tierAttackCap(g), Math.floor(Face[g].attack * .5));
  const maxAdult = Math.max(...adults.map(id => Face[id].attack + T.tierAttackCap(id)));
  const minGuardianFull = Math.min(...guardians.map(g => Face[g].attack + T.tierAttackCap(g)));
  assert(maxAdult < minGuardianFull, `成獸封頂最高 ${maxAdult} 必須低於四象封頂最低 ${minGuardianFull}`);
  OFF();
  for (const id of adults) assert.equal(T.tierAttackCap(id), Math.floor(Face[id].attack * .5));
});

test('A4 傳承扣回：被吃掉的本體用掉它的幼子強化；同種卡的新副本不會再帶舊強化、不能重複傳承', () => {
  ON();
  const a01 = adults[0];
  let p = campaign(30); // a01 兩張（第 1、29 勝）
  p = C.enhanceCampaignProfile(p, 'y1', youngs[10], a01).profile; // +4
  const bonus = C.enhancementBonus(p, a01);
  assert(bonus > 0);
  // 讓 a01 不在前五名（加一些成獸當出戰隊伍不影響，前五名依有效攻擊）
  const pv = F.previewFeed(p, rewardRef(p, a01, 0), HERO, CTX);
  if (!pv.allowed) assert.fail('預覽被拒：' + pv.reasons.join());
  assert.equal(pv.inheritedAttack, Math.floor(bonus * .5));
  p = F.applyFeed(p, 'eat1', rewardRef(p, a01, 0), HERO, CTX).profile;
  assert.equal(p.chainReceipts[0].spentYoungBonus, bonus);
  const state = F.readFeedChainState(p, true);
  assert(state.ok, state.error);
  assert.equal(F.netYoungBonus(p, a01, state), 0, '剩下那張不再帶著被吃掉那張的強化');
  const again = F.previewFeed(p, rewardRef(p, a01, 1), HERO, CTX);
  assert.equal(again.inheritedAttack, 0, '第二次吃同種卡不能再傳承一次');
  // 出戰顯示也跟著扣
  const stat = F.feedCardStats(p, state, F.feedPool(p, state)).find(s => s.cardId === a01);
  assert.equal(stat.effectiveAttack, Face[a01].attack);
  OFF();
});

test('A4 向下相容：P0 格式的鏈收據（沒有 spentYoungBonus）照樣讀得回來', () => {
  ON();
  let p = campaign(30);
  p = C.enhanceCampaignProfile(p, 'y1', youngs[10], adults[0]).profile;
  p = F.applyFeed(p, 'eat1', rewardRef(p, adults[0], 0), HERO, CTX).profile;
  const legacy = JSON.parse(JSON.stringify(p)); delete legacy.chainReceipts[0].spentYoungBonus;
  const parsed = C.parseCampaign(JSON.stringify(legacy));
  assert(F.readFeedChainState(parsed, true).ok);
  OFF();
  assert.doesNotThrow(() => C.parseCampaign(JSON.stringify(legacy)), '開關關閉時也照樣讀檔');
});

test('A3 待餵區只收寶珠闖關結算的卡：匯入卡（押卡、碎片）不能當材料，一鍵封頂也不會拿', () => {
  ON();
  const p = campaign(12);
  const imports = [{ key: 'collection:duel:x:0', sourceEntryId: 'duel:x:0', cardId: adults[20], source: 'DUEL_WIN', status: 'AVAILABLE' }];
  const pv = F.previewFeed(p, 'import:collection:duel:x:0', HERO, { ...CTX, imports });
  assert.equal(pv.allowed, false); assert(pv.reasons.includes('IMPORT_MATERIAL_PENDING'));
  const plan = F.planFeedToCap(p, HERO, { enabled: true, imports });
  assert(plan.steps.every(s => !s.materialRef.startsWith('import:')));
  OFF();
});

test('B9 共鳴格：重複副本放進自己的共鳴格；最多 3 格；共鳴算在同一個上限內，不另外乘', () => {
  ON();
  let p = campaign(85); // 每種成獸 3–4 張
  const id = adults[1];
  const cap = T.tierAttackCap(id), per = T.resonanceSlotBonus(id);
  let slots = 0;
  for (let n = 1; n < p.rewards.filter(r => r.cardId === id).length && slots < 5; n++) {
    const pv = F.previewFeed(p, rewardRef(p, id, n), id, CTX);
    if (!pv.allowed) { assert(pv.reasons.includes('RESONANCE_FULL') || pv.reasons.includes('ATTACK_CAP'), pv.reasons.join()); break; }
    p = F.applyFeed(p, 'res' + n, rewardRef(p, id, n), id, CTX).profile; slots++;
  }
  assert(slots >= 1 && slots <= B.MERGE_BALANCE.resonanceSlots);
  const state = F.readFeedChainState(p, true); assert(state.ok, state.error);
  const stat = F.feedCardStats(p, state, F.feedPool(p, state)).find(s => s.cardId === id);
  assert.equal(stat.effectiveAttack, Face[id].attack + Math.min(cap, slots * per));
  assert(stat.effectiveAttack <= Face[id].attack + cap);
  assert(C.campaignAvailableIds(p).includes(id), '至少留一張本體');
  // 竄改：第 4 格 → 停用餵食鏈，但整份存檔照樣讀
  const extra = p.rewards.filter(r => r.cardId === id && !p.consumedRewardMatchIds.includes(r.matchId));
  if (slots === 3 && extra.length > 1) {
    const bad = { ...p, resonanceReceipts: [...p.resonanceReceipts, { operationId: 'x', matchId: extra[1].matchId, cardId: id, attackBonus: per }], consumedRewardMatchIds: [...p.consumedRewardMatchIds, extra[1].matchId] };
    assert.equal(F.readFeedChainState(bad, true).ok, false);
  }
  OFF();
});

test('B1 鏈加成接進戰鬥：出戰攻擊＝有效攻擊、開局能量帶進來（單卡 ≤20、全隊 ≤60）；開關關閉＝舊 campaignAttack', () => {
  ON();
  let p = campaign(40);
  let eaten = 0;
  for (const r of p.rewards) {
    if (eaten >= 3) break;
    const pv = F.previewFeed(p, 'reward:' + r.matchId, HERO, CTX);
    if (pv.allowed && pv.kind === 'ADULT_TO_GUARDIAN') { p = F.applyFeed(p, 'op' + eaten, 'reward:' + r.matchId, HERO, CTX).profile; eaten++; }
  }
  assert.equal(eaten, 3, '本體餵四大神獸要真的吃得進去');
  const state = F.readFeedChainState(p, true);
  const expected = F.feedCardStats(p, state, F.feedPool(p, state)).find(s => s.cardId === HERO);
  const stats = F.campaignBattleStats(p, p.teamIds);
  const hero = stats.find(s => s.cardId === HERO);
  assert.equal(hero.attack, expected.effectiveAttack);
  assert.equal(hero.startEnergy, Math.min(20, 3 * 5));
  assert(hero.attack > C.campaignAttack(p, HERO), `鏈加成要進戰鬥：${hero.attack} > ${C.campaignAttack(p, HERO)}`);
  assert(hero.startEnergy > 0 && hero.startEnergy <= 20);
  assert(stats.reduce((n, s) => n + s.startEnergy, 0) <= 60);
  OFF();
  const off = F.campaignBattleStats(p, p.teamIds);
  off.forEach(s => { assert.equal(s.attack, C.campaignAttack(p, s.cardId)); assert.equal(s.startEnergy, 0); });
});

test('B3 一鍵吃到封頂：100 勝存檔，主角一次吃到上限；預覽張數＝實際張數；剩餘材料正確', async () => {
  ON();
  const local = installStorage();
  let p = campaign(100);
  local.setItem(KEY, JSON.stringify(p));
  const plan = F.planFeedToCap(p, HERO, { enabled: true });
  assert.equal(plan.after, plan.capAttack, '吃完要剛好封頂或盡量接近');
  assert.equal(plan.steps.length, plan.usedYoung + plan.usedAdult + plan.usedResonance);
  assert.equal(plan.materialsBefore - plan.materialsAfter, plan.steps.length);
  // 預覽與存檔不一致就拒絕
  const wrong = await S.feedCampaignToCap('self', 'opX', HERO, plan.steps.slice(1).map(s => s.materialRef), { enabled: true });
  assert.equal(wrong.ok, false);
  const ok = await S.feedCampaignToCap('self', 'opA', HERO, plan.steps.map(s => s.materialRef), { enabled: true });
  assert(ok.ok, ok.error);
  const saved = C.parseCampaign(local.getItem(KEY));
  assert.equal(F.campaignBattleStats(saved, [HERO])[0].attack, plan.after);
  const dup = await S.feedCampaignToCap('self', 'opA', HERO, plan.steps.map(s => s.materialRef), { enabled: true });
  assert(dup.ok && dup.duplicate, '同一操作重送不重複扣卡');
  assert.equal(local.getItem(KEY), JSON.stringify(saved));
  OFF();
});

test('B3 開關關閉時一鍵封頂只用幼子，收據格式與舊版一張一張餵完全相同', async () => {
  OFF();
  const local = installStorage();
  const p = campaign(5);
  local.setItem(KEY, JSON.stringify(p));
  const plan = F.planFeedToCap(p, HERO, { enabled: false });
  assert(plan.steps.length > 0 && plan.steps.every(s => s.kind === 'YOUNG_TO_TARGET'));
  const r = await S.feedCampaignToCap('self', 'opB', HERO, plan.steps.map(s => s.materialRef), { enabled: false });
  assert(r.ok, r.error);
  const saved = JSON.parse(local.getItem(KEY));
  assert.equal(saved.chainReceipts, undefined); assert.equal(saved.resonanceReceipts, undefined);
  let manual = p; plan.steps.forEach((st, i) => { manual = C.enhanceCampaignProfile(manual, 'opB:' + i, st.materialCardId, HERO).profile; });
  assert.deepEqual(saved, manual);
});

test('B5 封頂預覽不再矛盾：已滿時「強化後」＝上限、本次 +0、標示 full', () => {
  OFF();
  let p = campaign(5);
  const plan = F.planFeedToCap(p, HERO, { enabled: false });
  p = plan.steps.reduce((q, st, i) => C.enhanceCampaignProfile(q, 'o' + i, st.materialCardId, HERO).profile, p);
  const left = C.enhancementOptions(p).youngIds[0];
  const pv = C.previewCampaignEnhancement(p, left, HERO);
  const cap = Face[HERO].attack + Math.floor(Face[HERO].attack * .5);
  assert.equal(pv.allowed, false);
  assert(pv.afterAttack <= cap, `預覽 ${pv.afterAttack} 不能超過上限 ${cap}`);
  assert.equal(pv.attackBonus, 0);
  assert(pv.full || pv.overCap);
  assert.match(pv.reason, /已滿|超過上限/);
});

test('B6 解鎖進度：再贏 N 場（0／4 → 4／4）', () => {
  for (const [w, left] of [[0, 4], [1, 3], [3, 1], [4, 0], [9, 0]]) assert.equal(C.enhancementUnlockProgress({ ...campaign(0), wins: w }).winsRemaining, left);
});

test('被吃掉的獎勵副本，開關開時不再算持有（不能吃了還帶上場）', () => {
  ON();
  let p = campaign(12, [HERO, ...youngs.slice(0, 4)]);
  const id = adults[5];
  p = F.applyFeed(p, 'e', rewardRef(p, id, 0), HERO, CTX).profile;
  assert(!C.campaignAvailableIds(p).includes(id));
  OFF();
  assert(C.campaignAvailableIds(p).includes(id), '開關關閉時與舊版相同');
});

test('A7 連結攻擊：未強化五張連結打不穿第 8 關（遠低於整關總血）；只用卡片主屬性；開關關閉＝舊公式', () => {
  ON();
  const pool = R.playableCards().map(c => ({ id: c.id, form: c.form, element: c.element, stats: { hp: Face[c.id].hp, attack: Face[c.id].attack } }));
  const budget = P.progressionStrengthBudget(pool, 7);
  // 最強的未強化五張：主角四象之最＋各屬性最強成獸
  const best = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'].map(el => Math.max(...R.playableCards().filter(c => c.element === el && c.form !== 'YOUNG').map(c => Face[c.id].attack)));
  const cards = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'].map((el, i) => ({ attack: best[i], element: el }));
  const worst = Math.max(...['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'].map(def => B.campaignLinkDamage(cards, def)));
  const old = E.linkDamage(best);
  assert(old > budget.hp, `舊公式 ${old} 確實超過第 8 關總血 ${budget.hp}`);
  assert(worst < budget.hp * 0.5, `新公式 ${worst} 要低於第 8 關總血一半 ${budget.hp / 2}`);
  // 伺服端 card-attack 用同一條
  const team = cards.map((c, i) => ({ id: adults[i], element: c.element, hp: 100, maxHp: 100, attack: c.attack, energy: 100 }));
  const foes = [0, 1, 2, 3, 4].map(i => ({ id: adults[10 + i], element: 'AIR', hp: 99999, maxHp: 99999, attack: 1, cd: 1 }));
  const r = CA.resolveLinkAttack({ team, foes, targetIndex: 0, stage: 8, eventId: 'e1', linkIds: team.map(t => t.id) });
  assert.equal(r.baseDamage, B.campaignLinkDamage(team, 'AIR'));
  OFF();
  const r2 = CA.resolveLinkAttack({ team, foes, targetIndex: 0, stage: 8, eventId: 'e2', linkIds: team.map(t => t.id) });
  assert.equal(r2.baseDamage, E.linkDamage(team.map(t => t.attack)));
});

test('B7 前 5 關加壓：開關開時勝場 0–4 反擊攻擊與血量提高；第 6 關起與第 8 關總預算不變', () => {
  const pool = R.playableCards().map(c => ({ id: c.id, form: c.form, element: c.element, stats: { hp: Face[c.id].hp, attack: Face[c.id].attack } }));
  const y = pool.find(c => c.form === 'YOUNG'), a = pool.find(c => c.form === 'ADULT');
  OFF(); const off0 = P.progressionEnemyStats(y, 0), off3 = P.progressionEnemyStats(a, 3), off5 = P.progressionEnemyStats(a, 5), b8off = P.progressionStrengthBudget(pool, 7);
  ON(); const on0 = P.progressionEnemyStats(y, 0), on3 = P.progressionEnemyStats(a, 3), on5 = P.progressionEnemyStats(a, 5), b8on = P.progressionStrengthBudget(pool, 7);
  assert(on0.attack > off0.attack && on0.hp > off0.hp);
  assert(on3.attack > off3.attack && on3.hp > off3.hp);
  assert.deepEqual(on5, off5); assert.deepEqual(b8on, b8off);
  OFF();
});

test('A1 企劃刪除的「幼子強化滿 50% 才進化」：程式裡幼子仍不能當強化目標，也沒有進化入口', () => {
  ON();
  const p = campaign(10);
  const pv = F.previewFeed(p, 'young:' + youngs[3], youngs[4], CTX);
  assert.equal(pv.allowed, false); assert(pv.reasons.includes('NOT_UPWARD') || pv.reasons.includes('TARGET_UNAVAILABLE'));
  for (const f of ['feed-chain.ts', 'hard-campaign.ts', 'merge-balance.ts', 'merge-tier.ts']) assert(!/evolve|進化條件/.test(fs.readFileSync(path.join(ROOT, 'lib/beast-game/match3', f), 'utf8')), f);
  OFF();
});
