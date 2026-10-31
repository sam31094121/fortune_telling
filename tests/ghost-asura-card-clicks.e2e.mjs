/**
 * 鬼魅阿修羅｜真實點擊自動測試（headless Edge ＋ 私有測試伺服器＋測試登入）
 * ============================================================================
 * 為什麼要有：靜態檢查抓不到「看得到、點不到」這類 bug（2026-10-15 印記卡打開後收不回，
 * 原因是 3D 傾斜讓整張卡在瀏覽器裡命中不到）。這支用真正的滑鼠事件（Input.dispatchMouseEvent，
 * 走瀏覽器的命中測試）一張一張點開、再點收起。
 *
 * 免密碼：tests/helpers/asura-e2e-server.mjs 另開私有 next dev，上鎖密碼與金鑰是當場隨機的測試值，
 * 簽一個測試 session cookie 給瀏覽器；不碰真實密碼、不改安全設定。
 *
 * 執行：npm run test:e2e-asura   （約 1 分鐘；需要本機 Edge）
 * 不在推送閘內（太慢），但每次推送前要跑一次：npm run test:pre-push-e2e
 * ============================================================================
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startAsuraE2eServer } from './helpers/asura-e2e-server.mjs';

const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => existsSync(p));
assert(EDGE, '找不到 Edge 或 Chrome');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks += 1; };

const srv = await startAsuraE2eServer();
const PORT = 9400 + Math.floor(Math.random() * 90);
const profile = mkdtempSync(path.join(os.tmpdir(), 'asura-e2e-edge-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
let ws;
const cleanup = async () => {
  try { ws?.close(); } catch { /* 已關 */ }
  try { edge.kill(); } catch { /* 已結束 */ }
  await srv.stop();
};

try {
  let target;
  for (let i = 0; i < 40 && !target; i += 1) { await sleep(500); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* 還沒起來 */ } }
  assert(target, '瀏覽器沒有起來');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map(); const exceptions = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
  const waitFor = async (expr, ms = 120000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await evalJs(expr)) return; await sleep(300); } throw new Error(`timeout: ${expr}`); };

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Network.setCookie', { name: srv.cookieName, value: srv.cookie, url: srv.base });

  /** 真實滑鼠點擊：座標是 CSS 像素，走瀏覽器命中測試（卡片點不到就會點到別的東西）。 */
  const realClickAt = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  // 先瞬間捲到位（頁面可能有 smooth scroll），等捲動停下再量座標，避免點在捲動途中的錯位置。
  const centerOf = async (selector, index) => {
    await evalJs(`(() => { const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}]; el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); })()`);
    await sleep(350);
    return evalJs(`(() => { const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}]; const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), hit: hit ? hit.tagName + '.' + String(hit.className || '').slice(0, 30) : null }; })()`);
  };

  const clickText = (txt) => `(() => { const el = [...document.querySelectorAll('button')].find(e => e.textContent.trim().startsWith(${JSON.stringify(txt)})); if (!el) return false; el.click(); return true; })()`;
  const typeAt = (index, value) => `(() => { const nodes = document.querySelectorAll('main[data-page="ghost-asura"] [data-field="birthDate"] input[aria-label="' + ${JSON.stringify(['民國年', '月份', '日期'][index])} + '"]'); if (nodes.length !== 1 || nodes[0].disabled) return false; const el = nodes[0]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value === ${JSON.stringify(value)}; })()`;

  // ---- 進頁面、填鎖定命盤 1974-06-28 18:00 男（民國 63 年 6 月 28 日）----
  await send('Page.navigate', { url: `${srv.base}/ghost-asura` });
  await waitFor(`document.readyState === 'complete' && !!document.querySelector('button[type=submit]')`);
  await sleep(2500);
  ok(!/請先輸入密碼|輸入密碼才能/.test(await evalJs('document.body.innerText')), '測試登入失敗，頁面仍然顯示上鎖');
  await evalJs(clickText('我自己')); await sleep(300);
  await evalJs(clickText('國曆生日')); await sleep(300);
  ok(await evalJs(typeAt(0, '63')) && await evalJs(typeAt(1, '6')) && await evalJs(typeAt(2, '28')), '找不到生日欄位');
  await sleep(300);
  await evalJs(clickText('男性')); await sleep(300);
  await evalJs(clickText('我知道出生時辰')); await sleep(800);
  ok(await evalJs(clickText('酉')), '找不到酉時');
  await sleep(800);
  await evalJs(`document.querySelector('button[type=submit]').click()`);
  await waitFor(`document.querySelectorAll('[data-asura-detail]').length > 0`);
  await sleep(2500);

  // ---- 四張標題卡：過去／現在／未來＋歲數 ----
  const heads = await evalJs(`[...document.querySelectorAll('[data-asura-pillar-head]')].map(h => h.innerText.replace(/\\s+/g, ' '))`);
  ok(heads.length === 4, `應有 4 張標題卡，實際 ${heads.length}`);
  for (const h of heads) { ok(/過去|現在|未來/.test(h), `標題卡缺時態標籤：${h}`); ok(/約 \d+/.test(h), `標題卡缺歲數：${h}`); }
  // ---- 業主 2026-10-15 要求隱藏的字與面板不得出現 ----
  const hidden = await evalJs(`document.querySelectorAll('[class*=lifeHeadline],[class*=lifePointer],[class*=lifeBasis],[class*=lifeDetail],[data-asura-life]').length`);
  ok(hidden === 0, `被隱藏的人生階段文字又出現了（${hidden} 個）`);
  ok(!/左右滑過四有|左右滑動查看四/.test(await evalJs('document.body.innerText')), '三張卡下面那行滑動提示又出現了（業主要求隱藏）');
  // ---- 成語不得被名稱替換改壞 ----
  const bodyText = await evalJs('document.body.innerText');
  await evalJs(`document.querySelectorAll('[data-asura-detail]').forEach(d => { d.open = true; })`); await sleep(300);
  const opened = await evalJs('document.body.innerText');
  ok(!/兵不赤/.test(bodyText + opened), '成語「兵不血刃」被改壞');
  await evalJs(`document.querySelectorAll('[data-asura-detail]').forEach(d => { d.open = false; })`); await sleep(300);

  // ---- 真實點擊：每張卡打開、再收起，各兩輪 ----
  const total = await evalJs(`document.querySelectorAll('[data-asura-detail]').length`);
  ok(total >= 3, `印記卡太少：${total}`);
  const stateOf = (i) => evalJs(`document.querySelectorAll('[data-asura-detail]')[${i}].open`);
  const sample = [0, 1, Math.floor(total / 2), total - 1];
  for (const i of sample) {
    for (let round = 1; round <= 2; round += 1) {
      let p = await centerOf('[data-asura-detail] > summary', i);
      await realClickAt(p.x, p.y); await sleep(700);
      ok((await stateOf(i)) === true, `第 ${i} 張卡真實點擊打不開（第 ${round} 輪）`);
      p = await centerOf('[data-asura-detail] > summary', i);
      await realClickAt(p.x, p.y); await sleep(700);
      ok((await stateOf(i)) === false, `第 ${i} 張卡打開後真實點擊收不回（第 ${round} 輪）；點擊落點：${JSON.stringify(p)}`);
    }
  }
  // 同欄一次只開一張（f3594fc，<details name="asura-col-…">）；不同欄可同時打開、各自能收
  const names = await evalJs(`[...document.querySelectorAll('[data-asura-detail]')].map(d => d.getAttribute('name') || '')`);
  const clickDetail = async (i) => { const p = await centerOf('[data-asura-detail] > summary', i); await realClickAt(p.x, p.y); await sleep(500); };
  const a = 0;
  const b = names.findIndex((n) => n !== names[a]);
  ok(b > 0, `找不到不同欄的印記卡（欄名：${[...new Set(names)].join(',')}）`);
  for (const i of [a, b]) await clickDetail(i);
  ok((await stateOf(a)) === true && (await stateOf(b)) === true, '不同欄的兩張卡應可同時打開');
  for (const i of [b, a]) await clickDetail(i);
  ok((await stateOf(a)) === false && (await stateOf(b)) === false, '同時打開的兩張卡應各自能收');
  const c = names.findIndex((n, i) => i !== a && n === names[a] && n !== '');
  if (c > 0) {
    await clickDetail(a); await clickDetail(c);
    ok((await stateOf(c)) === true && (await stateOf(a)) === false, '同欄打開第二張時，第一張應自動收起');
    await clickDetail(c);
    ok((await stateOf(c)) === false, '同欄第二張應能收起');
  }

  ok(exceptions.length === 0, `頁面有執行期錯誤：${exceptions.join(' | ').slice(0, 300)}`);
  console.log(`ghost-asura-card-clicks e2e: ${checks} checks passed（真實 Edge、真實滑鼠點擊、測試登入；印記卡 ${total} 張，抽測 ${sample.length} 張×2 輪）`);
  await cleanup();
  process.exit(0);
} catch (error) {
  console.error('FAIL', error);
  await cleanup();
  process.exit(1);
}
