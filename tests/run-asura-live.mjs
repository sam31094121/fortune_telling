/**
 * 需要「登入後的真實伺服器」的鬼魅阿修羅測試，一次跑完（免密碼）。
 * 另開私有測試伺服器＋隨機測試密碼（tests/helpers/asura-e2e-server.mjs），把測試 cookie 與網址用環境變數交給各測試：
 *   ASURA_BASE、ASURA_COOKIE（name=value）。
 * 不碰真實密碼、不改安全設定。
 *
 * 執行：npm run test:asura-live
 * 只跑一支：ASURA_LIVE_ONLY=three-tiles npm run test:asura-live
 * 看完整輸出：ASURA_LIVE_VERBOSE=1
 */
import { spawnSync } from 'node:child_process';
import { startAsuraE2eServer } from './helpers/asura-e2e-server.mjs';

const TESTS = [
  ['node', ['tests/ghost-asura-skill-forbidden-terms.test.cjs']],
  ['node', ['tests/ghost-asura-nature-api-regression.test.cjs']],
  ['node', ['tests/ghost-asura-three-tiles-selection.test.cjs']],
  ['node', ['tests/ghost-asura-nature-page.test.mjs']],
];
const only = process.env.ASURA_LIVE_ONLY;
const verbose = Boolean(process.env.ASURA_LIVE_VERBOSE);
const selected = TESTS.filter(([, args]) => !only || args[0].includes(only));

const srv = await startAsuraE2eServer();
let failed = 0;
try {
  for (const [cmd, args] of selected) {
    const r = spawnSync(cmd, args, { env: { ...process.env, ASURA_BASE: srv.base, ASURA_COOKIE: srv.cookieHeader }, encoding: 'utf8', timeout: 600000 });
    const lines = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n');
    const tail = lines.slice(verbose ? -30 : -2).join(verbose ? '\n' : ' | ').slice(0, verbose ? 4000 : 220);
    console.log(`${r.status === 0 ? 'PASS' : 'FAIL'} ${args[0]}${r.status === 0 && !verbose ? '' : `\n   ${tail}`}`);
    if (r.status !== 0) failed += 1;
  }
} finally {
  await srv.stop();
}
console.log(failed === 0 ? `asura-live: ${selected.length} 支全過` : `asura-live: ${failed} 支失敗`);
process.exit(failed === 0 ? 0 : 1);
