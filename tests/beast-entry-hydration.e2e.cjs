const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pw=require('../.tmp/shared-qa/node_modules/playwright');
const base=process.env.ENTRY_BASE||'https://heaven-earth-humanity-pair.vercel.app';
const phase=process.env.ENTRY_PHASE||'before';
(async()=>{
 const browser=await pw.chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(20000);
 let release;const gate=new Promise(r=>release=r);let scripts=0;
 await page.route(/\/_next\/static\/.*\.js(?:\?|$)/,async route=>{scripts++;await gate;await route.continue()});
 await page.goto(base+'/beast-game/match3-hard',{waitUntil:'commit'});
 const button=page.getByTestId('play-guest');await button.waitFor();
 await new Promise(r=>setTimeout(r,250));assert(scripts>0,'client chunks are deliberately held');
 const before={disabled:await button.isDisabled(),scriptsHeld:scripts};
 // A native click while JS is unavailable must not look like a usable action.
 if(phase==='before')await button.click();else {assert.equal(before.disabled,true);await button.evaluate(e=>e.click());}
 release();await page.waitForLoadState('networkidle');
 await page.waitForFunction(()=>{const b=document.querySelector('[data-testid="play-guest"]');return b&&Object.keys(b).some(k=>k.startsWith('__reactProps$'))});
 const lost=await page.getByTestId('pick-hero').count()===0;
 if(phase==='before')assert.equal(lost,true,'reproduce lost pre-hydration click');
 await button.click();await page.getByTestId('pick-hero').first().waitFor();
 await page.getByTestId('pick-hero').first().click();await page.getByTestId('confirm-hero').click();for(let i=0;i<4;i++)await page.getByTestId('pick-card').nth(i).click();await page.getByTestId('start-battle').click();await page.getByTestId('match3-board').waitFor();
 const result={phase,base,before,preHydrationClickIgnored:lost,hydratedClickOpenedHero:true,guestBoardVisible:await page.getByTestId('match3-board').isVisible()};
 const out='reports/beast-game/entry-hydration-2026-11-20';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,phase+'.json'),JSON.stringify(result,null,2));console.log(result);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
