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
      await context.addInitScript(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (key === 'tdh_beast_collection_v1' && value.includes('qa:0')) {
            const data = JSON.parse(value);
            data.cards = Array.from({ length: 8 }, (_, i) => ({ id: `qa:${i}`, cardId: `beast_a${String(i + 1).padStart(2, '0')}`, source: 'DUEL_WIN', at: '2026-09-07' }));
            value = JSON.stringify(data);
          }
          return original.call(this, key, value);
        };
      });
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
        const geometry = await picker.evaluate(e => ({ width: e.clientWidth, total: e.scrollWidth, viewport: innerWidth }));
        assert.ok(geometry.width < geometry.viewport, 'Picker stays inside the phone instead of being clipped');
        assert.ok(geometry.total > geometry.width, 'Eight cards provide horizontal overflow');
        const touch = await context.newCDPSession(page);
        const bounds = await picker.boundingBox();
        const startX = bounds.x + bounds.width - 20, touchY = bounds.y + 55;
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: touchY }] });
        for (let step = 1; step <= 10; step++) {
          await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX - step * (bounds.width - 40) / 10, y: touchY }] });
          await page.waitForTimeout(20);
        }
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(200);
        assert.ok(await picker.evaluate(e => e.scrollLeft) > 30, 'Horizontal finger swipe moves the card list');
        await touch.detach();
        await page.waitForTimeout(1000);
        await picker.getByRole('button').last().tap();
        assert.equal(await picker.getByRole('button').last().getAttribute('aria-pressed'), 'true', 'Last collected card is reachable');
        await picker.getByRole('button').last().tap();
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
          await page.waitForTimeout(1000);
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
