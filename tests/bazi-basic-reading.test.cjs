const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const compiled = ts.transpileModule(fs.readFileSync('components/bazi/customer/BasicChartReading.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const target = { exports: {} };
vm.runInNewContext(compiled, { exports: target.exports, module: target, require });
const { BasicChartReading } = target.exports;
const view = {
  traditionalGate: { coreReady: true, interpretationReady: false },
  dayMaster: { stem: '丙', element: '火' },
  hourUnknown: false,
  pillars: [
    { key: 'day', label: '日柱', stem: '丙', branch: '寅', stemTenGod: '日主', hiddenStems: [{ stem: '甲', tenGod: '偏印' }] },
    { key: 'hour', label: '時柱', stem: '甲', branch: '午', stemTenGod: '偏印', hiddenStems: [{ stem: '丁', tenGod: '劫財' }] },
  ],
  teacher: { summary: '不應輸出的判讀' },
  gods: { usefulGod: '不應輸出的喜用' },
};
const render = (data) => renderToStaticMarkup(React.createElement(BasicChartReading, { view: data }));
const full = render(view);
assert.ok(full.includes('日主為丙火'));
assert.ok(full.includes('甲午'));
assert.ok(full.includes('甲（偏印）'));
assert.equal(full.includes('不應輸出'), false);
const partial = render({ ...view, hourUnknown: true });
assert.equal(partial.includes('甲午'), false);
assert.ok(partial.includes('年、月、日三柱'));
const invalid = render({ ...view, traditionalGate: { coreReady: false } });
assert.equal(invalid.includes('丙火'), false);
assert.ok(invalid.includes('重新排盤'));
console.log('PASS: verified chart facts render independently; unknown hour and blocked judgments do not leak');
