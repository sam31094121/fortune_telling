import { chromium } from 'playwright';
import fs from 'fs';
const out = 'C:/Users/DRAGON/Desktop/命理/_stickiness-verify/home-order';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
const steps = await page.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll('[data-home-step]'));
  return nodes.map(el => {
    const r = el.getBoundingClientRect();
    return {
      step: el.getAttribute('data-home-step'),
      top: Math.round(r.top + window.scrollY),
      h: Math.round(r.height),
      label: (el.getAttribute('aria-label') || el.id || el.className?.toString?.().slice(0,40) || '').toString().slice(0,60),
      text: (el.innerText || '').replace(/\s+/g,' ').trim().slice(0,70),
    };
  }).sort((a,b)=>a.top-b.top);
});
const firstFold = await page.evaluate(() => {
  const items = [];
  for (const el of document.querySelectorAll('[data-home-step], .home-top-motto-link, .home-primary-quest-wrap, .home-trust-receipt, .home-sticky-journey')) {
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= 844) continue;
    items.push({
      step: el.getAttribute('data-home-step'),
      top: Math.round(r.top),
      text: (el.innerText || '').replace(/\s+/g,' ').trim().slice(0,50),
      cls: (el.className||'').toString().slice(0,40),
    });
  }
  items.sort((a,b)=>a.top-b.top);
  return items;
});
await page.screenshot({ path: out + '/20-order17-fold.png', fullPage: false });
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(500);
await page.screenshot({ path: out + '/21-order17-mid.png', fullPage: false });
console.log(JSON.stringify({ firstFold, steps }, null, 2));
await browser.close();
