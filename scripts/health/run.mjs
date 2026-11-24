#!/usr/bin/env node
// 首頁 15 卡健康檢查：一支指令、最多一次建置（或直接指向既有伺服器／正式站）、一份 JSON＋一份短報告。
// 只讀量測，不改任何產品程式；預設攔下所有非 GET 請求，不會寫帳本。用法見 scripts/health/README.md。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { INIT_SCRIPT, metricsScript } from './probe.mjs';
import { acquireLock, releaseLock, diskGuard, pruneOwnRuns, pickPort, clsFromEntries, michelin, overallStatus, renderMarkdown, compareRuns, round, CHECK_GROUPS } from './lib.mjs';
import { judge, judgeEarlySwipe, mkCheck } from './judge.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

export function parseArgs(argv) {
  const a = { widths: C.VIEWPORTS.map((v) => v.width), concurrency: 2, keep: 5, readOnly: true, shots: 'fail', subflows: true, earlySwipe: true, gates: [], settleMs: C.THRESHOLDS.settleMs };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => argv[++i];
    if (k === '--base') a.base = v();
    else if (k === '--prod') a.base = process.env.HC_PROD_URL || 'https://heaven-earth-humanity-pair.vercel.app';
    else if (k === '--serve') a.serve = true;
    else if (k === '--build') a.build = true;
    else if (k === '--reuse-any-build') a.reuseAnyBuild = true;
    else if (k === '--widths') a.widths = v().split(',').map(Number);
    else if (k === '--only') a.only = v().split(',');
    else if (k === '--out') a.out = v();
    else if (k === '--keep') a.keep = Number(v());
    else if (k === '--compare') a.compare = v();
    else if (k === '--concurrency') a.concurrency = Number(v());
    else if (k === '--settle-ms') a.settleMs = Number(v());
    else if (k === '--allow-writes') a.readOnly = false;
    else if (k === '--shots') a.shots = v();
    else if (k === '--no-subflows') a.subflows = false;
    else if (k === '--no-early-swipe') a.earlySwipe = false;
    else if (k === '--gates') a.gates = v().split(',').filter(Boolean);
    else if (k === '--label') a.label = v();
    else if (k === '--server-sha') a.serverSha = v();
    else if (k === '--help' || k === '-h') a.help = true;
    else throw new Error(`unknown arg ${k}`);
  }
  return a;
}

function loadPlaywright() {
  const req = createRequire(path.join(REPO, 'package.json'));
  // 與 tests/beast-orb-authority.test.cjs 同一套尋找順序。不做全域安裝。
  for (const c of [process.env.HC_PLAYWRIGHT_MODULE, process.env.PLAYWRIGHT_MODULE, 'playwright', path.join(REPO, '.tmp/shared-qa/node_modules/playwright'), path.join(REPO, 'scripts/card-preview/node_modules/playwright')].filter(Boolean)) {
    try { return req(c); } catch {}
  }
  throw new Error('找不到 playwright：請設 PLAYWRIGHT_MODULE=<playwright 資料夾>');
}

const sh = (cmd, args) => execFileSync(cmd, args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gitSha = () => { try { return sh('git', ['rev-parse', '--short=8', 'HEAD']); } catch { return null; } };
const gitDirty = () => { try { return sh('git', ['status', '--porcelain', '--', 'app', 'components', 'lib', 'next.config.mjs', 'package.json']).length > 0; } catch { return true; } };

async function waitHttp(url, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(url, { redirect: 'manual' }); if (r.status < 500) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// 建置最多一次：.next/HC_BUILD_SHA 與 HEAD 一致且程式沒改 → 直接重用。
async function ensureServer(a, log) {
  const dist = path.join(REPO, '.next');
  const marker = path.join(dist, 'HC_BUILD_SHA');
  const sha = gitSha();
  const hasBuild = fs.existsSync(path.join(dist, 'BUILD_ID'));
  const markerOk = hasBuild && fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').trim() === sha && !gitDirty();
  let build = 'reused';
  if (!markerOk && !(hasBuild && a.reuseAnyBuild)) {
    if (!a.build) throw new Error(hasBuild ? `.next 不是本工具為 ${sha} 建的；加 --build 重建，或 --reuse-any-build` : '沒有 .next；加 --build（先檢查硬碟 ≥6G），或用 --base 指向已在跑的伺服器');
    const g = diskGuard(REPO, C.DISK.minFreeGbForBuild);
    if (!g.ok) throw new Error(`硬碟只剩 ${g.freeGb}G（< ${g.minGb}G），拒絕建置；請改用 --base 指向已在跑的伺服器或 --prod`);
    if (process.env.HC_BUILD_CACHE_DIR && !fs.existsSync(path.join(dist, 'cache'))) {
      fs.mkdirSync(dist, { recursive: true }); fs.mkdirSync(process.env.HC_BUILD_CACHE_DIR, { recursive: true });
      fs.symlinkSync(process.env.HC_BUILD_CACHE_DIR, path.join(dist, 'cache'), 'junction');
    }
    const t = Date.now();
    log(`next build（HEAD ${sha}）…`);
    await new Promise((res, rej) => {
      const p = spawn(process.execPath, [path.join(REPO, 'node_modules/next/dist/bin/next'), 'build'], { cwd: REPO, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
      p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`next build exit ${c}`))));
    });
    fs.writeFileSync(marker, sha + '\n');
    build = `built in ${round((Date.now() - t) / 1000, 0)}s`;
  }
  const port = await pickPort(3400, 3499, C.RESERVED_PORTS);
  const child = spawn(process.execPath, [path.join(REPO, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], { cwd: REPO, stdio: 'ignore', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
  const base = `http://127.0.0.1:${port}`;
  if (!(await waitHttp(base + '/', 120000))) { child.kill(); throw new Error('next start 120 秒內沒有回應'); }
  return { base, build, stop: () => child.kill('SIGTERM') };
}

const EMPTY_METRICS = (w) => ({ tap: { total: 0, small: 0, under24: 0, samples: [] }, font: { chars: 0, smallChars: 0, share: 0, minPx: null, tinyRuns: [], sizes: {} }, contrast: { checked: 0, unknown: 0, low: 0, samples: [] }, overflow: { vw: w, scrollWidth: w, samples: [] }, visibleError: null, hc: null });

async function checkPage(ctx, base, card, vp, a, shotsDir, blocked) {
  const page = await ctx.newPage();
  const errs = { console: [], page: [], http: [] };
  page.on('console', (msg) => { if (msg.type() !== 'error') return; const tx = msg.text(); if (/ERR_BLOCKED_BY_CLIENT|Failed to fetch/.test(tx) && blocked.length) return; errs.console.push(tx.slice(0, 200)); });
  page.on('pageerror', (e) => errs.page.push(String(e.message).slice(0, 200)));
  page.on('response', (r) => { if (r.status() >= 400) errs.http.push({ status: r.status(), url: r.url().slice(0, 160) }); });
  const nav = { ok: false };
  const t0 = Date.now();
  try {
    const resp = await page.goto(base + card.href, { waitUntil: 'load', timeout: 60000 });
    const timing = await page.evaluate(() => { const e = performance.getEntriesByType('navigation')[0]; return e ? { dcl: Math.round(e.domContentLoadedEventEnd), load: Math.round(e.loadEventEnd) } : {}; });
    Object.assign(nav, { ok: !!resp && resp.status() < 400, status: resp?.status(), ...timing, wallMs: Date.now() - t0 });
    if (!nav.ok) nav.error = `HTTP ${resp?.status()}`;
  } catch (e) { nav.error = String(e.message).split('\n')[0].slice(0, 160); }
  await page.waitForTimeout(a.settleMs); // 等晚到的橫幅／後端文字，CLS 才抓得到
  let m;
  try { m = await page.evaluate(metricsScript({ ...C.THRESHOLDS, visibleErrorRe: C.VISIBLE_ERROR_RE.source })); }
  catch (e) { m = EMPTY_METRICS(vp.width); nav.ok = false; nav.error = nav.error || `量測失敗 ${String(e.message).slice(0, 120)}`; }
  const checks = judge(m, errs, nav, C.THRESHOLDS, card, { envGapApis: a.target === 'remote' ? null : C.LOCAL_ENV_GAP_APIS });
  if (card.id === 'home') {
    // 依畫面上的實際位置排序（DOM 順序與視覺順序不同，CSS order 會重排）
    const hrefs = await page.$$eval(C.HOME_CARD_SELECTOR, (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { top: r.top + scrollY, left: r.left, href: e.getAttribute('href') || e.querySelector('a')?.getAttribute('href') || '' }; })
      .sort((x, y) => x.top - y.top || x.left - y.left).map((x) => x.href)).catch(() => []);
    const want = C.CARDS.map((c) => c.href);
    const same = hrefs.length === want.length && hrefs.every((h, i) => h === want[i]);
    checks.homeCards = mkCheck(same ? 'PASS' : 'FAIL', same ? `首頁 ${hrefs.length} 張入口，順序與設定一致` : `首頁入口 ${hrefs.length} 張，與設定不一致`, { samples: same ? [] : [hrefs.join(' ')] });
  }
  const status = overallStatus(checks);
  let shot = null;
  if (a.shots === 'all' || (a.shots === 'fail' && status === 'FAIL')) {
    shot = path.join(shotsDir, `${String(card.n).padStart(2, '0')}-${card.id}-${vp.width}.jpg`);
    await page.screenshot({ path: shot, type: 'jpeg', quality: 50 }).catch(() => { shot = null; });
  }
  await page.close();
  return { n: card.n, id: card.id, name: card.name, href: card.href, width: vp.width, status, nav, checks, shot: shot && path.basename(shot),
    metrics: { fontSizes: m.font.sizes, tapTotal: m.tap.total, contrastChecked: m.contrast.checked, contrastUnknown: m.contrast.unknown } };
}

// 早滑：首頁 DOMContentLoaded 後 0.4 秒用觸控手勢往下滑，觀察 6 秒內有沒有被程式拉回。
async function earlySwipe(ctx, base, vp) {
  const page = await ctx.newPage();
  try {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(C.THRESHOLDS.earlySwipeAtMs);
    const startY = await page.evaluate(() => scrollY);
    const tSwipe = await page.evaluate(() => Math.round(performance.now()));
    let method = 'touch-gesture';
    try {
      const cdp = await ctx.newCDPSession(page); // 本工具自己啟動的無頭瀏覽器，不是 9333
      await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(vp.width / 2), y: Math.round(vp.height * 0.7), yDistance: -C.THRESHOLDS.earlySwipePx, speed: 2500, gestureSourceType: 'touch' });
    } catch { method = 'scrollBy'; await page.evaluate((d) => { window.__hcSelfScroll = true; window.scrollBy(0, d); window.__hcSelfScroll = false; }, C.THRESHOLDS.earlySwipePx); }
    if ((await page.evaluate(() => scrollY)) - startY < 300) { // 無頭模式手勢偶爾不捲動 → 改用一般捲動（仍可抓到程式把頁面拉回）
      method += '→scrollBy'; await page.evaluate((d) => { window.__hcSelfScroll = true; window.scrollBy(0, d); window.__hcSelfScroll = false; }, C.THRESHOLDS.earlySwipePx);
    }
    const tEnd = await page.evaluate(() => Math.round(performance.now()));
    await page.waitForTimeout(C.THRESHOLDS.earlySwipeWatchMs);
    const hc = await page.evaluate(() => window.__hc);
    const r = judgeEarlySwipe(hc.ys.filter(([t]) => t >= tEnd), startY, C.THRESHOLDS);
    return mkCheck(r.status, r.status === 'WARN' ? `手勢沒有捲動頁面（${method}），無法判定` : `滑到 ${r.reached}px，${C.THRESHOLDS.earlySwipeWatchMs / 1000}s 內被拉回 ${r.pullbacks} 次（最多 ${r.worst}px），最後停在 ${r.finalY}px`,
      { ...r, method, samples: hc.calls.filter((c) => c.t >= tSwipe).slice(0, 3).map((c) => `${c.t}ms ${c.kind} ${c.stack}`) });
  } catch (e) { return mkCheck('FAIL', `早滑檢查失敗 ${String(e.message).slice(0, 120)}`); }
  finally { await page.close(); }
}

// 寶珠大小不縮：盤面要開局才出現；唯讀模式不開局（開局會建帳本），沒出現就 SKIP。
async function beadSize(ctx, base, sub) {
  const page = await ctx.newPage();
  const sizes = () => page.$$eval(sub.cellSelector, (els) => els.map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  try {
    await page.goto(base + sub.href, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    const s1 = await sizes();
    if (!s1.length) return mkCheck('SKIP', '盤面要開局後才出現；唯讀模式不開局');
    await page.waitForTimeout(4000);
    const s2 = await sizes();
    const min1 = Math.min(...s1), min2 = Math.min(...s2);
    return mkCheck(min2 >= sub.minPx && min2 >= min1 - 0.5 ? 'PASS' : 'FAIL', `寶珠最小 ${round(min1, 1)}px → 4 秒後 ${round(min2, 1)}px（下限 ${sub.minPx}px）`);
  } catch (e) { return mkCheck('FAIL', `寶珠頁載入失敗 ${String(e.message).slice(0, 120)}`); }
  finally { await page.close(); }
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.max(1, n) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

async function runGates(gates, log) {
  const res = [];
  for (const g of gates) {
    const t = Date.now();
    const [cmd, args] = g === 'tsc' ? [process.execPath, [path.join(REPO, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.json']] : [process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', '-s', g]];
    log(`gate ${g}…`);
    const r = await new Promise((done) => { const p = spawn(cmd, args, { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' }); let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d)); p.on('exit', (c) => done({ ok: c === 0, tail: out.slice(-400) })); });
    res.push({ name: g, status: r.ok ? 'PASS' : 'FAIL', ms: Date.now() - t, tail: r.ok ? '' : r.tail });
  }
  return res;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) { console.log(fs.readFileSync(path.join(HERE, 'README.md'), 'utf8')); return 0; }
  if (!a.base && !a.serve) throw new Error('請指定 --base <網址>、--prod 或 --serve');
  if (a.base && /:9333\b/.test(a.base)) throw new Error('禁止連到可見的 CDP 9333');
  const log = (s) => console.log(`[health ${new Date().toLocaleTimeString('zh-TW', { hour12: false })}] ${s}`);
  const outRoot = path.resolve(a.out || process.env.HC_OUT_DIR || path.join(os.tmpdir(), 'mingli-health-runs'));
  fs.mkdirSync(outRoot, { recursive: true });
  const g = diskGuard(outRoot, C.DISK.minFreeGbForRun);
  if (!g.ok) throw new Error(`輸出位置只剩 ${g.freeGb}G，拒絕執行`);
  const lock = acquireLock({ base: a.base || 'serve', cwd: REPO, agent: process.env.HC_AGENT || null });
  if (!lock.ok) { console.error(`另一個健康檢查正在執行（${JSON.stringify(lock.heldBy)}），鎖檔 ${lock.file}；請等它結束或共用它的報告。`); return 75; }
  const cleanup = [() => releaseLock(lock.file)];
  const onSig = () => { for (const f of cleanup) { try { f(); } catch {} } process.exit(130); };
  process.on('SIGINT', onSig); process.on('SIGTERM', onSig);
  const t0 = Date.now();
  try {
    let base = a.base, build = 'none（指向既有伺服器）', target;
    if (a.serve) { const s = await ensureServer(a, log); cleanup.unshift(s.stop); base = s.base; build = s.build; target = 'local-start'; }
    base = base.replace(/\/$/, '');
    if (!a.serve) target = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(base) ? 'local-existing' : 'remote';
    a.target = target;
    const label = a.label || (target === 'remote' ? new URL(base).hostname.split('.')[0] : target);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const runDir = path.join(outRoot, `${stamp}-${label}`);
    const shotsDir = path.join(runDir, 'shots');
    fs.mkdirSync(shotsDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, '.hc-run'), '');
    const pw = loadPlaywright();
    const launch = () => pw.chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const H = { browser: await launch(), ctx: null, reviving: null, crashes: 0 };
    cleanup.unshift(() => H.browser.close());
    const cards = [C.HOME, ...C.CARDS].filter((c) => !a.only || a.only.includes(c.id) || a.only.includes(String(c.n)));
    const rows = [], blockedWrites = [], subRows = [];
    for (const width of a.widths) {
      const vp = C.VIEWPORTS.find((v) => v.width === width) || { width, height: width < 800 ? 844 : 900, mobile: width < 800 };
      const blocked = [];
      const newCtx = async () => {
        const ctx = await H.browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1, locale: 'zh-TW', serviceWorkers: 'block' });
        await ctx.addInitScript(INIT_SCRIPT);
        if (a.readOnly) await ctx.route('**/*', (route) => {
          const r = route.request();
          if (['GET', 'HEAD', 'OPTIONS'].includes(r.method())) return route.continue();
          let card = '?'; try { card = new URL(r.frame().page().url()).pathname; } catch {}
          blocked.push({ width, card, method: r.method(), url: r.url().split('?')[0].slice(0, 140) });
          return route.abort('blockedbyclient');
        });
        return ctx;
      };
      // 瀏覽器崩潰（多半是機器記憶體不足）→ 重開一次再測；連兩次都崩就標 SKIP 並寫明，不算 PASS 也不冒充產品故障。
      const revive = () => (H.reviving ||= (async () => {
        H.crashes++; log(`瀏覽器崩潰，重新啟動（第 ${H.crashes} 次）`);
        try { await H.browser.close(); } catch {}
        H.browser = await launch(); H.ctx = await newCtx();
      })().finally(() => { H.reviving = null; }));
      const guarded = async (fn, fallback) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try { if (H.reviving) await H.reviving; return await fn(H.ctx); }
          catch (e) { if (!H.browser.isConnected() || /crash|closed|Target/i.test(String(e.message))) { await revive().catch(() => {}); continue; } return fallback(e); }
        }
        return fallback(new Error('瀏覽器連續崩潰'));
      };
      H.ctx = await newCtx();
      log(`寬度 ${width}：${cards.length} 頁`);
      const rs = await pool(cards, a.concurrency, (c) => guarded((ctx) => checkPage(ctx, base, c, vp, a, shotsDir, blocked),
        (e) => ({ n: c.n, id: c.id, name: c.name, href: c.href, width, status: 'SKIP', nav: { ok: false, error: String(e.message).slice(0, 120) },
          checks: { load: mkCheck('SKIP', `測試瀏覽器崩潰兩次，未判定（${String(e.message).slice(0, 80)}）；可能是機器記憶體不足，也可能是頁面過重，需另測`) } })));
      if (vp.mobile && a.earlySwipe && rs[0]?.id === 'home' && rs[0].status !== 'SKIP') {
        const runs = [];
        for (let i = 0; i < C.THRESHOLDS.earlySwipeRuns; i++) runs.push(await guarded((ctx) => earlySwipe(ctx, base, vp), (e) => mkCheck('SKIP', `早滑未判定：${String(e.message).slice(0, 80)}`)));
        const worst = runs.find((r) => r.status === 'FAIL') || runs.find((r) => r.status === 'PASS') || runs[0];
        rs[0].checks.earlySwipe = { ...worst, summary: `${runs.length} 次：` + runs.map((r) => r.status).join('/') + '；' + worst.summary };
      }
      if (a.subflows && !a.only) for (const sub of C.SUBFLOWS) subRows.push({ id: sub.id, width, checks: { beadSize: await guarded((ctx) => beadSize(ctx, base, sub), (e) => mkCheck('SKIP', String(e.message).slice(0, 80))) } });
      for (const r of rs) r.status = overallStatus(r.checks);
      rows.push(...rs); blockedWrites.push(...blocked);
      await H.ctx.close().catch(() => {});
    }
    const gates = await runGates(a.gates, log);
    const gateRows = gates.map((x) => ({ id: `gate:${x.name}`, checks: { gates: { status: x.status } } }));
    const groups = gates.length ? { ...CHECK_GROUPS, stability: [...CHECK_GROUPS.stability, 'gates'] } : CHECK_GROUPS;
    const rep = {
      tool: 'mingli-health-v1', base, target, label, readOnly: a.readOnly, build,
      gitSha: target === 'local-start' ? gitSha() : (a.serverSha || null), toolSha: gitSha(),
      startedAt: new Date(t0).toISOString(), startedAtLocal: new Date(t0).toLocaleString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' }) + ' (UTC+8)',
      elapsedSec: round((Date.now() - t0) / 1000, 0), host: { cpus: os.cpus().length, loadAvgAtEnd: os.loadavg().map((x) => round(x, 1)) }, widths: a.widths, thresholds: C.THRESHOLDS,
      rows, subflows: subRows, gates, blockedWrites, browserCrashes: H.crashes,
      michelin: michelin([...rows, ...subRows, ...gateRows], C.MICHELIN_TARGETS, groups),
    };
    rep.summary = { pages: rows.length, pass: rows.filter((r) => r.status === 'PASS').length, warn: rows.filter((r) => r.status === 'WARN').length, fail: rows.filter((r) => r.status === 'FAIL').length, skip: rows.filter((r) => r.status === 'SKIP').length };
    let prevFile = a.compare;
    if (a.compare === 'auto') { const prev = fs.readdirSync(outRoot).filter((d) => d.endsWith(`-${label}`) && path.join(outRoot, d) !== runDir && fs.existsSync(path.join(outRoot, d, 'report.json'))).sort().pop(); prevFile = prev ? path.join(outRoot, prev, 'report.json') : null; }
    if (prevFile && fs.existsSync(prevFile)) rep.compare = { against: prevFile, ...compareRuns(JSON.parse(fs.readFileSync(prevFile, 'utf8')), rep) };
    const removed = pruneOwnRuns(outRoot, a.keep);
    rep.disk = { outRoot, freeGbAfter: diskGuard(outRoot, 0).freeGb, prunedOwnRuns: removed };
    fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(rep, null, 2));
    fs.writeFileSync(path.join(runDir, 'report.md'), renderMarkdown(rep));
    const du = (d) => fs.readdirSync(d, { recursive: true }).reduce((s, f) => { try { return s + fs.statSync(path.join(d, f)).size; } catch { return s; } }, 0);
    const m = rep.michelin;
    log(`完成 ${rep.elapsedSec}s：${rep.summary.pass} PASS／${rep.summary.warn} WARN／${rep.summary.fail} FAIL；米其林 品質${m.quality.score} 穩定${m.stability.score} 服務${m.service.score}；輸出 ${runDir}（${round(du(runDir) / 1048576, 2)}MB）`);
    return rep.summary.fail ? 1 : 0;
  } finally {
    for (const f of cleanup) { try { await f(); } catch {} }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c ?? 0), (e) => { console.error(`[health] ${e.message}`); releaseLock(); process.exit(2); });
}
