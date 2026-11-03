// Desktop WebKit mobile emulation only; not physical iPhone/Safari certification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webkit } = require('../scripts/card-preview/node_modules/playwright-core');
const base = process.env.SCREEN_HEALTH_BASE_URL || 'http://localhost:8888';
const reportPath = path.resolve('reports/ghost-asura-webkit-mobile-2026-11-03.json');
const report = { scope: 'Desktop WebKit mobile emulation, not physical iPhone Safari', base, passed: false, checks: [], errors: [] };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser;
(async () => {
  browser = await webkit.launch({ headless: true });
  report.engine = browser.version();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on('pageerror', (error) => report.errors.push(error.message));
  await page.addInitScript(() => {
    window.__asuraReadRequests = [];
    const original = window.fetch;
    window.fetch = async function(input, options) {
      const reading = String(input).includes('/api/ghost-asura/reading');
      const record = reading ? { input: JSON.parse(options.body), start: performance.now() } : null;
      if (record) window.__asuraReadRequests.push(record);
      try {
        const response = await original.call(this, input, options);
        if (record) { record.finished = performance.now(); record.status = response.status; }
        return response;
      } catch (error) { if (record) { record.failed = true; record.finished = performance.now(); } throw error; }
    };
  });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const homeLink = page.locator('a[href="/ghost-asura"]').first();
  await homeLink.waitFor();
  await homeLink.tap();
  const main = page.locator('main[data-page="ghost-asura"]');
  await main.locator('input[aria-label="民國年"]').waitFor();
  await main.getByRole('button', { name: '親朋好友', exact: true }).tap();
  await main.locator('input[aria-label="民國年"]').fill('79');
  await main.locator('input[aria-label="月份"]').fill('5');
  await main.locator('input[aria-label="日期"]').fill('20');
  await main.locator('[data-field="gender"]').getByRole('button', { name: /男性/ }).tap();
  await main.locator('[data-field="birthHourBranch"]').getByRole('button', { name: /我知道出生時辰/ }).tap();
  await main.locator('[data-field="birthHourBranch"]').getByRole('button', { name: /未時/ }).tap();
  const ready = page.locator('[data-ghost-asura-result="ready"]');
  let lastSubmit = 0;
  async function submit() { await sleep(Math.max(0, 7000 - (Date.now() - lastSubmit))); lastSubmit = Date.now(); await main.locator('button[type="submit"]').tap(); }
  async function geometry(width) {
    const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, canvas: [...document.querySelectorAll('main[data-page="ghost-asura"] canvas')].map((c) => ({ width: c.width, height: c.height })) }));
    assert.equal(size.width, width);
    assert.ok(size.scrollWidth <= width + 1, 'no horizontal page overflow');
    assert.ok(size.canvas.length <= 1, 'at most one Asura canvas');
    return size;
  }
  await submit();
  await ready.waitFor();
  await sleep(3500);
  report.checks.push({ name: 'homepage touch entry, birth form and real result', geometry: await geometry(390), request: await page.evaluate(() => { const r = window.__asuraReadRequests.at(-1); return { status: r.status, elapsedMs: Math.round(r.finished - r.start) }; }) });
  const conversation = page.locator('[data-asura-conversation]');
  await conversation.waitFor();
  for (const [index, label] of ['看懂現在的解讀', '看依據', '看行動提醒'].entries()) {
    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/ghost-asura/conversation') && response.request().method() === 'POST');
    await conversation.getByRole('button', { name: label, exact: true }).tap();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    const data = await response.json();
    assert.deepEqual(response.request().postDataJSON().birthInput, await page.evaluate(() => window.__asuraReadRequests.at(-1).input), 'followup uses exact successful reading snapshot');
    await conversation.locator(`[data-asura-conversation-step="${index + 1}"]`).waitFor();
    assert.equal(await conversation.locator('[data-asura-conversation-answer]').last().textContent(), data.answer);
    assert.equal(await conversation.locator('[data-asura-conversation-scope]').last().textContent(), data.scopeNote);
  }
  report.checks.push({ name: 'homepage three-step touch guide preserves exact backend answer, scope and submitted profile' });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    const detail = ready.locator('details').first();
    await detail.locator('summary').tap();
    assert.equal(await detail.evaluate((e) => e.open), true);
    await detail.locator('summary').tap();
    assert.equal(await detail.evaluate((e) => e.open), false);
    report.checks.push({ name: `${width}px touch details toggle`, geometry: await geometry(width) });
  }
  await main.locator('input[aria-label="日期"]').fill('21');
  await ready.waitFor({ state: 'detached' });
  assert.equal(await conversation.count(), 0, 'editing birth input removes old conversation');
  await submit();
  await ready.waitFor();
  assert.equal(await page.locator('[data-asura-conversation-answer]').count(), 0, 'new reading starts with empty conversation history');
  assert.equal(await page.evaluate(() => window.__asuraReadRequests.at(-1).input.birthDate), '1990-05-21');
  report.checks.push({ name: 'changed-date rerun gets current person result', geometry: await geometry(320) });
  await main.locator('input[aria-label="日期"]').fill('22');
  await context.setOffline(true);
  await submit();
  await page.waitForFunction(() => window.__asuraReadRequests.at(-1)?.failed === true && !document.querySelector('main[data-page="ghost-asura"] fieldset')?.disabled);
  assert.equal(await ready.count(), 0, 'failed request does not show previous result');
  report.checks.push({ name: 'offline submit unlocks form and does not show stale result' });
  await context.setOffline(false);
  await submit();
  await ready.waitFor();
  assert.equal(await page.evaluate(() => window.__asuraReadRequests.at(-1).input.birthDate), '1990-05-22');
  assert.equal(await page.evaluate(() => window.__asuraReadRequests.length), 4, 'manual retries only, no automatic loop');
  report.checks.push({ name: 'network restored manual retry succeeds', geometry: await geometry(320) });
  await main.locator('a[href="/"]').tap();
  await main.waitFor({ state: 'detached' });
  await page.locator('a[href="/ghost-asura"]').first().tap();
  await main.locator('input[aria-label="民國年"]').waitFor();
  assert.ok(await main.locator('canvas').count() <= 1);
  report.checks.push({ name: 'return home and reenter has single canvas and usable form' });
  assert.deepEqual(report.errors, [], 'no uncaught page exceptions');
  report.passed = true;
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => { report.failure = error.message; console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
});
