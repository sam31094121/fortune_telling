const fs = require('fs');
const path = require('path');
const outDir = 'C:/Users/DRAGON/Desktop/\u547d\u7406/_michelin-verify/gate1-gate3';
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
      await page.goto('http://127.0.0.1:8888/', { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(outDir, '01-top.png'), fullPage: false });
      await page.evaluate(() => window.scrollBy(0, 700));
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, '02-mid.png'), fullPage: false });
      const btn = await page.$('.home-feature-more-toggle');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(outDir, '03-expanded.png'), fullPage: false });
      }
      await page.evaluate(() => document.querySelector('.home-growth-entry, [aria-label*="成長"]')?.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, '04-growth.png'), fullPage: false });
      const html = await page.content();
      fs.writeFileSync(path.join(outDir, 'probe.txt'), [
        'sticky=' + /home-sticky-journey/.test(html),
        'toggle=' + /home-feature-more-toggle/.test(html),
        'collapsed=' + /home-feature-stack--collapsed/.test(html),
        'bridge=' + /記入成長中心|growthBridge/.test(html),
        'gate3=' + /明天回來進度還在|尚未走完/.test(html),
      ].join('\n'));
      await browser.close();
      console.log('PUPPETEER_OK');
      return;
    } catch (e) {
      console.error('no browser', e.message);
      process.exit(1);
    }
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:8888/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, '01-top.png') });
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '02-mid.png') });
  const btn = page.locator('.home-feature-more-toggle');
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, '03-expanded.png') });
  }
  await page.locator('.home-growth-entry, [aria-label*=\"成長\"]').first().scrollIntoViewIfNeeded().catch(()=>{});
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, '04-growth.png') });
  const html = await page.content();
  fs.writeFileSync(path.join(outDir, 'probe.txt'), [
    'sticky=' + /home-sticky-journey/.test(html),
    'toggle=' + /home-feature-more-toggle/.test(html),
    'collapsed=' + /home-feature-stack--collapsed/.test(html),
    'bridge=' + /記入成長中心/.test(html),
    'gate3=' + /明天回來進度還在|尚未走完/.test(html),
  ].join('\n'));
  await browser.close();
  console.log('PLAYWRIGHT_OK');
}
main().catch(e => { console.error(e); process.exit(1); });
