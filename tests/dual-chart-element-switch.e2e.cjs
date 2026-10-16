// Reuse only the synthetic-test browser session created by single-print.e2e.cjs.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const state='.tmp/dual-chart-print-session.json';
 assert(fs.existsSync(state),'Run single-print test once with authorized login first');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({storageState:state,viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.goto((process.env.DUAL_CHART_TEST_URL||'http://localhost:8888')+'/dual-chart');
  await page.getByRole('button',{name:'國曆生日',exact:true}).click();
  const cases=[['63','6','28','酉','偏弱','金、土','木','正官格','水','巨蟹座'],['79','5','20','亥','偏弱','木、水','金','傷官格','土','金牛座'],['77','11','3','辰','偏弱','水、金','土','七殺格','木','天蠍座'],['63','6','28','酉','偏弱','金、土','木','正官格','水','巨蟹座'],['63','5','9','酉','偏弱','金、土','木','正官格','水','巨蟹座']];
  fs.mkdirSync('.tmp/element-switch',{recursive:true});
  for(let i=0;i<cases.length;i++){
   if(i) await page.getByRole('button',{name:'← 返回命盤',exact:true}).click();
   const [y,m,d,h,strength,help,avoid,pattern,tianYun,zodiac]=cases[i];
   if(i===4) await page.getByRole('button',{name:'農曆生日',exact:true}).click();
   const dates=page.locator('input[placeholder^="例"]');
   await dates.nth(0).fill(y);await dates.nth(1).fill(m);await dates.nth(2).fill(d);
   await page.getByRole('button',{name:/^男性/}).click();
   await page.getByRole('button',{name:/我知道出生時辰/}).click();
   await page.getByRole('button',{name:new RegExp('^(?:✓\\s*)?'+h)}).click();
   assert.equal(await page.locator('dl[aria-label="五行與命盤摘要"]').count(),0,'Editing removes old customer results');
   await page.getByRole('button',{name:'排出神煞易經',exact:true}).click();
   const summary=page.locator('dl[aria-label="五行與命盤摘要"]');
   await summary.waitFor();
   for(const [label,value] of [['強弱',strength],['喜用神',help],['忌神',avoid],['格局',pattern],['天運五行',tianYun],['星座',zodiac]]){
    const row=summary.locator('div').filter({has:page.locator('dt',{hasText:new RegExp('^'+label+'$')})});
    assert.equal(await row.count(),1);assert.equal(await row.locator('dd').innerText(),value);
   }
   await summary.scrollIntoViewIfNeeded();
   await summary.screenshot({path:'.tmp/element-switch/customer-'+i+'-screen.png'});
   await page.getByRole('button',{name:'列印八字',exact:true}).click();
   await page.emulateMedia({media:'print'});
   assert((await summary.innerText()).includes(help));
   await page.pdf({path:'.tmp/element-switch/customer-'+i+'.pdf',preferCSSPageSize:true,printBackground:true});
   await page.emulateMedia({media:'screen'});
   console.log('PASS customer',i,'input-to-screen-to-print',strength,help,avoid);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
