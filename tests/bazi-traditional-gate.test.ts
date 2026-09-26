// 「擋得對」測試：未通過來源閘門的輸出一律扣住、不外洩；已通過的才可放行。
// 這支只證明守門行為正確，不證明功能完整——功能完整另見 tests/bazi-feature-complete.test.cjs
// （npm run test:bazi-feature-complete），兩者不可互相代替。
// 斷言依閘門實際狀態條件化，不鎖定任何一項必須是 PENDING_POOL／CONFLICT。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getBaziTraditionalOutputGate, evaluateBaziShenShaRule } from '../lib/bazi-traditional-gate';
import baziRegistry from '../docs/技能戰鬥檔案/八字/來源登記.json';
import { indexSources, type SourceRegistry } from '../lib/iching-source-gate';
import { calculateDualChart } from '../lib/dual-chart';

const gate = getBaziTraditionalOutputGate(true);
// 基礎排盤是其他一切放行的前提；基礎命例的計算斷言在下方。
assert.equal(gate.coreStatus, 'VERIFIED');
assert.equal(gate.coreReady, true);

// 進階判讀：只有古籍依據與五神都 VERIFIED 才能放行；否則七個欄位全數扣住。
const interpretationShouldOpen = gate.coreReady && gate.classicsStatus === 'VERIFIED' && gate.fiveGodsStatus === 'VERIFIED';
assert.equal(gate.interpretationReady, interpretationShouldOpen, '進階判讀放行必須等於古籍依據＋五神皆 VERIFIED');
if (!gate.interpretationReady) {
  for (const field of ['旺衰定論', '格局定論', '用神', '喜神', '忌神', '補強排序', '老師解讀']) {
    assert.ok(gate.withheldFields.includes(field), `守門必須扣住：${field}`);
  }
  assert.equal(gate.customerMessage.includes('已通過來源與規則校驗'), false, '未放行時不得宣稱解釋已通過校驗');
} else {
  assert.equal(gate.withheldFields.length, 0);
}

// 四柱神煞：逐條獨立放行，未 VERIFIED 的規則不得 ready；整列只有五條全 VERIFIED 才 ready。
const rules = Object.entries(gate.shenShaRules);
// A selected, explicitly disclosed method is not a claim of agreement across books.
const registry = baziRegistry as unknown as SourceRegistry;
const sources = indexSources(registry);
const tianyi = structuredClone(registry.claims.find(c => c.claim_id === 'C-BAZI-SHENSHA-TIANYI')!);
const scoped = evaluateBaziShenShaRule(tianyi, sources, true);
assert.equal(scoped.status, 'VERIFIED', '本書驗證與輸出政策分開');
assert.equal(scoped.ready, false);
assert.equal(scoped.outputStatus, 'BLOCKED_VARIANT');
assert.equal(scoped.verificationScope, 'SELECTED_EDITION');
assert.equal(scoped.comparisons[0].status, 'DOCUMENTED_VARIANT');
assert.ok(scoped.method?.summary && scoped.method?.printedPage);
const wenchang = evaluateBaziShenShaRule(registry.claims.find(c => c.claim_id === 'C-BAZI-SHENSHA-WENCHANG'), sources, true);
assert.equal(wenchang.status, 'VERIFIED');
assert.equal(wenchang.outputStatus, 'BLOCKED_VARIANT');
assert.equal(wenchang.ready, false);
assert.equal(wenchang.comparisons.some(c => c.status === 'PENDING_COLLATION'), false, '已核原頁不得仍報整段未取得');
assert.ok(wenchang.comparisons[0].citations?.some(c => c.url.endsWith('.djvu/66')), '保留實際原頁證據');
tianyi.conflicts.push({ topic: '注入本書未解矛盾', sources: [], difference: '本書條件互相矛盾', adopted: '暫不採用', reason: '待核' });
assert.equal(evaluateBaziShenShaRule(tianyi, sources, true).status, 'CONFLICT');
assert.equal(evaluateBaziShenShaRule(tianyi, sources, true).ready, false, '已披露跨書異說不能解除本書內衝突');
const missingScope = structuredClone(registry.claims.find(c => c.claim_id === 'C-BAZI-SHENSHA-TIANYI')!);
delete (missingScope as unknown as Record<string, unknown>).selected_method;
assert.equal(evaluateBaziShenShaRule(missingScope, sources, true).ready, false, '無明確選定取法不得放行');
assert.equal(evaluateBaziShenShaRule(registry.claims.find(c => c.claim_id === 'C-BAZI-SHENSHA-TIANYI'), {}, true).ready, false, '元資料不能代替來源證據');
assert.equal(rules.length, 5, '五條神煞規則都必須有獨立守門');
for (const [key, rule] of rules) {
  assert.equal(rule.verificationScope, 'SELECTED_EDITION');
  assert.equal(rule.method?.ruleVersion, 'MINGLI_TANYUAN_SHENSHA_V5');
  for (const comparison of rule.comparisons) assert.ok(comparison.sourceUrl && comparison.locator && comparison.detail);
  assert.equal(rule.ready, gate.coreReady && rule.status === 'VERIFIED' && !rule.comparisons.some(item => item.status === 'DOCUMENTED_VARIANT'), `神煞 ${key}：來源及同範圍分歧政策皆通過才可放行`);
}
const everyRuleVerified = rules.every(([, rule]) => rule.status === 'VERIFIED');
assert.equal(gate.shenShaStatus === 'VERIFIED', everyRuleVerified);
assert.equal(gate.shenShaReady, gate.coreReady && rules.every(([, rule]) => rule.ready));

// 紅鸞：獨立守門，不得沿用四柱神煞的放行。
assert.equal(gate.redLuanReady, gate.coreReady && gate.redLuanStatus === 'VERIFIED');

// 基礎命盤未通過時，任何進階輸出都不得放行。
const blockedGate = getBaziTraditionalOutputGate(false);
assert.equal(blockedGate.coreReady, false);
assert.equal(blockedGate.interpretationReady, false);
assert.equal(blockedGate.shenShaReady, false);
assert.equal(blockedGate.redLuanReady, false);
assert.ok(Object.values(blockedGate.shenShaRules).every((rule) => !rule.ready), '基礎命盤無效時，單條神煞不得繞過');
assert.equal(blockedGate.customerMessage.includes('已核對'), false);

const sample = calculateDualChart({
  name: '固定命例',
  birthDate: '1990-01-01',
  birthTime: '11:30',
  gender: 'male',
  calendarType: 'solar',
  timezone: 'Asia/Taipei',
});

assert.deepEqual(
  [sample.core.pillars.year.ganZhi, sample.core.pillars.month.ganZhi, sample.core.pillars.day.ganZhi, sample.core.pillars.hour === 'UNKNOWN' ? 'UNKNOWN' : sample.core.pillars.hour.ganZhi],
  ['己巳', '丙子', '丙寅', '甲午'],
);
assert.equal(sample.core.calendar.lunarDate.replace('腊', '臘').includes('一九八九年臘月初五'), true);
assert.equal(sample.core.dayMaster.stem, '丙');
assert.deepEqual(sample.core.pillars.year.hiddenStems.map((item) => item.stem), ['丙', '庚', '戊']);
assert.deepEqual(sample.core.pillars.month.hiddenStems.map((item) => item.stem), ['癸']);
assert.deepEqual(sample.core.pillars.day.hiddenStems.map((item) => item.stem), ['甲', '丙', '戊']);
assert.deepEqual(sample.core.pillars.hour === 'UNKNOWN' ? [] : sample.core.pillars.hour.hiddenStems.map((item) => item.stem), ['丁', '己']);
assert.equal(sample.core.twelveStages.year, '臨官');
assert.equal(sample.core.twelveStages.month, '胎');
assert.equal(sample.core.twelveStages.day, '長生');
assert.equal(sample.core.twelveStages.hour, '帝旺');
assert.ok(sample.core.interactions.some((item) => item.interactionType === '子午相沖'));
assert.ok(sample.core.interactions.some((item) => item.interactionType === '寅巳相害'));
assert.equal(typeof sample.core.daYunMeta === 'object' ? sample.core.daYunMeta.direction : 'UNKNOWN', 'BACKWARD');
// 命盤結果帶出的守門必須與閘門一致，不得自行放寬。
const chartGate = sample.bazi.professionalChart.traditionalInterpretationGate;
assert.equal(chartGate?.coreReady, true);
assert.equal(chartGate?.interpretationReady, gate.interpretationReady);
assert.equal(chartGate?.shenShaReady, gate.shenShaReady);
assert.equal(chartGate?.redLuanReady, gate.redLuanReady);
for (const [key, rule] of rules) {
  assert.equal(chartGate?.shenShaRules?.[key as keyof typeof gate.shenShaRules]?.ready, rule.ready, `命盤結果的神煞 ${key} 放行必須與閘門一致`);
}

const dualChart = fs.readFileSync('app/dual-chart/BaziChart.tsx', 'utf8');
assert.equal(dualChart.includes("'無命中'"), false, '雙命盤不得再用絕對的「無命中」');
assert.equal(/旺衰:\s*pc\.strengthAnalysis|格局:\s*pc\.structurePattern|用神:\s*pc\.gods/.test(dualChart), false, '雙命盤不得繞過守門顯示舊解釋');
// 未放行時的扣住路徑必須存在（不論目前是否放行）。
assert.ok(dualChart.includes('四柱神煞暫未提供'), '雙命盤必須保留神煞未放行時的扣住文字');
assert.equal(dualChart.includes("return '未校驗'"), false);

const teacherModes = fs.readFileSync('components/bazi/customer/BaziTeacherModes.tsx', 'utf8');
assert.ok(teacherModes.includes('!view.traditionalGate.interpretationReady'), '老師解讀前端必須先過傳統守門');
for (const route of ['google-reading', 'horror-reading']) {
  const source = fs.readFileSync(`app/api/bazi/${route}/route.ts`, 'utf8');
  assert.ok(source.includes('BAZI_TRADITIONAL_INTERPRETATION_BLOCKED'), `${route} 後端必須拒絕未核准解讀`);
}

const matchRoute = fs.readFileSync('app/api/match-generate/route.ts', 'utf8');
assert.ok(matchRoute.includes('baziFoundation.traditionalGate.interpretationReady'), '配對補強必須共用傳統守門');
assert.ok(matchRoute.includes('baziFoundation.traditionalGate.redLuanReady'), '配對紅鸞必須使用獨立紅鸞守門');

const withheld = [
  !gate.interpretationReady && '進階判讀／五神',
  ...rules.filter(([, rule]) => !rule.ready).map(([key]) => `神煞 ${key}`),
  !gate.redLuanReady && '紅鸞',
].filter(Boolean);
console.log(`PASS: bazi gate blocks correctly — unverified outputs withheld, nothing leaks (withheld now: ${withheld.length ? withheld.join('、') : 'none'}). This does NOT prove feature completeness; see test:bazi-feature-complete.`);
