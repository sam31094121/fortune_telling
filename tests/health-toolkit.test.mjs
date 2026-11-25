// scripts/health 測試：純函式（對比、CLS、判定、分數、涵蓋率、鎖、建置衝突、報告）＋迷你假伺服器端到端（約 10 秒）。
// 端到端需要 playwright（PLAYWRIGHT_MODULE 或 repo 內）；找不到時明確印出 SKIP，不假裝通過。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseColor, blendOver, contrastRatio, isLargeText, gradientStops, contrastRange, clsFromEntries, michelin, coverage, overallStatus, acquireLock, releaseLock, lockVerdict, procStartToken, lockPath, pruneOwnRuns, compareRuns, renderMarkdown, diskGuard, pickPort, startServer, findNextConflicts, listProcesses, GROUP_META } from '../scripts/health/lib.mjs';
import { judge, judgeEarlySwipe, filterBlockedConsole, DOM_KEYS } from '../scripts/health/judge.mjs';
import { CARDS, THRESHOLDS, MICHELIN_TARGETS, VIEWPORTS, LOCAL_ENV_GAP_APIS } from '../scripts/health/config.mjs';
import { metricsScript, INIT_SCRIPT } from '../scripts/health/probe.mjs';
import { parseArgs, selectCards, UsageError } from '../scripts/health/run.mjs';
import { startFixture, FIXTURE_CARDS } from '../scripts/health/fixture-server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const RUN = path.join(REPO, 'scripts/health/run.mjs');
const results = [];
const t = async (name, fn) => { const s = Date.now(); await fn(); results.push(`ok ${name} (${Date.now() - s}ms)`); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-test-'));

// ---------- 設定 ----------
await t('config', () => {
  assert.equal(CARDS.length, 15);
  assert.deepEqual(CARDS.map((c) => c.n), Array.from({ length: 15 }, (_, i) => i + 1));
  assert.deepEqual(VIEWPORTS.map((v) => v.width), [360, 390, 1280]);
  assert.equal(THRESHOLDS.clsMax, 0.05); assert.equal(THRESHOLDS.tapMinPx, 44); assert.equal(THRESHOLDS.fontMinBodyPx, 14);
  assert.deepEqual(MICHELIN_TARGETS, { quality: 9.5, stability: 9, service: 8.5 });
});

// ---------- 對比（含漸層，第 3 項） ----------
await t('contrast basics', () => {
  const W = parseColor('rgb(255, 255, 255)'), B = parseColor('rgb(0,0,0)');
  assert.equal(Math.round(contrastRatio(B, W)), 21);
  assert.ok(Math.abs(contrastRatio(parseColor('rgb(118,118,118)'), W) - 4.54) < 0.01);
  assert.deepEqual(parseColor('rgba(0, 0, 0, 0.5)'), { r: 0, g: 0, b: 0, a: 0.5 });
  assert.equal(Math.round(blendOver(parseColor('rgba(0,0,0,0.5)'), W).r), 128);
  assert.equal(isLargeText(24, 400), true); assert.equal(isLargeText(19, 700), true); assert.equal(isLargeText(18, 400), false);
});
await t('gradient stops / contrastRange', () => {
  const g = gradientStops('radial-gradient(circle at 50% 0%, rgba(79, 53, 218, 0.25), rgba(0, 0, 0, 0) 35%), radial-gradient(rgba(188, 161, 101, 0.12), rgba(0, 0, 0, 0) 30%)');
  assert.equal(g.ok, true); assert.equal(g.colors.length, 4);
  assert.deepEqual(gradientStops('url("a.png"), linear-gradient(red, blue)'), { ok: false, reason: 'image' });
  assert.equal(gradientStops('linear-gradient(oklch(0.7 0.1 200), red)').ok, false);
  assert.equal(gradientStops('none').ok, true);
  const bg = parseColor('rgb(11, 11, 26)');
  const light = contrastRange(parseColor('rgb(238,238,238)'), [g.colors], bg);
  assert.ok(light.min > 4.5, `淺字在深漸層上應通過，min=${light.min}`);
  const dark = contrastRange(parseColor('rgb(51,51,51)'), [g.colors], bg);
  assert.ok(dark.max < 4.5, `深灰字應不足，max=${dark.max}`);
  // 漸層只有一部分區域不足 → min < need ≤ max
  const part = contrastRange(parseColor('rgb(255,255,255)'), [[parseColor('rgb(0,0,0)'), parseColor('rgb(230,230,230)')]], parseColor('rgb(0,0,0)'));
  assert.ok(part.min < 4.5 && part.max > 4.5);
});

// ---------- CLS ----------
await t('cls', () => {
  assert.deepEqual(clsFromEntries([{ t: 100, value: 0.03 }, { t: 500, value: 0.03 }, { t: 9000, value: 0.01 }, { t: 9100, value: 0.5, hadRecentInput: true }]), { cls: 0.06, total: 0.07 });
  assert.deepEqual(clsFromEntries([]), { cls: 0, total: 0 });
});

// ---------- 判定 ----------
const m = (over = {}) => ({ tap: { total: 10, small: 0, under24: 0, samples: [] }, font: { chars: 100, smallChars: 0, share: 0, minPx: 14, tinyRuns: [] }, contrast: { checked: 5, unknown: 0, low: 0, samples: [] }, overflow: { vw: 390, scrollWidth: 390, samples: [], clipped: 0 }, images: { total: 0, broken: 0, samples: [] }, media: 0, visibleError: null, hc: { shifts: [], lcp: 1200 }, ...over });
const okNav = { ok: true, status: 200, dcl: 300, load: 500 };
const noErr = () => ({ console: [], page: [], http: [], failed: [], blockedOnPage: 0 });
const open = CARDS[0], gated = CARDS.find((c) => c.gated);
await t('judge basics', () => {
  let ch = judge(m(), noErr(), okNav, THRESHOLDS, open);
  assert.equal(overallStatus(ch), 'PASS'); assert.equal(ch.content.status, 'PASS');
  ch = judge(m({ hc: { shifts: [{ t: 4000, value: 0.06, nodes: ['DIV.banner'] }], lcp: 1200 } }), noErr(), okNav, THRESHOLDS, open);
  assert.equal(ch.cls.status, 'FAIL'); assert.equal(ch.cls.late, 0.06);
  assert.equal(judge(m({ tap: { total: 3, small: 1, under24: 0, samples: ['A 40x40'] } }), noErr(), okNav, THRESHOLDS, open).tap.status, 'WARN');
  assert.equal(judge(m({ tap: { total: 3, small: 1, under24: 1, samples: ['A 1x1'] } }), noErr(), okNav, THRESHOLDS, open).tap.status, 'FAIL');
  assert.equal(judge(m({ font: { chars: 100, smallChars: 20, share: 0.2, minPx: 12, tinyRuns: [] } }), noErr(), okNav, THRESHOLDS, open).font.status, 'FAIL');
  assert.equal(judge(m({ overflow: { vw: 360, scrollWidth: 400, samples: [], clipped: 0 } }), noErr(), okNav, THRESHOLDS, open).overflow.status, 'FAIL');
  assert.equal(judge(m({ contrast: { checked: 0, unknown: 7, low: 0, samples: [] } }), noErr(), okNav, THRESHOLDS, open).contrast.status, 'SKIP');
  assert.equal(judge(m({ contrast: { checked: 5, unknown: 0, low: 0, partial: 2, samples: [], partialSamples: ['P 3~6'] } }), noErr(), okNav, THRESHOLDS, open).contrast.status, 'WARN');
  assert.equal(judge(m(), { ...noErr(), http: [{ status: 401, url: '/api/x' }] }, okNav, THRESHOLDS, gated).errors.status, 'PASS');
  assert.equal(judge(m(), { ...noErr(), http: [{ status: 401, url: '/api/x' }] }, okNav, THRESHOLDS, open).errors.status, 'FAIL');
  const gap = { ...noErr(), console: ['Failed to load resource: the server responded with a status of 503 (Service Unavailable)'], http: [{ status: 503, url: 'http://127.0.0.1:1/api/home-trust' }] };
  assert.equal(judge(m(), gap, okNav, THRESHOLDS, open, { envGapApis: LOCAL_ENV_GAP_APIS }).errors.status, 'WARN');
  assert.equal(judge(m(), gap, okNav, THRESHOLDS, open, { envGapApis: null }).errors.status, 'FAIL');
  assert.equal(judge(m({ hc: { shifts: [], lcp: 5000 } }), noErr(), okNav, THRESHOLDS, open).lcp.status, 'FAIL');
});
// 第 1 項：沒載入／500／空白頁 → DOM 項目 SKIP，不再「品質滿分」
await t('#1 load fail / empty page → SKIP, content FAIL', () => {
  const dead = judge(m({ tap: { total: 0, small: 0, under24: 0, samples: [] }, font: { chars: 0, smallChars: 0, share: 0, minPx: null, tinyRuns: [] } }), noErr(), { ok: false, error: 'net::ERR_CONNECTION_REFUSED' }, THRESHOLDS, open);
  assert.equal(dead.load.status, 'FAIL'); assert.equal(dead.content.status, 'SKIP');
  for (const k of DOM_KEYS) assert.equal(dead[k].status, 'SKIP', k);
  const e500 = judge(m(), { ...noErr(), http: [{ status: 500, url: 'http://x/tarot', type: 'document' }], console: ['Failed to load resource: the server responded with a status of 500 ()'] }, { ok: false, status: 500, error: 'HTTP 500' }, THRESHOLDS, open);
  assert.equal(e500.errors.status, 'PASS', '主文件 500 只由 load 判 FAIL，不在 errors 重複算');
  for (const k of DOM_KEYS) assert.equal(e500[k].status, 'SKIP', k);
  const empty = judge(m({ tap: { total: 0, small: 0, under24: 0, samples: [] }, font: { chars: 0, smallChars: 0, share: 0, minPx: null, tinyRuns: [] }, media: 0 }), noErr(), okNav, THRESHOLDS, open);
  assert.equal(empty.content.status, 'FAIL'); assert.equal(overallStatus(empty), 'FAIL');
  for (const k of DOM_KEYS) assert.equal(empty[k].status, 'SKIP', k);
  // 只有圖像（例如 3D canvas）不算空白頁
  assert.equal(judge(m({ tap: { total: 0, small: 0, under24: 0, samples: [] }, font: { chars: 0, smallChars: 0, share: 0, minPx: null, tinyRuns: [] }, media: 1 }), noErr(), okNav, THRESHOLDS, open).content.status, 'PASS');
  // 涵蓋率：SKIP 與缺少的項目都算未判定
  const cv = coverage([{ checks: dead }, { checks: { load: { status: 'SKIP', summary: '崩潰' } } }, { checks: judge(m(), noErr(), okNav, THRESHOLDS, open) }]);
  assert.equal(cv.total, 33); assert.equal(cv.judged, 2 + 0 + 11); assert.equal(cv.perCheck.cls.judged, 1);
});
// 第 5 項：被攔的寫入只抵銷該筆
await t('#5 blocked writes absorb only their own messages', () => {
  const msgs = ['Failed to load resource: net::ERR_BLOCKED_BY_CLIENT', 'view failed TypeError: Failed to fetch', 'data failed TypeError: Failed to fetch', 'Failed to load resource: net::ERR_CONNECTION_REFUSED'];
  assert.deepEqual(filterBlockedConsole(msgs, 1).kept, ['data failed TypeError: Failed to fetch', 'Failed to load resource: net::ERR_CONNECTION_REFUSED']);
  assert.equal(filterBlockedConsole(msgs, 0).kept.length, 4, '這頁沒有被攔的寫入 → 一則都不吞');
  const ch = judge(m(), { ...noErr(), console: msgs, blockedOnPage: 1, failed: [{ url: 'http://127.0.0.1:1/data', error: 'net::ERR_CONNECTION_REFUSED', type: 'fetch' }] }, okNav, THRESHOLDS, open);
  assert.equal(ch.errors.status, 'FAIL'); assert.match(ch.errors.summary, /console\.error 2、.*連線失敗 1/);
  assert.equal(judge(m(), { ...noErr(), console: msgs.slice(0, 2), blockedOnPage: 1 }, okNav, THRESHOLDS, open).errors.status, 'PASS');
});
// 第 6 項：requestfailed 與破圖
await t('#6 request failures and broken images', () => {
  assert.equal(judge(m(), { ...noErr(), failed: [{ url: 'http://cdn/x.js', error: 'net::ERR_NAME_NOT_RESOLVED', type: 'script' }] }, okNav, THRESHOLDS, open).errors.status, 'FAIL');
  assert.equal(judge(m(), { ...noErr(), failed: [{ url: '/_next/x?_rsc=1', error: 'net::ERR_ABORTED', type: 'fetch' }] }, okNav, THRESHOLDS, open).errors.status, 'PASS', '路由切換取消的預取不算錯');
  assert.equal(judge(m({ images: { total: 3, broken: 1, samples: ['IMG "x"'] } }), noErr(), okNav, THRESHOLDS, open).images.status, 'FAIL');
  assert.equal(judge(m({ images: { total: 3, broken: 0, samples: [] } }), noErr(), okNav, THRESHOLDS, open).images.status, 'PASS');
});
await t('#4 overflow clipped elements', () => {
  assert.equal(judge(m({ overflow: { vw: 390, scrollWidth: 390, samples: [], clipped: 2, clippedSamples: ['P "x" x=0..700'] } }), noErr(), okNav, THRESHOLDS, open).overflow.status, 'FAIL');
});
await t('early swipe', () => {
  assert.equal(judgeEarlySwipe([[0, 1500], [100, 1500], [200, 300]], 0, THRESHOLDS).status, 'FAIL');
  assert.equal(judgeEarlySwipe([[0, 1500], [100, 1520]], 0, THRESHOLDS).status, 'PASS');
  assert.equal(judgeEarlySwipe([[0, 10]], 0, THRESHOLDS).status, 'WARN');
});

// ---------- 第 2 項：分數名稱與「不完整」 ----------
await t('#2 michelin names / incomplete / overall', () => {
  const rows = [{ checks: { cls: { status: 'PASS' }, tap: { status: 'WARN' }, contrast: { status: 'SKIP' }, errors: { status: 'FAIL' }, load: { status: 'PASS' }, lcp: { status: 'PASS' } } }];
  const mi = michelin(rows, MICHELIN_TARGETS);
  assert.equal(mi.quality.score, 7.5); assert.equal(mi.quality.checks, 2); assert.equal(mi.quality.skipped, 1);
  assert.equal(mi.stability.score, 5); assert.equal(mi.service.score, 10);
  assert.equal(mi.stability.name, '穩定（頁面層）'); assert.equal(mi.service.name, '服務（技術代理）');
  assert.equal(mi.stability.complete, false); assert.equal(mi.stability.meetsTarget, null, '不完整時不宣稱達標');
  assert.ok(mi.stability.missing.includes('真機 90 FPS'));
  assert.equal(mi.service.meetsTarget, null);
  assert.equal(mi.overall.score, round1((1 + 0.5 + 0 + 1 + 1) / 5 * 10));
  // 22 FAIL 全在品質、頁面層穩定 10：仍標不完整、不是「穩定達標」
  const many = Array.from({ length: 22 }, () => ({ checks: { font: { status: 'FAIL' }, errors: { status: 'PASS' }, load: { status: 'PASS' } } }));
  const mm = michelin(many, MICHELIN_TARGETS, undefined, { gatesRun: [{ name: 'tsc', status: 'PASS' }, { name: 'test:health-toolkit', status: 'PASS' }, { name: 'build', status: 'PASS' }] });
  assert.equal(mm.stability.score, 10); assert.equal(mm.stability.meetsTarget, null); assert.deepEqual(mm.stability.missing, ['真機 90 FPS']);
  assert.equal(mm.overall.score, round1(44 / 66 * 10));
  // 定義完整時才判定達標
  const full = michelin(rows, MICHELIN_TARGETS, undefined, { meta: { quality: {}, stability: {}, service: {} } });
  assert.equal(full.service.meetsTarget, true); assert.equal(full.quality.meetsTarget, false);
  assert.ok(GROUP_META.quality.needChecks.includes('beadSize'));
});
function round1(x) { return Math.round(x * 10) / 10; }

// ---------- 產生給瀏覽器的程式碼可被解析 ----------
await t('probe parses', () => { new Function(INIT_SCRIPT); new Function('return ' + metricsScript({ ...THRESHOLDS, visibleErrorRe: 'x' })); });

// ---------- 第 8 項：參數驗證 ----------
await t('#8 parseArgs / selectCards validation', () => {
  for (const bad of [['--concurrency', 'x'], ['--widths', '360,abc'], ['--keep', '0'], ['--base'], ['--base', '--prod'], ['--shots', 'some'], ['--settle-ms', '-1'], ['--bogus'], ['--base', 'ftp://x'], ['--compare', '/no/such/file.json'], ['--gates', 'tsc;rm']]) {
    assert.throws(() => parseArgs(bad), UsageError, bad.join(' '));
  }
  assert.deepEqual(parseArgs(['--widths', '360,390', '--concurrency', '3', '--keep', '2']).widths, [360, 390]);
  assert.throws(() => selectCards({ only: ['tarrot'] }), /不認得的卡：tarrot/);
  assert.equal(selectCards({ only: ['tarot', '13'] }).picked.length, 2);
  assert.equal(selectCards({}).picked.length, 16);
  const cf = path.join(tmp, 'cards.json'); fs.writeFileSync(cf, JSON.stringify({ cards: [] }));
  assert.throws(() => selectCards({ cardsFile: cf }), /沒有任何頁面/);
});

// ---------- 第 9 項：鎖 ----------
await t('#9 lock basics / pid reuse / heartbeat', () => {
  // 行程身分：本平台（Linux /proc、Windows PowerShell、其他 ps）拿得到，且兩次一致
  const tok = procStartToken(process.pid);
  assert.ok(tok, `procStartToken 在 ${process.platform} 拿不到`); assert.equal(procStartToken(process.pid), tok);
  assert.equal(procStartToken(2 ** 30), null, '不存在的 pid 回 null');
  if (!process.env.HC_LOCK_FILE) assert.equal(path.dirname(lockPath()), os.tmpdir());
  const lf = path.join(tmp, 'l.lock');
  assert.equal(acquireLock({}, { file: lf }).ok, true);
  assert.equal(acquireLock({}, { file: lf }).ok, false); // 同一 pid 仍活著且身分相同 → 不可重入
  releaseLock(lf); assert.equal(fs.existsSync(lf), false);
  fs.writeFileSync(lf, JSON.stringify({ pid: 999999, host: os.hostname(), procStart: 'lx:1', startedAt: new Date().toISOString() }));
  assert.equal(acquireLock({}, { file: lf }).ok, true); releaseLock(lf);
  // PID 重用：pid 活著（就是本行程），但啟動時間對不上 → 視為過期
  fs.writeFileSync(lf, JSON.stringify({ pid: process.pid, host: os.hostname(), procStart: 'lx:not-me', startedAt: new Date().toISOString() }));
  const r = acquireLock({}, { file: lf, procToken: (pid) => (pid === process.pid ? 'lx:me' : null) });
  assert.equal(r.ok, true); releaseLock(lf);
  assert.deepEqual(lockVerdict({ pid: 1, host: os.hostname(), procStart: 'a' }, 0, { alive: () => true, procToken: () => 'b' }), { stale: true, reason: 'pid-reused' });
  assert.deepEqual(lockVerdict({ pid: 1, host: os.hostname(), procStart: 'a' }, 0, { alive: () => true, procToken: () => 'a' }), { stale: false, reason: 'held' });
  assert.equal(lockVerdict({ pid: 1, host: os.hostname() }, 11 * 60e3, { alive: () => true }).stale, true, '舊格式沒有身分：心跳過期才回收');
  // 別台機器：看心跳，不看 startedAt
  assert.equal(lockVerdict({ pid: 1, host: 'other' }, 60e3).stale, false);
  assert.equal(lockVerdict({ pid: 1, host: 'other' }, 11 * 60e3).stale, true);
  assert.equal(lockVerdict(null, 1000).stale, false, '剛建立、還沒寫完的鎖不算壞檔');
});
await t('#9 concurrent reclaim of a stale lock → exactly one winner', async () => {
  const lf = path.join(tmp, 'race.lock');
  fs.writeFileSync(lf, JSON.stringify({ pid: 999999, host: os.hostname(), procStart: 'lx:1', startedAt: new Date().toISOString() }));
  const lib = pathToFileURL(path.join(REPO, 'scripts/health/lib.mjs')).href; // Windows 上 import 需要 file:// 網址
  const code = `import { acquireLock } from ${JSON.stringify(lib)}; const go = Date.now() + 600; while (Date.now() < go); const r = acquireLock({}, { file: ${JSON.stringify(lf)} }); console.log(r.ok ? 'WIN' : 'LOSE'); setTimeout(() => {}, 1500);`;
  const outs = await Promise.all(Array.from({ length: 8 }, () => new Promise((res) => { const p = spawn(process.execPath, ['--input-type=module', '-e', code]); let o = '', er = ''; p.stdout.on('data', (d) => (o += d)); p.stderr.on('data', (d) => (er += d)); p.on('exit', () => res(o.trim() || `ERR ${er.trim().split('\n').slice(-2).join(' ')}`)); })));
  assert.equal(outs.filter((x) => x === 'WIN').length, 1, outs.join(','));
  assert.equal(outs.filter((x) => x === 'LOSE').length, 7, outs.join(','));
  fs.rmSync(lf, { force: true });
});

// ---------- 輸出保留、比較、報告 ----------
await t('prune / compare / markdown', () => {
  const root = path.join(tmp, 'runs');
  for (const d of ['a1', 'a2', 'a3']) { fs.mkdirSync(path.join(root, d), { recursive: true }); fs.writeFileSync(path.join(root, d, '.hc-run'), ''); }
  fs.mkdirSync(path.join(root, 'a0-other'));
  assert.deepEqual(pruneOwnRuns(root, 2), ['a1']);
  assert.ok(fs.existsSync(path.join(root, 'a0-other')));
  assert.deepEqual(pruneOwnRuns(root, 0, { current: path.join(root, 'a3') }), ['a2'], 'keep 下限 1，目前這次不刪');
  assert.ok(fs.existsSync(path.join(root, 'a3')));
  assert.equal(typeof diskGuard(tmp, 0).freeGb, 'number');
  const prev = { tool: 'mingli-health-v1', rows: [{ id: 'tarot', width: 390, checks: { cls: { status: 'PASS' }, tap: { status: 'FAIL' }, contrast: { status: 'SKIP' }, lcp: { status: 'PASS' } } }] };
  const cur = { tool: 'mingli-health-v2', rows: [{ id: 'tarot', width: 390, checks: { cls: { status: 'FAIL' }, tap: { status: 'PASS' }, contrast: { status: 'FAIL' }, lcp: { status: 'SKIP' }, images: { status: 'PASS' } } }, { id: 'new', width: 390, checks: {} }] };
  const c = compareRuns(prev, cur);
  assert.deepEqual(c.regressions, ['tarot@390 cls: PASS→FAIL']); assert.deepEqual(c.fixed, ['tarot@390 tap: FAIL→PASS']);
  assert.deepEqual(c.newFindings, ['tarot@390 contrast: SKIP→FAIL']); assert.deepEqual(c.coverageLost, ['tarot@390 lcp: PASS→SKIP']);
  assert.deepEqual(c.newRows, ['new@390']); assert.equal(c.methodChanged, true);
  const rows = [{ n: 1, id: 'tarot', name: '古老塔羅牌', width: 390, status: 'FAIL', checks: { cls: { status: 'FAIL', summary: 'CLS 0.1' } } }];
  const md = renderMarkdown({ tool: 'mingli-health-v2', startedAtLocal: 'x', base: 'b', target: 'remote', readOnly: true, elapsedSec: 1, build: 'none', michelin: michelin(rows, MICHELIN_TARGETS), coverage: coverage(rows), rows, compare: c, subflows: [{ id: 'bead-size', width: 390, checks: { beadSize: { status: 'SKIP', summary: 's' } } }] });
  assert.match(md, /\| 1 \| 古老塔羅牌 \| FAIL cls \|/);
  assert.match(md, /穩定（頁面層） \| — \| 9 \| 0／0（—） \| 不完整，未含：真機 90 FPS/);
  assert.match(md, /量法已變更/);
  assert.match(md, /\| — \| bead-size @390 \| SKIP：s \|/, '寶珠列欄數與表頭一致');
});

// ---------- 第 10 項：建置衝突偵測 ----------
await t('#10 next build / same-repo server detection', () => {
  const repo = '/w/repo';
  const procs = [
    { pid: 10, cmd: 'node /w/other/node_modules/next/dist/bin/next build', cwd: '/w/other' },
    { pid: 11, cmd: 'node /w/repo/node_modules/.bin/next start -p 3010', cwd: '/w/repo' },
    { pid: 12, cmd: 'node /w/x/node_modules/next/dist/bin/next start', cwd: '/w/x' },
    { pid: 13, cmd: 'vim next build notes.md', cwd: '/w/repo' },
    { pid: 14, cmd: 'npm exec next build', cwd: '/w/repo' },
    { pid: 15, cmd: '"C:\\nodejs\\node.exe" C:\\Users\\D\\repo\\node_modules\\next\\dist\\bin\\next build', cwd: null },
  ];
  const c = findNextConflicts(procs, repo, 99);
  assert.deepEqual(c.builds.map((p) => p.pid).sort(), [10, 14, 15]);
  assert.equal(c.builds.find((p) => p.pid === 14).inRepo, true); assert.equal(c.builds.find((p) => p.pid === 10).inRepo, false);
  assert.deepEqual(c.sameRepoServers.map((p) => p.pid), [11]);
  assert.deepEqual(findNextConflicts(procs, repo, 14).builds.map((p) => p.pid).sort(), [10, 15], '不把自己算進去');
  const live = listProcesses();
  assert.ok(Array.isArray(live), `listProcesses 在 ${process.platform} 失敗`);
  if (process.platform === 'linux') assert.ok(live.some((p) => p.pid === process.pid), 'listProcesses 應包含本行程');
});

// ---------- 第 7 項：伺服器身分 ----------
const serverScript = (port) => `require('http').createServer((q,s)=>{s.setHeader('x-hc-token',process.env.HC_TOKEN||'');s.end('ok')}).listen(${port},'127.0.0.1');`;
const tokenIdentity = (tok) => async (base) => (await fetch(base + '/')).headers.get('x-hc-token') === tok;
await t('#7 startServer: own process + identity', async () => {
  const port = await pickPort(39100, 39199);
  const s = await startServer(process.execPath, ['-e', serverScript(port)], { port, env: { ...process.env, HC_TOKEN: 'me' }, timeoutMs: 10000, identity: tokenIdentity('me'), settleMs: 200 });
  assert.equal(s.exited(), null); s.stop();
});
await t('#7 startServer: port grabbed by someone else → reject even though HTTP answers', async () => {
  const port = await pickPort(39200, 39299);
  const intruder = http.createServer((q, s) => s.end('not yours')); await new Promise((r) => intruder.listen(port, '127.0.0.1', r));
  await assert.rejects(startServer(process.execPath, ['-e', serverScript(port)], { port, env: { ...process.env, HC_TOKEN: 'me' }, timeoutMs: 10000, identity: tokenIdentity('me'), settleMs: 300 }), /提早結束|已結束|身分核對失敗/);
  // 沒有 identity 時也要靠「自己的行程已結束」擋下來
  await assert.rejects(startServer(process.execPath, ['-e', serverScript(port)], { port, timeoutMs: 10000, settleMs: 600 }), /埠被別的行程占用|已結束|提早結束/);
  await new Promise((r) => intruder.close(r));
});
await t('#7 startServer: early exit reports log tail', async () => {
  await assert.rejects(startServer(process.execPath, ['-e', 'console.error("boom-config"); process.exit(3)'], { port: 39999, timeoutMs: 5000 }), /code 3.*boom-config/);
});

// ---------- 端到端：迷你假網站（第 1、3、4、5、6、8 項） ----------
function findPlaywright() {
  const req = createRequire(path.join(REPO, 'package.json'));
  for (const c of [process.env.HC_PLAYWRIGHT_MODULE, process.env.PLAYWRIGHT_MODULE, 'playwright'].filter(Boolean)) { try { req.resolve(c); return true; } catch {} }
  return false;
}
const runTool = (args, env = {}) => new Promise((res) => { const p = spawn(process.execPath, [RUN, ...args], { env: { ...process.env, HC_LOCK_FILE: path.join(tmp, 'e2e.lock'), ...env } }); let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d)); p.on('exit', (code) => res({ code, out })); });
let e2e = 'SKIP（找不到 playwright；設 PLAYWRIGHT_MODULE 後可跑）';
if (findPlaywright()) {
  await t('#8 e2e: --only typo exits 2 without creating a run', async () => {
    const out = path.join(tmp, 'e2e-typo');
    const r = await runTool(['--base', 'http://127.0.0.1:1', '--only', 'tarrot', '--out', out]);
    assert.equal(r.code, 2, r.out); assert.match(r.out, /不認得的卡/); assert.equal(fs.existsSync(out), false);
  });
  await t('e2e fixture site (#1 #3 #4 #5 #6)', async () => {
    const f = await startFixture();
    try {
      const cf = path.join(tmp, 'fixture-cards.json'); fs.writeFileSync(cf, JSON.stringify(FIXTURE_CARDS));
      const out = path.join(tmp, 'e2e-out');
      const r = await runTool(['--base', f.base, '--cards', cf, '--widths', '390', '--settle-ms', '800', '--no-early-swipe', '--shots', 'none', '--out', out]);
      assert.equal(r.code, 1, r.out); // 有 FAIL → exit 1
      const dir = fs.readdirSync(out).find((d) => fs.existsSync(path.join(out, d, 'report.json')));
      const rep = JSON.parse(fs.readFileSync(path.join(out, dir, 'report.json'), 'utf8'));
      const row = (id) => rep.rows.find((x) => x.id === id);
      const st = (id, k) => row(id).checks[k]?.status;
      assert.equal(row('ok').status, 'PASS', JSON.stringify(row('ok').checks));
      assert.equal(st('home', 'homeCards'), 'PASS');
      // #1
      assert.equal(st('empty', 'content'), 'FAIL'); for (const k of DOM_KEYS) assert.equal(st('empty', k), 'SKIP', `empty ${k}`);
      assert.equal(st('err500', 'load'), 'FAIL'); assert.equal(st('err500', 'errors'), 'PASS'); for (const k of DOM_KEYS) assert.equal(st('err500', k), 'SKIP', `err500 ${k}`);
      // #3 漸層底：判得出來（不 SKIP），且抓到低對比那段
      assert.equal(st('grad', 'contrast'), 'FAIL'); assert.ok(row('grad').metrics.contrastGradient >= 2);
      // 祖先 background-clip:text 的漸層字不能把字的漸層當成底色（正式站 /match「先填第一位」曾誤判 1.00）
      assert.equal(row('grad').metrics.contrastUnknownBy['gradient-text'], 1); assert.doesNotMatch(row('grad').checks.contrast.samples.join(' '), /漸層字/);
      assert.match(row('grad').checks.contrast.samples.join(' '), /深灰字/);
      // #4 html/body overflow-x:hidden 下仍抓到被切掉的段落；可橫捲容器不算
      assert.equal(st('clip', 'overflow'), 'FAIL'); assert.match(row('clip').checks.overflow.summary, /切掉的文字／按鈕 1 個/);
      // #5 只有被攔的寫入 → PASS；另有真的連線失敗 → FAIL
      assert.equal(st('writes-only', 'errors'), 'PASS', row('writes-only').checks.errors.summary);
      assert.equal(st('writes-and-fail', 'errors'), 'FAIL'); assert.match(row('writes-and-fail').checks.errors.summary, /連線失敗 1/);
      // #6 壞圖
      assert.equal(st('bad-img', 'images'), 'FAIL'); assert.match(row('bad-img').checks.images.summary, /1\/2/);
      // #2 分數不完整、涵蓋率有列
      assert.equal(rep.michelin.stability.complete, false); assert.ok(rep.coverage.pct < 1 && rep.coverage.pct > 0.5);
      assert.ok(rep.blockedWrites.length >= 2);
      e2e = `ok（${rep.rows.length} 頁，${rep.elapsedSec}s）`;
    } finally { await f.close(); }
  });
}

// 中斷：Ctrl+C／SIGINT 後鎖要被清掉、exit 130（Windows 的 process.kill 是強制結束、送不了 SIGINT，改在 MSI 用 GenerateConsoleCtrlEvent 手動驗）
let sigint = 'SKIP（Windows 另以主控台 Ctrl+C 手動驗）';
if (findPlaywright() && process.platform !== 'win32') {
  await t('SIGINT releases the lock (exit 130)', async () => {
    const f = await startFixture();
    try {
      const lockFile = path.join(tmp, 'sig.lock');
      const p = spawn(process.execPath, [RUN, '--base', f.base, '--only', 'ok', '--cards', path.join(tmp, 'fixture-cards.json'), '--widths', '390', '--settle-ms', '20000', '--no-early-swipe', '--shots', 'none', '--out', path.join(tmp, 'sig-out')], { env: { ...process.env, HC_LOCK_FILE: lockFile } });
      let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
      const exited = new Promise((res) => p.on('exit', (code, signal) => res({ code, signal })));
      const t0 = Date.now(); while (!/寬度 390/.test(out) && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 100));
      await new Promise((r) => setTimeout(r, 1500));
      assert.ok(fs.existsSync(lockFile), '執行中應持有鎖');
      p.kill('SIGINT');
      const r = await Promise.race([exited, new Promise((res) => setTimeout(() => res({ code: 'timeout' }), 10000))]);
      assert.equal(r.code, 130, out); assert.equal(fs.existsSync(lockFile), false, '中斷後鎖必須被清掉');
      const runs = fs.existsSync(path.join(tmp, 'sig-out')) ? fs.readdirSync(path.join(tmp, 'sig-out'), { recursive: true }).filter((x) => /report\.json$/.test(x)) : [];
      assert.deepEqual(runs, [], '中斷後不可寫出半套報告'); assert.match(out, /收到中斷訊號/);
      sigint = 'ok';
    } finally { await f.close(); }
  });
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(results.join('\n'));
console.log(`SIGINT: ${sigint}`);
console.log(`e2e: ${e2e}`);
console.log('health-toolkit: all assertions passed');
