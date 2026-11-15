// 食物鏈（卡吃卡）規則 v2：純函式與交易層。儲存是 CAS 記憶體替身，不是正式資料庫測試。
const assert = require('node:assert/strict');
require('./helpers/server-only-runtime.cjs');
const path = require('node:path'), fs = require('node:fs'), ts = require('typescript');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
delete process.env.BEAST_FOOD_CHAIN_RULE;
const C = require('../lib/beast-game/cultivation.ts');
const T = require('../lib/beast-game/cultivation-transaction.ts');
const V = require('../lib/beast-game/cultivation-view.ts');
const Ru = require('../lib/beast-game/cultivation-rules.ts');
const R = require('../lib/beast-game/registry.ts');
const G = require('../lib/beast-guardians.ts');

const copy = (id, cardId, bonus = '0', extra = {}) => ({ id, cardId, bonus, ...extra });
const mainIds = ['beast_g_zhuque', 'beast_g_baihu', 'beast_g_xuanwu', 'beast_a28', 'beast_a27'];
const main = mainIds.map((cardId, i) => copy('main:' + i, cardId));
const base = (...extra) => ({ cards: [...main, copy('qinglong', 'beast_g_qinglong'), copy('adult', 'beast_a01'), copy('young', 'beast_y01'), ...extra], protectedIds: main.map(c => c.id) });
const snap = (state, receipts = []) => ({ revision: String(receipts.length), state, pendingBattle: null, receipts });
const atk = id => R.getCard(id).stats.attack;
class Repo {
  constructor(value) { this.value = value; this.writes = 0; }
  async read() { return structuredClone(this.value); }
  async compareAndSwap(owner, revision, value) { if (this.value.revision !== revision) return false; this.value = structuredClone(value); this.writes++; return true; }
}
let checks = 0; const ok = (...a) => { assert.ok(...a); checks++; }; const eq = (...a) => { assert.equal(...a); checks++; };

(async () => {
  // 1. 參數：全部標待平衡暫定值，預設 v2；緊急開關退回 v1。
  const rulesSource = fs.readFileSync(path.join(__dirname, '../lib/beast-game/cultivation-rules.ts'), 'utf8');
  ok(rulesSource.includes('待平衡暫定值'), 'parameters are marked provisional');
  eq(Ru.activeFoodChainRule(), 'v2');
  process.env.BEAST_FOOD_CHAIN_RULE = 'v1'; eq(Ru.activeFoodChainRule(), 'v1'); delete process.env.BEAST_FOOD_CHAIN_RULE;
  eq(Ru.receiptRule(undefined), 'v1'); eq(Ru.receiptRule('v2'), 'v2'); eq(Ru.receiptRule('v9'), 'v1');
  eq(Ru.FOOD_CHAIN_V2.attackCap.num * 2, Ru.FOOD_CHAIN_V2.attackCap.den, '2B: 50% cap');
  eq(Ru.FOOD_CHAIN_V2.inherit.num * 2, Ru.FOOD_CHAIN_V2.inherit.den, '3B: 50% inheritance');

  // 2. 五星門檻：第五星佔封頂一半；A 前四平分、B 依序減半；累計值無條件進位。
  assert.deepEqual(Ru.starThresholds(1000, 'B'), [63, 125, 250, 500, 1000]);
  assert.deepEqual(Ru.starThresholds(1000, 'A'), [125, 250, 375, 500, 1000]);
  assert.deepEqual(Ru.starThresholds(100, 'B'), [7, 13, 25, 50, 100]);
  assert.deepEqual(Ru.starThresholds(100, 'A'), [13, 25, 38, 50, 100]);
  for (const mode of ['A', 'B']) for (const cap of [1, 2, 5, 16, 100, 999, 1000]) { const t = Ru.starThresholds(cap, mode); eq(t.length, 5); eq(t[4], cap); ok(t.every((v, i) => !i || v >= t[i - 1])); }
  // 22:39 定案 B：五顆星各自張數總和＝封頂（取整保證）；突破線欄位只預留、不啟用。
  for (const cap of [1, 3, 7, 16, 100, 101, 999, 1000, 1001]) { const t = Ru.starThresholds(cap, 'B'); const per = t.map((v, i) => v - (i ? t[i - 1] : 0)); eq(per.reduce((x, y) => x + y, 0), cap); eq(per[4], cap - t[3]); }
  assert.deepEqual(Ru.starThresholds(1000, 'B').map((v, i, a) => v - (i ? a[i - 1] : 0)), [63, 62, 125, 250, 500]); checks++;
  eq(Ru.FOOD_CHAIN_V2.stars.mode, 'B'); eq(Ru.FOOD_CHAIN_V2.stars.capFeeds.GUARDIAN, 1000); eq(Ru.FOOD_CHAIN_V2.stars.capFeeds.ADULT, 100);
  eq(Ru.starProgress('ADULT', 3).ascension, null, 'ascension reserved, not enabled');
  const sp = Ru.starProgress('GUARDIAN', 124); eq(sp.stars, 1); eq(sp.toNext, 1); eq(sp.nextAt, 125); eq(sp.maxed, false);
  eq(Ru.starProgress('GUARDIAN', 1000).stars, 5); eq(Ru.starProgress('GUARDIAN', 1000).toNext, null); eq(Ru.starProgress('GUARDIAN', 1000).maxed, true);
  eq(Ru.starProgress('ADULT', 0).stars, 0); eq(Ru.starProgress('ADULT', 0).toNext, 7);
  checks += 4;

  // 3. 7A 嚴格逐層：56 組合法配對不變；幼子不能越級餵四大神獸；四大神獸不能被吃。
  let pairs = 0;
  for (const m of R.playableCards()) for (const t of R.playableCards()) {
    const expected = m.form === 'YOUNG' && t.form === 'ADULT' && m.mansionId === t.mansionId || m.form === 'ADULT' && t.id === G.guardianOf(m.id).cardId;
    eq(C.cultivationTarget(m.id) === t.id, expected); if (expected) pairs++;
  }
  eq(pairs, 56);
  assert.throws(() => C.fuseCultivation(base(), [{ targetId: 'qinglong', materialId: 'young' }], { rule: 'v2' }), /幼子只能合體對應本體/); checks++;

  // 4. v1 逐位相同：未給 rule＝v1，與原公式、原欄位完全一樣（沒有 fed、沒有新欄位）。
  const v1 = C.fuseCultivation(base(), [{ targetId: 'adult', materialId: 'young' }, { targetId: 'qinglong', materialId: 'adult' }]);
  assert.deepEqual(v1.changes, [
    { targetId: 'adult', materialId: 'young', targetCardId: 'beast_a01', materialCardId: 'beast_y01', beforeBonus: '0', addedBonus: '3', afterBonus: '3' },
    { targetId: 'qinglong', materialId: 'adult', targetCardId: 'beast_g_qinglong', materialCardId: 'beast_a01', beforeBonus: '0', addedBonus: '5', afterBonus: '5' },
  ]); checks++;
  ok(v1.state.cards.every(c => !('fed' in c)), 'v1 never writes the new fed field');
  for (const m of R.playableCards().filter(c => c.form !== 'GUARDIAN')) eq(Ru.feedGain('v1', { materialForm: m.form, materialBaseAttack: m.stats.attack, materialBonus: 999n, targetBaseAttack: 1, targetBonus: 999n }).added, BigInt(Math.max(1, Math.floor(m.stats.attack / 10))), 'v1: no inheritance, no cap');

  // 5. v2：1A 原公式、3B 本體傳承 50%（取整）、2B 卡面 50% 上限、10A 百分比用卡面原始攻擊。
  const young = C.fuseCultivation(base(), [{ targetId: 'adult', materialId: 'young' }], { rule: 'v2' });
  eq(young.changes[0].addedBonus, '3'); eq(young.changes[0].inheritedBonus, '0'); eq(young.changes[0].capBonus, String(Math.floor(atk('beast_a01') / 2))); eq(young.changes[0].rule, 'v2');
  eq(young.state.cards.find(c => c.id === 'adult').fed, 1);
  const trained = base(); trained.cards.find(c => c.id === 'adult').bonus = '11';
  const up = C.fuseCultivation(trained, [{ targetId: 'qinglong', materialId: 'adult' }], { rule: 'v2' });
  eq(up.changes[0].inheritedBonus, '5', 'floor(11 × 50%) = 5'); eq(up.changes[0].addedBonus, '10', '5 (56/10) + 5 inherited'); eq(up.changes[0].capped, false);
  const v1Same = C.fuseCultivation(trained, [{ targetId: 'qinglong', materialId: 'adult' }]);
  eq(v1Same.changes[0].addedBonus, '5', 'v1 still drops the trained bonus');
  // 上限：青龍 74 → 上限 37。已有 35，本次原應 +5 → 只加 2。
  const near = base(); near.cards.find(c => c.id === 'qinglong').bonus = '35';
  const clamp = C.fuseCultivation(near, [{ targetId: 'qinglong', materialId: 'adult' }], { rule: 'v2' });
  eq(clamp.changes[0].addedBonus, '2'); eq(clamp.changes[0].rawBonus, '5'); eq(clamp.changes[0].capped, true); eq(clamp.changes[0].afterBonus, '37');
  // 已超過上限（舊規則累積）：保留現值、不扣回，本次 +0（只累積星級；feedAtAttackCap=true）。
  const over = base(); over.cards.find(c => c.id === 'qinglong').bonus = '1000';
  const kept = C.fuseCultivation(over, [{ targetId: 'qinglong', materialId: 'adult' }], { rule: 'v2' });
  eq(kept.changes[0].addedBonus, '0'); eq(kept.changes[0].afterBonus, '1000', 'existing bonus is never clawed back'); eq(kept.state.cards.find(c => c.id === 'qinglong').fed, 1);
  assert.throws(() => C.fuseCultivation(over, [{ targetId: 'qinglong', materialId: 'adult' }], { rule: 'v2', params: { ...Ru.FOOD_CHAIN_V2, feedAtAttackCap: false } }), /已達上限/); checks++;
  // 4A 無同屬性加成：同元素與不同元素的材料，加成公式相同。
  for (const t of R.playableCards().filter(c => c.form === 'ADULT')) { const y = R.playableCards().find(c => c.form === 'YOUNG' && c.mansionId === t.mansionId); eq(Ru.feedGain('v2', { materialForm: 'YOUNG', materialBaseAttack: y.stats.attack, materialBonus: 0n, targetBaseAttack: t.stats.attack, targetBonus: 0n }).raw, BigInt(Math.max(1, Math.floor(y.stats.attack / 10)))); }

  // 6. 五星封頂：封頂後不能再吃，未扣材料；舊副本沒有 fed 時由收據補算。
  const capped = base(copy('young2', 'beast_y01')); capped.cards.find(c => c.id === 'adult').fed = 100;
  const before = JSON.stringify(capped);
  assert.throws(() => C.fuseCultivation(capped, [{ targetId: 'adult', materialId: 'young' }], { rule: 'v2' }), /五星封頂/); checks++;
  eq(JSON.stringify(capped), before, 'rejected feed changes nothing');
  const legacyReceipts = Array.from({ length: 99 }, (_, i) => ({ operationId: 'old' + i, command: '{}', revision: String(i + 1), changes: [{ targetId: 'adult', materialId: 'gone' + i, targetCardId: 'beast_a01', materialCardId: 'beast_y01', beforeBonus: String(i * 3), addedBonus: '3', afterBonus: String(i * 3 + 3) }] }));
  const legacy = snap(base(copy('young2', 'beast_y01')), legacyReceipts);
  eq(T.fedCounter(legacy)('adult'), 99);
  const last = T.fuseSnapshot(legacy, [{ targetId: 'adult', materialId: 'young' }]);
  eq(last.changes[0].fedAfter, 100);
  assert.throws(() => T.fuseSnapshot({ ...legacy, state: last.state }, [{ targetId: 'adult', materialId: 'young2' }]), /五星封頂/); checks++;

  // 7. 舊收據永遠照 v1 重播（即使現在預設 v2）；v2 收據照 v2 重播；重送同一操作回原收據不重算。
  const oldBefore = snap(trained);
  const oldReceipt = { operationId: 'legacy', command: JSON.stringify({ type: 'FUSE', choices: [{ targetId: 'qinglong', materialId: 'adult' }] }), revision: '1', changes: v1Same.changes };
  const replayOld = T.replayCultivationReceipt(oldBefore, oldReceipt);
  eq(replayOld.rule, 'v1'); assert.deepEqual(replayOld.changes, oldReceipt.changes); checks++;
  const repo = new Repo(snap(trained));
  const fresh = await T.transactCultivation(repo, 'o', 'op-v2', '0', { type: 'FUSE', choices: [{ targetId: 'qinglong', materialId: 'adult' }] });
  eq(fresh.receipt.rule, 'v2'); eq(fresh.receipt.changes[0].addedBonus, '10');
  assert.deepEqual(T.replayCultivationReceipt(snap(trained), fresh.receipt).changes, fresh.receipt.changes); checks++;
  process.env.BEAST_FOOD_CHAIN_RULE = 'v1';
  const again = await T.transactCultivation(repo, 'o', 'op-v2', '0', { type: 'FUSE', choices: [{ targetId: 'qinglong', materialId: 'adult' }] });
  eq(again.duplicate, true); assert.deepEqual(again.receipt, fresh.receipt, 'switching the rule never re-computes an existing receipt'); checks++;
  const killSwitch = new Repo(snap(trained));
  eq((await T.transactCultivation(killSwitch, 'o', 'op-v1', '0', { type: 'FUSE', choices: [{ targetId: 'qinglong', materialId: 'adult' }] })).receipt.rule, undefined, 'v1 receipts keep the original shape');
  delete process.env.BEAST_FOOD_CHAIN_RULE;
  eq(repo.writes, 1);

  // 8. 回饋欄位（伺服端算好、畫面照印）：例 角木蛟・幼子 → 角木蛟：攻擊 +3（約 +5%）、寶石 56→59、神獸戰鬥 46→49。
  const fb = V.describeCultivationChange(young.changes[0]);
  eq(fb.materialName, R.getCard('beast_y01').name); eq(fb.targetName, '角木蛟'); eq(fb.layer, 'YOUNG_TO_ADULT');
  eq(fb.addedPercent.label, '5'); eq(fb.addedPercent.bps, '535');
  eq(fb.beforeOrbAttack, String(atk('beast_a01'))); eq(fb.afterOrbAttack, String(atk('beast_a01') + 3));
  eq(fb.afterBattleAttack, String(V.battleBaseAttack('beast_a01') + 3n)); eq(BigInt(fb.afterBattleAttack) - BigInt(fb.beforeBattleAttack), 3n);
  eq(fb.starsBefore.stars, 0); eq(fb.starsAfter.fed, 1); eq(fb.starsAfter.toNext, 6); eq(fb.consumed, true);
  const legacyFb = V.describeCultivationChange(v1.changes[1]);
  eq(legacyFb.rule, 'v1'); eq(legacyFb.layer, 'ADULT_TO_GUARDIAN'); eq(legacyFb.starsAfter, null, 'old receipts get display fields without rewriting data');
  eq(V.percentOf(0n, 74).label, '0'); eq(V.percentOf(1n, 1000).label, '<1');

  // 9. view：星級、上限、可餵給誰；舊副本補算；四大神獸／本體才有星級。
  const view = V.cultivationView(snap({ ...over }, legacyReceipts));
  const q = view.cards.find(c => c.id === 'qinglong'), a = view.cards.find(c => c.id === 'adult'), y = view.cards.find(c => c.id === 'young');
  eq(q.atBonusCap, true); eq(q.bonusCap, '37'); eq(q.stars.stars, 0); eq(a.stars.fed, 99); eq(a.stars.stars, 4); eq(a.stars.toNext, 1);
  eq(y.stars, undefined); eq(y.materialTargetName, '角木蛟'); eq(a.materialTargetName, '青龍'); eq(view.foodChainRule, 'v2');

  // 10. 5A 四象合體只顯示「已合體 +N」：判定與標籤仍是純特效，傷害不變（56063ead 守門測試另外照跑）。
  const trace = fs.readFileSync(path.join(__dirname, '../components/battlefield/GuardianFusionTrace.tsx'), 'utf8');
  ok(trace.includes('data-fusion-bonus') && trace.includes('bonusOf'), 'seal shows the frozen bonus');
  ok(fs.readFileSync(path.join(__dirname, '../lib/beast-game/match3/guardian-fusion.ts'), 'utf8').includes('（僅特效，不加傷害）'));
  // 11. 只用新正式卡：測試用到的卡都在 cards/beasts 新卡登錄內。
  ok([...mainIds, 'beast_g_qinglong', 'beast_a01', 'beast_y01'].every(id => R.getCard(id) && /^beast_(g_|a\d\d|y\d\d)/.test(id)));
  console.log(`PASS food chain v2: ${checks} checks — provisional params, five-star thresholds A/B, strict layers (56 pairs), v1 bit-identical, 50% inheritance, 50% cap clamp, over-cap kept, no same-element bonus, star cap rejection without consuming, legacy fed from receipts, old receipts replay as v1, rule switch never recomputes, feedback fields, view stars/caps.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
