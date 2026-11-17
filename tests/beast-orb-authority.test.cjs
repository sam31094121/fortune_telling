// Read-only HTTP + isolated Chrome guest audit. No customer wallet or database writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,f);
const {signedFixture,openGuestOrb,sealGuestOrb}=require('./guest-orb-fixture.cjs');
const {playableCards}=require('../lib/beast-game/registry.ts');
const cards=playableCards().filter(c=>c.form==='YOUNG').slice(0,5);
const {orbOutcome}=require('../lib/beast-game/match3/battle-outcome.ts');
const base=process.env.SCREEN_HEALTH_BASE_URL||'http://localhost:8888';
const failures=[],checks=[];
function check(name,fn){try{fn();checks.push(name);console.log('PASS '+name)}catch(e){failures.push(name+': '+e.message);console.error('FAIL '+name+': '+e.message)}}
function fixture(){return {board:Array.from({length:8},(_,r)=>Array.from({length:7},(_,c)=>['SPACE','AIR','WATER','FIRE','EARTH'][(r+c)%5])),magic:Array.from({length:8},()=>Array(7).fill(0)),path:[],team:cards.map((c,i)=>({id:c.id,name:c.name,thumbnail:c.art.thumbnail,element:c.element,hp:i?0:1,maxHp:1,attack:20,energy:100})),foes:cards.map((c,i)=>({id:c.id,name:c.name,thumbnail:c.art.thumbnail,element:c.element,hp:i?0:1,maxHp:100,attack:100,cd:1,attackEnergy:75})),mode:'hard45',wins:0,target:0,seed:71,move:0,chosen:{},rule:'tap-lead',attackBoost:1};}
async function post(p){const r=await fetch(base+'/api/beast-game/orb-turn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),signal:AbortSignal.timeout(20000)});return {status:r.status,body:await r.json()};}
function outcome(r){return r.outcome??r.verdict??r.winner;}
(async()=>{
 check('unknown double elimination cannot fabricate either winner',()=>assert.equal(orbOutcome([{hp:0}],[{hp:0}]),'unavailable'));
 // Independent expectations: one living player/foe, 1 HP each, positive energy hit.
 const win=fixture();Object.assign(win,{action:'energy',attackerId:win.team[0].id,eventId:'authority-win',actionId:'authority-win'});
 Object.assign(win,signedFixture(win));
 const w=await post(win);check('last enemy takes actual 1 HP; player remains alive',()=>{assert.equal(w.status,200);assert.equal(w.body.actualDamage,1);assert(w.body.foes.every(f=>f.hp===0));assert.equal(w.body.team[0].hp,1)});
 check('server explicitly confirms player victory',()=>assert(['win','player','PLAYER','WON'].includes(outcome(w.body)),'no authoritative terminal result in response'));
 const loss=fixture();loss.board[0].fill(loss.team[0].element);loss.path=[0,1,2].map(c=>({r:0,c}));loss.team[0].attack=0;loss.foes[0].hp=100;
 Object.assign(loss,signedFixture(loss,'authority-loss'));
 const l=await post(loss);check('living enemy counter kills last player; no victory from attack animation',()=>{assert.equal(l.status,200);assert(l.body.counter.team.every(f=>f.hp===0));assert(l.body.counter.foes.some(f=>f.hp>0));assert(l.body.counter.hits.some(h=>h.hpBefore===1&&h.hpAfter===0&&h.actualDamage===1))});
 check('server explicitly confirms player defeat',()=>assert(['lose','opponent','OPPONENT','LOST'].includes(outcome(l.body)),'no authoritative terminal result in response'));
 const replay=await post(win);check('guest replay deterministic (not a persistent receipt test)',()=>assert.deepEqual(replay,w));
 const rawCommand={...win,guestBattleToken:undefined,foes:win.foes.map((f,i)=>({...f,hp:i?0:100}))};
 const originalCommand=signedFixture(rawCommand,'authority-rewrite');
 const firstCommand=await post(originalCommand);
 const rewritten=await post({...originalCommand,team:originalCommand.team.map((f,i)=>i?f:{...f,attack:1000000})});
 check('guest cannot rewrite attack stats on the same recorded command',()=>{
   if(rewritten.status===400||rewritten.status===409)return;
   assert.deepEqual(rewritten,firstCommand,'guest endpoint trusts rewritten client combat state; authenticated guest state/receipt is still missing');
 });
 const unsigned=await post({...win,guestBattleToken:undefined});check('unsigned hard45 snapshot rejected',()=>assert.equal(unsigned.status,400));
 const altered=await post({...win,guestBattleToken:win.guestBattleToken+'x'});check('modified guest signature rejected',()=>assert.equal(altered.status,400));
 const malformed=await post({...win,target:99});check('invalid operation rejected',()=>assert.equal(malformed.status,400));
 let pw;for(const candidate of [process.env.PLAYWRIGHT_MODULE,'playwright','../.tmp/shared-qa/node_modules/playwright','../scripts/card-preview/node_modules/playwright'].filter(Boolean)){try{pw=require(candidate);break}catch{}}
 if(!pw)throw Error('Chrome browser audit requires installed Playwright; not skipped');
 const executablePath=process.env.CHROME_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
 if(!executablePath)throw Error('Chrome required for browser authority audit');
 const browser=await pw.chromium.launch({executablePath,headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);
 // Near-terminal fixtures are signed offline, then all moves use the real endpoint.
 await page.route('**/api/beast-game/orb-guest',async route=>{
   const response=await route.fetch(),body=await response.json();assert.equal(response.status(),200);
   body.initial.team=body.initial.team.map(c=>({...c,energy:100}));
   body.initial.foes=body.initial.foes.map((c,i)=>({...c,hp:i?0:1}));
   const ticket=openGuestOrb(body.guestBattleToken);ticket.input=body.initial;
   body.guestBattleToken=sealGuestOrb(ticket);
   await route.fulfill({response,json:body});
 });
 await page.goto(base+'/beast-game/match3-hard?m3debug=1');await page.getByTestId('play-guest').click();await page.getByTestId('pick-hero').first().click();await page.getByTestId('confirm-hero').click();for(let i=0;i<4;i++)await page.getByTestId('pick-card').nth(i).click();await page.getByTestId('start-battle').click();await page.getByTestId('match3-board').waitFor();
 // Only seed near-terminal HP/energy through the app's existing fixture hook.
 // Damage and the final result still come from a real HTTP action.
 await page.evaluate(()=>{for(let i=1;i<5;i++)window.__m3Debug.foeHp(i,0);window.__m3Debug.foeHp(0,1);window.__m3Debug.fillEnergy()});
 await page.route('**/api/beast-game/orb-turn',route=>route.abort());await page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]').first().click();await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false');
 const failedResults=await page.getByTestId('match3-result').count();check('failed request cannot display victory',()=>assert.equal(failedResults,0));await page.unroute('**/api/beast-game/orb-turn');
 // A response missing authority must not be "repaired" by the browser from HP.
 await page.route('**/api/beast-game/orb-turn',async route=>{const r=await route.fetch(),body=await r.json();delete body.outcome;await route.fulfill({response:r,json:body})});
 await page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]').first().click();await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy')==='false');
 const absentVerdict=await page.getByTestId('match3-result').count();check('missing server outcome cannot produce client-guessed victory',()=>assert.equal(absentVerdict,0));await page.unroute('**/api/beast-game/orb-turn');
 const pending=page.waitForResponse(r=>r.url().endsWith('/orb-turn'),{timeout:20000});
 await page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]').first().click();const response=await pending,body=await response.json();await page.getByTestId('match3-result').waitFor();
 const shown=await page.getByTestId('match3-result').getAttribute('data-result');
 check('real API lethal energy action displays player victory',()=>{assert.equal(response.status(),200);assert(body.foes.every(f=>f.hp===0));assert(body.team.some(f=>f.hp>0));assert.equal(shown,'win')});
 check('displayed terminal result has explicit server confirmation',()=>assert(outcome(body)!==undefined,'UI displays '+shown+' although API supplies no terminal verdict; HP-derived UI judgment is not display-only'));
 // Saved guest receipt and reload: one win, no duplicate UI award on refresh.
 const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('match3-hard-campaign-guest-v1')));await page.reload();await page.getByTestId('match3-board').waitFor();const restored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('match3-hard-campaign-guest-v1')));
 check('guest confirmed reward is retained once across refresh',()=>{assert.equal(stored.wins,1);assert.equal(stored.receipts.length,1);assert.equal(restored.wins,1);assert.deepEqual(restored.receipts,stored.receipts)});
 // Delay a real old response past navigation. An unmounted battle must not win the next one.
 await page.evaluate(()=>{for(let i=1;i<5;i++)window.__m3Debug.foeHp(i,0);window.__m3Debug.foeHp(0,1);window.__m3Debug.fillEnergy()});
 let release,ready;const received=new Promise(r=>ready=r),held=new Promise(r=>release=r);
 await page.route('**/api/beast-game/orb-turn',async route=>{const r=await route.fetch();ready();await held;await route.fulfill({response:r}).catch(()=>{})});
 await page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]').first().click();await Promise.race([received,new Promise((_,reject)=>setTimeout(()=>reject(Error('old response fixture timed out')),20000))]);await page.goto(base+'/');release();await page.unroute('**/api/beast-game/orb-turn');await page.goto(base+'/beast-game/match3-hard?m3debug=1');await page.getByTestId('match3-board').waitFor();
 const afterOld=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('match3-hard-campaign-guest-v1')));check('old reply after leaving cannot award or finish next battle',()=>assert.deepEqual(afterOld.receipts,stored.receipts));assert.equal(await page.getByTestId('match3-result').count(),0);
 // Presentation contract playback of the separately verified real lethal-counter response.
 // No fabricated winner: l was independently checked against 1 -> 0 actual HP above.
 await page.evaluate(()=>window.__m3Debug.fillEnergy());
 await page.route('**/api/beast-game/orb-turn',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({action:'energy',actionId:'presentation-loss',targetId:l.body.counter.foes[0].id,attackerIds:[l.body.counter.team[0].id],team:l.body.counter.team,foes:l.body.counter.foes,actualDamage:0,actualHits:[],skillEvents:[],outcome:l.body.outcome,guestVersion:l.body.guestVersion,guestBattleToken:l.body.guestBattleToken,guestProfile:l.body.guestProfile})}));
 await page.locator('[data-testid="match3-ready-energy-orb"][data-source-id]').first().click();await page.getByTestId('match3-result').waitFor();const lossShown=await page.getByTestId('match3-result').getAttribute('data-result');check('verified loss fact playback displays defeat, not player victory',()=>assert.equal(lossShown,'lose'));
 }finally{await browser.close()}
 console.log(JSON.stringify({passed:checks.length,failed:failures.length,failures,limits:['guest synthetic endgames only; no production customer match','self database and double-zero policy require separate verification','independent HP expectations do not establish full game balance']}));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1});
