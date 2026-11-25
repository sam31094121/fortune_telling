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
import { mergeMobileRows, acquireLock, releaseLock, startLockHeartbeat, diskGuard, pruneOwnRuns, pickPort, startServer, listProcesses, findNextConflicts, michelin, coverage, overallStatus, renderMarkdown, compareRuns, round, clsFromEntries, CHECK_GROUPS, findBaseline, runScope, auditVerdict, makeRunDir } from './lib.mjs';
import { judge, judgeEarlySwipe, mkCheck, judgeTap, judgeFont, tbtFrom, judgeI18n, judgeOneLang } from './judge.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
export const TOOL_VERSION = 'mingli-health-v3'; // v3：瀏覽器層攔截＋快取、穩定即止、觸控早滑、13 項／頁＋extras、手機合併計分（和 v2 分數不能直接比）

export class UsageError extends Error {}
export const EXTRAS_ALL = ['i18n', 'rm', 'nav']; // 五語、減少動態、返回重進＋捲到底
let buildChild = null; // 建置中被 Ctrl+C 時要一起收掉

export function parseArgs(argv) {
  const a = { widths: C.VIEWPORTS.map((v) => v.width), concurrency: 2, keep: 5, readOnly: true, shots: 'fail', subflows: true, earlySwipe: true, gates: [], settleMs: C.THRESHOLDS.settleMs, waitForBuildsMin: 0, extras: [...EXTRAS_ALL], desktopProfile: null, strict: false, minCoverage: C.THRESHOLDS.minCoverage };
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
    else if (k === '--gates') a.gates = [...new Set(v().split(',').flatMap((g) => (g === 'all' ? GATE_ALL : [g])).filter(Boolean))];
    else if (k === '--label') a.label = v();
    else if (k === '--extras') { const x = v(); a.extras = x === 'none' ? [] : x === 'all' ? [...EXTRAS_ALL] : x.split(',').filter(Boolean); const bad = a.extras.filter((e) => !EXTRAS_ALL.includes(e)); if (bad.length) throw new UsageError(`--extras 只能是 none|all|${EXTRAS_ALL.join(',')}，收到「${bad.join(',')}」`); }
    else if (k === '--no-extras') a.extras = [];
    else if (k === '--desktop-profile') a.desktopProfile = true;
    else if (k === '--strict') a.strict = true;
    else if (k === '--min-coverage') { const n = Number(v()); if (!(n >= 0 && n <= 1)) throw new UsageError('--min-coverage 需要 0–1 的小數（例如 0.95）'); a.minCoverage = n; }
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
export const BUILD_IRRELEVANT = /^(reports|docs|logs|tests|\.tmp|tmp|_tmp_[^/]*)\/|\.(md|txt|log)$/i;
const gitDirty = () => {
  try { return sh('git', ['status', '--porcelain', '--untracked-files=normal']).split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '')).filter((f) => !BUILD_IRRELEVANT.test(f)).length > 0; }
  catch { return true; }
};

// distDir 最近有沒有被寫入（別人的 next build 正在寫同一個 .next）
export function distBusy(dir, withinMs = 60000, now = Date.now()) {
  try {
    for (const n of ['trace', 'BUILD_ID', 'build-manifest.json', 'server', 'static', 'cache', '.']) { const f = path.join(dir, n); if (fs.existsSync(f) && now - fs.statSync(f).mtimeMs < withinMs) return true; }
  } catch {}
  return false;
}
// 建置／重用 .next 之前：其他 next build 或同 repo 正在跑的 next start/dev 都會撞到。
async function guardBuildConflicts(a, log, { building }) {
  const deadline = Date.now() + a.waitForBuildsMin * 60e3;
  for (;;) {
    const procs = listProcesses();
    if (!procs) { log('注意：無法列出行程，略過建置衝突偵測'); return { checked: false }; }
    const c = findNextConflicts(procs, REPO);
    // 位置不明的 build（Windows 相對路徑）：只有在我們的 distDir 最近 60 秒有寫入時才當成同 repo 正在建置
    const busy = distBusy(path.join(REPO, DIST_DIR));
    const blocking = [...c.builds.filter((b) => building || b.inRepo === true || (b.inRepo === null && busy)), ...(building ? c.sameRepoServers.filter((x) => x.inRepo === true) : [])];
    if (!blocking.length) {
      if (c.builds.some((b) => b.inRepo === null)) log(`注意：有位置不明的 next build（pid ${c.builds.filter((b) => b.inRepo === null).map((b) => b.pid).join(',')}），${DIST_DIR} 最近沒有寫入，視為不同目錄的建置`);
      return { checked: true, otherBuilds: c.builds.length };
    }
    const desc = blocking.map((p) => `pid ${p.pid} ${p.kind || 'build'}${p.inRepo === true ? '（同 repo）' : p.inRepo === null ? `（位置不明${busy ? `，${DIST_DIR} 正在被寫入` : ''}）` : ''}`).join('、');
    if (Date.now() >= deadline) throw new Error(`偵測到其他 next 行程：${desc}。${building ? '建置會搶記憶體或覆蓋同一個 .next' : '同 repo 正在建置，.next 可能是半成品'}；請等它結束、改用 --base／--prod，或加 --wait-for-builds <分鐘>`);
    log(`等其他 next 行程結束：${desc}`);
    await new Promise((r) => setTimeout(r, 15000));
  }
}

// next build 遇到不在 include 裡的 distDir（例如 .next-hc2）會自己把「<distDir>/types/**/*.ts」寫進 tsconfig.json，
// 也可能改 next-env.d.ts。這是工具造成的改動：建置前記下原內容，建置後（成功或失敗）原樣還原，回傳被還原的檔名。
export const BUILD_TOUCHED = ['tsconfig.json', 'next-env.d.ts'];
export function snapshotFiles(root, names = BUILD_TOUCHED) {
  const snap = names.map((n) => { const f = path.join(root, n); return { n, f, buf: fs.existsSync(f) ? fs.readFileSync(f) : null }; });
  return () => snap.filter(({ f, buf }) => {
    const now = fs.existsSync(f) ? fs.readFileSync(f) : null;
    if (buf === null ? now === null : now !== null && buf.equals(now)) return false;
    if (buf === null) fs.rmSync(f, { force: true }); else fs.writeFileSync(f, buf);
    return true;
  }).map(({ n }) => n);
}

// 建置最多一次：.next/HC_BUILD_SHA 與 HEAD 一致且程式沒改 → 直接重用。
async function ensureServer(a, log) {
  const dist = path.join(REPO, DIST_DIR);
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
    const restore = snapshotFiles(REPO);
    try {
      await new Promise((res, rej) => {
        const p = spawn(process.execPath, [path.join(REPO, 'node_modules/next/dist/bin/next'), 'build'], { cwd: REPO, stdio: 'inherit', env: childEnv() });
        buildChild = p;
        p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`next build exit ${c}`))));
      });
    } finally {
      const back = restore();
      if (back.length) log(`next build 改了 ${back.join('、')}（自動加入 ${DIST_DIR}/types），已原樣還原`);
    }
    // 建置當下工作區是乾淨的才寫標記；髒的建置下次不會被當成 HEAD 重用
    if (!gitDirty()) fs.writeFileSync(marker, sha + '\n');
    build = `built in ${round((Date.now() - t) / 1000, 0)}s`;
  }
  const buildId = fs.readFileSync(path.join(dist, 'BUILD_ID'), 'utf8').trim();
  const port = await pickPort(3400, 3499, C.RESERVED_PORTS);
  // 身分核對：只有用這個 .next 起的伺服器才有 /_next/static/<BUILD_ID>/_buildManifest.js
  const manifest = path.join(dist, 'static', buildId, '_buildManifest.js');
  const identity = fs.existsSync(manifest) ? async (base) => (await fetch(`${base}/_next/static/${buildId}/_buildManifest.js`, { signal: AbortSignal.timeout(5000) })).status === 200 : null;
  const s = await startServer(process.execPath, [path.join(REPO, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], { cwd: REPO, env: childEnv(), port, timeoutMs: 120000, identity });
  return { base: s.base, build, buildId, server: s, stop: s.stop };
}

const EMPTY_METRICS = (w) => ({ tap: { total: 0, small: 0, under24: 0, samples: [] }, font: { chars: 0, smallChars: 0, share: 0, minPx: null, tinyRuns: [], tinyCount: 0, sizes: {} }, contrast: { checked: 0, unknown: 0, low: 0, samples: [] }, overflow: { vw: w, scrollWidth: w, samples: [], clipped: 0 }, images: { total: 0, broken: 0, samples: [] }, media: 0, visibleError: null, hc: null });
// 正式站每個 chunk 網址都帶 Vercel 部署 id（?dpl=dpl_xxx）
export const deployIdOf = (url) => (/[?&]dpl=(dpl_[A-Za-z0-9]+)/.exec(String(url)) || [])[1] || null;
export const isCrash = (e) => /crash|has been closed|Target closed|Target page|browser has disconnected/i.test(String(e?.message || e));
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const T = C.THRESHOLDS;

// 每頁的網路紀錄＋「穩定即止」需要的進行中請求數。唯讀攔下的寫入（ERR_BLOCKED_BY_CLIENT 的非 GET）另計，不算連線失敗。
function watchPage(page, card, base, ro) {
  const errs = { console: [], page: [], http: [], failed: [], blockedOnPage: 0 };
  const netState = { inflight: 0, last: Date.now() };
  const bump = (d) => { netState.inflight = Math.max(0, netState.inflight + d); netState.last = Date.now(); };
  page.on('console', (msg) => { if (msg.type() === 'error') errs.console.push(msg.text().slice(0, 200)); });
  page.on('pageerror', (e) => errs.page.push(String(e.message).slice(0, 200)));
  page.on('request', () => bump(1));
  page.on('requestfinished', () => bump(-1));
  page.on('response', (r) => { if (r.status() >= 400) errs.http.push({ status: r.status(), url: r.url().slice(0, 160), type: r.request().resourceType() }); });
  page.on('requestfailed', (req) => {
    bump(-1);
    const f = req.failure()?.errorText || 'failed';
    if (ro && !SAFE.has(req.method()) && /BLOCKED_BY_CLIENT/.test(f)) {
      errs.blockedOnPage++;
      const b = ro.blocked.find((x) => !x.card && x.method === req.method() && req.url().startsWith(x.url));
      if (b) b.card = new URL(card.href, base).pathname;
      return;
    }
    errs.failed.push({ url: req.url().slice(0, 160), error: f, type: req.resourceType() });
  });
  return { errs, netState };
}

// 穩定即止：至少 minMs；之後 DOM 變動、版面位移、網路（含進行中的請求）都安靜 quietMs 就結束；最多 maxMs。
export async function settlePage(page, netState, { minMs, quietMs, maxMs }) {
  const start = Date.now();
  minMs = Math.min(minMs, maxMs);
  for (;;) {
    const el = Date.now() - start;
    if (el >= maxMs) return { ms: el, reason: 'max' };
    if (el >= minMs) {
      const st = await page.evaluate(() => { const H = window.__hc; if (!H) return null; const now = performance.now(); const lastShift = H.shifts.length ? H.shifts[H.shifts.length - 1].t : 0; return { sinceMut: now - (H.lastMut || 0), sinceShift: now - lastShift }; }).catch(() => null);
      const sinceNet = netState.inflight > 0 ? 0 : Date.now() - netState.last;
      if (st && Math.min(st.sinceMut, st.sinceShift, sinceNet) >= quietMs) return { ms: el, reason: 'quiet' };
    }
    await page.waitForTimeout(200);
  }
}

// 失敗截圖：把問題元素框起來（紅框＋類別），捲到第一個框附近再截目前畫面
async function shotWithMarks(page, file) {
  await page.evaluate(() => {
    const marks = window.__hcMarks || []; if (!marks.length) return;
    const root = document.createElement('div'); root.id = '__hc_marks'; root.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
    for (const m of marks) { const d = document.createElement('div'); d.style.cssText = `position:absolute;left:${m.x - 2}px;top:${m.y - 2}px;width:${m.w + 4}px;height:${m.h + 4}px;outline:3px solid #ff2d55;background:rgba(255,45,85,.08)`;
      const t = document.createElement('span'); t.textContent = m.kind; t.style.cssText = 'position:absolute;left:0;top:-16px;font:bold 11px sans-serif;color:#fff;background:#ff2d55;padding:0 3px'; d.appendChild(t); root.appendChild(d); }
    document.body.appendChild(root); window.__hcSelfScroll = true; window.scrollTo(0, Math.max(0, marks[0].y - 120)); window.__hcSelfScroll = false;
  }).catch(() => {});
  await page.waitForTimeout(150);
  await page.screenshot({ path: file, type: 'jpeg', quality: 50 });
}

async function checkPage(ctx, base, card, vp, a, shotsDir, ro, homeCards) {
  const page = await ctx.newPage();
  try {
    const { errs, netState } = watchPage(page, card, base, ro);
    const nav = { ok: false };
    const t0 = Date.now();
    try {
      const resp = await page.goto(base + card.href, { waitUntil: 'load', timeout: 60000 });
      const timing = await page.evaluate(() => { const e = performance.getEntriesByType('navigation')[0]; return e ? { dcl: Math.round(e.domContentLoadedEventEnd), load: Math.round(e.loadEventEnd) } : {}; });
      Object.assign(nav, { ok: !!resp && resp.status() < 400, status: resp?.status(), ...timing, wallMs: Date.now() - t0 });
      if (!nav.ok) nav.error = `HTTP ${resp?.status()}`;
    } catch (e) { if (isCrash(e)) throw e; nav.error = String(e.message).split('\n')[0].slice(0, 160); }
    // 等晚到的橫幅／後端文字，CLS 才抓得到；穩定了就提早結束。沒載入就不必久等
    const settle = nav.ok ? await settlePage(page, netState, { minMs: T.settleMinMs, quietMs: T.settleQuietMs, maxMs: a.settleMs }) : (await page.waitForTimeout(Math.min(500, a.settleMs)), { ms: Math.min(500, a.settleMs), reason: 'not-loaded' });
    nav.settleMs = settle.ms; nav.settleReason = settle.reason;
    let m;
    try { m = await page.evaluate(metricsScript({ ...T, visibleErrorRe: C.VISIBLE_ERROR_RE.source })); }
    catch (e) { if (isCrash(e)) throw e; m = EMPTY_METRICS(vp.width); if (nav.ok) { nav.ok = false; nav.error = `量測失敗 ${String(e.message).slice(0, 120)}`; } }
    const winMs = (nav.load || 0) + settle.ms;
    const tbtMs = nav.ok && m.hc?.longtasks ? tbtFrom(m.hc.longtasks, 0, winMs + 1000) : null;
    // 桌機門檻：擁有者決定前，預設沿用手機標準；--desktop-profile（或 config 啟用）才套桌機提案值
    const desktop = !vp.mobile && (a.desktopProfile ?? C.DESKTOP_PROFILE.enabled);
    const th = desktop ? { ...T, ...C.DESKTOP_PROFILE } : T;
    const checks = judge(m, errs, nav, th, card, { envGapApis: a.target === 'remote' ? null : C.LOCAL_ENV_GAP_APIS, tbtMs, tbtWindowMs: winMs });
    // 另算「若用桌機提案值」的點擊／字級（只在 ≥800px），給報告試算，不影響本次判定
    let whatIf = null;
    if (!vp.mobile && nav.ok && checks.tap?.status !== 'SKIP') { const alt = desktop ? T : { ...T, ...C.DESKTOP_PROFILE }; whatIf = { profile: desktop ? 'mobile' : 'desktop', tap: judgeTap(m, alt).status, font: judgeFont(m, alt).status }; }
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
      await (status === 'FAIL' ? shotWithMarks(page, shot) : page.screenshot({ path: shot, type: 'jpeg', quality: 50 })).catch(() => { shot = null; });
    }
    return { n: card.n, id: card.id, name: card.name, href: card.href, width: vp.width, status, nav, checks, shot: shot && path.basename(shot), whatIf,
      metrics: { fontSizes: m.font.sizes, chars: m.font.chars, tapTotal: m.tap.total, contrastChecked: m.contrast.checked, contrastUnknown: m.contrast.unknown, contrastGradient: m.contrast.gradient || 0, contrastUnknownBy: m.contrast.unknownBy || null, images: m.images?.total || 0, tbtMs, marks: m.marks || 0, weight: m.weight || null } };
  } finally { await page.close().catch(() => {}); }
}

// 早滑：首頁 DOMContentLoaded 後 0.4 秒用「真的觸控事件」往上滑（CDP Input.dispatchTouchEvent，等同手指），
// 從開始滑的那一刻起觀察 6 秒內有沒有被程式拉回。無頭模式的 synthesizeScrollGesture 常常完全不捲動（實測 scrollY 0），
// 所以改用逐點 touchStart／touchMove／touchEnd；觸控沒捲動才改滑鼠滾輪（仍是使用者輸入）；兩者都不動才用程式捲動並標 WARN。
async function earlySwipe(ctx, base, vp) {
  const page = await ctx.newPage();
  try {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(T.earlySwipeAtMs);
    const startY = await page.evaluate(() => scrollY);
    const tSwipe = await page.evaluate(() => Math.round(performance.now()));
    const cdp = await ctx.newCDPSession(page); // 本工具自己啟動的無頭瀏覽器，不是 9333
    const x = Math.round(vp.width / 2);
    const swipe = async () => {
      const steps = 12, y0 = Math.round(vp.height * 0.85), y1 = Math.round(vp.height * 0.15); let y = y0;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= steps; i++) { y = Math.round(y0 + ((y1 - y0) * i) / steps); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const moved = async () => (await page.evaluate(() => scrollY)) - startY;
    const methods = [];
    for (let i = 0; i < 3 && (await moved()) < T.earlySwipePx; i++) { await swipe(); methods.push('touch'); await page.waitForTimeout(150); }
    if ((await moved()) < 300) { await page.mouse.move(x, Math.round(vp.height / 2)); for (let i = 0; i < 5; i++) await page.mouse.wheel(0, Math.round(T.earlySwipePx / 5)); methods.push('wheel'); await page.waitForTimeout(150); }
    let programmatic = false;
    if ((await moved()) < 300) { programmatic = true; methods.push('scrollBy'); await page.evaluate((d) => { window.__hcSelfScroll = true; window.scrollBy(0, d); window.__hcSelfScroll = false; }, T.earlySwipePx); }
    const method = methods.join('+');
    await page.waitForTimeout(T.earlySwipeWatchMs);
    const hc = await page.evaluate(() => window.__hc);
    const r = judgeEarlySwipe(hc.ys.filter(([t]) => t >= tSwipe), startY, T, { programmatic });
    const summary = r.reached - startY < 300 ? `手勢與捲動都沒有讓頁面移動（${method}），無法判定`
      : `${programmatic ? '只能用程式捲動（觸控、滾輪都沒捲動），未模擬到使用者滑動；' : ''}滑到 ${r.reached}px，${T.earlySwipeWatchMs / 1000}s 內被拉回 ${r.pullbacks} 次（最多 ${r.worst}px），最後停在 ${r.finalY}px`;
    return mkCheck(r.status, summary, { ...r, method, samples: hc.calls.filter((c) => c.t >= tSwipe).slice(0, 3).map((c) => `${c.t}ms ${c.kind} ${c.stack}`) });
  } catch (e) { if (isCrash(e)) throw e; return mkCheck('SKIP', `早滑檢查未完成（工具端錯誤，未判定）：${String(e.message).slice(0, 120)}`); }
  finally { await page.close().catch(() => {}); }
}

// 寶珠大小不縮：盤面要開局才出現。唯讀模式不開局（開局會建帳本）→ 不載頁、直接 SKIP（不白跑）；
// 這一頁本身的 CLS／錯誤等另以一般頁面列（寶珠盤頁）量測。
export async function beadSize(ctx, base, sub, a) {
  if (a.readOnly) return mkCheck('SKIP', '唯讀模式不開局，盤面不會出現；寶珠大小未檢（需 --allow-writes 或 match3 測試帳本 e2e）');
  const page = await ctx.newPage();
  const sizes = () => page.$$eval(sub.cellSelector, (els) => els.map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  try {
    const resp = await page.goto(base + sub.href, { waitUntil: 'load', timeout: 60000 });
    if (!resp || resp.status() >= 400) return mkCheck('SKIP', `寶珠頁 HTTP ${resp?.status()}，未判定`);
    await page.waitForTimeout(1500);
    const s1 = await sizes();
    if (!s1.length) return mkCheck('SKIP', '盤面沒有出現（需要開局）');
    await page.waitForTimeout(4000);
    const s2 = await sizes();
    const min1 = Math.min(...s1), min2 = Math.min(...s2);
    return mkCheck(min2 >= sub.minPx && min2 >= min1 - 0.5 ? 'PASS' : 'FAIL', `寶珠最小 ${round(min1, 1)}px → 4 秒後 ${round(min2, 1)}px（下限 ${sub.minPx}px）`);
  } catch (e) { if (isCrash(e)) throw e; return mkCheck('SKIP', `寶珠頁未完成（工具端錯誤，未判定）：${String(e.message).slice(0, 120)}`); }
  finally { await page.close().catch(() => {}); }
}

// ---- 額外一輪（只在一個手機寬度）：五語、減少動態、返回／重進＋捲到底 ----
async function loadMeasure(page, base, href, netState, maxMs) {
  const resp = await page.goto(base + href, { waitUntil: 'load', timeout: 60000 }).catch((e) => { if (isCrash(e)) throw e; return null; });
  const ok = !!resp && resp.status() < 400;
  if (ok) await settlePage(page, netState, { minMs: Math.min(1500, maxMs), quietMs: 1000, maxMs });
  const m = ok ? await page.evaluate(metricsScript({ ...T, visibleErrorRe: C.VISIBLE_ERROR_RE.source })).catch((e) => { if (isCrash(e)) throw e; return null; }) : null;
  return { ok: ok && !!m, status: resp?.status(), m };
}
async function extrasForCard(browser, ctxOpts, base, card, vp, a, ro, normalRow) {
  const out = {};
  const maxMs = Math.min(a.settleMs, T.extrasSettleMs);
  const errN = (errs) => errs.page.length + errs.http.filter((h) => h.type === 'document').length;
  // 1. 五語
  if (a.extras.includes('i18n')) {
    const per = [];
    for (const lang of C.I18N.langs) {
      const ctx = await browser.newContext(ctxOpts);
      try {
        await ctx.addInitScript(INIT_SCRIPT);
        await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [C.I18N.storageKey, lang]);
        const page = await ctx.newPage(); const { errs, netState } = watchPage(page, card, base, ro);
        const r = await loadMeasure(page, base, card.href, netState, maxMs);
        per.push(judgeOneLang(lang, r.m || {}, { ok: r.ok }, errN(errs)));
      } finally { await ctx.close().catch(() => {}); }
    }
    out.i18n = judgeI18n(per);
  }
  // 2. 減少動態（prefers-reduced-motion: reduce）：內容不能消失（曾發生 reduced-motion 整頁空白）
  if (a.extras.includes('rm')) {
    const ctx = await browser.newContext({ ...ctxOpts, reducedMotion: 'reduce' });
    try {
      await ctx.addInitScript(INIT_SCRIPT);
      const page = await ctx.newPage(); const { errs, netState } = watchPage(page, card, base, ro);
      const r = await loadMeasure(page, base, card.href, netState, maxMs);
      const base0 = normalRow?.metrics?.chars || 0, n = r.m?.font?.chars || 0;
      const ratio = base0 ? n / base0 : null;
      out.reducedMotion = !r.ok ? mkCheck('SKIP', `減少動態模式沒有載入（HTTP ${r.status ?? '—'}）`)
        : n === 0 ? mkCheck('FAIL', '減少動態模式下整頁沒有可見文字（空白）')
        : r.m.visibleError ? mkCheck('FAIL', `減少動態模式顯示「${r.m.visibleError}」`)
        : errN(errs) ? mkCheck('FAIL', `減少動態模式有頁面錯誤 ${errN(errs)}`, { samples: errs.page.slice(0, 3) })
        : ratio !== null && ratio < 0.3 ? mkCheck('FAIL', `減少動態模式可見文字只剩一般模式的 ${Math.round(ratio * 100)}%（${n}/${base0}）`)
        : ratio !== null && ratio < 0.7 ? mkCheck('WARN', `減少動態模式可見文字為一般模式的 ${Math.round(ratio * 100)}%（${n}/${base0}）`)
        : mkCheck('PASS', `減少動態模式可見文字 ${n} 字${ratio !== null ? `（一般模式 ${base0}）` : ''}`);
    } finally { await ctx.close().catch(() => {}); }
  }
  // 3. 返回／重進＋捲到底：首頁 → 卡片（慢速捲到底量位移、捲後破圖）→ 上一頁（首頁要正常）→ 下一頁（卡片要正常）
  if (a.extras.includes('nav')) {
    const ctx = await browser.newContext(ctxOpts);
    try {
      await ctx.addInitScript(INIT_SCRIPT);
      const page = await ctx.newPage(); const { errs, netState } = watchPage(page, card, base, ro);
      const first = card.id === 'home' ? null : await loadMeasure(page, base, '/', netState, maxMs);
      const r = await loadMeasure(page, base, card.href, netState, maxMs);
      if (r.ok) {
        const sc = await page.evaluate(async () => {
          const H = window.__hc; const t0 = performance.now(); const step = Math.round(innerHeight * 0.8);
          for (let i = 0; i < 40 && scrollY + innerHeight < document.documentElement.scrollHeight - 2; i++) { window.__hcSelfScroll = true; window.scrollBy(0, step); window.__hcSelfScroll = false; await new Promise((res) => setTimeout(res, 150)); }
          await new Promise((res) => setTimeout(res, 800));
          let broken = 0; const bad = [];
          for (const img of document.images) { if (img.complete && img.naturalWidth === 0 && (img.currentSrc || img.getAttribute('src'))) { broken++; if (bad.length < 3) bad.push((img.currentSrc || img.getAttribute('src')).slice(0, 100)); } }
          return { shifts: H.shifts.filter((s) => s.t >= t0), height: document.documentElement.scrollHeight, broken, bad };
        });
        const { cls } = clsFromEntries(sc.shifts);
        out.scroll = mkCheck(cls >= T.clsMax || sc.broken ? 'FAIL' : 'PASS', `慢速捲到底（頁高 ${sc.height}px）：捲動中位移 ${cls}、捲後破圖 ${sc.broken}`, { value: cls, samples: [...sc.shifts.filter((s) => s.value >= 0.005).slice(0, 3).map((s) => `${s.t}ms ${round(s.value, 4)} ${(s.nodes || []).join(',')}`), ...sc.bad] });
      } else out.scroll = mkCheck('SKIP', '頁面沒有載入，未捲動');
      if (first && first.ok && r.ok) {
        const e0 = errN(errs);
        await page.goBack({ waitUntil: 'load', timeout: 30000 }).catch(() => null); await page.waitForTimeout(1200);
        const back = await page.evaluate(() => ({ url: location.pathname, chars: (document.body?.innerText || '').replace(/\s+/g, '').length }));
        await page.goForward({ waitUntil: 'load', timeout: 30000 }).catch(() => null); await page.waitForTimeout(1200);
        const fwd = await page.evaluate(() => ({ url: location.pathname, chars: (document.body?.innerText || '').replace(/\s+/g, '').length, err: (document.body?.innerText || '').match(/Application error|發生錯誤|出錯了|載入失敗/)?.[0] || null }));
        const e1 = errN(errs) - e0;
        const okBack = back.url === '/' && back.chars > 0, okFwd = fwd.url === new URL(card.href, base).pathname && fwd.chars > 0 && !fwd.err;
        out.backForward = mkCheck(okBack && okFwd && !e1 ? 'PASS' : 'FAIL', `上一頁 → ${back.url}（${back.chars} 字）、下一頁 → ${fwd.url}（${fwd.chars} 字${fwd.err ? '，顯示「' + fwd.err + '」' : ''}）、期間頁面錯誤 ${e1}`, { samples: errs.page.slice(-3) });
      } else if (card.id !== 'home') out.backForward = mkCheck('SKIP', '首頁或卡片沒有載入，未測返回／重進');
    } finally { await ctx.close().catch(() => {}); }
  }
  return out;
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.max(1, n) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

// 子行程環境：關遙測、帶上 watchdog（工具被強制結束時子行程自己收掉），並固定 distDir（next.config 讀 NEXT_DIST_DIR）。
const WATCHDOG = path.join(HERE, 'watchdog.cjs').replace(/\\/g, '/');
export const DIST_DIR = process.env.HC_DIST_DIR || process.env.NEXT_DIST_DIR || '.next';
export function childEnv(extra = {}) {
  const prev = process.env.NODE_OPTIONS || '';
  return { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_DIST_DIR: DIST_DIR, HC_PARENT_PID: String(process.pid), NODE_OPTIONS: `${prev} --require "${WATCHDOG}"`.trim(), ...extra };
}

// gates：tsc、test（npm test）、audit（npm audit --omit=dev）、其他名稱＝npm run <名稱>。build 由 --serve 的建置結果提供。
export const GATE_ALL = ['tsc', 'test', 'audit'];
function runCmd(cmd, args, { timeoutMs = 15 * 60e3, cwd = REPO } = {}) {
  return new Promise((done) => {
    const win = process.platform === 'win32' && /\.cmd$/.test(cmd);
    const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: win, windowsHide: true, env: childEnv() });
    let out = '', err = ''; p.stdout.on('data', (d) => { out += d; if (out.length > 4e6) out = out.slice(-2e6); }); p.stderr.on('data', (d) => { err += d; if (err.length > 2e5) err = err.slice(-1e5); });
    const timer = setTimeout(() => { try { p.kill(); } catch {} done({ code: null, timedOut: true, out, err }); }, timeoutMs);
    p.on('error', (e) => { clearTimeout(timer); done({ code: null, error: e.message, out, err }); });
    p.on('exit', (code) => { clearTimeout(timer); done({ code, out, err }); });
  });
}
// npm test 的結果：exit 0 但有「已知失敗」（scripts/run-tests.mjs 最後一行 known=N）→ WARN，不算 PASS
export function gateVerdict(g, r) {
  const label = `npm ${g === 'test' ? 'test' : 'run ' + g}`;
  if (r.timedOut) return { status: 'FAIL', summary: `${label} 逾時` };
  if (r.code !== 0) return { status: 'FAIL', summary: `${label} exit ${r.code}` };
  const m = g === 'test' ? /npm-test-summary: pass=(\d+) fail=(\d+) known=(\d+) env-only=(\d+) total=(\d+)/.exec(r.out || '') : null;
  if (!m) return { status: 'PASS', summary: `${label} 通過` };
  const [pass, fail, known, envOnly, total] = m.slice(1).map(Number);
  const counts = { pass, fail, known, envOnly, total };
  if (known > 0) return { status: 'WARN', summary: `${label} 通過 ${pass}／${total}，另有 ${known} 組主線既有的已知失敗（未修，見 scripts/run-tests.mjs KNOWN_FAILING）；${envOnly} 組要外部環境不在此跑`, counts };
  return { status: 'PASS', summary: `${label} 通過 ${pass}／${total}；${envOnly} 組要外部環境不在此跑`, counts };
}
async function runGates(gates, log, { serve }) {
  const res = [];
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  let scripts = {}; try { scripts = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).scripts || {}; } catch {}
  for (const g of gates) {
    const t = Date.now();
    const push = (status, summary, extra = {}) => res.push({ name: g, status, summary, ms: Date.now() - t, ...extra });
    if (g === 'build') { if (!serve) push('SKIP', '只有 --serve 時才有建置結果（指向既有伺服器或正式站時不建置）'); continue; }
    log(`gate ${g}…`);
    if (g === 'tsc') {
      const tsc = path.join(REPO, 'node_modules/typescript/bin/tsc');
      if (!fs.existsSync(tsc)) { push('SKIP', '找不到 node_modules/typescript'); continue; }
      const r = await runCmd(process.execPath, [tsc, '--noEmit', '-p', 'tsconfig.json']);
      const errs = (r.out.match(/error TS\d+/g) || []).length;
      push(r.code === 0 ? 'PASS' : r.timedOut ? 'FAIL' : 'FAIL', r.code === 0 ? 'tsc --noEmit 無錯誤' : r.timedOut ? 'tsc 逾時（15 分）' : `tsc 錯誤 ${errs} 個（exit ${r.code}）`, { tail: r.code === 0 ? '' : (r.out + r.err).slice(-600) });
      continue;
    }
    if (g === 'audit') {
      const r = await runCmd(npm, ['audit', '--omit=dev', '--json'], { timeoutMs: 3 * 60e3 });
      const v = r.timedOut ? { status: 'SKIP', summary: 'npm audit 逾時（3 分），未判定' } : auditVerdict(r.out);
      push(v.status, v.summary, { samples: v.samples || [], counts: v.counts || null, tail: v.status === 'SKIP' ? r.err.slice(-300) : '' });
      continue;
    }
    if (!scripts[g]) { push('SKIP', g === 'test' ? 'package.json 沒有 test 腳本（npm test 不存在），未判定' : `package.json 沒有「${g}」腳本，未判定`); continue; }
    const r = await runCmd(npm, g === 'test' ? ['test', '-s'] : ['run', '-s', g], { timeoutMs: g === 'test' ? 25 * 60e3 : 15 * 60e3 });
    const v = gateVerdict(g, r);
    push(v.status, v.summary, { tail: v.status === 'PASS' ? '' : (r.out + r.err).slice(-600), ...(v.counts ? { counts: v.counts } : {}) });
  }
  return res;
}

// 本工具沒有涵蓋、需要另外驗的項目（報告固定列出，避免把「工具沒量」當成「沒問題」）
export const NOT_COVERED = [
  '真機 90 FPS 與觸控手感（需實機）',
  'INP（要真人互動才有；本工具只量載入期間的 TBT 代理值）',
  '螢幕報讀器實際朗讀與鍵盤操作順序（a11y 只做靜態規則：名稱、標籤、lang、alt、重複 id）',
  '文案是否誠實、下一步是否清楚（需人工）',
  '逐鍵輸入、送出、看結果的完整流程（11/20 逐卡實操；本工具只開頁不操作）',
  '寶珠開局後的盤面大小（唯讀不開局；需測試帳本 e2e）',
  'screen-health-monitor 的 68 項 API／npm 檢查（可用 --gates screen:health 併入）',
  '五語只檢查「畫面不壞、程式值不外露、lang 正確」；翻譯品質與漏翻句子另見 scripts/audit-english-rendered.cjs',
];

// 桌機門檻試算：把 1280 列的 tap／font 換成另一套門檻的結果，重算品質分
export function desktopWhatIf(rows, subRows, gateRows, groups, gatesRun, a) {
  const desk = rows.filter((r) => r.whatIf);
  if (!desk.length) return null;
  const alt = rows.map((r) => (r.whatIf ? { ...r, checks: { ...r.checks, tap: { ...r.checks.tap, status: r.whatIf.tap }, font: { ...r.checks.font, status: r.whatIf.font } } } : r));
  const now = michelin([...rows, ...subRows, ...gateRows], C.MICHELIN_TARGETS, groups, { gatesRun, mergeMobile: true });
  const ifm = michelin([...alt, ...subRows, ...gateRows], C.MICHELIN_TARGETS, groups, { gatesRun, mergeMobile: true });
  const cnt = (k, which) => { const o = { PASS: 0, WARN: 0, FAIL: 0 }; for (const r of desk) { const st = which === 'now' ? r.checks[k]?.status : r.whatIf[k]; if (st in o) o[st]++; } return o; };
  const applied = desk[0].whatIf.profile === 'desktop' ? 'mobile' : 'desktop';
  return { appliedNow: applied === 'mobile' ? '手機標準（現狀，擁有者未決定）' : '桌機提案值', alternative: desk[0].whatIf.profile === 'desktop' ? '桌機提案值' : '手機標準', profile: C.DESKTOP_PROFILE, pages: desk.length,
    tap: { now: cnt('tap', 'now'), alt: cnt('tap', 'alt') }, font: { now: cnt('font', 'now'), alt: cnt('font', 'alt') },
    quality: { now: now.quality.score, alt: ifm.quality.score }, overall: { now: now.overall.score, alt: ifm.overall.score },
    changed: desk.filter((r) => r.whatIf.tap !== r.checks.tap?.status || r.whatIf.font !== r.checks.font?.status).map((r) => `${r.id}@${r.width} tap ${r.checks.tap?.status}→${r.whatIf.tap}、font ${r.checks.font?.status}→${r.whatIf.font}`) };
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
  // 中斷（Ctrl+C／SIGTERM）：先同步放掉鎖、停心跳、關自己起的伺服器，再嘗試關瀏覽器（最多 5 秒）。
  // Playwright 預設也會攔 SIGINT 並立刻 exit(130)，會搶在非同步清理之前結束行程、留下鎖檔——所以 launch 時關掉它的處理。
  const syncCleanup = [];
  const HALT = () => new Promise(() => {});
  let stopping = false, ownRunDir = null;
  const onSig = () => {
    if (stopping) return; stopping = true;
    try { process.stderr.write(`[health] 收到中斷訊號，清理後結束（不寫報告）\n`); } catch {}
    for (const f of syncCleanup) { try { f(); } catch {} }
    try { if (buildChild && buildChild.exitCode === null) buildChild.kill(); } catch {}
    try { stopBeat(); } catch {} releaseLock(lock.file);
    // 這次自己建的資料夾還沒有報告 → 直接刪掉，不留空殼
    if (ownRunDir && !fs.existsSync(path.join(ownRunDir, 'report.json'))) { try { fs.rmSync(ownRunDir, { recursive: true, force: true }); } catch {} }
    runCleanup().finally(() => process.exit(130));
  };
  process.on('SIGINT', onSig); process.on('SIGTERM', onSig); process.on('SIGHUP', onSig);
  const t0 = Date.now();
  const warnings = [];
  try {
    let base = a.base, build = 'none（指向既有伺服器）', target, server = null;
    // 先決定目標與 label、建資料夾：建置或啟動失敗時把原因寫進 error.json（不再只有終端機看得到）
    target = a.serve ? 'local-start' : /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/.test(a.base) ? 'local-existing' : 'remote';
    a.target = target;
    const label = a.label || (target === 'remote' ? new URL(a.base).hostname.split('.')[0] : target);
    const runDir = makeRunDir(outRoot, label);
    const shotsDir = path.join(runDir, 'shots');
    fs.mkdirSync(shotsDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, '.hc-run'), ''); ownRunDir = runDir;
    if (a.serve) {
      try { const s = await ensureServer(a, log); cleanup.unshift(s.stop); syncCleanup.push(s.stop); base = s.base; build = s.build; server = s.server; }
      catch (e) {
        fs.writeFileSync(path.join(runDir, 'error.json'), JSON.stringify({ tool: TOOL_VERSION, phase: 'serve', target, label, gitSha: gitSha(), at: new Date().toISOString(), error: e.message, logTail: e.logTail || null, gates: [{ name: 'build', status: /next build exit/.test(e.message) ? 'FAIL' : 'SKIP', summary: e.message.slice(0, 200) }] }, null, 2));
        throw e;
      }
    }
    base = base.replace(/\/$/, '');
    const launch = () => pw.chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
    // 唯讀：在瀏覽器層用 CDP Fetch 攔下所有非 GET（含 iframe、worker、sendBeacon、表單送出），不用 Playwright route
    // （route 會停用 HTTP 快取，每頁都重抓所有 JS）。攔截一啟用失敗就不量，絕不在沒防護的情況下打正式站。
    const ro = a.readOnly ? { width: null, blocked: [] } : null;
    const arm = async (browser) => {
      if (!ro) return;
      const bs = await browser.newBrowserCDPSession();
      bs.on('Fetch.requestPaused', (e) => {
        if (SAFE.has(e.request.method)) return bs.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {});
        ro.blocked.push({ width: ro.width, card: null, method: e.request.method, url: e.request.url.split('?')[0].slice(0, 140) });
        return bs.send('Fetch.failRequest', { requestId: e.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
      });
      await bs.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    };
    const H = { browser: await launch(), ctx: null, reviving: null, crashes: 0 };
    cleanup.unshift(() => H.browser.close());
    await arm(H.browser);
    const rows = [], blockedWrites = [], subRows = [];
    const deployIds = new Set();
    const loadAtStart = os.loadavg().map((x) => round(x, 1));
    // 寶珠盤頁：唯讀時盤面不會出現，但頁面本身（CLS、錯誤、字級…）照一般頁面量
    const beadPages = a.subflows && !a.only && !a.cardsFile ? C.SUBFLOWS.map((sub, i) => ({ n: 16 + i, id: sub.id + '-page', href: sub.href, name: '寶珠盤頁（' + sub.href + '）', sub: true })) : [];
    const extrasWidth = a.extras.length ? (a.widths.find((w) => w === 390) ?? a.widths.find((w) => w < 800)) : undefined;
    for (const width of a.widths) {
      const vp = C.VIEWPORTS.find((v) => v.width === width) || { width, height: width < 800 ? 844 : 900, mobile: width < 800 };
      if (ro) ro.width = width;
      const ctxOpts = { viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1, locale: 'zh-TW', serviceWorkers: 'block' };
      const newCtx = async () => {
        const ctx = await H.browser.newContext(ctxOpts);
        await ctx.addInitScript(INIT_SCRIPT);
        ctx.on('request', (r) => { const d = deployIdOf(r.url()); if (d) deployIds.add(d); });
        return ctx;
      };
      // 瀏覽器崩潰（多半是機器記憶體不足）→ 重開一次再測；連兩次都崩就標 SKIP 並寫明，不算 PASS 也不冒充產品故障。
      const revive = () => (H.reviving ||= (async () => {
        H.crashes++; log(`瀏覽器崩潰，重新啟動（第 ${H.crashes} 次）`);
        try { await H.browser.close(); } catch {}
        H.browser = await launch(); await arm(H.browser); H.ctx = await newCtx();
      })().finally(() => { H.reviving = null; }));
      const guarded = async (fn, fallback) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          if (stopping) return fallback(new Error('使用者中斷'));
          try { if (H.reviving) await H.reviving; return await fn(H.ctx); }
          catch (e) { if (stopping) return fallback(new Error('使用者中斷')); if (!H.browser.isConnected() || isCrash(e)) { await revive().catch(() => {}); continue; } return fallback(e); }
        }
        return fallback(new Error('瀏覽器連續崩潰'));
      };
      H.ctx = await newCtx();
      const pages = [...cards, ...beadPages];
      log(`寬度 ${width}：${pages.length} 頁`);
      const rs = await pool(pages, a.concurrency, (c) => guarded((ctx) => checkPage(ctx, base, c, vp, a, shotsDir, ro, homeCards),
        (e) => ({ n: c.n, id: c.id, name: c.name, href: c.href, width, status: 'SKIP', nav: { ok: false, error: String(e.message).slice(0, 120) },
          checks: { load: mkCheck('SKIP', `測試瀏覽器崩潰兩次，未判定（${String(e.message).slice(0, 80)}）；可能是機器記憶體不足，也可能是頁面過重，需另測`) } })));
      if (vp.mobile && a.earlySwipe && rs[0]?.id === 'home' && rs[0].status !== 'SKIP' && rs[0].nav?.ok) {
        const runs = [];
        for (let i = 0; i < T.earlySwipeRuns; i++) runs.push(await guarded((ctx) => earlySwipe(ctx, base, vp), (e) => mkCheck('SKIP', `早滑未判定：${String(e.message).slice(0, 80)}`)));
        const worst = runs.find((r) => r.status === 'FAIL') || runs.find((r) => r.status === 'WARN') || runs.find((r) => r.status === 'PASS') || runs[0];
        rs[0].checks.earlySwipe = { ...worst, summary: `${runs.length} 次：` + runs.map((r) => `${r.status}(${r.method || '—'})`).join('/') + '；' + worst.summary };
      }
      if (width === extrasWidth) {
        log(`寬度 ${width} 額外檢查（${a.extras.join('、')}）：${pages.length} 頁`);
        await pool(pages, a.concurrency, async (c) => {
          const row = rs.find((r) => r.id === c.id);
          const ex = await guarded(() => extrasForCard(H.browser, ctxOpts, base, c, vp, a, ro, row), (e) => ({ _skip: String(e.message).slice(0, 80) }));
          if (ex._skip) { for (const k of [a.extras.includes('i18n') && 'i18n', a.extras.includes('rm') && 'reducedMotion', a.extras.includes('nav') && 'scroll'].filter(Boolean)) row.checks[k] = mkCheck('SKIP', `額外檢查未完成：${ex._skip}`); }
          else Object.assign(row.checks, ex);
        });
      }
      if (a.subflows && !a.only && !a.cardsFile) for (const sub of C.SUBFLOWS) subRows.push({ id: sub.id, width, page: false, checks: { beadSize: await guarded((ctx) => beadSize(ctx, base, sub, a), (e) => mkCheck('SKIP', String(e.message).slice(0, 80))) } });
      if (stopping) await HALT(); // 中斷：不再往下量、不產生半套報告，等 onSig 收尾 exit 130
      for (const r of rs) r.status = overallStatus(r.checks);
      rows.push(...rs);
      await H.ctx.close().catch(() => {});
      if (server?.exited()) { warnings.push(`本機伺服器在量測途中結束（code ${server.exited().code}），之後的結果不可信`); break; }
    }
    if (ro) blockedWrites.push(...ro.blocked.map((b) => ({ ...b, card: b.card || '?' })));
    if (stopping) await HALT();
    await H.browser.close().catch(() => {}); // 先關瀏覽器再跑 gates，避免 tsc＋Chromium 同時吃記憶體
    if (a.gates.length) log('瀏覽器已關閉，開始跑 gates');
    const gates = [
      ...(target === 'local-start' ? [{ name: 'build', status: 'PASS', summary: build.startsWith('built') ? `next build 成功（${build}），並以 next start 啟動、身分核對通過` : `沿用同 HEAD（${gitSha()}）先前成功的建置，未重建`, ms: 0 }] : []),
      ...(await runGates(a.gates.filter((g) => !(g === 'build' && target === 'local-start')), log, { serve: target === 'local-start' })),
    ];
    const gateRows = gates.map((x) => ({ id: `gate:${x.name}`, page: false, checks: { gates: { status: x.status, summary: x.summary } } }));
    const groups = gates.length ? { ...CHECK_GROUPS, stability: [...CHECK_GROUPS.stability, 'gates'] } : CHECK_GROUPS;
    const gatesRun = gates;
    if (deployIds.size > 1) warnings.push(`量測期間出現 ${deployIds.size} 個部署版本（${[...deployIds].join('、')}）——正式站可能在途中重新部署，結果混了兩版，建議重跑`);
    const contrastAll = rows.reduce((s, r) => ({ checked: s.checked + (r.metrics?.contrastChecked || 0), unknown: s.unknown + (r.metrics?.contrastUnknown || 0), gradient: s.gradient + (r.metrics?.contrastGradient || 0) }), { checked: 0, unknown: 0, gradient: 0 });
    const rep = {
      tool: TOOL_VERSION, base, target, label, readOnly: a.readOnly, build,
      gitSha: target === 'local-start' ? gitSha() : (a.serverSha || null), toolSha: gitSha(), deployIds: [...deployIds],
      startedAt: new Date(t0).toISOString(), startedAtLocal: new Date(t0).toLocaleString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' }) + ' (UTC+8)',
      elapsedSec: round((Date.now() - t0) / 1000, 0), host: { platform: process.platform, cpus: os.cpus().length, loadAvgAtStart: loadAtStart, loadAvgAtEnd: os.loadavg().map((x) => round(x, 1)), freeMemGb: round(os.freemem() / 1024 ** 3, 1) }, widths: a.widths, only: a.only || null, thresholds: C.THRESHOLDS,
      warnings, rows, subflows: subRows, gates, blockedWrites, browserCrashes: H.crashes,
      server: server ? { pid: server.pid, exited: server.exited(), logTail: server.logTail().slice(-20) } : null,
      // 計分時 360／390 同一頁合併（每項取最差），避免手機權重加倍；另附未合併的分數供對照
      michelin: michelin([...rows, ...subRows, ...gateRows], C.MICHELIN_TARGETS, groups, { gatesRun, mergeMobile: true }),
      michelinUnmerged: (() => { const u = michelin([...rows, ...subRows, ...gateRows], C.MICHELIN_TARGETS, groups, { gatesRun }); return { quality: u.quality.score, stability: u.stability.score, service: u.service.score, overall: u.overall.score }; })(),
      desktopWhatIf: desktopWhatIf(rows, subRows, gateRows, groups, gatesRun, a),
      concurrency: a.concurrency, extras: a.extras, extrasWidth: extrasWidth ?? null,
      notCovered: NOT_COVERED,
      coverage: coverage([...rows, ...subRows]),
      contrastCoverage: { ...contrastAll, pct: contrastAll.checked + contrastAll.unknown ? round(contrastAll.checked / (contrastAll.checked + contrastAll.unknown), 3) : null },
    };
    rep.summary = { pages: rows.length, pass: rows.filter((r) => r.status === 'PASS').length, warn: rows.filter((r) => r.status === 'WARN').length, fail: rows.filter((r) => r.status === 'FAIL').length, skip: rows.filter((r) => r.status === 'SKIP').length };
    if ((rep.coverage.pct ?? 0) < a.minCoverage) warnings.push(`涵蓋率 ${round((rep.coverage.pct || 0) * 100, 1)}% 低於門檻 ${a.minCoverage * 100}%，分數只代表已判定的部分`);
    if (process.platform !== 'win32' && rep.host.loadAvgAtEnd[0] > rep.host.cpus * 0.8) warnings.push(`量測結束時機器負載 ${rep.host.loadAvgAtEnd[0]}／${rep.host.cpus} 核偏高，LCP／TBT／CLS 時序可能偏差；可用 --concurrency 1 重跑`);
    rep.cardsFile = a.cardsFile ? path.basename(a.cardsFile) : null;
    rep.scope = runScope({ ...rep, scope: { subflows: !!(a.subflows && !a.only && !a.cardsFile) } });
    let prevFile = a.compare;
    if (a.compare === 'auto') {
      // 只拿同範圍（目標＋站名＋頁面範圍＋寬度＋唯讀）的上一份
      prevFile = findBaseline(outRoot, rep, { current: runDir });
      if (!prevFile) warnings.push('找不到同範圍的上次報告，未比較');
    }
    if (prevFile && fs.existsSync(prevFile)) rep.compare = { against: prevFile, ...compareRuns(JSON.parse(fs.readFileSync(prevFile, 'utf8')), rep) };
    const removed = pruneOwnRuns(outRoot, a.keep, { current: runDir, currentRep: rep });
    rep.disk = { outRoot, freeGbAfter: diskGuard(outRoot, 0).freeGb, prunedOwnRuns: removed };
    fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(rep, null, 2));
    fs.writeFileSync(path.join(runDir, 'report.md'), renderMarkdown(rep));
    const du = (d) => fs.readdirSync(d, { recursive: true }).reduce((s, f) => { try { return s + fs.statSync(path.join(d, f)).size; } catch { return s; } }, 0);
    const m = rep.michelin;
    const sc = (x) => `${x.score ?? '—'}${x.complete ? '' : '（不完整）'}`;
    log(`完成 ${rep.elapsedSec}s：${rep.summary.pass} PASS／${rep.summary.warn} WARN／${rep.summary.fail} FAIL／${rep.summary.skip} SKIP；涵蓋率 ${round((rep.coverage.pct || 0) * 100, 1)}%；${m.quality.name} ${sc(m.quality)}、${m.stability.name} ${sc(m.stability)}、${m.service.name} ${sc(m.service)}、整體 ${m.overall.score ?? '—'}；輸出 ${runDir}（${round(du(runDir) / 1048576, 2)}MB）`);
    for (const w of warnings) log(`注意：${w}`);
    const belowTarget = ['quality', 'stability', 'service'].filter((g) => m[g].score !== null && m[g].score < m[g].target);
    if (a.strict && (belowTarget.length || (rep.coverage.pct ?? 0) < a.minCoverage)) log(`--strict：${belowTarget.length ? '未達業主目標：' + belowTarget.map((g) => m[g].name).join('、') : ''}${(rep.coverage.pct ?? 0) < a.minCoverage ? ` 涵蓋率 ${round((rep.coverage.pct || 0) * 100, 1)}% < ${a.minCoverage * 100}%` : ''} → exit 1`);
    const strictFail = a.strict && (belowTarget.length > 0 || (rep.coverage.pct ?? 0) < a.minCoverage);
    return rep.summary.fail || strictFail || warnings.some((w) => /不可信|混了兩版/.test(w)) ? 1 : 0;
  } finally {
    await runCleanup();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c ?? 0), (e) => { console.error(`[health] ${e instanceof UsageError ? '參數錯誤：' : ''}${e.message}`); releaseLock(); process.exit(2); });
}
