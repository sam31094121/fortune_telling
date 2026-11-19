/** Real DOM native WebAudio audit. Native APIs wrapped only for telemetry; fusion fixture injects board/magic explicitly. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(readFileSync(f, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, f);
const M = require('../lib/beast-game/match3/index.ts');
const {openGuestOrb,sealGuestOrb}=require('./guest-orb-fixture.cjs');
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';

const base = process.env.MATCH3_E2E_BASE || 'http://localhost:8888';
// MATCH3_E2E_BROWSER：非 Windows 驗收機可指定 Chromium 執行檔（同一套 CDP 流程與斷言）；未指定時仍要求 Edge。
const edgePath = process.env.MATCH3_E2E_BROWSER || ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
assert(edgePath, 'Edge is required');
let port;
const profile = mkdtempSync(path.join(os.tmpdir(), 'match3-mobile-review-'));
const output = process.env.MATCH3_SOUND_OUTPUT || path.join(os.tmpdir(),'match3-replay-acceptance-20261109');
mkdirSync(output, { recursive: true });
const browser = spawn(edgePath, ['--headless=new', '--inprivate', '--no-first-run', '--disable-default-apps', ...(process.env.MATCH3_LAYOUT_AUDIT==='1'?[]:['--hide-scrollbars']), '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore','ignore','pipe'], windowsHide: true });
let browserOutput='';browser.stderr.on('data',chunk=>{browserOutput=(browserOutput+chunk).slice(-12000);});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let ws; const errors = [];
let liveServer, liveFrame, liveDone=false;
if(process.env.MATCH3_LIVE_PORT){
  liveServer=createServer((req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(req.url.startsWith('/frame')){if(!liveFrame){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','image/jpeg');res.end(liveFrame);return;}
    if(req.url==='/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({done:liveDone}));return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>寶珠連線即時試玩</title><style>body{margin:0;background:#090a12;color:#eee;text-align:center;font:14px sans-serif}header{padding:8px}img{display:block;max-width:100%;max-height:calc(100vh - 55px);margin:auto}small{color:#bbb}</style><header>寶珠連線 · 即時測試畫面<br><small id="state">獨立測試戰局，不消耗收藏；畫面每秒更新五次</small></header><img id="screen"><script>const image=document.getElementById("screen");setInterval(()=>{image.src="/frame?t="+Date.now()},200);setInterval(async()=>{const s=await(await fetch("/status")).json();if(s.done)document.getElementById("state").textContent="本輪測試已結束，保留最後畫面"},1000)</script>');
  });
  await new Promise(resolve=>liveServer.listen(Number(process.env.MATCH3_LIVE_PORT),'127.0.0.1',resolve));
  console.log('Live test viewer ready');
}
try {
  let target;
  for (let i = 0; i < 150 && !target; i++) { await sleep(200); try { port=Number(readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page' && t.url === 'about:blank'); } catch {} }
  assert(target, 'Headless Edge did not start: '+browserOutput);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; const timer = setTimeout(() => { pending.delete(key); reject(Error(`CDP timeout ${method}`)); }, 20000); pending.set(key, value => { clearTimeout(timer); value.error ? reject(Error(JSON.stringify(value.error))) : resolve(value.result); }); ws.send(JSON.stringify({ id: key, method, params })); });
  const js = async expression => { const value = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (value.exceptionDetails) throw Error(JSON.stringify(value.exceptionDetails)); return value.result?.value; };
  const wait = async (expression, timeout = 90000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await js(`Boolean(${expression})`)) return; await sleep(150); } throw Error(`Wait failed: ${expression}`); };
  const save = async name => { const shot = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path.join(output, name + '.png'), Buffer.from(shot.data, 'base64')); };
  await send('Page.enable'); await send('Runtime.enable');
  if(liveServer){
    ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Page.screencastFrame'){liveFrame=Buffer.from(m.params.data,'base64');void send('Page.screencastFrameAck',{sessionId:m.params.sessionId}).catch(()=>{});}});
    await send('Page.startScreencast',{format:'jpeg',quality:80,maxWidth:500,maxHeight:950,everyNthFrame:3});
  }
  // Offline fixture adapter: authenticate the test's explicitly injected board/magic.
  // Production has no signing endpoint; authority.test separately forbids snapshot tampering.
  await send('Fetch.enable',{patterns:[{urlPattern:'*/api/beast-game/orb-turn',requestStage:'Request'}]});
  ws.addEventListener('message',async event=>{
    const m=JSON.parse(event.data);if(m.method!=='Fetch.requestPaused')return;
    try{
      if(process.env.MATCH3_PREDICTION_REJECT==='1'){
        await send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:400,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({error:'測試：裁判拒絕此操作'})).toString('base64')});return;
      }
      const input=JSON.parse(m.params.request.postData),ticket=openGuestOrb(input.guestBattleToken);
      const {guestBattleToken,...snapshot}=input;
      ticket.input={...ticket.input,...snapshot};ticket.seed=((process.env.MATCH3_DROP_AUDIT==='1'?1004:input.seed)-input.move*2654435761)>>>0;
      input.guestBattleToken=sealGuestOrb(ticket);
      await send('Fetch.continueRequest',{requestId:m.params.requestId,postData:Buffer.from(JSON.stringify(input)).toString('base64')});
    }catch(error){errors.push(String(error));await send('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'Failed'});}
  });
  if(process.env.MATCH3_REPLAY_CPU)await send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.MATCH3_REPLAY_CPU)});
  const snap = () => js(`({round:document.querySelector('[data-testid="match3-round"]')?.textContent, enemy:[...document.querySelectorAll('[data-testid="match3-enemy"]')].map(e=>({id:e.dataset.id,hp:+e.dataset.hp})), ally:[...document.querySelectorAll('[data-testid="match3-ally"]')].map(e=>({id:e.dataset.id,hp:+e.dataset.hp})), damage:+document.querySelector('[data-testid="match3-last-damage"]')?.textContent, cells:[...document.querySelectorAll('[data-testid="match3-board"] [data-r]')].map(e=>({r:+e.dataset.r,c:+e.dataset.c,el:e.dataset.el,mp:+e.dataset.magic||0})), width:innerWidth, scroll:document.documentElement.scrollWidth})`);
  const findPath = (cells, length, diagonal = true, accept = () => true) => {
    const map = new Map(cells.map(c => [`${c.r},${c.c}`, c]));
    const search = route => {
      if (route.length === length) return accept(route) ? route : null;
      const last = route.at(-1);
      for (const dr of [-1, 0, 1]) for (const dc of [-1, 0, 1]) {
        if (!dr && !dc) continue;
        if (!diagonal && dr && dc) continue;
        const n = map.get(`${last.r + dr},${last.c + dc}`);
        if (!n || n.el !== last.el || route.some(p => p.r === n.r && p.c === n.c)) continue;
        if (dr && dc && route.slice(1).some((b, i) => { const a = route[i]; return a.r !== b.r && a.c !== b.c && a.r + b.r === last.r + n.r && a.c + b.c === last.c + n.c; })) continue;
        const found = search([...route, n]); if (found) return found;
      }
      return null;
    };
    for (const c of cells) { const found = search([c]); if (found) return found; }
    throw Error(`No legal ${length}-orb route in DOM`);
  };
  const click = async selector => {
    await wait(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e && Object.keys(e).some(k=>k.startsWith('__reactProps'));})()`);
    await js(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`); await sleep(150);
    const p = await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();for(const fy of [.5,.1,.9])for(const fx of [.5,.1,.9]){const x=r.x+r.width*fx,y=r.y+r.height*fy;if(e.contains(document.elementFromPoint(x,y)))return {x,y};}return null;})()`);
    assert(p, 'Clickable visible point required: '+selector);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
  };
  let touchInput = false;
  const drag = async route => {
    const oldRound = (await snap()).round;
    await js(`document.querySelector('[data-testid="match3-board"]').scrollIntoView({block:'center',behavior:'instant'})`); await sleep(200);
    const points = await js(`(${JSON.stringify(route)}).map(p=>{const e=document.querySelector('[data-testid="match3-board"] [data-r="'+p.r+'"][data-c="'+p.c+'"]'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})`);
    for (const p of points) assert(p.y > 0 && p.y < 844, 'Drag route must remain visible');
    let releasedAt;
    if(touchInput) {
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1}]});
      if(process.env.MATCH3_DRAG_BURST==='1')await Promise.all(points.slice(1).map(p=>send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]})));
      else for(const p of points.slice(1)){await sleep(Number(process.env.MATCH3_DRAG_MS??75));await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]});}
      releasedAt=Date.now();
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    } else {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points[0] });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...points[0], button: 'left', buttons: 1, clickCount: 1 });
    for (const p of points.slice(1)) { await sleep(Number(process.env.MATCH3_DRAG_MS??75)); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p, button: 'left', buttons: 1 }); }
    releasedAt=Date.now();
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points.at(-1), button: 'left', buttons: 0, clickCount: 1 });
    }
    await wait(`${process.env.MATCH3_PREDICTION_REJECT==='1'?'window.__turns?.length>0':`document.querySelector('[data-testid="match3-round"]')?.textContent !== ${JSON.stringify(oldRound)}`} && document.querySelector('[data-testid="match3-board"]')?.getAttribute('aria-busy') === 'false'`,Number(process.env.MATCH3_DROP_WAIT_MS)||90000);
    const releaseToReadyMs=Date.now()-releasedAt;
    await sleep(150);
    return releaseToReadyMs;
  };
  const start = async (wins, width) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: Number(process.env.MATCH3_VIEWPORT_HEIGHT)||844, deviceScaleFactor: 2, mobile: width < 768 });
    // 同分頁重新整理會自動接回上次的玩家（產品行為）；這裡模擬全新進入，先清掉那個記號再導頁，斷言不變。
    await js(`(()=>{try{sessionStorage.removeItem('m3-campaign-last-owner')}catch{}return true})()`);
    await send('Page.navigate', { url: `${base}/beast-game/match3-hard` });
    await wait(`document.querySelector('[data-testid="match3-player-choice"]')`);
    // Animation fixtures use an isolated guest session. Real shared inventory
    // and authoritative victories are covered by beast-cultivation-mobile.cjs.
    await click('[data-testid="play-guest"]');
    await wait(`document.querySelector('[data-testid="pick-hero"]') || document.querySelector('[data-testid="match3-board"]')`);
    if(await js('!!document.querySelector("[data-testid=pick-hero]")')) {
      await click('[data-testid="pick-hero"]'); await click('[data-testid="confirm-hero"]');
      await wait(`document.querySelectorAll('[data-testid="pick-card"]').length>=4`);
      const choices=await js(`[...document.querySelectorAll('[data-testid="pick-card"]')].slice(0,${Math.max(0,Number(process.env.MATCH3_PARTY_COUNT||5)-1)}).map(c=>c.dataset.id)`);
      for(const id of choices)await click('[data-testid="pick-card"][data-id="'+id+'"]');
      // Wait for the real selection flow; never force-enable the start button.
      await wait(`(()=>{const b=document.querySelector('[data-testid="start-battle"]');return b&&!b.disabled;})()`);
      await js(`(()=>{const key='match3-hard-campaign-guest-v1',p=JSON.parse(sessionStorage.getItem(key));p.wins=${wins};sessionStorage.setItem(key,JSON.stringify(p));})()`);
      await click('[data-testid="start-battle"]');
    }
    await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===56`);
    await sleep(300);
  };
  const state = async (fixture=false) => js(`(()=>{
    const root=document.querySelector('[data-testid="match3-board"]');
    let f=root[Object.keys(root).find(k=>k.startsWith('__reactFiber$'))], chosen;
    for(;f;f=f.return){let hooks=[],h=f.memoizedState;for(let i=0;h&&i<80;i++,h=h.next)hooks.push(h);if(hooks.filter(h=>Array.isArray(h.memoizedState)&&h.memoizedState.length===8&&Array.isArray(h.memoizedState[0])).length>=2){chosen=hooks;break;}}
    if(!chosen)throw Error('Fixture owner not found');
    const matrix=chosen.filter(h=>Array.isArray(h.memoizedState)&&h.memoizedState.length===8&&Array.isArray(h.memoizedState[0]));
    const b=matrix.find(h=>typeof h.memoizedState[0][0]==='string'), m=matrix.find(h=>typeof h.memoizedState[0][0]==='number');
    const t=chosen.find(h=>Array.isArray(h.memoizedState)&&h.memoizedState.length&&h.memoizedState[0]?.energy!==undefined&&h.memoizedState[0]?.hp!==undefined);
    const e=chosen.find(h=>Array.isArray(h.memoizedState)&&h.memoizedState.length&&h.memoizedState[0]?.cd!==undefined&&h.memoizedState[0]?.hp!==undefined);
    if(${JSON.stringify(fixture)} && typeof ${JSON.stringify(fixture)} === 'object'){const f=${JSON.stringify(fixture)};b.queue.dispatch(f.board);m.queue.dispatch(f.magic);if(f.lastAlly && ${process.env.MATCH3_LAYOUT_AUDIT === '1'})e.queue.dispatch(e.memoizedState.map((u,i)=>({...u,hp:i===4?0:u.hp})));if(f.lastAlly)t.queue.dispatch(t.memoizedState.map((u,i)=>({...u,hp:i?0:u.hp})));}
    else if(${JSON.stringify(fixture)}){const els=['FIRE','WATER','AIR','SPACE','EARTH'];const board=Array.from({length:8},(_,r)=>Array.from({length:7},(_,c)=>els[(r*2+c)%5]));const magic=Array.from({length:8},()=>Array(7).fill(0));for(let c=0;c<3;c++)magic[3][c]=7;board[6][0]=board[6][1]=board[6][2]='EARTH';b.queue.dispatch(board);m.queue.dispatch(magic);}
    if(${process.env.MATCH3_FEEDBACK_AUDIT === '1'})t.queue.dispatch(t.memoizedState.map(u=>({...u,hp:Math.max(1,Math.floor(u.maxHp/2))})));
    if(${process.env.MATCH3_DROP_AUDIT === '1'}){t.queue.dispatch(t.memoizedState.map((u,i)=>({...u,hp:${process.env.MATCH3_SOLO_DROP === '1'}&&i?0:Math.max(1,Math.floor(u.maxHp/3)),attack:1,energy:0})));e.queue.dispatch(e.memoizedState.map(u=>({...u,hp:10000,maxHp:10000,attack:1,attackEnergy:0})));}
    if(${process.env.MATCH3_PARTY_ENERGY === '1'})t.queue.dispatch(t.memoizedState.map(u=>({...u,energy:100})));
    return {team:t.memoizedState,foes:e.memoizedState};
  })()`);
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
    window.__audioLog=[];window.__rigLog=[];new MutationObserver(ms=>{for(const m of ms)if(m.attributeName==="data-rig-active"&&m.target.hasAttribute("data-rig-stage")&&m.target.dataset.rigActive==="true")window.__rigLog.push({t:performance.now()})}).observe(document,{subtree:true,attributes:true,attributeFilter:["data-rig-active"]});let n=0;const Native=window.AudioContext;
    window.AudioContext=class extends Native{constructor(...args){super(...args);const ctx=this;
      const create=ctx.createOscillator.bind(ctx);ctx.createOscillator=()=>{const o=create(),id=++n;let hz=0;const set=o.frequency.setValueAtTime.bind(o.frequency);o.frequency.setValueAtTime=(v,t)=>{hz=v;return set(v,t)};
      for(const name of ['start','stop']){const orig=o[name].bind(o);o[name]=(...a)=>{window.__audioLog.push({kind:name,id,hz,t:performance.now(),audioTime:ctx.currentTime,scheduled:a[0],state:ctx.state});return orig(...a)}}return o};
      const close=ctx.close.bind(ctx);ctx.close=()=>{window.__audioLog.push({kind:'close',t:performance.now(),state:ctx.state});return close()};
    }};
  })()`});

  await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.__gains=[];const createGain=AudioContext.prototype.createGain;AudioContext.prototype.createGain=function(){const g=createGain.call(this);window.__gains.push(g);return g}'});

  if(process.env.MATCH3_PARTY_AUDIT==='1'){
    let fixedBoard;
    for(const count of [1,2,3,4,5]){
      process.env.MATCH3_PARTY_COUNT=String(count);await start(0,Number(process.env.MATCH3_PARTY_WIDTH)||390);await sleep(1200);
      const layout=await js(`(()=>{const cards=[...document.querySelectorAll('[data-testid="match3-ally"]')];const b=document.querySelector('[data-testid="match3-board"]').getBoundingClientRect();return {board:{w:b.width,h:b.height},count:cards.length,cards:cards.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}),weapons:[...document.querySelectorAll('[data-testid="orb-treasures"] button')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width}}),width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
      if(!fixedBoard)fixedBoard=layout.board;assert(Math.abs(layout.board.w-fixedBoard.w)<=1&&Math.abs(layout.board.h-fixedBoard.h)<=1,'board size must stay fixed across party counts');
      assert.equal(layout.count,count);assert(!layout.overflow);assert(layout.cards.every(r=>r.w>40&&r.h>40&&r.x>=0&&r.x+r.w<=layout.width+1));
      for(let i=1;i<count;i++)assert(layout.cards[i].x>=layout.cards[i-1].x+layout.cards[i-1].w,'cards must not overlap');
      if(count>1){assert.equal(layout.weapons.length,count);for(let i=0;i<count;i++)assert(Math.abs(layout.cards[i].x+layout.cards[i].w/2-layout.weapons[i].x-layout.weapons[i].w/2)<=1,'weapon must align with its ally');}
      if(process.env.MATCH3_PARTY_ENERGY==='1'){
        await state();await sleep(500);
        for(let wait=0;wait<40&&await js(`document.querySelectorAll('[data-testid="orb-treasures"] button').length`)!==count;wait++)await sleep(250);
        const ready=await js(`(()=>{const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height}};return {board:r(document.querySelector('[data-testid="match3-board"]')),orbs:[...document.querySelectorAll('[data-testid="match3-ready-energy-orb"]')].map(r),weapons:[...document.querySelectorAll('[data-testid="orb-treasures"] button')].map(r)}})()`);
        assert.equal(ready.orbs.length,count);assert(Math.abs(ready.board.w-layout.board.w)<=1&&Math.abs(ready.board.h-layout.board.h)<=1,'energy reveal must not resize board');
        if(count>1)for(let i=0;i<count;i++){assert(Math.abs(ready.orbs[i].x+ready.orbs[i].w/2-layout.cards[i].x-layout.cards[i].w/2)<=1);assert(ready.orbs[i].y>=layout.cards[i].y+layout.cards[i].h-1);assert(ready.orbs[i].y+ready.orbs[i].h<=ready.weapons[i].y+1,'energy stays between card and weapon');}
        if(count===1){const c=layout.cards[0],w=ready.weapons[0],o=ready.orbs[0];assert(c.x-(w.x+w.w)>=10,'solo left weapon needs visible clearance');assert(o.x-(c.x+c.w)>=10,'solo right orb needs visible clearance');}
        layout.ready=ready;
      }
      await save('party-'+count);results.push({kind:'party-layout',...layout});console.log('Party layout',count,'PASS');await sleep(liveServer?4500:0);
    }
  }
  if(process.env.MATCH3_LAYOUT_AUDIT==='1'){
    await start(18,390);
    const initial=await snap();const board=Array.from({length:8},(_,r)=>initial.cells.filter(c=>c.r===r).map(c=>c.el));
    await state({board,magic:Array.from({length:8},()=>Array(7).fill(7)),lastAlly:true});
    for(const height of (process.env.MATCH3_LAYOUT_HEIGHT?[Number(process.env.MATCH3_LAYOUT_HEIGHT)]:[844,700,680,650,640,600,580,720])){
      process.env.MATCH3_VIEWPORT_HEIGHT=String(height);await start(18,435);await state({board,magic:Array.from({length:8},()=>Array(7).fill(7)),lastAlly:true});
      await send('Emulation.setDeviceMetricsOverride',{width:435,height,deviceScaleFactor:2,mobile:false});await sleep(700);
      const samples=await js(`new Promise(resolve=>{const a=[];function frame(){const b=document.querySelector('[data-testid="match3-board"]'),r=b.closest('section'),t=document.querySelector('[data-testid="match3-ally"]')?.parentElement;const box=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};a.push({board:box(b),root:box(r),team:box(t),lock:r.dataset.match3ScrollLock,width:document.documentElement.clientWidth,scroll:scrollY,style:r.getAttribute('style')});if(a.length<120)requestAnimationFrame(frame);else resolve(a)}requestAnimationFrame(frame)})`);
      writeFileSync(path.join(output,'layout-'+height+'.json'),JSON.stringify(samples));
      const spread=Math.max(...[0,1,2,3].map(i=>Math.max(...samples.map(s=>s.board[i]))-Math.min(...samples.map(s=>s.board[i]))));
      assert(spread<=1,'Idle board must not oscillate: '+height+' drift '+spread);
      const gutter=await js(`(()=>{const h=document.documentElement,old=h.style.overflow,read=()=>document.querySelector('[data-testid="match3-board"]').getBoundingClientRect().x;h.style.overflow='scroll';const a=read();h.style.overflow='hidden';const b=read();h.style.overflow=old;return {a,b,drift:Math.abs(a-b),gutter:getComputedStyle(h).scrollbarGutter,ancestors:(()=>{const out=[];for(let e=document.querySelector('[data-testid=match3-board]');e;e=e.parentElement){const r=e.getBoundingClientRect(),s=getComputedStyle(e);out.push({tag:e.tagName,cls:e.className,x:r.x,w:r.width,position:s.position,width:s.width,overflow:s.overflow})}return out})()}})()`);
      assert(gutter.drift<=1,'Scrollbar visibility must not move board: '+JSON.stringify(gutter));
      results.push({kind:'layout-stability',height,spread,gutter});
      console.log('Layout',height,'board drift',spread,'scrollbar drift',gutter.drift);
    }
    process.exitCode=0;
  }
  // Deterministic input fixture, real server response and real pointer playback.
  // Isolated browser profile: never edits the customer's saved game.
  for (const [width, length, reduced] of ((process.env.MATCH3_LAYOUT_AUDIT==='1'||process.env.MATCH3_PARTY_AUDIT==='1')?[]:Array.from({length:Number(process.env.MATCH3_REPLAY_REPEAT)||1},()=>[[320,5,false],[390,6,false],[768,6,false],[1440,7,false],[390,5,true]]).flat())) {
    if(process.env.MATCH3_REPLAY_CASE&&String(width)!==process.env.MATCH3_REPLAY_CASE)continue;
    if(liveServer&&reduced)continue;
    await send('Emulation.setEmulatedMedia',{features: reduced ? [{name:'prefers-reduced-motion',value:'reduce'}] : []});
    await start(6,width);
    touchInput=width<768;await send('Emulation.setTouchEmulationEnabled',{enabled:touchInput});
    console.log('Checking replay',width,length,reduced);
    const board=M.generateBoard(M.seededRng(1),8,7,true);board[7].fill('FIRE',0,length);
    if(process.env.MATCH3_DROP_AUDIT==='1'){
      const n=Number(process.env.MATCH3_DROP_SHIELDS)||(width===1440?11:width===390&&!reduced?10:9);
      const route=(process.env.MATCH3_DROP_SHIELDS?Array.from({length:8},(_,r)=>Array.from({length:7},(_,i)=>({r,c:r%2?6-i:i}))).flat():[...[0,1,2,3,4,5,6].map(c=>({r:6,c})),...[6,5,4,3,2,1,0].map(c=>({r:7,c}))]).slice(0,n);
      const magic=M.emptyMagic(board);route.forEach(p=>{board[p.r][p.c]='SPACE';magic[p.r][p.c]=7;});
      await state({board,magic});await sleep(150);
      await js(`window.__dropReply=null;const oldFetch=window.fetch;window.fetch=async(...args)=>{const r=await oldFetch(...args);if(String(args[0]).includes('/orb-turn'))window.__dropReply=await r.clone().json();return r;}`);
      await js(`window.__dropCredits=[];new MutationObserver(ms=>{for(const m of ms)if(m.attributeName==='data-count'&&m.target.matches('[data-treasure]'))window.__dropCredits.push({owner:m.target.dataset.owner,count:Number(m.target.dataset.count),duringDrop:!!document.querySelector('[data-testid="orb-drop-stage"]')});}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-count']});`);
      const playing=drag(route);void playing.catch(()=>{});
      if(!reduced){await wait('document.querySelector("[data-testid=orb-drop-stage]")');assert.equal(await js('document.querySelectorAll("[data-drop-index]").length'),Math.min(256,2**(n-9)));
        if(process.env.MATCH3_SOLO_DROP!=='1')await wait('document.querySelector("[data-testid=orb-card-divider]")?.getBoundingClientRect().width > 0');
        const geometry=await js('(()=>{const b=document.querySelector("[data-testid=match3-board]").getBoundingClientRect(),s=document.querySelector("[data-testid=orb-drop-stage]").getBoundingClientRect();return {boardBottom:b.bottom,stageWidth:s.width,dividers:[...document.querySelectorAll("[data-testid=orb-card-divider]")].map(e=>({top:e.getBoundingClientRect().top,width:e.getBoundingClientRect().width})),orbWidth:document.querySelector("[data-drop-index]").getBoundingClientRect().width};})()');
        assert(geometry.dividers.every(d=>d.top>=geometry.boardBottom),'divider overlaps playable board');
        assert(Math.abs(geometry.orbWidth-geometry.stageWidth*.072)<1,'visible body differs from physical diameter');
        await save('drop-'+width+'-'+n);
        if(process.env.MATCH3_CREDIT_CAPTURE==='1'){
          await wait('[...document.querySelectorAll("[data-treasure]")].some(e=>Number(e.dataset.count)>0)');
          assert(await js('!!document.querySelector("[data-testid=orb-drop-stage]")'),'catch feedback remains visible before playback completes');
          await save('drop-credit-'+width+'-'+n);
        }}
      await playing;
      const reply=await js('window.__dropReply');assert.equal(reply.treasure.drops.length,Math.min(256,2**(n-9)));
      const caught=reply.treasure.drops.filter(d=>d.ownerId);
      if(caught.length&&!reduced){const credits=await js('window.__dropCredits');assert(credits.some(c=>c.duringDrop&&c.count>0),'treasure count must visibly increase during drop playback, not only after the whole batch');}
      if(process.env.MATCH3_SOLO_DROP==='1'){
        const mouth=reply.treasure.catches[0];
        const geometry=await js(`(()=>{const c=[...document.querySelectorAll('[data-testid="match3-ally"]')].find(e=>Number(e.dataset.hp)>0),r=c.getBoundingClientRect(),t=c.parentElement.getBoundingClientRect();return {width:r.width/t.width*1000,id:c.dataset.id};})()`);
        assert.equal(reply.treasure.catches.length,1);
        assert(Math.abs(mouth.right-mouth.left-geometry.width)<1,'last ally catch follows actual enlarged card');
        assert(caught.length>0,'last ally fixture actually catches a ball');
        assert(caught.every(d=>d.ownerId===geometry.id),'dead slots receive no reward');
      }
      assert.equal(reply.treasure.catalog.reduce((sum,c)=>sum+c.count,0),caught.length);
      if(caught.length){
        const owner=caught[0].ownerId,u=reply.beforeCounter.team.find(u=>u.id===owner);assert.equal(u.hp,u.maxHp);assert.equal(u.energy,100);
        await wait(`document.querySelector('[data-testid="match3-ready-energy-orb"][data-source-id="${owner}"]')?.disabled===false`,15000);
        await save('before-energy-'+width);
        writeFileSync(path.join(output,'energy-button-'+width+'.json'),JSON.stringify(await js(`(()=>{const e=document.querySelector('[data-testid="match3-ready-energy-orb"]');return {button:e?{disabled:e.disabled,label:e.getAttribute('aria-label')}:null,team:window.__dropReply?.counter?.team?.map(u=>({id:u.id,hp:u.hp,energy:u.energy,charges:u.orbDropCharges}))};})()`),null,2));
        await click('[data-testid="match3-ready-energy-orb"][data-source-id="'+owner+'"]');
        await wait('window.__dropReply?.action==="energy"',20000);
        const attack=await js('window.__dropReply');assert(attack.actualDamage>=5000);assert(attack.foes.some(f=>f.orbDropCounterBlocked));
        if(process.env.MATCH3_WEAPON_AUDIT==='1'){
          await wait('document.querySelector("[data-testid=match3-board]").getAttribute("aria-busy")!=="true"');
          const weapon=await js(`(()=>{const e=[...document.querySelectorAll('[data-treasure]')].find(e=>!e.disabled&&Number(e.dataset.count)>0);return e?{element:e.dataset.treasure,variant:Number(e.dataset.variant),count:Number(e.dataset.count)}:null;})()`);
          assert(weapon,'caught weapon is available for manual use');
          await click('[data-treasure="'+weapon.element+'"][data-variant="'+weapon.variant+'"]');
          await wait('!!window.__dropReply?.effect');
          const used=await js('window.__dropReply');assert.equal(used.effect.element,weapon.element);assert.equal(used.effect.variant,weapon.variant);
          assert.equal(used.catalog.find(x=>x.element===weapon.element&&x.variant===weapon.variant).count,weapon.count-1,'one manual click consumes exactly one weapon');
          await wait('document.querySelector("[data-testid=match3-board]").getAttribute("aria-busy")!=="true"');
          assert(used.effect.damage>0,'manual weapon produces actual damage');
        }
      }
      await save('drop-result-'+width+'-'+n);results.push({case:'server pinball',width,reduced,shields:n,drops:reply.treasure.drops.map(d=>({owner:d.ownerId,duration:d.durationMs,impacts:d.impacts.length})),caught:caught.length});continue;
    }
    if(process.env.MATCH3_SIDE_DOCK_AUDIT==='1' && width<=640){
      const geometry=()=>js(`(()=>{const b=document.querySelector('[data-testid="match3-board"]').getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};})()`);
      const before=await geometry();
      await state({board,magic:M.emptyMagic(board),lastAlly:true});
      await wait('document.querySelector("[data-last-ally-stage=true]")');await sleep(500);
      const after=await geometry();await save('side-dock-'+width);
      const dock=await js(`(()=>{const es=[...document.querySelectorAll('[data-testid="orb-treasures"] button')];return es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};});})()`);
      writeFileSync(path.join(output,'side-dock-geometry-'+width+(reduced?'-reduced':'')+'.json'),JSON.stringify({before,after,dock},null,2));
      assert(Math.abs(before.w-after.w)<1&&after.y<=before.y+1&&before.y-after.y<=25,'last ally preserves orb size and raises board at most 24px: '+JSON.stringify({before,after}));
      assert(dock.length===1&&dock.every(r=>r.w>=44&&r.h>=44&&r.x>=0&&r.right<=width+1),'side weapons retain usable touch targets');
      assert(dock.every(r=>r.y>=after.y+after.h-1&&r.bottom<=(Number(process.env.MATCH3_VIEWPORT_HEIGHT)||844)),'weapons do not cover board or leave screen');
      const orbDock=await js(`(()=>{const e=document.querySelector('[data-solo-energy="true"]'),r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}:null;})()`);
      assert(orbDock&&Math.abs(orbDock.w-dock[0].w)<1&&Math.abs(orbDock.h-dock[0].h)<1,'left weapon and right orb use matching touch sizes');
      assert(orbDock.x>=after.x+after.w/2&&orbDock.right<=width&&orbDock.y>=after.y+after.h-1&&orbDock.bottom<=(Number(process.env.MATCH3_VIEWPORT_HEIGHT)||844),'right orb stays beside card and below board');
      results.push({case:'last ally side dock',width,before,after,dock,orbDock});continue;
    }
    await state({board,magic:M.emptyMagic(board)}); await sleep(100);
    await js(`window.__replaySamples=[];window.__turns=[];window.__turnInputs=[];window.__pointerSamples=[];window.__submitAck=null;
      for(const type of ['pointerdown','pointermove','pointerup'])document.addEventListener(type,e=>{const h=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-r]'),r=h?.getBoundingClientRect();window.__pointerSamples.push({type,x:e.clientX,y:e.clientY,hit:h?[h.dataset.r,h.dataset.c]:null,coalesced:e.getCoalescedEvents?.().map(p=>({x:p.clientX,y:p.clientY}))??[],rect:r?{x:r.x,y:r.y,w:r.width,h:r.height}:null});},true);
      const nativeFetch=window.fetch;window.fetch=async (url,options)=>{
        if(String(url).includes('/api/beast-game/orb-turn')){const input=JSON.parse(options.body);if(${Number(process.env.MATCH3_PREDICTION_MISMATCH)||0})input.seed=1001;window.__turnInputs.push(input);options={...options,body:JSON.stringify(input)};const started=performance.now();if(${Number(process.env.MATCH3_RESPONSE_DELAY_MS)||0})await new Promise(r=>setTimeout(r,${Number(process.env.MATCH3_RESPONSE_DELAY_MS)||0}));const response=await nativeFetch(url,options);window.__turns.push(await response.clone().json());window.__requestLatency={started,received:performance.now()};return response;}return nativeFetch(url,options);
      };
      window.__replayObserver=new MutationObserver(()=>{
        const b=document.querySelector('[data-testid=match3-board]'),svg=b?.querySelector('[data-testid=match3-replay-lines]');
        if(!window.__submitAck&&b?.dataset.submitting==='true')window.__submitAck={at:performance.now(),selected:b.querySelectorAll('[data-r][class*="_sel"]').length};
        if(!svg || !svg.querySelector('circle'))return;
        const epoch=b.dataset.refillEpoch;if(window.__replaySamples.some(s=>s.epoch===epoch))return;
        const rect=svg.getBoundingClientRect();
        window.__replaySamples.push({epoch,t:performance.now(),chain:+svg.dataset.chain,busy:b.getAttribute('aria-busy'),pointer:getComputedStyle(svg).pointerEvents,
          cells:[...b.querySelectorAll('[role=gridcell]')].map(c=>({r:+c.dataset.r,c:+c.dataset.c,el:c.dataset.el,empty:c.dataset.empty,magic:+c.dataset.magic||0,flash:c.className.includes('_flash')})),
          groups:[...svg.querySelectorAll('[data-match-count]')].map(g=>({count:+g.dataset.matchCount,element:g.dataset.matchElement,label:g.querySelector('text').textContent,
            paths:[...g.querySelectorAll('polyline')].map(p=>JSON.parse(p.dataset.matchPath)),strokes:[...g.querySelectorAll('polyline')].map(p=>({colour:getComputedStyle(p).stroke,width:getComputedStyle(p).strokeWidth})),
            cells:[...g.querySelectorAll('circle')].map(c=>{const [r,col]=c.dataset.matchCell.split(':').map(Number);const cell=b.querySelector('[data-r="'+r+'"][data-c="'+col+'"]'),cr=cell.getBoundingClientRect();return {r,c:col,dx:Math.abs(rect.x+c.cx.baseVal.value-cr.x-cr.width/2),dy:Math.abs(rect.y+c.cy.baseVal.value-cr.y-cr.height/2),animation:getComputedStyle(c).animationName};})}))});
      });window.__replayObserver.observe(document.querySelector('[data-testid=match3-board]'),{subtree:true,childList:true,attributes:true});`);
    const beforePrediction=await snap();
    const playing=drag(Array.from({length},(_,c)=>({r:7,c})));
    void playing.catch(()=>{});
    try{await wait('window.__replaySamples.length > 0',Number(process.env.MATCH3_REPLAY_WAIT_MS)||90000);}catch(error){
      writeFileSync(path.join(output,'replay-failure-'+width+'.json'),JSON.stringify(await js(`({visibility:document.visibilityState,focus:document.hasFocus(),epoch:document.querySelector('[data-testid=match3-board]')?.dataset.refillEpoch,busy:document.querySelector('[data-testid=match3-board]')?.getAttribute('aria-busy'),samples:window.__replaySamples,pointers:window.__pointerSamples,turns:window.__turns,inputs:window.__turnInputs,visible:document.body.innerText,cells:[...document.querySelectorAll('[data-testid=match3-board] [data-r="7"]')].map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {r:r.y,bottom:r.bottom,hit:hit?.tagName,hitClass:hit?.className,cell:!!hit?.closest('[data-r]')}})})`),null,2));await save('replay-failure-'+width);throw error;
    }
    await save('match-lines-'+width+'-'+length+(reduced?'-reduced':''));const releaseToReadyMs=await playing;
    const observed=await js('window.__replayObserver.disconnect();({samples:window.__replaySamples,pointers:window.__pointerSamples,turn:window.__turns[0],input:window.__turnInputs[0],events:window.__match3Events})');
    if(process.env.MATCH3_PREDICTION_REJECT==='1'){
      const restored=await snap();
      assert.deepEqual(restored.cells,beforePrediction.cells,'rejected prediction restores confirmed board');
      assert.deepEqual(restored.ally,beforePrediction.ally,'rejected prediction cannot heal or spend HP');
      assert.deepEqual(restored.enemy,beforePrediction.enemy,'rejected prediction cannot damage foes');
      assert.equal(restored.round,beforePrediction.round,'rejected prediction cannot advance turn');
      assert.equal(await js('document.querySelectorAll("[data-testid=match3-replay-lines]").length'),0);
      results.push({case:'referee rejection restores board',width,reduced});continue;
    }
    assert.deepEqual(observed.input.path,Array.from({length},(_,c)=>({r:7,c})),'every selected cell reaches the backend');
    const expected=observed.turn.replay.filter(f=>f.matches.length);
    if(process.env.MATCH3_PREDICTION_MISMATCH==='1') {
      assert(observed.samples.length>expected.length,'divergent prediction must be replaced by authoritative playback');
      observed.predictedSamples=observed.samples.slice(0,-expected.length);
      observed.samples=observed.samples.slice(-expected.length);
    }
    assert.equal(observed.samples.length,expected.length,'every real match is shown before disappearing');
    for(const [i,sample] of observed.samples.entries()){
      const f=expected[i];assert.equal(sample.chain,f.chain);assert.equal(sample.busy,'true');assert.equal(sample.pointer,'none');
      assert(sample.cells.every(c=>!c.flash),'complete match shown before clear animation');
      assert.deepEqual(sample.groups.map(g=>g.count),f.matches.map(g=>g.count));
      sample.groups.forEach((g,j)=>{assert.equal(g.label,f.matches[j].label);assert.deepEqual(g.paths,f.matches[j].paths);assert(g.strokes.every(p=>p.colour==='rgb(255, 243, 174)'&&p.width==='4px'),'recorded lines stay visible above legacy drag styles');assert.deepEqual(g.cells.map(({r,c})=>({r,c})),f.matches[j].cells);assert(g.cells.every(c=>c.dx<1&&c.dy<1),'lines exactly centre on real cells');if(reduced)assert(g.cells.every(c=>c.animation==='none'));});
      for(const c of sample.cells)if(!c.empty){assert.equal(c.el,f.boardBefore[c.r][c.c]);assert.equal(c.magic,f.magicBefore[c.r][c.c]);}
    }
    assert.equal(await js('document.querySelectorAll("[data-testid=match3-replay-lines]").length'),0,'no stale line after settlement');
    assert.deepEqual(observed.events.filter(e=>e.count!==undefined).map(e=>e.count),expected.flatMap(f=>f.matches.map(g=>g.count)));
    const final=await snap();
    if(width<=640){
      assert(await js('(()=>{const e=document.querySelector("[data-testid=orb-support-result]");return !e||getComputedStyle(e).display==="none";})()'),'settlement paragraphs stay out of mobile battle');
      assert(await js('document.querySelector("[data-testid=match3-turn-feedback]").getBoundingClientRect().height<=1'),'status does not consume mobile height');
    }
    // 2026-11-15：蓄能改為手動，這筆拖珠完成後不可自動追加能量攻擊；仍核對最後一筆實際後端事件。
    // 連線／能量技回 actualDamage，一般回合回 damage＋起手＋收尾。只比第一手會把自動連線攻擊的傷害（常等於敵人全部血量）誤判成不一致。
    const lastTurn=await js('window.__turns.at(-1)');
    assert(!lastTurn.action || lastTurn.action==='drag', 'replay must not automatically spend stored energy');
    const expectedLastDamage=lastTurn.action==='link'||lastTurn.action==='energy'?lastTurn.actualDamage:lastTurn.damage+lastTurn.startDamage+lastTurn.endDamage;
    assert.equal(final.damage,expectedLastDamage);
    if(process.env.MATCH3_FEEDBACK_AUDIT==='1'){
      assert.equal(await js('document.querySelector("[data-testid=match3-visible-damage]")?.textContent'),'本步傷害 '+expectedLastDamage);
      const healed=observed.turn.healingSummary.filter(h=>h.actual>0).map(h=>({id:h.id,actual:h.actual})).sort((a,b)=>a.id.localeCompare(b.id));
      assert(healed.length>0,'injured fixture must exercise real healing');
      assert.deepEqual(await js('[...document.querySelectorAll("[data-testid=match3-heal-receipt]")].map(e=>({id:e.dataset.targetId,actual:+e.dataset.actualHeal})).sort((a,b)=>a.id.localeCompare(b.id))'),healed);
      await save('feedback-'+width+'-'+length);
    }
    final.cells.forEach(c=>{assert.equal(c.el,observed.turn.res.board[c.r][c.c]);assert.equal(c.mp,observed.turn.res.magic[c.r][c.c]);});
    const latency=await js('window.__requestLatency');
    const ack=await js('window.__submitAck');
    assert(ack&&ack.selected===length,'released route remains visibly acknowledged while waiting');
    assert(ack.at<latency.received,'input feedback appears before the server response');
    if(Number(process.env.MATCH3_RESPONSE_DELAY_MS)>=800)assert((observed.predictedSamples??observed.samples)[0].t<latency.received,'local board calculation plays before the referee response');
    assert(final.scroll<=width);results.push({case:'recorded match then clear',width,length,reduced,chains:expected.length,releaseToReadyMs,requestMs:Math.round(latency.received-latency.started),responseToFirstMatchMs:Math.round(observed.samples[0].t-latency.received),inputFeedbackMs:Math.round(ack.at-latency.started)});
    writeFileSync(path.join(output,'replay-'+width+'-'+length+(reduced?'-reduced':'')+'.json'),JSON.stringify(observed,null,2));
  }
  if(process.env.MATCH3_REPLAY_ONLY==='1'){
    assert.equal(errors.length,0,errors.join('\n'));writeFileSync(path.join(output,'refill-result.json'),JSON.stringify({passed:true,scope:'replay-only',results,errors},null,2));console.log('PASS replay-only cases: '+results.length);
  }else{
  await send('Emulation.setEmulatedMedia',{features:[]});

  touchInput=false;await send('Emulation.setTouchEmulationEnabled',{enabled:false});
  for(const width of [320,390,820,1440]) {
    await start(0,width);
    await js('document.querySelector("[data-testid=match3-board]").scrollIntoView({block:"center",behavior:"instant"})');
    await js('window.__falls=[];window.__watch=true;function sampleFall(){const b=document.querySelector("[data-testid=match3-board]");if(b?.dataset.refilling){const cells=[...b.querySelectorAll("[data-fall-from]")];window.__falls.push({busy:b.getAttribute("aria-busy"),disabled:document.querySelector("[data-testid=open-picker]").disabled,overflow:getComputedStyle(b).overflow,cells:cells.map(c=>({r:+c.dataset.r,from:+c.dataset.fallFrom,delay:parseFloat(getComputedStyle(c).animationDelay),animation:getComputedStyle(c).animationName,transform:getComputedStyle(c).transform,opacity:getComputedStyle(c).opacity}))})}if(window.__watch)requestAnimationFrame(sampleFall)}requestAnimationFrame(sampleFall)');
    const baseline=await snap();writeFileSync(path.join(output,'free-play-before-'+width+'.json'),JSON.stringify(baseline,null,2));
    const play=drag(findPath(baseline.cells,3));
    await wait('document.querySelector("[data-testid=match3-board]")?.dataset.refilling === "true"',20000);await sleep(120);await save('refill-moving-'+width);await play;
    const observations=await js('window.__watch=false;window.__falls');
    assert(observations.length>2,'actual falling frames must render');
    assert(observations.every(f=>f.busy==='true'&&f.disabled&&f.overflow==='hidden'),'no input while unsettled and entering beads stay inside board');
    assert(observations.some(f=>new Set(f.cells.map(c=>c.delay)).size>1),'stagger visible in real CSS');
    assert(observations.some(f=>f.cells.some(c=>c.animation.includes('m3RefillFall')&&c.transform!=='none')));
    const after=await snap();assert.equal(after.cells.length,56);assert(after.scroll<=width);
    assert.equal(await js('document.querySelectorAll("[data-fall-from]").length'),0,'all motion state settles');
    assert.equal(await js('window.__gains[0].gain.value'),1,'no extra master attenuation');
    results.push({width,frames:observations.length,sample:observations.slice(0,2),after});await save('refill-settled-'+width);
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await start(0,390);
  await js('window.__reducedNames=[];new MutationObserver(()=>{for(const a of document.getAnimations())if(a.animationName)window.__reducedNames.push(a.animationName)}).observe(document.querySelector("[data-testid=match3-board]"),{attributes:true,subtree:true})');
  await drag(findPath((await snap()).cells,3));const names=await js('window.__reducedNames');assert(!names.some(n=>/m3RefillFall|m3SoftDrop|m3SoftClear|m3SoftWaterClear/.test(n)));
  await click('[data-testid="match3-home"]');await wait('location.pathname==="/"');

  await send('Emulation.setEmulatedMedia',{features:[]});await start(0,390);
  const exitRoute=findPath((await snap()).cells,3);
  await js('document.querySelector("[data-testid=match3-board]").scrollIntoView({block:"center",behavior:"instant"})');
  const exitPoints=await js('('+JSON.stringify(exitRoute)+').map(p=>{const b=document.querySelector("[data-testid=match3-board]"),e=[...b.querySelectorAll("[data-r]")].find(e=>+e.dataset.r===p.r&&+e.dataset.c===p.c),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...exitPoints[0],button:'left',buttons:1,clickCount:1});for(const p of exitPoints.slice(1))await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p,button:'left',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...exitPoints.at(-1),button:'left',buttons:0,clickCount:1});
  await wait('document.querySelector("[data-testid=match3-board]")?.dataset.refilling === "true"');
  await click('[data-testid="match3-home"]');await wait('location.pathname==="/"');const leftAt=await js('performance.now()');await sleep(6000);
  assert(await js('window.__audioLog.some(e=>e.kind==="close")'));
  assert(!(await js('window.__audioLog.some(e=>e.kind==="start"&&e.t>'+leftAt+')')),'leaving during refill cancels delayed attacks and sounds');results.push({case:'leave during refill cancels pending actions'});
  assert.equal(errors.length,0,errors.join('\n'));writeFileSync(path.join(output,'refill-result.json'),JSON.stringify({passed:true,results,reduced:names,errors},null,2));console.log('PASS real refill, mobile/tablet/desktop, settle, unity gain, reduced motion, home: '+output);
  }
}catch(error){writeFileSync(path.join(output,'refill-result.json'),JSON.stringify({passed:false,results,errors,error:String(error)},null,2));console.error(error);process.exitCode=1}
finally{liveDone=true;try{ws?.close()}catch{}try{browser.kill()}catch{}if(liveServer)setTimeout(()=>liveServer.close(),300000);}
