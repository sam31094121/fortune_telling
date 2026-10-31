import { createRequire } from 'node:module';
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
    await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===56`);
    await js(`localStorage.setItem('match3-hard-progress-self-v1', '${wins}')`);
    await send('Page.reload');
    await wait(`document.querySelector('[data-testid="match3-player-choice"]')`);
    await click('[data-testid="play-self"]');
    await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===56`); await sleep(300);
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
    if(${fixture}){const els=['FIRE','WATER','AIR','SPACE','EARTH'];const board=Array.from({length:8},(_,r)=>Array.from({length:7},(_,c)=>els[(r*2+c)%5]));const magic=Array.from({length:8},()=>Array(7).fill(0));for(let c=0;c<3;c++)magic[3][c]=7;board[6][0]=board[6][1]=board[6][2]='EARTH';b.queue.dispatch(board);m.queue.dispatch(magic);}
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

  const M=createRequire(import.meta.url)('../.beast-game-build/lib/beast-game/match3');
  const fixture=M.generateBoard(M.seededRng(49),8,7,true), magic=M.emptyMagic(fixture), route=Array.from({length:3},(_,c)=>({r:0,c}));
  fixture[0].splice(0,3,'AIR','FIRE','SPACE');magic[0].splice(0,3,7,7,7);
  const expected=M.resolveDrag(fixture,route,M.seededRng(1049),magic,50,true,true,8);
  const gains=M.energyGains(expected);
  const inject=async(fixture,magic)=>js('(()=>{const root=document.querySelector("[data-testid=match3-board]");let f=root[Object.keys(root).find(k=>k.startsWith("__reactFiber$"))];for(;f;f=f.return){let hooks=[],h=f.memoizedState;for(let i=0;h&&i<100;i++,h=h.next)hooks.push(h);const matrices=hooks.filter(h=>Array.isArray(h.memoizedState)&&h.memoizedState.length===8&&Array.isArray(h.memoizedState[0]));if(matrices.length<2)continue;matrices.find(h=>typeof h.memoizedState[0][0]==="string").queue.dispatch('+JSON.stringify(fixture)+');matrices.find(h=>typeof h.memoizedState[0][0]==="number").queue.dispatch('+JSON.stringify(magic)+');const random=hooks.find(h=>typeof h.memoizedState?.current==="function");if(!random)throw Error("RNG fixture missing");random.memoizedState.current=('+M.seededRng.toString()+')(1049);return}throw Error("Board fixture missing")})()');
  for(const width of [390,820,1440]) {
    await start(5,width);const before=await state();
    await inject(fixture,magic);
    await sleep(200);
    await js('window.__rewardStages=[];window.__lastReward="";new MutationObserver(()=>{const b=document.querySelector("[data-testid=match3-board]");if(!b)return;const cells=[...b.querySelectorAll("[data-r]")].map(e=>({r:+e.dataset.r,c:+e.dataset.c,el:e.dataset.el??null,mp:+e.dataset.magic||0,empty:e.dataset.empty==="true"}));const key=JSON.stringify(cells);if(key!==window.__lastReward){window.__lastReward=key;window.__rewardStages.push({cells,busy:b.getAttribute("aria-busy")})}}).observe(document.querySelector("[data-testid=match3-board]"),{attributes:true,childList:true,subtree:true})');
    const play=drag(route);
    await wait('document.querySelectorAll("[data-fusion-element]").length===3');
    assert.deepEqual(await js('[...document.querySelectorAll("[data-fusion-element]")].map(e=>e.dataset.fusionElement)'),["AIR","FIRE","SPACE"]);
    await sleep(280);await save("fusion-contributors-"+width);
    if(width===390){await wait('document.querySelector("[data-testid=shield-fusion-effect] svg") && +getComputedStyle(document.querySelector("[data-testid=shield-fusion-effect] svg")).opacity>.3');await save('fusion-discharge-390');}
    await wait('window.__rewardStages.some(s=>s.cells.some(c=>c.empty))');await save('fusion-survivors-'+width);await play;
    const stages=await js('window.__rewardStages');
    const sparse=stages.filter(s=>s.cells.some(c=>c.empty));assert(sparse.length>0);
    assert(sparse[0].cells.filter(c=>!c.empty).every(c=>c.el==='WATER'||c.el==='EARTH'),'participating colors all removed before refill');
    const four=stages.findIndex(s=>s.cells.some(c=>c.empty)&&s.cells.some(c=>c.el==='WATER'&&c.mp===4));
    const six=stages.findIndex(s=>s.cells.some(c=>c.empty)&&s.cells.some(c=>c.el==='WATER'&&c.mp===6));
    assert(four>=0&&six>four,'actual DOM must display WATER4 then WATER6 before refill');
    assert((await js('window.__audioLog')).some(e=>e.kind==="start"&&e.hz===247),"real retained reward has a merge cue");
    const final=await snap();assert.equal(final.cells.length,56);assert(final.cells.every(c=>c.el));assert(final.scroll<=width);assert.equal(final.damage,0,'fusion does not add direct damage');
    for(const cell of final.cells){assert.equal(cell.el,expected.board[cell.r][cell.c]);assert.equal(cell.mp,expected.magic[cell.r][cell.c]);}
    const energy=await js('[...document.querySelectorAll("[data-testid=match3-ally]")].map(e=>({id:e.dataset.id,energy:+e.dataset.energy,hp:+e.dataset.hp}))');
    const charged=M.shareEnergy(before.team,gains,'tap-lead',{});const counter=M.counterPhase(charged,before.foes,1,undefined,true);
    for(const card of energy){const expectedCard=counter.team.find(c=>c.id===card.id);assert.equal(card.energy,expectedCard.energy,'real existing skill energy');assert.equal(card.hp,expectedCard.hp,'guarded enemy round still executes');assert(card.energy<=100);}
    assert.deepEqual(final.enemy.map(c=>c.hp),before.foes.map(c=>c.hp),'no enemy HP deduction on defensive fusion');
    results.push({width,four,six,stages,energy,gains,final});await save('fusion-rewards-'+width);
    await click('[data-testid="match3-home"]');await wait('location.pathname==="/"');
  }
  for(const count of [4,5]) {
    await start(5,390);const b=fixture.map(r=>r.slice()),m=M.emptyMagic(b),elements=['AIR','FIRE','SPACE','EARTH','WATER'].slice(0,count);
    b[0].splice(0,count,...elements);m[0].splice(0,count,...elements.map(()=>7));await inject(b,m);await sleep(150);
    const play=drag(elements.map((_,c)=>({r:0,c})));await wait('document.querySelectorAll("[data-fusion-element]").length==='+count);
    assert.deepEqual(await js('[...document.querySelectorAll("[data-fusion-element]")].map(e=>e.dataset.fusionElement)'),elements);
    const colors=await js('[...document.querySelectorAll("[data-fusion-element]")].map(e=>getComputedStyle(e).borderTopColor)');assert.equal(new Set(colors).size,count);
    await sleep(280);await save('fusion-'+count+'-colors');await play;assert.equal((await snap()).cells.length,56);
    results.push({case:'actual contributors',count,colors});
  }
  assert.equal(errors.length,0,errors.join('\n'));writeFileSync(path.join(output,'fusion-rewards-result.json'),JSON.stringify({passed:true,results,errors},null,2));console.log('PASS fusion colors, visible4-to6, existing energy, guard, full refill and home '+output);
}catch(error){writeFileSync(path.join(output,'fusion-rewards-result.json'),JSON.stringify({passed:false,results,errors,error:String(error)},null,2));console.error(error);process.exitCode=1}
finally{try{ws?.close()}catch{}try{browser.kill()}catch{}}
