/* Run against the existing development-only preview. No collection writes or battle POSTs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.BEAST_TEST_URL || 'http://localhost:8888';
const output = 'reports/beast-production/mobile';
const rows = [];
fs.mkdirSync(output, {recursive:true});

(async () => {
 const browser = await chromium.launch({headless:true, channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge', args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  for (const [width,scenario] of [[360,'tie'],[390,'sweep'],[430,'skip']]) {
   const context = await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
   try {
    const page = await context.newPage();
    const errors=[], media=[];
    page.on('pageerror', e=>errors.push(e.message));
    page.on('request', r=>{if (/\/clips\/.*\.(mp4|webm)/.test(r.url())) media.push(r.url());});
    await page.addInitScript(() => {
      window.__beastMedia = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function(...args) { window.__beastMedia.push(this); return play.apply(this,args); };
    });
    await page.goto(`${base}/beast-game/preview?scenario=${scenario === 'sweep' ? 'sweep' : 'tie'}`);
    const dialog=page.locator('[data-duel-ritual]');
    const start=dialog.getByRole('button',{name:'一起揭牌',exact:true});
    await start.click();
    const players=await dialog.locator('[data-ritual-slot="player"]').evaluateAll(nodes=>nodes.map(e=>e.dataset.ritualCard));
    assert.equal(await dialog.locator('[data-auto-flip]').getAttribute('data-auto-flip'),'off');
    assert.equal(await dialog.locator('[data-revealed="yes"]').count(),0);
    await dialog.locator('[data-flip-next]').click();
    assert.equal(await dialog.locator('[data-revealed="yes"]').count(),1);
    await dialog.locator('[data-flip-next]').click();
    assert.equal(await dialog.locator('[data-revealed="yes"]').count(),2);
    await page.waitForTimeout(1200);
    assert.match(await dialog.getByLabel('目前比分').innerText(),/你 0 : 0 對手/);
    assert.equal(await dialog.locator('video').count(),0,'Unapproved clips must not mount');
    const renderer=await dialog.locator('canvas').evaluateAll(nodes=>nodes.map(n=>({lost:n.getContext('webgl2')?.isContextLost(),hidden:getComputedStyle(n).visibility==='hidden'})));
    if(renderer.some(r=>r.lost)) {
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-beast-static-fallback]')].some(n=>n.getBoundingClientRect().height>0));
      assert.ok(renderer.every(r=>!r.lost||r.hidden),'Lost WebGL surfaces must be hidden');
      const images=dialog.locator('[data-beast-clash-3d] > [data-beast-static-fallback] img');
      assert.equal(await images.count(),2);
      assert.ok(await images.evaluateAll(ns=>ns.every(n=>n.complete&&n.naturalWidth>0)),'Fallback renders actual body assets');
    }
    const layout=await dialog.evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,buttons:[...e.querySelectorAll('button')].map(b=>({text:b.textContent,height:b.getBoundingClientRect().height})),stage:[...e.querySelectorAll('[role="status"]')].map(n=>n.getBoundingClientRect().height)}));
    assert.ok(layout.scroll<=layout.width+1,'Ritual must not overflow horizontally');
    assert.ok(layout.buttons.every(b=>b.height>=44),'Touch controls need 44px height');
    await page.screenshot({path:`${output}/${width}-${scenario}.png`,fullPage:true});
    if (scenario==='skip') {
      await dialog.getByRole('button',{name:'略過動畫・看戰果',exact:true}).click();
    } else {
      await page.waitForFunction(()=>{const e=document.querySelector('[data-flip-next]');return e&&!e.disabled;},{},{timeout:12000});
      await dialog.locator('[data-flip-next]').click();
      await dialog.locator('[data-flip-next]').click();
      if (scenario==='tie') {
        await page.waitForFunction(()=>{const e=document.querySelector('[data-flip-next]');return e&&!e.disabled;},{},{timeout:12000});
        assert.match(await dialog.getByLabel('目前比分').innerText(),/你 1 : 1 對手/);
        assert.equal(await dialog.locator('[data-revealed="yes"]').count(),4);
        await page.waitForTimeout(1600);
        assert.equal(await dialog.locator('[data-revealed="yes"]').count(),4,'Decider stays manual at 1:1');
        await dialog.locator('[data-flip-next]').click();
        await dialog.locator('[data-flip-next]').click();
      } else {
        await page.waitForFunction(()=>document.querySelectorAll('[data-revealed="yes"]').length===6,{},{timeout:12000});
        assert.match(await dialog.getByLabel('目前比分').innerText(),/你 (2 : 0|0 : 2) 對手/);
      }
    }
    await dialog.waitFor({state:'detached',timeout:13000});
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>window.__beastMedia.filter(m=>!m.paused&&!m.ended).length),0,'All sound stops on exit');
    const audio=JSON.parse(await page.locator('[data-audio-log]').getAttribute('data-audio-log'));
    const voices=audio.filter(e=>e.status==='playing');
    assert.ok(voices.length>0,'Actual audio playback was observed');
    assert.ok(voices.every(e=>players.some(id=>e.src.endsWith(`/${id}.mp3`))),'Only these player beasts may sound');
    assert.equal(media.length,0,'No candidate movie may be fetched as live battle');
    assert.deepEqual(errors,[],'No browser runtime errors');
    rows.push({width,scenario,status:'PASS',layout,renderer,players,voicePlays:voices.length,unapprovedMovieRequests:media.length,errors});
    console.log(`PASS ${width}px ${scenario}: reveal, score, player voice, exit and pending-media gate`);
   } finally { await context.close(); }
  }
 } finally {
  fs.writeFileSync(`${output}/summary.json`,JSON.stringify({at:new Date().toISOString(),scope:'Development preview with isolated storage; no anatomical or audiovisual movie approval',rows},null,2)+'\n');
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
