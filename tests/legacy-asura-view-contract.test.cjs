// Explicit 2026-10-04 build-blocker exception: old display consumes its actual
// backend contract. This is not a migration of the new /ghost-asura page.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./helpers/load-iching-shensha-ui.cjs');
const target = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/IchingShenShaAsuraSection.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, { module: target, exports: target.exports, process: { env: { NODE_ENV: 'production' } }, require(id) {
  if (id.endsWith('.module.css')) return {};
  return id.startsWith('@/') ? load(`${id.slice(2)}.ts`) : require(id);
} });
const { IchingShenShaAsuraSection } = target.exports;
const render = view => renderToStaticMarkup(React.createElement(IchingShenShaAsuraSection, { view }));
const narrative = mark => Object.fromEntries(['breakPoint', 'lockCore', 'severing', 'establish', 'action'].map(key => [key, `${mark}-${key}`]));
const view = {
  state: 'READY', opening: '後端開場', closing: '後端收場', disclaimer: '既有聲明',
  groups: [
    { pillar: 'year', intro: '年柱簡介', lines: [{ originalName: '同名原始項', displayName: '年柱印記', tone: null, narrative: narrative('年柱專用') }] },
    { pillar: 'day', intro: '日柱簡介', lines: [{ originalName: '同名原始項', displayName: '日柱印記', tone: '提醒', narrative: narrative('日柱專用') }] },
    { pillar: 'hour', intro: '空柱簡介', lines: [] },
  ],
  formations: [{ title: '後端陣法', narrative: '後端陣法內容' }],
};
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const before = JSON.stringify(view);
const html = render(freeze(view));
assert.equal(JSON.stringify(view), before);
assert.equal((html.match(/年柱專用-breakPoint/g) || []).length, 1, 'Same original name in another pillar must not duplicate this pillar narrative');
assert.equal((html.match(/日柱專用-breakPoint/g) || []).length, 1);
const year = html.split('data-pillar="year"')[1].split('data-pillar="day"')[0];
const day = html.split('data-pillar="day"')[1].split('data-pillar="hour"')[0];
assert.match(year, /年柱印記/);
assert.doesNotMatch(year, /日柱印記|data-shensha-tone/);
assert.match(day, /日柱印記/);
assert.doesNotMatch(day, /年柱印記/);
assert.match(day, /data-shensha-tone="提醒"/);
assert.match(html, /後端陣法內容/, 'Formation reads backend narrative, not a nonexistent content field');
assert.doesNotMatch(html, /<details[^>]*\bopen\b|data-shensha-id|undefined/);
assert.match(html, /本柱無印記/);
assert.equal(render(undefined), '');
assert.match(render({ state: 'BLOCKED', reason: '後端未就緒' }), /後端未就緒/);
console.log('PASS: legacy view consumes the real nullable-tone/group/narrative contract, same-name multi-pillar items do not duplicate, no invented ID, immutable input');

// Exercise the actual backend contract as well as the independent adversarial
// fixture above. This checks delivery, not the validity of traditional rules.
const { calculateDualChart } = load('lib/dual-chart.ts');
for (const input of [
  { birthDate: '1990-01-01', birthTime: '05:30', gender: 'male' },
  { birthDate: '2001-10-15', birthTime: '21:10', gender: 'female' },
]) {
  const result = calculateDualChart({ ...input, calendarType: 'solar', timezone: 'Asia/Taipei' });
  const actual = result.specialStars.asura;
  assert.equal(actual.state, 'READY');
  const snapshot = JSON.stringify(actual);
  const rendered = render(freeze(actual));
  assert.equal(JSON.stringify(actual), snapshot, 'Rendering cannot mutate the shared backend result');
  assert.equal((rendered.match(/data-matched="true"/g) || []).length,
    actual.groups.reduce((count, group) => count + group.lines.length, 0), 'All actual backend hits render once');
  for (const [index, group] of actual.groups.entries()) {
    const start = rendered.indexOf(`data-pillar="${group.pillar}"`);
    assert.ok(start >= 0, 'Actual backend pillar is retained');
    const next = actual.groups[index + 1];
    const end = next ? rendered.indexOf(`data-pillar="${next.pillar}"`, start + 1) : rendered.length;
    const column = rendered.slice(start, end);
    for (const line of group.lines) assert.ok(column.includes(line.displayName), 'Actual title stays in its original pillar');
  }
  for (const formation of actual.formations) assert.ok(rendered.includes(formation.narrative), 'Actual formation narrative is not dropped');
}
console.log('PASS: two synthetic real-backend results preserve every pillar, hit, formation and original payload');
