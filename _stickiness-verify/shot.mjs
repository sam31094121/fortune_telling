import { chromium } from 'playwright';
const out = 'C:/Users/DRAGON/Desktop/命理/_stickiness-verify';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/02-home-mobile.png`, fullPage: false });
const start = page.locator('[data-quest-action="start"]').first();
if (await start.count()) {
  await start.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${out}/03-after-start.png`, fullPage: false });
  console.log('clicked start');
} else {
  console.log('no start button');
}
await page.locator('#home-eight-card-route').scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/04-features.png`, fullPage: false });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/05-trust-footer.png`, fullPage: false });
const body = await page.content();
console.log('hasPrimaryLabel', body.includes('今日主推'));
console.log('hasTrustNew', body.includes('只增不減') || body.includes('都會累加'));
console.log('hasTrustOld', body.includes('永久累計'));
console.log('hasChipHint', body.includes('先做這一件') || body.includes('也可改選'));
await browser.close();
