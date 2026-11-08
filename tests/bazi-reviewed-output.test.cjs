const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
const { runThreeInOne } = load('lib/three-in-one.ts');
const { getReviewedBaziOutputGate } = load('lib/bazi-reviewed-output.ts');
const { getBaziTraditionalOutputGate } = load('lib/bazi-traditional-gate.ts');

test('reviewed output opens existing capabilities without changing source evidence', async () => {
  const result = await runThreeInOne({ birthDate: '1990-05-20', birthTime: '14:00', gender: 'male' });
  const before = JSON.stringify(result);
  const source = getBaziTraditionalOutputGate(true);
  const gate = getReviewedBaziOutputGate(result);
  assert.equal(gate.interpretationReady, true);
  assert.equal(gate.redLuanReady, true);
  for (const key of ['coreStatus', 'classicsStatus', 'fiveGodsStatus', 'redLuanStatus', 'shenShaStatus']) {
    assert.equal(gate[key], source[key], key);
  }
  assert.equal(JSON.stringify(gate.shenShaRules), JSON.stringify(source.shenShaRules));
  assert.equal(JSON.stringify(result), before, 'must not rewrite the chart');
  for (const change of [
    r => { r.verification.ziwei = false; },
    r => { r.result.yijing.certificate.chartFingerprint = 'forged'; },
    r => { r.fourPillars.ziwei.day = '甲子'; },
    r => { r.trace.reverse(); },
  ]) {
    const invalid = structuredClone(result); change(invalid);
    assert.throws(() => getReviewedBaziOutputGate(invalid));
  }
  assert.throws(() => getReviewedBaziOutputGate({ status: 'PASSED', verified: true }));
  const unknown = await runThreeInOne({ birthDate: '1990-05-20', birthTime: null, gender: 'male' });
  assert.throws(() => getReviewedBaziOutputGate(unknown));
});
