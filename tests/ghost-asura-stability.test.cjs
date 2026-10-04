const assert = require('node:assert/strict');
const path = require('node:path');
const load = require('./helpers/load-iching-shensha-ui.cjs');
const cache = new Map();
const get = file => load(file, 'zh-Hant', cache);
const feature = get('features/ghost-asura/index.ts');
const { calculateDualChart } = get('lib/dual-chart.ts');
const input = { birthDate: '1974-06-28', birthTime: '17:30', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' };
const raw = calculateDualChart(input);
const clone = value => JSON.parse(JSON.stringify(value));
const plain = value => JSON.parse(JSON.stringify(value));
const rows = feature.adaptVerifiedShenSha({ result: raw }).records;
const names = items => Object.fromEntries(items.map(x => [x.ruleId, x.displayName]));
const baseNames = names(feature.translateVerifiedRecords(rows));
assert.deepEqual(names(feature.translateVerifiedRecords([...rows].reverse())), baseNames,
  'Coverage order must never rename an existing imprint');
for (const row of rows) {
  assert.equal(feature.translateVerifiedRecords([row])[0].displayName, baseNames[row.ruleId],
    'An imprint keeps its name when calculated alone');
}
assert.deepEqual(names(feature.translateVerifiedRecords(rows.map(x => ({ ...x, originalName: '改用別名' })))), baseNames,
  'Raw name aliases cannot replace stable rule-ID mappings');
const extra = Array.from({ length: 300 }, (_, i) => ({
  resultId: `synthetic-${i}`, ruleId: `synthetic-${i}`, originalName: `合成項目${i}`,
  matched: i % 2 === 0, pillars: i % 2 === 0 ? ['year', 'hour'] : [],
  resultBatchId: rows[0].resultBatchId, motherVersion: rows[0].motherVersion,
  backendStatus: i % 2 === 0 ? 'MATCHED' : 'NOT_MATCHED',
}));
const expanded = feature.translateVerifiedRecords([...extra, ...rows]);
assert.equal(new Set(expanded.map(x => x.displayName)).size, expanded.length, 'No collision among 365 translated IDs');
assert.deepEqual(names(expanded.slice(300)), baseNames, 'Adding extensions never renames existing IDs');
assert.deepEqual(names(feature.translateVerifiedRecords([...extra].reverse())), names(expanded.slice(0, 300)));

const before = JSON.stringify(raw);
const reading = feature.buildGhostAsuraReading({ result: raw });
assert.equal(reading.guard.status, 'PASSED');
assert.equal(JSON.stringify(raw), before, 'Translation must not mutate backend data');
const rawAgain = calculateDualChart(input);
assert.deepEqual(plain(rawAgain.specialStars.coverage), plain(raw.specialStars.coverage), 'Same input and version has identical raw output');
const different = calculateDualChart({ ...input, birthDate: '1990-02-15', gender: 'female' });
assert.notDeepEqual(plain(different.specialStars.coverage), plain(raw.specialStars.coverage));
assert.deepEqual(plain(calculateDualChart(input).specialStars.coverage), plain(raw.specialStars.coverage), 'Another person cannot pollute a later calculation');
function invalid(label, mutate) {
  const broken = clone(raw); mutate(broken);
  const checked = feature.buildGhostAsuraReading({ result: broken });
  assert.equal(checked.guard.status, 'FAILED', label);
}
invalid('Unknown pillar cannot disappear silently', r => { r.specialStars.coverage.find(x => x.id === 'yima').matchedPillars = ['future']; });
invalid('Matched result needs a pillar', r => { r.specialStars.coverage.find(x => x.id === 'yima').matchedPillars = []; });
invalid('Duplicate result IDs must fail', r => r.specialStars.coverage.push(r.specialStars.coverage[0]));
invalid('A missing rule cannot redefine completeness', r => r.specialStars.coverage.pop());
invalid('Unregistered version requires a reviewed contract', r => { r.specialStars.version = 'FUTURE_VERSION'; });
invalid('Unknown birth hour must not produce a complete reading', r => { r.core.pillars.hour = null; });
invalid('Core verification is required', r => { r.core.verification.readyForInterpretation = false; });
invalid('Malformed coverage returns a visible failed reading rather than throwing', r => { r.specialStars.coverage = {}; });
invalid('Null rows return a failed reading', r => { r.specialStars.coverage[0] = null; });
invalid('Malformed pillar arrays return a failed reading', r => { r.specialStars.coverage[0].matchedPillars = {}; });
invalid('Inherited object properties are not pillar aliases', r => { r.specialStars.coverage.find(x => x.id === 'yima').matchedPillars = ['constructor']; });
invalid('A not-matched record cannot carry a hit', r => { r.specialStars.coverage.find(x => x.status === 'NOT_MATCHED').matchedPillars = ['year']; });
invalid('An unknown combination member cannot be silently omitted', r => {
  r.specialStars.iching.state = 'READY';
  r.specialStars.iching.combos = [{ id: 'bad-combo', title: 'test', members: ['yima', 'missing-id'], pillar: 'year', text: 'test' }];
});
assert.equal(reading.provenance.verifiedRuleIds.length, 6);
assert.equal(reading.provenance.referenceRuleIds.length, 59);
assert.equal(reading.provenance.referenceRuleIds.filter(id => rows.find(x => x.ruleId === id).matched).length, 14,
  'Reference-method hits must not become source-verified through translation');
assert.equal(feature.guardCompleteness({ backend: rows, translated: feature.translateVerifiedRecords(rows).map((x, i) => i ? x : { ...x, ruleId: 'wrong' }), displayed: reading.items }).status, 'FAILED');
const poisonedLegacy = clone(raw);
poisonedLegacy.specialStars.asura = { items: [{ id: 'yima', displayName: '舊稱號不得覆蓋' }], ready: true };
assert.deepEqual(plain(feature.buildGhostAsuraReading({ result: poisonedLegacy })), plain(reading),
  'Legacy Asura payload cannot override the new translation');
const translationCache = new Map();
load('features/ghost-asura/index.ts', 'zh-Hant', translationCache);
const legacyRuntimeImports = [...translationCache.keys()].map(file => path.relative(path.resolve(__dirname, '..'), file).replaceAll('\\', '/'))
  .filter(file => file.startsWith('lib/') && /asura/i.test(file));
assert.deepEqual(legacyRuntimeImports, [], 'New Asura translation must not load any legacy Asura module at runtime');
console.log('PASS: version/ID/pillar/provenance contract, immutable deterministic backend, 300 synthetic extensions, order/alias/addition isolation, legacy runtime isolation');
