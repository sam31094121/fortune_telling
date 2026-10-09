// 鬼魅阿修羅｜本性卡頁面測試（需 dev server 在 8888、本機 Edge）：node tests/ghost-asura-nature-page.test.mjs
// /ghost-asura，390×844：
//   有名字 → 本性卡（名牌）在橫幅下、過去／現在／未來三格上；收合兩行（姓名＋看見你的本性）；點開四段 本性／優勢／弱點／風險；
//            卡內文字＝API nature；點三格任一，面板最上為故事線；本性卡＋三格面板 HTML（含屬性）零術語。
//   沒名字 → 不顯示本性卡。整頁 body 的術語命中只列出位置（卡外既有文案，不在本測試斷言範圍）。
// 設 ASURA_SHOT_DIR 時存截圖 v17-nature-<tag>-closed.png／-open.png／-story.png。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
const tl = load('lib/server/ghost-asura-translation-layer.ts');
const TERMS = tl.ASURA_CARD_FORBIDDEN_TERMS;
const BASE = process.env.ASURA_BASE ?? 'http://localhost:8888';
const SHOTS = process.env.ASURA_SHOT_DIR || null;
const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => existsSync(p));
assert(EDGE, 'Edge not found');
const ALL_CASES = [
  { tag: '0030', name: '曾鈺勝', y: '57', m: '9', d: '2', g: '女性', h: '子', zi: '00:30', date: '1968-09-02', time: '00:30' },
  { tag: '2330', name: '曾鈺勝', y: '57', m: '9', d: '1', g: '女性', h: '子', zi: '23:30', date: '1968-09-01', time: '23:30' },
  { tag: '1974', name: '測試者', y: '63', m: '7', d: '2', g: '男性', h: '寅', zi: null, date: '1974-07-02', time: '03:30' },
  // 13:23 使用者新測試盤：曾威艷 1974-06-28 男 酉時（18:00）
  { tag: 'wei-1974-1800', name: '曾威艷', y: '63', m: '6', d: '28', g: '男性', h: '酉', zi: null, date: '1974-06-28', time: '18:00' },
  { tag: 'noname', name: '', y: '57', m: '9', d: '2', g: '女性', h: '子', zi: '00:30', date: '1968-09-02', time: '00:30' },
];
// ASURA_CASES=tag1,tag2 只跑指定案例（預設全跑）
const CASES = process.env.ASURA_CASES ? ALL_CASES.filter((c) => process.env.ASURA_CASES.split(',').includes(c.tag)) : ALL_CASES;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withPage(fn) {
  const PORT = 9300 + Math.floor(Math.random() * 80);
  const profile = mkdtempSync(path.join(os.tmpdir(), 'asura-nature-edge-'));
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 40 && !target; i++) { await sleep(500); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
  if (!target) { edge.kill(); throw new Error('no CDP target'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map(); const exceptions = []; const responses = [];
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === 'Network.responseReceived' && m.params.response.url.includes('/api/ghost-asura/reading')) responses.push(m.params.requestId); });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
  const waitFor = async (expr, ms = 90000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await evalJs(expr)) return; await sleep(300); } throw new Error('timeout: ' + expr); };
  const shot = async (name, clipSel) => {
    if (!SHOTS) return;
    let params = { format: 'png' };
    if (clipSel) { const b = await evalJs(`(() => { const a = document.querySelector(${JSON.stringify(clipSel[0])}).getBoundingClientRect(); const z = document.querySelector(${JSON.stringify(clipSel[1])}).getBoundingClientRect(); return { y: Math.round(a.top + scrollY - 12), h: Math.round(z.bottom - a.top + 24) }; })()`); params = { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: b.y, width: 390, height: Math.min(b.h, 3200), scale: 1 } }; }
    const r = await send('Page.captureScreenshot', params); writeFileSync(path.join(SHOTS, name), Buffer.from(r.result.data, 'base64'));
  };
  try {
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    return await fn({ send, evalJs, waitFor, shot, exceptions, responses });
  } finally { ws.close(); edge.kill(); }
}

const clickText = (txt) => `(() => { const el = [...document.querySelectorAll('button')].find(e => e.textContent.trim().startsWith(${JSON.stringify(txt)})); if (!el) return false; el.click(); return true; })()`;
const typeInto = (pred, v) => `(() => { const el = [...document.querySelectorAll('input')].find(e => ${pred}); if (!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
const scanIn = (sel) => `(() => { const T = ${JSON.stringify(TERMS)}; const h = [...document.querySelectorAll(${JSON.stringify(sel)})].map(e => e.outerHTML).join(''); return T.filter(t => h.includes(t)); })()`;
const bodyHits = `(() => { const T = ['八字','紫微','易經','旺']; const out = []; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  const where = (el) => { const p = []; for (let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) p.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ([...e.attributes].filter(a => a.name.startsWith('data-')).map(a => '[' + a.name + ']').join(''))); return p.join(' > '); };
  for (let n = walker.currentNode; n; n = walker.nextNode()) {
    if (n.nodeType === 3) { for (const t of T) if (n.textContent.includes(t)) out.push({ term: t, kind: 'text', where: where(n.parentElement), snippet: n.textContent.trim().slice(0, 60) }); }
    else if (n.tagName !== 'SCRIPT') { for (const a of n.attributes) for (const t of T) if (a.value.includes(t)) out.push({ term: t, kind: 'attr:' + a.name, where: where(n), snippet: a.value.slice(0, 60) }); }
  } return out; })()`;

const report = {};
let failed = false;
for (const c of CASES) {
  try {
    report[c.tag] = await withPage(async ({ evalJs, waitFor, shot, exceptions }) => {
      const out = {};
      await (async () => { const r = await evalJs(`location.href = ${JSON.stringify(BASE + '/ghost-asura')}`); return r; })();
      await waitFor(`document.readyState === 'complete' && !!document.querySelector('button[type=submit]')`); await sleep(2500);
      await evalJs(clickText('我自己')); await sleep(300);
      if (c.name) { await evalJs(typeInto(`e.placeholder && e.placeholder.includes('名字')`, c.name)); await sleep(300); }
      await evalJs(clickText('國曆生日')); await sleep(300);
      await evalJs(typeInto(`e.getAttribute('aria-label') === '民國年'`, c.y)); await evalJs(typeInto(`e.getAttribute('aria-label') === '月份'`, c.m)); await evalJs(typeInto(`e.getAttribute('aria-label') === '日期'`, c.d)); await sleep(200);
      await evalJs(clickText(c.g)); await sleep(300);
      await evalJs(clickText('我知道出生時辰')); await sleep(800);
      assert(await evalJs(clickText(c.h)), 'hour card');
      await sleep(800);
      if (c.zi) await evalJs(`(() => { const s = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === '00:30')); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, ${JSON.stringify(c.zi)}); s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await sleep(500);
      await evalJs(`document.querySelector('button[type=submit]').click()`);
      await waitFor(`!!document.querySelector('[data-asura-top-row] [data-asura-tile]:not([disabled])')`);
      await sleep(3500);
      const api = await evalJs(`fetch('/api/ghost-asura/reading', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.19.' + ${CASES.indexOf(c)} + '.' + Date.now() % 250 }, body: JSON.stringify({ birthDate: ${JSON.stringify(c.date)}, birthTime: ${JSON.stringify(c.time)}, gender: ${JSON.stringify(c.g === '男性' ? 'male' : 'female')}, calendarType: 'solar', timezone: 'Asia/Taipei', name: ${JSON.stringify(c.name)} }) }).then(r => r.json()).then(j => j.data)`);
      out.apiNature = api?.nature ?? null;
      out.apiStory = Object.fromEntries((api?.sections ?? []).map((s) => [s.key, s.story ?? null]));
      out.card = await evalJs(`(() => { const n = document.querySelector('[data-asura-nature-card]'); const t = document.querySelector('[data-asura-tile]'); const b = document.querySelector('[data-asura-banner]'); if (!n) return null; const nb = n.getBoundingClientRect(), tb = t.getBoundingClientRect(), bb = b.getBoundingClientRect();
        return { w: Math.round(nb.width), h: Math.round(nb.height), above: nb.bottom <= tb.top, belowBanner: nb.top >= bb.bottom - 1, docOverflow: document.documentElement.scrollWidth > 390, lines: n.querySelector('[data-asura-nature-toggle]').innerText.split('\\n').filter(Boolean) }; })()`);
      out.bodyHits = await evalJs(bodyHits);
      if (!c.name) { assert.equal(out.card, null, 'no name → no card'); return out; }
      assert(out.card && out.card.above && out.card.belowBanner && !out.card.docOverflow && out.card.w <= 390, 'card position');
      assert(out.card.lines.includes(c.name) && out.card.lines.includes('看見你的本性'), 'collapsed two lines');
      await evalJs(`(() => { const n = document.querySelector('[data-asura-banner]'); window.scrollTo(0, n.getBoundingClientRect().top + scrollY - 16); })()`); await sleep(1200);
      await shot(`v17-nature-${c.tag}-closed.png`);
      await evalJs(`document.querySelector('[data-asura-nature-toggle]').click()`); await sleep(900);
      out.slots = await evalJs(`Object.fromEntries([...document.querySelectorAll('[data-asura-nature-slot]')].map(s => [s.dataset.asuraNatureSlot, s.querySelector('p')?.textContent ?? null]))`);
      for (const k of ['essence', 'strength', 'weakness', 'risk']) assert.equal(out.slots[k] ?? null, out.apiNature?.[k] || null, `slot ${k} = API`);
      assert.equal(await evalJs(`document.querySelector('[data-asura-nature-toggle]').getAttribute('aria-expanded')`), 'true');
      await shot(`v17-nature-${c.tag}-open.png`, ['[data-asura-nature-card]', '[data-asura-tile]']);
      await evalJs(`document.querySelector('[data-asura-nature-toggle]').click()`); await sleep(500);
      out.panels = {};
      for (const key of ['hits', 'pillars', 'verdict']) {
        await evalJs(`document.querySelector('[data-asura-tile="${key}"]').click()`); await sleep(800);
        out.panels[key] = await evalJs(`document.querySelector('[data-asura-story="${key}"]')?.textContent ?? null`);
        assert.equal(out.panels[key], out.apiStory[key], `story ${key} = API`);
        out[`terms_${key}`] = await evalJs(scanIn(`[data-asura-function="${key}"]`));
        assert.deepEqual(out[`terms_${key}`], [], `panel ${key} terms`);
        if (key === 'pillars') await shot(`v17-nature-${c.tag}-story.png`, ['[data-asura-nature-card]', `[data-asura-function="${key}"]`]);
        await evalJs(`document.querySelector('[data-asura-tile="${key}"]').click()`); await sleep(400);
      }
      out.cardTerms = await evalJs(scanIn('[data-asura-nature-card]'));
      assert.deepEqual(out.cardTerms, [], 'nature card terms');
      out.exceptions = exceptions;
      assert.deepEqual(exceptions, [], 'no runtime exceptions');
      return out;
    });
    console.log(`PASS ${report[c.tag] ? c.tag : c.tag}`);
  } catch (e) { failed = true; report[c.tag] = { error: String(e) }; console.log(`FAIL ${c.tag}: ${e}`); }
}
if (SHOTS) writeFileSync(path.join(SHOTS, 'v17-nature-page-report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
if (failed) process.exit(1);
console.log('ghost-asura-nature-page: PASS');
