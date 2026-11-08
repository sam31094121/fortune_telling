/**
 * Read-only mobile perf probe for 鬼魅阿修羅 card.
 * Does NOT edit project files. Writes only under C:\Users\DRAGON\Desktop\命理\_tmp_asura_perf\out\
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
if (!EDGE) {
  console.error('No Edge/Chrome found');
  process.exit(2);
}

const OUT = process.env.ASURA_PERF_OUT || 'C:\\Users\\DRAGON\\Desktop\\命理\\_tmp_asura_perf\\out';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844, dsf: 3 },
  { name: '360x800', width: 360, height: 800, dsf: 3 },
];
const CPU_RATES = [4, 6];
const SEGMENTS = ['4–13', '14–23', '24–33', '34–43', '44–53', '54–63'];

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarizeFrames(frames) {
  const durs = frames.map((f) => f.duration).filter((d) => typeof d === 'number' && d >= 0).sort((a, b) => a - b);
  if (!durs.length) return { count: 0, avg: null, p95: null, max: null, droppedOver33: 0, droppedOver50: 0 };
  const sum = durs.reduce((a, b) => a + b, 0);
  return {
    count: durs.length,
    avg: +(sum / durs.length).toFixed(2),
    p50: +percentile(durs, 50).toFixed(2),
    p95: +percentile(durs, 95).toFixed(2),
    max: +durs[durs.length - 1].toFixed(2),
    droppedOver33: durs.filter((d) => d > 33.3).length,
    droppedOver50: durs.filter((d) => d > 50).length,
  };
}

async function connectBrowser(port) {
  const profile = mkdtempSync(path.join(os.tmpdir(), 'asura-perf-'));
  const edge = spawn(
    EDGE,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--hide-scrollbars',
      '--disable-gpu-vsync',
      '--enable-precise-memory-info',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(300);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) {
    try { edge.kill(); } catch {}
    throw new Error('no CDP target');
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.addEventListener('open', r, { once: true });
    ws.addEventListener('error', j, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    } else if (m.method) {
      events.push(m);
    }
  });
  const send = (method, params = {}) =>
    new Promise((r, j) => {
      const i = ++id;
      pending.set(i, r);
      try {
        ws.send(JSON.stringify({ id: i, method, params }));
      } catch (err) {
        pending.delete(i);
        j(err);
      }
    });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) {
      throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500));
    }
    return r.result?.result?.value;
  };
  const waitFor = async (expr, ms = 90000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await evalJs(expr)) return;
      await sleep(250);
    }
    throw new Error('timeout ' + expr);
  };
  return { edge, ws, send, evalJs, waitFor, events, profile };
}

async function fillFormAndSubmit(evalJs, waitFor, sleep) {
  await evalJs(`(() => { const el = [...document.querySelectorAll('button')].find(e => (e.textContent||'').trim().startsWith('我自己')); if(el) el.click(); return !!el; })()`);
  await sleep(300);
  await evalJs(`(() => { const labels=['民國年','月份','日期']; const values=['63','6','28']; for (let i=0;i<3;i++){ const el=document.querySelector('main[data-page="ghost-asura"] [data-field="birthDate"] input[aria-label="'+labels[i]+'"]'); if(!el) continue; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,values[i]); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.blur(); } return true; })()`);
  await sleep(600);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').trim().startsWith('男性')); if(el) el.click(); return !!el; })()`);
  await sleep(250);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').includes('我知道出生時辰')); if(el) el.click(); return !!el; })()`);
  await sleep(700);
  await evalJs(`(() => { const el=[...document.querySelectorAll('button')].filter(e=>/^\\s*酉時/.test((e.textContent||'').trim())).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0]; if(el){el.click(); return true;} return false; })()`);
  await sleep(500);
  await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').includes('開啟命魂戰局')); if(b) b.click(); return !!b; })()`);
  await waitFor(`!!document.querySelector('[data-asura-timeline-decree], [data-asura-age-timeline], main[data-page="ghost-asura"]') && document.body.innerText.includes('千人千面戰神令')`);
}

const FRAME_PROBE = `(() => {
  if (window.__asuraPerf) return 'exists';
  const state = {
    frames: [],
    longTasks: [],
    recording: false,
    lastTs: null,
    rafId: null,
    po: null,
  };
  const loop = (ts) => {
    if (!state.recording) { state.rafId = null; return; }
    if (state.lastTs != null) {
      state.frames.push({ t: ts, duration: ts - state.lastTs });
    }
    state.lastTs = ts;
    state.rafId = requestAnimationFrame(loop);
  };
  window.__asuraPerf = {
    start() {
      state.frames = [];
      state.longTasks = [];
      state.lastTs = null;
      state.recording = true;
      try {
        if (state.po) state.po.disconnect();
        state.po = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            state.longTasks.push({ name: e.name, start: e.startTime, duration: e.duration });
          }
        });
        state.po.observe({ type: 'longtask', buffered: false });
      } catch (err) {
        state.po = null;
      }
      state.rafId = requestAnimationFrame(loop);
    },
    stop() {
      state.recording = false;
      if (state.rafId != null) cancelAnimationFrame(state.rafId);
      state.rafId = null;
      try { if (state.po) state.po.disconnect(); } catch {}
      const frames = state.frames.slice();
      const longTasks = state.longTasks.slice();
      return { frames, longTasks };
    },
    snapshotCssCost() {
      const pick = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          sel,
          filter: cs.filter,
          backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || '',
          mixBlendMode: cs.mixBlendMode,
          willChange: cs.willChange,
          transform: cs.transform,
          boxShadow: (cs.boxShadow || '').slice(0, 180),
          backgroundImage: (cs.backgroundImage || '').slice(0, 220),
          opacity: cs.opacity,
        };
      };
      const costly = [];
      const walk = document.querySelectorAll('[class*="visual"], [class*="timeline"], [class*="Age"], [data-asura-timeline-decree], [data-asura-age-timeline], [class*="GhostAsura"]');
      const seen = new Set();
      for (const el of walk) {
        const cs = getComputedStyle(el);
        const hit =
          (cs.filter && cs.filter !== 'none') ||
          ((cs.backdropFilter || cs.webkitBackdropFilter) && (cs.backdropFilter || cs.webkitBackdropFilter) !== 'none') ||
          (cs.mixBlendMode && cs.mixBlendMode !== 'normal') ||
          (cs.willChange && cs.willChange !== 'auto') ||
          ((cs.boxShadow || '') !== 'none' && (cs.boxShadow || '').split('px').length > 6) ||
          ((cs.backgroundImage || '').match(/gradient/g) || []).length >= 3;
        if (!hit) continue;
        const key = el.className + '|' + el.tagName;
        if (seen.has(key)) continue;
        seen.add(key);
        costly.push({
          tag: el.tagName,
          className: String(el.className).slice(0, 160),
          filter: cs.filter,
          backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || '',
          mixBlendMode: cs.mixBlendMode,
          willChange: cs.willChange,
          gradientCount: ((cs.backgroundImage || '').match(/gradient/g) || []).length,
          boxShadowLen: (cs.boxShadow || '').length,
        });
        if (costly.length >= 40) break;
      }
      return {
        samples: {
          decree: pick('[data-asura-timeline-decree]'),
          timeline: pick('[data-asura-age-timeline]') || pick('[class*="timelineRoot"], [class*="ageTimeline"]'),
          visualRoot: pick('[class*="visualRoot"]'),
        },
        costly,
        textLen: document.body.innerText.length,
      };
    },
  };
  return 'ready';
})()`;

async function measureWindow(evalJs, sleep, ms, actionFn) {
  await evalJs(`window.__asuraPerf.start()`);
  const t0 = Date.now();
  let actionMeta = null;
  if (actionFn) actionMeta = await actionFn();
  await sleep(ms);
  const raw = await evalJs(`window.__asuraPerf.stop()`);
  const wallMs = Date.now() - t0;
  return {
    wallMs,
    actionMeta,
    frames: summarizeFrames(raw.frames || []),
    longTasks: (raw.longTasks || []).map((t) => ({
      name: t.name,
      start: +(+t.start).toFixed(1),
      duration: +(+t.duration).toFixed(1),
    })),
    longTaskCount: (raw.longTasks || []).length,
    longTaskMax: (raw.longTasks || []).reduce((m, t) => Math.max(m, t.duration || 0), 0),
  };
}

function verdict(m) {
  if (!m || !m.frames || m.frames.count === 0) return '缺證據';
  const p95 = m.frames.p95;
  const lt = m.longTaskCount || 0;
  // PASS: p95 near 16.7 and no long tasks. Allow small headroom for headless.
  if (p95 != null && p95 <= 20 && lt === 0 && (m.frames.droppedOver50 || 0) === 0) return 'PASS';
  return 'FAIL';
}

async function runScenario(vp, cpuRate) {
  const port = 9800 + Math.floor(Math.random() * 200);
  const { edge, ws, send, evalJs, waitFor } = await connectBrowser(port);
  const result = {
    viewport: vp.name,
    width: vp.width,
    height: vp.height,
    dsf: vp.dsf,
    cpuThrottlingRate: cpuRate,
    buildHint: null,
    blocked: null,
    actions: {},
  };
  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.dsf,
      mobile: true,
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Emulation.setCPUThrottlingRate', { rate: cpuRate });

    // Navigate form page first (cold)
    const BASE = process.env.ASURA_BASE_URL || 'http://localhost:8888';
    await send('Page.navigate', { url: BASE.replace(/\/$/, '') + '/ghost-asura' });
    await waitFor(`document.readyState === 'complete' && !!document.querySelector('button')`);
    await sleep(800);
    result.buildHint = await evalJs(`(() => {
      const scripts = [...document.querySelectorAll('script[src]')].map(s => s.src).slice(0, 8);
      const nextData = !!document.querySelector('#__NEXT_DATA__');
      const hot = scripts.some(s => /_next\\/static\\/chunks\\/webpack|hot-update|react-refresh/i.test(s));
      return {
        title: document.title,
        nextData,
        hotLikelyDev: hot,
        scripts,
        note: hot ? 'likely Next.js DEV (HMR scripts present)' : (nextData ? 'Next.js page (prod-like or built)' : 'unknown'),
      };
    })()`);

    await evalJs(FRAME_PROBE);
    const cssCostBefore = await evalJs(`window.__asuraPerf.snapshotCssCost()`);

    // 1) Opening card: fill + submit, measure until decree visible + entrance settle (~2.8s)
    const open = await measureWindow(evalJs, sleep, 3200, async () => {
      await fillFormAndSubmit(evalJs, waitFor, sleep);
      const visible = await evalJs(`(() => {
        const el = document.querySelector('[data-asura-timeline-decree]');
        if (!el) return { ok:false };
        const r = el.getBoundingClientRect();
        return { ok: r.height > 40, textHas: document.body.innerText.includes('千人千面戰神令'), h: r.height };
      })()`);
      return visible;
    });
    open.verdict = verdict(open);
    open.cssCost = await evalJs(`window.__asuraPerf.snapshotCssCost()`);
    result.actions.openCard = open;

    // Ensure timeline scrolled into view
    await evalJs(`(() => { const el = document.querySelector('[data-asura-timeline-decree]'); if (el) el.scrollIntoView({block:'start', behavior:'instant'}); return !!el; })()`);
    await sleep(400);

    // Discover segment chips / cards
    const segMap = await evalJs(`(() => {
      const out = {};
      const want = ${JSON.stringify(SEGMENTS)};
      const nodes = [...document.querySelectorAll('button, [role=button], a, [data-age], [class*="age"], [class*="segment"], [class*="mark"]')];
      for (const w of want) {
        const hit = nodes.find(n => {
          const t = (n.textContent||'').replace(/\\s+/g,' ');
          return t.includes(w) || t.includes(w.replace('–','-'));
        });
        if (hit) {
          if (!hit.dataset.asuraPerfId) hit.dataset.asuraPerfId = 'seg-' + w;
          out[w] = { id: hit.dataset.asuraPerfId, text: (hit.textContent||'').replace(/\\s+/g,' ').slice(0,80), tag: hit.tagName };
        }
      }
      // also list peel buttons
      const peel = [...document.querySelectorAll('button')].filter(b => /剝|洋蔥|再剝/.test(b.textContent||'')).map(b => (b.textContent||'').replace(/\\s+/g,' ').slice(0,40));
      return { segs: out, peelButtons: peel, bodyHasTimeline: document.body.innerText.includes('十二陣') };
    })()`);
    result.segmentDiscovery = segMap;

    // 2) Switch each age segment
    result.actions.segmentSwitch = {};
    for (const seg of SEGMENTS) {
      const info = segMap.segs[seg];
      if (!info) {
        result.actions.segmentSwitch[seg] = { verdict: '缺證據', reason: 'chip/card not found' };
        continue;
      }
      const m = await measureWindow(evalJs, sleep, 900, async () => {
        const sel = '[data-asura-perf-id="' + info.id + '"]';
        const clicked = await evalJs("(() => { const el = document.querySelector(" + JSON.stringify(sel) + "); if (!el) return { ok:false }; el.scrollIntoView({ block: 'nearest', behavior: 'instant' }); el.click(); return { ok:true, text: (el.textContent||'').replace(/\\s+/g,' ').slice(0,60) }; })()");
        return clicked;
      });
      m.verdict = verdict(m);
      result.actions.segmentSwitch[seg] = m;
      await sleep(200);
    }

    // Focus current 44–53 then peel
    await evalJs(`(() => {
      const el = document.querySelector('[data-asura-perf-id="seg-44–53"]');
      if (el) { el.scrollIntoView({block:'center', behavior:'instant'}); el.click(); }
      return !!el;
    })()`);
    await sleep(500);

    // 3) 剝洋蔥
    const peel = await measureWindow(evalJs, sleep, 1200, async () => {
      return await evalJs(`(() => {
        const b = [...document.querySelectorAll('button')].find(e => /再剝一層|剝一層|剝洋蔥|往下剝/.test((e.textContent||'')));
        if (!b) {
          const all = [...document.querySelectorAll('button')].map(x => (x.textContent||'').replace(/\\s+/g,' ').slice(0,40)).filter(Boolean).slice(0,30);
          return { ok:false, buttons: all };
        }
        b.scrollIntoView({ block: 'center', behavior: 'instant' });
        b.click();
        return { ok:true, text: (b.textContent||'').replace(/\\s+/g,' ').slice(0,40) };
      })()`);
    });
    peel.verdict = peel.actionMeta && peel.actionMeta.ok === false ? '缺證據' : verdict(peel);
    result.actions.peelOnion = peel;

    // 4) Scroll full timeline
    const scroll = await measureWindow(evalJs, sleep, 1600, async () => {
      return await evalJs(`(() => {
        const root = document.querySelector('[data-asura-timeline-decree]') || document.scrollingElement || document.documentElement;
        const start = window.scrollY;
        const max = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
        // stepwise scroll to trigger paints
        let y = 0;
        const step = Math.max(80, Math.floor(window.innerHeight * 0.6));
        while (y < max) {
          y = Math.min(max, y + step);
          window.scrollTo(0, y);
        }
        window.scrollTo(0, 0);
        return { start, max, step };
      })()`);
    });
    scroll.verdict = verdict(scroll);
    result.actions.scrollTimeline = scroll;

    result.cssCostBeforeCard = cssCostBefore;
    result.cssCostAfterOpen = open.cssCost;
  } catch (err) {
    result.blocked = String(err && err.stack || err).slice(0, 800);
  } finally {
    try { ws.close(); } catch {}
    try { edge.kill(); } catch {}
  }
  return result;
}

(async () => {
  const report = {
    startedAt: new Date().toISOString(),
    method: 'Edge/Chrome headless CDP + rAF frame timing + PerformanceObserver longtask + Emulation.setCPUThrottlingRate',
    baseUrl: (process.env.ASURA_BASE_URL || 'http://localhost:8888'),
    fixture: '民國63/6/28 男性 酉時 → /ghost-asura',
    passRule: 'PASS if p95<=20ms and 0 longtasks and 0 frames>50ms (headless headroom over 16.7ms); else FAIL; 缺證據 if no frames or UI missing',
    note: 'Read-only. No project files edited. Numbers are measured, not estimated.',
    runs: [],
  };

  // Probe server
  try {
    const BASE0 = (process.env.ASURA_BASE_URL || 'http://localhost:8888').replace(/\/$/, '');
    const st = await fetch(BASE0 + '/ghost-asura');
    report.server = { ok: st.ok, status: st.status };
  } catch (e) {
    report.server = { ok: false, error: String(e) };
    writeFileSync(path.join(OUT, 'perf-report.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 2));
    process.exit(3);
  }

  // Focus: 390@4x first (primary), then 390@6x, then 360@4x, 360@6x
  for (const vp of VIEWPORTS) {
    for (const rate of CPU_RATES) {
      console.error('RUN', vp.name, 'cpu', rate + 'x');
      const r = await runScenario(vp, rate);
      report.runs.push(r);
      writeFileSync(path.join(OUT, 'perf-' + vp.name + '-cpu' + rate + 'x.json'), JSON.stringify(r, null, 2), 'utf8');
    }
  }

  report.finishedAt = new Date().toISOString();
  writeFileSync(path.join(OUT, 'perf-report.json'), JSON.stringify(report, null, 2), 'utf8');

  // Compact console summary
  const summary = report.runs.map((r) => ({
    vp: r.viewport,
    cpu: r.cpuThrottlingRate,
    blocked: r.blocked,
    build: r.buildHint && r.buildHint.note,
    open: r.actions.openCard && { v: r.actions.openCard.verdict, p95: r.actions.openCard.frames && r.actions.openCard.frames.p95, lt: r.actions.openCard.longTaskCount, maxLT: r.actions.openCard.longTaskMax },
    segs: r.actions.segmentSwitch && Object.fromEntries(Object.entries(r.actions.segmentSwitch).map(([k, v]) => [k, { v: v.verdict, p95: v.frames && v.frames.p95, lt: v.longTaskCount }])),
    peel: r.actions.peelOnion && { v: r.actions.peelOnion.verdict, p95: r.actions.peelOnion.frames && r.actions.peelOnion.frames.p95, lt: r.actions.peelOnion.longTaskCount, meta: r.actions.peelOnion.actionMeta },
    scroll: r.actions.scrollTimeline && { v: r.actions.scrollTimeline.verdict, p95: r.actions.scrollTimeline.frames && r.actions.scrollTimeline.frames.p95, lt: r.actions.scrollTimeline.longTaskCount },
  }));
  writeFileSync(path.join(OUT, 'perf-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify({ out: OUT, summary }, null, 2));
})().catch((e) => {
  console.error(String(e && e.stack || e));
  process.exit(1);
});
