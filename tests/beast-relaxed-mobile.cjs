const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { legalActions } = require('../.beast-game-build/lib/beast-game/interactive');
const base = process.env.BEAST_TEST_URL || 'http://localhost:8888';
const width = Number(process.env.BEAST_TEST_WIDTH || 390);

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    fs.mkdirSync('reports/beast-relaxed', { recursive: true });
    const errors = [];
    let data, actions = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', async response => {
      if (response.url().endsWith('/api/beast-game/turns')) {
        const body = await response.json();
        if (body.ok) data = body;
      }
    });
    page.on('request', request => {
      if (request.url().endsWith('/api/beast-game/turns') && request.method() === 'POST' && request.postDataJSON().type === 'ACTION') actions++;
    });
    await page.goto(base + '/beast-game');
    await page.getByRole('button', { name: '確認陣容' }).waitFor();
    await page.screenshot({ path: `reports/beast-relaxed/${width}-select.png` });
    assert.equal(await page.getByRole('button', { name: '開始對戰・輕鬆自動' }).count(), 0, 'Start is hidden until the confirmation step');
    for (const id of ['beast_a01', 'beast_a02', 'beast_a03']) {
      const card = data.cards.find(card => card.id === id);
      await page.getByRole('button', { name: new RegExp('^' + card.name + '，') }).click();
    }
    await page.getByRole('button', { name: '確認陣容' }).click();
    assert.equal(await page.getByRole('region', { name: '選擇神獸卡' }).count(), 0, 'Selection grid is absent in confirmation');
    await page.screenshot({ path: `reports/beast-relaxed/${width}-confirm.png` });
    const startBounds = await page.getByRole('button', { name: '開始對戰・輕鬆自動' }).boundingBox();
    assert.ok(startBounds.y + startBounds.height <= 844 && startBounds.height >= 44, 'Primary action stays visible and touch sized');
    await page.getByRole('button', { name: '返回選卡' }).click();
    await page.getByText('已選 3/3・可以確認陣容了').waitFor();
    await page.getByRole('button', { name: '確認陣容' }).click();
    await page.getByRole('button', { name: '開始對戰・輕鬆自動' }).click();
    await page.getByText('技能就緒・等你決定', { exact: true }).waitFor();
    await page.waitForTimeout(3900);
    assert.equal(actions, 1, 'Opening attack is followed by an indefinite skill choice');
    await page.getByRole('button', { name: /^技能/ }).click();
    await page.getByText('自動普通攻擊中', { exact: true }).waitFor();
    await page.waitForTimeout(260);
    await page.screenshot({ path: `reports/beast-relaxed/${width}-clash.png` });
    const visual = await page.locator('[data-fighter="player"] [data-rush]').evaluate(node => ({ rush: node.dataset.rush, animation: getComputedStyle(node.querySelector('button')).animationName, transform: getComputedStyle(node.querySelector('button')).transform }));
    assert.equal(visual.rush, 'true', 'Actual attacking skill has a visible charge');
    assert.match(visual.animation, /cardCharge/, 'Card movement is attached to the performed attack');
    await page.waitForTimeout(3900);
    assert.ok(actions >= 3, 'Ordinary attack advances automatically after skill');
    await page.getByRole('button', { name: '暫停自動' }).click();
    const paused = actions;
    await page.waitForTimeout(3900);
    assert.equal(actions, paused, 'Pause cancels scheduled actions');
    // A random opponent may defeat either active card during the observed round.
    for (let replacement = 0; replacement < 2; replacement++) {
      const m = data.account.match;
      let next;
      if (m.player.team[m.player.active].defeated) next = page.getByRole('button', { name: '換上 ' + m.player.team[legalActions(m, 'player')[0].index].name, exact: true });
      else if (m.opponent.team[m.opponent.active].defeated) next = page.getByRole('button', { name: '繼續，對手換卡' });
      else break;
      const result = page.waitForResponse(r => r.url().endsWith('/api/beast-game/turns') && r.request().method() === 'POST');
      await next.click(); data = await (await result).json();
    }
    await page.getByRole('button', { name: '開啟自動' }).click();
    await page.getByRole('button', { name: /^說明/ }).click();
    await page.getByRole('button', { name: '開啟自動' }).waitFor();
    await page.getByRole('button', { name: '收起說明' }).click();
    assert.equal(await page.locator('[data-control-scroll]').evaluate(node => node.scrollTop), 0, 'Closing help returns to the current battle and pause control');

    await page.screenshot({ path: `reports/beast-relaxed/${width}-battle.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
    const commandBounds = await page.getByRole('group', { name: '本回合指令' }).getByRole('button').evaluateAll(buttons => buttons.map(button => {
      const rect = button.getBoundingClientRect(); return { bottom: rect.bottom, height: rect.height };
    }));
    assert.ok(commandBounds.every(rect => rect.bottom <= 844 && rect.height >= 44), 'Every main command is visible without scrolling on phone and tablet');
    const paceButtons = page.getByRole('region', { name: '戰鬥節奏' }).getByRole('button');
    assert.ok((await paceButtons.boundingBox()).height >= 44, 'Pause is touch sized');

    // A rejected request must stop automation, and an explicit reload restores authoritative state.
    await page.route('**/api/beast-game/turns', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: '測試連線中斷' }) });
        await page.unroute('**/api/beast-game/turns');
      } else await route.continue();
    });
    await page.getByRole('button', { name: /^普通攻擊/ }).click();
    await page.getByRole('alert').filter({ hasText: '測試連線中斷' }).waitFor();
    await page.getByRole('button', { name: '重新載入戰況' }).click();
    await page.getByRole('alert').filter({ hasText: '測試連線中斷' }).waitFor({ state: 'hidden' });
    let replacements = 0;
    for (let step = 0; step < 170 && data.account.match.status === 'PLAYING'; step++) {
      const match = data.account.match;
      const active = match.player.team[match.player.active];
      const options = legalActions(match, 'player');
      let button;
      if (active.defeated) {
        replacements++;
        button = page.getByRole('button', { name: '換上 ' + match.player.team[options[0].index].name, exact: true });
      } else if (match.opponent.team[match.opponent.active].defeated) {
        button = page.getByRole('button', { name: '繼續，對手換卡' });
      } else button = page.getByRole('button', { name: options.some(a => a.type === 'SKILL') ? /^技能/ : /^普通攻擊/ });
      const response = page.waitForResponse(r => r.url().endsWith('/api/beast-game/turns') && r.request().method() === 'POST');
      await button.click();
      data = await (await response).json();
      assert.equal(data.ok, true);
      await page.locator(`[data-battle-revision="${data.account.match.revision}"]`).waitFor();
      for (const side of ['player', 'opponent']) {
        const actualAttack = data.account.match.log.some(entry => entry.side === side && entry.text.includes(' × 元素'));
        const cue = page.locator(`[data-fighter="${side}"] [data-rush]`);
        assert.equal(await cue.getAttribute('data-rush'), String(actualAttack), 'Both visual attacks follow actual engine logs, including skipped turns and replacements');
      }
    }
    assert.equal(data.account.match.status, 'FINISHED', 'Complete a real server-backed battle');
    await page.getByRole('button', { name: '回到組隊，再戰一場' }).waitFor();
    await page.screenshot({ path: `reports/beast-relaxed/${width}-result.png` });
    await page.getByRole('button', { name: '回到組隊，再戰一場' }).click();
    await page.getByRole('button', { name: '開始對戰・輕鬆自動' }).waitFor();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, width, actions, replacements, checks: 'selection, skill wait, auto attack, pause, browsing pause, failure/reload, full battle, result, restart, mobile layout' }));
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
