const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const output = path.resolve('.tmp/dual-chart-recalculation-stability');
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), 'lib/dual-chart.ts', '--outDir', output,
  '--rootDir', '.', '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node',
  '--resolveJsonModule', '--esModuleInterop', '--types', 'node', '--skipLibCheck'], { stdio: 'pipe', windowsHide: true });
const { calculateDualChart } = require(path.join(output, 'lib/dual-chart.js'));
const pillars = ['year', 'month', 'day', 'hour'];
const stableDecisions = result => ({
  // Compare decisions, not per-request audit IDs or deliberately randomized
  // Asura closing prose. This is a regression test, not a runtime hash gate.
  input: result.bazi.input,
  engine: result.core.engine,
  pillars: result.core.pillars,
  raw: result.specialStars.raw,
  byPillar: result.specialStars.byPillar,
  coverage: result.specialStars.coverage,
  card: result.specialStars.card,
});
for (const birthTime of ['05:30', '07:30', '11:30', '15:30', '19:30', '21:30', '23:30', '00:30']) {
  const input = { birthDate: '1990-01-01', birthTime, gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' };
  const a = calculateDualChart(input);
  const b = calculateDualChart(Object.fromEntries(Object.entries(input).reverse()));
  assert.deepEqual(stableDecisions(a), stableDecisions(b), `${birthTime}: same input/version yields the same decisions`);
  for (const key of pillars) {
    const column = a.specialStars.card.columns.find(c => c.pillar === key);
    assert.deepEqual(column.hits.map(hit => [hit.id, hit.name]), a.specialStars.byPillar[key].map(hit => [hit.id, hit.name]));
    assert.equal(new Set(column.hits.map(hit => hit.id)).size, column.hits.length);
  }
}
console.log('PASS: 8 repeated real-backend cases (including early/late Zi), decision equality, keyed column delivery and no duplicate hits');
