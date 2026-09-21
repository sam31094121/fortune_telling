const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:8888/', { waitUntil: 'networkidle', timeout: 60000 });
  const el = page.locator('a[href="/3D"]').first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await el.screenshot({ path: 'C:/Users/DRAGON/Desktop/命理/scripts/card-preview/card-only.png' });
  console.log('shot ok');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
