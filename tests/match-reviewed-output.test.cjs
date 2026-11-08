const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
const bazi = load('lib/bazi-engine.ts');
const gates = load('lib/bazi-traditional-gate.ts');

function loadRoute({ corruptFoundation = false, approvedSources = false } = {}) {
  const module = { exports: {} };
  const source = fs.readFileSync('app/api/match-generate/route.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  let generated = 0;
  vm.runInNewContext(code, {
    module, exports: module.exports, Date, console: { error() {}, info() {} },
    require(id) {
      if (id === '@/lib/bazi-engine') return { ...bazi, analyzeBazi(input) {
        const chart = bazi.analyzeBazi(input);
        if (corruptFoundation) chart.pillars.day = { ...chart.pillars.day, stem: chart.pillars.day.stem === '甲' ? '乙' : '甲' };
        return chart;
      } };
      if (id === '@/lib/bazi-traditional-gate') return { ...gates, getBaziTraditionalOutputGate(ready) {
        const gate = gates.getBaziTraditionalOutputGate(ready);
        return approvedSources ? { ...gate, interpretationReady: true, redLuanReady: true, withheldFields: [] } : gate;
      } };
      if (id === '@google/genai') {
        const actual = require(id);
        return { ...actual, GoogleGenAI: class { constructor() { generated++; throw new Error('external generation must remain disabled'); } } };
      }
      if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
      return require(id);
    },
  });
  return { ...module.exports, generated: () => generated };
}

const personA = { name: '測試甲', birthDate: '1990-05-20', birthHourBranch: '未', bloodType: 'unknown', gender: 'male' };
const personB = { name: '測試乙', birthDate: '1992-08-16', birthHourBranch: '酉', bloodType: 'unknown', gender: 'female' };
function request(a = personA, b = personB) {
  return new Request('http://localhost/api/match-generate', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ personA: a, personB: b, verified: true, redLuanReady: true }),
  });
}

test('both reviewed match charts open existing outputs without external generation', async () => {
  const route = loadRoute();
  const response = await route.POST(request());
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.baziFoundation.traditionalGate.interpretationReady, true);
  assert.equal(result.baziFoundation.traditionalGate.redLuanReady, true);
  assert.ok(result.redLuanHeartbeat);
  assert.ok(result.fiveElementMatch);
  assert.equal(route.generated(), 0);
});

test('either unknown time stays blocked even with fully approved source status', async () => {
  for (const side of ['A', 'B']) {
    const route = loadRoute({ approvedSources: true });
    const a = side === 'A' ? { ...personA, birthHourBranch: 'unknown' } : personA;
    const b = side === 'B' ? { ...personB, birthHourBranch: 'unknown' } : personB;
    const response = await route.POST(request(a, b));
    const result = await response.json();
    assert.equal(response.status, 200, 'basic partial chart is still available');
    assert.equal(result.baziFoundation.traditionalGate.interpretationReady, false);
    assert.equal(result.baziFoundation.traditionalGate.redLuanReady, false);
    assert.equal(result.redLuanHeartbeat, undefined);
    assert.equal(result.fiveElementMatch, undefined);
    assert.equal(route.generated(), 0);
  }
});

test('recomputed foundation must match the verified chart before release', async () => {
  const route = loadRoute({ corruptFoundation: true });
  const response = await route.POST(request());
  const result = await response.json();
  assert.equal(response.status, 503);
  assert.equal(result.redLuanHeartbeat, undefined);
  assert.equal(result.fiveElementMatch, undefined);
  assert.equal(route.generated(), 0);
});
