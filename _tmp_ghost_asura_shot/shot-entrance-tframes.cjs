const { spawn } = require('child_process');
const { existsSync, mkdirSync, writeFileSync, mkdtempSync, copyFileSync } = require('fs');
const path = require('path');
const os = require('os');
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => existsSync(p));
const OUT = 'C:\\Users\\DRAGON\\Desktop\\命理\\_tmp_ghost_asura_shot\\final5';
const XFER = 'C:\\Users\\DRAGON\\bead-card-xfer\\ghost-asura-48\\final5';
mkdirSync(OUT, { recursive: true });
mkdirSync(XFER, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9800 + Math.floor(Math.random() * 20);
const profile = mkdtempSync(path.join(os.tmpdir(), 'asura-tframes-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--window-size=390,900', 'about:blank'], { stdio: 'ignore' });
(async () => {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(400);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  if (!target) throw new Error('no CDP target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,500)); return r.result?.result?.value; };
  const waitFor = async (expr, ms = 120000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await evalJs(expr)) return; await sleep(400); } throw new Error('timeout '+expr); };
  const shotFile = async (name) => {
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const buf = Buffer.from(shot.result.data, 'base64');
    writeFileSync(path.join(OUT, name), buf);
    try { copyFileSync(path.join(OUT, name), path.join(XFER, name)); } catch {}
    return buf.length;
  };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:8888/ghost-asura' });
  await waitFor(`document.readyState === 'complete' && !!document.querySelector('button')`);
  await sleep(1000);
  // hide Next.js dev indicator / overlay (dev-only)
  await evalJs(`(() => {
    const kill = () => {
      document.querySelectorAll('nextjs-portal, [data-nextjs-toast], [data-next-badge], #__next-build-watcher').forEach(e => e.remove());
      document.querySelectorAll('button').forEach(b => {
        const t = (b.getAttribute('aria-label')||'') + (b.textContent||'');
        if (/N\\s*$|Next\\.js|Static route indicator|open issues/i.test(t) || b.id === 'next-logo') b.remove();
      });
      const style = document.getElementById('hide-next-dev') || document.createElement('style');
      style.id = 'hide-next-dev';
      style.textContent = 'nextjs-portal,[data-nextjs-toast],[data-next-badge],#__next-build-watcher,[data-nextjs-dialog-overlay]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}';
      document.documentElement.appendChild(style);
      return true;
    };
    kill();
    const mo = new MutationObserver(kill); mo.observe(document.documentElement, { childList:true, subtree:true });
    return true;
  })()`);

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
  await sleep(2800);

  // scroll so 「現在」 segment + nearby bridge are in view
  await evalJs(`(() => {
    const cur = document.querySelector('[data-asura-age-segment][data-current="true"]') || document.querySelector('[class*="motionSegmentCurrent"]') || document.querySelector('[data-asura-age-here]');
    if (cur) cur.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy(0, -8);
    return cur ? (cur.getAttribute('data-asura-age-seg-index') || cur.className.slice(0,80)) : null;
  })()`);
  await sleep(200);

  const restart = await evalJs(`(() => {
    const sels = [
      '[data-asura-age-here]','[data-asura-age-viewer]','[data-asura-decree-viewer]',
      '[data-asura-timeline-decree] [class*="visualCard"]','[data-asura-timeline-decree] [class*="visualMarkSeal"]',
      '[class*="motionSegment"]','[data-asura-age-peel-hint]',
      '[class*="motionBridge"]','[data-asura-age-bridge]','[class*="motionLine"]'
    ];
    const nodes = [];
    for (const s of sels) document.querySelectorAll(s).forEach(n => nodes.push(n));
    for (const n of nodes) { n.style.animation = 'none'; n.style.opacity = '0'; }
    void document.body.offsetWidth;
    for (const n of nodes) {
      n.style.animation = '';
      n.style.opacity = '';
      void n.offsetWidth;
      // hard restart
      const cs = getComputedStyle(n).animationName;
      n.style.animation = 'none';
      void n.offsetWidth;
      n.style.animation = '';
    }
    document.querySelectorAll('[class*="motionRoot"], [class*="visualRoot"]').forEach(r => {
      r.style.animation = 'none'; void r.offsetWidth; r.style.animation = '';
    });
    return { count: nodes.length, bridges: document.querySelectorAll('[data-asura-age-bridge],[class*="motionBridge"]').length };
  })()`);

  const sample = async (label) => evalJs(`(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { op: Number(cs.opacity), delay: cs.animationDelay, name: cs.animationName, text: (el.innerText||'').replace(/\\s+/g,' ').slice(0,60) };
    };
    const bridges = [...document.querySelectorAll('[data-asura-age-bridge],[class*="motionBridge"]')].slice(0,4).map(el => {
      const cs = getComputedStyle(el); return { op: Number(cs.opacity), delay: cs.animationDelay, text: (el.innerText||'').replace(/\\s+/g,' ').slice(0,40) };
    });
    const segs = [...document.querySelectorAll('[class*="motionSegment"]')].slice(0,4).map(el => Number(getComputedStyle(el).opacity));
    const cur = document.querySelector('[data-asura-age-segment][data-current="true"]');
    return {
      label: ${JSON.stringify('${label}')}.replace('${label}', '${label}'),
      overflowX: document.documentElement.scrollWidth > 390 + 1,
      scrollW: document.documentElement.scrollWidth,
      here: pick('[data-asura-age-here]'),
      viewer: pick('[data-asura-age-viewer]'),
      bridge0: bridges[0] || null,
      bridges,
      segOps: segs,
      curSegOp: cur ? Number(getComputedStyle(cur).opacity) : null,
      curText: cur ? (cur.innerText||'').replace(/\\s+/g,' ').slice(0,50) : null,
      nextBadge: !!document.querySelector('nextjs-portal,[data-next-badge]')
    };
  })()`.replaceAll("'${label}'", `'${label}'`));

  // fix sample helper properly
  const measure = async (label) => evalJs(`(() => {
    const bridges = [...document.querySelectorAll('[data-asura-age-bridge], [class*="motionBridge"]')].slice(0,6).map(el => {
      const cs = getComputedStyle(el);
      return { op: +(+cs.opacity).toFixed(3), delay: cs.animationDelay, text: (el.innerText||'').replace(/\\s+/g,' ').slice(0,48) };
    });
    const segs = [...document.querySelectorAll('[class*="motionSegment"]')].slice(0,6).map(el => +(+getComputedStyle(el).opacity).toFixed(3));
    const cur = document.querySelector('[data-asura-age-segment][data-current="true"]');
    const here = document.querySelector('[data-asura-age-here]');
    const viewer = document.querySelector('[data-asura-age-viewer]');
    return {
      label: '${label}',
      overflowX: document.documentElement.scrollWidth > 391,
      scrollW: document.documentElement.scrollWidth,
      hereOp: here ? +(+getComputedStyle(here).opacity).toFixed(3) : null,
      viewerOp: viewer ? +(+getComputedStyle(viewer).opacity).toFixed(3) : null,
      bridgeMaxOp: bridges.reduce((m,b)=>Math.max(m,b.op),0),
      bridge0: bridges[0] || null,
      bridges,
      segOps: segs,
      curSegOp: cur ? +(+getComputedStyle(cur).opacity).toFixed(3) : null,
      nextBadge: !!(document.querySelector('nextjs-portal') || document.querySelector('[data-next-badge]')),
    };
  })()`);

  const metrics = { restart, frames: {} };
  // t0 immediately
  metrics.frames.t0 = await measure('t0');
  const b0 = await shotFile('motion-390-t0.png');
  await sleep(180);
  metrics.frames.t180 = await measure('t180');
  const b180 = await shotFile('motion-390-t180.png');
  await sleep(320); // total ~500 from restart
  metrics.frames.t500 = await measure('t500');
  const b500 = await shotFile('motion-390-t500.png');

  writeFileSync(path.join(OUT, 'motion-390-tframes-metrics.json'), JSON.stringify(metrics, null, 2));
  try { copyFileSync(path.join(OUT, 'motion-390-tframes-metrics.json'), path.join(XFER, 'motion-390-tframes-metrics.json')); } catch {}
  console.log(JSON.stringify({ bytes: { t0: b0, t180: b180, t500: b500 }, metrics }, null, 2));
  try { ws.close(); } catch {}
  try { edge.kill(); } catch {}
  process.exit(0);
})().catch((e) => { console.error(String(e && e.stack || e)); try { edge.kill(); } catch {}; process.exit(1); });
