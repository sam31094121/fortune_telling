const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:360,height:844},isMobile:true,hasTouch:true});
  await page.goto('http://localhost:8888/beast-game/battlefield');
  await page.getByRole('button',{name:/^手牌：/}).first().tap();
  await page.getByRole('button',{name:/^查看.*的卡面與能力/}).first().tap();
  await page.getByRole('button',{name:'卡片能力',exact:true}).tap();
  const notes=page.locator('[data-card-tactics]');
  assert.equal(await notes.getAttribute('open'),null);
  await notes.locator('summary').tap();
  const text=await notes.innerText();for(const term of ['擅長：','要留意：','上場時機：','不是勝負保證'])assert.ok(text.includes(term));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'reports/beast-relaxed/card-tactics-360.png'});
  await page.getByRole('button',{name:'回到操控',exact:true}).tap();
  await page.getByRole('button',{name:'選卡佈陣',exact:true}).waitFor();
  console.log('PASS: actual localhost mobile card tactics are optional, readable and return to formation without a wager');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
