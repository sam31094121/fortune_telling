// scripts/health 純函式測試：對比、CLS、判定、米其林分數、鎖檔、只清自己的輸出、報告比較。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseColor, blendOver, contrastRatio, isLargeText, clsFromEntries, michelin, overallStatus, acquireLock, releaseLock, pruneOwnRuns, compareRuns, renderMarkdown, diskGuard } from '../scripts/health/lib.mjs';
import { judge, judgeEarlySwipe } from '../scripts/health/judge.mjs';
import { CARDS, THRESHOLDS, MICHELIN_TARGETS, VIEWPORTS, LOCAL_ENV_GAP_APIS } from '../scripts/health/config.mjs';
import { metricsScript, INIT_SCRIPT } from '../scripts/health/probe.mjs';

// 設定：15 張卡、三種寬度、門檻與業主米其林一致
assert.equal(CARDS.length, 15);
assert.deepEqual(CARDS.map((c) => c.n), Array.from({ length: 15 }, (_, i) => i + 1));
assert.deepEqual(VIEWPORTS.map((v) => v.width), [360, 390, 1280]);
assert.equal(THRESHOLDS.clsMax, 0.05); assert.equal(THRESHOLDS.tapMinPx, 44); assert.equal(THRESHOLDS.fontMinBodyPx, 14);
assert.deepEqual(MICHELIN_TARGETS, { quality: 9.5, stability: 9, service: 8.5 });

// 對比：黑白 21、#767676 對白約 4.54（AA 邊界）
const W = parseColor('rgb(255, 255, 255)'), B = parseColor('rgb(0,0,0)');
assert.equal(Math.round(contrastRatio(B, W)), 21);
assert.ok(Math.abs(contrastRatio(parseColor('rgb(118,118,118)'), W) - 4.54) < 0.01);
assert.deepEqual(parseColor('rgba(0, 0, 0, 0.5)'), { r: 0, g: 0, b: 0, a: 0.5 });
assert.equal(Math.round(blendOver(parseColor('rgba(0,0,0,0.5)'), W).r), 128);
assert.equal(isLargeText(24, 400), true); assert.equal(isLargeText(19, 700), true); assert.equal(isLargeText(18, 400), false);

// CLS：輸入後的位移不算；session window 取最大
assert.deepEqual(clsFromEntries([{ t: 100, value: 0.03 }, { t: 500, value: 0.03 }, { t: 9000, value: 0.01 }, { t: 9100, value: 0.5, hadRecentInput: true }]), { cls: 0.06, total: 0.07 });
assert.deepEqual(clsFromEntries([]), { cls: 0, total: 0 });

// 判定
const m = (over = {}) => ({ tap: { total: 10, small: 0, under24: 0, samples: [] }, font: { chars: 100, smallChars: 0, share: 0, minPx: 14, tinyRuns: [] }, contrast: { checked: 5, unknown: 0, low: 0, samples: [] }, overflow: { vw: 390, scrollWidth: 390, samples: [] }, visibleError: null, hc: { shifts: [], lcp: 1200 }, ...over });
const okNav = { ok: true, status: 200, dcl: 300, load: 500 };
const noErr = { console: [], page: [], http: [] };
let ch = judge(m(), noErr, okNav, THRESHOLDS, CARDS[0]);
assert.equal(overallStatus(ch), 'PASS');
ch = judge(m({ hc: { shifts: [{ t: 4000, value: 0.06, nodes: ['DIV.banner'] }], lcp: 1200 } }), noErr, okNav, THRESHOLDS, CARDS[0]);
assert.equal(ch.cls.status, 'FAIL'); assert.equal(ch.cls.late, 0.06); // 晚到的橫幅要被抓到
ch = judge(m({ tap: { total: 3, small: 1, under24: 0, samples: ['A 40x40'] } }), noErr, okNav, THRESHOLDS, CARDS[0]);
assert.equal(ch.tap.status, 'WARN');
ch = judge(m({ tap: { total: 3, small: 1, under24: 1, samples: ['A 1x1'] } }), noErr, okNav, THRESHOLDS, CARDS[0]);
assert.equal(ch.tap.status, 'FAIL');
ch = judge(m({ font: { chars: 100, smallChars: 20, share: 0.2, minPx: 12, tinyRuns: [] } }), noErr, okNav, THRESHOLDS, CARDS[0]);
assert.equal(ch.font.status, 'FAIL');
ch = judge(m({ overflow: { vw: 360, scrollWidth: 400, samples: [] } }), noErr, okNav, THRESHOLDS, CARDS[0]);
assert.equal(ch.overflow.status, 'FAIL');
ch = judge(m({ contrast: { checked: 0, unknown: 7, low: 0, samples: [] } }), noErr, okNav, THRESHOLDS, CARDS[0]);
assert.equal(ch.contrast.status, 'SKIP'); // 背景是圖片時誠實標無法判定，不算過
// 密碼卡的 401 是預期；其他卡 401 算錯
const gated = CARDS.find((c) => c.gated), open = CARDS[0];
assert.equal(judge(m(), { console: [], page: [], http: [{ status: 401, url: '/api/x' }] }, okNav, THRESHOLDS, gated).errors.status, 'PASS');
assert.equal(judge(m(), { console: [], page: [], http: [{ status: 401, url: '/api/x' }] }, okNav, THRESHOLDS, open).errors.status, 'FAIL');
// 本機缺後端的 503 只在本機降為 WARN；正式站照 FAIL
const gap = { console: ['Failed to load resource: the server responded with a status of 503 (Service Unavailable)'], page: [], http: [{ status: 503, url: 'http://127.0.0.1:1/api/home-trust' }] };
assert.equal(judge(m(), gap, okNav, THRESHOLDS, open, { envGapApis: LOCAL_ENV_GAP_APIS }).errors.status, 'WARN');
assert.equal(judge(m(), gap, okNav, THRESHOLDS, open, { envGapApis: null }).errors.status, 'FAIL');
assert.equal(judge(m({ hc: { shifts: [], lcp: 5000 } }), noErr, okNav, THRESHOLDS, open).lcp.status, 'FAIL');
assert.equal(judge(m(), noErr, { ok: false, error: 'timeout' }, THRESHOLDS, open).load.status, 'FAIL');

// 早滑：被拉回 >200px 就 FAIL；沒捲動 → WARN（無法判定，不當 PASS）
assert.equal(judgeEarlySwipe([[0, 1500], [100, 1500], [200, 300]], 0, THRESHOLDS).status, 'FAIL');
assert.equal(judgeEarlySwipe([[0, 1500], [100, 1520]], 0, THRESHOLDS).status, 'PASS');
assert.equal(judgeEarlySwipe([[0, 10]], 0, THRESHOLDS).status, 'WARN');

// 米其林：PASS=1、WARN=0.5、FAIL=0、SKIP 不計
const rows = [{ checks: { cls: { status: 'PASS' }, tap: { status: 'WARN' }, contrast: { status: 'SKIP' }, errors: { status: 'FAIL' }, load: { status: 'PASS' }, lcp: { status: 'PASS' } } }];
const mi = michelin(rows, MICHELIN_TARGETS);
assert.equal(mi.quality.score, 7.5); assert.equal(mi.quality.checks, 2);
assert.equal(mi.stability.score, 5); assert.equal(mi.service.score, 10);
assert.equal(mi.service.meetsTarget, true); assert.equal(mi.quality.meetsTarget, false);

// 產生給瀏覽器的程式碼可被解析（不在 node 執行）
new Function(INIT_SCRIPT); new Function('return ' + metricsScript({ ...THRESHOLDS, visibleErrorRe: 'x' }));

// 鎖檔：第二個拿不到；持有者死掉的鎖可回收
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-test-'));
const lf = path.join(tmp, 'l.lock');
assert.equal(acquireLock({}, { file: lf }).ok, true);
assert.equal(acquireLock({}, { file: lf }).ok, false); // 同一 pid 仍活著 → 不可重入
releaseLock(lf); assert.equal(fs.existsSync(lf), false);
fs.writeFileSync(lf, JSON.stringify({ pid: 999999, host: os.hostname(), startedAt: new Date().toISOString() }));
assert.equal(acquireLock({}, { file: lf }).ok, true); releaseLock(lf);
fs.writeFileSync(lf, JSON.stringify({ pid: 1, host: 'other-host', startedAt: new Date().toISOString() }));
assert.equal(acquireLock({}, { file: lf }).ok, false); // 別台機器、未過期 → 不搶
fs.writeFileSync(lf, JSON.stringify({ pid: 1, host: 'other-host', startedAt: new Date(Date.now() - 3 * 3600e3).toISOString() }));
assert.equal(acquireLock({}, { file: lf }).ok, true); releaseLock(lf);

// 只清自己的輸出（有 .hc-run 標記），別人的資料夾不動
const root = path.join(tmp, 'runs');
for (const d of ['a1', 'a2', 'a3']) { fs.mkdirSync(path.join(root, d), { recursive: true }); fs.writeFileSync(path.join(root, d, '.hc-run'), ''); }
fs.mkdirSync(path.join(root, 'a0-other'));
assert.deepEqual(pruneOwnRuns(root, 2), ['a1']);
assert.ok(fs.existsSync(path.join(root, 'a0-other')));
assert.equal(typeof diskGuard(tmp, 0).freeGb, 'number');

// 比較與報告
const prev = { rows: [{ id: 'tarot', width: 390, checks: { cls: { status: 'PASS' }, tap: { status: 'FAIL' } } }] };
const cur = { rows: [{ id: 'tarot', width: 390, checks: { cls: { status: 'FAIL' }, tap: { status: 'PASS' } } }] };
assert.deepEqual(compareRuns(prev, cur), { regressions: ['tarot@390 cls: PASS→FAIL'], fixed: ['tarot@390 tap: FAIL→PASS'] });
const md = renderMarkdown({ startedAtLocal: 'x', base: 'b', target: 'remote', readOnly: true, elapsedSec: 1, build: 'none', michelin: michelin(cur.rows, MICHELIN_TARGETS), rows: [{ n: 1, id: 'tarot', name: '古老塔羅牌', width: 390, status: 'FAIL', checks: { cls: { status: 'FAIL', summary: 'CLS 0.1' } } }] });
assert.match(md, /\| 1 \| 古老塔羅牌 \| FAIL cls \|/);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('health-toolkit: all assertions passed');
