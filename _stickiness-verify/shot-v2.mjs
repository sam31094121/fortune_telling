import { chromium } from 'playwright';
const out = 'C:/Users/DRAGON/Desktop/命理/_stickiness-verify';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/06-hero-v2.png`, fullPage: false });
const start = page.locator('[data-quest-action="start"]').first();
const startBox = await start.boundingBox().catch(() => null);
console.log('startBox', JSON.stringify(startBox));
console.log('startInFirstScreen', startBox ? (startBox.y + startBox.height) <= 820 : false);
const body = await page.content();
console.log('hasReturnPromise', body.includes('每天一件事，明天回來繼續'));
console.log('hasTrustPulse', body.includes('社群信任可見'));
if (await start.count()) {
  await start.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/07-after-start-v2.png`, fullPage: false });
  console.log('hasChipHint', (await page.content()).includes('先做這一件'));
}
await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);
await page.locator('.home-trust-pulse').first().click({ timeout: 4000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/08-trust-anchor.png`, fullPage: false });
const trustVisible = await page.locator('#home-trust-strip').first().isVisible().catch(() => false);
console.log('trustStripVisibleAfterPulse', trustVisible);
await browser.close();
