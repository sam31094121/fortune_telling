const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
if(process.env.BEAST_CULTIVATION_STORAGE_TEST!=='1')throw new Error('Set BEAST_CULTIVATION_STORAGE_TEST=1 for isolated storage/browser QA');
process.loadEnvFile('.env.local');
const {chromium}=require('../.tmp/shared-qa/node_modules/playwright');
const {createClient}=require('@supabase/supabase-js');
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const dir='.tmp/orb-performance';fs.mkdirSync(dir,{recursive:true});
const label=process.env.ORB_LABEL||'before',limit=+(process.env.ORB_TURNS||15);
const stats={label,requests:[],turns:[],errors:[]};
function find(cells,n,colors){const map=new Map(cells.map(c=>[c.r+','+c.c,c]));function walk(p){if(p.length>=n)return p;const a=p.at(-1);for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const b=map.get((a.r+dr)+','+(a.c+dc));if(!b||b.el!==a.el||p.some(x=>x.r===b.r&&x.c===b.c))continue;if(dr&&dc&&p.slice(1).some((z,i)=>{const x=p[i];return x.r!==z.r&&x.c!==z.c&&x.r+z.r===a.r+b.r&&x.c+z.c===a.c+b.c;}))continue;const r=walk([...p,b]);if(r)return r;}}for(const c of cells){if(colors&&!colors.includes(c.el))continue;const r=walk([c]);if(r)return r;}}
(async()=>{let browser,page,key=crypto.randomBytes(32).toString('hex');try{
browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(key=>localStorage.setItem('tdh_beast_wallet_v1',key),key);
if(process.env.ORB_OWNED==='1'){
 const cards=['beast_g_qinglong','beast_a01','beast_a02','beast_a03','beast_a04'].map((cardId,i)=>({id:'perf:'+i,cardId,bonus:'0'}));
 const owner=crypto.createHash('sha256').update(key).digest('hex');const r=await db.from('beast_cultivation_accounts').insert({owner_hash:owner,revision:'0',snapshot:{revision:'0',state:{cards,protectedIds:cards.map(c=>c.id)},pendingBattle:null,receipts:[],orbLedger:{wins:Math.max(0,+(process.env.ORB_STAGE||1)-1),rewards:[],receipts:[]}}});assert.ifError(r.error);
 await context.addInitScript(cards=>localStorage.setItem('tdh_beast_collection_v1',JSON.stringify({cards,history:[],sharedCultivation:true})),cards);stats.ownedNormal=true;
}
await context.addInitScript(()=>{window.__perf={frames:[],long:[],busy:[]};let prev=performance.now();function frame(t){if(!document.hidden&&document.querySelector('[data-testid="match3-board"]')){window.__perf.frames.push(t-prev);if(window.__perf.frames.length>20000)window.__perf.frames.shift();}prev=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);new PerformanceObserver(l=>window.__perf.long.push(...l.getEntries().map(e=>({at:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true});});
page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>stats.errors.push(e.message));
if(process.env.ORB_SEED)await page.route('**/api/beast-game/cultivation',async route=>{const r=route.request();let body;try{body=r.postDataJSON();}catch{}if(body?.type==='ORB_BEGIN')await route.continue({postData:JSON.stringify({...body,seed:+process.env.ORB_SEED})});else await route.continue();});
const starts=new Map();page.on('request',r=>{if(r.url().includes('/api/beast-game/'))starts.set(r,Date.now());});
page.on('response',async r=>{if(!starts.has(r.request()))return;let b={};try{b=r.request().postDataJSON()||{};}catch{};let result={};try{const x=await r.json();result={version:x.sharedVersion,valid:x.res?.valid,frames:x.replay?.length};}catch{}stats.requests.push({route:new URL(r.url()).pathname,action:b.action||b.type||'turn',ms:Date.now()-starts.get(r.request()),status:r.status(),...result});});
await page.goto((process.env.ORB_BASE||'http://localhost:8888')+'/beast-game/match3-hard',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1500);await page.getByTestId('play-self').tap();await page.getByTestId('pick-hero').first().waitFor();key=await page.evaluate(()=>localStorage.getItem('tdh_beast_wallet_v1'));assert(key);
if(stats.ownedNormal)await page.locator('[data-testid="pick-hero"][data-id="beast_g_qinglong"]').tap();else await page.getByTestId('pick-hero').first().tap();await page.getByTestId('confirm-hero').tap();await page.getByTestId('pick-card').first().waitFor();
if(stats.ownedNormal){for(const id of ['beast_a01','beast_a02','beast_a03','beast_a04'])await page.locator('[data-testid="pick-card"][data-id="'+id+'"]').tap();for(const [i,id]of ['beast_g_qinglong','beast_a01','beast_a02','beast_a03','beast_a04'].entries())await page.locator('[data-orb-owned-copy="'+id+'"]').selectOption('perf:'+i);}else for(let i=0;i<4;i++)await page.getByTestId('pick-card').nth(i).tap();await page.getByTestId('start-battle').tap();await page.getByTestId('match3-board').waitFor();
const touch=await context.newCDPSession(page);const board=page.getByTestId('match3-board');
if(process.env.ORB_TRACK_ENLARGED==='1')await page.evaluate(()=>{
 window.__enlarged=[];
 new MutationObserver(()=>{
  for(const [kind,selector]of [['foe','[data-last-foe="true"]'],['ally','[data-last-ally="true"]']]){
   const host=document.querySelector(selector);if(!host||window.__enlarged.some(e=>e.kind===kind))continue;
   const b=document.querySelector('[data-testid="match3-board"]').getBoundingClientRect();
   const units=[...host.querySelectorAll('[data-hp]')].map(e=>({id:e.dataset.id,hp:+e.dataset.hp,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
   window.__enlarged.push({kind,at:Date.now(),board:{width:b.width,height:b.height},units});
  }
 }).observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-last-foe','data-last-ally']});
});
if(process.env.ORB_CPU==='1'){await touch.send('Emulation.setCPUThrottlingRate',{rate:4});stats.cpuThrottle=4;}
async function gesture(chain,cancel=false){const pts=[];for(const c of chain){const b=await page.locator(`[data-testid="match3-board"] [data-r="${c.r}"][data-c="${c.c}"]`).boundingBox();pts.push({x:b.x+b.width/2,y:b.y+b.height/2});}await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pts[0]]});for(const pt of pts.slice(1)){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt]});await page.waitForTimeout(65);}await touch.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});}
await page.waitForTimeout(2800);
if(process.env.ORB_MEASURE==='1')await page.evaluate(()=>{window.__perf.frames=[];window.__perf.long=[];window.__perf.cellsAdded=0;window.__perf.epochs=0;const b=document.querySelector('[data-testid="match3-board"]');new MutationObserver(records=>{for(const r of records){if(r.type==='attributes'&&r.attributeName==='data-refill-epoch')window.__perf.epochs++;for(const n of r.addedNodes)if(n instanceof Element&&n.matches('[data-r]'))window.__perf.cellsAdded++;}}).observe(b,{childList:true,attributes:true});});
if(process.env.ORB_DROP==='1') {let dropped=0;await page.route('**/api/beast-game/orb-turn',async route=>{if(dropped<+(process.env.ORB_DROP_COUNT||1)){dropped++;const response=await route.fetch();stats.droppedCommittedResponse=response.status();await route.abort('failed');}else await route.continue();});}
const snap=()=>page.evaluate(()=>({cells:[...document.querySelectorAll('[data-testid="match3-board"] [data-r]')].map(e=>({r:+e.dataset.r,c:+e.dataset.c,el:e.dataset.el,magic:+e.dataset.magic||0})),colors:[...document.querySelectorAll('[data-testid="match3-ally"]')].filter(e=>+e.dataset.hp>0).map(e=>e.dataset.el)}));
let s=await snap();let cancelCount=stats.requests.length;await gesture(find(s.cells,3),true);await page.waitForTimeout(400);stats.cancelNoRequest=stats.requests.length===cancelCount;
if(process.env.ORB_OFFLINE==='1'){
 await context.setOffline(true);await gesture(find(s.cells,3));await page.getByTestId('orb-reconnect').waitFor({timeout:45000});stats.offlineMessage=(await page.locator('section[role="alert"]').innerText());
 await context.setOffline(false);await page.getByTestId('orb-reconnect').tap();await board.waitFor();assert.deepEqual((await snap()).cells,s.cells);stats.offlineRecovered=true;console.log('PASS offline visible error and exact recovery after reconnect');
}
if(process.env.ORB_MULTITOUCH==='1'){
 const count=stats.requests.filter(r=>r.route.endsWith('/orb-turn')).length;
 await page.evaluate(()=>{const host=document.querySelector('[data-testid="match3-board"]'),cells=host.querySelectorAll('[data-r]');const send=(type,id,c)=>{const r=c.getBoundingClientRect();host.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',clientX:r.x+r.width/2,clientY:r.y+r.height/2}));};send('pointerdown',1,cells[0]);send('pointerdown',2,cells[1]);send('pointerup',2,cells[1]);send('pointercancel',1,cells[0]);});
 await page.waitForTimeout(1800);stats.secondaryTouchRequests=stats.requests.filter(r=>r.route.endsWith('/orb-turn')).length-count;console.log('secondary touch requests',stats.secondaryTouchRequests);
}
for(let i=0;i<limit;i++){
 await page.waitForFunction(()=>document.querySelector('[data-testid="match3-result"]')||document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false',{},{timeout:60000});
 if(await page.getByTestId('match3-result').count()){stats.outcome=await page.getByTestId('match3-result').getAttribute('data-result');break;}
 s=await snap();const chain=find(s.cells,i%3===0?5:4,s.colors)||find(s.cells,3);assert(chain,'legal path');
 const start=Date.now();await gesture(chain);await page.waitForTimeout(100);
 if(i===1&&process.env.ORB_BACKGROUND==='1'){
  await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')?.getAttribute('data-refilling')==='true');
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.__qaHidden?'hidden':'visible'});Object.defineProperty(document,'hidden',{configurable:true,get:()=>!!window.__qaHidden});window.__qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(100);const epoch=await board.getAttribute('data-refill-epoch');await page.waitForTimeout(800);assert.equal(await board.getAttribute('data-refill-epoch'),epoch,'background holds refill phase after in-flight DOM commit');
  await page.evaluate(()=>{window.__qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));});stats.backgroundVerified=true;
 }
 await page.waitForFunction(()=>document.querySelector('[data-testid="match3-result"]')||document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false',{},{timeout:90000});
 stats.turns.push({i,startedAt:start,endedAt:Date.now(),ms:Date.now()-start,chain:chain.length,round:await page.getByTestId('match3-round').textContent().catch(()=>null),lastFoe:await page.getByTestId('match3-enemies').getAttribute('data-last-foe').catch(()=>null)});console.log(label,'turn',i,stats.turns.at(-1).ms);
 if(process.env.ORB_MEASURE!=='1')await page.screenshot({path:dir+'/'+label+'-latest.png'});
 if(process.env.ORB_TRACK_ENLARGED==='1')for(const kind of ['foe','ally']){if(!stats[kind+'Screenshot']&&await page.locator('[data-last-'+kind+'="true"]').count()){await page.screenshot({path:dir+'/'+label+'-last-'+kind+'.png'});stats[kind+'Screenshot']=true;}}
 fs.writeFileSync(dir+'/'+label+'.json',JSON.stringify(stats,null,2));
}
stats.perf=await page.evaluate(()=>window.__perf);stats.enlarged=await page.evaluate(()=>window.__enlarged);stats.visible=(await page.locator('body').innerText()).slice(-1500);await page.screenshot({path:dir+'/'+label+'-final.png'});
if(stats.outcome==='lose'){
 await page.getByRole('button',{name:'原難度重試',exact:true}).tap();
 await page.getByTestId('match3-result').waitFor({state:'detached'});await board.waitFor();
 const retry=await snap();assert(retry.cells.length===56);stats.lossRetryVerified=true;
 console.log('PASS normal difficulty retry after loss');
}
if(stats.outcome==='win'&&process.env.ORB_NEXT==='1'){const start=Date.now();await page.getByRole('button',{name:'挑戰下一關',exact:true}).tap();await page.waitForFunction(()=>document.body.innerText.includes('第 2 關'),{},{timeout:45000});await board.waitFor();stats.nextStageMs=Date.now()-start;await page.getByTestId('open-picker').tap();await page.getByTestId('start-battle').waitFor();stats.nextAndReturn=true;console.log('PASS next stage and return to selection');}
const owner=crypto.createHash('sha256').update(key).digest('hex');const saved=await db.from('beast_cultivation_accounts').select('snapshot').eq('owner_hash',owner).single();assert.ifError(saved.error);const run=saved.data.snapshot.orbRun;
await page.reload({waitUntil:'domcontentloaded'});await page.getByTestId('play-self').waitFor();await page.waitForTimeout(1500);await page.getByTestId('play-self').tap();await page.waitForTimeout(2000);stats.reloadVisible=(await page.locator('body').innerText()).slice(-1200);
if(process.env.ORB_VERIFY_RESUME==='1' && saved.data.snapshot.pendingBattle){await board.waitFor();await page.waitForTimeout(150);const actual=await snap();assert.deepEqual(actual.cells.map(c=>c.el),run.input.board.flat());assert.deepEqual(actual.cells.map(c=>c.magic),run.input.magic.flat());const hp=await page.locator('[data-testid="match3-ally"]').evaluateAll(es=>es.map(e=>({id:e.dataset.id,hp:+e.dataset.hp})));assert.deepEqual(hp,run.input.team.map(c=>({id:c.id,hp:c.hp})));stats.resumeVerified=true;console.log('PASS exact persisted board, magic and HP after reload');await gesture(find(actual.cells,3));await page.waitForTimeout(1000);}
assert.equal(stats.cancelNoRequest,true,'cancel must not submit a command');
assert.deepEqual(stats.errors,[],'browser must not raise uncaught errors');
if(process.env.ORB_NEXT==='1')assert.equal(stats.nextAndReturn,true,'must win, enter next stage and return');
console.log('completed',label,stats.outcome,stats.requests.length);
}catch(e){process.exitCode=1;stats.error=e.stack;console.error(e);if(page){stats.failureVisible=(await page.locator("body").innerText()).slice(-1500);await page.screenshot({path:dir+"/"+label+"-failure.png"}).catch(()=>{});}}finally{await browser?.close();if(key){const owner=crypto.createHash('sha256').update(key).digest('hex');const r=await db.from('beast_cultivation_accounts').delete().eq('owner_hash',owner).select('owner_hash');assert.ifError(r.error);assert(r.data.length<=1);stats.cleaned=true;}fs.writeFileSync(dir+'/'+label+'.json',JSON.stringify(stats,null,2));}})();

