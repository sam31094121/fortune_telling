const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const target = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('components/bazi/customer/BaziCalculationProgress.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
vm.runInNewContext(code, { module: target, exports: target.exports, require: id => id === '@/components/HomeTranslatedText' ? () => null : require(id) });
const { toBaziProgressView } = target.exports;
const sample = {
  input: {},
  dayMaster: { stem: '丙', level: '身弱' },
  gods: { usefulGod: '木', joyGod: '火', avoidGod: '水' },
  aiDeepAnalysis: { summary: '已生成但尚未核對的段落' },
  professionalChart: {
    pipeline: { completedStates: ['INPUT_VALIDATED', 'CORE_COMPLETED', 'PROFESSIONAL_VALIDATED', 'API_READY'] },
    traditionalInterpretationGate: { coreReady: true, interpretationReady: false, shenShaReady: false },
    strengthFactors: [{}], structurePattern: { primaryPattern: '未核對格局' }, shenSha: [{ name: '天乙貴人' }],
  },
};
const protectedKeys = ['strength', 'usefulGod', 'avoidGod', 'pattern', 'teacher', 'shenSha'];
const current = toBaziProgressView(sample, false);
for (const key of protectedKeys) assert.equal(current.items.find(item => item.key === key).status, 'UNAVAILABLE', `${key} cannot be checked complete merely because data exists`);
assert.equal(current.items.find(item => item.key === 'dayMaster').status, 'COMPLETED');
assert.notEqual(current.overallStatus, 'COMPLETED');
assert.equal(current.fieldTraces.find(trace => trace.field === 'shenSha').api, 'VALID_VALUE');
assert.equal(current.fieldTraces.find(trace => trace.field === 'shenSha').frontend, 'OUTPUT_WITHHELD', 'present but withheld data must not be reported as rendered');
sample.professionalChart.traditionalInterpretationGate.shenShaReady = true;
sample.professionalChart.traditionalInterpretationGate.shenShaRules = { tianyi: { ready: true } };
const shenshaOnly = toBaziProgressView(sample, false);
assert.equal(shenshaOnly.items.find(item => item.key === 'shenSha').status, 'COMPLETED');
assert.equal(shenshaOnly.items.find(item => item.key === 'teacher').status, 'UNAVAILABLE');
sample.professionalChart.traditionalInterpretationGate.interpretationReady = true;
for (const key of protectedKeys) assert.equal(toBaziProgressView(sample, false).items.find(item => item.key === key).status, 'COMPLETED');
assert.equal(toBaziProgressView(sample, false).fieldTraces.find(trace => trace.field === 'shenSha').frontend, 'NOT_EVALUATED', 'eligible data still does not prove DOM rendering');
delete sample.professionalChart.traditionalInterpretationGate;
for (const key of protectedKeys) assert.equal(toBaziProgressView(sample, false).items.find(item => item.key === key).status, 'UNAVAILABLE');
console.log('PASS: progress checkmarks follow output eligibility, not merely field presence');
