// Run with authorized local .env.local and Playwright available via NODE_PATH.
// Uses a separate headless browser; never sends jobs to a physical printer.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
 const base=process.env.DUAL_CHART_TEST_URL || 'http://localhost:8888';
 const standard=process.env.PRINT_CASE === 'standard';
 const output=process.env.PRINT_OUTPUT || '.tmp/single-print';
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const statePath='.tmp/dual-chart-print-session.json';
 const context=await browser.newContext({viewport:{width:1200,height:900}});
 {
  const login=await context.request.post(base+'/api/dual-chart/session',{headers:{Origin:base},data:{password:process.env.DUAL_CHART_PASSWORD}});
  if(!login.ok()) throw Error('Test login failed: '+login.status());
  fs.mkdirSync('.tmp',{recursive:true});
  await context.storageState({path:statePath});
 }
 const page=await context.newPage();
 await page.goto(base+'/dual-chart');
 await page.waitForTimeout(1500);
 if(standard) await page.locator('input').first().fill('單張列印長姓名驗證案例');
 await page.getByRole('button',{name:'國曆生日',exact:true}).click();
 await page.getByRole('textbox',{name:'民國年',exact:true}).fill(standard?'63':'84');
 await page.getByRole('textbox',{name:'月份',exact:true}).fill(standard?'6':'2');
 await page.getByRole('textbox',{name:'日期',exact:true}).fill(standard?'28':'23');
 await page.getByRole('button',{name:standard?/^男性/:/^女性/}).click();
 await page.getByRole('button',{name:/我知道出生時辰/}).click();
 await page.getByRole('button',{name:standard?/^酉/:/^午/}).click();
 await page.getByRole('button',{name:'排出神煞易經',exact:true}).click();
 await page.getByRole('button',{name:'列印八字',exact:true}).waitFor({timeout:90000});
 fs.mkdirSync(output,{recursive:true});
 for(const width of [320,375,390,430,768,1200]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.locator('section[aria-label="五行加權比例"] > svg').isVisible(),false);
  assert.equal(await page.locator('[class*=elementLegend] > span').count(),5);
  assert.equal(await page.locator('dl[aria-label="五行與命盤摘要"]').count(),1);
  assert.equal(await page.locator('table[aria-label^="流年 "]').count(),3);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No page overflow at '+width);
  await page.getByRole('heading',{name:'八字易經神煞命盤',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:output+'/screen-'+width+'.png'});
  if(width===1200) await page.locator('[class*=baziSidebar]').screenshot({path:output+'/annual-detail.png'});
 }
 await page.getByRole('button',{name:'列印八字',exact:true}).click();
 for(const mono of [false,true]) for(const [kind,label] of [['bazi','八字（一張）'],['ziwei','紫微（一張）']]){
  const color=mono?'黑白':'彩色'; const file=kind+'-'+(mono?'mono':'color');
  await page.getByRole('button',{name:mono?'黑白日常版':'彩色客戶版',exact:true}).click();
  await page.getByRole('radio',{name:label,exact:true}).check();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('section[aria-label="神煞易經結果"] > article').count(),1);
  console.log(kind,await page.locator('section[aria-label="神煞易經結果"] > article').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,scroll:e.scrollHeight,text:e.innerText.length}))));
  await page.screenshot({path:output+'/'+file+'-preview.png',fullPage:true});
  for(const width of [320,375,390,430,768,1200]){
   await page.setViewportSize({width,height:900});
   assert(await page.getByRole('button',{name:'列印'+(kind==='bazi'?'八字':'紫微')+'一張',exact:true}).isVisible());
   const size=await page.locator('section[aria-label="神煞易經結果"] > article').boundingBox();
   assert(size && size.width>=793.7*.95 && size.width<=795.7 && size.height<=1124.5 && Math.abs(size.height-size.width*297/210)<2,'A4 aspect ratio with at most 5% existing print-fit scaling at '+width);
  }
  await page.emulateMedia({media:'print'});
  assert.equal(await page.getByRole('navigation',{name:'列印專用版操作'}).isVisible(),false);
  const clipped=await page.locator('section[aria-label="神煞易經結果"] > article').evaluate(article=>{
   const a=article.getBoundingClientRect(); return [...article.querySelectorAll('*')].filter(e=>{
    const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && (r.right>a.right+2 || r.bottom>a.bottom+2);
   }).map(e=>e.tagName);
  });
  assert.deepEqual(clipped,[],'Visible chart content must stay inside A4');
  if(kind==='bazi'){
   assert.equal(await page.locator('dl[aria-label="五行與命盤摘要"]').count(),1);
   for(const label of ['強弱','喜用神','忌神','格局','天運五行','星座','命宮','胎元','胎息','年空','日空']) assert.equal(await page.locator('dl[aria-label="五行與命盤摘要"] dt').filter({hasText:new RegExp('^'+label+'$')}).count(),1);
   const summaryText=await page.locator('dl[aria-label="五行與命盤摘要"]').innerText();
   assert(!summaryText.includes('未提供'));
   assert(summaryText.includes(standard?'偏弱':'偏旺'));
   assert(summaryText.includes(standard?'金、土':'土、金'));
   assert(summaryText.includes(standard?'正官格':'劫財格'));
   assert(summaryText.includes(standard?'巨蟹座':'雙魚座'));
   assert.equal(await page.locator('[class*=elementSources]').isVisible(),false);
   assert.equal(await page.locator('section[aria-label="五行加權比例"] > svg').isVisible(),false,'Circle must not occupy space');
   assert.equal(await page.locator('[class*=elementLegend] > span').count(),5,'All five percentages stay visible');
  }
  await page.pdf({path:output+'/'+file+'-browser.pdf',preferCSSPageSize:true,printBackground:true});
  await page.emulateMedia({media:'screen'});
  await page.getByRole('button',{name:'製作'+color+' A4 PDF',exact:true}).click();
  await page.getByRole('link',{name:new RegExp('下載'+color+' PDF')}).waitFor({timeout:60000});
  const link=page.getByRole('link',{name:new RegExp('下載'+color+' PDF')});
  if(await link.count()){
   const download=page.waitForEvent('download'); await link.click(); await (await download).saveAs(output+'/'+file+'-export.pdf');
  } else throw Error('PDF ERROR '+await page.locator('[role=alert]').allTextContents());
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
