import { chromium } from 'playwright';
const out = 'C:/Users/DRAGON/Desktop/命理/_stickiness-verify';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const url = 'https://heaven-earth-humanity-pair.vercel.app/';
let last = null;
for (let i = 0; i < 12; i++) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  const html = await page.content();
  const hasHonest = html.includes('只增不減') || html.includes('每次點選都會累加');
  const hasForever = html.includes('永久累計');
  const start = page.locator('[data-quest-action="start"]').first();
  const box = await start.boundingBox().catch(() => null);
  last = { i, hasHonest, hasForever, startBox: box, startInFirstScreen: box ? (box.y + box.height) <= 830 : false };
  console.log(JSON.stringify(last));
  if (hasHonest && !hasForever) break;
  await page.waitForTimeout(8000);
}
await page.screenshot({ path: out + '/12-live-a1.png', fullPage: false });
await browser.close();
