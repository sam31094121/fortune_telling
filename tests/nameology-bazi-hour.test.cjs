require('./nameology-no-blood.test.cjs');
const assert = require('node:assert/strict');
const { buildNameologyBaziCrossCheck, normalizeNameologyShichen } = require('../lib/nameology-bazi-crosscheck.ts');
const { createBaziCore, BRANCHES } = require('../lib/bazi/engine.ts');
const input = { name: '王小明', gender: 'male', birthDate: '1990-01-01' };
const characters = [{ char: '王', element: '土' }, { char: '小', element: '金' }, { char: '明', element: '火' }];
const partial = buildNameologyBaziCrossCheck(input, characters);
assert.equal(partial.chartMode, 'PARTIAL_BAZI');
assert.equal(partial.pillars.hour, null);
assert.equal(partial.comparison.reduce((sum, row) => sum + row.baziCount, 0), 6);
assert.equal(normalizeNameologyShichen('unknown'), null);
for (const invalid of [-1, 12, 1.5, '6', NaN]) assert.throws(() => normalizeNameologyShichen(invalid));
const hours = new Set();
for (let shichen = 0; shichen < 12; shichen++) {
  const result = buildNameologyBaziCrossCheck({ ...input, shichen }, characters);
  const direct = createBaziCore({ ...input, birthTimeKnown: true, traditionalHour: BRANCHES[shichen], calendarType: 'SOLAR', timezone: 'Asia/Taipei' });
  assert.equal(result.chartMode, 'FULL_BAZI');
  assert.equal(result.pillars.hour, direct.pillars.hour.ganZhi);
  assert.equal(result.comparison.reduce((sum, row) => sum + row.baziCount, 0), 8);
  assert.deepEqual(result.comparison.map(row => row.nameCharacters), partial.comparison.map(row => row.nameCharacters));
  assert.deepEqual(result, buildNameologyBaziCrossCheck({ ...input, shichen }, characters));
  hours.add(result.pillars.hour);
}
assert.equal(hours.size, 12);
console.log('PASS: unknown time has no hour pillar; all 12 hours match existing core and are reproducible');
