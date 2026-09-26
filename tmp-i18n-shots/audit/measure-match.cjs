// Read-only audit of /match stage 2 (form, errors, confirmation) and stage 3 (results) in 5 languages.
// Interactions are done in zh-Hant; before each snapshot the language is switched via the same
// localStorage key + storage event the provider listens to, then switched back.
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..', '..');
const { chromium } = require(path.join(root, 'scripts', 'card-preview', 'node_modules', 'playwright-core'));
const collect = require('./collect.js');
const base = process.argv[2] || 'http://localhost:8888';
const langs = ['zh-Hant', 'zh-Hans', 'en', 'ja', 'ko'];
const outDir = path.join(__dirname, 'out'); const shotDir = path.join(outDir, 'match-shots');
fs.mkdirSync(shotDir, { recursive: true });
const people = [
  { name: '王小明', y: '79', m: '5', d: '15', hour: '午時', blood: 'A 型', gender: '男性' },   // 1990-05-15 12:00 male Taipei(default)
  { name: '林小美', y: '81', m: '8', d: '20', hour: '辰時', blood: 'O 型', gender: '女性' },   // 1992-08-20 08:00 female Taipei(default)
];
const result = { steps: {}, log: [] };
const save = () => fs.writeFileSync(path.join(outDir, 'match.json'), JSON.stringify(result));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'zh-TW' });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('interface-reading-language-v1', 'zh-Hant'); sessionStorage.setItem('seeded', '1'); } } catch {} });
  const page = await ctx.newPage();
  page.on('pageerror', e => result.log.push('pageerror: ' + e.message.slice(0, 200)));
  const setLang = async (l) => { await page.evaluate((v) => { localStorage.setItem('interface-reading-language-v1', v); window.dispatchEvent(new StorageEvent('storage', { key: 'interface-reading-language-v1', newValue: v })); }, l); await page.waitForTimeout(900); };
  const snap = async (step, opts = {}) => {
    result.steps[step] = {};
    for (const l of langs) {
      await setLang(l);
      if (opts.scroll) await page.evaluate(opts.scroll);
      await page.waitForTimeout(400);
      const data = await page.evaluate(collect);
      if (opts.region) data.region = await page.evaluate(opts.region);
      result.steps[step][l] = data;
      await page.screenshot({ path: path.join(shotDir, `${step}-${l}.png`) });
      if (opts.extraShots) {
        for (const [i, y] of opts.extraShots.entries()) { await page.evaluate(yy => window.scrollBy(0, yy), y); await page.waitForTimeout(450); await page.screenshot({ path: path.join(shotDir, `${step}-${l}-s${i + 1}.png`) }); }
      }
    }
    await setLang('zh-Hant'); save();
    console.log('snap', step);
  };
  await page.goto(base + '/match', { waitUntil: 'networkidle', timeout: 240000 });
  await page.waitForTimeout(2500);
  const toForm = () => { const el = document.querySelector('main input[type="text"]'); if (el) { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -140); } };
  await snap('1-form-empty', { scroll: toForm });
  // error state: press the next button with an empty form
  await page.getByRole('button', { name: /下一步：填第二位/ }).click().catch(e => result.log.push('next(empty): ' + e.message.slice(0, 120)));
  await page.waitForTimeout(900);
  await snap('2-form-error', { scroll: () => { const el = document.querySelector('.form-missing-alert'); if (el) { el.scrollIntoView({ block: 'center' }); } }, region: () => [...document.querySelectorAll('.form-missing-alert,[role="alert"],[role="status"]')].map(e => e.innerText).filter(Boolean) });
  for (const [i, p] of people.entries()) {
    try {
      await page.locator('input[type="text"]').first().fill(p.name);
      const nums = page.locator('input[inputmode="numeric"]');
      await nums.nth(0).fill(p.y); await nums.nth(1).fill(p.m); await nums.nth(2).fill(p.d);
      await page.waitForTimeout(700);
      await page.getByRole('button', { name: /我知道出生時辰/ }).click();
      await page.getByRole('button', { name: new RegExp(p.hour) }).first().click();
      await page.getByRole('button', { name: /我知道血型/ }).click();
      await page.getByRole('button', { name: new RegExp('^' + p.blood) }).first().click();
      await page.getByRole('button', { name: new RegExp('^' + p.gender) }).first().click();
      await page.waitForTimeout(400);
    } catch (e) { result.log.push(`fill p${i + 1}: ` + e.message.slice(0, 200)); }
    if (i === 0) await snap('3-form-p1-filled', { scroll: toForm, extraShots: [800, 800] });
    await page.getByRole('button', { name: i === 0 ? /下一步：填第二位/ : /下一步：確認資料/ }).click().catch(e => result.log.push('next: ' + e.message.slice(0, 120)));
    await page.waitForTimeout(1000);
  }
  await snap('4-review', { scroll: () => window.scrollTo(0, 0), extraShots: [700] });
  const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /立即開始/.test(x.innerText) && !/上一步/.test(x.innerText)); if (b) { b.click(); return b.innerText; } return null; });
  result.log.push('submit: ' + clicked);
  const ok = await page.waitForSelector('#match-result-anchor', { state: 'attached', timeout: 120000 }).then(() => true).catch(e => { result.log.push('no result anchor: ' + e.message.slice(0, 100)); return false; });
  if (ok) {
    await page.waitForTimeout(5000);
    await snap('5-result', {
      scroll: () => document.getElementById('match-result-anchor')?.scrollIntoView({ block: 'start' }),
      region: () => { const a = document.getElementById('match-result-anchor'); const r = a?.parentElement; return r ? r.innerText : ''; },
      extraShots: [844, 844, 844],
    });
  }
  save();
  await browser.close();
  console.log('DONE_MATCH', JSON.stringify(result.log));
})().catch(e => { console.error('FATAL', e); save(); process.exit(1); });
