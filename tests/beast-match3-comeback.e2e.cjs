const assert=require('node:assert/strict'),fs=require('node:fs');
const {openGuestOrb,sealGuestOrb}=require('./guest-orb-fixture.cjs');
const cards=require('../lib/beast-game/registry.ts').playableCards().filter(c=>c.element==='FIRE').slice(0,5);
const {initialComeback}=require('../lib/beast-game/match3/comeback.ts');
const {emptyTreasureBook}=require('../lib/beast-game/match3/treasures.ts');
const {chromium}=require('../.tmp/shared-qa/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const reducedMotion of ['reduce','no-preference']){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion}),page=await context.newPage();page.setDefaultTimeout(25000);
 await page.route('**/api/beast-game/orb-guest',async route=>{
  const response=await route.fetch(),body=await response.json();assert.equal(response.status(),200);
  body.initial.team=cards.map((c,i)=>({id:c.id,name:c.name,thumbnail:c.art.thumbnail,element:c.element,hp:i?400:0,maxHp:1000,attack:1,energy:0}));
  body.initial.foes=body.initial.foes.map((c,i)=>({...c,hp:i?0:1000,maxHp:1000,attack:0,skillRuntime:i?undefined:{shield:5000}}));
  body.initial.comeback=initialComeback(0);body.initial.treasures={...emptyTreasureBook(),variants:{'FIRE:4':1}};
  const ticket=openGuestOrb(body.guestBattleToken);ticket.input=body.initial;body.guestBattleToken=sealGuestOrb(ticket);
  await route.fulfill({response,json:body});
 });
 await page.goto('http://localhost:8888/beast-game/match3-hard');await page.getByTestId('play-guest').click();await page.getByTestId('pick-hero').first().click();await page.getByTestId('confirm-hero').click();for(let i=0;i<4;i++)await page.getByTestId('pick-card').nth(i).click();await page.getByTestId('start-battle').click();await page.getByTestId('match3-board').waitFor();
 const button=page.locator('[data-treasure="FIRE"][data-variant="4"]');await button.waitFor();
 const pending=page.waitForResponse(r=>r.url().endsWith('/orb-turn'));await button.click();const response=await pending,body=await response.json();assert.equal(response.status(),200);assert.equal(body.effect.damage,500);assert.equal(body.team[0].hp,0);assert(body.team.slice(1).every(c=>c.hp===900));
 await page.waitForFunction(()=>document.querySelector('[data-testid="orb-support-result"]')?.textContent.includes('我方實補 2000'));
 assert(await page.getByTestId('orb-support-result').isVisible());assert.equal(await button.getAttribute('data-count'),'0');assert.equal(await page.getByTestId('match3-result').count(),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'no horizontal overflow');
 fs.mkdirSync('reports/orb-comeback-2026-11-18',{recursive:true});await page.screenshot({path:'reports/orb-comeback-2026-11-18/rare-'+reducedMotion+'.png',fullPage:true});
 await context.close();console.log('PASS mobile rare treasure real signed API: '+reducedMotion+' half HP, heal, dead unchanged, single consume, visible result, no overflow');
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
