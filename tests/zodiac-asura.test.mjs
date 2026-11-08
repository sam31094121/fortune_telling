import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { analyzeZodiac } from '../lib/zodiac-engine.ts';

// Compare against the approved pre-migration engine, not a copied expected formula.
const previous = execFileSync('git', ['show', 'e5c5f10:lib/zodiac-engine.ts'], { encoding: 'utf8' });
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(previous, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
  module, exports: module.exports, require: createRequire(new URL('../lib/zodiac-engine.ts', import.meta.url)), Date, console,
});
const plain = value => JSON.parse(JSON.stringify(value));
const cases = [
  { name: '測試甲', birthDate: '1990-05-20', birthTime: null, birthCityId: null },
  { name: '測試乙', birthDate: '1986-11-10', birthTime: '14:30', birthCityId: 'taipei' },
  { name: '測試丙', birthDate: '2000-02-29', birthTime: '09:00', birthCityId: null },
];
const skill = JSON.parse(fs.readFileSync('docs/技能戰鬥檔案/鬼魅阿修羅/西洋星座技能.json', 'utf8'));
const savedFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('Zodiac interpretation must not call an external model'); };
try {
  const outputs = cases.map(input => {
    const result = analyzeZodiac(input), baseline = module.exports.analyzeZodiac(input);
    const { readingBoundaries: _old, ...oldChart } = plain(baseline.professionalChart);
    const { readingBoundaries: _new, ...newChart } = plain(result.professionalChart);
    assert.deepEqual(newChart, oldChart, 'all chart points, precision, weights and distributions unchanged');
    for (const key of ['sign', 'moonSign', 'risingSign', 'input', 'precision', 'strengths', 'blindSpots', 'currentAdvice']) assert.deepEqual(plain(result[key]), plain(baseline[key]), key);
    assert.deepEqual(result.reinforcementPlan.priorities.map(p => [p.element, p.rank, p.needScore]), plain(baseline.reinforcementPlan.priorities.map(p => [p.element, p.rank, p.needScore])));
    assert.equal(result.engineVersion, 'zodiac_core_v5_asura');
    assert.equal(result.deepAnalysis.layer, 'asura_zodiac_deep_analysis');
    assert.ok(!JSON.stringify(result).includes('AI '));
    for (const priority of result.reinforcementPlan.priorities) assert.deepEqual(priority.actions, skill.tables.BRAND_ELEMENT_ACTIONS[priority.element]);
    assert.ok(result.deepAnalysis.coreNarrative.startsWith('阿修羅直說：'));
    assert.equal(result.distributionGuide.groups.length, 3);
    for (const [index, field] of ['elementDistribution', 'modalityDistribution', 'polarityDistribution'].entries()) {
      const values = result.professionalChart[field];
      const total = Object.values(values).reduce((a, b) => a + b, 0);
      assert.deepEqual(result.distributionGuide.groups[index].rows.map(row => row.key), Object.keys(values).filter(key => values[key] > 0));
      for (const row of result.distributionGuide.groups[index].rows) {
        assert.equal(row.value, values[row.key]);
        assert.equal(row.share, Math.round(row.value / total * 100));
        assert.ok(row.meaning.length && row.basis.length);
        assert.ok(row.value > 0, 'zero classifications are omitted from display');
      }
    }
    if (!input.birthTime) assert.equal(result.distributionGuide.note, skill.distributionCopy.sunOnly);
    if (!input.birthTime) assert.deepEqual(result.deepAnalysis.pointReadings.map(p => p.role), ['sun']);
    return result;
  });
  cases.toReversed().forEach(input => assert.deepEqual(analyzeZodiac(input), outputs[cases.indexOf(input)], 'no cross-person state'));
  assert.throws(() => analyzeZodiac({ birthDate: 'invalid' }));
  const runner = fs.readFileSync('lib/analysis-job-runner.ts', 'utf8');
  assert.ok(!runner.includes('buildZodiacDebugPrompt'));
  const pageSource = fs.readFileSync('app/zodiac/page.tsx', 'utf8');
  const guardSource = pageSource.slice(pageSource.indexOf('function isCurrentZodiacResult('), pageSource.indexOf('function activeStep('));
  const guardModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(guardSource + '\nmodule.exports = isCurrentZodiacResult;', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: guardModule });
  assert.equal(guardModule.exports(outputs[0]), true);
  assert.equal(guardModule.exports(module.exports.analyzeZodiac(cases[0])), false, 'old AI-labelled result cannot pass current result guard');
  assert.equal(guardModule.exports(null), false);
  console.log('PASS zodiac Asura: three input levels, chart/numbers preserved, source actions, no network generation, repeat/change/repeat');
} finally { globalThis.fetch = savedFetch; }
