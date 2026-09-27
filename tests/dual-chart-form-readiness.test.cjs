const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file) {
  const target = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { module: target, exports: target.exports, require(id) {
    if (id === '@/components/HomeTranslatedText') return { __esModule: true, default: ({text}) => text, useDisplayText: () => x => x };
    if (id === '@/components/LunarBirthdayInput') return () => null;
    if (id === '@/lib/shichen-engine') return { SHICHEN_LIST: [] };
    if (id.startsWith('@/lib/')) return {};
    return require(id);
  }});
  return target.exports;
}
const { dualChartHourStatus } = load('lib/dual-chart-form.ts');
const { UnifiedBirthForm, isHourBranchChosen } = load('components/UnifiedBirthForm.tsx');
const base = { birthDate: '1990-02-15', gender: 'male' };
const unknown = { ...base, birthHourBranch: 'unknown', timeUnknown: true, birthTime: '12:00' };
const pending = { ...base, birthHourBranch: 'pending' };
const zi = { ...base, birthHourBranch: 'zi', birthTime: '' };
const render = (value, scoped) => renderToStaticMarkup(React.createElement(UnifiedBirthForm, {
  value, fields: { birthDate: true, gender: true, birthHourBranch: true }, autoFillIdentity: false, persistIdentity: false,
  requireKnownHour: scoped, hourCompletion: scoped ? dualChartHourStatus(value) : undefined,
  missing: ['birthHourBranch'], onChange() {}, onSubmit() {},
}));
assert.equal(isHourBranchChosen(unknown), true, 'shared default still allows unknown-hour partial flows');
assert.ok(render(unknown, false).includes('資料全部完成'));
for (const value of [unknown, pending, zi]) {
  assert.equal(dualChartHourStatus(value).done, false);
  assert.equal(render(value, true).includes('資料全部完成'), false);
  assert.equal(render(value, true).includes('也算得出來'), false);
}
assert.match(dualChartHourStatus(zi).message, /午夜前.*午夜後/);
for (const birthTime of ['23:30', '00:30']) {
  const ready = { ...zi, birthTime };
  assert.equal(dualChartHourStatus(ready).done, true);
  assert.ok(render(ready, true).includes('資料全部完成'));
  assert.equal(render(ready, true).includes('form-missing-alert'), false, 'corrected hour hides stale field error');
}
assert.equal(dualChartHourStatus({...base, birthHourBranch:'wu', birthTime:'11:30'}).done, true);
console.log('PASS: scoped dual-chart readiness and rendered form; unknown defaults preserved, 子時 segment required, corrected alert cleared');
