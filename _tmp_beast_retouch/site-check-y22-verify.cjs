const { chromium } = require('../scripts/card-preview/node_modules/playwright-core');
const fs=require('fs');const OUT='_tmp_beast_retouch/site-check-y22-verify';fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch();const log=[];
for(const W of [360,390,1280]){const ctx=await b.newContext({viewport:{width:W,height:W>1000?800:800},deviceScaleFactor:2});const p=await ctx.newPage();const bad=[];
p.on('response',r=>{if(/beast-game/.test(r.url())&&r.status()>=400)bad.push(r.status())});
await p.goto('http://localhost:3010/star-beasts',{waitUntil:'networkidle',timeout:60000});
await p.getByRole('button',{name:/神獸幼子/}).first().click().catch(e=>log.push('tab '+e.message));await p.waitForTimeout(800);
for(let i=0;i<25;i++){await p.mouse.wheel(0,900);await p.waitForTimeout(120);}
const img=p.locator('img[src*="young-22."]').first();const btn=img.locator('xpath=ancestor::button[1]');
if(!(await btn.count())){log.push(W+' NO-CARD');await ctx.close();continue;}
await btn.scrollIntoViewIfNeeded();await p.waitForTimeout(600);
const st=await img.evaluate(e=>({src:e.currentSrc.split('/').pop(),nat:e.naturalWidth+'x'+e.naturalHeight,complete:e.complete,w:e.clientWidth,h:e.clientHeight,fit:getComputedStyle(e).objectFit}));
const bb=await btn.boundingBox();const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
await btn.screenshot({path:`${OUT}/${W}-card.png`});
log.push(`${W} card ${JSON.stringify(st)} box=${Math.round(bb.x)},${Math.round(bb.width)}x${Math.round(bb.height)} hOverflow=${ov} httpErr=${bad.length}`);
await btn.click();await p.waitForTimeout(1000);await p.screenshot({path:`${OUT}/${W}-detail.png`});
const big=await p.$$eval('img[src*="young-22."]',els=>els.map(e=>({src:e.currentSrc.split('/').pop(),nat:e.naturalWidth,w:e.clientWidth,h:e.clientHeight,fit:getComputedStyle(e).objectFit})));
log.push(`${W} detail ${JSON.stringify(big)} hOverflow=${await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)}`);
await ctx.close();}
fs.writeFileSync(`${OUT}/log.txt`,log.join('\n'));console.log(log.join('\n'));await b.close();})();