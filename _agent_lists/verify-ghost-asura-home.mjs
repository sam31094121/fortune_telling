import { chromium } from '../_stickiness-verify/node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';
import { join } from 'path';

const outDir = join(process.cwd(), 'tmp', 'ghost-asura-verify');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://127.0.0.1:8888/', { waitUntil: 'networkidle', timeout: 90000 });

const card = page.locator('[data-card-type="ghost-asura-home-standalone"]');
await card.first().waitFor({ state: 'attached', timeout: 30000 });
await card.first().scrollIntoViewIfNeeded();
await page.waitForTimeout(500);

const style = await card.first().evaluate((el) => {
  const cs = getComputedStyle(el);
  return { display: cs.display, visibility: cs.visibility, opacity: cs.opacity };
});
const text = await card.first().innerText();
const href = await card.first().getAttribute('href');
const box = await card.first().boundingBox();

const checks = {
  cardPresent: true,
  displayNotNone: style.display !== 'none',
  hasBenMing: text.includes('本命阿修羅'),
  hasMingHun: text.includes('命魂戰局'),
  hasStatus: text.includes('印記覺醒') || text.includes('印記沉眠'),
  hrefDualChart: href === '/dual-chart',
  hasBox: !!(box && box.height > 40),
};

if (checks.displayNotNone) {
  await card.first().screenshot({ path: join(outDir, 'home-card-390.png') });
}
await page.screenshot({ path: join(outDir, 'home-full-390.png'), fullPage: true });

await page.setViewportSize({ width: 1280, height: 800 });
await card.first().scrollIntoViewIfNeeded();
const deskDisplay = await card.first().evaluate((el) => getComputedStyle(el).display);
await page.screenshot({ path: join(outDir, 'home-desk.png'), fullPage: false });

console.log(JSON.stringify({ checks, style, box, deskDisplay, textPreview: text.slice(0, 240), errors }, null, 2));

const failed = Object.entries(checks).filter(([, v]) => !v);
if (failed.length || deskDisplay === 'none') {
  console.error('VERIFY_FAILED', failed, { deskDisplay });
  process.exit(1);
}

console.log('VERIFY_PASSED');
await browser.close();
