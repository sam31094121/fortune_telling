const {chromium}=require('../../../.tmp/shared-qa/node_modules/playwright'),assert=require('assert/strict'),fs=require('fs'),path=require('path');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),results=[];try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);const cdp=await ctx.newCDPSession(page);
 const drag=async cells=>{await page.getByTestId('match3-board').scrollIntoViewIfNeeded();const points=[];for(const c of cells){const b=await page.locator('[role="gridcell"][data-r="'+c.r+'"][data-c="'+c.c+'"]').boundingBox();points.push({x:b.x+b.width/2,y:b.y+b.height/2});}const pending=page.waitForResponse(r=>r.url().endsWith('/orb-turn'));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});for(const p of points.slice(1)){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});await page.waitForTimeout(100);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const res=await pending,body=await res.json();assert.equal(res.status(),200);assert.equal(body.res.valid,true);await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false'||!!document.querySelector('[data-testid="match3-result"]')); return body;};
 await page.goto('http://localhost:8888/beast-game/match3-hard');await page.getByTestId('play-guest').click();await page.getByTestId('pick-hero').first().click();await page.getByTestId('confirm-hero').click();for(let i=0;i<4;i++)await page.getByTestId('pick-card').nth(i).click();await page.getByTestId('start-battle').click();await page.getByTestId('match3-board').waitFor();
 let won=false;
 for(let turn=0;turn<45;turn++){
  let body;const ready=page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]:enabled');
  if(await ready.count()){
   const pending=page.waitForResponse(r=>r.url().endsWith('/orb-turn'));await ready.first().click();const r=await pending;assert.equal(r.status(),200);body=await r.json();await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false'||!!document.querySelector('[data-testid="match3-result"]'));
  }else{
   const cells=await page.locator('[role="gridcell"][data-el]').evaluateAll(es=>es.map(e=>({r:+e.dataset.r,c:+e.dataset.c,el:e.dataset.el})));
   let chain;function walk(route,length){if(route.length===length)return route;const a=route.at(-1);for(const b of cells){if(b.el!==a.el||Math.abs(b.r-a.r)>1||Math.abs(b.c-a.c)>1||route.includes(b))continue;if(a.r!==b.r&&a.c!==b.c&&route.slice(1).some((d,i)=>{const c=route[i];return c.r!==d.r&&c.c!==d.c&&c.r+d.r===a.r+b.r&&c.c+d.c===a.c+b.c}))continue;const found=walk([...route,b],length);if(found)return found;}}
   for(const length of [5,4,3]){for(const cell of cells.slice().sort((a,b)=>Number(b.el==='SPACE')-Number(a.el==='SPACE'))){chain=walk([cell],length);if(chain)break;}if(chain)break;}assert(chain,'a legal natural path exists');body=await drag(chain);
  }
  const team=body.counter?.team??body.team,foes=body.counter?.foes??body.foes;
  if(!body.outcome){const displayed=await page.getByTestId('match3-enemy').evaluateAll(es=>es.map(e=>({id:e.dataset.id,hp:+e.dataset.hp})));for(const f of foes){const shown=displayed.find(d=>d.id===f.id);if(shown)assert.equal(shown.hp,f.hp);else assert.equal(f.hp,0,'only defeated retired enemies may disappear');}assert.deepEqual(await page.getByTestId('match3-ally').evaluateAll(es=>es.map(e=>+e.dataset.hp)),team.map(f=>f.hp));}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  results.push({case:'natural battle action',action:body.action??'drag',version:body.guestVersion,outcome:body.outcome,teamHp:team.map(f=>f.hp),foeHp:foes.map(f=>f.hp)});console.log('action',turn+1,body.outcome,foes.map(f=>f.hp).join(','));
  if(body.outcome){await page.getByTestId('match3-result').waitFor();assert.equal(await page.getByTestId('match3-result').getAttribute('data-result'),body.outcome);assert.equal(body.outcome,'win','natural run must finish with a verified win');won=true;break;}
 }
 assert(won,'full natural victory reached within 45 actions');
 await page.screenshot({path:path.join(__dirname,'natural-win.png')});
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('match3-hard-campaign-guest-v1')));assert.equal(saved.wins,1);assert.equal(saved.receipts.length,1);
 await page.getByTestId('match3-next').click();
 if(await page.getByTestId('start-battle').count())await page.getByTestId('start-battle').click();
 await page.getByTestId('match3-board').waitFor();await page.reload();await page.getByTestId('match3-board').waitFor();
 const restored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('match3-hard-campaign-guest-v1')));assert.equal(restored.wins,1);assert.deepEqual(restored.receipts,saved.receipts);assert.equal(await page.getByTestId('match3-result').count(),0);results.push({case:'natural win, next stage and reload retain exactly one reward',wins:restored.wins,receipts:restored.receipts.length});await page.screenshot({path:path.join(__dirname,'next-stage-refreshed.png')});
 const guest=await page.evaluate(()=>sessionStorage.getItem('match3-hard-campaign-guest-v1'));
 await page.goto('http://localhost:8888/beast-game/treasure-preview',{waitUntil:'domcontentloaded',timeout:60000});await page.getByTestId('match3-board').waitFor();const practice=await drag([0,1,2,3].map(r=>({r,c:0})));assert.equal(await page.evaluate(()=>sessionStorage.getItem('match3-hard-campaign-guest-v1')),guest);results.push({case:'development treasure fixture remains playable without saving guest progress',version:practice.guestVersion,outcome:practice.outcome});
 }finally{await browser.close();fs.writeFileSync(path.join(__dirname,'natural-results.json'),JSON.stringify(results,null,2));}console.log(JSON.stringify(results));})().catch(e=>{console.error(e.stack);process.exitCode=1});
