// Fresh QA collection only. Never starts a staked battle or touches a customer account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
fs.mkdirSync('reports/beast-relaxed', { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const width of process.env.STAKE_TEST_WIDTH ? [Number(process.env.STAKE_TEST_WIDTH)] : [320, 360, 768]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
      await context.addInitScript(() => {
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (key === 'tdh_beast_collection_v1' && value.includes('qa:0')) {
            const data = JSON.parse(value);
            data.cards = Array.from({ length: 12 }, (_, i) => ({ id: `qa:${i}`, cardId: `beast_a${String(i + 1).padStart(2, '0')}`, source: 'DUEL_WIN', at: '2026-09-09' }));
            value = JSON.stringify(data);
          }
          return set.call(this, key, value);
        };
      });
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:8888/beast-game/qa-stakes');
      await page.getByRole('button', { name: '獨立測試卡組進入戰場' }).tap();
      await page.getByRole('button', { name: '押注確認', exact: true }).tap();
      const before = await page.evaluate(() => localStorage.getItem('tdh_beast_collection_v1'));
      const picker = page.getByRole('group', { name: '從收藏選五張押注', exact: true });
      await picker.scrollIntoViewIfNeeded();
      const evidence = await picker.evaluate(e => {
        const chain = []; for (let node = e; node; node = node.parentElement) {
          const css = getComputedStyle(node); chain.push({ tag: node.tagName, class: node.className, width: node.clientWidth, scrollWidth: node.scrollWidth, touch: css.touchAction, overflow: css.overflowX });
        } return chain;
      });
      console.log(JSON.stringify({ width, pickerWidth: evidence[0].width, collectionWidth: evidence[0].scrollWidth }));
      const rect = await picker.boundingBox();
      assert.ok(rect.x >= 0 && rect.x + rect.width <= width, 'Picker must fit inside the screen');
      assert.ok(await picker.evaluate(e => e.scrollWidth > e.clientWidth), 'Collection has its own horizontal overflow');
      await page.mouse.move(rect.x + rect.width - 20, rect.y + 45);
      await page.mouse.down();
      await page.mouse.move(rect.x + 20, rect.y + 45, { steps: 12 });
      await page.mouse.up();
      assert.ok(await picker.evaluate(e => e.scrollLeft > 30), 'Mouse dragging must also move the collection');
      assert.equal(await picker.locator('[aria-pressed="true"]').count(), 0, 'Dragging must not select a stake');
      await picker.evaluate(e => { e.scrollLeft = 0; });
      const cdp = await context.newCDPSession(page);
      const y = Math.min(810, rect.y + 55), x = rect.x + rect.width - 15;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 12; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - step * (rect.width - 35) / 12, y }] });
        await page.waitForTimeout(20);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(250);
      assert.ok(await picker.evaluate(e => e.scrollLeft > 30), 'A real finger swipe must move the collection');
      await page.waitForTimeout(1000); // Let native fling end before testing a separate tap.
      const last = picker.getByRole('button').last();
      await last.tap();
      assert.equal(await last.getAttribute('aria-pressed'), 'true');
      const selectedImage = await last.locator('img').boundingBox();
      const previousLeft = await picker.evaluate(e => e.scrollLeft);
      const selectedX = selectedImage.x + 15, selectedY = selectedImage.y + 35;
      assert.equal(await page.evaluate(({ x,y }) => document.elementFromPoint(x,y)?.closest('button')?.getAttribute('aria-pressed'), {x:selectedX,y:selectedY}), 'true', 'Selected card image must not be hidden behind the arena or confirmation footer');
      await page.screenshot({path:`reports/beast-relaxed/stake-${width}.png`});
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: selectedX, y: selectedY }] });
      for (let step = 1; step <= 8; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: selectedX + step * 7, y: selectedY }] });
        await page.waitForTimeout(20);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(200);
      assert.ok(await picker.evaluate(e => e.scrollLeft) < previousLeft, 'Right swipe starting on an already selected card image also moves');
      assert.equal(await picker.locator('[aria-pressed="true"]').count(), 1, 'Finger swipe does not toggle a selected stake');
      await page.waitForTimeout(1000);
      await last.tap();
      assert.equal(await last.getAttribute('aria-pressed'), 'false');
      await picker.evaluate(e => { e.scrollLeft = 0; });
      await page.getByRole('button', { name: '後一排收藏卡', exact: true }).tap();
      assert.ok(await picker.evaluate(e => e.scrollLeft > 0), 'Next-row button provides a gesture-free route');
      await page.getByRole('button', { name: '前一排收藏卡', exact: true }).tap();
      assert.equal(await picker.evaluate(e => e.scrollLeft), 0);
      for (let index = 7; index < 12; index++) await picker.getByRole('button').nth(index).tap();
      assert.equal(await picker.locator('[aria-pressed="true"]').count(), 5, 'All five slots can be filled from cards beyond the first row');
      for (let index = 7; index < 12; index++) await picker.getByRole('button').nth(index).tap();
      assert.equal(await picker.locator('[aria-pressed="true"]').count(), 0);
      assert.equal(await page.evaluate(() => localStorage.getItem('tdh_beast_collection_v1')), before, 'Swipe/select/cancel never removes collection');
      console.log(`PASS ${width}: mouse drag, finger swipe, arrows, five later cards selected/cancelled, unchanged collection`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
