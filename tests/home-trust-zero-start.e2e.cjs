const { chromium } = require('../scripts/card-preview/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const counts = { epoch: 'home-20261108-v2', agreeCount: 0, disagreeCount: 0, viewCount: 0, revision: 0 };
    const events = new Set(), calls = [];
    let dropDisagree = true;
    await page.route(/\/api\/home-trust(?:\/[^?]*)?(?:\?.*)?$/, async route => {
      const request = route.request();
      if (request.method() === 'GET') return route.fulfill({ json: { ok: true, ...counts } });
      const kind = new URL(request.url()).pathname.split('/').at(-1), body = request.postDataJSON();
      assert.equal(body.epoch, counts.epoch);
      calls.push({ kind, id: body.eventId });
      if (!events.has(body.eventId)) { events.add(body.eventId); counts[kind + 'Count']++; counts.revision++; }
      if (kind === 'disagree' && dropDisagree) { dropDisagree = false; return route.abort(); }
      return route.fulfill({ json: { ok: true, ...counts, applied: true } });
    });
    const until = async (condition, label) => {
      for (let i=0;i<200;i++) { if (await condition()) return; await page.waitForTimeout(50); }
      throw new Error(label + ': ' + JSON.stringify({counts,calls}));
    };
    await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const strip = page.locator('#home-trust-strip');
    await strip.scrollIntoViewIfNeeded();
    const agree = strip.getByRole('button',{ name: '我認同', exact: true });
    const disagree = strip.getByRole('button',{ name: '我不認同', exact: true });
    await until(()=>agree.isEnabled(),'initial counters available');
    await agree.click();
    await until(()=>counts.agreeCount===1,'agree recorded');
    await until(()=>disagree.isEnabled(),'vote unlocked');
    await disagree.click();
    await until(()=>strip.getByRole('status').count(),'lost response status');
    await until(()=>disagree.isEnabled(),'retry unlocked');
    await disagree.click();
    await until(()=>calls.filter(x=>x.kind==='disagree').length===2,'retry sent');
    await until(async()=>await strip.getByRole('status').count()===0,'retry confirmed');
    assert.equal(counts.disagreeCount,1);
    const retry=calls.filter(x=>x.kind==='disagree');
    assert.equal(retry[0].id,retry[1].id);
    await until(()=>counts.viewCount===1,'view recorded');
    const before=await strip.innerText();
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('home-trust-v2-confirmed',{ detail:{ epoch:'home-20261108-v2',agreeCount:0,disagreeCount:0,viewCount:0,revision:0 } })));
    assert.equal(await strip.innerText(),before);
    console.log(JSON.stringify({ passed:true,counts,lostReplyRetrySameId:true,staleResponseIgnored:true,realDatabaseWrites:0 }));
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error);process.exitCode=1; });
