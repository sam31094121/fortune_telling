const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const loadUi = require('./helpers/load-shensha-ui.cjs');
const target = { exports: loadUi('app/dual-chart/BaziChart.tsx') };
const pillars = ['hour', 'day', 'month', 'year'];
const sample = {
  bazi: { professionalChart: {
    traditionalInterpretationGate: { coreReady: true, interpretationReady: true, shenShaReady: false },
    pillarDetails: Object.fromEntries(pillars.map(p => [p, { stemTenGod: '比肩', ganzhi: '甲子' }])),
    hiddenStemStructure: Object.fromEntries(pillars.map(p => [p, [{ stem: '癸', tenGod: '正印' }]])),
  } },
  core: {
    twelveStages: Object.fromEntries(pillars.map(p => [p, '沐浴'])),
    shenSha: [{ id: 'tianyi', name: '天乙貴人', evidence: 'DAY 支丑' }, { id: 'tianyi', name: '天乙貴人', evidence: 'DAY 支丑' }, { id: 'taohua', name: '桃花', evidence: 'DAY 支丑' }],
  },
};
const render = () => renderToStaticMarkup(React.createElement(target.exports.PillarGrid, { result: sample }));
const blocked = render();
assert.equal(blocked.includes('未校驗'), false);
assert.equal(blocked.includes('天乙貴人'), false, 'advanced interpretation cannot unlock shensha');
assert.ok(blocked.includes('尚待核對'));
assert.ok(blocked.includes('colSpan="4"') || blocked.includes('colspan="4"'));
assert.ok(blocked.includes('神煞暫未提供，不代表沒有神煞。'));
assert.equal(blocked.includes('未命中'), false);
assert.ok(blocked.includes('甲'));
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaReady = true;
assert.equal(render().includes('天乙貴人'), false, 'aggregate flag cannot unlock unverified individual rules');
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaReady = false;
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaRules = { tianyi: { ready: true, status: 'VERIFIED', outputStatus: 'READY' }, taohua: { ready: false, status: 'PENDING_POOL' } };
assert.equal((render().match(/天乙貴人/g) || []).length, 1, 'verified names are deduplicated per pillar');
assert.equal(render().includes('桃花'), false, 'a pending rule neither leaks nor blocks a verified sibling');
assert.equal(render().includes('未命中'), false, 'checked non-hits remain empty');
assert.equal(render().includes('尚待核對'), false);
delete sample.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.tianyi.outputStatus;
assert.equal(render().includes('天乙貴人'), false, 'old results without effective output policy cannot unlock rules');
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.tianyi.outputStatus = 'READY';
const hits = sample.core.shenSha;
sample.core.shenSha = undefined;
assert.ok(render().includes('資料待補'));
assert.equal(render().includes('未命中'), false, 'missing data is not a negative result');
sample.core.shenSha = [];
assert.equal(render().includes('未命中'), false);
assert.equal((render().match(/<td><\/td>/g) || []).length, 4, 'all four shensha cells stay empty for no hits');
sample.core.shenSha = hits;
const restrictions = () => renderToStaticMarkup(React.createElement(target.exports.ShenShaRestrictions, { result: sample }));
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.taohua.status = 'CONFLICT';
assert.ok(restrictions().includes('部分神煞因取法分歧暫不提供：桃花。'));
assert.ok(restrictions().includes('以下神煞尚待完成來源與取法核對：文昌、驛馬、華蓋。'));
assert.equal(restrictions().includes('三命通會'), false, 'gate conflict alone does not establish which book disagrees');
assert.equal(render().includes('桃花'), false, 'conflicted hit remains withheld');
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.taohua.ready = true;
assert.equal(render().includes('桃花'), false, 'an inconsistent ready flag cannot override conflict');
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.taohua.status = 'VERIFIED';
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.taohua.outputStatus = 'BLOCKED_VARIANT';
assert.equal(render().includes('桃花'), false, 'verified selected source cannot override effective variant hold');
assert.ok(restrictions().includes('部分神煞因取法分歧暫不提供：桃花。'));
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.taohua.ready = false;
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.tianyi.ready = false;
assert.ok(render().includes('取法分歧，暫未提供'));
assert.equal(render().includes('未命中'), false, 'all withheld rules cannot produce a no-hit verdict');
sample.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.tianyi.ready = true;
sample.bazi.professionalChart.traditionalInterpretationGate.coreReady = false;
assert.equal(render().includes('天乙貴人'), false, 'individual rule cannot bypass invalid base chart');
delete sample.bazi.professionalChart.traditionalInterpretationGate;
assert.equal(render().includes('天乙貴人'), false, 'old results without gate cannot silently unlock');
assert.ok(render().includes('尚待核對'));
assert.equal(renderToStaticMarkup(React.createElement(target.exports.PillarGrid, { result: sample, compact: true })).includes('神煞'), false, 'Ziwei compact summary remains unchanged');
console.log('PASS: four-pillar shensha display has independent eligibility and preserves base pillars');

const professional = { exports: loadUi('components/bazi/customer/ProfessionalBaziTable.tsx') };
const pc = sample.bazi.professionalChart;
Object.assign(pc, { calendar: {}, kongWang: {}, twelveStages: sample.core.twelveStages, shenSha: hits,
  traditionalInterpretationGate: { coreReady: true, interpretationReady: false, shenShaRules: {
    tianyi: { ready: true, status: 'VERIFIED', outputStatus: 'READY' }, taohua: { ready: false, status: 'CONFLICT' },
  } },
});
Object.assign(sample.bazi, { input: {}, luckCycles: [] });
const professionalHtml = renderToStaticMarkup(React.createElement(professional.exports.ProfessionalBaziTable, { result: sample.bazi, hourUnknown: false }));
assert.ok(professionalHtml.includes('部分神煞因取法分歧暫不提供：桃花。'));
assert.equal(professionalHtml.includes('未命中'), false);
assert.ok(professionalHtml.includes('不表示各書各派一致'));
assert.equal(professionalHtml.includes('桃花 · DAY'), false);
assert.ok(professionalHtml.includes('天乙貴人 · DAY'));
console.log('PASS: independent Bazi view discloses partial restrictions without presenting withheld hits');

const evidence = loadUi('components/bazi/customer/ShenShaSourceEvidence.tsx');
const sourceRules = {
  tianyi: { status: 'VERIFIED', ready: true, verificationScope: 'SELECTED_EDITION',
    method: { title: '增訂命理探原', edition: '1937', ruleVersion: 'V5', summary: '指定本書取法', sourceUrl: 'https://example.org/selected', printedPage: '63' },
    comparisons: [{ status: 'DOCUMENTED_VARIANT', title: '三命通會', detail: '晝夜分取', sourceUrl: 'https://example.org/scan#page=154', locator: '卷三12–13' }],
  },
  wenchang: { status: 'VERIFIED', ready: true, comparisons: [{ status: 'PENDING_COLLATION', title: '候選轉錄', detail: '待核原頁', sourceUrl: 'https://example.org/candidate', locator: '候選文字' }] },
};
const compare = (language) => renderToStaticMarkup(React.createElement(evidence.ShenShaComparisonSummary, { rules: sourceRules, language }));
assert.ok(compare('zh').includes('跨書異說已查證：天乙'));
assert.ok(compare('zh').includes('查看依據'));
assert.ok(compare('zh').includes('href="https://example.org/scan#page=154"'));
assert.equal(compare('zh').includes('暫不提供'), false, 'cross-source variant does not pretend an allowed selected method is withheld');
assert.ok(compare('en').includes('Documented source variant'));
assert.ok(compare('en').includes('View evidence'));
assert.equal(compare('en').includes('symbolic stars'), false);
sourceRules.tianyi.comparisons[0].citations = [{ book: '合成原文測試', locator: '第12頁', quote: '合成引文', url: 'https://example.org/scan#page=12', verification: '原頁核對測試' }];
const fullEvidence = renderToStaticMarkup(React.createElement(evidence.default, { rules: sourceRules }));
assert.ok(fullEvidence.includes('合成引文'));
assert.ok(fullEvidence.includes('href="https://example.org/scan#page=12"'));
sourceRules.tianyi.comparisons[0].locator = '';
assert.equal(compare('zh').includes('跨書異說已查證：天乙'), false, 'incomplete evidence must not become a confirmed variant');
assert.equal(compare('zh').includes('查看依據'), false, 'no empty evidence button');
pc.shenSha = [];
const emptyProfessional = renderToStaticMarkup(React.createElement(professional.exports.ProfessionalBaziTable, { result: sample.bazi, hourUnknown: false }));
assert.equal(emptyProfessional.includes('未命中'), false);
const englishProfessional = loadUi('components/bazi/customer/ProfessionalBaziTable.tsx', 'en');
const enHtml = renderToStaticMarkup(React.createElement(englishProfessional.ProfessionalBaziTable, { result: sample.bazi, hourUnknown: false }));
assert.ok(enHtml.includes('Some shensha are currently withheld'));
assert.equal(enHtml.includes('symbolic stars'), false);
console.log('PASS: bilingual source comparisons distinguish selected-method readiness and require located evidence');
