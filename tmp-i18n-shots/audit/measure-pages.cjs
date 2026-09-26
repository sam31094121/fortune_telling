// Read-only audit: loads each route at 390x844 with each interface language and records visible text.
// Usage: node measure-pages.cjs [base] [routes comma list]
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..', '..');
const { chromium } = require(path.join(root, 'scripts', 'card-preview', 'node_modules', 'playwright-core'));
const collect = require('./collect.js');
const base = process.argv[2] || 'http://localhost:8888';
const routes = (process.argv[3] || '/,/match,/bazi,/nameology,/numerology,/zodiac,/red-luan-heartbeat,/tarot,/insight,/music,/star-beasts,/growth-center,/beast-game').split(',');
const langs = ['zh-Hant', 'zh-Hans', 'en', 'ja', 'ko'];
const outDir = path.join(__dirname, 'out'); const shotDir = path.join(outDir, 'shots');
fs.mkdirSync(shotDir, { recursive: true });
const resultFile = path.join(outDir, 'pages.json');
const results = fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile, 'utf8')) : {};
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  for (const route of routes) {
    for (const lang of langs) {
      const key = route + '|' + lang; const t0 = Date.now();
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'zh-TW' });
      await ctx.addInitScript((l) => { try { localStorage.setItem('interface-reading-language-v1', l); } catch {} }, lang);
      const page = await ctx.newPage(); const errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 200)));
      try {
        await page.goto(base + route, { waitUntil: 'networkidle', timeout: 240000 }).catch(e => errors.push('goto: ' + e.message.slice(0, 120)));
        await page.waitForTimeout(3000);
        await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
        const data = await page.evaluate(collect);
        const slug = (route === '/' ? 'home' : route.slice(1).replace(/\//g, '_'));
        await page.screenshot({ path: path.join(shotDir, `${slug}-${lang}-top.png`) });
        results[key] = { route, lang, ms: Date.now() - t0, errors, ...data };
        console.log(key, 'ok', data.text.length, 'chars', Date.now() - t0, 'ms');
      } catch (e) { results[key] = { route, lang, error: String(e.message).slice(0, 300), errors }; console.log(key, 'ERR', e.message.slice(0, 120)); }
      fs.writeFileSync(resultFile, JSON.stringify(results));
      await ctx.close();
    }
  }
  await browser.close();
  console.log('DONE_PAGES');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
