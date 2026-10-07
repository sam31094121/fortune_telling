const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./helpers/load-iching-shensha-ui.cjs');
const { buildGhostAsuraReading, translateVerifiedRecords } = load('features/ghost-asura/index.ts');
const { createAsuraCustomerCopy } = load('features/ghost-asura/customerCopy.ts');
const { GhostAsuraCard } = load('features/ghost-asura/components/GhostAsuraCard.tsx');
// 2026-10-07：Skill 母版以後端 65 個編號為唯一清單；原本的 tiansha（天煞）不在其中，改用後端確實存在的 yangren（羊刃）。
const names = [
  ['muyu', '沐浴', '蛻變新生'], ['taohua', '桃花', '魅力引力'],
  ['waiTaohua', '外桃花', '界外吸引'], ['yangren', '羊刃', '血刃之鋒'],
];
const records = names.map(([ruleId, originalName], i) => ({
  ruleId, resultId: ruleId, originalName, matched: true,
  pillars: [i % 2 ? 'day' : 'year'], backendStatus: 'MATCHED',
  resultBatchId: 'COPY_TEST', motherVersion: 'SYNTHETIC',
}));
const combos = [{
  comboId: 'COPY_PAIR', title: '桃花與外桃花', memberRuleIds: ['taohua', 'waiTaohua'],
  memberNames: ['桃花', '外桃花'], pillar: '日柱', evidenceText: '桃花、外桃花的組合尚需留意界線。',
}, {
  comboId: 'COPY_CHAIN', title: '沐浴、桃花、羊刃', memberRuleIds: ['muyu', 'taohua', 'yangren'],
  memberNames: ['沐浴', '桃花', '羊刃'], pillar: null, evidenceText: '沐浴、桃花與羊刃共同呈現；不代表事件一定發生。',
}];
const before = JSON.stringify({ records, combos });
const translated = translateVerifiedRecords(records);
const reading = buildGhostAsuraReading({ records, combos });
assert.equal(JSON.stringify({ records, combos }), before, 'Never rewrite raw facts or evidence');
for (const [id, original, display] of names) {
  const raw = translated.find(item => item.resultId === id);
  assert.equal(raw.originalName, original);
  assert.equal(raw.displayName, display);
  assert.equal(raw.matched, true);
  const item = reading.items.find(item => item.resultId === id);
  assert.equal(item.displayName, display);
  assert.ok(item.shortDeclaration && item.coreMeaning && item.battleSignificance && item.verdict);
}
const copy = createAsuraCustomerCopy(translated);
assert.equal(copy('天德護印、天德貴人、外桃花、桃花'), '天德護印、天德護印、界外吸引、魅力引力');
assert.equal(copy(copy('桃花、外桃花')), copy('桃花、外桃花'), 'Do not translate an already mapped title twice');
assert.equal(reading.awakenedCount, 4);
assert.equal(reading.dualClashes.length, 1);
assert.equal(reading.chains.length, 1);
const html = renderToStaticMarkup(React.createElement(GhostAsuraCard, { reading }));
// Includes folded bodies and all lower sections, not only the visible summaries.
assert.doesNotMatch(html, /沐浴|外桃花|桃花|羊刃|易經|後端|coverage/);
for (const [, , display] of names) assert.ok(html.includes(display));
const missing = buildGhostAsuraReading({ result: null });
const failureHtml = renderToStaticMarkup(React.createElement(GhostAsuraCard, { reading: missing }));
assert.match(failureHtml, /這份秘卷尚未完整/);
assert.doesNotMatch(failureHtml, /dual-chart|coverage|神煞/);
console.log('PASS: four readable titles + narratives; expanded/combination/battle copy mapped, raw IDs/facts immutable, unknown-state warning retained');
