const { chromium } = require('playwright');
const SAM='Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36';
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const B='http://localhost:8888', O=process.argv[2];
(async()=>{const br=await chromium.launch();
async function run(name,path,ua,vp,mobile,expand){const ctx=await br.newContext({userAgent:ua,viewport:vp,deviceScaleFactor:2,isMobile:mobile,hasTouch:mobile});const p=await ctx.newPage();await p.goto(B+path,{waitUntil:'networkidle',timeout:90000});await p.waitForTimeout(1500);
const el=p.locator('[data-install-shield-inline="080"]');const n=await el.count();let info={name,inline:n,floating:await p.locator('[data-install-shield="080"]').count()};
if(n){if(expand){await el.locator('button.tap').click();await p.waitForTimeout(400);}await el.scrollIntoViewIfNeeded();info.pos=await el.evaluate(e=>{const s=getComputedStyle(e);const r=e.getBoundingClientRect();return {position:s.position,opacity:s.opacity,w:r.width,h:r.height,img:e.querySelector('img').naturalWidth,text:e.innerText}});await p.screenshot({path:O+'/save-inline-'+name+'.png'});}else await p.screenshot({path:O+'/save-inline-'+name+'.png'});
console.log(JSON.stringify(info));await ctx.close();}
const m={width:390,height:844};
await run('home-samsung-collapsed','/',SAM,m,true,false);
await run('home-samsung-expanded','/',SAM,m,true,true);
await run('ghost-samsung-collapsed','/ghost-asura',SAM,m,true,false);
await run('ghost-samsung-expanded','/ghost-asura',SAM,m,true,true);
await run('ios-expanded','/',IOS,m,true,true);
await run('desktop-1280','/',undefined,{width:1280,height:800},false,false);
await br.close();})();
