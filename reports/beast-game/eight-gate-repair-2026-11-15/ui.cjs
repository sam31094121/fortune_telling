const {chromium}=require('../shared-qa/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'});
await context.addInitScript(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__share=data;}});localStorage.setItem('taiji-install-shield-dismissed-v2','1');});
const page=await context.newPage();await page.goto('http://localhost:8888/',{waitUntil:'domcontentloaded',timeout:120000});
await page.getByRole('button',{name:'儲存本站到主畫面',exact:true}).click({timeout:60000});
await page.waitForFunction(()=>!!window.__share);
const share=await page.evaluate(()=>window.__share);assert.match(share.url,/\?v=/);assert.equal(share.title,'太極命理');
const nine=page.locator('a[href="/nine-grid"]');await nine.scrollIntoViewIfNeeded();
await page.waitForFunction(()=>{const i=document.querySelector('a[href="/nine-grid"] img');return i?.complete&&i.naturalWidth>0;});
assert(await page.locator('a[href="/3D"]').evaluate((a)=>!!(a.compareDocumentPosition(document.querySelector('a[href="/nine-grid"]'))&Node.DOCUMENT_POSITION_FOLLOWING)));
await page.screenshot({path:'.tmp/eight-gates/home-mobile.png'});
await page.setViewportSize({width:768,height:1024});await nine.scrollIntoViewIfNeeded();await page.screenshot({path:'.tmp/eight-gates/home-tablet.png'});
console.log('PASS actual homepage install button versioned share payload (mocked OS share, no transmission), current nine-grid image loaded, entry order, mobile/tablet screenshots');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
