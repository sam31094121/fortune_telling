const assert = require('node:assert/strict');
const { chromium } = require('../scripts/card-preview/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.env.SCREEN_HEALTH_BASE_URL || 'http://localhost:8888') + '/zodiac');
    await page.getByRole('button', { name: /親朋好友/ }).click();
    await page.locator('#zodiac-name-input').fill('測試客戶');
    await page.getByLabel('西元年', { exact: true }).fill('1990');
    await page.getByLabel('月份', { exact: true }).fill('5');
    await page.getByLabel('日期', { exact: true }).fill('20');
    await page.getByRole('button', { name: /不知道出生時間/ }).click();
    const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/analysis/jobs') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /開始 易經西洋星座分析/ }).click();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    const data = await response.json();
    assert.equal(data.result.engineVersion, 'zodiac_core_v5_asura');
    await page.getByRole('heading', { name: /第二層.*阿修羅/ }).waitFor();
    await page.getByRole('heading', { name: /第三層.*阿修羅/ }).waitFor();
    const narrative = await page.getByRole('heading', { name: /第二層.*阿修羅/ }).locator('..').locator('p').last().textContent();
    assert.equal(narrative, data.result.deepAnalysis.coreNarrative);
    await page.getByRole('heading', { name: '你的星盤表達特質', exact: true }).waitFor();
    assert.equal(await page.getByRole('region', { name: '阿修羅重點解讀' }).locator('p').textContent(), data.result.deepAnalysis.coreNarrative);
    assert.equal(await page.locator('[data-active="false"]').count(), 0);
    const raw = page.locator('details').filter({ has: page.getByText('查看計算依據', { exact: true }) }).first();
    assert.equal(await raw.evaluate(e => e.open), false);
    await raw.locator('summary').click();
    assert.equal(await raw.evaluate(e => e.open), true);
    assert.ok((await raw.textContent()).includes('加權分數：'));
    assert.ok(!(await page.locator('body').innerText()).includes('AI 深度'));
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
    }
    assert.deepEqual(errors, []);
    console.log('PASS zodiac mobile UI: real guest input/API, Asura source wording, 390/320px, no page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
