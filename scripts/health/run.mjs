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
import { acquireLock, releaseLock, startLockHeartbeat, diskGuard, pruneOwnRuns, pickPort, startServer, listProcesses, findNextConflicts, michelin, coverage, overallStatus, renderMarkdown, compareRuns, round, CHECK_GROUPS } from './lib.mjs';
import { judge, judgeEarlySwipe, mkCheck } from './judge.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
export const TOOL_VERSION = 'mingli-health-v2';

export class UsageError extends Error {}

export function parseArgs(argv) {
  const a = { widths: C.VIEWPORTS.map((v) => v.width), concurrency: 2, keep: 5, readOnly: true, shots: 'fail', subflows: true, earlySwipe: true, gates: [], settleMs: C.THRESHOLDS.settleMs, waitForBuildsMin: 0 };
  const int = (k, s, min, max) => { const n = Number(s); if (!Number.isInteger(n) || n < min || n > max) throw new UsageError(`${k} 需要 ${min}–${max} 的整數，收到「${s}」`); return n; };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => { const x = argv[++i]; if (x === undefined || (x.startsWith('--') && x.length > 2)) throw new UsageError(`${k} 後面缺少值`); return x; };
    if (k === '--base') { a.base = v(); try { const u = new URL(a.base); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { throw new UsageError(`--base 不是 http(s) 網址：「${a.base}」`); } }
    else if (k === '--prod') a.base = process.env.HC_PROD_URL || 'https://heaven-earth-humanity-pair.vercel.app';
    else if (k === '--serve') a.serve = true;
    else if (k === '--build') a.build = true;
    else if (k === '--reuse-any-build') a.reuseAnyBuild = true;
    else if (k === '--widths') a.widths = v().split(',').map((s) => int('--widths', s.trim(), 200, 4000));
    else if (k === '--only') a.only = v().split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--cards') a.cardsFile = v();
    else if (k === '--out') a.out = v();
    else if (k === '--keep') a.keep = int('--keep', v(), 1, 200);
    else if (k === '--compare') a.compare = v();
    else if (k === '--concurrency') a.concurrency = int('--concurrency', v(), 1, 8);
    else if (k === '--settle-ms') a.settleMs = int('--settle-ms', v(), 0, 60000);
    else if (k === '--wait-for-builds') a.waitForBuildsMin = int('--wait-for-builds', v(), 0, 120);
    else if (k === '--allow-writes') a.readOnly = false;
    else if (k === '--shots') { a.shots = v(); if (!['none', 'fail', 'all'].includes(a.shots)) throw new UsageError(`--shots 只能是 none|fail|all，收到「${a.shots}」`); }
    else if (k === '--no-subflows') a.subflows = false;
    else if (k === '--no-early-swipe') a.earlySwipe = false;
    else if (k === '--gates') a.gates = v().split(',').filter(Boolean);
    else if (k === '--label') a.label = v();
    else if (k === '--server-sha') a.serverSha = v();
    else if (k === '--help' || k === '-h') a.help = true;
    else throw new UsageError(`不認得的參數 ${k}（--help 看用法）`);
  }
  if (!a.widths.length) throw new UsageError('--widths 至少要一個寬度');
  for (const g of a.gates) if (!/^[a-z0-9:_-]+$/i.test(g)) throw new UsageError(`--gates 名稱只能有英數與 : _ -，收到「${g}」`);
  if (a.compare !== undefined && a.compare !== 'auto' && !fs.existsSync(a.compare)) throw new UsageError(`--compare 指定的檔案不存在：${a.compare}`);
  return a;
}

// 依 --cards／--only 決定要測哪些頁；打錯字或篩到 0 頁 → UsageError（exit 2），不會「0 FAIL」當全過。
export function selectCards(a, cfg = { HOME: C.HOME, CARDS: C.CARDS }) {
  let home = cfg.HOME, cards = cfg.CARDS;
  if (a.cardsFile) {
    let j; try { j = JSON.parse(fs.readFileSync(a.cardsFile, 'utf8')); } catch (e) { throw new UsageError(`--cards 讀不到或不是 JSON：${e.message}`); }
    if (!Array.isArray(j.cards) || !j.cards.every((c) => c && c.id && c.href && Number.isInteger(c.n))) throw new UsageError('--cards 格式：{ home?: {n,id,href,name}, cards: [{n,id,href,name}] }');
    home = j.home || null; cards = j.cards;
  }
  const all = [home, ...cards].filter(Boolean);
  if (a.only) {
    const known = new Set(all.flatMap((c) => [c.id, String(c.n)]));
    const bad = a.only.filter((x) => !known.has(x));
    if (bad.length) throw new UsageError(`--only 有不認得的卡：${bad.join(',')}（可用：${all.map((c) => `${c.n}/${c.id}`).join(' ')}）`);
  }
  const picked = all.filter((c) => !a.only || a.only.includes(c.id) || a.only.includes(String(c.n)));
  if (!picked.length) throw new UsageError('篩選後沒有任何頁面可測');
  return { picked, homeCards: cards };
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
// 影響建置的檔案：除了報告／文件／測試輸出之外都算（舊版只看 app、components、lib，漏掉 features、cards、data、public…）。
const BUILD_IRRELEVANT = /^(reports|docs|logs|tests|\.tmp|tmp|_tmp_[^/]*)\/|\.(md|txt|log)$/i;
const gitDirty = () => {
  try { return sh('git', ['status', '--porcelain', '--untracked-files=normal']).split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '')).filter((f) => !BUILD_IRRELEVANT.test(f)).length > 0; }
  catch { return true; }
};

// 建置／重用 .next 之前：其他 next build 或同 repo 正在跑的 next start/dev 都會撞到。
async function guardBuildConflicts(a, log, { building }) {
  const deadline = Date.now() + a.waitForBuildsMin * 60e3;
  for (;;) {
    const procs = listProcesses();
    if (!procs) { log('注意：無法列出行程，略過建置衝突偵測'); return { checked: false }; }
    const c = findNextConflicts(procs, REPO);
    const blocking = [...c.builds.filter((b) => building || b.inRepo), ...(building ? c.sameRepoServers : [])];
    if (!blocking.length) return { checked: true, otherBuilds: c.builds.length };
    const desc = blocking.map((p) => `pid ${p.pid} ${p.kind || 'build'}${p.inRepo ? '（同 repo）' : ''}`).join('、');
    if (Date.now() >= deadline) throw new Error(`偵測到其他 next 行程：${desc}。${building ? '建置會搶記憶體或覆蓋同一個 .next' : '同 repo 正在建置，.next 可能是半成品'}；請等它結束、改用 --base／--prod，或加 --wait-for-builds <分鐘>`);
    log(`等其他 next 行程結束：${desc}`);
    await new Promise((r) => setTimeout(r, 15000));
  }
}

// 建置最多一次：.next/HC_BUILD_SHA 與 HEAD 一致且程式沒改 → 直接重用。
async function ensureServer(a, log) {
  const dist = path.join(REPO, '.next');
  const marker = path.join(dist, 'HC_BUILD_SHA');
  const sha = gitSha();
  const hasBuild = fs.existsSync(path.join(dist, 'BUILD_ID'));
  const dirty = gitDirty();
  const markerOk = hasBuild && fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').trim() === sha && !dirty;
  let build = 'reused';
  const needBuild = !markerOk && !(hasBuild && a.reuseAnyBuild);
  if (needBuild && !a.build) throw new Error(hasBuild ? `.next 不是本工具為 ${sha} 建的${dirty ? '（工作區有未提交的改動）' : ''}；加 --build 重建，或 --reuse-any-build` : '沒有 .next；加 --build（先檢查硬碟 ≥6G），或用 --base 指向已在跑的伺服器');
  await guardBuildConflicts(a, log, { building: needBuild });
  if (needBuild) {
    const g = diskGuard(REPO, C.DISK.minFreeGbForBuild);
    if (!g.ok) throw new Error(`硬碟只剩 ${g.freeGb}G（< ${g.minGb}G），拒絕建置；請改用 --base 指向已在跑的伺服器或 --prod`);
    const memGb = round(os.freemem() / 1024 ** 3, 1);
    if (memGb < C.DISK.minFreeMemGbForBuild) throw new Error(`可用記憶體只剩 ${memGb}G（< ${C.DISK.minFreeMemGbForBuild}G），拒絕建置`);
    if (process.env.HC_BUILD_CACHE_DIR && !fs.existsSync(path.join(dist, 'cache'))) {
      fs.mkdirSync(dist, { recursive: true }); fs.mkdirSync(process.env.HC_BUILD_CACHE_DIR, { recursive: true });
      fs.symlinkSync(process.env.HC_BUILD_CACHE_DIR, path.join(dist, 'cache'), 'junction');
    }
    const t = Date.now();
    log(`next build（HEAD ${sha}）…`);
    try { fs.rmSync(marker, { force: true }); } catch {}
    await new Promise((res, rej) => {
      const p = spawn(process.execPath, [path.join(REPO, 'node_modules/next/dist/bin/next'), 'build'], { cwd: REPO, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
      p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`next build exit ${c}`))));
    });
    // 建置當下工作區是乾淨的才寫標記；髒的建置下次不會被當成 HEAD 重用
    if (!gitDirty()) fs.writeFileSync(marker, sha + '\n');
    build = `built in ${round((Date.now() - t) / 1000, 0)}s`;
  }
  const buildId = fs.readFileSync(path.join(dist, 'BUILD_ID'), 'utf8').trim();
  const port = await pickPort(3400, 3499, C.RESERVED_PORTS);
  // 身分核對：只有用這個 .next 起的伺服器才有 /_next/static/<BUILD_ID>/_buildManifest.js
  const manifest = path.join(dist, 'static', buildId, '_buildManifest.js');
  const identity = fs.existsSync(manifest) ? async (base) => (await fetch(`${base}/_next/static/${buildId}/_buildManifest.js`, { signal: AbortSignal.timeout(5000) })).status === 200 : null;
  const s = await startServer(process.execPath, [path.join(REPO, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], { cwd: REPO, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, port, timeoutMs: 120000, identity });
  return { base: s.base, build, buildId, server: s, stop: s.stop };
}

const EMPTY_METRICS = (w) => ({ tap: { total: 0, small: 0, under24: 0, samples: [] }, font: { chars: 0, smallChars: 0, share: 0, minPx: null, tinyRuns: [], tinyCount: 0, sizes: {} }, contrast: { checked: 0, unknown: 0, low: 0, samples: [] }, overflow: { vw: w, scrollWidth: w, samples: [], clipped: 0 }, images: { total: 0, broken: 0, samples: [] }, media: 0, visibleError: null, hc: null });
const isCrash = (e) => /crash|has been closed|Target closed|Target page|browser has disconnected/i.test(String(e?.message || e));

async function checkPage(ctx, base, card, vp, a, shotsDir, net, homeCards) {
  const page = await ctx.newPage();
  try {
    const errs = { console: [], page: [], http: [], failed: [], blockedOnPage: 0 };
    net.pages.set(page, errs);
    page.on('console', (msg) => { if (msg.type() === 'error') errs.console.push(msg.text().slice(0, 200)); });
    page.on('pageerror', (e) => errs.page.push(String(e.message).slice(0, 200)));
    page.on('response', (r) => { if (r.status() >= 400) errs.http.push({ status: r.status(), url: r.url().slice(0, 160), type: r.request().resourceType() }); });
    page.on('requestfailed', (req) => { if (net.blocked.has(req)) return; errs.failed.push({ url: req.url().slice(0, 160), error: req.failure()?.errorText || 'failed', type: req.resourceType() }); });
    const nav = { ok: false };
    const t0 = Date.now();
    try {
      const resp = await page.goto(base + card.href, { waitUntil: 'load', timeout: 60000 });
      const timing = await page.evaluate(() => { const e = performance.getEntriesByType('navigation')[0]; return e ? { dcl: Math.round(e.domContentLoadedEventEnd), load: Math.round(e.loadEventEnd) } : {}; });
      Object.assign(nav, { ok: !!resp && resp.status() < 400, status: resp?.status(), ...timing, wallMs: Date.now() - t0 });
      if (!nav.ok) nav.error = `HTTP ${resp?.status()}`;
    } catch (e) { if (isCrash(e)) throw e; nav.error = String(e.message).split('\n')[0].slice(0, 160); }
    await page.waitForTimeout(nav.ok ? a.settleMs : Math.min(500, a.settleMs)); // 等晚到的橫幅／後端文字，CLS 才抓得到；沒載入就不必久等
    let m;
    try { m = await page.evaluate(metricsScript({ ...C.THRESHOLDS, visibleErrorRe: C.VISIBLE_ERROR_RE.source })); }
    catch (e) { if (isCrash(e)) throw e; m = EMPTY_METRICS(vp.width); if (nav.ok) { nav.ok = false; nav.error = `量測失敗 ${String(e.message).slice(0, 120)}`; } }
    const checks = judge(m, errs, nav, C.THRESHOLDS, card, { envGapApis: a.target === 'remote' ? null : C.LOCAL_ENV_GAP_APIS });
    if (card.id === 'home' && nav.ok) {
      // 依畫面上的實際位置排序（DOM 順序與視覺順序不同，CSS order 會重排）
      const hrefs = await page.$$eval(C.HOME_CARD_SELECTOR, (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { top: r.top + scrollY, left: r.left, href: e.getAttribute('href') || e.querySelector('a')?.getAttribute('href') || '' }; })
        .sort((x, y) => x.top - y.top || x.left - y.left).map((x) => x.href)).catch(() => []);
      const want = homeCards.map((c) => c.href);
      const same = hrefs.length === want.length && hrefs.every((h, i) => h === want[i]);
      checks.homeCards = mkCheck(same ? 'PASS' : 'FAIL', same ? `首頁 ${hrefs.length} 張入口，順序與設定一致` : `首頁入口 ${hrefs.length} 張，與設定不一致`, { samples: same ? [] : [hrefs.join(' ')] });
    }
    const status = overallStatus(checks);
    let shot = null;
    if (a.shots === 'all' || (a.shots === 'fail' && status === 'FAIL')) {
      shot = path.join(shotsDir, `${String(card.n).padStart(2, '0')}-${card.id}-${vp.width}.jpg`);
      await page.screenshot({ path: shot, type: 'jpeg', quality: 50 }).catch(() => { shot = null; });
    }
    return { n: card.n, id: card.id, name: card.name, href: card.href, width: vp.width, status, nav, checks, shot: shot && path.basename(shot),
      metrics: { fontSizes: m.font.sizes, tapTotal: m.tap.total, contrastChecked: m.contrast.checked, contrastUnknown: m.contrast.unknown, contrastGradient: m.contrast.gradient || 0, contrastUnknownBy: m.contrast.unknownBy || null, images: m.images?.total || 0 } };
  } finally { net.pages.delete(page); await page.close().catch(() => {}); }
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
    } catch (e) { if (isCrash(e)) throw e; method = 'scrollBy'; await page.evaluate((d) => { window.__hcSelfScroll = true; window.scrollBy(0, d); window.__hcSelfScroll = false; }, C.THRESHOLDS.earlySwipePx); }
    if ((await page.evaluate(() => scrollY)) - startY < 300) { // 無頭模式手勢偶爾不捲動 → 改用一般捲動（仍可抓到程式把頁面拉回）
      method += '→scrollBy'; await page.evaluate((d) => { window.__hcSelfScroll = true; window.scrollBy(0, d); window.__hcSelfScroll = false; }, C.THRESHOLDS.earlySwipePx);
    }
    const tEnd = await page.evaluate(() => Math.round(performance.now()));
    await page.waitForTimeout(C.THRESHOLDS.earlySwipeWatchMs);
    const hc = await page.evaluate(() => window.__hc);
    const r = judgeEarlySwipe(hc.ys.filter(([t]) => t >= tEnd), startY, C.THRESHOLDS);
    return mkCheck(r.status, r.status === 'WARN' ? `手勢沒有捲動頁面（${method}），無法判定` : `滑到 ${r.reached}px，${C.THRESHOLDS.earlySwipeWatchMs / 1000}s 內被拉回 ${r.pullbacks} 次（最多 ${r.worst}px），最後停在 ${r.finalY}px`,
      { ...r, method, samples: hc.calls.filter((c) => c.t >= tSwipe).slice(0, 3).map((c) => `${c.t}ms ${c.kind} ${c.stack}`) });
  } catch (e) { if (isCrash(e)) throw e; return mkCheck('SKIP', `早滑檢查未完成（工具端錯誤，未判定）：${String(e.message).slice(0, 120)}`); }
  finally { await page.close().catch(() => {}); }
}

// 寶珠大小不縮：盤面要開局才出現；唯讀模式不開局（開局會建帳本），沒出現就 SKIP。
async function beadSize(ctx, base, sub) {
  const page = await ctx.newPage();
  const sizes = () => page.$$eval(sub.cellSelector, (els) => els.map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  try {
    const resp = await page.goto(base + sub.href, { waitUntil: 'load', timeout: 60000 });
    if (!resp || resp.status() >= 400) return mkCheck('SKIP', `寶珠頁 HTTP ${resp?.status()}，未判定`);
    await page.waitForTimeout(1500);
    const s1 = await sizes();
    if (!s1.length) return mkCheck('SKIP', '盤面要開局後才出現；唯讀模式不開局');
    await page.waitForTimeout(4000);
    const s2 = await sizes();
    const min1 = Math.min(...s1), min2 = Math.min(...s2);
    return mkCheck(min2 >= sub.minPx && min2 >= min1 - 0.5 ? 'PASS' : 'FAIL', `寶珠最小 ${round(min1, 1)}px → 4 秒後 ${round(min2, 1)}px（下限 ${sub.minPx}px）`);
  } catch (e) { if (isCrash(e)) throw e; return mkCheck('SKIP', `寶珠頁未完成（工具端錯誤，未判定）：${String(e.message).slice(0, 120)}`); }
  finally { await page.close().catch(() => {}); }
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
  if (!a.base && !a.serve) throw new UsageError('請指定 --base <網址>、--prod 或 --serve');
  if (a.base && /:9333\b/.test(a.base)) throw new UsageError('禁止連到可見的 CDP 9333');
  const { picked: cards, homeCards } = selectCards(a);
  const pw = loadPlaywright(); // 先確認工具齊全，再建資料夾、拿鎖
  const log = (s) => console.log(`[health ${new Date().toLocaleTimeString('zh-TW', { hour12: false })}] ${s}`);
  const outRoot = path.resolve(a.out || process.env.HC_OUT_DIR || path.join(os.tmpdir(), 'mingli-health-runs'));
  fs.mkdirSync(outRoot, { recursive: true });
  const g = diskGuard(outRoot, C.DISK.minFreeGbForRun);
  if (!g.ok) throw new Error(`輸出位置只剩 ${g.freeGb}G，拒絕執行`);
  const lock = acquireLock({ base: a.base || 'serve', cwd: REPO, agent: process.env.HC_AGENT || null });
  if (!lock.ok) { console.error(`另一個健康檢查正在執行（${JSON.stringify(lock.heldBy)}；${lock.reason}），鎖檔 ${lock.file}；請等它結束或共用它的報告。`); return 75; }
  const stopBeat = startLockHeartbeat(lock.file);
  const cleanup = [() => stopBeat(), () => releaseLock(lock.file)];
  let cleaning = null;
  const runCleanup = () => (cleaning ||= (async () => { for (const f of cleanup) { try { await Promise.race([f(), new Promise((r) => setTimeout(r, 5000))]); } catch {} } })());
  const onSig = () => { runCleanup().finally(() => process.exit(130)); };
  process.on('SIGINT', onSig); process.on('SIGTERM', onSig);
  const t0 = Date.now();
  const warnings = [];
  try {
    let base = a.base, build = 'none（指向既有伺服器）', target, server = null;
    if (a.serve) { const s = await ensureServer(a, log); cleanup.unshift(s.stop); base = s.base; build = s.build; target = 'local-start'; server = s.server; }
    base = base.replace(/\/$/, '');
    if (!a.serve) target = /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/.test(base) ? 'local-existing' : 'remote';
    a.target = target;
    const label = a.label || (target === 'remote' ? new URL(base).hostname.split('.')[0] : target);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const runDir = path.join(outRoot, `${stamp}-${label}`);
    const shotsDir = path.join(runDir, 'shots');
    fs.mkdirSync(shotsDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, '.hc-run'), '');
    const launch = () => pw.chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const H = { browser: await launch(), ctx: null, reviving: null, crashes: 0 };
    cleanup.unshift(() => H.browser.close());
    const rows = [], blockedWrites = [], subRows = [];
    const deployIds = new Set();
    for (const width of a.widths) {
      const vp = C.VIEWPORTS.find((v) => v.width === width) || { width, height: width < 800 ? 844 : 900, mobile: width < 800 };
      const blocked = [];
      // net.pages：每頁自己的錯誤紀錄；net.blocked：本工具自己攔下的請求（requestfailed 不算它們）
      const net = { pages: new Map(), blocked: new WeakSet() };
      const newCtx = async () => {
        const ctx = await H.browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1, locale: 'zh-TW', serviceWorkers: 'block' });
        await ctx.addInitScript(INIT_SCRIPT);
        ctx.on('request', (r) => { const mm = /[?&]dpl=(dpl_[A-Za-z0-9]+)/.exec(r.url()); if (mm) deployIds.add(mm[1]); });
        if (a.readOnly) await ctx.route('**/*', (route) => {
          const r = route.request();
          if (['GET', 'HEAD', 'OPTIONS'].includes(r.method())) return route.continue();
          let card = '?', pg = null; try { pg = r.frame().page(); card = new URL(pg.url()).pathname; } catch {}
          blocked.push({ width, card, method: r.method(), url: r.url().split('?')[0].slice(0, 140) });
          net.blocked.add(r);
          const e = pg && net.pages.get(pg); if (e) e.blockedOnPage++;
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
          catch (e) { if (!H.browser.isConnected() || isCrash(e)) { await revive().catch(() => {}); continue; } return fallback(e); }
        }
        return fallback(new Error('瀏覽器連續崩潰'));
      };
      H.ctx = await newCtx();
      log(`寬度 ${width}：${cards.length} 頁`);
      const rs = await pool(cards, a.concurrency, (c) => guarded((ctx) => checkPage(ctx, base, c, vp, a, shotsDir, net, homeCards),
        (e) => ({ n: c.n, id: c.id, name: c.name, href: c.href, width, status: 'SKIP', nav: { ok: false, error: String(e.message).slice(0, 120) },
          checks: { load: mkCheck('SKIP', `測試瀏覽器崩潰兩次，未判定（${String(e.message).slice(0, 80)}）；可能是機器記憶體不足，也可能是頁面過重，需另測`) } })));
      if (vp.mobile && a.earlySwipe && rs[0]?.id === 'home' && rs[0].status !== 'SKIP' && rs[0].nav?.ok) {
        const runs = [];
        for (let i = 0; i < C.THRESHOLDS.earlySwipeRuns; i++) runs.push(await guarded((ctx) => earlySwipe(ctx, base, vp), (e) => mkCheck('SKIP', `早滑未判定：${String(e.message).slice(0, 80)}`)));
        const worst = runs.find((r) => r.status === 'FAIL') || runs.find((r) => r.status === 'PASS') || runs[0];
        rs[0].checks.earlySwipe = { ...worst, summary: `${runs.length} 次：` + runs.map((r) => `${r.status}(${r.method || '—'})`).join('/') + '；' + worst.summary };
      }
      if (a.subflows && !a.only && !a.cardsFile) for (const sub of C.SUBFLOWS) subRows.push({ id: sub.id, width, page: false, checks: { beadSize: await guarded((ctx) => beadSize(ctx, base, sub), (e) => mkCheck('SKIP', String(e.message).slice(0, 80))) } });
      for (const r of rs) r.status = overallStatus(r.checks);
      rows.push(...rs); blockedWrites.push(...blocked);
      await H.ctx.close().catch(() => {});
      if (server?.exited()) { warnings.push(`本機伺服器在量測途中結束（code ${server.exited().code}），之後的結果不可信`); break; }
    }
    await H.browser.close().catch(() => {}); // 先關瀏覽器再跑 gates，避免 tsc＋Chromium 同時吃記憶體
    const gates = await runGates(a.gates, log);
    const gateRows = gates.map((x) => ({ id: `gate:${x.name}`, page: false, checks: { gates: { status: x.status } } }));
    const groups = gates.length ? { ...CHECK_GROUPS, stability: [...CHECK_GROUPS.stability, 'gates'] } : CHECK_GROUPS;
    // 本工具自己建置並成功啟動 = build 這一關有過
    const gatesRun = [...gates, ...(target === 'local-start' ? [{ name: 'build', status: 'PASS' }] : [])];
    if (deployIds.size > 1) warnings.push(`量測期間出現 ${deployIds.size} 個部署版本（${[...deployIds].join('、')}）——正式站可能在途中重新部署，結果混了兩版，建議重跑`);
    const contrastAll = rows.reduce((s, r) => ({ checked: s.checked + (r.metrics?.contrastChecked || 0), unknown: s.unknown + (r.metrics?.contrastUnknown || 0), gradient: s.gradient + (r.metrics?.contrastGradient || 0) }), { checked: 0, unknown: 0, gradient: 0 });
    const rep = {
      tool: TOOL_VERSION, base, target, label, readOnly: a.readOnly, build,
      gitSha: target === 'local-start' ? gitSha() : (a.serverSha || null), toolSha: gitSha(), deployIds: [...deployIds],
      startedAt: new Date(t0).toISOString(), startedAtLocal: new Date(t0).toLocaleString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' }) + ' (UTC+8)',
      elapsedSec: round((Date.now() - t0) / 1000, 0), host: { cpus: os.cpus().length, loadAvgAtEnd: os.loadavg().map((x) => round(x, 1)), freeMemGb: round(os.freemem() / 1024 ** 3, 1) }, widths: a.widths, only: a.only || null, thresholds: C.THRESHOLDS,
      warnings, rows, subflows: subRows, gates, blockedWrites, browserCrashes: H.crashes,
      server: server ? { pid: server.pid, exited: server.exited(), logTail: server.logTail().slice(-20) } : null,
      michelin: michelin([...rows, ...subRows, ...gateRows], C.MICHELIN_TARGETS, groups, { gatesRun }),
      coverage: coverage([...rows, ...subRows]),
      contrastCoverage: { ...contrastAll, pct: contrastAll.checked + contrastAll.unknown ? round(contrastAll.checked / (contrastAll.checked + contrastAll.unknown), 3) : null },
    };
    rep.summary = { pages: rows.length, pass: rows.filter((r) => r.status === 'PASS').length, warn: rows.filter((r) => r.status === 'WARN').length, fail: rows.filter((r) => r.status === 'FAIL').length, skip: rows.filter((r) => r.status === 'SKIP').length };
    let prevFile = a.compare;
    if (a.compare === 'auto') {
      // 同 label、同寬度組合、同樣是完整跑（或同一組 --only）才當基線
      const sameScope = (j) => JSON.stringify(j.widths) === JSON.stringify(a.widths) && JSON.stringify(j.only || null) === JSON.stringify(a.only || null);
      const prev = fs.readdirSync(outRoot).filter((d) => d.endsWith(`-${label}`) && path.join(outRoot, d) !== runDir && fs.existsSync(path.join(outRoot, d, 'report.json'))).sort().reverse()
        .find((d) => { try { return sameScope(JSON.parse(fs.readFileSync(path.join(outRoot, d, 'report.json'), 'utf8'))); } catch { return false; } });
      prevFile = prev ? path.join(outRoot, prev, 'report.json') : null;
      if (!prev) warnings.push('找不到同範圍的上次報告，未比較');
    }
    if (prevFile && fs.existsSync(prevFile)) rep.compare = { against: prevFile, ...compareRuns(JSON.parse(fs.readFileSync(prevFile, 'utf8')), rep) };
    const removed = pruneOwnRuns(outRoot, a.keep, { current: runDir });
    rep.disk = { outRoot, freeGbAfter: diskGuard(outRoot, 0).freeGb, prunedOwnRuns: removed };
    fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(rep, null, 2));
    fs.writeFileSync(path.join(runDir, 'report.md'), renderMarkdown(rep));
    const du = (d) => fs.readdirSync(d, { recursive: true }).reduce((s, f) => { try { return s + fs.statSync(path.join(d, f)).size; } catch { return s; } }, 0);
    const m = rep.michelin;
    const sc = (x) => `${x.score ?? '—'}${x.complete ? '' : '（不完整）'}`;
    log(`完成 ${rep.elapsedSec}s：${rep.summary.pass} PASS／${rep.summary.warn} WARN／${rep.summary.fail} FAIL／${rep.summary.skip} SKIP；涵蓋率 ${round((rep.coverage.pct || 0) * 100, 1)}%；${m.quality.name} ${sc(m.quality)}、${m.stability.name} ${sc(m.stability)}、${m.service.name} ${sc(m.service)}、整體 ${m.overall.score ?? '—'}；輸出 ${runDir}（${round(du(runDir) / 1048576, 2)}MB）`);
    for (const w of warnings) log(`注意：${w}`);
    return rep.summary.fail || warnings.some((w) => /不可信|混了兩版/.test(w)) ? 1 : 0;
  } finally {
    await runCleanup();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c ?? 0), (e) => { console.error(`[health] ${e instanceof UsageError ? '參數錯誤：' : ''}${e.message}`); releaseLock(); process.exit(2); });
}
