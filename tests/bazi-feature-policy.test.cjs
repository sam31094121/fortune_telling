const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { evaluateFeatures, evaluateReviewedFeatures } = require('./bazi-feature-complete.test.cjs');

test('reviewed feature availability verifies the actual standalone response and preserves source evidence', async () => {
  const registryFile = 'docs/技能戰鬥檔案/八字/來源登記.json';
  const registryBefore = fs.readFileSync(registryFile, 'utf8');
  const source = evaluateFeatures();
  const reviewed = await evaluateReviewedFeatures();
  const byId = (report, id) => report.capabilities.find(item => item.id === id);
  for (const id of ['TEACHER_INTERPRETATION', 'FIVE_GODS']) {
    assert.equal(byId(reviewed, id).ready, reviewed.standalone.passed
      && (id === 'TEACHER_INTERPRETATION' ? reviewed.standalone.teacherReady : reviewed.standalone.godsReady),
      `${id}: readiness must come from the actual API and existing adapter, not source status replacement`);
  }
  assert.equal(reviewed.standalone.passed, true);
  assert.equal(reviewed.standalone.rejectedForgedReview, true);
  assert.equal(reviewed.standalone.noStore, true);
  assert.equal(reviewed.backendReview.passed, true);
  assert.equal(byId(reviewed, 'RED_LUAN').ready, true);
  assert.equal(reviewed.apiCapabilities.every(item => item.ready), true);
  assert.equal(reviewed.ok, reviewed.capabilities.every(item => item.ready)
    && reviewed.apiCapabilities.every(item => item.ready) && reviewed.backendReview.passed);
  assert.deepEqual(reviewed.sourceAudit, source);
  assert.equal(fs.readFileSync(registryFile, 'utf8'), registryBefore, 'source evidence is read-only');
});

test('approved static sources cannot bypass per-request review in the actual Bazi POST', async () => {
  const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
  const engine = load('lib/bazi-engine.ts');
  const professional = load('lib/bazi-professional-result-v5.ts');
  const verified = load('lib/bazi-verified-reading.ts');
  const gateModule = load('lib/bazi-traditional-gate.ts');
  let mode = 'valid', reviewCalls = 0, expectedPillars;
  const dependencies = {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/bazi-engine': engine,
    '@/lib/bazi-professional-result-v5': {
      ...professional,
      attachBaziProfessionalCoreV5(result, input) {
        const actual = professional.attachBaziProfessionalCoreV5(result, input);
        expectedPillars = structuredClone(actual.pillars);
        // A future approved-source state is synthetic, in memory only. It must
        // never stand in for this request's backend chart review.
        actual.professionalChart.traditionalInterpretationGate = {
          ...actual.professionalChart.traditionalInterpretationGate,
          coreReady: true,
          classicsStatus: 'VERIFIED', fiveGodsStatus: 'VERIFIED', redLuanStatus: 'VERIFIED',
          interpretationReady: true, redLuanReady: true, withheldFields: [],
        };
        return actual;
      },
    },
    '@/lib/bazi-verified-reading': {
      async verifiedBaziReading(input) {
        reviewCalls++;
        if (mode === 'throws') throw new Error('synthetic review failure');
        const actual = await verified.verifiedBaziReading(input);
        if (mode === 'mismatched') actual.bazi.day = actual.bazi.day === '甲子' ? '乙丑' : '甲子';
        return actual;
      },
    },
    '@/lib/bazi-traditional-gate': gateModule,
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('app/api/bazi/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, console,
    require(id) { assert.ok(id in dependencies, `unexpected dependency: ${id}`); return dependencies[id]; },
  });
  const input = { name: '工程測試', birthDate: '1990-05-20', birthTime: '14:00', gender: 'male', country: '台灣', city: '台北', calendarType: 'solar' };
  const call = async extra => {
    const response = await module.exports.POST(new Request('http://localhost/api/bazi', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...input, verified: true, interpretationReady: true, ...extra }),
    }));
    assert.equal(response.status, 200, 'basic chart remains available');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.deepEqual(payload.data.pillars, expectedPillars, 'review cannot replace the original chart');
    return payload.data.professionalChart.traditionalInterpretationGate;
  };
  const positive = await call({});
  assert.equal(positive.interpretationReady, true);
  assert.equal(positive.redLuanReady, true);
  for (const scenario of [
    { mode: 'valid', extra: { timeUnknown: true, birthTimeKnown: false }, calls: 0 },
    { mode: 'throws', extra: {}, calls: 1 },
    { mode: 'mismatched', extra: {}, calls: 1 },
  ]) {
    mode = scenario.mode;
    const before = reviewCalls;
    const gate = await call(scenario.extra);
    assert.equal(reviewCalls - before, scenario.calls);
    assert.equal(gate.coreReady, true);
    assert.equal(gate.interpretationReady, false, scenario.mode);
    assert.equal(gate.redLuanReady, false, scenario.mode);
    assert.deepEqual(gate.withheldFields, [...gateModule.BAZI_WITHHELD_INTERPRETATION_FIELDS]);
    assert.equal(gate.classicsStatus, 'VERIFIED', 'source status does not get falsified to force blocking');
  }
});
