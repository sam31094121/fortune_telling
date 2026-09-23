import { chromium } from 'playwright';
import fs from 'fs';
const out = 'C:/Users/DRAGON/Desktop/命理/_stickiness-verify/home-order';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3500);
const report = await page.evaluate(() => {
  const pick = (sel) => Array.from(document.querySelectorAll(sel)).map(el => {
    const r = el.getBoundingClientRect();
    return {
      step: el.getAttribute('data-home-step'),
      top: Math.round(r.top + window.scrollY),
      vt: Math.round(r.top),
      text: (el.innerText || '').replace(/\s+/g,' ').trim().slice(0,55),
      id: el.id || null,
      cls: (el.className || '').toString().slice(0,48),
    };
  });
  const steps = pick('[data-home-step]').sort((a,b)=>a.top-b.top);
  const hasTrustReceipt = !!document.querySelector('.home-trust-receipt') && getComputedStyle(document.querySelector('.home-trust-receipt')).display !== 'none' && document.querySelector('.home-trust-receipt').offsetParent !== null;
  const sticky = document.querySelector('.home-sticky-journey');
  const hasSticky = !!(sticky && sticky.offsetParent !== null);
  const fold = steps.filter(s => s.vt < 844 && s.vt + 40 > 0);
  return {
    fold,
    steps: steps.map(s => ({ step: s.step, top: s.top, text: s.text, id: s.id })),
    hasTrustReceipt,
    hasSticky,
    bodyHasTrustText: (document.body.innerText || '').includes('信任收據'),
    bodyHasSticky: (document.body.innerText || '').includes('今日主線'),
  };
});
await page.screenshot({ path: out + '/30-order17-v2-fold.png', fullPage: false });
await page.evaluate(() => window.scrollTo(0, 750));
await page.waitForTimeout(500);
await page.screenshot({ path: out + '/31-order17-v2-mid.png', fullPage: false });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(500);
await page.screenshot({ path: out + '/32-order17-v2-bottom.png', fullPage: false });
console.log(JSON.stringify(report, null, 2));
await browser.close();
