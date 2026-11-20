// Authorized live guest play. Only reads visible cells and sends real pointer drags.
// No routes, fixtures, debug hooks, storage edits or direct API commands.
const fs=require('node:fs'),path=require('node:path'),pw=require('../.tmp/shared-qa/node_modules/playwright');
const base=process.env.LIVE_SEVENTEEN_BASE||'http://localhost:8888';
const out=process.env.LIVE_SEVENTEEN_OUT||(base.includes('localhost')?'reports/beast-game/local-seventeen-2026-11-20':'reports/beast-game/live-seventeen-2026-11-20');fs.mkdirSync(out,{recursive:true});
function candidates(cells){
 const map=new Map(cells.map(c=>[c.r*7+c.c,c])),results=[];let visited=0;
 for(const first of cells){
  const walk=(p,used)=>{if(++visited>250000)return;const last=p.at(-1);if(p.length>=3){const all=p.every(c=>c.magic>=7),effective=p.reduce((s,c)=>s+Math.max(1,c.magic),0),sameTotal=cells.filter(c=>c.el===first.el).length;let score=all&&p.length>=17?100000:all&&p.length===3&&sameTotal>=8?300+sameTotal:!p.some(c=>c.magic>=7)?(effective>=7?100:0)+p.length: -100;if(!all && !p.some(c=>c.magic>=7) && ['SPACE','FIRE'].includes(first.el))score+=200;results.push({p:[...p],score,all,effective});}if(p.length===17)return;
   for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const r=last.r+dr,c=last.c+dc;if(r<0||r>=8||c<0||c>=7)continue;const next=map.get(r*7+c);if(!next||next.el!==first.el||used.has(r*7+c))continue;if(dr&&dc&&p.some((a,i)=>i&&a.r!==p[i-1].r&&a.c!==p[i-1].c&&a.r+p[i-1].r===last.r+r&&a.c+p[i-1].c===last.c+c))continue;used.add(r*7+c);p.push(next);walk(p,used);p.pop();used.delete(r*7+c);}
  };walk([first],new Set([first.r*7+first.c]));
 }return results.sort((a,b)=>b.score-a.score);
}
(async()=>{const browser=await pw.chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const record={base,started:new Date().toISOString(),moves:[],battles:[],achieved:false};
try{const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(45000);const cdp=await page.context().newCDPSession(page);
await page.goto(record.base+'/beast-game/match3-hard',{waitUntil:'networkidle'});await page.getByTestId('play-guest').click();await page.locator('[data-testid="pick-hero"][data-id="beast_g_xuanwu"]').click();await page.getByTestId('confirm-hero').click();for(let i=0;i<4;i++)await page.getByTestId('pick-card').nth(i).click();await page.getByTestId('start-battle').click();await page.getByTestId('match3-board').waitFor();
await page.screenshot({path:path.join(out,'start.png')});
for(let turn=1;turn<=120;turn++){
 if(await page.getByTestId('match3-result').count()){record.result=await page.getByTestId('match3-result').getAttribute('data-result');record.battles.push({afterTurn:turn-1,result:record.result});if(record.battles.length>=Number(process.env.LIVE_SEVENTEEN_BATTLES||5)||record.result!=='win')break;await page.getByTestId('match3-next').click();await page.getByTestId('match3-result').waitFor({state:'detached'});await page.getByTestId('match3-board').waitFor();}
 await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false');
 await page.getByTestId('match3-board').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
 const cells=await page.locator('[data-testid="match3-board"] [data-r][data-c][data-el]').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {r:+n.dataset.r,c:+n.dataset.c,el:n.dataset.el,magic:+(n.dataset.magic||0),x:r.x+r.width/2,y:r.y+r.height/2}}));
 const options=candidates(cells),chosen=options[0];if(!chosen){record.stop='no legal path';break;}
 const pending=page.waitForResponse(r=>r.url().endsWith('/orb-turn'),{timeout:15000});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:chosen.p[0].x,y:chosen.p[0].y}]});
 for(const c of chosen.p.slice(1)){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:c.x,y:c.y}]});await new Promise(r=>setTimeout(r,65));}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const response=await pending,body=await response.json();if(response.status()!==200)throw Error('real command failed '+response.status());
 const event={turn,path:chosen.p.map(({r,c,el,magic})=>({r,c,el,magic})),pureShields:chosen.all,physicalCount:chosen.p.length,largestShieldPath:Math.max(0,...options.filter(o=>o.all).map(o=>o.p.length)),outcome:body.outcome,playerHp:body.counter?.team.map(u=>u.hp),enemyHp:body.counter?.foes.map(f=>f.hp),dropCount:body.treasure?.drops?.length,valid:body.res?.valid};record.moves.push(event);
 console.log(JSON.stringify(event));fs.writeFileSync(path.join(out,'play.json'),JSON.stringify(record,null,2));
 if(chosen.all&&chosen.p.length===17){record.achieved=true;await page.screenshot({path:path.join(out,'seventeen.png')});await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false',{},{timeout:180000});break;}
 await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false'||document.querySelector('[data-testid="match3-result"]'),{},{timeout:90000});
 await page.screenshot({path:path.join(out,'last.png')});
}
record.finished=new Date().toISOString();record.finalText=(await page.locator('body').innerText()).slice(-700);
}catch(e){record.error=e.message;console.error(e)}finally{fs.writeFileSync(path.join(out,'play.json'),JSON.stringify(record,null,2));await browser.close()}})();
