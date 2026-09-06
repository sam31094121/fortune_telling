// Read-only checks against local candidate files; never invokes paid generation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.BEAST_TEST_URL || 'http://localhost:8888';
(async () => {
  const status = await (await fetch(`${base}/api/beast-production`)).json();
  assert.equal(status.cards.length, 60);
  assert.equal(new Set(status.cards.map(card => card.id)).size, 60);
  assert.equal(status.generated, status.cards.filter(card => card.video).length);
  const candidates = status.cards.filter(card => card.video);
  assert.ok(candidates.length >= 2, 'Requires at least two real preview files');
  const videoUrl = `${base}${candidates[0].video}`;
  const range = await fetch(videoUrl, { headers: { Range: 'bytes=0-1023' } });
  assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 1024);
  assert.match(range.headers.get('content-range'), /^bytes 0-1023\/\d+$/);
  assert.equal((await fetch(videoUrl, { headers: { Range: 'bytes=999999999999-' } })).status, 416);
  assert.equal((await fetch(`${base}/api/beast-production?video=..%2F..%2F.env.local`)).status, 404);
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  const rows=[]; const directory='reports/beast-production/progress-mobile';
  fs.mkdirSync(directory,{recursive:true});
  try {
    for (const width of [360,390,430]) {
      const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
      try {
        const page=await context.newPage(); const errors=[]; page.on('pageerror', e=>errors.push(e.message));
        await page.goto(`${base}/beast-game/production`);
        const list=page.getByRole('region',{name:'六十隻逐一進度'});
        await list.locator('button').first().waitFor();
        assert.equal(await list.locator('button').count(),60);
        await page.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
        const video=page.locator('video');
        const metadata=await video.evaluate(v=>({duration:v.duration,paused:v.paused,inline:v.playsInline}));
        assert.ok(Math.abs(metadata.duration-6)<.05);assert.equal(metadata.paused,true);assert.equal(metadata.inline,true);
        await video.evaluate(async v=>{v.muted=true;await v.play();});
        await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.3);
        await video.evaluate(v=>{v.pause();v.currentTime=4;});
        await page.waitForFunction(()=>Math.abs(document.querySelector('video').currentTime-4)<.05);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        assert.equal(await list.locator('button').evaluateAll(buttons=>buttons.some(b=>b.getBoundingClientRect().height<44)),false);
        await page.screenshot({path:`${directory}/${width}.png`});
        await list.locator('button').nth(1).click();
        await page.waitForFunction(id=>document.querySelector('video')?.getAttribute('src')?.includes(id),candidates[1].id);
        await page.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
        assert.equal(await page.locator('video').evaluate(v=>v.paused),true,'Switching beasts must not unexpectedly play audio');
        assert.deepEqual(errors,[]);rows.push({width,passed:true,seconds:metadata.duration});
      } finally {await context.close();}
    }
  } finally {await browser.close();}
  fs.writeFileSync(`${directory}/summary.json`,JSON.stringify({at:new Date().toISOString(),generated:status.generated,range:true,traversalBlocked:true,rows},null,2)+'\n');
  console.log('PASS: 60 entries, actual six-second playback and seeking, safe file range serving, 360/390/430px, no unexpected audio');
})().catch(error=>{console.error(error);process.exitCode=1;});
