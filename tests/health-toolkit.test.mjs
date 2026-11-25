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
import { mergeMobileRows, colorTokens, parseColor, blendOver, contrastRatio, isLargeText, gradientStops, contrastRange, clsFromEntries, michelin, coverage, overallStatus, acquireLock, releaseLock, lockVerdict, procStartToken, lockPath, pruneOwnRuns, findBaseline, scopeKey, isFullScope, compareRuns, renderMarkdown, diskGuard, pickPort, startServer, findNextConflicts, listProcesses, GROUP_META, auditVerdict, gateKind, RUN_DIR_RE, localStamp, makeRunDir } from '../scripts/health/lib.mjs';
import { judge, judgeEarlySwipe, filterBlockedConsole, DOM_KEYS, judgeFont, judgeTap, judgeTbt, tbtFrom, judgeOneLang, judgeI18n, langMatches } from '../scripts/health/judge.mjs';
import { CARDS, THRESHOLDS, MICHELIN_TARGETS, VIEWPORTS, LOCAL_ENV_GAP_APIS } from '../scripts/health/config.mjs';
import { metricsScript, INIT_SCRIPT } from '../scripts/health/probe.mjs';
import { parseArgs, selectCards, UsageError, childEnv, GATE_ALL, distBusy, beadSize, EXTRAS_ALL, snapshotFiles, isCrash, deployIdOf, BUILD_IRRELEVANT, gateVerdict } from '../scripts/health/run.mjs';
import { planTests, ENV_ONLY, KNOWN_FAILING } from '../scripts/run-tests.mjs';
import { startFixture, FIXTURE_CARDS, EXTRA_CARDS } from '../scripts/health/fixture-server.mjs';

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
  assert.equal(cv.total, 39, "每頁 13 項（含 a11y、tbt）"); assert.equal(cv.judged, 2 + 0 + 11); assert.equal(cv.perCheck.cls.judged, 1);
});
// 中優先／可選項的純函式
await t('#M3 只有程式捲動時早滑最多 WARN', () => {
  const ys = [[0, 0], [100, 400], [200, 900]];
  assert.equal(judgeEarlySwipe(ys, 0, THRESHOLDS).status, 'PASS');
  assert.equal(judgeEarlySwipe(ys, 0, THRESHOLDS, { programmatic: true }).status, 'WARN');
  assert.equal(judgeEarlySwipe([[0, 0], [100, 900], [200, 100]], 0, THRESHOLDS, { programmatic: true }).status, 'FAIL', '被拉回仍是 FAIL');
});
await t('#M6 寶珠唯讀時不開頁面（不白跑）', async () => {
  const ctx = { newPage: () => { throw new Error('唯讀時不應開頁'); } };
  const r = await beadSize(ctx, 'http://x', { cellSelector: '.c' }, { readOnly: true });
  assert.equal(r.status, 'SKIP'); assert.match(r.summary, /唯讀/);
});
await t('#M16 桌機門檻可設定：同一份量測，手機標準 vs 桌機提案值', () => {
  const mm = { tap: { total: 10, small: 4, under24: 0, samples: [] }, font: { chars: 1000, smallChars: 400, share: 0.4, minPx: 13, tinyRuns: [], sizes: { 13: 400, 16: 600 }, tinyBy: {} } };
  assert.equal(judgeTap(mm, THRESHOLDS).status, 'WARN'); assert.equal(judgeFont(mm, THRESHOLDS).status, 'FAIL');
  const desk = { ...THRESHOLDS, tapMinPx: 24, fontMinBodyPx: 12, fontHardMinPx: 10 };
  assert.equal(judgeTap({ tap: { ...mm.tap, small: 0 } }, desk).status, 'PASS'); assert.equal(judgeFont(mm, desk).status, 'PASS');
});
await t('#O9 360／390 合併成「手機」再算分（取較差者），1280 不合併', () => {
  const rows = [{ id: 'a', width: 360, checks: { tap: { status: 'PASS' }, font: { status: 'WARN' } } }, { id: 'a', width: 390, checks: { tap: { status: 'FAIL' }, font: { status: 'PASS' } } }, { id: 'a', width: 1280, checks: { tap: { status: 'PASS' } } }];
  const mr = mergeMobileRows(rows);
  assert.equal(mr.length, 2); assert.deepEqual([mr[0].checks.tap.status, mr[0].checks.font.status], ['FAIL', 'WARN']); assert.equal(mr[1].width, 1280);
  assert.equal(rows[0].checks.tap.status, 'PASS', '不可改到原始列');
});
await t('#M17 color-mix／oklch 斷詞', () => {
  assert.deepEqual(colorTokens('linear-gradient(90deg, color-mix(in srgb, red 50%, blue) 0%, oklch(0.5 0.1 200 / 0.5) 100%)'), ['color-mix(in srgb, red 50%, blue)', 'oklch(0.5 0.1 200 / 0.5)']);
  assert.equal(parseColor('rgb(1, 2, 3) junk'), null, '不完整比對不可誤判');
});
await t('#O1 TBT 代理值、五語單一語言判定', () => {
  const lt = [{ t: 100, d: 120 }, { t: 900, d: 300 }, { t: 5000, d: 900 }];
  assert.equal(tbtFrom(lt, 0, 2000), 70 + 250);
  assert.equal(judgeTbt(320, THRESHOLDS, 3000).status, 'WARN'); assert.equal(judgeTbt(100, THRESHOLDS, 3000).status, 'PASS'); assert.equal(judgeTbt(900, THRESHOLDS, 3000).status, 'FAIL');
  assert.equal(judgeTbt(null, THRESHOLDS, 3000).status, 'SKIP');
  assert.deepEqual(EXTRAS_ALL, ['i18n', 'rm', 'nav']);
  // 正式站英文用 <html lang="en-US">，不可判成 WARN；繁簡不可互認
  assert.ok(langMatches('en', 'en-US')); assert.ok(langMatches('zh-Hans', 'zh-CN')); assert.ok(!langMatches('zh-Hans', 'zh-TW')); assert.ok(!langMatches('ja', 'zh-TW')); assert.ok(!langMatches('ko', ''));
  const ok1 = judgeOneLang('en', { font: { chars: 50 }, i18n: { lang: 'en-US', rawTokens: [], hanShare: 0 } }, { ok: true }, 0);
  assert.equal(ok1.status, 'PASS');
});
await t('#M15 主控台的「Failed to load resource … status of 404」與 HTTP 404 只算一次', () => {
  const r = judge(m(), { ...noErr(), http: [{ status: 404, url: 'http://x/a.png', type: 'image' }], console: ['Failed to load resource: the server responded with a status of 404 (Not Found)'] }, okNav, THRESHOLDS, open);
  assert.match(r.errors.summary, /console\.error 0、/); assert.match(r.errors.summary, /HTTP≥400 1/);
});
await t('#B1 next build 自動改寫 tsconfig.json／next-env.d.ts 要原樣還原（MSI 實跑發現）', () => {
  const d = fs.mkdtempSync(path.join(tmp, 'snap-'));
  fs.writeFileSync(path.join(d, 'tsconfig.json'), '{"include":[".next/types/**/*.ts"]}\n');
  const restore = snapshotFiles(d);
  fs.writeFileSync(path.join(d, 'tsconfig.json'), '{"include":[".next/types/**/*.ts",".next-hc2/types/**/*.ts"]}\n');
  fs.writeFileSync(path.join(d, 'next-env.d.ts'), '/// <reference types="next" />\n');
  assert.deepEqual(restore(), ['tsconfig.json', 'next-env.d.ts']);
  assert.equal(fs.readFileSync(path.join(d, 'tsconfig.json'), 'utf8'), '{"include":[".next/types/**/*.ts"]}\n');
  assert.equal(fs.existsSync(path.join(d, 'next-env.d.ts')), false, '原本沒有的檔案要刪回去');
  assert.deepEqual(snapshotFiles(d)(), [], '沒改就不動');
});
await t('#M4 #M5 瀏覽器崩潰往上丟給重試、工具錯誤標 SKIP；兩種情況頁面都會關', async () => {
  assert.ok(isCrash(new Error('Target page, context or browser has been closed'))); assert.ok(isCrash('Browser has disconnected')); assert.ok(!isCrash(new Error('net::ERR_NAME_NOT_RESOLVED')));
  const mk = (msg) => { const pg = { closed: 0, goto: async () => { throw new Error(msg); }, $$eval: async () => [], waitForTimeout: async () => {}, close: async () => { pg.closed++; } }; return { pg, ctx: { newPage: async () => pg } }; };
  const a = mk('Target closed');
  await assert.rejects(beadSize(a.ctx, 'http://x', { cellSelector: '.c', href: '/b' }, { readOnly: false }), /Target closed/); assert.equal(a.pg.closed, 1);
  const b = mk('net::ERR_TIMED_OUT');
  const r = await beadSize(b.ctx, 'http://x', { cellSelector: '.c', href: '/b' }, { readOnly: false });
  assert.equal(r.status, 'SKIP'); assert.match(r.summary, /工具端錯誤/); assert.equal(b.pg.closed, 1);
});
await t('#M8 部署 id 取自 chunk 網址；#M11 建置判斷只排除報告／文件', () => {
  assert.equal(deployIdOf('https://h.vercel.app/_next/static/chunks/a.js?dpl=dpl_AbC123'), 'dpl_AbC123'); assert.equal(deployIdOf('https://h/x.js'), null);
  for (const f of ['features/a.ts', 'cards/x.json', 'data/y.json', 'public/i.png', 'tailwind.config.ts', 'postcss.config.mjs', 'app/page.tsx']) assert.ok(!BUILD_IRRELEVANT.test(f), f + ' 要算改動');
  for (const f of ['reports/r.json', 'docs/a.md', 'logs/x.log', 'tests/t.mjs', 'NOTE.md']) assert.ok(BUILD_IRRELEVANT.test(f), f + ' 不影響建置');
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
  const mm = michelin(many, MICHELIN_TARGETS, undefined, { gatesRun: [{ name: 'tsc', status: 'PASS' }, { name: 'test:health-toolkit', status: 'PASS' }, { name: 'build', status: 'PASS' }, { name: 'audit', status: 'WARN' }, { name: 'test', status: 'SKIP', summary: 'package.json 沒有 test 腳本' }] });
  assert.equal(mm.stability.score, 10); assert.equal(mm.stability.meetsTarget, null);
  // 單一 test:xxx 不能冒充 npm test；SKIP 的 gate 列為缺項；有跑的（含 WARN）不算缺
  assert.deepEqual(mm.stability.missing, ['真機 90 FPS', 'test（未判定：package.json 沒有 test 腳本）']);
  const mg = michelin(many, MICHELIN_TARGETS, undefined, { gatesRun: [] });
  assert.deepEqual(mg.stability.missing, ['真機 90 FPS', 'tsc（未跑）', 'test（未跑）', 'build（未跑）', 'audit（未跑）']);
  assert.equal(mm.overall.score, round1(44 / 66 * 10));
  // 定義完整時才判定達標
  const full = michelin(rows, MICHELIN_TARGETS, undefined, { meta: { quality: {}, stability: {}, service: {} } });
  assert.equal(full.service.meetsTarget, true); assert.equal(full.quality.meetsTarget, false);
  assert.ok(GROUP_META.quality.needChecks.includes('beadSize'));
});
function round1(x) { return Math.round(x * 10) / 10; }

// ---------- gates：npm audit 判讀、gate 名稱對應、--gates all ----------
await t('gates: npm test 已知失敗判 WARN、正常判 PASS、失敗判 FAIL；npm test 腳本存在且清單合理', () => {
  const line = (k) => `PASS  test:jest (1s)\n\nnpm-test-summary: pass=100 fail=0 known=${k} env-only=14 total=${100 + k}\n`;
  assert.equal(gateVerdict('test', { code: 0, out: line(0) }).status, 'PASS');
  const w = gateVerdict('test', { code: 0, out: line(4) });
  assert.equal(w.status, 'WARN'); assert.equal(w.counts.known, 4); assert.match(w.summary, /已知失敗/);
  assert.equal(gateVerdict('test', { code: 1, out: 'npm-test-summary: pass=99 fail=1 known=0 env-only=14 total=100' }).status, 'FAIL');
  assert.equal(gateVerdict('test', { code: null, timedOut: true, out: '' }).status, 'FAIL');
  assert.equal(gateVerdict('test', { code: 0, out: 'no summary' }).status, 'PASS', '沒有摘要行（舊式 npm test）只看 exit code');
  assert.equal(gateVerdict('lint', { code: 0, out: 'npm-test-summary: pass=1 fail=0 known=3 env-only=0 total=4' }).status, 'PASS', '只有 test gate 解析摘要');
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.test, 'node scripts/run-tests.mjs', 'package.json 要有 npm test');
  const plan = planTests(pkg.scripts);
  assert.deepEqual(plan.run.slice(0, 2), ['test:jest', 'test:health-toolkit'], 'Jest 與工具測試先跑');
  for (const k of [...Object.keys(ENV_ONLY), ...Object.keys(KNOWN_FAILING)]) assert.ok(pkg.scripts[k], `清單裡的 ${k} 要真的存在`);
  for (const k of Object.keys(KNOWN_FAILING)) assert.ok(plan.run.includes(k), `已知失敗 ${k} 仍要照跑`);
  assert.ok(!plan.run.some((k) => ENV_ONLY[k]));
  assert.ok(!plan.run.includes('test'), 'npm test 不可遞迴跑自己');
});
await t('gates: audit verdict / gateKind / --gates all', () => {
  const mk = (v, vulns = {}) => JSON.stringify({ metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, ...v } }, vulnerabilities: vulns });
  assert.equal(auditVerdict(mk({})).status, 'PASS');
  assert.equal(auditVerdict(mk({ low: 3 })).status, 'PASS');
  assert.equal(auditVerdict(mk({ moderate: 1 }, { postcss: { severity: 'moderate' } })).status, 'WARN');
  const h = auditVerdict(mk({ high: 2, moderate: 1 }, { next: { severity: 'high' }, x: { severity: 'low' } }));
  assert.equal(h.status, 'FAIL'); assert.deepEqual(h.samples, ['next(high)']); assert.match(h.summary, /high 2/);
  assert.equal(auditVerdict('not json').status, 'SKIP');
  assert.equal(auditVerdict(JSON.stringify({ error: { code: 'ENOTFOUND', summary: 'request to registry failed' } })).status, 'SKIP');
  assert.equal(gateKind('test'), 'test'); assert.equal(gateKind('test:health-toolkit'), null); assert.equal(gateKind('tsc'), 'tsc'); assert.equal(gateKind('audit'), 'audit');
  assert.deepEqual(parseArgs(['--prod', '--gates', 'all,test:ziwei']).gates, [...GATE_ALL, 'test:ziwei']);
  const env = childEnv();
  assert.equal(env.HC_PARENT_PID, String(process.pid)); assert.match(env.NODE_OPTIONS, /--require "[^"]*watchdog\.cjs"/); assert.doesNotMatch(env.NODE_OPTIONS, /\\/, 'NODE_OPTIONS 內路徑用 / 避免反斜線被當跳脫');
});

// ---------- watchdog：工具被強制結束（SIGKILL／TerminateProcess）時，它啟動的子行程自己結束 ----------
await t('watchdog: hard-killed parent leaves no orphan child', async () => {
  const runUrl = pathToFileURL(RUN).href;
  const parent = spawn(process.execPath, ['--input-type=module', '-e', `import { childEnv } from ${JSON.stringify(runUrl)}; import { spawn } from 'node:child_process';
const c = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { env: childEnv({ HC_WATCHDOG_MS: '300' }), stdio: 'ignore' });
console.log('CHILD ' + c.pid); setInterval(() => {}, 1000);`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; parent.stdout.on('data', (d) => (out += d)); parent.stderr.on('data', (d) => (out += d));
  const t0 = Date.now(); while (!/CHILD \d+/.test(out) && Date.now() - t0 < 10000) await new Promise((r) => setTimeout(r, 50));
  const childPid = Number(/CHILD (\d+)/.exec(out)?.[1]); assert.ok(childPid > 0, out);
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(alive(childPid), true, '父行程活著時子行程應該在');
  parent.kill('SIGKILL');
  const t1 = Date.now(); while (alive(childPid) && Date.now() - t1 < 6000) await new Promise((r) => setTimeout(r, 100));
  assert.equal(alive(childPid), false, '父行程被強制結束後，子行程應在數秒內自己結束');
});
function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }

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
await t('#O4 資料夾時間戳用本機時間＋時區、同一秒不撞名', () => {
  const d = new Date(2026, 10, 25, 14, 15, 30);
  const st = localStamp(d);
  assert.match(st, /^20261125T141530[+-]\d{4}$/);
  const root = path.join(tmp, 'stamp'); fs.mkdirSync(root);
  const a1 = makeRunDir(root, 'site', d), a2 = makeRunDir(root, 'site', d);
  assert.notEqual(a1, a2); assert.match(path.basename(a2), /^20261125T141530[+-]\d{4}\.2-site$/);
  assert.ok(RUN_DIR_RE.test(path.basename(a1)) && RUN_DIR_RE.test(path.basename(a2)) && RUN_DIR_RE.test('20261125T044351-heaven'));
});
await t('#M9 範圍分組保留＋完整基準不被試跑擠掉＋compare auto 只拿同範圍', () => {
  const root = path.join(tmp, 'scoped');
  const mk = (name, rep) => { const d = path.join(root, name); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, '.hc-run'), ''); if (rep) fs.writeFileSync(path.join(d, 'report.json'), JSON.stringify({ target: 'remote', label: 'site', readOnly: true, widths: [360, 390, 1280], only: null, rows: [], ...rep })); return d; };
  const FULL = {}, ONE = { only: ['home'], widths: [390] };
  mk('20261125T010000-site', FULL);
  for (let i = 1; i <= 6; i++) mk(`20261125T02000${i}-site`, ONE);
  mk('20261125T030000-site', null); // 中斷留下的空殼
  mk('20261125T040000-site', { ...FULL, target: 'local-start' }); // 不同目標
  mk('20261125T050000-site', { widths: [1280, 390, 360] }); // 寬度順序不同仍是完整範圍、同一組
  const cur = mk('20261125T060000-site', null);
  const removed = pruneOwnRuns(root, 3, { current: cur, emptyGraceMs: 0 });
  assert.deepEqual(removed.sort(), ['20261125T020001-site', '20261125T020002-site', '20261125T020003-site', '20261125T030000-site'].sort());
  const left = fs.readdirSync(root).sort();
  assert.ok(left.includes('20261125T010000-site') && left.includes('20261125T050000-site'), '完整範圍 2 份 ≤ keep，都留著');
  // keep=1：完整範圍只留最新一份；只量一頁的組也只留 1 份；最新完整那份永不刪
  const r2 = pruneOwnRuns(root, 1, { current: cur });
  assert.ok(r2.includes('20261125T010000-site') && !r2.includes('20261125T050000-site'));
  assert.ok(fs.existsSync(path.join(root, '20261125T050000-site')) && fs.existsSync(path.join(root, '20261125T040000-site')));
  assert.deepEqual(fs.readdirSync(root).filter((n) => n.startsWith('20261125T02')), ['20261125T020006-site']);
  // 舊報告沒有 label → 由資料夾名補；完整範圍的判定
  assert.equal(isFullScope({ widths: [390, 360, 1280], only: null }), true); assert.equal(isFullScope({ widths: [390], only: null }), false); assert.equal(isFullScope({ widths: [360, 390, 1280], only: ['home'] }), false);
  assert.notEqual(scopeKey({ target: 'remote', label: 'site', widths: [390], only: ['home'] }), scopeKey({ target: 'remote', label: 'site', widths: [390], only: ['tarot'] }));
  // compare auto：完整跑對完整跑，不會拿到一頁的試跑
  assert.equal(findBaseline(root, { target: 'remote', label: 'site', readOnly: true, widths: [360, 390, 1280] }, { current: cur }), path.join(root, '20261125T050000-site', 'report.json'));
  assert.equal(findBaseline(root, { target: 'remote', label: 'site', readOnly: true, widths: [390], only: ['home'] }), path.join(root, '20261125T020006-site', 'report.json'));
  assert.equal(findBaseline(root, { target: 'remote', label: 'site', readOnly: true, widths: [390], only: ['tarot'] }), null);
  assert.equal(findBaseline(root, { target: 'remote', label: 'other', readOnly: true, widths: [360, 390, 1280] }), null);
  // 這次本身是完整跑：它算該組的一份；keep=1 時上一份完整可清（最新完整就是這次）；只量一頁的試跑當 current 時完整那份仍不動
  const asOne = pruneOwnRuns(root, 1, { current: cur, currentRep: { target: 'remote', label: 'site', readOnly: true, widths: [390], only: ['home'] } });
  assert.ok(asOne.includes('20261125T020006-site') && fs.existsSync(path.join(root, '20261125T050000-site')));
  const asFull = pruneOwnRuns(root, 1, { current: cur, currentRep: { target: 'remote', label: 'site', readOnly: true, widths: [360, 390, 1280] } });
  assert.deepEqual(asFull, ['20261125T050000-site']);
});
await t('prune / compare / markdown', () => {
  const root = path.join(tmp, 'runs');
  for (const d of ['a1', 'a2', 'a3']) { fs.mkdirSync(path.join(root, d), { recursive: true }); fs.writeFileSync(path.join(root, d, '.hc-run'), ''); }
  fs.mkdirSync(path.join(root, 'a0-other'));
  // a1..a3 沒有 report.json：視為中斷留下的空殼，過了寬限期就清；寬限期內不動；不是自己的（沒有 .hc-run）永遠不動
  assert.deepEqual(pruneOwnRuns(root, 2, { emptyGraceMs: 60000 }), [], '剛建立的空資料夾在寬限期內不清');
  // now 往後推 1 秒：Windows NTFS 的 mtime 有小數毫秒，剛建立的資料夾 mtimeMs 可能比 Date.now() 大一點點（age<0）而被當成寬限期內
  assert.deepEqual(pruneOwnRuns(root, 2, { current: path.join(root, 'a3'), emptyGraceMs: 0, now: Date.now() + 1000 }), ['a1', 'a2']);
  assert.ok(fs.existsSync(path.join(root, 'a0-other'))); assert.ok(fs.existsSync(path.join(root, 'a3')));
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
  // Windows 拿不到別人的 cwd：相對路徑 → 位置不明（null）；絕對路徑但不是本 repo → false
  const w = findNextConflicts([{ pid: 21, cmd: 'node node_modules\\next\\dist\\bin\\next build', cwd: null }, { pid: 22, cmd: '"C:\\nodejs\\node.exe" C:\\other\\node_modules\\next\\dist\\bin\\next build', cwd: null }, { pid: 23, cmd: 'node node_modules\\next\\dist\\bin\\next start -p 3400', cwd: null }], 'C:\\Users\\D\\repo', 99);
  assert.deepEqual(w.builds.map((b) => [b.pid, b.inRepo]), [[21, null], [22, false]]);
  assert.deepEqual(w.sameRepoServers.map((b) => [b.pid, b.inRepo]), [[23, null]]);
  const dd = path.join(tmp, 'dist-busy'); fs.mkdirSync(dd); fs.writeFileSync(path.join(dd, 'trace'), 'x');
  assert.equal(distBusy(dd), true); assert.equal(distBusy(dd, 60000, Date.now() + 120000), false); assert.equal(distBusy(path.join(tmp, 'no-such-dist')), false);
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
const runTool = (args, env = {}) => new Promise((res) => { const p = spawn(process.execPath, [RUN, ...args, ...(args.includes('--extras') || args.includes('--serve') ? [] : ['--extras', 'none'])], { env: { ...process.env, HC_LOCK_FILE: path.join(tmp, 'e2e.lock'), ...env } }); let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d)); p.on('exit', (code) => res({ code, out })); });
let e2e = 'SKIP（找不到 playwright；設 PLAYWRIGHT_MODULE 後可跑）';
if (findPlaywright()) {
  await t('#M10 --serve 起不來時寫 error.json（不留空殼、不冒充 build PASS）', async () => {
  const out = path.join(tmp, 'serve-err');
  const r = await runTool(['--serve', '--only', 'home', '--widths', '390', '--out', out], { HC_DIST_DIR: '.next-hc-test-absent' });
  assert.equal(r.code, 2, r.out); assert.match(r.out, /沒有 \.next|不是本工具/);
  const dirs = fs.readdirSync(out).filter((d) => RUN_DIR_RE.test(d));
  assert.equal(dirs.length, 1);
  const ej = JSON.parse(fs.readFileSync(path.join(out, dirs[0], 'error.json'), 'utf8'));
  assert.equal(ej.phase, 'serve'); assert.equal(ej.gates[0].status, 'SKIP');
});
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
      // #M9 端到端：同一輸出資料夾跑兩次「只量一頁」＋--keep 1，完整那份不能被擠掉；compare auto 只比同範圍
      const only = ['--base', f.base, '--cards', cf, '--only', 'ok', '--widths', '390', '--settle-ms', '300', '--no-early-swipe', '--shots', 'none', '--out', out, '--keep', '1', '--compare', 'auto'];
      const o1 = await runTool(only); assert.equal(o1.code, 0, o1.out); assert.match(o1.out, /找不到同範圍的上次報告/);
      const o2 = await runTool([...only, '--gates', 'build,no-such-script-x']); assert.equal(o2.code, 0, o2.out);
      // #M14 先關瀏覽器再跑 gates
      assert.ok(o2.out.indexOf('瀏覽器已關閉，開始跑 gates') > o2.out.lastIndexOf('寬度 390'), o2.out);
      assert.ok(fs.existsSync(path.join(out, dir, 'report.json')), '只量一頁的試跑不可清掉不同範圍的報告');
      const onlyDirs = fs.readdirSync(out).filter((d) => d !== dir && fs.existsSync(path.join(out, d, 'report.json'))).sort();
      assert.equal(onlyDirs.length, 1, '同範圍 --keep 1 只留最新一份：' + onlyDirs.join(','));
      const rep2 = JSON.parse(fs.readFileSync(path.join(out, onlyDirs[0], 'report.json'), 'utf8'));
      assert.ok(rep2.compare && !rep2.compare.against.includes(dir), 'compare auto 不可拿不同範圍當基線');
      assert.deepEqual(rep2.scope.pages, 'only:ok');
      // gates：沒 --serve 時 build 不冒充 PASS；不存在的腳本 SKIP；穩定分維持不完整並寫明原因
      assert.deepEqual(rep2.gates.map((g) => `${g.name}:${g.status}`), ['build:SKIP', 'no-such-script-x:SKIP']);
      assert.ok(rep2.michelin.stability.missing.some((m) => m.startsWith('build（未判定：只有 --serve 時才有建置結果')), rep2.michelin.stability.missing.join('|'));
      assert.match(fs.readFileSync(path.join(out, onlyDirs[0], 'report.md'), 'utf8'), /## 閘門（gates）[\s\S]*no-such-script-x \| SKIP/);
      e2e = `ok（${rep.rows.length} 頁，${rep.elapsedSec}s）`;
    } finally { await f.close(); }
  });
  const extraRun = async (name, args, env) => {
    const f = await startFixture();
    try {
      const cf = path.join(tmp, 'extra-cards.json'); fs.writeFileSync(cf, JSON.stringify(EXTRA_CARDS));
      const out = path.join(tmp, name);
      const r = await runTool(['--base', f.base, '--cards', cf, '--shots', 'none', '--out', out, ...args], env);
      const dir = fs.existsSync(out) ? fs.readdirSync(out).find((d) => fs.existsSync(path.join(out, d, 'report.json'))) : null;
      const rep = dir ? JSON.parse(fs.readFileSync(path.join(out, dir, 'report.json'), 'utf8')) : null;
      return { r, rep, f, row: (id, w) => rep.rows.find((x) => x.id === id && (w == null || x.width === w)), md: dir ? fs.readFileSync(path.join(out, dir, 'report.md'), 'utf8') : '' };
    } finally { await f.close(); }
  };
  await t('#M1 攔截在瀏覽器層：beacon／XHR PUT／worker／跨站 iframe／表單 POST 都到不了伺服器，且 HTTP 快取仍開著', async () => {
    const x = await extraRun('m1-out', ['--only', 'writes-all,ok2', '--widths', '390', '--concurrency', '1', '--no-early-swipe', '--extras', 'none']);
    assert.ok(x.rep, x.r.out);
    assert.deepEqual(x.f.writes, [], '伺服器不可收到任何寫入：' + x.f.writes.join(','));
    assert.equal(x.f.hits['/cached.js'], 1, '可快取的腳本第二頁應走快取（攔截不可停用快取）');
    const kinds = x.rep.blockedWrites.map((b) => `${b.method} ${new URL(b.url).pathname}`);
    for (const k of ['POST /beacon', 'PUT /xhr', 'POST /w-post', 'POST /api/view', 'POST /form']) assert.ok(kinds.includes(k), `${k} 應列在被攔清單：${kinds.join(',')}`);
    assert.equal(x.row('writes-all').checks.errors.status, 'PASS', x.row('writes-all').checks.errors.summary);
    // #O1 頁面重量：快取命中時仍量得到（encodedBodySize），只當資訊
    const w = x.row('ok2').metrics.weight; assert.ok(w && w.requests >= 2 && w.totalKB >= 0 && w.jsKB >= 0, JSON.stringify(w));
    assert.match(x.md, /頁面重量（資訊，不計分）/);
  });
  await t('#M2 穩定即止：正常頁提早結束；晚到錯誤條（3.3s 後才出現）仍抓得到', async () => {
    const x = await extraRun('m2-out', ['--only', 'ok,late-banner', '--widths', '390', '--settle-ms', '8000', '--no-early-swipe', '--extras', 'none']);
    assert.ok(x.rep, x.r.out);
    const ok = x.row('ok'), lb = x.row('late-banner');
    assert.ok(ok.nav.settleMs < 5000 && ok.nav.settleReason !== 'max', `正常頁應提早穩定：${ok.nav.settleMs}ms ${ok.nav.settleReason}`);
    assert.ok(lb.nav.settleMs > 3300, `晚到錯誤條要等到出現：${lb.nav.settleMs}ms`);
    assert.equal(lb.checks.visibleError.status, 'FAIL', lb.checks.visibleError.summary);
    assert.ok(lb.checks.cls.value > 0, '錯誤條插在最上面造成的位移要算進 CLS');
    assert.match(x.md, /穩定即止/);
    // #O7 報告固定列「本工具未涵蓋」
    assert.match(x.md, /## 本工具未涵蓋[\s\S]*INP/);
  });
  await t('#M17 oklch／color-mix 顏色解析得出來（不再 unknown）、#O1 a11y、#M15 樣本附位置、#M16 桌機門檻試算', async () => {
    const x = await extraRun('m17-out', ['--only', 'colors,a11y,desk-small', '--widths', '390,1280', '--no-early-swipe', '--extras', 'none']);
    assert.ok(x.rep, x.r.out);
    const c = x.row('colors', 390);
    assert.equal(c.checks.contrast.status, 'FAIL', c.checks.contrast.summary); assert.match(c.checks.contrast.samples.join(' '), /深灰字/);
    assert.doesNotMatch(c.checks.contrast.samples.join(' '), /淺字/); assert.match(c.checks.contrast.summary, /另 0 段未判定/);
    // #O8 祖先 opacity:0 的字不算（checkVisibility）
    assert.equal(c.checks.font.status, 'PASS', c.checks.font.summary); assert.doesNotMatch(c.checks.contrast.samples.join(' '), /祖先透明/);
    const y = x.row('a11y', 390).checks.a11y;
    assert.equal(y.status, 'FAIL', y.summary); assert.match(y.summary, /沒有名稱的按鈕／連結 1、沒有標籤的欄位 1/); assert.match(y.summary, /缺 alt 的圖 1/);
    assert.ok(y.samples.some((s) => /button/.test(s)), '樣本要附位置／選擇器：' + y.samples.join('|'));
    const d = x.row('desk-small', 1280);
    assert.equal(d.checks.tap.status, 'WARN'); assert.equal(d.checks.font.status, 'FAIL', '預設維持手機標準');
    assert.deepEqual([d.whatIf.tap, d.whatIf.font], ['PASS', 'PASS'], '桌機提案值下應通過');
    assert.equal(x.rep.desktopWhatIf.appliedNow, '手機標準（現狀，擁有者未決定）');
    assert.ok(x.rep.desktopWhatIf.changed.some((s) => s.startsWith('desk-small@1280')));
    assert.match(x.md, /## 桌機 1280 門檻試算/);
    const y2 = await extraRun('m16b-out', ['--only', 'desk-small', '--widths', '1280', '--no-early-swipe', '--extras', 'none', '--desktop-profile']);
    assert.equal(y2.row('desk-small', 1280).checks.font.status, 'PASS'); assert.equal(y2.row('desk-small', 1280).whatIf.profile, 'mobile');
  });
  await t('#O1 五語、減少動態、返回重進；#O9 慢捲到底', async () => {
    const x = await extraRun('ext-out', ['--only', 'i18n-ok,i18n-bad,rm-blank,lazy-shift', '--widths', '390', '--no-early-swipe', '--extras', 'all']);
    assert.ok(x.rep, x.r.out);
    const ck = (id, k) => x.row(id, 390).checks[k];
    assert.equal(ck('i18n-ok', 'i18n').status, 'PASS', '沒翻到的句子保留繁中是設計，不扣分：' + ck('i18n-ok', 'i18n').summary);
    assert.match(ck('i18n-ok', 'i18n').summary, /ja PASS（仍為中文字 100%）/);
    assert.match(ck('i18n-ok', 'i18n').summary, /en PASS/);
    assert.equal(ck('i18n-bad', 'i18n').status, 'FAIL', ck('i18n-bad', 'i18n').summary); assert.match(ck('i18n-bad', 'i18n').summary, /en FAIL（程式值外露 1/); assert.match(ck('i18n-bad', 'i18n').samples.join(' '), /en: .*undefined/);
    assert.equal(ck('rm-blank', 'reducedMotion').status, 'FAIL', ck('rm-blank', 'reducedMotion').summary);
    assert.equal(ck('i18n-ok', 'reducedMotion').status, 'PASS');
    assert.equal(ck('lazy-shift', 'scroll').status === 'PASS', false, '捲到底才插入大區塊要被抓到：' + ck('lazy-shift', 'scroll').summary);
    for (const id of ['i18n-ok', 'rm-blank', 'lazy-shift']) assert.equal(ck(id, 'backForward').status, 'PASS', id + ' ' + ck(id, 'backForward').summary);
  });
  await t('#M3 早滑用真的觸控手勢（不是 scrollBy）', async () => {
    const x = await extraRun('swipe-out', ['--only', 'home', '--widths', '390', '--extras', 'none']);
    assert.ok(x.rep, x.r.out);
    const es = x.row('home', 390).checks.earlySwipe;
    assert.equal(es.status, 'PASS', es.summary); assert.match(es.summary, /\(touch/); assert.doesNotMatch(es.summary, /scrollBy/);
  });
  await t('#O5 --min-coverage／--strict', async () => {
    // 只有畫布的頁：對比、LCP 判不出來 → 涵蓋率 11/13（84.6%）
    const x = await extraRun('strict-out', ['--only', 'canvas-only', '--widths', '390', '--no-early-swipe', '--extras', 'none', '--strict']);
    assert.equal(x.r.code, 1, '涵蓋率未達門檻＋--strict 要 exit 1：' + x.r.out.slice(-400)); assert.match(x.r.out, /涵蓋率/);
    assert.equal(x.rep.coverage.pct, 0.846);
    const y = await extraRun('nostrict-out', ['--only', 'canvas-only', '--widths', '390', '--no-early-swipe', '--extras', 'none']);
    assert.equal(y.r.code, 0, '沒有 --strict 只警告不失敗'); assert.match(y.r.out, /低於門檻 90%/);
    const z = await extraRun('lowmin-out', ['--only', 'canvas-only', '--widths', '390', '--no-early-swipe', '--extras', 'none', '--strict', '--min-coverage', '0.8']);
    assert.equal(z.r.code, 0, z.r.out.slice(-400));
  });
}

// 中斷：Ctrl+C／SIGINT 後鎖要被清掉、exit 130（Windows 的 process.kill 是強制結束、送不了 SIGINT，改在 MSI 用 GenerateConsoleCtrlEvent 手動驗）
let sigint = 'SKIP（Windows 另以主控台 Ctrl+C 手動驗）';
if (findPlaywright() && process.platform !== 'win32') {
  await t('SIGINT releases the lock (exit 130)', async () => {
    const f = await startFixture();
    try {
      const lockFile = path.join(tmp, 'sig.lock');
      const p = spawn(process.execPath, [RUN, '--base', f.base, '--only', 'ok', '--cards', path.join(tmp, 'fixture-cards.json'), '--widths', '390', '--settle-ms', '20000', '--no-early-swipe', '--extras', 'none', '--shots', 'none', '--out', path.join(tmp, 'sig-out')], { env: { ...process.env, HC_LOCK_FILE: lockFile } });
      let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
      const exited = new Promise((res) => p.on('exit', (code, signal) => res({ code, signal })));
      const t0 = Date.now(); while (!/寬度 390/.test(out) && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 100));
      await new Promise((r) => setTimeout(r, 800)); // 穩定即止最少 2.5s，0.8s 時一定還在量
      assert.ok(fs.existsSync(lockFile), '執行中應持有鎖');
      p.kill('SIGINT');
      const r = await Promise.race([exited, new Promise((res) => setTimeout(() => res({ code: 'timeout' }), 10000))]);
      assert.equal(r.code, 130, out); assert.equal(fs.existsSync(lockFile), false, '中斷後鎖必須被清掉');
      const runs = fs.existsSync(path.join(tmp, 'sig-out')) ? fs.readdirSync(path.join(tmp, 'sig-out'), { recursive: true }).filter((x) => /report\.json$/.test(x)) : [];
      assert.deepEqual(runs, [], '中斷後不可寫出半套報告');
      assert.deepEqual(fs.existsSync(path.join(tmp, 'sig-out')) ? fs.readdirSync(path.join(tmp, 'sig-out')).filter((n) => RUN_DIR_RE.test(n)) : [], [], '中斷時自己這次的空資料夾要清掉'); assert.match(out, /收到中斷訊號/);
      sigint = 'ok';
    } finally { await f.close(); }
  });
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(results.join('\n'));
console.log(`SIGINT: ${sigint}`);
console.log(`e2e: ${e2e}`);
console.log('health-toolkit: all assertions passed');
