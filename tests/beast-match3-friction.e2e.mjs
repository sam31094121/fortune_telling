/** Real headless Edge input; isolated profile. No React/debug mutation or collection writes. */
import assert from 'node:assert/strict';
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
const results = []; let ws; const errors = [];
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
    await wait(`document.querySelector('[data-testid="match3-round"]')?.textContent !== ${JSON.stringify(oldRound)} && !document.querySelector('[data-testid="open-picker"]')?.disabled`);
    await sleep(150);
  };
  const start = async (wins, width) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: `${base}/beast-game/match3-hard` });
    await wait(`document.querySelector('[data-testid="match3-player-choice"]')`);
    await click('[data-testid="play-self"]');
    await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===49`);
    await js(`localStorage.setItem('match3-hard-progress-self-v1', '${wins}')`);
    await send('Page.reload');
    await wait(`document.querySelector('[data-testid="match3-player-choice"]')`);
    await click('[data-testid="play-self"]');
    await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===49`); await sleep(300);
  };
  await start(5,390);
  const initial=await snap();const route=findPath(initial.cells,3);
  await js(`document.querySelector('[data-testid="match3-board"]').scrollIntoView({block:'center',behavior:'instant'})`);await sleep(100);
  const points=await js(`(${JSON.stringify(route)}).map(p=>{const r=document.querySelector('[data-testid="match3-board"] [data-r="'+p.r+'"][data-c="'+p.c+'"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width}})`);
  const move=async p=>{await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y,button:'left',buttons:1});await sleep(70)};
  const pointCount=()=>js(`document.querySelectorAll('[data-testid="drag-path"] circle').length`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:points[0].x,y:points[0].y,button:'left',buttons:1,clickCount:1});
  await move({...points[1],x:points[1].x+points[1].width*.46});const edgeCount=await pointCount();
  await move(points[1]);const centerCount=await pointCount();await move(points[2]);await move(points[1]);const rollbackCount=await pointCount();await move(points[2]);
  const hint=await js(`(()=>{const e=document.querySelector('[data-testid="match3-hint"]'),s=getComputedStyle(e);return {text:e.textContent,rect:e.getBoundingClientRect().toJSON(),clip:s.clip,position:s.position}})()`);
  await save('friction-drag-eight-threshold');
  const started=Date.now();await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:points[2].x,y:points[2].y,button:'left',buttons:0,clickCount:1});await sleep(50);
  const lock=await js(`({repickDisabled:document.querySelector('[data-testid="open-picker"]').disabled,boardAriaBusy:document.querySelector('[data-testid="match3-board"]').getAttribute('aria-busy')})`);
  await wait(`document.querySelector('[data-testid="match3-round"]')?.textContent!==${JSON.stringify(initial.round)}&&!document.querySelector('[data-testid="open-picker"]').disabled`);
  const after=await snap();
  results.push({kind:'first customer move under eight threshold',route,edgeCount,centerCount,rollbackCount,hint,lock,durationMs:Date.now()-started,enemyHpBefore:initial.enemy,enemyHpAfter:after.enemy,allyBefore:initial.ally,allyAfter:after.ally,damage:after.damage});
  assert.equal(edgeCount,1);assert.equal(centerCount,2);assert.equal(rollbackCount,2);assert.equal(after.damage,0);
  for(let step=0;step<4;step++){
    const s=await snap();let attack=null;
    for(let len=3;len<=8&&!attack;len++){try{attack=findPath(s.cells,len,true,r=>r.reduce((v,c)=>v+(c.mp||1),0)>=8)}catch{}}
    results.push({kind:'legal attack availability',step:step+1,hasAttack:!!attack,physical:attack?.length,effective:attack?.reduce((v,c)=>v+(c.mp||1),0)});
    let p;for(const len of [5,4,3]){try{p=findPath(s.cells,len,true,r=>r.every(c=>c.mp<7));break}catch{}}
    if(!p||await js(`!!document.querySelector('[data-testid="match3-result"]')`))break;await drag(p);
  }
  await click('[data-testid="open-picker"]');await wait(`document.querySelectorAll('[data-testid="pick-card"]').length===60`);
  results.push({kind:'repick reachable',cards:await js(`document.querySelectorAll('[data-testid="pick-card"]').length`)});
  await click('[data-testid="match3-home"]');await wait(`location.pathname==='/'`);
  writeFileSync(path.join(output,'friction-result.json'),JSON.stringify({passed:true,results,errors,profile},null,2));console.log('PASS bounded customer friction audit');
}catch(error){writeFileSync(path.join(output,'friction-result.json'),JSON.stringify({passed:false,results,errors,error:String(error)},null,2));console.error(error);process.exitCode=1}
finally{try{ws?.close()}catch{}try{browser.kill()}catch{}}
