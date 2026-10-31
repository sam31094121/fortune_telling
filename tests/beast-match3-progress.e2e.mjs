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
const output = path.join(os.tmpdir(),'match3-progress-acceptance-20261031');
mkdirSync(output, { recursive: true });
const browser = spawn(edgePath, ['--headless=new', '--mute-audio', '--no-first-run', '--disable-default-apps', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
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
  const storage=()=>js(`({self:localStorage.getItem('match3-hard-progress-self-v1'),guest:sessionStorage.getItem('match3-hard-progress-guest-v1')})`);
  const enter=async owner=>{
    await click('a[href="/star-beasts"]');await wait(`!!document.querySelector('a[href="/beast-game/match3-hard"]')`);await click('a[href="/beast-game/match3-hard"]');await wait(`!!document.querySelector('[data-testid="match3-player-choice"]')`);
    assert.equal(await js(`document.querySelectorAll('[data-testid="match3-board"]').length`),0,'Board exposed before identity choice');
    await click(`[data-testid="play-${owner}"]`);await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===56`);await sleep(150);return snap();
  };
  const home=async()=>{await click('[data-testid="match3-home"]');await wait(`location.pathname==='/'`)};
  for(const width of [390,820]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:2,mobile:true});await send('Page.navigate',{url:base+'/'});await wait(`!!document.querySelector('a[href="/star-beasts"]')`);
    // Controlled storage fixture; eight wins were not naturally played.
    await js(`localStorage.setItem('match3-hard-progress-self-v1','8');sessionStorage.setItem('match3-hard-progress-guest-v1','4')`);
    const self=await enter('self');assert.equal(self.enemy.length,4);assert(self.enemy.every(e=>e.id.startsWith('beast_g_')));
    await send('Page.reload');await wait(`!!document.querySelector('[data-testid="play-self"]')`);await click('[data-testid="play-self"]');await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===56`);assert.deepEqual((await snap()).enemy,self.enemy,'Reload lost self stage');
    await click('[data-testid="open-picker"]');await wait(`document.querySelectorAll('[data-testid="pick-card"]').length===60`);for(const el of ['AIR','SPACE','WATER','FIRE','EARTH'])await click(`[data-testid="pick-card"][data-el="${el}"]`);await click('[data-testid="start-battle"]');await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===56`);assert.deepEqual((await snap()).enemy,self.enemy,'Repick reset self stage');
    const before=await snap();await drag(findPath(before.cells,3));const after=await snap();assert.equal(after.damage,0);assert(after.ally.reduce((n,c)=>n+c.hp,0)<before.ally.reduce((n,c)=>n+c.hp,0),'Self stage no counter');await save('self-new-'+width);
    await click('[data-testid="open-picker"]');await wait(`!!document.querySelector('[data-testid="change-player"]')`);await click('[data-testid="change-player"]');await wait(`!!document.querySelector('[data-testid="play-guest"]')`);await click('[data-testid="play-guest"]');await wait(`!!document.querySelector('[data-testid="start-battle"]')`);await click('[data-testid="start-battle"]');await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===56`);
    const guest=await snap();const guestStore=await storage();assert.equal(guestStore.guest,'0');assert.equal(guestStore.self,'8');assert(guest.enemy.every(e=>e.id.startsWith('beast_y')));
    await drag(findPath(guest.cells,3));assert((await snap()).damage>0);await save('guest-new-'+width);await home();
    await js(`sessionStorage.setItem('match3-hard-progress-guest-v1','4')`);const repeated=await enter('guest');assert(repeated.enemy.every(e=>e.id.startsWith('beast_y')));assert.equal((await storage()).guest,'0');await home();
    const resumed=await enter('self');assert.deepEqual(resumed.enemy,self.enemy);assert.equal((await storage()).self,'8');await home();
    const previewResponse=await fetch(base+'/beast-game/match3-preview',{redirect:'manual'});assert.equal(previewResponse.status,308);assert.equal(previewResponse.headers.get('location'),'/beast-game/match3-hard');
    await send('Page.navigate',{url:base+'/beast-game/match3-preview'});await wait(`location.pathname==='/beast-game/match3-hard' && !!document.querySelector('[data-testid="play-guest"]')`);assert.equal(await js(`document.querySelectorAll('[data-testid="match3-board"]').length`),0,'Redirect bypassed identity choice');await click('[data-testid="play-guest"]');await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===56`);const redirected=await snap();assert.equal(redirected.cells.length,56);assert.equal(redirected.enemy.length,5);assert(redirected.enemy.every(e=>e.id.startsWith('beast_y')));assert.equal((await storage()).guest,'0');assert.equal((await storage()).self,'8','Preview redirect overwrote self progress');
    results.push({width,evidence:'self8/guest4 controlled storage; actual game-only choice, no global identity mutation',selfStageResumed:true,pageReload:true,repickRetained:true,changePlayerGuestZero:true,repeatGuestZero:true,selfValue:(await storage()).self,previewRedirect:true,redirectedOrbs:redirected.cells.length});
    console.log('PASS new game identity UI '+width+' self resume / guest reset / repeat / repick / reload / preview redirects without resetting self');
  }
  // Explicit legacy-claim technical fixtures, not naturally won stages.
  for(const [selfWins,legacyWins,expected] of [[8,10,10],[12,4,12]]){
    await send('Page.navigate',{url:base+'/'});await wait(`!!document.querySelector('a[href="/star-beasts"]')`);
    await js(`localStorage.setItem('match3-hard-progress-self-v1','${selfWins}');sessionStorage.setItem('match3-hard-progress','${legacyWins}')`);
    await click('a[href="/star-beasts"]');await wait(`!!document.querySelector('a[href="/beast-game/match3-hard"]')`);await click('a[href="/beast-game/match3-hard"]');await wait(`!!document.querySelector('[data-testid="resume-legacy"]')`);await click('[data-testid="resume-legacy"]');await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===56`);
    assert.equal((await storage()).self,String(expected));assert.equal(await js(`sessionStorage.getItem('match3-hard-progress')`),String(legacyWins));results.push({kind:'explicit legacy fixture',selfWins,legacyWins,afterSelf:expected});
  }
  assert.equal(errors.length,0,errors.join('\n'));writeFileSync(path.join(output,'progress-result.json'),JSON.stringify({passed:true,results,errors,profile},null,2));
}catch(error){writeFileSync(path.join(output,'progress-result.json'),JSON.stringify({passed:false,results,errors,error:String(error),profile},null,2));console.error(error);process.exitCode=1}
finally{try{ws?.close()}catch{}try{browser.kill()}catch{}}
