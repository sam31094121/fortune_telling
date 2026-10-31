/** Real DOM native WebAudio audit. Native APIs wrapped only for telemetry; fusion fixture injects board/magic explicitly. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.env.MATCH3_E2E_BASE || 'http://localhost:8888';
const edgePath = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
assert(edgePath, 'Edge is required');
const port = 9700 + Math.floor(Math.random() * 150);
const profile = mkdtempSync(path.join(os.tmpdir(), 'match3-mobile-review-'));
const output = process.env.MATCH3_SOUND_OUTPUT || path.join(os.tmpdir(),'match3-sound-acceptance-20261031');
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
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
    window.__audioLog=[];window.__rigLog=[];new MutationObserver(ms=>{for(const m of ms)if(m.attributeName==="data-rig-active"&&m.target.hasAttribute("data-rig-stage")&&m.target.dataset.rigActive==="true")window.__rigLog.push({t:performance.now()})}).observe(document,{subtree:true,attributes:true,attributeFilter:["data-rig-active"]});let n=0;const Native=window.AudioContext;
    window.AudioContext=class extends Native{constructor(...args){super(...args);const ctx=this;
      const create=ctx.createOscillator.bind(ctx);ctx.createOscillator=()=>{const o=create(),id=++n;let hz=0;const set=o.frequency.setValueAtTime.bind(o.frequency);o.frequency.setValueAtTime=(v,t)=>{hz=v;return set(v,t)};
      for(const name of ['start','stop']){const orig=o[name].bind(o);o[name]=(...a)=>{window.__audioLog.push({kind:name,id,hz,t:performance.now(),audioTime:ctx.currentTime,scheduled:a[0],state:ctx.state});return orig(...a)}}return o};
      const close=ctx.close.bind(ctx);ctx.close=()=>{window.__audioLog.push({kind:'close',t:performance.now(),state:ctx.state});return close()};
    }};
  })()`});
  const cueHz=Object.fromEntries([...readFileSync('components/battlefield/match3Sound.ts','utf8').matchAll(/(clear|charge|impact|shield|fusion|counter|guard): \[\{ hz: ([\d.]+)/g)].map(m=>[m[1],+m[2]]));
  const log=()=>js('window.__audioLog');const reset=()=>js('window.__audioLog=[]');const frequencies=l=>l.filter(e=>e.kind==='start').map(e=>e.hz);
  let l,f;
  if(!process.env.SOUND_FOCUSED){
  await start(0,390);await reset();await drag(findPath((await snap()).cells,3));l=await log();f=frequencies(l);
  assert(f.includes(cueHz.charge)&&f.includes(cueHz.impact)&&f.includes(cueHz.counter),'Missing attack cues: '+f);assert(l.filter(e=>e.kind==='start').every(e=>e.state==='running'));assert(f.indexOf(cueHz.charge)<f.indexOf(cueHz.impact)&&f.indexOf(cueHz.impact)<f.indexOf(cueHz.counter));results.push({case:'natural attack',log:l,damage:(await snap()).damage});
  await start(5,390);await reset();await drag(findPath((await snap()).cells,3,true,r=>r.every(c=>!c.mp)));l=await log();f=frequencies(l);assert(f.includes(cueHz.clear)&&f.includes(cueHz.counter)&&!f.includes(cueHz.impact));assert.equal((await snap()).damage,0);results.push({case:'below threshold clear',log:l});
  await click('button[aria-label="靜音"]');await reset();await drag(findPath((await snap()).cells,3));assert.equal(frequencies(await log()).length,0);results.push({case:'muted subsequent drag',log:await log()});
  await click('button[aria-label="開啟音效"]');await reset();await click('[data-testid="match3-home"]');await wait('location.pathname==="/"');assert((await log()).some(e=>e.kind==='close'));results.push({case:'unmount closes native context',log:await log()});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await start(0,390);await reset();await drag(findPath((await snap()).cells,3));l=await log();assert(frequencies(l).includes(cueHz.impact));results.push({case:'reduced motion native impact',log:l});
  }
  await send('Emulation.setEmulatedMedia',{features:[]});await start(5,390);await state(true);await sleep(200);await reset();await drag([{r:3,c:0},{r:3,c:1},{r:3,c:2}]);l=await log();f=frequencies(l);assert.deepEqual(f.slice(0,4),[440,550,880,110]);assert(f.includes(cueHz.guard)&&!f.includes(cueHz.impact));results.push({case:'explicit board/magic fixture fusion and guard',log:l});
  // Explicit board/magic fixture: two FIRE ordinary cells plus one FIRE shield; actual pointer triggers colour clear.
  await start(0,390);await state(true);await js(`(()=>{const b=document.querySelector('[data-testid="match3-board"]');let f=b[Object.keys(b).find(k=>k.startsWith('__reactFiber$'))];for(;f;f=f.return){let h=f.memoizedState,done=0;for(let i=0;h&&i<80;i++,h=h.next){if(Array.isArray(h.memoizedState)&&h.memoizedState.length===7&&Array.isArray(h.memoizedState[0])){let a=h.memoizedState.map(r=>r.slice());if(typeof a[0][0]==='string'){a[3][0]=a[3][1]=a[3][2]='FIRE';h.queue.dispatch(a);done++}else if(typeof a[0][0]==='number'){a=a.map(r=>r.map(()=>0));a[3][2]=7;h.queue.dispatch(a);done++}if(done===2)return}}}})()`);await sleep(150);await reset();await drag([{r:3,c:0},{r:3,c:1},{r:3,c:2}]);l=await log();f=frequencies(l);assert.deepEqual(f.slice(0,3),[660,990,1320]);assert(!f.includes(440),'Single shield must not play fusion');results.push({case:'explicit board/magic fixture single shield colour clear',log:l});
  // Mute during a real running fusion cue, using actual pointer clicks.
  await start(5,390);await state(true);await sleep(150);await reset();await js(`document.querySelector('[data-testid="match3-board"]').scrollIntoView({block:'center',behavior:'instant'})`);
  const pts=await js(`Array.from({length:3},(_,c)=>{let r=document.querySelector('[data-testid="match3-board"] [data-r="3"][data-c="'+c+'"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...pts[0],button:'left',buttons:1,clickCount:1});for(const p of pts.slice(1))await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p,button:'left',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...pts[2],button:'left',buttons:0,clickCount:1});
  await wait('window.__audioLog.some(e=>e.kind==="start")');const muteBefore=await js('performance.now()');await click('button[aria-label="靜音"]');const mutedAt=await js('performance.now()');await sleep(1800);l=await log();const stops=l.filter(e=>e.kind==='stop'&&e.t>=muteBefore);assert(stops.length>0,'Mute did not stop active sources');assert(stops.every(e=>e.scheduled===undefined||e.scheduled-e.audioTime<=.01001),'Mute release exceeds10ms');assert(!l.some(e=>e.kind==='start'&&e.t>mutedAt));results.push({case:'active fusion mute at most10ms release',muteBefore,mutedAt,stops,log:l});
  assert.equal(errors.length,0,errors.join('\n'));writeFileSync(path.join(output,(process.env.SOUND_FOCUSED?'sound-focused-result.json':'sound-result.json')),JSON.stringify({passed:true,results,errors,profile},null,2));console.log('PASS native WebAudio '+output);
}catch(error){writeFileSync(path.join(output,(process.env.SOUND_FOCUSED?'sound-focused-result.json':'sound-result.json')),JSON.stringify({passed:false,results,errors,error:String(error)},null,2));console.error(error);process.exitCode=1}
finally{try{ws?.close()}catch{}try{browser.kill()}catch{}}
