/**
 * Flicker frame capture + contrast baseline for 鬼魅阿修羅.
 * Writes under ASURA_FLICKER_OUT (default _tmp_asura_perf/flicker-out).
 * Read-only vs project sources. Uses Edge/Chrome CDP.
 */
const { spawn } = require('child_process');
const { existsSync, mkdirSync, writeFileSync, mkdtempSync } = require('fs');
const path = require('path');
const os = require('os');

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => existsSync(p));
if (!EDGE) { console.error('No browser'); process.exit(2); }

const BASE = (process.env.ASURA_BASE_URL || 'http://localhost:3010').replace(/\/$/, '');
const OUT = process.env.ASURA_FLICKER_OUT || 'C:\\Users\\DRAGON\\Desktop\\命理\\_tmp_asura_perf\\flicker-out';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function relLuminance({ r, g, b }) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const L1 = relLuminance(a), L2 = relLuminance(b);
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}
function parseColor(str) {
  if (!str) return null;
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3] };
}

async function connectBrowser(port) {
  const profile = mkdtempSync(path.join(os.tmpdir(), 'asura-flick-'));
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(300);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) { try { edge.kill(); } catch {}; throw new Error('no CDP'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }); });
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((r, j) => {
    const i = ++id; pending.set(i, r);
    try { ws.send(JSON.stringify({ id: i, method, params })); } catch (err) { pending.delete(i); j(err); }
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
    return r.result?.result?.value;
  };
  const waitFor = async (expr, ms = 90000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await evalJs(expr)) return; await sleep(250); }
    throw new Error('timeout ' + expr);
  };
  return { edge, ws, send, evalJs, waitFor };
}

async function fillForm(evalJs, waitFor, sleep) {
  await evalJs(`(() => { const el = [...document.querySelectorAll('button')].find(e => (e.textContent||'').trim().startsWith('我自己')); if(el) el.click(); return !!el; })()`);
  await sleep(300);
  await evalJs(`(() => { const labels=['民國年','月份','日期']; const values=['63','6','28']; for (let i=0;i<3;i++){ const el=document.querySelector('main[data-page="ghost-asura"] [data-field="birthDate"] input[aria-label="'+labels[i]+'"]'); if(!el) continue; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,values[i]); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.blur(); } return true; })()`);
  await sleep(500);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').trim().startsWith('男性')); if(el) el.click(); return !!el; })()`);
  await sleep(200);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').includes('我知道出生時辰')); if(el) el.click(); return !!el; })()`);
  await sleep(500);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].filter(e=>/^\\s*酉時/.test((e.textContent||'').trim())).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0]; if(el){el.click(); return true;} return false; })()`);
  await sleep(400);
  await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').includes('開啟命魂戰局')); if(b) b.click(); return !!b; })()`);
  await waitFor(`document.body.innerText.includes('千人千面戰神令')`);
}

async function captureBurst(send, evalJs, label, n = 16, gapMs = 60) {
  const frames = [];
  for (let i = 0; i < n; i++) {
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const b64 = shot.result?.data;
    if (b64) {
      const fp = path.join(OUT, `${label}-f${String(i).padStart(3, '0')}.png`);
      require('fs').writeFileSync(fp, Buffer.from(b64, 'base64'));
      // sample center pixel luma via canvas in page from data URL is heavy; use JS avg from screenshot decode later.
      frames.push({ i, file: fp, t: Date.now() });
    }
    await sleep(gapMs);
  }
  // Luma via page ImageDecoder-ish: evaluate reading last screenshot is hard; instead sample DOM backgrounds
  const flashProbe = await evalJs(`(() => {
    const sample = () => {
      const els = [document.body, document.querySelector('main'), document.querySelector('[data-asura-timeline-decree]'), document.querySelector('[data-asura-age-timeline]')].filter(Boolean);
      return els.map(el => {
        const cs = getComputedStyle(el);
        const bg = cs.backgroundColor;
        const m = bg.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
        if (!m) return { tag: el.tagName, bg };
        const r=+m[1],g=+m[2],b=+m[3];
        const luma = 0.2126*r + 0.7152*g + 0.0722*b;
        return { tag: el.tagName, bg, luma: +luma.toFixed(2) };
      });
    };
    return sample();
  })()`);
  return { frames, flashProbe };
}

function analyzeFlashes(probesOverTime) {
  // probesOverTime: array of {t, maxLuma}
  let flashes = 0;
  for (let i = 1; i < probesOverTime.length; i++) {
    const prev = probesOverTime[i - 1].maxLuma;
    const cur = probesOverTime[i].maxLuma;
    if (cur >= 240 && prev < 200) flashes++; // jump toward white
    if (Math.abs(cur - prev) >= 80 && cur > prev) flashes++;
  }
  const durSec = Math.max(0.001, (probesOverTime.at(-1).t - probesOverTime[0].t) / 1000);
  return { flashes, flashesPerSec: +(flashes / durSec).toFixed(2), maxLuma: Math.max(...probesOverTime.map(p => p.maxLuma)), whiteFlash: probesOverTime.some(p => p.maxLuma >= 250) };
}

(async () => {
  const port = 9900 + Math.floor(Math.random() * 200);
  const { edge, ws, send, evalJs, waitFor } = await connectBrowser(port);
  const report = { base: BASE, startedAt: new Date().toISOString(), scenarios: {} };
  try {
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });

    // Entrance
    await send('Page.navigate', { url: BASE + '/ghost-asura' });
    await waitFor(`document.readyState==='complete' && !!document.querySelector('button')`);
    await sleep(500);
    const entranceProbes = [];
    const t0 = Date.now();
    // start form submit then burst
    const entrancePromise = (async () => {
      for (let i = 0; i < 20; i++) {
        const probe = await evalJs(`(() => {
          const els=[document.body,...document.querySelectorAll('main,[data-asura-timeline-decree],[data-asura-age-timeline]')];
          let max=0; for (const el of els){ const m=(getComputedStyle(el).backgroundColor||'').match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); if(!m) continue; const L=0.2126*+m[1]+0.7152*+m[2]+0.0722*+m[3]; if(L>max) max=L; } return max;
        })()`);
        entranceProbes.push({ t: Date.now(), maxLuma: probe });
        await sleep(80);
      }
    })();
    await fillForm(evalJs, waitFor, sleep);
    await entrancePromise;
    const entranceBurst = await captureBurst(send, evalJs, 'entrance', 12, 70);
    report.scenarios.entrance = { ...analyzeFlashes(entranceProbes), burstFiles: entranceBurst.frames.map(f => f.file), flashProbe: entranceBurst.flashProbe };

    // Segment switch
    await evalJs(`(() => { const el=document.querySelector('[data-asura-age-seg-index="0"]') || [...document.querySelectorAll('[data-asura-age-seg-index]')].find(e=> (e.textContent||'').includes('4')); if(el) el.click(); return !!el; })()`);
    await sleep(200);
    const segProbes = [];
    for (let i = 0; i < 12; i++) {
      await evalJs(`(() => { const nodes=[...document.querySelectorAll('[data-asura-age-seg-index]')]; const el=nodes[${i % 6}] || nodes[0]; if(el) el.click(); return true; })()`);
      const probe = await evalJs(`(() => { let max=0; for (const el of [document.body,...document.querySelectorAll('[data-asura-age-timeline] *')].slice(0,40)){ const m=(getComputedStyle(el).backgroundColor||'').match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); if(!m) continue; const L=0.2126*+m[1]+0.7152*+m[2]+0.0722*+m[3]; if(L>max) max=L;} return max; })()`);
      segProbes.push({ t: Date.now(), maxLuma: probe });
      await sleep(90);
    }
    const segBurst = await captureBurst(send, evalJs, 'segswitch', 8, 70);
    report.scenarios.segswitch = { ...analyzeFlashes(segProbes), burstFiles: segBurst.frames.map(f => f.file) };

    // Peel
    await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(e=>/再剝一層/.test(e.textContent||'')); if(b){ b.click(); return true;} return false; })()`);
    const peelProbes = [];
    for (let i = 0; i < 10; i++) {
      const probe = await evalJs(`(() => { let max=0; for (const el of document.querySelectorAll('[data-asura-age-timeline] *')){ const m=(getComputedStyle(el).backgroundColor||'').match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); if(!m) continue; const L=0.2126*+m[1]+0.7152*+m[2]+0.0722*+m[3]; if(L>max) max=L;} return max; })()`);
      peelProbes.push({ t: Date.now(), maxLuma: probe });
      await sleep(80);
    }
    const peelBurst = await captureBurst(send, evalJs, 'peel', 8, 70);
    report.scenarios.peel = { ...analyzeFlashes(peelProbes), burstFiles: peelBurst.frames.map(f => f.file) };

    // Reduced motion final
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.reload', { ignoreCache: true });
    await waitFor(`document.readyState==='complete' && !!document.querySelector('button')`);
    await fillForm(evalJs, waitFor, sleep);
    await sleep(800);
    const rm = await evalJs(`(() => {
      const timeline = document.querySelector('[data-asura-age-timeline]');
      const segs = [...document.querySelectorAll('[data-asura-age-seg-index]')];
      const opacities = segs.slice(0,6).map(el => +getComputedStyle(el).opacity);
      const text = (timeline && timeline.innerText || '').slice(0, 400);
      const ageVisible = /虛歲|實歲|\\d+/.test(text);
      return { opacities, ageVisible, textLen: text.length, allOpaque: opacities.every(o => o >= 0.99) };
    })()`);
    const rmShot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    if (rmShot.result?.data) {
      require('fs').writeFileSync(path.join(OUT, 'reduced-motion-final.png'), Buffer.from(rmShot.result.data, 'base64'));
    }
    report.scenarios.reducedMotion = { ...rm, pass: !!(rm && rm.allOpaque && rm.ageVisible) };

    // Contrast table
    const contrastRows = await evalJs(`(() => {
      const pick = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        let bgEl = el;
        let bg = cs.backgroundColor;
        for (let i=0;i<6;i++) {
          const m = (bg||'').match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+),\\s*([\\d.]+)/);
          const opaque = m && (+m[4] >= 0.9 || m[4] === undefined);
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && opaque) break;
          bgEl = bgEl.parentElement; if (!bgEl) break;
          bg = getComputedStyle(bgEl).backgroundColor;
        }
        return { sel, color: cs.color, bg, fontSize: cs.fontSize, text: (el.textContent||'').replace(/\\s+/g,' ').slice(0,40) };
      };
      return [
        pick('.bannerTitle') || pick('[class*="bannerTitle"]'),
        pick('[data-asura-timeline-decree]'),
        pick('[data-asura-age-timeline] [data-asura-age-seg-index]'),
        pick('.pinnedSummary') || pick('[class*="pinnedSummary"]'),
        pick('[class*="visualAgeBand"]'),
      ].filter(Boolean);
    })()`);
    report.contrastRaw = contrastRows;
    report.contrast = (contrastRows || []).map((row) => {
      const fg = parseColor(row.color); const bg = parseColor(row.bg);
      if (!fg || !bg) return { ...row, ratio: null, pass: null };
      const ratio = +contrast(fg, bg).toFixed(2);
      return { sel: row.sel, text: row.text, color: row.color, bg: row.bg, ratio, pass: ratio >= 4.5 };
    });

    report.finishedAt = new Date().toISOString();
    writeFileSync(path.join(OUT, 'flicker-contrast-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ out: OUT, summary: {
      entrance: report.scenarios.entrance && { whiteFlash: report.scenarios.entrance.whiteFlash, fps: report.scenarios.entrance.flashesPerSec, maxLuma: report.scenarios.entrance.maxLuma },
      seg: report.scenarios.segswitch && { whiteFlash: report.scenarios.segswitch.whiteFlash, fps: report.scenarios.segswitch.flashesPerSec },
      peel: report.scenarios.peel && { whiteFlash: report.scenarios.peel.whiteFlash, fps: report.scenarios.peel.flashesPerSec },
      rm: report.scenarios.reducedMotion,
      contrast: report.contrast,
    }}, null, 2));
  } catch (e) {
    report.blocked = String(e && e.stack || e).slice(0, 800);
    writeFileSync(path.join(OUT, 'flicker-contrast-report.json'), JSON.stringify(report, null, 2));
    console.error(report.blocked);
    process.exit(1);
  } finally {
    try { ws.close(); } catch {}
    try { edge.kill(); } catch {}
  }
})();
