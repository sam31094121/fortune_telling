const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('features/tarot/services/api.ts', 'utf8');
function setup(fetch) {
  const timers = new Map();
  const logs = [];
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, fetch, AbortController, Date, Error,
    setTimeout: (fn, ms) => { timers.set(fn, ms); return fn; },
    clearTimeout: (fn) => timers.delete(fn),
    console: { warn: (...args) => logs.push(args) },
  });
  return { api: exports, timers, logs };
}
(async () => {
  const ok = setup(async () => ({ ok: true, json: async () => ({ ok: true, sessionId: 'test' }) }));
  assert.equal((await ok.api.requestTarotShuffle({ question: 'private' })).sessionId, 'test');
  assert.equal(ok.timers.size, 0);
  for (const [method, deadline] of [['requestTarotShuffle', 30000], ['requestTarotReading', 120000]]) {
    let attempt = 0;
    const test = setup(async (_url, options) => {
      if (++attempt > 1) return { ok: true, json: async () => ({ ok: true }) };
      return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    });
    const pending = test.api[method]({ question: 'private', sessionId: 'secret' });
    const rejected = assert.rejects(pending, /連線等待逾時/);
    assert.equal([...test.timers.values()][0], deadline);
    [...test.timers.keys()][0]();
    await rejected;
    assert.equal(test.timers.size, 0);
    assert.ok(!JSON.stringify(test.logs).includes('private'));
    assert.ok(!JSON.stringify(test.logs).includes('secret'));
    assert.equal((await test.api[method]({})).ok, true);
  }
  const failed = setup(async () => ({ ok: false, json: async () => ({ ok: false, message: '請重新嘗試' }) }));
  await assert.rejects(failed.api.requestTarotShuffle({}), /請重新嘗試/);
  assert.equal(failed.timers.size, 0);
  console.log('Tarot success, timeout, retry, cleanup and private-data logging checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
