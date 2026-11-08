const { spawn } = require('child_process');
const { existsSync, mkdirSync, writeFileSync, mkdtempSync } = require('fs');
const path = require('path');
const os = require('os');
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => existsSync(p));
if (!EDGE) { console.error('no browser'); process.exit(2); }
const label = process.argv[2] || 'before';
const OUT = 'C:\\tmp\\asura-entrance-shots';
const XFER = 'C:\\Users\\DRAGON\\bead-card-xfer\\ghost-asura-48\\final5';
mkdirSync(OUT, { recursive: true });
mkdirSync(XFER, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9760 + Math.floor(Math.random() * 30);
const profile = mkdtempSync(path.join(os.tmpdir(), 'asura-ent-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--window-size=390,900', 'about:blank'], { stdio: 'ignore' });
(async () => {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(400);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  if (!target) throw new Error('no cdp target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,400)); return r.result?.result?.value; };
  const waitFor = async (expr, ms = 120000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await evalJs(expr)) return; await sleep(400); } throw new Error('timeout '+expr); };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:8888/ghost-asura' });
  await waitFor(`document.readyState === 'complete' && !!document.querySelector('button')`);
  await sleep(1200);
  await evalJs(`(() => { const el = [...document.querySelectorAll('button')].find(e => (e.textContent||'').trim().startsWith('我自己')); if(el) el.click(); return !!el; })()`);
  await sleep(300);
  await evalJs(`(() => { const labels=['民國年','月份','日期']; const values=['63','6','28']; for (let i=0;i<3;i++){ const el=document.querySelector('main[data-page="ghost-asura"] [data-field="birthDate"] input[aria-label="'+labels[i]+'"]') || document.querySelector('[data-field="birthDate"] input[aria-label="'+labels[i]+'"]'); if(!el) continue; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,values[i]); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.blur(); } return true; })()`);
  await sleep(700);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').trim().startsWith('男性')); if(el) el.click(); return !!el; })()`);
  await sleep(250);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').includes('我知道出生時辰')); if(el) el.click(); return !!el; })()`);
  await sleep(700);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].filter(e=>/^\\s*酉時/.test((e.textContent||'').trim())).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0]; if(el){el.click(); return true;} return false; })()`);
  await sleep(500);
  await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').includes('開啟命魂戰局')); if(b) b.click(); return !!b; })()`);
  await waitFor(`!!document.querySelector('[data-asura-timeline-decree], [data-asura-age-here], [data-asura-age-viewer]')`);
  await sleep(2800); // settle past entrance (~3s)
  // Prefer age guide area (here + viewer) then decree
  await evalJs(`(() => {
    const a = document.querySelector('[data-asura-age-here]') || document.querySelector('[data-asura-timeline-decree]');
    if (a) a.scrollIntoView({ block: 'start', behavior: 'instant' });
    return !!a;
  })()`);
  await sleep(350);
  const metrics = await evalJs(`(() => {
    const root = document.querySelector('[data-asura-age-here]')?.closest('[class]') || document.body;
    const decree = document.querySelector('[data-asura-timeline-decree]');
    const here = document.querySelector('[data-asura-age-here]');
    const viewer = document.querySelector('[data-asura-age-viewer], [data-asura-decree-viewer]');
    const ox = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const bodyOx = document.body.scrollWidth > document.body.clientWidth + 1;
    const decreeOx = decree ? decree.scrollWidth > decree.clientWidth + 1 : null;
    return {
      overflowX: ox || bodyOx,
      decreeOverflowX: decreeOx,
      clientW: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth,
      hasHere: !!here,
      hasViewer: !!viewer,
      viewerText: viewer ? (viewer.textContent||'').trim().slice(0,80) : null,
      hereText: here ? (here.textContent||'').trim().slice(0,80) : null,
      decreePresent: !!decree,
      markCurrent: [...document.querySelectorAll('[data-mark]')].map(e => e.getAttribute('data-mark')).filter(Boolean).slice(0,8),
    };
  })()`);
  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const buf = Buffer.from(shot.result.data, 'base64');
  const name = 'motion-390-' + label + '.png';
  writeFileSync(path.join(OUT, name), buf);
  writeFileSync(path.join(XFER, name), buf);
  writeFileSync(path.join(OUT, 'motion-390-' + label + '-metrics.json'), JSON.stringify(metrics, null, 2), 'utf8');
  writeFileSync(path.join(XFER, 'motion-390-' + label + '-metrics.json'), JSON.stringify(metrics, null, 2), 'utf8');
  console.log(JSON.stringify({ label, bytes: buf.length, metrics, out: path.join(OUT, name) }, null, 2));
  try { ws.close(); } catch {}
  try { edge.kill(); } catch {}
  process.exit(0);
})().catch((e) => { console.error(String(e && e.stack || e)); try { edge.kill(); } catch {}; process.exit(1); });
