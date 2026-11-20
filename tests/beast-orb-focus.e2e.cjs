const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {openGuestOrb,sealGuestOrb}=require('./guest-orb-fixture.cjs');
const pw=require('../.tmp/shared-qa/node_modules/playwright');
const base=process.env.SCREEN_HEALTH_BASE_URL||'http://localhost:8888';
const label=process.env.ORB_FOCUS_PHASE||'after';
const out=path.resolve('reports/beast-game/orb-focus-2026-11-20');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await pw.chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const results=[];
 try{for(const count of [2,5]){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:count===2?'reduce':'no-preference'});
 const page=await context.newPage();page.setDefaultTimeout(25000);
 await page.addInitScript(()=>{window.__orbPerf={long:[]};new PerformanceObserver(list=>{for(const e of list.getEntries())window.__orbPerf.long.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask',buffered:true});document.addEventListener('click',e=>{if(e.target.closest('[data-testid="match3-ready-energy-orb"]')){window.__orbPerf.click=performance.now();requestAnimationFrame(()=>window.__orbPerf.frame=performance.now());}},true)});
 await page.route('**/api/beast-game/orb-guest',async route=>{const response=await route.fetch(),body=await response.json();body.initial.team=body.initial.team.slice(0,count).map(u=>({...u,energy:100,orbDropCharges:3}));body.initial.foes=body.initial.foes.map(f=>({...f,hp:1000000,maxHp:1000000}));const t=openGuestOrb(body.guestBattleToken);t.input=body.initial;body.guestBattleToken=sealGuestOrb(t);await route.fulfill({response,json:body})});
 await page.goto(base+'/beast-game/match3-hard?m3debug=1');await page.getByTestId('play-guest').click();await page.getByTestId('pick-hero').first().click();await page.getByTestId('confirm-hero').click();for(let i=0;i<4;i++)await page.getByTestId('pick-card').nth(i).click();await page.getByTestId('start-battle').click();await page.getByTestId('match3-board').waitFor();
 await page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]').first().waitFor();
 assert.equal(await page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]').count(),count);
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 let calls=0;page.on('request',r=>{if(r.url().endsWith('/orb-turn'))calls++});
 const pending=page.waitForResponse(r=>r.url().endsWith('/orb-turn'));
 await page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]').first().click();const response=await pending,body=await response.json();
 const responseAt=await page.evaluate(()=>performance.now());
 if(label!=='before'){assert.equal(body.presentation.groups.length,1);assert.equal(body.presentation.strikes,2);assert.equal(body.presentation.groups[0].amount,1000000);}
 await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false');
 const metrics=await page.evaluate(()=>({...window.__orbPerf,ready:performance.now(),overflow:document.documentElement.scrollWidth>innerWidth,remainingFocus:document.querySelectorAll('[data-testid="orb-attack-focus"]').length}));
 assert.equal(calls,1);assert.equal(metrics.overflow,false);
 if(label!=='before')await page.getByTestId('orb-attack-focus').waitFor({state:'detached'});
 results.push({count,reduced:count===2,cpuSlowdown:4,clickToNextFrameMs:metrics.frame-metrics.click,clickToResponseMs:responseAt-metrics.click,clickToReadyMs:metrics.ready-metrics.click,longTasks:metrics.long.filter(x=>x.start>=metrics.click),calls,actualDamage:body.actualDamage,outcome:body.outcome,strikes:body.presentation?.strikes??1});
 if(label!=='before'){
 // Hold only the presentation for static responsive review, after real timing/cleanup.
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 await page.evaluate(()=>{const original=window.setTimeout;window.setTimeout=function(fn,ms,...args){return original(fn,ms===420?20000:ms,...args)};});
 await page.addStyleTag({content:'[data-testid="orb-attack-focus"], [data-testid="orb-attack-focus"] > div { animation:none !important; opacity:1 !important; transform:none !important; }'});
 // Fixture command selects 2/5 participants at the HTTP boundary. Real server
 // computes the link; this checks rendering, not availability of a five-card mobile gesture.
 const ids=await page.getByTestId('match3-ally').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
 await page.route('**/api/beast-game/orb-turn',async route=>{const body=route.request().postDataJSON();const response=await route.fetch({postData:JSON.stringify({...body,action:'link',linkIds:ids})});await route.fulfill({response})});
 const p=page.waitForResponse(r=>r.url().endsWith('/orb-turn'));
 const focusRead=page.waitForFunction(()=>{const nodes=Array.from(document.querySelectorAll('[data-testid="orb-attack-focus"] > div'));return nodes.length?nodes.map(n=>({id:n.dataset.sourceId,element:n.dataset.element,damage:Number(n.dataset.damage)})):false});
 const capture=focusRead.then(()=>page.screenshot({path:path.join(out,label+'-focus-'+count+'.png')}));
 await page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]').first().click();
 await page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]').first().evaluate(e=>e.click());
 const linkReply=await(await p).json();assert.equal(linkReply.presentation.groups.length,count);
 const groups=await(await focusRead).jsonValue();
 assert.deepEqual(groups,linkReply.presentation.groups.map(g=>({id:g.attackerId,element:g.element,damage:g.amount})));
 await capture;
 for(const width of [320,375,390,430,1366]){
 await page.setViewportSize({width,height:width>500?900:844});
 const bounds=await page.locator('[data-testid="orb-attack-focus"] > div').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,viewport:innerWidth}}));
 assert.equal(bounds.length,count);assert(bounds.every(r=>r.left>=0&&r.right<=r.viewport&&r.width>=40));
 await page.screenshot({path:path.join(out,label+'-focus-'+count+'-'+width+'.png')});
 }
 await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false');
 assert.equal(calls,2,'double click cannot send a second link command');
 results.at(-1).focusGroups=groups;
 }
 await page.screenshot({path:path.join(out,label+'-'+count+'.png')});await context.close();
 }}finally{await browser.close()}
 fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1});
