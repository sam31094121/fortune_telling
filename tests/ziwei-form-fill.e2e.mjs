#!/usr/bin/env node
/**
 * 紫微斗數表單手機實填健檢
 *
 * 路由回 200 不代表客戶填得進去。2026-09-15 正式站手機上，紫微頁的生日欄
 * 被父層用 birthDate 當 key：日期一湊齊（例如日期打「25」的那個「2」）
 * 整個元件就重掛，焦點跑到 body、手機鍵盤收掉，後面打的字全部消失——
 * 但健檢只看 HTTP，照樣綠燈。
 *
 * 這一支用真的 Chrome、手機寬度、逐鍵按鍵走完整張表：
 * 每按一鍵都確認焦點還在原欄位，最後送出並核對三柱。
 * 只用合成資料，選「親朋好友（只做本次分析）」，不寫入成長中心。
 *
 *   npm run test:ziwei-form-fill
 *   SCREEN_HEALTH_BASE_URL=https://正式站 npm run test:ziwei-form-fill
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const PROJECT_ROOT = process.cwd();
const BASE_URL = (process.env.SCREEN_HEALTH_BASE_URL || 'http://localhost:8888').replace(/\/$/, '');
const STEP_TIMEOUT_MS = 20000;
const PAGE_TIMEOUT_MS = 60000;

// 合成生日：1974-07-28 在小暑(7/7)之後、立秋之前 → 甲寅年、辛未月（同 tests/bazi-core 對照組）
const SYNTHETIC = { name: '健檢測試', rocYear: '63', month: '07', dayFirst: '25', dayFixed: '8' };
const EXPECTED_SOLAR = '1974-07-28';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const FORM = '#input-form';
const byText = (selector, text) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((el) => el.textContent.includes(${JSON.stringify(text)}))`;
const LOCATORS = {
  friend: byText(`${FORM} button`, '親朋好友'),
  name: `document.getElementById('ziwei-name-input')`,
  year: `document.querySelector('${FORM} input[aria-label="民國年"]')`,
  month: `document.querySelector('${FORM} input[aria-label="月份"]')`,
  day: `document.querySelector('${FORM} input[aria-label="日期"]')`,
  female: byText(`${FORM} button`, '女性'),
  unknownHour: byText(`${FORM} button`, '不知道出生時辰'),
  submit: byText(`${FORM} button`, '開始紫微斗數分析'),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function listTsx(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listTsx(full));
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** 不必開瀏覽器就能擋的：任何頁面都不得再用生日值當 LunarBirthdayInput 的 key。 */
function assertNoBirthDateKey() {
  const offenders = [];
  for (const dir of ['app', 'components']) {
    for (const file of listTsx(path.join(PROJECT_ROOT, dir))) {
      const tags = readFileSync(file, 'utf8').match(/<LunarBirthdayInput\b[\s\S]*?\/>/g) ?? [];
      // 只擋生日「值」當 key；像姓名學的 birthInputVersion 是重設用的版本號，不會隨輸入變動。
      if (tags.some((tag) => /\bkey=\{[^}]*birth(Date|day)\b/i.test(tag))) offenders.push(path.relative(PROJECT_ROOT, file));
    }
  }
  if (offenders.length) throw new Error(`用生日值當 key 會讓欄位在輸入中重掛：${offenders.join('、')}`);
}

function findChrome() {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('找不到 Chrome，無法做實填檢查（可用 CHROME_PATH 指定）');
  return found;
}

function launchChrome(chromePath, userDataDir) {
  const child = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });

  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Chrome 啟動逾時')), STEP_TIMEOUT_MS);
    child.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffer);
      if (match) {
        clearTimeout(timer);
        resolve({ child, browserWsUrl: match[1] });
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome 提前結束（${code}）`));
    });
  });
}

function connectCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Set();
    let nextId = 0;
    ws.onerror = () => reject(new Error(`CDP 連線失敗：${wsUrl}`));
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      } else if (msg.method) {
        for (const listener of listeners) listener(msg);
      }
    };
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => {
        const id = ++nextId;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      on: (listener) => listeners.add(listener),
      close: () => ws.close(),
    });
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitFor(cdp, expression, label, timeoutMs = STEP_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await evaluate(cdp, expression);
      if (value) return value;
    } catch {
      // 頁面換頁中，下一輪再問
    }
    await sleep(200);
  }
  throw new Error(`等不到：${label}`);
}

/** 用座標點擊，不用 el.click()——被透明圖層蓋住時客戶點不到，這裡也要點不到。 */
async function tap(cdp, locator, label) {
  await waitFor(cdp, `Boolean(${locator})`, label);
  // 按鈕外層有 overflow:hidden，scrollIntoView 會去捲那一層而不是整個視窗，頁尾的按鈕捲不到；
  // 客戶是用手指捲整頁，所以直接把 window 捲到按鈕置中，再等位置穩定才量座標。
  // 結果出現時頁面會自己捲到結果區，可能把剛捲好的位置又帶走，所以每一輪都重新捲一次。
  await waitFor(cdp, `(async () => {
    const el = ${locator};
    const r0 = el.getBoundingClientRect();
    if (r0.top < 0 || r0.bottom > innerHeight) window.scrollTo({ top: scrollY + r0.top - innerHeight / 2, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 150));
    const a = el.getBoundingClientRect().top;
    await new Promise((r) => setTimeout(r, 150));
    const b = el.getBoundingClientRect().top;
    // 客戶看得到、點得到才算：結果區在驗證動畫播完前是 opacity-0＋pointer-events-none，
    // 那時文字已經在 DOM 裡，但客戶根本看不到。
    let opacity = 1;
    for (let cur = el; cur; cur = cur.parentElement) opacity *= Number(getComputedStyle(cur).opacity);
    const tappable = getComputedStyle(el).pointerEvents !== 'none' && opacity > 0.5;
    return tappable && Math.abs(a - b) < 1 && b >= 0 && b < innerHeight;
  })()`, `「${label}」出現在畫面內且可點`, PAGE_TIMEOUT_MS);
  // 老師內容載入時版面還會移動；連續 3 秒都點不到才算真的被蓋住。
  let point = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (attempt) await sleep(300);
    point = await evaluate(cdp, `(() => {
      const el = ${locator};
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      const name = (node) => node.tagName + '.' + String(node.className).slice(0, 40);
      let skippedAncestor = null;
      for (let cur = el.parentElement; cur; cur = cur.parentElement) {
        if (getComputedStyle(cur).contentVisibility === 'auto') { skippedAncestor = name(cur); break; }
      }
      return {
        x, y,
        covered: !(hit && (hit === el || el.contains(hit))),
        hit: hit ? name(hit) : null,
        stack: document.elementsFromPoint(x, y).slice(0, 4).map(name),
        visibleWithCv: typeof el.checkVisibility === 'function' ? el.checkVisibility({ contentVisibilityAuto: true }) : 'n/a',
        cvAutoAncestor: skippedAncestor,
        viewport: innerWidth + 'x' + innerHeight,
      };
    })()`);
    if (!point.covered) break;
  }
  if (point.covered) throw new Error(`「${label}」被其他元素蓋住，客戶點不到：${point.hit}（座標 ${Math.round(point.x)},${Math.round(point.y)}／視窗 ${point.viewport}／疊層 ${point.stack.join(' > ')}／content-visibility 可見：${point.visibleWithCv}／auto 祖先：${point.cvAutoAncestor}）`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
  }
  await sleep(150);
}

async function pressKey(cdp, key) {
  const isBackspace = key === 'Backspace';
  const base = isBackspace
    ? { key, code: 'Backspace', windowsVirtualKeyCode: 8 }
    : { key, code: `Digit${key}`, windowsVirtualKeyCode: key.charCodeAt(0), text: key };
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base, text: undefined });
  await sleep(120);
}

/** 逐鍵輸入，每一鍵之後焦點都必須還在同一格——這正是這次出事的地方。 */
async function typeDigits(cdp, locator, label, keys) {
  for (const key of keys) {
    await pressKey(cdp, key);
    const focused = await evaluate(cdp, `document.activeElement === (${locator})`);
    if (!focused) {
      const active = await evaluate(cdp, `document.activeElement ? document.activeElement.tagName + ' ' + (document.activeElement.getAttribute('aria-label') || document.activeElement.id || '') : 'null'`);
      throw new Error(`「${label}」按下「${key}」後焦點跑掉（現在在 ${active}），手機鍵盤會被收掉、後面打的字消失`);
    }
  }
}

// 客戶畫面不該出現的內部用語（米其林審查 2026-09-15）。折疊全部打開後比對整頁可見文字。
const INTERNAL_WORDS = ['TEACHER TAROT', 'ZI WEI TIME CHECK', '老師專用', '規則模型', '後端', '前端', '讓客戶', '結構能量指數', '統計面最強', '星曜密度', 'ZW-SF-', 'RESOURCE_EXHAUSTED', 'spending cap'];

async function assertNoInternalWords(cdp) {
  const found = await evaluate(cdp, `(() => {
    document.querySelectorAll('details').forEach((d) => { d.open = true; });
    const text = document.querySelector('main')?.innerText ?? document.body.innerText;
    const hits = ${JSON.stringify(INTERNAL_WORDS)}.filter((word) => text.includes(word)).map((word) => {
      const i = text.indexOf(word);
      return word + '：「' + text.slice(Math.max(0, i - 18), i + word.length + 18).replace(/\\s+/g, ' ') + '」';
    });
    // 原始碼的 \\\\uXXXX 沒被當成字串解碼時，客戶會直接看到一串代碼（2026-09-15 塔羅區標題出過）。
    const raw = /\\\\u[0-9a-fA-F]{4}/.exec(text);
    if (raw) hits.push('未解碼的字元代碼：「' + text.slice(Math.max(0, raw.index - 10), raw.index + 30) + '」');
    return hits;
  })()`);
  if (found.length) throw new Error(`畫面出現內部用語：${found.join('；')}`);
}

async function runFlow(cdp, exceptions) {
  const steps = [];
  const step = async (title, fn) => {
    const startedAt = Date.now();
    try {
      await fn();
      steps.push({ title, ok: true, ms: Date.now() - startedAt });
    } catch (error) {
      steps.push({ title, ok: false, ms: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };

  try {
    await step('靜態：生日欄不得用生日值當 key', async () => assertNoBirthDateKey());

    await step(`手機寬度開啟 ${BASE_URL}/insight`, async () => {
      await cdp.send('Page.navigate', { url: `${BASE_URL}/insight` });
      await waitFor(cdp, `document.readyState === 'complete' && Boolean(${LOCATORS.friend})`, '紫微表單出現', PAGE_TIMEOUT_MS);
    });

    await step('點「親朋好友」（只做本次分析，不寫入）', async () => {
      await tap(cdp, LOCATORS.friend, '親朋好友');
      await sleep(800); // 選完會平滑捲到姓名欄
    });

    await step('輸入姓名', async () => {
      await tap(cdp, LOCATORS.name, '姓名');
      await cdp.send('Input.insertText', { text: SYNTHETIC.name });
      await waitFor(cdp, `${LOCATORS.name}.value === ${JSON.stringify(SYNTHETIC.name)}`, '姓名寫入');
    });

    await step('民國年逐鍵輸入，焦點不跑', async () => {
      await tap(cdp, LOCATORS.year, '民國年');
      await typeDigits(cdp, LOCATORS.year, '民國年', [...SYNTHETIC.rocYear]);
    });

    await step('月份逐鍵輸入，焦點不跑', async () => {
      await tap(cdp, LOCATORS.month, '月份');
      await typeDigits(cdp, LOCATORS.month, '月份', [...SYNTHETIC.month]);
    });

    await step('日期打「25」：打到「2」日期就湊齊，焦點仍不得跑', async () => {
      await tap(cdp, LOCATORS.day, '日期');
      await typeDigits(cdp, LOCATORS.day, '日期', [...SYNTHETIC.dayFirst]);
      await waitFor(cdp, `${LOCATORS.day}.value === ${JSON.stringify(SYNTHETIC.dayFirst)}`, '日期欄是 25');
    });

    await step('填完後改日期（退格改成 28），焦點仍不得跑', async () => {
      await typeDigits(cdp, LOCATORS.day, '日期', ['Backspace', SYNTHETIC.dayFixed]);
      await waitFor(
        cdp,
        `[...document.querySelectorAll('${FORM} p')].some((p) => p.textContent.includes('已確認西元 ${EXPECTED_SOLAR}'))`,
        `生日確認為西元 ${EXPECTED_SOLAR}`,
      );
    });

    await step('點性別「女性」', async () => {
      await tap(cdp, LOCATORS.female, '女性');
      await waitFor(cdp, `${LOCATORS.female}.getAttribute('aria-pressed') === 'true'`, '女性已選');
    });

    await step('點「不知道出生時辰」', async () => {
      await tap(cdp, LOCATORS.unknownHour, '不知道出生時辰');
    });

    await step('送出後出現三柱：甲寅年、辛未月、時柱待補', async () => {
      await tap(cdp, LOCATORS.submit, '開始紫微斗數分析');
      const text = await waitFor(
        cdp,
        `(() => { const t = document.querySelector('main')?.innerText ?? ''; return t.includes('年柱') && t.includes('時柱') ? t : ''; })()`,
        '分析結果出現',
        PAGE_TIMEOUT_MS,
      );
      const missing = ['甲寅', '辛未', '待補'].filter((word) => !text.includes(word));
      if (missing.length) throw new Error(`結果缺少：${missing.join('、')}`);
    });

    await step('客戶看得到的字沒有內部用語（不知道時辰）', async () => assertNoInternalWords(cdp));

    await step('重新分析，改選寅時，出現易經老師解盤', async () => {
      // 頁面上可能有隱藏的同名按鈕；客戶點的是看得到的那一顆。
      await tap(cdp, `[...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.textContent.includes('重新分析')).pop()`, '重新分析');
      await tap(cdp, LOCATORS.female, '女性');
      await tap(cdp, byText(`${FORM} button`, '我知道出生時辰'), '我知道出生時辰');
      await tap(cdp, byText(`${FORM} button[aria-pressed]`, '寅時'), '寅時');
      await tap(cdp, LOCATORS.submit, '開始紫微斗數分析');
      await waitFor(cdp, `document.body.innerText.includes('易經老師解盤｜')`, '易經老師解盤出現', PAGE_TIMEOUT_MS);
    });

    await step('命宮塔羅牌是後端選好送來的', async () => {
      await waitFor(cdp, `Boolean(document.querySelector('img[alt^="命宮塔羅 "]'))`, '命宮塔羅牌圖片');
    });

    await step('客戶看得到的字沒有內部用語（有時辰）', async () => assertNoInternalWords(cdp));

    await step('鬼魅老師：年齡由後端送來', async () => {
      await tap(cdp, `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('鬼魅老師解盤') && b.textContent.includes('恐怖'))`, '鬼魅老師解盤');
      const text = await waitFor(cdp, `(() => { const t = document.body.innerText; return t.includes('第三幕') ? t : ''; })()`, '鬼魅老師劇情出現', PAGE_TIMEOUT_MS);
      if (!/你現在 \d+ 歲/.test(text)) throw new Error('鬼魅老師沒有顯示後端送來的年齡');
      await assertNoInternalWords(cdp);
    });

    await step('全程無未捕捉的前端錯誤', async () => {
      if (exceptions.length) throw new Error(exceptions.slice(0, 3).join('\n'));
    });
  } catch {
    // 前一步失敗，後面的步驟沒有意義；失敗內容已記在 steps
  }
  return steps;
}

async function main() {
  console.log('\n紫微表單手機實填健檢');
  console.log(`目標：${BASE_URL}/insight`);

  let chrome;
  let browser;
  let steps = [];
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'ziwei-form-fill-'));

  try {
    const launched = await launchChrome(findChrome(), userDataDir);
    chrome = launched.child;
    browser = await connectCdp(launched.browserWsUrl);

    const httpBase = launched.browserWsUrl.replace(/^ws:\/\//, 'http://').replace(/\/devtools\/.*$/, '');
    const targets = await (await fetch(`${httpBase}/json/list`)).json();
    const pageTarget = targets.find((target) => target.type === 'page');
    if (!pageTarget) throw new Error('Chrome 沒有可用的分頁');

    const cdp = await connectCdp(pageTarget.webSocketDebuggerUrl);
    const exceptions = [];
    cdp.on((msg) => {
      if (msg.method === 'Runtime.exceptionThrown') {
        const details = msg.params.exceptionDetails;
        exceptions.push(details.exception?.description ?? details.text);
      }
    });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cdp.send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });

    steps = await runFlow(cdp, exceptions);
    cdp.close();
  } catch (error) {
    steps.push({ title: '啟動檢查環境', ok: false, ms: 0, error: error instanceof Error ? error.message : String(error) });
  } finally {
    try { await browser?.send('Browser.close'); } catch { /* 已關閉 */ }
    browser?.close();
    chrome?.kill();
    await sleep(500);
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch { /* Windows 偶爾還鎖著，留給系統暫存清理 */ }
  }

  for (const s of steps) {
    console.log(`${s.ok ? 'PASS' : 'FAIL'} ${s.title} (${s.ms}ms)${s.ok ? '' : `\n     → ${s.error}`}`);
  }
  const failed = steps.filter((s) => !s.ok).length;
  const complete = failed === 0 && steps.length > 0 && steps.at(-1).title.startsWith('全程');
  console.log(`PASS ${steps.length - failed} / FAIL ${failed}`);
  console.log(`ZIWEI_FORM_FILL_CERTIFIED=${complete}`);
  process.exit(complete ? 0 : 1);
}

main();
