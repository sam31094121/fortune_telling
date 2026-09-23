import { chromium } from 'playwright';
const out = 'C:/Users/DRAGON/Desktop/命理/_stickiness-verify';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2800);
await page.screenshot({ path: out + '/09-hero-v3.png', fullPage: false });
const start = page.locator('[data-quest-action="start"]').first();
const box = await start.boundingBox();
const order = await page.evaluate(() => {
  const q = document.querySelector('.home-primary-quest-wrap');
  const t = document.querySelector('.home-top-brand-stage');
  const m = document.querySelector('.home-top-motto-link');
  const p = document.querySelector('.home-trust-pulse');
  const stack = document.querySelector('.home-first-screen-stack');
  return {
    hasStack: !!stack,
    mottoTop: m?.getBoundingClientRect().top ?? null,
    questTop: q?.getBoundingClientRect().top ?? null,
    taijiTop: t?.getBoundingClientRect().top ?? null,
    pulseTop: p?.getBoundingClientRect().top ?? null,
    taijiH: t?.getBoundingClientRect().height ?? null,
  };
});
console.log(JSON.stringify({ startBox: box, startInFirstScreen: box ? (box.y + box.height) <= 830 : false, order }, null, 2));
await start.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: out + '/10-after-start-v3.png', fullPage: false });
await browser.close();
