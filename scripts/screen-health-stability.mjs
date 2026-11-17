/**
 * 健檢穩定性（2026-11-17）：讓「環境慢」不再被誤判成「功能壞」，同時不放水。
 *
 * 鐵律：
 *  1. 只有「逾時」類失敗可以重試一次；斷言失敗（AssertionError、FAIL、expected／actual）永遠不重試。
 *  2. 重試後通過的項目標成 flaky（不穩），照實列在報告裡，不是悄悄變綠；重試後仍失敗就是 FAILED。
 *  3. 預熱只做 GET、不填表、不送出；環境偏慢只發 WARNING，不算失敗、不重啟服務
 *     （重啟服務仍只由 screen-health-recovery-policy 決定，功能與 API 失敗永遠不重啟）。
 */

/** 被 execFile 的 timeout 殺掉的子行程，錯誤訊息沒有 "timeout" 字樣，呼叫端會補上這個記號。 */
export const TIMED_OUT_MARKER = '[TIMED_OUT_KILLED]';

const ASSERTION_PATTERN = /AssertionError|ERR_ASSERTION|^\s*FAIL\b|\bexpected\b[\s\S]*\bactual\b/m;
const TIMEOUT_PATTERN = /TimeoutError|operation was aborted due to timeout|Timeout \d+ms exceeded|ETIMEDOUT|timed out|\[TIMED_OUT_KILLED\]/i;

/** 這段錯誤文字是不是「環境逾時」。斷言失敗優先：只要出現斷言字樣就不是逾時。 */
export function isTimeoutText(text) {
  const value = String(text ?? '');
  if (ASSERTION_PATTERN.test(value)) return false;
  return TIMEOUT_PATTERN.test(value);
}

/**
 * 執行一次檢查；若失敗原因是逾時，最多重試 maxRetries 次。
 * runOnce 必須回傳 { status: 'PASSED' | 'FAILED', error?, output? }。
 */
export async function runWithTimeoutRetry(runOnce, { maxRetries = 1, isTimeout = isTimeoutText } = {}) {
  let result = await runOnce();
  let attempts = 1;
  while (result.status === 'FAILED' && attempts <= maxRetries && isTimeout(`${result.error ?? ''}\n${result.output ?? ''}`)) {
    const next = await runOnce();
    attempts += 1;
    if (next.status === 'PASSED') {
      return { ...next, flaky: true, attempts, firstFailure: String(result.error ?? '').slice(0, 300) };
    }
    result = next;
  }
  return { ...result, attempts };
}

/**
 * 預熱：循序 GET 每個網址（預設兩輪，第一輪觸發編譯／冷啟動，第二輪才是穩態速度）。
 * 回傳最後一輪每個網址的耗時。fetchFn 可注入，方便測試。
 */
export async function warmUpUrls(urls, { fetchFn = fetch, timeoutMs = 90000, rounds = 2, now = Date.now } = {}) {
  let timings = [];
  for (let round = 0; round < rounds; round += 1) {
    timings = [];
    for (const url of urls) {
      const startedAt = now();
      let ok = false;
      try {
        const response = await fetchFn(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
        await response.arrayBuffer();
        ok = response.status < 500;
      } catch {
        ok = false;
      }
      timings.push({ url, ms: now() - startedAt, ok });
    }
  }
  return timings;
}

/** 環境是否偏慢：以最後一輪耗時的中位數與最大值判斷。 */
export function assessEnvironment(timings, { slowMedianMs = 3000, slowMaxMs = 10000 } = {}) {
  if (!timings.length) return { count: 0, medianMs: 0, maxMs: 0, failedUrls: [], slow: false, slowest: null };
  const sorted = [...timings].map((item) => item.ms).sort((a, b) => a - b);
  const medianMs = sorted[Math.floor(sorted.length / 2)];
  const maxMs = sorted[sorted.length - 1];
  const slowest = timings.reduce((worst, item) => (item.ms > worst.ms ? item : worst), timings[0]);
  return {
    count: timings.length,
    medianMs,
    maxMs,
    failedUrls: timings.filter((item) => !item.ok).map((item) => item.url),
    slow: medianMs > slowMedianMs || maxMs > slowMaxMs,
    slowest: { url: slowest.url, ms: slowest.ms },
  };
}
