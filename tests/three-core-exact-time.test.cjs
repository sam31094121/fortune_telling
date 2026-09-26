// Run after npm run test:bazi-ziwei-cross and npm run test:three-in-one.
const assert = require('node:assert/strict');
const engine = require('../.bazi-ziwei-cross-build/lib/bazi/engine.js');
const original = engine.createBaziCore;
let computations = 0;
engine.createBaziCore = (...args) => { computations++; return original(...args); };
const core = require('../.bazi-ziwei-cross-build/lib/three-core-engine.js');
const results = [];
for (const birthTime of ['00:01', '00:59', '20:10', '20:12', '23:01', '23:59']) {
  const input = { birthDate: '1974-07-07', birthTime, gender: 'male' };
  const before = computations;
  const result = core.computeThreeCore(input);
  assert.equal(computations - before, 1, 'exact-time pipeline must reuse one Bazi core');
  assert.equal(result.timePrecision, 'EXACT_TIME');
  core.assertThreeCoreConsistent(result);
  const independent = core.runZiweiLayer(input);
  assert.deepEqual(result.ziwei.analysis.allPalaces, independent.analysis.allPalaces, 'reuse does not alter Ziwei own chart');
  const { core: baziCore, bazi } = core.runBaziLayer(input);
  assert.equal(baziCore.calendar.normalizedDateTime.slice(11, 16), birthTime);
  const changedMinute = birthTime.slice(0, 3) + (birthTime.endsWith('01') ? '02' : '01');
  assert.equal(core.runIChingLayer({ input: { ...input, birthTime: changedMinute }, core: baziCore, bazi, ziwei: result.ziwei }).status, 'BLOCKED_RITUAL_INCOMPLETE');
  results.push(result);
}
assert.notEqual(results[2].bazi.month, results[3].bazi.month, 'minutes across Xiao Shu must not be replaced with a representative hour');
assert.equal(core.computeThreeCore({ birthDate: '1974-07-07', gender: 'male' }).iching.status, 'UNAVAILABLE_BIRTH_TIME_REQUIRED');
for (const birthTime of ['24:00', '9:00', '12:60']) assert.throws(() => core.computeThreeCore({ birthDate: '1974-07-07', gender: 'male', birthTime }));
assert.throws(() => core.computeThreeCore({ birthDate: '1974-07-07', gender: 'male', birthTime: '23:30', hourBranchIndex: 2 }));
assert.throws(() => core.computeThreeCore({ birthDate: '1974-07-07', gender: 'male', birthTime: '23:30', hourBranchIndex: null }));
console.log('PASS: exact minutes, early/late Zi, one-core reuse, independent Ziwei chart and mismatched-time blocking');
