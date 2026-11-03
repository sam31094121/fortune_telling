#!/usr/bin/env node
// Isolated real Chrome/mobile viewport; synthetic data only. Not physical-phone certification.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.env.SCREEN_HEALTH_BASE_URL || 'http://localhost:8888';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = mkdtempSync(path.join(os.tmpdir(), 'asura-conversation-qa-'));
const chromePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => p && existsSync(p));
assert(chromePath, 'Chrome required');
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let browser, page;
async function connect(url) {
  const ws = new WebSocket(url), pending = new Map(), handlers = []; let next = 0;
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => { const m = JSON.parse(event.data); if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } } else handlers.forEach(h => h(m)); };
  return { send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); }); }, on(h) { handlers.push(h); }, close() { ws.close(); } };
}
async function evaluate(expression) { const r = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; }
async function wait(expression, label) { const deadline = Date.now() + 60000; while (Date.now() < deadline) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); } throw new Error(`Timeout: ${label}; page: ${(await evaluate('document.body.innerText')).slice(-1800)}`); }
const panel = '[data-asura-conversation]';
function button(label) { return `[...document.querySelectorAll('${panel} button')].find(b=>b.textContent===${JSON.stringify(label)})`; }
// Respect the production ten-requests/minute budget even on localhost.
let lastRequestAt=0;
async function pace() { await sleep(Math.max(0,7000-(Date.now()-lastRequestAt))); lastRequestAt=Date.now(); }
async function tap(expression) {
  const p = await evaluate(`(() => { const e=${expression}; if(!e||e.disabled) throw Error('Button unavailable'); e.scrollIntoView({block:'center',behavior:'instant'}); const r=e.getBoundingClientRect(); const x=r.left+r.width/2,y=r.top+r.height/2,h=document.elementFromPoint(x,y); if(!h||!(e===h||e.contains(h))) throw Error('Button covered'); return {x,y}; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, ...p, button: 'left', clickCount: 1 });
}
async function setInput(name, value) { await evaluate(`(() => { const e=document.querySelector('[data-asura-skill-reading] input[name="${name}"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); })()`); await sleep(100); }
async function turn(label, expectedTopic, expectedIntent, expectedStep) {
  await pace();
  const prior = await evaluate('window.__conversationRequests.length');
  await tap(button(label));
  await wait(`window.__conversationRequests.length===${prior + 1} && !document.querySelector('${panel} button:disabled') && document.querySelector('${panel} ol li')`, label);
  assert.equal(await evaluate(`document.querySelector('${panel} [role="alert"]')?.textContent || ''`), '', label);
  const latest = await evaluate('window.__conversationResponses.at(-1)');
  assert(['READY', 'UNAVAILABLE'].includes(latest.status));
  assert.equal(await evaluate(`document.querySelector('${panel} ol li:last-child [data-asura-conversation-answer]').textContent`), latest.answer, 'UI uses exact backend answer');
  assert.equal(latest.topic, expectedTopic);
  assert.equal(latest.intent, expectedIntent);
  assert.equal(latest.step.number, expectedStep);
  assert.equal(latest.step.total, 3);
  assert.equal(await evaluate(`document.querySelector('${panel} ol li:last-child [data-asura-conversation-step]').getAttribute('data-asura-conversation-step')`),String(expectedStep));
  assert.equal(await evaluate(`document.querySelector('${panel} ol li:last-child [data-asura-conversation-scope]')?.textContent || ''`),latest.scopeNote);
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('${panel} button'),b=>b.textContent)`),latest.options.map(o=>o.label),'only server-provided choices');
  console.log(`PASS ${label}: ${latest.topic}/${latest.intent}/${latest.status}`);
  return latest;
}
try {
  const wsUrl = await new Promise((resolve, reject) => { let text = ''; const timer = setTimeout(() => reject(new Error('Chrome start timeout')), 20000); chrome.stderr.on('data', data => { text += data; const m = text.match(/DevTools listening on (ws:\/\/\S+)/); if(m) { clearTimeout(timer); resolve(m[1]); } }); });
  browser = await connect(wsUrl);
  const targets = await (await fetch(wsUrl.replace('ws://','http://').replace(/\/devtools\/.*/, '') + '/json/list')).json();
  page = await connect(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  const errors = []; page.on(m => { if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text); });
  await page.send('Page.enable'); await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 2, mobile: true });
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__conversationRequests=[];window.__conversationResponses=[];window.__conversationDelay=0;const originalFetch=window.fetch;window.fetch=async function(input,options){const conversation=String(input).includes('/api/ghost-asura/conversation');if(conversation)window.__conversationRequests.push(JSON.parse(options.body));const response=await originalFetch.call(this,input,options);if(String(input).includes('/api/ghost-asura/reading'))window.__readingDisplay=(await response.clone().json()).data;if(conversation){window.__conversationResponses.push(await response.clone().json());if(window.__conversationDelay)await new Promise(r=>setTimeout(r,window.__conversationDelay));}return response;};` });
  await page.send('Page.navigate', { url: base + '/ghost-asura/skill' });
  await wait(`Boolean(document.querySelector('[data-asura-skill-reading] input[name="birthDate"]'))`, 'birth form');
  console.log('PASS birth form loaded');
  await sleep(1000);
  await setInput('birthDate','1990-05-20'); await setInput('birthTime','14:00');
  await tap(`document.querySelector('[data-asura-skill-reading] input[value="male"]').closest('label')`);
  await page.send('Network.enable');
  await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await pace();
  await tap(`document.querySelector('[data-asura-skill-reading] button[type="submit"]')`);
  await wait(`document.querySelector('[data-asura-skill-reading] form [role="alert"]') && !document.querySelector('[data-asura-skill-reading] fieldset').disabled`,'initial offline reading fails and unlocks');
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await sleep(500);
  assert.equal(await evaluate(`Boolean(document.querySelector('${panel}'))`),false,'initial reconnect does not start reading');
  await pace();
  await tap(`document.querySelector('[data-asura-skill-reading] button[type="submit"]')`);
  await wait(`Boolean(document.querySelector('${panel}'))`, 'reading and conversation');
  assert.equal(await evaluate('window.__conversationRequests.length'), 0, 'conversation opt-in');
  console.log('PASS initial reading offline failure and manual retry after reconnect');
  for(const [topic,label] of [['present','看懂現在的解讀'],['past','看過去'],['future','看未來']]) {
    const first=await turn(label,topic,'summary',1);
    assert(first.options.some(o=>o.id==='intent:why'),'conclusion offers basis');
    assert(!first.options.some(o=>o.id==='intent:action'),'cannot skip basis');
    const basis=await turn('看依據',topic,'why',2);
    const display=await evaluate('window.__readingDisplay');
    const section=display.sections.find(s=>s.key===({past:'hits',present:'pillars',future:'verdict'})[topic]);
    assert(Array.isArray(basis.basis),'basis has explicit referenced entries');
    for(const entry of basis.basis) {
      assert(section.guidance.related.some(ref=>display.columns.some(col=>col.key===ref.columnKey && col.heading===entry.columnLabel && col.seals.some(seal=>seal.id===ref.id && seal.name===entry.name))),'basis matches actual reading reference and card');
      assert(basis.answer.includes(entry.name) && basis.answer.includes(entry.text),'basis answer preserves referenced content');
    }
    if(!basis.basis.length) assert.equal(basis.status,'UNAVAILABLE','missing references not fabricated');
    assert(basis.options.some(o=>o.id==='intent:action'),'basis offers action');
    const action=await turn('看行動提醒',topic,'action',3);
    assert(action.step.complete,'action completes round');
    assert(action.options.every(o=>o.id.startsWith('topic:')),'completed round only offers topic restart');
  }
  assert.equal(await evaluate(`document.querySelectorAll('${panel} ol li').length`), 6, 'bounded history');
  const size = await evaluate(`({viewport:innerWidth, page:document.documentElement.scrollWidth,panel:document.querySelector('${panel}').getBoundingClientRect().toJSON()})`);
  assert(size.page <= size.viewport + 1, `page overflow ${JSON.stringify(size)}`);
  assert(size.panel.left >= 0 && size.panel.right <= size.viewport + 1, 'panel fits 320px');
  console.log('PASS 320px page/panel no horizontal overflow; six-turn history');
  // Browser transport faults only: keep real backend content and require manual retry.
  await page.send('Network.enable');
  await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const beforeOffline=await evaluate('window.__conversationRequests.length');
  const beforeOfflineHistory=await evaluate(`document.querySelector('${panel} ol').innerText`);
  await pace();
  await tap(button('看現在'));
  await wait(`document.querySelector('${panel} [role="alert"]') && !document.querySelector('${panel} button:disabled')`,'offline error and controls restored');
  assert.equal(await evaluate('window.__conversationRequests.length'),beforeOffline+1);
  assert.equal(await evaluate(`document.querySelector('${panel} ol').innerText`),beforeOfflineHistory,'offline failure preserves prior reading');
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await sleep(700);
  assert.equal(await evaluate('window.__conversationRequests.length'),beforeOffline+1,'reconnect does not automatically retry');
  await turn('看現在','present','summary',1);
  console.log('PASS injected offline failure, reconnect without auto request, manual retry with real response');

  const beforeBackground=await evaluate('window.__conversationRequests.length');
  const backgroundHistory=await evaluate(`document.querySelector('${panel} ol').innerText`);
  await page.send('Page.setWebLifecycleState',{state:'frozen'});
  await sleep(500);
  await page.send('Page.setWebLifecycleState',{state:'active'});
  await sleep(500);
  assert.equal(await evaluate('window.__conversationRequests.length'),beforeBackground,'lifecycle return does not resend');
  assert.equal(await evaluate(`document.querySelector('${panel} ol').innerText`),backgroundHistory,'lifecycle return preserves history');
  console.log('PASS simulated browser freeze/return preserves history and sends no duplicate request');

  // A real response is deliberately held beyond the production 30-second deadline.
  await evaluate('window.__conversationDelay=35000');
  const beforeTimeout=await evaluate('window.__conversationRequests.length');
  await pace();
  const timeoutStarted=Date.now();
  await tap(button('看依據'));
  await wait(`document.querySelector('${panel} [role="alert"]') && !document.querySelector('${panel} button:disabled')`,'30-second timeout and controls restored');
  const elapsed=Date.now()-timeoutStarted;
  assert(elapsed>=28000 && elapsed<45000,`timeout duration ${elapsed}; error=${await evaluate(`document.querySelector('${panel} [role="alert"]')?.textContent`)}; response=${JSON.stringify(await evaluate('window.__conversationResponses.at(-1)')).slice(0,200)}`);
  assert.equal(await evaluate('window.__conversationRequests.length'),beforeTimeout+1,'timeout does not auto retry');
  await evaluate('window.__conversationDelay=0');
  await turn('看依據','present','why',2);
  const recoveredHistory=await evaluate(`document.querySelector('${panel} ol').innerText`);
  await sleep(Math.max(0,timeoutStarted+36500-Date.now()));
  assert.equal(await evaluate(`document.querySelector('${panel} ol').innerText`),recoveredHistory,'late timed-out response cannot overwrite successful retry');
  assert.equal(await evaluate('window.__conversationRequests.length'),beforeTimeout+2,'only explicit timeout retry sends request');
  console.log('PASS real 30-second timeout, manual retry, late response ignored');
  // Delay delivery of a real response, not its content; test abort/unmount while data is in flight.
  await evaluate('window.__conversationDelay=1000');
  await pace();
  const count = await evaluate('window.__conversationRequests.length');
  await evaluate(`(() => {const b=${button('看過去')};b.click();b.click();b.click();})()`);
  await sleep(100);
  assert.equal(await evaluate('window.__conversationRequests.length'),count+1,'rapid clicks deduplicated');
  await setInput('birthDate','1991-05-20');
  await wait(`!document.querySelector('${panel}')`, 'input change removes conversation');
  await sleep(1300);
  assert.equal(await evaluate(`Boolean(document.querySelector('${panel}'))`),false,'old response cannot restore conversation');
  assert.equal(await evaluate(`document.querySelector('[data-ghost-asura-result]').dataset.ghostAsuraResult`),'idle');
  assert.deepEqual(errors,[],'uncaught frontend errors');
  console.log('PASS rapid click deduplication, changed birth reset, stale response suppressed, no uncaught errors');
  console.log('PASS isolated Chrome mobile simulation; physical Android/iPhone not tested');
} finally {
  try { await Promise.race([browser?.send('Browser.close'), sleep(1000)]); } catch {}
  page?.close(); browser?.close(); chrome.kill(); await sleep(500);
  // Only delete this exact independently created temporary profile.
  if(path.dirname(path.resolve(profile))===path.resolve(os.tmpdir()) && path.basename(profile).startsWith('asura-conversation-qa-')) { try { rmSync(profile,{recursive:true,force:true}); } catch {} }
}
