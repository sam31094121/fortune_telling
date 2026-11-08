const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const core = require('../.three-in-one-build/lib/three-in-one.js');

async function main() {
  const passed = await core.runThreeInOne({ birthDate: '1990-05-20', birthTime: '14:00', gender: 'male' });
  core.assertThreeInOnePassed(passed);
  for (const [route, teacherId] of [['teacher-analysis', 'STRUCTURE_MASTER'], ['entertainment-analysis', 'HORROR']]) {
    let current = passed;
    let generated = 0;
    const generate = async (_id, context) => { assert.strictEqual(context.reviewedThreeCore, current, 'same-request verified result must reach reader'); generated++; return { reading: 'verified fixture' }; };
    const dependencies = {
      'next/server': { NextResponse: { json: Response.json } },
      '@/lib/ai-error-message': { customerSafeAiMessage: () => 'failed' },
      '@/lib/api-stability': { createRequestId: () => 'test', hashedCacheKey: (parts) => parts.join('|'),
        friendlyErrorResponse: (_id, code, message, status) => Response.json({ code, message }, { status }) },
      '@/lib/ziwei-chart-store': { resolveVerifiedZiweiChart: () => ({ chart: {
        birthInput: { date: '1990-05-20', timeIndex: 7, gender: '男' }, engineVersion: 'test',
      } }) },
      '@/lib/ziwei-teacher/palace-context': { buildPalaceContext: () => ({}), ZIWEI_TEACHER_PALACE_ORDER: ['LIFE'] },
      '@/lib/ziwei-teacher/teachers': { runTeacher: generate },
      '@/lib/ziwei-teacher/entertainment': { runEntertainmentTeacher: generate },
      '@/lib/three-in-one': { ...core, runThreeInOne: async () => current },
    };
    const compiledModule = { exports: {} };
    const file = `app/api/ziwei/[analysisId]/${route}/route.ts`;
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports, console, Intl, Date,
      require: id => { assert.ok(id in dependencies, id); return dependencies[id]; } });
    const call = () => compiledModule.exports.POST({ json: async () => ({ palaceId: 'LIFE', teacherId }) }, { params: Promise.resolve({ analysisId: 'test' }) });
    assert.equal((await call()).status, 200);
    assert.equal(generated, 1);
    // A previously cached valid reading must not bypass newly failed verification.
    for (const mutate of [
      value => { value.result.bazi.hour = '丁卯'; },
      value => { value.result.yijing.certificate.chartFingerprint = 'different-person'; },
      value => { value.trace = ['PASSED']; },
      value => { value.verification.yijing = false; },
    ]) {
      current = structuredClone(passed);
      mutate(current);
      const response = await call();
      assert.equal(response.status, 422);
      assert.equal((await response.json()).code, 'THREE_IN_ONE_LOCKED');
      assert.equal(generated, 1, 'invalid input must never reach reading generation');
    }
    current = passed;
    assert.equal((await call()).status, 200);
    assert.equal(generated, 1, 'valid cache remains usable after verification');
    current = await core.runThreeInOne({ birthDate: '1992-01-01', birthTime: '08:00', gender: 'female' });
    core.assertThreeInOnePassed(current);
    assert.equal((await call()).status, 200);
    assert.equal(generated, 2, 'a different reviewed fingerprint cannot reuse old output');
    current = await core.runThreeInOne({ birthDate: '1992-01-01', birthTime: null, hourBranchIndex: null, gender: 'female' });
    assert.equal((await call()).status, 422);
    assert.equal(generated, 2, 'missing time must not reach reader');
  }
  console.log('PASS: both reading routes validate before generation and before cached output');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
