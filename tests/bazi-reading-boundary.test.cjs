const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const three = require('../.three-in-one-build/lib/three-in-one.js');
function load(file, dependencies) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module: mod, exports: mod.exports, Date, require: id => { assert.ok(id in dependencies, id); return dependencies[id]; } });
  return mod.exports;
}
async function main() {
  const birthInput = { birthDate: '1974-07-28', birthTime: '23:30', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' };
  const passed = await three.runThreeInOne(birthInput);
  three.assertThreeInOnePassed(passed);
  let current = passed, allowed = true, verifiedCalls = 0, generated = 0;
  const helper = load('lib/bazi-verified-reading.ts', { './three-in-one': { ...three, runThreeInOne: async input => {
    verifiedCalls++;
    assert.equal(input.birthTime, birthInput.birthTime);
    assert.equal(input.dayMaster, undefined, 'client facts never enter the engine');
    return current;
  } } });
  for (const mode of ['google', 'horror']) {
    const route = load(`app/api/bazi/${mode}-reading/route.ts`, {
      'next/server': { NextResponse: { json: Response.json } },
      '@/lib/bazi-traditional-gate': { getBaziTraditionalOutputGate: () => ({ interpretationReady: allowed }) },
      '@/lib/bazi-verified-reading': helper,
      '@/lib/iching-engine': { formatHexagramLine: reading => { generated++; assert.deepEqual(reading, passed.result.yijing.reading); return 'verified birth hexagram'; } },
      '@/lib/iching-psychology': { buildEmpathicFromHexagram: () => ({}), patternNameOf: () => 'verified', formatGhostDecoding: () => 'verified' },
    });
    const call = body => route.POST(new Request('http://localhost/test', { method: 'POST', body: JSON.stringify(body) }));
    allowed = true; current = passed;
    const body = { birthInput, shortName: '合成', dayMaster: 'CLIENT_FORGED', structure: 'CLIENT_FORGED', ready: true };
    const ok = await call(body);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('cache-control'), 'no-store');
    assert.equal((await ok.json()).reading.includes('CLIENT_FORGED'), false);
    const afterGood = generated;
    for (const bad of [{}, { ...body, birthInput: undefined }, { ...body, birthInput: { ...birthInput, timeUnknown: true } }, { ...body, birthInput: { ...birthInput, birthDate: '2023-02-29' } }, { ...body, birthInput: { ...birthInput, birthTime: '' } }]) {
      assert.equal((await call(bad)).status, 422);
      assert.equal(generated, afterGood, 'invalid input must not use local fallback or an older result');
    }
    for (const mutate of [
      value => { value.result.bazi.hour = '甲子'; },
      value => { value.trace = value.trace.filter(item => item !== 'VERIFYING_FOUR_PILLARS'); },
      value => { value.result.yijing.certificate.chartFingerprint = 'other-chart'; },
      value => { value.result.ziwei.analysis.bazi.day = '甲子'; },
    ]) {
      current = structuredClone(passed); mutate(current);
      const response = await call(body);
      assert.equal(response.status, 422);
      assert.equal((await response.json()).reading, undefined);
      assert.equal(generated, afterGood);
    }
    current = passed; allowed = false;
    const beforeBlocked = verifiedCalls;
    assert.equal((await call(body)).status, 409);
    assert.equal(verifiedCalls, beforeBlocked);
  }
  console.log('PASS: both Bazi reading routes reject forged facts, missing time, changed pillars/fingerprint/order and stale output');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
