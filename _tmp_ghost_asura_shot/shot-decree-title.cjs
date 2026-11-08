const { spawn } = require('child_process');
const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { mkdtempSync } = require('os');
const path = require('path');
const os = require('os');

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => existsSync(p));
if (!EDGE) throw new Error('no browser');

const OUT_DIR = 'C:\\Users\\DRAGON\\Desktop\\命理\\_tmp_ghost_asura_shot';
const XFER = 'C:\\Users\\DRAGON\\bead-card-xfer\\ghost-asura-48';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(XFER, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9500 + Math.floor(Math.random() * 80);
const profile = mkdtempSync(path.join(os.tmpdir(), 'asura-title-shot-'));
const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--hide-scrollbars',
  '--window-size=390,844',
  'about:blank',
], { stdio: 'ignore' });

(async () => {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(400);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) throw new Error('browser not ready');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
    return r.result?.result?.value;
  };
  const waitFor = async (expr, ms = 120000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await evalJs(expr)) return;
      await sleep(300);
    }
    throw new Error('timeout: ' + expr);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await send('Page.navigate', { url: 'http://localhost:8888/ghost-asura' });
  await waitFor(`document.readyState === 'complete' && !!document.querySelector('button')`);
  await sleep(2000);

  // Prefer direct reading API via page fetch (same-origin) then inject? Better: fill form.
  const clickStarts = async (txt) =>
    evalJs(`(() => { const el = [...document.querySelectorAll('button')].find(e => (e.textContent||'').trim().startsWith(${JSON.stringify(txt)})); if (!el) return false; el.click(); return true; })()`);

  await clickStarts('我自己');
  await sleep(300);
  // open calendar / fill date - try year/month/day inputs
  const filled = await evalJs(`(() => {
    const labels = ['民國年','年份','日期'];
    const values = ['63','6','28'];
    let ok = 0;
    for (let i=0;i<3;i++) {
      const nodes = document.querySelectorAll('main[data-page="ghost-asura"] [data-field="birthDate"] input[aria-label="' + labels[i] + '"]');
      if (nodes.length === 1 && !nodes[0].disabled) {
        const el = nodes[0];
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, values[i]);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        if (el.value === values[i]) ok++;
      }
    }
    return ok;
  })()`);
  if (filled !== 3) {
    // alternate: click 國曆生日 path
    await clickStarts('國曆');
    await sleep(200);
  }
  await sleep(300);
  await clickStarts('男性');
  await sleep(300);
  await clickStarts('我知道出生時辰');
  await sleep(800);
  // click 酉時 card
  const you = await evalJs(`(() => {
    const el = [...document.querySelectorAll('button,[role=button],div')].find(e => /^\\s*酉時/.test((e.textContent||'').trim()) || (e.textContent||'').includes('酉時') && (e.textContent||'').includes('17:00'));
    if (!el) return null;
    el.click();
    return (el.textContent||'').slice(0,40);
  })()`);
  await sleep(500);
  await evalJs(`(() => { const b = document.querySelector('button[type=submit]'); if (b) b.click(); return !!b; })()`);
  await waitFor(`document.body.innerText.includes('千人千面戰神令') || document.body.innerText.includes('修羅戰令')`, 90000);
  await sleep(2500);

  // scroll decree into view
  await evalJs(`(() => {
    const el = [...document.querySelectorAll('*')].find(e => (e.textContent||'').includes('千人千面戰神令') && e.children.length);
    if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
    return !!el;
  })()`);
  await sleep(500);

  const textCheck = await evalJs(`(() => {
    const t = document.body.innerText;
    return {
      hasTitleBlock: t.includes('千人千面戰神令'),
      hasNew: t.includes('修羅戰令') && !t.includes('收束判詞'),
      hasOld: t.includes('收束判詞'),
      snippet: (t.match(/【?修羅戰令[^\\n]{0,20}/) || [null])[0],
      decreeBlock: (() => {
        const i = t.indexOf('千人千面戰神令');
        return i >= 0 ? t.slice(i, i+280) : null;
      })()
    };
  })()`);

  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const buf = Buffer.from(shot.result.data, 'base64');
  const out1 = path.join(OUT_DIR, 'decree-title-after-390.png');
  const out2 = path.join(XFER, 'decree-title-after-390.png');
  writeFileSync(out1, buf);
  writeFileSync(out2, buf);

  // also capture element-focused: larger viewport scroll to decree + clip if possible
  const clip = await evalJs(`(() => {
    const nodes = [...document.querySelectorAll('*')].filter(e => (e.textContent||'').includes('千人千面戰神令'));
    let best = null;
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      if (r.height > 80 && r.height < 2000 && r.width > 200) {
        if (!best || r.height < best.height) best = { x: r.x, y: r.y + window.scrollY, width: r.width, height: Math.min(r.height, 900), tag: n.tagName, cls: String(n.className||'').slice(0,60) };
      }
    }
    return best;
  })()`);
  let clipPath = null;
  if (clip) {
    await evalJs(`window.scrollTo(0, ${Math.max(0, Math.floor(clip.y - 20))})`);
    await sleep(400);
    const c2 = await evalJs(`(() => {
      const nodes = [...document.querySelectorAll('*')].filter(e => (e.textContent||'').includes('千人千面戰神令'));
      let best = null;
      for (const n of nodes) {
        const r = n.getBoundingClientRect();
        if (r.height > 80 && r.height < 2000 && r.width > 200) {
          if (!best || r.height < best.height) best = { x: Math.max(0,r.x), y: Math.max(0,r.y), width: Math.min(390,r.width), height: Math.min(700, r.height) };
        }
      }
      return best;
    })()`);
    if (c2 && c2.width > 0 && c2.height > 0) {
      const shot2 = await send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        clip: { x: c2.x, y: c2.y, width: c2.width, height: c2.height, scale: 1 },
      });
      clipPath = path.join(OUT_DIR, 'decree-title-after-390-clip.png');
      writeFileSync(clipPath, Buffer.from(shot2.result.data, 'base64'));
      writeFileSync(path.join(XFER, 'decree-title-after-390-clip.png'), Buffer.from(shot2.result.data, 'base64'));
    }
  }

  writeFileSync(path.join(OUT_DIR, 'decree-title-evidence.json'), JSON.stringify({ textCheck, clip, filled, you, out1, out2, clipPath }, null, 2), 'utf8');
  console.log(JSON.stringify({ textCheck, clip, filled, you, out1, out2, clipPath }, null, 2));
  try { ws.close(); } catch {}
  try { edge.kill(); } catch {}
  process.exit(textCheck && textCheck.hasNew && !textCheck.hasOld ? 0 : 4);
})().catch((e) => {
  console.error(String(e && e.stack || e));
  try { edge.kill(); } catch {}
  process.exit(1);
});
