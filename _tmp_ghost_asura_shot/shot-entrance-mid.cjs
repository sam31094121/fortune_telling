const { spawn } = require('child_process');
const { existsSync, mkdirSync, writeFileSync, mkdtempSync } = require('fs');
const path = require('path');
const os = require('os');
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => existsSync(p));
const OUT = 'C:\\Users\\DRAGON\\Desktop\\命理\\_tmp_ghost_asura_shot\\final5';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9800 + Math.floor(Math.random() * 20);
const profile = mkdtempSync(path.join(os.tmpdir(), 'asura-mid-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--window-size=390,900', 'about:blank'], { stdio: 'ignore' });
(async () => {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(400);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  }
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
  await sleep(1000);
  await evalJs(`(() => { const el = [...document.querySelectorAll('button')].find(e => (e.textContent||'').trim().startsWith('我自己')); if(el) el.click(); return !!el; })()`);
  await sleep(250);
  await evalJs(`(() => { const labels=['民國年','月份','日期']; const values=['63','6','28']; for (let i=0;i<3;i++){ const el=document.querySelector('[data-field="birthDate"] input[aria-label="'+labels[i]+'"]'); if(!el) continue; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,values[i]); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.blur(); } return true; })()`);
  await sleep(600);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').trim().startsWith('男性')); if(el) el.click(); return !!el; })()`);
  await sleep(200);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').includes('我知道出生時辰')); if(el) el.click(); return !!el; })()`);
  await sleep(600);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].filter(e=>/^\\s*酉時/.test((e.textContent||'').trim())).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0]; if(el){el.click(); return true;} return false; })()`);
  await sleep(400);
  await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').includes('開啟命魂戰局')); if(b) b.click(); return !!b; })()`);
  await waitFor(`!!document.querySelector('[data-asura-age-here]')`);
  await sleep(2500);
  await evalJs(`(() => { const a=document.querySelector('[data-asura-age-here]'); if(a) a.scrollIntoView({block:'start',behavior:'instant'}); return true; })()`);
  await sleep(200);
  // restart CSS animations on entrance targets, then capture mid-beat (~180ms: guide visible, viewer entering, seal/cards still low)
  await evalJs(`(() => {
    const sels = [
      '[data-asura-age-here]','[data-asura-age-viewer]','[data-asura-decree-viewer]',
      '[data-asura-timeline-decree] [class*="visualCard"]','[data-asura-timeline-decree] [class*="visualMarkSeal"]',
      '[class*="motionSegment"]','[data-asura-age-peel-hint]'
    ];
    const nodes = [];
    for (const s of sels) document.querySelectorAll(s).forEach(n => nodes.push(n));
    for (const n of nodes) {
      n.style.animation = 'none';
      n.style.opacity = '0';
    }
    void document.body.offsetWidth;
    for (const n of nodes) {
      n.style.animation = '';
      n.style.opacity = '';
      n.style.animation = 'none';
      void n.offsetWidth;
      n.style.animation = '';
    }
    // force reflow re-trigger by toggling class on roots
    document.querySelectorAll('[class*="motionRoot"], [class*="visualRoot"]').forEach(r => {
      r.style.animation = 'none';
      void r.offsetWidth;
      r.style.animation = '';
    });
    return nodes.length;
  })()`);
  await sleep(180);
  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const buf = Buffer.from(shot.result.data, 'base64');
  writeFileSync(path.join(OUT, 'motion-390-after-mid180.png'), buf);
  console.log(JSON.stringify({ mid: true, bytes: buf.length }));
  try { ws.close(); } catch {}
  try { edge.kill(); } catch {}
  process.exit(0);
})().catch((e) => { console.error(String(e && e.stack || e)); try { edge.kill(); } catch {}; process.exit(1); });
