/**
 * 測試專用的獨立伺服器＋登入（免密碼、不碰真實金鑰、不改任何安全設定）
 * ============================================================================
 * 問題：鬼魅阿修羅上鎖後，打 API 或開頁面的測試全被 401 擋掉，真實點擊的自動測試也進不去。
 * 做法（沒有任何後門）：
 *   1. 另開一個私有的 next dev（獨立埠、獨立 distDir=.next-e2e，不干擾 8888 的開發伺服器）。
 *   2. 這個伺服器的上鎖密碼與簽章金鑰，是每次執行當場隨機產生的「測試值」，只存在這次的記憶體，
 *      與 .env.local 的真實密碼無關（行程環境變數優先於 .env 檔）。
 *   3. 用專案自己的 createSession() 在同一組測試值下簽出一個 30 分鐘的 session cookie。
 *   4. 測試拿這個 cookie 進去；跑完伺服器關掉，測試值隨之消失。
 * 上鎖本身仍由 test:locked-cards 守；這裡只是讓測試「合法登入」，不是繞過鎖。
 *
 * 用法：
 *   const srv = await startAsuraE2eServer();   // { base, cookie, cookieHeader, stop }
 *   ... 測試 ...
 *   await srv.stop();
 * ============================================================================
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import net from 'node:net';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}

export async function startAsuraE2eServer({ readyTimeoutMs = 240000 } = {}) {
  const port = await freePort();
  const password = `test-${randomBytes(9).toString('hex')}`;
  const secret = randomBytes(24).toString('hex'); // 48 字元，滿足 ≥32
  const root = process.cwd();
  const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    NEXT_DIST_DIR: '.next-e2e',
    NEXT_TELEMETRY_DISABLED: '1',
    DUAL_CHART_PASSWORD: password,
    DUAL_CHART_SESSION_SECRET: secret,
  };
  const child = spawn(process.execPath, [nextBin, 'dev', '-H', '127.0.0.1', '-p', String(port)], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  let exited = false;
  child.on('exit', () => { exited = true; });

  const base = `http://127.0.0.1:${port}`;
  const stop = async () => {
    if (!exited) {
      child.kill();
      if (process.platform === 'win32') { try { spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* 已結束 */ } }
      await sleep(500);
    }
  };

  const end = Date.now() + readyTimeoutMs;
  let ready = false;
  while (Date.now() < end && !exited) {
    try { const r = await fetch(`${base}/api/ghost-asura/reading`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: '{}' }); if (r.status) { ready = true; break; } } catch { /* 還沒起來 */ }
    await sleep(1500);
  }
  if (!ready) { await stop(); throw new Error(`測試伺服器沒有在時限內起來。最後輸出：\n${log.slice(-800)}`); }

  // 在「測試值」下用專案自己的函式簽 session（先設環境變數再載入，函式在呼叫當下才讀環境）
  process.env.DUAL_CHART_PASSWORD = password;
  process.env.DUAL_CHART_SESSION_SECRET = secret;
  const { createSession, DUAL_COOKIE } = await import('../../lib/dual-chart-auth.ts');
  const cookie = createSession();
  return { base, cookie, cookieName: DUAL_COOKIE, cookieHeader: `${DUAL_COOKIE}=${cookie}`, stop, getLog: () => log };
}
