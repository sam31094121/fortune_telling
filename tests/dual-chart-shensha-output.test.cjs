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
assert.equal(blocked.includes('colSpan="4"'), false, 'restricted results preserve all four pillar columns');
assert.equal((blocked.match(/data-shensha-pillar=/g) || []).length, 4);
assert.ok(blocked.includes('特星神煞'));
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
const activeRow = render().match(/<tr[^>]*>(?:(?!<tr)[\s\S])*?<th scope="row">特星神煞<\/th><\/tr>/)?.[0];
assert.ok(activeRow, 'special-star row is visible below twelve stages');
assert.match(activeRow, /<td><\/td><td>[\s\S]*天乙貴人[\s\S]*<\/td><td><\/td><td><\/td>/, 'day evidence stays in second column (hour/day/month/year)');
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

const { inspectShenShaCoverage } = require('../scripts/dual-chart-shensha-display-check.cjs');
const legacyIds = ['tianyi', 'wenchang', 'taohua', 'yima', 'huagai', 'yangren', 'yuanchen', 'jiangxing', 'gejiao'];
// 2026-09-27 reference-chart expansion (owner decision): the full baseline the card must evaluate.
const expectedIds = [...legacyIds, 'tiande', 'yuede', 'tiandehe', 'longde', 'tiangou', 'jinkui', 'wugui', 'zaisha', 'liue', 'yuepo', 'ripo', 'muyu', 'waiTaohua', 'kuigang', 'kongwang', 'jinyu', 'xuetang', 'hongyan', 'lushen', 'tianyiDoctor', 'jiesha', 'guchen', 'guasu', 'guoyin', 'tianchu', 'tianshe', 'sanqi', 'wangshen', 'yinyangChacuo', 'guluan', 'shieDabai', 'liuxia', 'sifei', 'yuedehe', 'feiren', 'jinshen', 'bazhuan', 'jiuchou', 'liuxiu', 'sangmen', 'baihu', 'bingfu', 'pima', 'suipo', 'yuekong', 'jielu', 'tianzhuan', 'dizhuan', 'shiling', 'ride', 'rigui'];
const fixtureFor = ids => ({
  bazi: { professionalChart: { traditionalInterpretationGate: { shenShaRules: Object.fromEntries(ids.map(id => [id, { outputStatus: 'READY' }])) } } },
  specialStars: { coverage: ids.map(id => ({ id, status: 'NOT_MATCHED' })), byPillar: Object.fromEntries(pillars.map(key => [key, []])) },
});
const connected = {
  bazi: { professionalChart: { traditionalInterpretationGate: { shenShaRules: Object.fromEntries(expectedIds.map(id => [id, { outputStatus: 'READY' }])) } } },
  specialStars: {
    coverage: expectedIds.map(id => ({ id, status: 'NOT_MATCHED' })),
    byPillar: Object.fromEntries(pillars.map(key => [key, []])),
  },
};
assert.deepEqual(inspectShenShaCoverage(connected), [], 'complete evaluated non-hits remain valid');
const disconnected = structuredClone(connected);
delete disconnected.specialStars;
assert.ok(inspectShenShaCoverage(disconnected).length, 'removed extension must fail, not become a valid empty chart');
const silentlyReduced = structuredClone(connected);
silentlyReduced.specialStars.coverage = silentlyReduced.specialStars.coverage.filter(item => item.id !== 'yuanchen');
delete silentlyReduced.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.yuanchen;
assert.ok(inspectShenShaCoverage(silentlyReduced).some(message => message.includes('yuanchen')), 'removing both coverage and backend rule cannot shrink the health baseline');
const missingPillar = structuredClone(connected);
delete missingPillar.specialStars.byPillar.month;
assert.ok(inspectShenShaCoverage(missingPillar).some(message => message.includes('month')), 'missing pillar is not an evaluated empty pillar');
const duplicatedRule = structuredClone(connected);
duplicatedRule.specialStars.coverage.push({ id: 'yuanchen', status: 'NOT_MATCHED' });
assert.ok(inspectShenShaCoverage(duplicatedRule).some(message => message.includes('yuanchen')), 'duplicated coverage does not prove completeness');
console.log('PASS: shensha health baseline detects disconnected, silently reduced and malformed backend results');

const { inspectShenShaDelivery, inspectShenShaRow } = require('../scripts/dual-chart-shensha-display-check.cjs');
const deliveryFixture = structuredClone(connected);
const fixtureHit = { id: 'taohua', name: '桃花', evidence: 'HOUR 支卯' };
deliveryFixture.specialStars.raw = [fixtureHit];
deliveryFixture.core = { shenSha: [fixtureHit] };
deliveryFixture.bazi.professionalChart.shenSha = [fixtureHit];
deliveryFixture.bazi.professionalChart.traditionalInterpretationGate.coreReady = true;
deliveryFixture.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.taohua = { ready: true, status: 'VERIFIED', outputStatus: 'READY' };
deliveryFixture.specialStars.byPillar.hour = [fixtureHit];
deliveryFixture.specialStars.coverage.forEach(item => {
  item.status = item.id === 'taohua' ? 'MATCHED' : 'NOT_MATCHED';
  item.matchedPillars = item.id === 'taohua' ? ['hour'] : [];
});
const rowFixture = name => inspectShenShaRow(`<table><tr><td><span>${name}<a href="https://example.org/scan">原典 71頁</a></span></td><td></td><td></td><td></td><th scope="row">特星神煞</th></tr></table>`);
assert.deepEqual(inspectShenShaDelivery(deliveryFixture, rowFixture('桃花')), [], 'exact backend to cell delivery passes');
assert.ok(inspectShenShaDelivery(deliveryFixture, rowFixture('外桃花')).length, 'substring names cannot pass');
assert.ok(inspectShenShaDelivery(deliveryFixture, rowFixture('')).length, 'missing visible result fails');
assert.ok(inspectShenShaDelivery(deliveryFixture, rowFixture('桃花</span><span>桃花')).length, 'duplicated visible names fail');
assert.ok(inspectShenShaDelivery(deliveryFixture, rowFixture('桃花</span><span>驛馬')).length, 'an extra visible name fails');
const droppedTwice = structuredClone(deliveryFixture);
droppedTwice.specialStars.byPillar.hour = [];
assert.ok(inspectShenShaDelivery(droppedTwice, rowFixture('')).some(m => m.includes('原始運算')), 'API and UI cannot jointly lose the same raw result');
const wrongPillar = structuredClone(deliveryFixture);
wrongPillar.specialStars.byPillar.day = wrongPillar.specialStars.byPillar.hour;
wrongPillar.specialStars.byPillar.hour = [];
assert.ok(inspectShenShaDelivery(wrongPillar, rowFixture('桃花')).length, 'wrong-pillar transport fails');
const duplicatedHit = structuredClone(deliveryFixture);
duplicatedHit.specialStars.byPillar.hour.push(fixtureHit);
assert.ok(inspectShenShaDelivery(duplicatedHit, rowFixture('桃花')).length, 'duplicate transport fails');
const staleCore = structuredClone(deliveryFixture);
staleCore.core.shenSha = [];
assert.ok(inspectShenShaDelivery(staleCore, rowFixture('桃花')).length, 'split backend copies cannot pass');
const staleCoverage = structuredClone(deliveryFixture);
staleCoverage.specialStars.coverage.find(item => item.id === 'taohua').status = 'NOT_MATCHED';
assert.ok(inspectShenShaDelivery(staleCoverage, rowFixture('桃花')).length, 'a match cannot be labelled not matched');
assert.ok(inspectShenShaRow('<table><tr><td></td><th scope="row">特星神煞</th></tr></table>').warnings.length, 'a truncated table cannot pass');
console.log('PASS: exact raw → per-pillar → visible-name delivery detects omissions, extras, duplicates, stale copies and wrong pillars');

const { inspectShenShaPlacement } = require('../scripts/dual-chart-shensha-display-check.cjs');
const inlineHtml = render();
assert.deepEqual(inspectShenShaPlacement(inlineHtml), [], 'shensha stays directly under the original four pillars');
assert.ok(!/<(?:details|summary)\b/.test(inlineHtml), 'results require no expansion');
assert.equal(inlineHtml.includes('回傳'), false, 'customer table avoids transport jargon');
assert.ok(inspectShenShaPlacement(inlineHtml.replace('</tbody>', `${activeRow}</tbody>`)).length, 'duplicate shensha row fails health');
assert.ok(inspectShenShaPlacement(inlineHtml.replace('<tbody>', '<tbody><details>')).length, 'folded results fail health');
assert.ok(inspectShenShaPlacement(inlineHtml.replace('>十二運</th>', '>其他</th>')).length, 'incorrect placement fails health');
console.log('PASS: shensha is one unfolded row under the original four pillars');

const { inspectShenShaCard } = require('../scripts/dual-chart-shensha-display-check.cjs');
deliveryFixture.bazi.professionalChart.pillarDetails = Object.fromEntries(pillars.map(key => [key, { ganzhi: '甲子' }]));
const { buildShenShaCardView } = loadUi('lib/dual-chart-shensha-card.ts');
// The card view is computed on the backend; fixtures rebuild it the same way the API does.
const withCard = value => { value.specialStars.card = buildShenShaCardView(value.specialStars, value.bazi.professionalChart.traditionalInterpretationGate.coreReady === true); return value; };
const card = value => renderToStaticMarkup(React.createElement(target.exports.ShenShaCard, { result: withCard(value) }));
const cardHtml = card(deliveryFixture);
assert.deepEqual(inspectShenShaCard(deliveryFixture, cardHtml), []);
assert.equal(/本次未出現|各項判定|data-shensha-rule=/.test(cardHtml), false, 'customer card shows actual results without the rule-status list');
assert.ok(!/<(?:details|summary)\b/.test(cardHtml), 'no expansion is required');
assert.ok(inspectShenShaCard(deliveryFixture, `<details>${cardHtml}</details>`).length, 'collapsed content fails health');
assert.ok(inspectShenShaCard(deliveryFixture, cardHtml.replace('data-shensha-result="taohua"', 'data-shensha-result="missing"')).length, 'lost calculated result fails health');
assert.ok(inspectShenShaCard(deliveryFixture, `${cardHtml}<p>桃花 本次未出現</p>`).length, 'repeated status list fails health');
assert.ok(inspectShenShaCard(deliveryFixture, cardHtml.replace('data-shensha-column="hour"', 'data-shensha-column="day"')).length, 'wrong pillar fails health');
const missingCard = structuredClone(deliveryFixture);
delete missingCard.specialStars.byPillar.month;
assert.ok(card(missingCard).includes('資料尚未完整'));
const blockedCard = structuredClone(deliveryFixture);
blockedCard.bazi.professionalChart.traditionalInterpretationGate.coreReady = false;
assert.equal(card(blockedCard).includes('data-shensha-result='), false);
const noCardHtml = renderToStaticMarkup(React.createElement(target.exports.ShenShaCard, { result: { ...structuredClone(deliveryFixture), specialStars: { ...deliveryFixture.specialStars, card: undefined } } }));
assert.ok(noCardHtml.includes('data-shensha-card-state="unavailable"'), 'without a backend card view the frontend must not compute its own result');
// A pending rule only marks the pillars it actually inspects (五鬼 checks month, day and hour only).
const partialPending = structuredClone(deliveryFixture);
partialPending.specialStars.coverage.push({ id: 'wugui', name: '五鬼', status: 'BLOCKED_SOURCE' });
const pendingHtml = card(partialPending);
const colState = key => pendingHtml.match(new RegExp(`data-shensha-column="${key}" data-shensha-column-state="([A-Z]+)"`))?.[1];
assert.equal(colState('year'), 'NONE', 'a rule that never inspects the year pillar must not mark it pending');
assert.equal(colState('month'), 'PENDING');
assert.equal(colState('day'), 'PENDING');
assert.equal(colState('hour'), 'HIT');
assert.ok(pendingHtml.includes('另有五鬼待確認'), 'a hit column still discloses its own pending rule');
assert.ok(pendingHtml.includes('五鬼（月柱、日柱、時柱）'), 'notice names the affected pillars');
assert.ok(pendingHtml.includes('data-shensha-card-state="partial"'));
assert.ok(cardHtml.includes('神煞由已核對一致的八字、紫微四柱衍生'), 'the card states where the result is derived from');
console.log('PASS: calculated shensha results stay complete and unfolded without repeated rule-status text');
console.log('PASS: backend card view drives the card; pending rules only mark the pillars they inspect');
// 《神煞易經》第④層：照印後端 iching 檢視；擋下時如實顯示原因。
const withIching = structuredClone(deliveryFixture);
withIching.specialStars.iching = { state: 'READY', chain: [{ step: '八字', text: 'A' }, { step: '紫微', text: 'B' }, { step: '特星神煞', text: 'C' }, { step: '易經', text: 'D' }],
  hexagram: { name: '測試卦', glyph: '䷀', kingWen: 1, changingLine: 2, changingLabel: '後端爻位文字', essence: 'e', advice: 'a' }, items: [{ id: 'taohua', name: '桃花', pillar: '時柱', derivation: '後端推導原文', reference: true, teacher: { theme: '後端主題', tone: '福氣', text: '後端導師話術' }, onion: { layers: [{ layer: '殼', label: '後端殼標', text: '後端殼層' }, { layer: '心', label: '後端心標', text: '後端心層' }, { layer: '禮物', label: '後端禮標', text: '後端禮物層' }], term: { name: '後端名詞', link: '後端連結句', citation: '後端出處' } }, imagery: { name: '桃花', chars: [{ char: '桃', element: '水', sense: null, source: null, senseText: '後端無字義說明' }, { char: '花', element: '金', sense: '後端字義原文', source: 'MOE', senseText: '後端字義原文' }], line: '' } }],
  distribution: [], summary: '後端總評', focusLine: '後端集中柱位解讀', highlights: [{ tone: '福氣', title: '後端重點標題', names: ['桃花'], text: '後端重點內容' }], combos: [{ id: 'charm-trio', title: '後端組合標題', members: ['桃花'], pillar: '時柱', text: '後端組合解讀' }], reading: ['後端解盤第一句'], credibility: { status: 'PENDING_POOL', line: '神煞易經解盤：仍在查證中' }, imageryAttribution: '後端出處說明', onionCredibility: { status: 'PENDING_POOL', line: '後端洋蔥公信力' } };
const ichingHtml = card(withIching);
assert.ok(ichingHtml.includes('>神煞易經</h3>'));
for (const text of ['後端解盤第一句', '後端推導原文', '桃花＊', '測試卦', '仍在查證中', '後端字義原文', '後端出處說明', '後端導師話術', '福氣｜後端主題', '後端爻位文字', '後端無字義說明', '後端殼層', '後端心層', '後端禮物層', '後端名詞', '後端出處', '後端洋蔥公信力', '後端組合標題', '後端組合解讀', '後端總評', '後端重點標題', '後端重點內容', '後端集中柱位解讀']) assert.ok(ichingHtml.includes(text), `prints backend text: ${text}`);
assert.deepEqual(inspectShenShaCard(withIching, ichingHtml), [], 'the I Ching section does not disturb the four-pillar card');
// 舊版結果（沒有字的意境欄位）不得讓整張卡出錯。
const legacyIching = structuredClone(withIching);
delete legacyIching.specialStars.iching.items[0].imagery;
delete legacyIching.specialStars.iching.imageryAttribution;
assert.ok(card(legacyIching).includes('後端推導原文'), 'legacy result without imagery still renders');
withIching.specialStars.iching = { state: 'BLOCKED', chain: [{ step: '八字', text: 'A' }], reason: '後端擋下原因' };
const blockedIchingHtml = card(withIching);
assert.ok(blockedIchingHtml.includes('後端擋下原因') && !blockedIchingHtml.includes('測試卦'));
console.log('PASS: 神煞易經 prints the backend chain, hexagram, every derivation and blocked reasons verbatim');
// 兩張老師解盤卡：易經老師（神）與鬼魅老師（魔）都折疊點閱；四柱神煞表不得被折疊。
const withGhost = structuredClone(deliveryFixture);
withGhost.specialStars.iching = { state: 'BLOCKED', chain: [{ step: '八字', text: 'A' }], reason: '易經擋下' };
withGhost.specialStars.ghost = { state: 'READY', opening: '後端開壇語', decoding: [{ label: '磁場', text: '後端磁場' }], groups: [{ pillar: '時柱', lines: [{ name: '桃花', tone: '動能', text: '後端鬼語' }] }], formations: [{ title: '後端陣名', text: '後端陣解' }], closing: '後端收壇', disclaimer: '後端聲明' };
const ghostHtml = card(withGhost);
for (const text of ['易經老師解盤', '鬼魅老師解盤', '後端開壇語', '後端磁場', '後端鬼語', '後端陣名', '後端收壇', '後端聲明']) assert.ok(ghostHtml.includes(text), `prints ${text}`);
assert.equal((ghostHtml.match(/<details/g) || []).length, 2, 'two folded teacher cards');
assert.ok(ghostHtml.indexOf('data-shensha-column=') < ghostHtml.indexOf('<details'), 'pillar grid stays visible above the folded cards');
assert.deepEqual(inspectShenShaCard(withGhost, ghostHtml), [], 'folded teacher cards after the grid pass health');
assert.ok(inspectShenShaCard(withGhost, `<details>${ghostHtml}</details>`).length, 'folding the pillar grid still fails health');
console.log('PASS: 易經老師／鬼魅老師 fold below a visible pillar grid and print backend text only');
// 後端只負責運算，前端只負責顯示，前端禁止生成（業主定案 2026-09-27）：
// 神煞易經卡的前端程式碼不得自己寫句子（含「，」「。」「；」的中文字串），只准照印後端欄位。
const cardSource = fs.readFileSync('app/dual-chart/BaziChart.tsx', 'utf8');
const cardSlice = cardSource.slice(cardSource.indexOf('function ShenShaIChingSection'), cardSource.indexOf('export function LuckGrid'));
assert.ok(cardSlice.length > 500, 'card source slice found');
const allowedStatus = ['神煞資料尚未完整，暫不能判斷有無結果。'];
const cjkSentence = /[一-鿿][^'"`<>{}\n]*[，。；]/;
const literals = [...cardSlice.matchAll(/'([^'\n]*)'|"([^"\n]*)"|>([^<>{}\n]+)</g)].map(m => (m[1] ?? m[2] ?? m[3]).trim());
const generated = literals.filter(text => cjkSentence.test(text) && !allowedStatus.includes(text));
assert.deepEqual(generated, [], 'frontend must not compose sentences for the 神煞易經 card');
console.log('PASS: 神煞易經 frontend only prints backend text (no generated sentences)');

const { inspectRequestedShenShaScope } = require('../scripts/dual-chart-shensha-display-check.cjs');
const legacyScope = fixtureFor(legacyIds);
assert.equal(inspectRequestedShenShaScope(legacyScope).length,11,'transport completeness cannot certify newly requested rules');
const falseClaim = structuredClone(legacyScope);
falseClaim.specialStars.rules = { tiandehe: { ready: true, outputStatus: 'READY' } };
assert.equal(inspectRequestedShenShaScope(falseClaim).length,11,'ready flag without evaluated coverage is insufficient');
falseClaim.specialStars.coverage.push({id:'tiandehe',status:'NOT_MATCHED'});
assert.equal(inspectRequestedShenShaScope(falseClaim).length,10,'only an individually evaluated rule reduces the missing scope');
falseClaim.specialStars.coverage.at(-1).status='BLOCKED_SOURCE';
assert.equal(inspectRequestedShenShaScope(falseClaim).length,11,'blocked source cannot masquerade as a completed non-hit');
console.log('PASS: full-card health remains blocked while requested calculations are missing');
