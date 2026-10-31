/** Real headless Edge input in isolated profiles. Natural acquisition uses no state injection; explicitly labeled fixtures inject only board/magic state. No collection writes. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {counterPhase}=require('../.beast-game-build/lib/beast-game/match3');
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.env.MATCH3_E2E_BASE || 'http://localhost:8888';
const edgePath = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
assert(edgePath, 'Edge is required');
const port = 9700 + Math.floor(Math.random() * 150);
const profile = mkdtempSync(path.join(os.tmpdir(), 'match3-mobile-review-'));
const output = path.resolve('reports/beast-rig-review/mobile-match3-2026-10-31');
mkdirSync(output, { recursive: true });
const browser = spawn(edgePath, ['--headless=new', '--no-first-run', '--disable-default-apps', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let ws; let probeEffect = false; let effectEvidence; const errors = [];
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
  assert(target, 'Headless Edge did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; const timer = setTimeout(() => { pending.delete(key); reject(Error(`CDP timeout ${method}`)); }, 20000); pending.set(key, value => { clearTimeout(timer); value.error ? reject(Error(JSON.stringify(value.error))) : resolve(value.result); }); ws.send(JSON.stringify({ id: key, method, params })); });
  const js = async expression => { const value = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (value.exceptionDetails) throw Error(JSON.stringify(value.exceptionDetails)); return value.result?.value; };
  const wait = async (expression, timeout = 90000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await js(`Boolean(${expression})`)) return; await sleep(150); } throw Error(`Wait failed: ${expression}`); };
  const save = async name => { const shot = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path.join(output, name + '.png'), Buffer.from(shot.data, 'base64')); };
  await send('Page.enable'); await send('Runtime.enable');
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
    await js(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`); await sleep(150);
    const p = await js(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
  };
  const drag = async route => {
    const oldRound = (await snap()).round;
    await js(`document.querySelector('[data-testid="match3-board"]').scrollIntoView({block:'center',behavior:'instant'})`); await sleep(200);
    const points = await js(`(${JSON.stringify(route)}).map(p=>{const e=document.querySelector('[data-testid="match3-board"] [data-r="'+p.r+'"][data-c="'+p.c+'"]'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})`);
    for (const p of points) assert(p.y > 0 && p.y < 844, 'Drag route must remain visible');
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points[0] });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...points[0], button: 'left', buttons: 1, clickCount: 1 });
    for (const p of points.slice(1)) { await sleep(75); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p, button: 'left', buttons: 1 }); }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points.at(-1), button: 'left', buttons: 0, clickCount: 1 });
    if(probeEffect){
      await sleep(180);
      effectEvidence=await js(`(()=>{const e=document.querySelector('[data-testid="shield-fusion-effect"]');if(!e)return null;const r=e.getBoundingClientRect();const p=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {pointerEvents:getComputedStyle(e).pointerEvents,hitOverlay:p===e||e.contains(p),images:e.querySelectorAll('img').length}})()`);
      if(process.env.MATCH3_FUSION_VISUAL_ONLY==='1'){
        await js(`document.querySelector('[data-testid="shield-fusion-effect"]').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=540})`);
        await save('fusion-merged-'+(await js('innerWidth')));
      }else{
        await save('fusion-effect-'+(await js('innerWidth')));
        await sleep(300);
        await save('fusion-merged-'+(await js('innerWidth')));
      }
    }
    await wait(`document.querySelector('[data-testid="match3-round"]')?.textContent !== ${JSON.stringify(oldRound)} && !document.querySelector('[data-testid="open-picker"]')?.disabled`);
    await sleep(150);
  };
  const start = async (wins, width) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: `${base}/beast-game/match3-hard` });
    await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===49`);
    await js(`sessionStorage.setItem('match3-hard-progress', '${wins}')`);
    await send('Page.reload');
    await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===49`); await sleep(300);
  };
  const state = async (fixture=false) => js(`(()=>{
    const root=document.querySelector('[data-testid="match3-board"]');
    let f=root[Object.keys(root).find(k=>k.startsWith('__reactFiber$'))], chosen;
    for(;f;f=f.return){let hooks=[],h=f.memoizedState;for(let i=0;h&&i<80;i++,h=h.next)hooks.push(h);if(hooks.filter(h=>Array.isArray(h.memoizedState)&&h.memoizedState.length===7&&Array.isArray(h.memoizedState[0])).length>=2){chosen=hooks;break;}}
    if(!chosen)throw Error('Fixture owner not found');
    const matrix=chosen.filter(h=>Array.isArray(h.memoizedState)&&h.memoizedState.length===7&&Array.isArray(h.memoizedState[0]));
    const b=matrix.find(h=>typeof h.memoizedState[0][0]==='string'), m=matrix.find(h=>typeof h.memoizedState[0][0]==='number');
    const t=chosen.find(h=>Array.isArray(h.memoizedState)&&h.memoizedState.length&&h.memoizedState[0]?.energy!==undefined&&h.memoizedState[0]?.hp!==undefined);
    const e=chosen.find(h=>Array.isArray(h.memoizedState)&&h.memoizedState.length&&h.memoizedState[0]?.cd!==undefined&&h.memoizedState[0]?.hp!==undefined);
    if(${fixture}){const els=['FIRE','WATER','AIR','SPACE','EARTH'];const board=Array.from({length:7},(_,r)=>Array.from({length:7},(_,c)=>els[(r*2+c)%5]));const magic=Array.from({length:7},()=>Array(7).fill(0));for(let c=0;c<3;c++)magic[3][c]=7;board[6][0]=board[6][1]=board[6][2]='EARTH';b.queue.dispatch(board);m.queue.dispatch(magic);}
    return {team:t.memoizedState,foes:e.memoizedState};
  })()`);
  const shieldRoute = cells => {
    const shields=cells.filter(c=>c.mp>=7);
    for(const a of shields)for(const b of shields)for(const c of shields){
      if(a===b||b===c||a===c)continue;
      if(Math.max(Math.abs(a.r-b.r),Math.abs(a.c-b.c))===1&&Math.max(Math.abs(b.r-c.r),Math.abs(b.c-c.c))===1&&new Set([a.el,b.el,c.el]).size>1)return [a,b,c];
    }return null;
  };
  const visualOnly=process.env.MATCH3_FUSION_VISUAL_ONLY==='1';
  if(!visualOnly){
  // Bounded natural acquisition probe; never rewrite game state in this section.
  await start(5,390);let naturalPath=null;let naturalMoves=0;
  for(;naturalMoves<12;naturalMoves++){
    const s=await snap();naturalPath=shieldRoute(s.cells);if(naturalPath)break;
    if(await js(`!!document.querySelector('[data-testid="match3-result"]')`))break;
    let route;
    for(const exact of [true,false])for(let length=3;length<=7&&!route;length++){
      try{route=findPath(s.cells,length,true,r=>r.every(c=>c.mp<7)&&(exact?r.reduce((n,c)=>n+(c.mp||1),0)===7:r.reduce((n,c)=>n+(c.mp||1),0)>=7));}catch{}
    }
    if(!route)for(const length of [5,4,3]){try{route=findPath(s.cells,length,true,r=>r.every(c=>c.mp<7));break;}catch{}}
    if(!route)break;
    await drag(route);
  }
  const acquired=(await snap()).cells.filter(c=>c.mp>=7).length;
  results.push({kind:'natural acquisition probe',moves:naturalMoves,shields:acquired,crossColorRouteFound:!!naturalPath});
  console.log(`Natural acquisition: ${naturalMoves} moves, ${acquired} shields, connected=${!!naturalPath}`);
  if(naturalPath){
    const before=await state();const expected=counterPhase(before.team,before.foes,1,undefined,true);
    probeEffect=true;await drag(naturalPath);probeEffect=false;
    const after=await state();
    assert.deepEqual(after.team.map(c=>c.hp),expected.team.map(c=>c.hp),'Natural fusion counter HP mismatch');
    assert.deepEqual(after.foes.map(c=>c.hp),before.foes.map(c=>c.hp),'Natural fusion attacked enemy');
    await save('fusion-natural-after');results.push({kind:'naturally acquired and real pointer fusion',route:naturalPath,status:'passed'});
  }
  }
  for(const width of [390,820]){
    await start(5,width);const before=await state(true);await sleep(300);
    const route=[0,1,2].map(c=>({r:3,c}));
    const expected=counterPhase(before.team,before.foes,1,undefined,true);
    probeEffect=true;await drag(route);probeEffect=false;
    const after=await state();const display=await snap();
    assert.deepEqual(after.team.map(c=>c.hp),expected.team.map(c=>c.hp),'Fixture shield round HP differs from guarded backend result');
    assert.deepEqual(after.foes.map(c=>c.hp),before.foes.map(c=>c.hp),'Shield fusion damaged enemies');
    assert.equal(display.damage,0,'Shield fusion dealt own attack damage');
    assert.equal(display.cells.filter(c=>c.mp>=7).length,0,'Fusion did not consume all three shields or spawned another');
    assert(effectEvidence&&effectEvidence.images===3&&effectEvidence.pointerEvents==='none'&&!effectEvidence.hitOverlay,'Fusion effect obscures pointer hit target or missing');
    const regular=counterPhase(before.team,before.foes,1,undefined,false);
    assert(expected.hits.every((h,i)=>Math.abs(h.damage-regular.hits[i].damage/2)<=.5),'Guard is not half damage');
    const nextExpected=counterPhase(after.team,after.foes,1,undefined,false);
    if(!visualOnly){
    await drag(findPath(display.cells,3,true,r=>r.every(c=>!c.mp)));
    const next=await state();
    assert.deepEqual(next.team.map(c=>c.hp),nextExpected.team.map(c=>c.hp),'Next counter failed to restore full damage');
    assert.deepEqual(next.foes.map(c=>c.hp),after.foes.map(c=>c.hp),'Below-threshold next clear unexpectedly attacked');
    }
    await save('fusion-fixture-after-'+width);
    await click('[data-testid="match3-home"]');await wait(`location.pathname==='/'&&!!document.querySelector('a[href="/star-beasts"]')`);
    await click('a[href="/star-beasts"]');await wait(`!!document.querySelector('a[href="/beast-game/match3-hard"]')`);
    await click('a[href="/beast-game/match3-hard"]');await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===49`);
    results.push({kind:'injected isolated fixture, NOT naturally acquired',width,guardedHits:expected.hits,regularHits:regular.hits,nextHits:visualOnly?undefined:nextExpected.hits,effect:effectEvidence,status:visualOnly?'visual and home navigation passed':'passed'});
    console.log('PASS explicit fusion fixture '+width+(visualOnly?'; visual and home return':'; real pointer drag, half damage, next counter restored, home return'));
  }
  assert.equal(errors.length,0,errors.join('\n'));
  writeFileSync(path.join(output,process.env.MATCH3_FUSION_VISUAL_ONLY==='1'?'fusion-visual-result.json':'fusion-result.json'),JSON.stringify({passed:true,results,errors,profile},null,2));
} catch(error){writeFileSync(path.join(output,process.env.MATCH3_FUSION_VISUAL_ONLY==='1'?'fusion-visual-result.json':'fusion-result.json'),JSON.stringify({passed:false,results,errors,error:String(error),profile},null,2));console.error(error);process.exitCode=1;}
finally{try{ws?.close()}catch{}try{browser.kill()}catch{}}
