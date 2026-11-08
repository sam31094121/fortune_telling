const { chromium } = require('C:/Users/DRAGON/Desktop/命理/scripts/card-preview/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const OUT = 'C:/Users/DRAGON/Desktop/命理/_tmp_ghost_asura_shot/final5';
const XFER = 'C:/Users/DRAGON/bead-card-xfer/ghost-asura-48/final5';
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(XFER, { recursive: true });
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:8888/ghost-asura', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.addStyleTag({ content: `nextjs-portal,[data-nextjs-toast],[data-next-badge],#__next-build-watcher,[data-nextjs-dialog-overlay]{display:none!important;visibility:hidden!important;opacity:0!important}` });
  console.log('loaded');
  await page.getByRole('button', { name: /我自己/ }).first().click();
  await page.locator('[data-field="birthDate"] input[aria-label="民國年"]').fill('63');
  await page.locator('[data-field="birthDate"] input[aria-label="月份"]').fill('6');
  await page.locator('[data-field="birthDate"] input[aria-label="日期"]').fill('28');
  await page.getByRole('button', { name: /^男性/ }).click();
  await page.getByRole('button', { name: /我知道出生時辰/ }).click();
  await sleep(400);
  const hourBtn = page.locator('button').filter({ hasText: /^\s*酉時/ }).first();
  await hourBtn.click();
  await page.getByRole('button', { name: /開啟命魂戰局/ }).click();
  console.log('submitted');
  await page.waitForSelector('[data-asura-age-here]', { timeout: 120000 });
  console.log('timeline ready');
  await sleep(2500);
  await page.addStyleTag({ content: `nextjs-portal,[data-nextjs-toast],[data-next-badge],#__next-build-watcher{display:none!important}` });
  await page.evaluate(() => {
    const cur = document.querySelector('[data-asura-age-segment][data-current="true"]') || document.querySelector('[data-asura-age-here]');
    if (cur) cur.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy(0, -8);
  });
  await sleep(200);
  const restartInfo = await page.evaluate(() => {
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
    for (const n of nodes) { n.style.animation = ''; n.style.opacity = ''; void n.offsetWidth; n.style.animation='none'; void n.offsetWidth; n.style.animation=''; }
    return { count: nodes.length, bridges: document.querySelectorAll('[data-asura-age-bridge],[class*="motionBridge"]').length };
  });
  console.log('restart', restartInfo);
  const measure = async (label) => page.evaluate((label) => {
    const bridges = [...document.querySelectorAll('[data-asura-age-bridge], [class*="motionBridge"]')].slice(0,6).map(el => {
      const cs = getComputedStyle(el);
      return { op: +(+cs.opacity).toFixed(3), delay: cs.animationDelay, text: (el.innerText||'').replace(/\s+/g,' ').slice(0,48) };
    });
    const segs = [...document.querySelectorAll('[class*="motionSegment"]')].slice(0,6).map(el => +(+getComputedStyle(el).opacity).toFixed(3));
    const cur = document.querySelector('[data-asura-age-segment][data-current="true"]');
    const here = document.querySelector('[data-asura-age-here]');
    const viewer = document.querySelector('[data-asura-age-viewer]');
    return {
      label,
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
  }, label);
  const save = async (name) => {
    const p1 = path.join(OUT, name); const p2 = path.join(XFER, name);
    await page.screenshot({ path: p1 });
    fs.copyFileSync(p1, p2);
    return fs.statSync(p1).size;
  };
  const metrics = { restart: restartInfo, frames: {} };
  metrics.frames.t0 = await measure('t0');
  const b0 = await save('motion-390-t0.png');
  await sleep(180);
  metrics.frames.t180 = await measure('t180');
  const b180 = await save('motion-390-t180.png');
  await sleep(320);
  metrics.frames.t500 = await measure('t500');
  const b500 = await save('motion-390-t500.png');
  fs.writeFileSync(path.join(OUT, 'motion-390-tframes-metrics.json'), JSON.stringify(metrics, null, 2));
  fs.copyFileSync(path.join(OUT, 'motion-390-tframes-metrics.json'), path.join(XFER, 'motion-390-tframes-metrics.json'));
  console.log(JSON.stringify({ bytes:{t0:b0,t180:b180,t500:b500}, metrics }, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
