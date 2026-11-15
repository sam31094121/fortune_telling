// Explicit opt-in integration test. Uses a random isolated owner and deletes only that owner.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), ts = require('typescript');
require('./helpers/server-only-runtime.cjs');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
process.loadEnvFile('.env.local');
const { createClient } = require('@supabase/supabase-js');
const { SupabaseCultivationRepository } = require('../lib/beast-game/cultivation-repository.ts');
const { transactCultivation } = require('../lib/beast-game/cultivation-transaction.ts');
const api = require('../app/api/beast-game/cultivation/route.ts');


const orb=require('../lib/beast-game/cultivation-orb.ts'),games=require('../lib/beast-game/cultivation-games.ts');
const campaign=require('../lib/beast-game/match3/hard-campaign.ts'),drag=require('../lib/beast-game/match3/drag.ts');
const battle=require('../lib/beast-game/interactive.ts'),cardCampaign=require('../lib/beast-game/card-campaign.ts');
const battleApi=require('../app/api/beast-game/battlefield/route.ts'),orbApi=require('../app/api/beast-game/orb-turn/route.ts');
function findChain(b,magic,colors){for(let r=0;r<b.length;r++)for(let c=0;c<b[0].length;c++){if(!colors.includes(b[r][c]))continue;const search=p=>{if(p.length>=4)return p;const a=p[p.length-1];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const n={r:a.r+dr,c:a.c+dc};if(drag.canExtend(b,p,n,true,magic,true)){const found=search([...p,n]);if(found)return found;}}};const found=search([{r,c}]);if(found)return found;}return null;}

const {chromium}=require('../.tmp/shared-qa/node_modules/playwright');
(async()=>{
 if(process.env.BEAST_CULTIVATION_STORAGE_TEST!=='1')throw Error('Explicit isolated storage opt-in required');
 const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),repo=new SupabaseCultivationRepository(client);
 const key=crypto.randomBytes(32).toString('hex'),owner=crypto.createHash('sha256').update(key).digest('hex');
 const ids=['beast_g_qinglong','beast_a02','beast_a03','beast_a04','beast_a05'];
 const cards=[...ids.map((cardId,i)=>({id:'qa:'+i,cardId,bonus:'1000'})),{id:'adult',cardId:'beast_a01',bonus:'0'},{id:'young',cardId:'beast_y01',bonus:'0'},{id:'other-copy',cardId:'beast_a02',bonus:'3'}];
 const dir='.tmp/shared-qa/evidence';fs.mkdirSync(dir,{recursive:true});
 let browser,page,created=false;const errors=[],requests=[];
 try{
  await repo.create(owner,{revision:'0',state:{cards,protectedIds:[]},pendingBattle:null,receipts:[],orbLedger:{wins:0,rewards:[],receipts:[]}});created=true;
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(({key,cards})=>{if(!localStorage.getItem('tdh_beast_wallet_v1')){localStorage.setItem('tdh_beast_wallet_v1',key);localStorage.setItem('tdh_beast_collection_v1',JSON.stringify({cards:cards.map(c=>({...c,source:'DUEL_WIN',at:'2026-11-15'})),history:[],sharedCultivation:true}));}},{key,cards});
  page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('response',async r=>{if(r.url().includes('/api/beast-game/')&&r.request().method()==='POST'){try{requests.push({url:r.url(),body:r.request().postDataJSON(),status:r.status(),reply:await r.json()});}catch{}}});
  await page.goto('http://localhost:8888/beast-game/match3-hard',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);await page.getByTestId('play-self').tap();await page.locator('[data-testid="pick-hero"][data-id="beast_g_qinglong"]').tap();await page.getByTestId('confirm-hero').tap();
  await page.locator('[data-open-shared-cultivation]').tap();await page.locator('[data-main-copy="qa:0"]').waitFor();
  for(let i=0;i<5;i++)await page.locator('[data-main-copy="qa:'+i+'"]').tap();await page.locator('[data-save-main]').tap();await page.locator('[data-shared-saved]').filter({hasText:'五隻主力已鎖定'}).waitFor();
  const fuse=async(target,material)=>{await page.locator('[data-shared-target="'+target+'"]').tap();await page.locator('[data-shared-material="'+material+'"]').tap();await page.locator('[data-shared-preview]').waitFor();if(material==='young'){const before=await repo.read(owner);await page.route('**/api/beast-game/cultivation',route=>route.request().postDataJSON()?.type==='FUSE'?route.abort('internetdisconnected'):route.continue());await page.locator('[data-confirm-shared-fusion]').tap();await page.getByRole('alert').filter({hasText:'尚未確認'}).waitFor();assert.deepEqual(await repo.read(owner),before,'offline fusion never consumes');await page.unroute('**/api/beast-game/cultivation');}await page.locator('[data-confirm-shared-fusion]').tap();await page.locator('[data-shared-saved]').filter({hasText:'合體已保存'}).waitFor();};
  await fuse('adult','young');await fuse('qa:0','adult');let saved=await repo.read(owner);assert.equal(saved.state.cards.length,6);assert.equal(saved.state.protectedIds.length,5);assert(BigInt(saved.state.cards[0].bonus)>1000n);
  await page.screenshot({path:dir+'/390-cultivation.png'});await page.getByRole('button',{name:'返回選卡',exact:true}).tap();
  for(const id of ids.slice(1))await page.locator('[data-testid="pick-card"][data-id="'+id+'"]').tap();
  for(let i=0;i<5;i++)await page.locator('[data-orb-owned-copy="'+ids[i]+'"]').selectOption('qa:'+i);
  assert((await page.locator('[data-orb-owned-copy="beast_a02"] option').allTextContents()).some(t=>t.includes('+3')),'duplicate copy is selectable');
  await page.screenshot({path:dir+'/390-selected.png'});await page.getByTestId('start-battle').tap();await page.getByTestId('match3-board').waitFor();console.log('PASS mobile: manual five-copy locking, two-stage fusion, owned-copy choice, orb entry');
  const touch=await context.newCDPSession(page);let moves=0;
  while(!await page.getByTestId('match3-result').count()&&moves<40){
   await page.waitForFunction(()=>document.querySelector('[data-mode="hard45"]')?.getAttribute('aria-busy')==='false',{},{timeout:30000});await page.waitForTimeout(1200);
   if(await page.getByTestId('match3-result-pending').count()){await page.getByTestId('match3-result').waitFor({timeout:20000});break;}
   const state=await page.evaluate(()=>({cells:[...document.querySelectorAll('[data-testid="match3-board"] [data-r]')].map(e=>({r:+e.dataset.r,c:+e.dataset.c,el:e.dataset.el,magic:+e.dataset.magic||0})),colors:[...document.querySelectorAll('[data-testid="match3-ally"]')].filter(e=>+e.dataset.hp>0).map(e=>e.dataset.el)}));
   const b=Array.from({length:8},()=>Array(7)),magic=Array.from({length:8},()=>Array(7).fill(0));for(const cell of state.cells){b[cell.r][cell.c]=cell.el;magic[cell.r][cell.c]=cell.magic;}
   if(b.flat().some(x=>!x)){await page.waitForTimeout(1500);continue;}
   const chain=findChain(b,magic,state.colors)||findChain(b,magic,['SPACE','AIR','WATER','FIRE','EARTH']);assert(chain,'visible legal gesture');
   const points=[];for(const cell of chain){const box=await page.locator('[data-testid="match3-board"] [data-r="'+cell.r+'"][data-c="'+cell.c+'"]').boundingBox();points.push({x:box.x+box.width/2,y:box.y+box.height/2});}
   const response=page.waitForResponse(r=>r.url().includes('/api/beast-game/orb-turn')&&r.request().method()==='POST',{timeout:6000}).catch(()=>null);
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});for(const point of points.slice(1)){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});await page.waitForTimeout(80);}await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const res=await response;if(!res){moves++;continue;}assert.equal(res.status(),200,(await res.text()).slice(0,300));moves++;
   console.log('mobile orb gesture',moves);
  }
  await page.getByTestId('match3-result').waitFor({timeout:20000});assert.equal(await page.getByTestId('match3-result').getAttribute('data-result'),'win');
  await page.waitForTimeout(2000);saved=await repo.read(owner);assert.equal(saved.orbLedger.wins,1);assert.equal(saved.state.cards.length,7);assert.equal(saved.pendingBattle,null);await page.screenshot({path:dir+'/390-orb-win.png'});console.log('PASS mobile orb: real touch gestures, actual win and one persisted award');
  await page.goto('http://localhost:8888/beast-game/battlefield',{waitUntil:'domcontentloaded'});await page.locator('[data-team-copy="qa:0"]').waitFor();
  for(let i=0;i<5;i++)await page.locator('[data-team-copy="qa:'+i+'"]').tap();
  await page.locator('[data-card-owned-copy="beast_a02"]').selectOption('other-copy');await page.locator('[data-card-owned-copy="beast_a02"]').selectOption('qa:1');
  await page.locator('[data-confirm-owned-team]').tap();await page.waitForTimeout(2000);
  await page.screenshot({path:dir+'/390-card-preparation.png'});

  for(const name of ['青龍','亢金龍','氐土貉','房日兔','心月狐'])await page.getByRole('button',{name:new RegExp('^加碼一張'+name+'，')}).tap();
  await page.getByRole('button',{name:'確認開戰',exact:true}).tap();await page.getByTestId('battle-attack').waitFor();
  const actionResponse=page.waitForResponse(r=>r.url().includes('/api/beast-game/battlefield')&&r.request().postDataJSON()?.type==='ACTION');await page.getByTestId('battle-attack').tap();const firstAction=await (await actionResponse).json();assert(firstAction.ok);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(1500);await page.getByRole('button',{name:'自動',exact:true}).waitFor();const resumed=requests.filter(r=>r.body.type==='RESUME').at(-1);assert(resumed?.reply.ok);assert.equal(resumed.reply.match.revision,firstAction.match.revision,'reload resumes exact saved revision');
  await page.screenshot({path:dir+'/390-card-resumed.png'});
  const finalResponse=page.waitForResponse(async r=>{if(!r.url().includes('/api/beast-game/battlefield')||!['ACTION','AUTO'].includes(r.request().postDataJSON()?.type))return false;return (await r.json()).match?.status==='FINISHED';},{timeout:180000});
  await page.getByRole('button',{name:'自動',exact:true}).tap();const final=await (await finalResponse).json();assert.equal(final.match.winner,'player');
  await page.locator('[data-settlement-saved="yes"]').waitFor({timeout:30000});saved=await repo.read(owner);assert.equal(saved.pendingBattle,null);assert(saved.state.cards.length>=12);const endCount=saved.state.cards.length;
  await page.screenshot({path:dir+'/390-card-win.png'});
  const repeat=await context.request.post('http://localhost:8888/api/beast-game/battlefield',{headers:{'x-beast-wallet':key},data:{type:'RESUME',token:final.token}});assert.equal(repeat.status(),200);assert.equal((await repo.read(owner)).state.cards.length,endCount);
  await page.goto('http://localhost:8888/beast-game/match3-hard',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1500);await page.getByTestId('play-self').tap();
  // Existing valid team may directly start the next battle; return through the customer button.
  await page.waitForFunction(()=>document.querySelector('[data-testid="match3-board"]')||document.querySelector('[data-open-shared-cultivation]'));if(await page.getByTestId('match3-board').count()){await page.getByRole('button',{name:'我的卡片',exact:true}).tap();}
  await page.locator('[data-open-shared-cultivation]').waitFor();await page.locator('[data-open-shared-cultivation]').tap();await page.locator('[data-main-copy="qa:0"]').waitFor();
  assert.equal(await page.locator('[data-main-copy]').count(),endCount);assert.equal(await page.locator('[data-main-copy="young"]').count(),0);assert.equal(await page.locator('[data-main-copy="adult"]').count(),0);
  await page.setViewportSize({width:768,height:1024});await page.screenshot({path:dir+'/768-shared-final.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  console.log('PASS mobile card: five explicit stakes, exact-revision reload/resume, automatic real victory, saved reward, replay no double grant, cross-game inventory and consumed material verified; 768px layout fits.');
  fs.writeFileSync(dir+'/latest.json',JSON.stringify({moves,errors,requests:requests.map(r=>({url:r.url,type:r.body.type,status:r.status}))},null,2));
  assert.deepEqual(errors,[]);console.log('PASS mobile full customer journey complete');
 }catch(e){if(page){await page.screenshot({path:dir+'/failure.png'}).catch(()=>{});console.log('VISIBLE FAILURE', (await page.locator('body').innerText()).slice(-3000));console.log('BROWSER ERRORS',errors);console.log('API FAILURE',JSON.stringify(requests.filter(r=>r.status>=400).map(r=>({url:r.url,bodyType:r.body.type,status:r.status,reply:r.reply}))));}throw e;}
 finally{await browser?.close();if(created){const removed=await client.from('beast_cultivation_accounts').delete().eq('owner_hash',owner).select('owner_hash');assert.ifError(removed.error);assert.equal(removed.data.length,1);console.log('PASS isolated mobile account removed');}}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
