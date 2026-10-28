const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
const core = load('lib/three-in-one.ts');

function moduleFrom(file, dependencies) {
  const m = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module: m, exports: m.exports, Date, console,
    require(id) { assert.ok(id in dependencies, `unexpected dependency: ${id}`); return dependencies[id]; },
  });
  return m.exports;
}

for (const route of ['google-reading', 'horror-reading']) {
  test(`${route}: raw birth only, no name-derived chart, no stale or unverified response`, async () => {
    const birthInput = { birthDate: '1990-05-20', birthTime: '14:00', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' };
    let allowed = true, corrupt = false, inputCalls = [], readings = [];
    const verified = moduleFrom('lib/bazi-verified-reading.ts', {
      './three-in-one': { ...core, async runThreeInOne(input) {
        inputCalls.push(JSON.parse(JSON.stringify(input)));
        const result = await core.runThreeInOne(input);
        if (corrupt) result.result.yijing.certificate.chartFingerprint = 'tampered';
        return result;
      } },
    });
    const api = moduleFrom(`app/api/bazi/${route}/route.ts`, {
      'next/server': { NextResponse: { json: Response.json } },
      '@/lib/bazi-traditional-gate': { getBaziTraditionalOutputGate: () => ({ interpretationReady: allowed }) },
      '@/lib/bazi-verified-reading': verified,
      '@/lib/iching-engine': { formatHexagramLine(value) { readings.push(JSON.parse(JSON.stringify(value))); return 'fixture'; } },
      '@/lib/iching-psychology': { buildEmpathicFromHexagram: () => ({}), patternNameOf: () => 'fixture', formatGhostDecoding: () => 'fixture' },
    });
    const call = async (extra = {}) => api.POST({ json: async () => ({ birthInput, shortName: '甲', ...extra }) });
    const first = await call({ bazi: { day: '假命盤' }, iching: { hexagram: 64 }, verified: true });
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('cache-control'), 'no-store');
    const a = await first.json();
    const b = await (await call({ shortName: '完全不同的姓名', chartFingerprint: 'fake' })).json();
    assert.equal(a.chartFingerprint, b.chartFingerprint, 'name must not create another chart');
    assert.deepEqual(readings[0], readings[1], 'same birth uses same core reading');
    assert.deepEqual(inputCalls[0], { birthDate: birthInput.birthDate, birthTime: birthInput.birthTime, gender: birthInput.gender });
    assert(!a.reading.includes('假命盤'));
    const other = await (await call({ birthInput: { ...birthInput, birthDate: '1974-06-28', birthTime: '18:00' } })).json();
    assert.notEqual(a.chartFingerprint, other.chartFingerprint, 'another person must be recomputed');
    const count = readings.length;
    corrupt = true;
    assert.equal((await call()).status, 422, 'previous success cannot override newly failed verification');
    corrupt = false;
    for (const input of [undefined, { ...birthInput, birthDate: '1990-02-30' }, { ...birthInput, timeUnknown: true }, { ...birthInput, timezone: 'UTC' }, { ...birthInput, calendarType: 'lunar' }]) {
      assert.equal((await call({ birthInput: input })).status, 422);
    }
    allowed = false;
    const blocked = await call();
    assert.equal(blocked.status, 409);
    assert.equal(blocked.headers.get('cache-control'), 'no-store');
    assert.equal(readings.length, count, 'invalid or gated results never reach presentation');
  });
}
