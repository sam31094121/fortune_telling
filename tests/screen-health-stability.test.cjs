const assert = require('node:assert/strict');

(async () => {
  const { isTimeoutText, runWithTimeoutRetry, warmUpUrls, assessEnvironment, TIMED_OUT_MARKER } = await import('../scripts/screen-health-stability.mjs');

  // 1. 逾時與斷言要分得開：逾時可重試，斷言失敗永遠不是逾時。
  assert.equal(isTimeoutText('DOMException [TimeoutError]: The operation was aborted due to timeout'), true);
  assert.equal(isTimeoutText('locator.waitFor: Timeout 20000ms exceeded.'), true);
  assert.equal(isTimeoutText(`Command failed: npm run x ${TIMED_OUT_MARKER}`), true);
  assert.equal(isTimeoutText('AssertionError [ERR_ASSERTION]: expected 3 to equal 4'), false);
  assert.equal(isTimeoutText('FAIL: 風天小畜\n  expected="a"\n  actual  ="b"'), false);
  // 斷言字樣優先：就算同時出現逾時字樣，也不重試（不可把真正的失敗洗成不穩）。
  assert.equal(isTimeoutText('AssertionError: wrong result\nTimeoutError: operation was aborted due to timeout'), false);
  assert.equal(isTimeoutText(''), false);
  assert.equal(isTimeoutText(undefined), false);

  // 2. 逾時後重試通過 → PASSED 但必須標 flaky、attempts=2、保留第一次失敗原因。
  let calls = 0;
  const flaky = await runWithTimeoutRetry(async () => {
    calls += 1;
    return calls === 1 ? { status: 'FAILED', error: 'TimeoutError: operation was aborted due to timeout' } : { status: 'PASSED' };
  });
  assert.equal(calls, 2);
  assert.equal(flaky.status, 'PASSED');
  assert.equal(flaky.flaky, true);
  assert.equal(flaky.attempts, 2);
  assert.match(flaky.firstFailure, /Timeout/);

  // 3. 逾時兩次 → 仍是 FAILED（只重試一次），不得變綠。
  calls = 0;
  const alwaysSlow = await runWithTimeoutRetry(async () => { calls += 1; return { status: 'FAILED', error: 'TimeoutError: operation was aborted due to timeout' }; });
  assert.equal(calls, 2);
  assert.equal(alwaysSlow.status, 'FAILED');
  assert.equal(alwaysSlow.flaky, undefined);
  assert.equal(alwaysSlow.attempts, 2);

  // 4. 斷言失敗 → 一次都不重試，直接 FAILED。
  calls = 0;
  const assertion = await runWithTimeoutRetry(async () => { calls += 1; return { status: 'FAILED', error: 'AssertionError [ERR_ASSERTION]: expected 1 to equal 2' }; });
  assert.equal(calls, 1);
  assert.equal(assertion.status, 'FAILED');
  assert.equal(assertion.attempts, 1);

  // 5. 原本就通過的不重試、不標 flaky。
  calls = 0;
  const clean = await runWithTimeoutRetry(async () => { calls += 1; return { status: 'PASSED' }; });
  assert.equal(calls, 1);
  assert.equal(clean.flaky, undefined);

  // 6. 預熱：兩輪、只取最後一輪耗時；伺服器錯誤（>=500）與連線失敗標 ok:false，不丟例外。
  const seen = [];
  const clock = { t: 0 };
  const fakeFetch = async (url) => {
    seen.push(url);
    clock.t += url.endsWith('/slow') && seen.length <= 3 ? 20000 : 100; // 第一輪很慢（冷編譯）、第二輪很快
    if (url.endsWith('/boom')) throw new Error('connection refused');
    return { status: url.endsWith('/err') ? 503 : 200, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  const timings = await warmUpUrls(['http://x/a', 'http://x/slow', 'http://x/err', 'http://x/boom'], { fetchFn: fakeFetch, now: () => clock.t });
  assert.equal(seen.length, 8, '兩輪各四個網址');
  assert.deepEqual(timings.map((item) => item.ok), [true, true, false, false]);
  assert.ok(timings.every((item) => item.ms === 100), '只取第二輪（穩態）耗時，冷啟動那一輪不算');

  // 7. 環境偏慢判定：中位數或最大值超標才算慢。
  assert.equal(assessEnvironment([{ url: 'a', ms: 100, ok: true }, { url: 'b', ms: 200, ok: true }, { url: 'c', ms: 300, ok: true }]).slow, false);
  assert.equal(assessEnvironment([{ url: 'a', ms: 4000, ok: true }, { url: 'b', ms: 4500, ok: true }, { url: 'c', ms: 5000, ok: true }]).slow, true);
  const oneVerySlow = assessEnvironment([{ url: 'a', ms: 100, ok: true }, { url: 'b', ms: 100, ok: true }, { url: 'c', ms: 15000, ok: true }]);
  assert.equal(oneVerySlow.slow, true);
  assert.equal(oneVerySlow.slowest.url, 'c');
  assert.deepEqual(assessEnvironment([]).slow, false);

  // 8. 監測腳本確實接上穩定性模組，且重試的只有 checkHealthScript（驗證指令），沒有碰復原判斷。
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'scripts', 'screen-health-monitor.mjs'), 'utf8');
  assert.match(source, /runWithTimeoutRetry\(\(\) => checkHealthScriptOnce\(check\)\)/);
  assert.match(source, /warmUpUrls\(/);
  assert.match(source, /canRecoverService\(report, AUTO_REPAIR\)/, '復原判斷維持原樣');
  assert.doesNotMatch(source, /ENV_SLOW[\s\S]{0,400}repairScreenHealth/, '環境偏慢只發警告，不得因此重啟服務');

  console.log('PASS: timeout-only retry marks flaky and never turns a real failure green; assertions never retry; warm-up measures steady state; slow environment only warns');
})().catch(error => { console.error(error); process.exitCode = 1; });
