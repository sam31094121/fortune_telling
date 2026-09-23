const fs=require('fs');
const path=require('path');
const dir=process.argv[2];
const url=process.argv[3]||'https://heaven-earth-humanity-pair.vercel.app/';
(async()=>{
  let browser;
  try {
    const pup=require('puppeteer');
    browser=await pup.launch({headless:'new',args:['--no-sandbox','--window-size=390,844']});
  } catch(e) {
    try {
      const p=require('playwright');
      const b=await p.chromium.launch({headless:true});
      const context=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
      const page=await context.newPage();
      await page.goto(url,{waitUntil:'networkidle',timeout:60000});
      await page.waitForTimeout(2500);
      await page.screenshot({path:path.join(dir,'01-fold.png'),fullPage:false});
      await page.evaluate(()=>window.scrollBy(0,700));
      await page.waitForTimeout(800);
      await page.screenshot({path:path.join(dir,'02-mid.png'),fullPage:false});
      await page.evaluate(()=>window.scrollBy(0,900));
      await page.waitForTimeout(800);
      await page.screenshot({path:path.join(dir,'03-growth.png'),fullPage:false});
      // try expand more
      const btn=await page.button.home-feature-more-toggle, .home-feature-more-toggle;
      if(btn){await btn.click(); await page.waitForTimeout(600); await page.screenshot({path:path.join(dir,'04-more-expanded.png'),fullPage:false});}
      await page.screenshot({path:path.join(dir,'05-full.png'),fullPage:true});
      const body=await page.evaluate(()=>document.body.innerText.slice(0,4000));
      fs.writeFileSync(path.join(dir,'visible-text.txt'),body,'utf8');
      await b.close();
      console.log('PLAYWRIGHT_OK');
      return;
    } catch(e2){ console.error('NO_BROWSER_LIB',e.message,e2.message); process.exit(2); }
  }
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  await page.goto(url,{waitUntil:'networkidle2',timeout:60000});
  await new Promise(r=>setTimeout(r,2500));
  await page.screenshot({path:path.join(dir,'01-fold.png')});
  await page.evaluate(()=>window.scrollBy(0,700));
  await new Promise(r=>setTimeout(r,800));
  await page.screenshot({path:path.join(dir,'02-mid.png')});
  await page.evaluate(()=>window.scrollBy(0,1000));
  await new Promise(r=>setTimeout(r,800));
  await page.screenshot({path:path.join(dir,'03-growth.png')});
  const btn=await page.button.home-feature-more-toggle, .home-feature-more-toggle;
  if(btn){await btn.click(); await new Promise(r=>setTimeout(r,600)); await page.screenshot({path:path.join(dir,'04-more-expanded.png')});}
  await page.screenshot({path:path.join(dir,'05-full.png'),fullPage:true});
  const body=await page.evaluate(()=>document.body.innerText.slice(0,4000));
  fs.writeFileSync(path.join(dir,'visible-text.txt'),body,'utf8');
  await browser.close();
  console.log('PUPPETEER_OK');
})().catch(e=>{console.error(e);process.exit(1);});
