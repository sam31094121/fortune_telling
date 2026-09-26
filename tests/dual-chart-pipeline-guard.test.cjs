const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const input = { birthDate: '1974-07-28', birthTime: '09:30', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' };
const code = ts.transpileModule(fs.readFileSync('lib/dual-chart.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function scenario({ ready = true, ziweiPassed = true, mismatch = false, sourceReady = true } = {}) {
  const calls = [];
  const pillars = Object.fromEntries(['year', 'month', 'day', 'hour'].map(key => [key, { ganZhi: '甲子' }]));
  const core = { pillars, verification: { readyForInterpretation: ready, pillarsVerified: true, calendarVerified: true } };
  const result = { input, professionalChart: {
    pillarDetails: Object.fromEntries(Object.keys(pillars).map(key => [key, { ganzhi: mismatch && key === 'hour' ? '乙丑' : '甲子' }])),
    traditionalInterpretationGate: { coreReady: sourceReady },
  } };
  const module = { exports: {} };
  const deps = {
    './bazi/engine': {},
    './three-core-engine': { runBaziLayer: () => { calls.push('bazi'); return { core }; } },
    './bazi-traditional-gate': { getBaziTraditionalOutputGate: () => ({ coreReady: true }) },
    './ziwei/engine': {
      hourToTimeIndex: () => 5,
      createZiweiCore: () => { calls.push('ziwei'); return { validation: { passed: ziweiPassed } }; },
      createZiweiAstrolabe: () => { calls.push('output'); throw new Error('OUTPUT_REACHED'); },
    },
    './bazi-engine': { analyzeBazi: () => { calls.push('professional'); return result; } },
    './bazi-professional-result-v5': { attachBaziProfessionalCoreV5: value => value },
    'lunar-typescript': {},
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: id => deps[id] });
  return { calls, run: () => module.exports.calculateDualChart(input) };
}
let check = scenario({ ready: false });
assert.throws(check.run, /八字資料核對未通過/);
assert.deepEqual(check.calls, ['bazi'], 'failed Bazi must stop before Ziwei');
check = scenario({ ziweiPassed: false });
assert.throws(check.run, /命盤結構驗證未通過/);
assert.deepEqual(check.calls, ['bazi', 'ziwei']);
for (const failure of [{ mismatch: true }, { sourceReady: false }]) {
  check = scenario(failure);
  assert.throws(check.run, /命盤資料核對未通過/);
  assert.deepEqual(check.calls, ['bazi', 'ziwei', 'professional'], 'mismatched/uncertified output must stop');
}
check = scenario();
assert.throws(check.run, /OUTPUT_REACHED/);
assert.deepEqual(check.calls, ['bazi', 'ziwei', 'professional', 'output']);
console.log('PASS: dual-chart rejects upstream failure and hour-pillar mismatch before output');
