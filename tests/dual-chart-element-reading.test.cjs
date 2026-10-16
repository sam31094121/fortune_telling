const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./helpers/load-iching-shensha-ui.cjs');
const Reading = load('app/dual-chart/BaziElementReading.tsx').default;
const chart = { traditionalInterpretationGate: { coreReady: true, interpretationReady: false }, strengthAnalysis: { verdict: '偏強' }, gods: { usefulGod: '水', joyGod: '木', avoidGod: '火' } };
const core = { dayMaster: { stem:'甲',element:'木',yinYang:'陽' }, mingGong:'丙寅',shenGong:'戊辰',taiYuan:'乙亥',taiXi:'己巳',kongWang:{yearXunKong:'子丑',dayXunKong:'辰巳'} };
const render = value => renderToStaticMarkup(React.createElement(Reading, { chart: value, core }));
const html = render(chart);
for (const text of ['強弱','偏強','喜用神','木、水','忌神','火']) assert(html.includes(text));
for (const text of ['命宮','身宮','胎元','胎息','年空','日空']) assert.equal((html.match(new RegExp(`<dt>${text}</dt>`,'g'))||[]).length,1,'No duplicate '+text);
assert(!html.includes('未提供'));
assert(!html.includes('<dt>血型</dt>'));
for (const gate of [undefined, { coreReady: false }]) {
 const blocked = render({ ...chart, traditionalInterpretationGate: gate });
 assert(!blocked.includes('<dt>喜用神</dt>') && !blocked.includes('未提供'));
 assert(!blocked.includes('偏強') && !blocked.includes('<dd>火</dd>'));
}
assert(!render({ traditionalInterpretationGate: { coreReady: true } }).includes('<dt>喜用神</dt>'));
assert(!render({ ...chart, gods: { usefulGod: 'UNKNOWN', joyGod: 'NOT_CALCULATED', avoidGod: '' } }).includes('<dd>UNKNOWN</dd>'));
console.log('PASS: authorized local-method values display without changing source status; invalid core, missing and sentinel values never fabricated');
