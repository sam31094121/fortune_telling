import { chromium } from 'playwright';
import fs from 'fs';
const out = 'C:/Users/DRAGON/Desktop/命理/_stickiness-verify/home-order';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
const order = await page.evaluate(() => {
  const seen = new Set();
  const blocks = [];
  const candidates = Array.from(document.querySelectorAll('body *')).filter(el => {
    if (!(el instanceof HTMLElement)) return false;
    const r = el.getBoundingClientRect();
    if (r.height < 48 || r.width < 180) return false;
    const id = el.id || '';
    const cls = el.className?.toString?.() || '';
    const tag = el.tagName;
    return id || /section|hero|quest|feature|trust|footer|motto|taiji|card|pulse|orb|gate/i.test(cls+id) || tag === 'SECTION' || tag === 'HEADER' || tag === 'FOOTER';
  });
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    const key = `${Math.round(r.top)}:${el.id}:${(el.className||'').toString().slice(0,40)}`;
    if (seen.has(key)) continue;
    const text = (el.innerText || '').replace(/\s+/g,' ').trim().slice(0,90);
    if (!text && r.height < 80) continue;
    seen.add(key);
    blocks.push({
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
      id: el.id || null,
      cls: (el.className||'').toString().slice(0,70),
      tag: el.tagName,
      text,
      inFirstFold: r.top < 844 && r.bottom > 0,
    });
  }
  blocks.sort((a,b)=>a.top-b.top);
  const filtered = [];
  for (const b of blocks) {
    const last = filtered[filtered.length-1];
    if (last && Math.abs(last.top - b.top) < 50) {
      if (b.height > last.height) filtered[filtered.length-1] = b;
      continue;
    }
    filtered.push(b);
  }
  return filtered.slice(0, 45);
});
await page.screenshot({ path: out + '/01-first-fold.png', fullPage: false });
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(600);
await page.screenshot({ path: out + '/02-mid.png', fullPage: false });
await page.evaluate(() => window.scrollTo(0, 1600));
await page.waitForTimeout(600);
await page.screenshot({ path: out + '/03-lower.png', fullPage: false });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(600);
await page.screenshot({ path: out + '/04-bottom.png', fullPage: false });
// also try click 開始 if visible
const started = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button,a'));
  const b = btns.find(x => /開始/.test(x.textContent||''));
  if (b) { b.click(); return true; }
  return false;
});
await page.waitForTimeout(1500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: out + '/05-after-start.png', fullPage: false });
fs.writeFileSync(out + '/order.json', JSON.stringify({ started, order }, null, 2), 'utf8');
console.log(JSON.stringify({ started, count: order.length, order }, null, 2));
await browser.close();
