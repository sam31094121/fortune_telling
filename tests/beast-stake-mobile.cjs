// Existing QA fixture in fresh browser storage. Select/replace/cancel only; never start a staked battle.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const output = '.tmp/stake-mobile';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    for (const [width, height] of [[320, 480], [390, 844], [768, 1024], [844, 390]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        await page.goto('http://127.0.0.1:8888/beast-game/qa-stakes');
        await page.getByRole('button', { name: '獨立測試卡組進入戰場', exact: true }).tap();
        await page.getByRole('button', { name: '手牌：井木犴', exact: true }).tap();
        await page.locator('[data-place-active]').tap();
        const collection = () => page.evaluate(() => localStorage.getItem('tdh_beast_collection_v1'));
        const before = await collection();
        await page.getByRole('button', { name: '押注確認', exact: true }).tap();
        const scroll = page.locator('[data-control-scroll]');
        const picker = page.getByRole('group', { name: '從收藏選一張押注', exact: true });
        if (width <= 600 || height <= 540) {
          assert.equal(await page.locator('[data-battle-visual]').isVisible(), false, 'Phone stake review gets a focused pane');
          const available = await scroll.evaluate(e => e.clientHeight);
          assert.ok(available >= 200, `Selection area is not squeezed into a narrow strip: ${available}px`);
        } else assert.equal(await page.locator('[data-battle-visual]').isVisible(), true, 'Tablet preview retained');
        await picker.getByRole('button').first().tap();
        assert.equal(await picker.locator('[aria-pressed="true"]').count(), 1);
        await picker.getByRole('button').nth(1).tap();
        assert.equal(await picker.locator('[aria-pressed="true"]').count(), 1, 'Replacing does not add a second stake');
        await page.waitForTimeout(150);
        const position = await scroll.evaluate(e => e.scrollTop);
        await page.waitForTimeout(250);
        assert.equal(await scroll.evaluate(e => e.scrollTop), position, 'No delayed jump back to the stake slot');
        assert.equal(await collection(), before, 'Selecting never removes collection cards');
        await page.screenshot({ path: `${output}/${width}-selected.png` });
        if (await scroll.evaluate(e => e.scrollHeight > e.clientHeight + 80)) {
          await scroll.evaluate(e => { e.scrollTop = 0; });
          const box = await scroll.boundingBox();
          const cdp = await context.newCDPSession(page);
          const x = box.x + box.width / 2, y = box.y + box.height - 20;
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
          for (let step = 1; step <= 6; step++) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 15 }] });
            await page.waitForTimeout(20);
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForTimeout(150);
          assert.ok(await scroll.evaluate(e => e.scrollTop) > 10, 'Touch swipe scrolls the stake pane');
          await cdp.detach();
        }
        await picker.getByRole('button').nth(1).tap();
        assert.equal(await picker.locator('[aria-pressed="true"]').count(), 0, 'Tap again cancels');
        assert.equal(await page.locator('[data-start-confirmation]').getAttribute('data-start-confirmation'), 'false');
        assert.equal(await collection(), before);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.getByRole('button', { name: '選卡佈陣', exact: true }).tap();
        assert.equal(await page.locator('[data-battle-visual]').isVisible(), true);
        assert.ok(await page.getByRole('button', { name: /你的主戰：井木犴/ }).count(), 'Formation survives navigation');
        assert.deepEqual(errors, []);
        console.log(`PASS ${width}×${height}: stake review, select/replace/cancel, stable scroll, unchanged collection and return`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
