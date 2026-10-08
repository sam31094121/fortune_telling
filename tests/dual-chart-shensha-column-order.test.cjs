const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./helpers/load-iching-shensha-ui.cjs');
const { ShenShaCard, PillarGrid } = load('app/dual-chart/BaziChart.tsx');
const originalOrder = ['year', 'month', 'day', 'hour'];
const labels = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
const columns = Object.freeze(originalOrder.map(pillar => Object.freeze({
  pillar, label: labels[pillar], state: 'READY', emptyText: '', note: '',
  hits: [{ id: `test-${pillar}`, name: `${labels[pillar]}測試內容`, tone: '福氣',
    rule: `${pillar}原判定`, sourceLabel: `${pillar}原來源`, anchor: `test-${pillar}` }],
})));
const result = {
  specialStars: { card: { state: 'READY', columns } },
  core: { shenSha: [], twelveStages: Object.fromEntries(originalOrder.map(key => [key, '長生'])) },
  shenShaVisibility: { allowed: new Set(), conflicts: [] },
  bazi: { professionalChart: {
    pillarDetails: Object.fromEntries(originalOrder.map(key => [key, { stemTenGod: '比肩', ganzhi: '甲子' }])),
    hiddenStemStructure: Object.fromEntries(originalOrder.map(key => [key, [{ stem: '癸', tenGod: '正印' }]])),
  } },
};
const before = JSON.stringify(result);
const render = printMode => renderToStaticMarkup(React.createElement(ShenShaCard, { result, printMode }));
const extract = html => [...html.matchAll(/<div\b[^>]*data-shensha-column="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g)]
  .map(([, pillar, content]) => ({ pillar, content }));
const screen = extract(render(false));
const print = extract(render(true));
assert.deepEqual(screen.map(col => col.pillar), ['hour', 'day', 'month', 'year']);
assert.deepEqual(print.map(col => col.pillar), originalOrder, 'Unrequested print layout stays unchanged');
for (const column of screen) {
  assert.equal(column.content, print.find(col => col.pillar === column.pillar).content,
    'Move the whole card: heading, result, source, link and markup must stay together');
  assert(column.content.includes(`<h4>${labels[column.pillar]}</h4>`));
  assert(column.content.includes(`data-shensha-result="test-${column.pillar}"`));
  assert(column.content.includes(`${labels[column.pillar]}測試內容`));
}
assert.equal(JSON.stringify(result), before, 'Display ordering must not mutate backend data');
const embedded = renderToStaticMarkup(React.createElement(PillarGrid, { result, shenshaCards: true }));
const moved = extract(embedded);
assert.deepEqual(moved, screen.map(col => ({ ...col, content: col.content.replace(/<h4>[^<]*<\/h4>/, '') })),
  'Embedded screen/print cells retain original card contents and links, omitting only repeated pillar headings');
assert.equal((embedded.match(/scope="col"/g) ?? []).length, 4, 'Keep all four original table column headings');
for (const key of ['hour', 'day', 'month', 'year']) {
  const cell = embedded.match(new RegExp(`<td data-shensha-pillar="${key}">([\\s\\S]*?)<\\/td>`))?.[1];
  assert(cell?.includes(`data-shensha-column="${key}"`), 'Each whole card belongs under the matching Bazi pillar');
  assert(cell?.includes(`href="#test-${key}"`), 'The original detail action remains a link');
}
const remaining = renderToStaticMarkup(React.createElement(ShenShaCard, { result, hidePillarCards: true }));
assert.equal(extract(remaining).length, 0, 'No duplicate cards remain in the lower section');
assert(!remaining.includes('id="shensha-grid"'), 'Return-to-pillar anchor has only one destination');
const compact = renderToStaticMarkup(React.createElement(PillarGrid, { result, compact: true, shenshaCards: true }));
assert.equal(extract(compact).length, 0, 'Ziwei compact chart stays unchanged');
assert.equal(JSON.stringify(result), before, 'Embedding must not mutate backend data');
console.log('PASS: original interactive cards embedded under matching hour/day/month/year columns; no duplicates; compact chart and backend unchanged');

// Health must inspect the actual embedded layout, and still reject changed
// visible names, missing results, duplicate results and wrong pillar placement.
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const compiled = path.resolve('.tmp/dual-chart-shensha-column-order');
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), 'lib/dual-chart.ts', '--outDir', compiled,
  '--rootDir', '.', '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node',
  '--resolveJsonModule', '--esModuleInterop', '--types', 'node', '--skipLibCheck'], { stdio: 'pipe', windowsHide: true });
const { calculateDualChart } = require(path.join(compiled, 'lib/dual-chart.js'));
const actualResult = calculateDualChart({ birthDate: '1990-01-01', birthTime: '05:30', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' });
const { inspectShenShaRow, inspectShenShaDelivery, inspectShenShaCard, inspectShenShaSourceVerification } = require('../scripts/dual-chart-iching-shensha-display-check.cjs');
const actualGrid = renderToStaticMarkup(React.createElement(PillarGrid, { result: actualResult, shenshaCards: true }));
const actualTail = renderToStaticMarkup(React.createElement(ShenShaCard, { result: actualResult, hidePillarCards: true }));
const complete = actualGrid + actualTail;
const inspect = html => [...inspectShenShaRow(html).warnings, ...inspectShenShaDelivery(actualResult, inspectShenShaRow(html)), ...inspectShenShaCard(actualResult, html)];
assert.deepEqual(inspect(complete), [], 'Actual backend to embedded cards passes transport checks');
const firstHit = actualGrid.match(/<li\b[^>]*data-shensha-result="[^"]+"[^>]*>[\s\S]*?<\/li>/)?.[0];
assert(firstHit, 'Mutation tests must have a real rendered hit');
for (const [label, changed] of [
  ['missing', complete.replace(firstHit, '')],
  ['duplicate', complete.replace(firstHit, firstHit + firstHit)],
  ['visible name changed', complete.replace('>天狗</a>', '>其他名稱</a>')],
  ['wrong identifier', complete.replace('data-shensha-result="tiangou"', 'data-shensha-result="wrong-id"')],
  ['wrong pillar', complete.replace('data-shensha-column="hour"', 'data-shensha-column="day"')],
  ['folded grid', `<details>${complete}</details>`],
]) {
  assert.notEqual(changed, complete, `${label}: mutation was applied`);
  assert(inspect(changed).length > 0, `${label}: health still blocks incorrect delivery`);
}
assert(inspectShenShaSourceVerification(actualResult).length > 0, 'Transport success must not certify pending sources');
console.log('PASS: embedded-layout health reads linked visible names and rejects missing, duplicate, renamed, misidentified, wrong-pillar and folded results; source gate unchanged');
