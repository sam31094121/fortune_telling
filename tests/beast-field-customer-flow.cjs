const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
fs.mkdirSync('reports/beast-relaxed', { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.addInitScript(() => localStorage.setItem('tdh_beast_collection_v1', JSON.stringify({ cards: Array.from({ length: 12 }, (_, i) => ({ id: `audit:${i}`, cardId: `beast_a${String(i + 1).padStart(2,'0')}`, source: 'DUEL_WIN', at: '2026-09-09' })), history: [], receipts: {}, granted: [] })));
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:8888/beast-game/battlefield');
    for (let i = 0; i < 3; i++) await page.getByRole('button', {name:/^手牌：/}).first().tap();
    const rosterLabels = () => page.locator('button[aria-label^="你的主戰："],button[aria-label^="你的後備 "]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    const previousRoster = await rosterLabels();
    await page.getByRole('button', {name:'押注確認',exact:true}).tap();
    const picker = page.getByRole('group', {name:'從收藏選五張押注'});
    for (let i = 7; i < 12; i++) await picker.getByRole('button').nth(i).tap();
    assert.equal(await picker.locator('[aria-pressed="true"]').count(),5);
    await page.screenshot({path:'reports/beast-relaxed/field-confirm.png'});
    // Only this isolated synthetic collection is ever committed to a battle.
    await page.locator('[data-start-confirmation="true"]').tap();
    const panel = page.locator('[data-battle-panel]');
    await panel.waitFor();
    let steps=0;
    while(await panel.getAttribute('data-status') === 'PLAYING' && steps++ < 170) {
      const revision = await page.locator('[data-battle-revision]').getAttribute('data-battle-revision');
      const replacement = panel.getByRole('button',{name:/^換上 /});
      const next = panel.getByRole('button',{name:'繼續，對手換卡'});
      const skill = panel.getByRole('button',{name:/^技能/});
      if(await replacement.count()) await replacement.first().tap();
      else if(await next.count()) await next.tap();
      else if(await skill.isEnabled()) await skill.tap();
      else await panel.getByRole('button',{name:/^普通攻擊/}).tap();
      await page.waitForFunction(rev=>document.querySelector('[data-battle-revision]')?.getAttribute('data-battle-revision')!==rev,revision);
    }
    assert.equal(await panel.getAttribute('data-status'),'FINISHED');
    await page.locator('[data-settlement-saved="yes"]').waitFor();
    const counts = await page.locator('[data-stake-counts]').innerText();
    assert.match(counts,/本場押注\s*5 張/);
    const contradictory = page.locator('[data-battle-result]');
    if(await contradictory.count()) assert.doesNotMatch(await contradictory.innerText(),/押注 1 張|輸掉 1 張|保留 1 張/,'Secondary result must agree with the five-card settlement');
    await page.screenshot({path:'reports/beast-relaxed/field-result.png'});
    const result = await page.locator('[data-stake-result]').getAttribute('data-stake-verdict');
    const count = await page.evaluate(()=>JSON.parse(localStorage.getItem('tdh_beast_collection_v1')).cards.length);
    assert.equal(count,result==='WON'?13:result==='LOST'?7:12);
    await page.getByRole('button',{name:/沿用可用選擇，再打一場/}).last().tap();
    await page.getByRole('button',{name:'選卡佈陣',exact:true}).waitFor();
    const replayRoster = await rosterLabels();
    const replayHand = await page.getByRole('button',{name:/^手牌：/}).evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    previousRoster.forEach((label, index) => {
      const name = label.split('：')[1].replace(/・已放卡$|・可放牌$/, '');
      if (name === '空格') return;
      assert.ok(!replayHand.some(hand => hand.startsWith('手牌：' + name + '・') || hand === '手牌：' + name), 'Previously chosen cards drawn again should already be placed');
      assert.ok(replayRoster[index].includes('：' + name + '・') || replayRoster[index].includes('：空格'), 'Replay never silently substitutes a different beast');
    });
    assert.equal(await page.locator('[data-battle-panel]').count(), 0, 'Replay must wait for confirmation');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tdh_beast_collection_v1')).cards.length), count, 'Replay never deducts cards');
    await page.getByRole('button',{name:'押注確認',exact:true}).tap();
    assert.equal(await picker.locator('[aria-pressed="true"]').count(), result === 'LOST' ? 0 : 5, 'Only still-owned stake copies are restored');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,url:page.url(),width:390,steps,result,syntheticCardsAfter:count,checks:'formation, five later stakes, confirmation, full battle, exact settlement, restart'}));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
