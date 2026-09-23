const { execFileSync } = require('child_process');
const fs = require('fs');
const chrome = process.env.CHROME_PATH;
const outDir = 'C:/Users/DRAGON/Desktop/\u547d\u7406/_michelin-verify/gate1-gate3';
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=390,844']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:8888/', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: outDir + '/01-top.png' });
  await page.evaluate(() => window.scrollBy(0, 650));
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: outDir + '/02-features.png' });
  const btn = await page.$('.home-feature-more-toggle');
  if (btn) {
    await btn.click();
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: outDir + '/03-expanded.png' });
  }
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('h2,p')].find(n => (n.textContent||'').includes('成長中心') || (n.textContent||'').includes('寶珠'));
    el?.scrollIntoView({ block: 'center' });
  });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: outDir + '/04-growth.png' });
  const html = await page.content();
  fs.writeFileSync(outDir + '/probe-runtime.txt', [
    'sticky=' + html.includes('home-sticky-journey'),
    'toggle=' + html.includes('home-feature-more-toggle'),
    'collapsed=' + html.includes('home-feature-stack--collapsed'),
    'bridge=' + html.includes('記入成長中心'),
    'gate3=' + (html.includes('明天回來進度還在') || html.includes('尚未走完')),
  ].join('\n'));
  await browser.close();
  console.log('SHOT_OK');
})().catch(e => { console.error(e); process.exit(1); });
