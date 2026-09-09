/* Isolated browser contexts, empty inventory, existing trial rules. No real collection. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.BEAST_TEST_URL || 'http://127.0.0.1:8888';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local-only visual regression');
const output = '.tmp/card-art-mobile';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    for (const [width, height] of [[390, 844], [320, 480], [768, 1024], [844, 390]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [], fronts = new Set();
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (r.url().includes('/beast-game/front/')) fronts.add(r.url()); });
      try {
        await page.goto(`${base}/beast-game/battlefield`);
        const hand = page.getByRole('group', { name: '你的手牌', exact: true });
        await hand.getByRole('button', { name: '手牌：井木犴', exact: true }).waitFor();
        assert.equal(fronts.size, 0, 'No full catalog artwork fetched during preparation');
        const handImage = hand.getByRole('button', { name: '手牌：井木犴', exact: true }).locator('img');
        await handImage.evaluate(img => img.decode());
        const layout = () => page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, height: innerHeight }));
        const stable = async () => {
          const box = await layout();
          assert.ok(box.scroll <= box.width + 1, `No horizontal overflow at ${width}×${height}`);
        };
        await stable();
        await page.screenshot({ path: `${output}/${width}-prepare.png` });
        await hand.getByRole('button', { name: '手牌：井木犴', exact: true }).tap();
        await page.locator('[data-place-active]').tap();
        await page.getByRole('button', { name: '查看井木犴的卡面與能力', exact: true }).tap();
        const guide = page.locator('[data-combat-guide]');
        const portrait = guide.getByRole('img', { name: '井木犴完整卡面' });
        await portrait.evaluate(img => img.decode());
        assert.equal(fronts.size, 1, 'Only the selected full-size card loads');
        const art = await portrait.evaluate(img => ({ src: img.getAttribute('src'), fit: getComputedStyle(img).objectFit, width: img.clientWidth, height: img.clientHeight, natural: [img.naturalWidth, img.naturalHeight] }));
        assert.equal(art.src, '/beast-game/front/adult-22.webp');
        assert.equal(art.fit, 'contain');
        assert.ok(Math.abs(art.width / art.height - 2 / 3) < .01, 'Full portrait ratio');
        assert.deepEqual(art.natural, [720, 1080]);
        await stable();
        await page.screenshot({ path: `${output}/${width}-portrait.png` });
        await guide.getByRole('button', { name: /查看效果/ }).tap();
        assert.equal(await guide.getByRole('button', { name: '卡片能力', exact: true }).getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('[data-control-scroll]').evaluate(e => e.scrollTop), 0, 'Changing tabs returns to the beginning');
        await guide.getByRole('button', { name: '五元素相剋', exact: true }).tap();
        assert.equal(await guide.locator('tbody tr').count(), 5);
        await stable();
        await guide.getByRole('button', { name: '回到操控', exact: true }).tap();
        assert.ok((await page.getByRole('button', { name: /你的主戰：井木犴/ }).count()) > 0, 'Inspection preserves the formation');
        await page.locator('[data-start-confirmation="true"]').tap();
        const commands = page.getByRole('group', { name: '本回合指令', exact: true });
        await commands.waitFor();
        assert.equal(await commands.getByRole('button').count(), 4);
        await stable();
        const fighterLayout = await page.locator('[data-fighter]').evaluateAll(nodes => nodes.map(node => {
          const art = node.querySelector('button').getBoundingClientRect();
          const heading = node.firstElementChild.getBoundingClientRect();
          const vitals = node.lastElementChild.getBoundingClientRect();
          return { artTop: art.top, artBottom: art.bottom, headingBottom: heading.bottom, vitalsTop: vitals.top };
        }));
        for (const box of fighterLayout) {
          assert.ok(box.artTop >= box.headingBottom - 1, 'Card art must not overlap the name');
          assert.ok(box.artBottom <= box.vitalsTop + 1, 'Card art must not overlap life bars');
        }
        await page.screenshot({ path: `${output}/${width}-combat.png` });
        const before = await page.locator('[data-battle-visual]').innerText();
        await page.getByRole('button', { name: '查看井木犴的卡面與能力', exact: true }).tap();
        await guide.getByRole('button', { name: '卡片能力', exact: true }).tap();
        await guide.getByRole('button', { name: '回到操控', exact: true }).tap();
        assert.equal(await page.locator('[data-battle-visual]').innerText(), before, 'Inspection consumes no action or HP');
        await commands.getByRole('button', { name: /^普通攻擊/ }).tap();
        assert.notEqual(await page.locator('[data-battle-visual]').innerText(), before, 'Attack still advances combat');
        for (let action = 0; action < 100 && await page.locator('[data-battle-result]').count() === 0; action++) {
          const next = page.getByRole('button', { name: '繼續，對手換卡', exact: true });
          if (await next.count()) await next.tap();
          else await page.getByRole('button', { name: /^普通攻擊/ }).tap();
        }
        await page.locator('[data-battle-result]').waitFor();
        assert.match(await page.locator('[data-battle-result]').innerText(), /押注 0 張・贏得 0 張・輸掉 0 張/);
        assert.deepEqual(errors, [], 'No runtime errors');
        console.log(`PASS ${width}×${height}: portrait, select/place, ability/matchup/return, attack and completed trial`);
      } catch (error) {
        await page.screenshot({ path: `${output}/${width}-failure.png` });
        console.error(await page.locator('body').innerText());
        throw error;
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
