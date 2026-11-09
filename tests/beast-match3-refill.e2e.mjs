/** Real DOM native WebAudio audit. Native APIs wrapped only for telemetry; fusion fixture injects board/magic explicitly. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(readFileSync(f, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, f);
const M = require('../lib/beast-game/match3/index.ts');
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.env.MATCH3_E2E_BASE || 'http://localhost:8888';
const edgePath = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
assert(edgePath, 'Edge is required');
const port = 9700 + Math.floor(Math.random() * 150);
const profile = mkdtempSync(path.join(os.tmpdir(), 'match3-mobile-review-'));
const output = process.env.MATCH3_SOUND_OUTPUT || path.join(os.tmpdir(),'match3-replay-acceptance-20261109');
mkdirSync(output, { recursive: true });
const browser = spawn(edgePath, ['--headless=new', '--inprivate', '--no-first-run', '--disable-default-apps', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let ws; const errors = [];
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page' && t.url === 'about:blank'); } catch {} }
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
    if(touchInput) {
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1}]});
      for(const p of points.slice(1)){await sleep(75);await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]});}
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    } else {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points[0] });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...points[0], button: 'left', buttons: 1, clickCount: 1 });
    for (const p of points.slice(1)) { await sleep(75); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p, button: 'left', buttons: 1 }); }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points.at(-1), button: 'left', buttons: 0, clickCount: 1 });
    }
    await wait(`document.querySelector('[data-testid="match3-round"]')?.textContent !== ${JSON.stringify(oldRound)} && !document.querySelector('[data-testid="open-picker"]')?.disabled`);
    await sleep(150);
  };
  const start = async (wins, width) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: width < 768 });
    await send('Page.navigate', { url: `${base}/beast-game/match3-hard` });
    await wait(`document.querySelector('[data-testid="match3-player-choice"]')`);
    await click('[data-testid="play-self"]');
    await wait(`document.querySelector('[data-testid="pick-hero"]') || document.querySelector('[data-testid="match3-board"]')`);
    if(await js('!!document.querySelector("[data-testid=pick-hero]")')) {
      await click('[data-testid="pick-hero"]'); await click('[data-testid="confirm-hero"]');
      await wait(`document.querySelectorAll('[data-testid="pick-card"]').length>=4`);
      const choices=await js(`[...document.querySelectorAll('[data-testid="pick-card"]')].slice(0,4).map(c=>c.dataset.id)`);
      for(const id of choices)await click('[data-testid="pick-card"][data-id="'+id+'"]');
      await click('[data-testid="start-battle"]');
    }
    await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length===56`);
    await js(`(()=>{const key='match3-hard-campaign-self-v1',p=JSON.parse(localStorage.getItem(key));p.wins=${wins};localStorage.setItem(key,JSON.stringify(p));localStorage.setItem('match3-hard-progress-self-v1','${wins}');})()`);
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
    if(${JSON.stringify(fixture)} && typeof ${JSON.stringify(fixture)} === 'object'){const f=${JSON.stringify(fixture)};b.queue.dispatch(f.board);m.queue.dispatch(f.magic);}
    else if(${JSON.stringify(fixture)}){const els=['FIRE','WATER','AIR','SPACE','EARTH'];const board=Array.from({length:8},(_,r)=>Array.from({length:7},(_,c)=>els[(r*2+c)%5]));const magic=Array.from({length:8},()=>Array(7).fill(0));for(let c=0;c<3;c++)magic[3][c]=7;board[6][0]=board[6][1]=board[6][2]='EARTH';b.queue.dispatch(board);m.queue.dispatch(magic);}
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

  // Deterministic input fixture, real server response and real pointer playback.
  // Isolated browser profile: never edits the customer's saved game.
  for (const [width, length, reduced] of [[320,5,false],[390,6,false],[1440,7,false],[390,5,true]]) {
    await send('Emulation.setEmulatedMedia',{features: reduced ? [{name:'prefers-reduced-motion',value:'reduce'}] : []});
    await start(6,width);
    touchInput=width<768;await send('Emulation.setTouchEmulationEnabled',{enabled:touchInput});
    console.log('Checking replay',width,length,reduced);
    const board=M.generateBoard(M.seededRng(1),8,7,true);board[7].fill('FIRE',0,length);
    await state({board,magic:M.emptyMagic(board)}); await sleep(100);
    await js(`window.__replaySamples=[];window.__turns=[];window.__turnInputs=[];
      const nativeFetch=window.fetch;window.fetch=async (url,options)=>{
        if(String(url).includes('/api/beast-game/orb-turn')){const input=JSON.parse(options.body);input.seed=1001;window.__turnInputs.push(input);options={...options,body:JSON.stringify(input)};const response=await nativeFetch(url,options);window.__turns.push(await response.clone().json());return response;}return nativeFetch(url,options);
      };
      window.__replayObserver=new MutationObserver(()=>{
        const b=document.querySelector('[data-testid=match3-board]'),svg=b?.querySelector('[data-testid=match3-replay-lines]');
        if(!svg || !svg.querySelector('circle'))return;
        const epoch=b.dataset.refillEpoch;if(window.__replaySamples.some(s=>s.epoch===epoch))return;
        const rect=svg.getBoundingClientRect();
        window.__replaySamples.push({epoch,t:performance.now(),chain:+svg.dataset.chain,busy:b.getAttribute('aria-busy'),pointer:getComputedStyle(svg).pointerEvents,
          cells:[...b.querySelectorAll('[role=gridcell]')].map(c=>({r:+c.dataset.r,c:+c.dataset.c,el:c.dataset.el,empty:c.dataset.empty,magic:+c.dataset.magic||0,flash:c.className.includes('_flash')})),
          groups:[...svg.querySelectorAll('[data-match-count]')].map(g=>({count:+g.dataset.matchCount,element:g.dataset.matchElement,label:g.querySelector('text').textContent,
            paths:[...g.querySelectorAll('polyline')].map(p=>JSON.parse(p.dataset.matchPath)),strokes:[...g.querySelectorAll('polyline')].map(p=>({colour:getComputedStyle(p).stroke,width:getComputedStyle(p).strokeWidth})),
            cells:[...g.querySelectorAll('circle')].map(c=>{const [r,col]=c.dataset.matchCell.split(':').map(Number);const cell=b.querySelector('[data-r="'+r+'"][data-c="'+col+'"]'),cr=cell.getBoundingClientRect();return {r,c:col,dx:Math.abs(rect.x+c.cx.baseVal.value-cr.x-cr.width/2),dy:Math.abs(rect.y+c.cy.baseVal.value-cr.y-cr.height/2),animation:getComputedStyle(c).animationName};})}))});
      });window.__replayObserver.observe(document.querySelector('[data-testid=match3-board]'),{subtree:true,childList:true,attributes:true});`);
    const playing=drag(Array.from({length},(_,c)=>({r:7,c})));
    await wait('document.querySelector("[data-testid=match3-replay-lines]")?.querySelector("circle")');
    await save('match-lines-'+width+'-'+length+(reduced?'-reduced':''));await playing;
    const observed=await js('window.__replayObserver.disconnect();({samples:window.__replaySamples,turn:window.__turns[0],input:window.__turnInputs[0],events:window.__match3Events})');
    const expected=observed.turn.replay.filter(f=>f.matches.length);
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
    const final=await snap();assert.equal(final.damage,observed.turn.damage+observed.turn.startDamage+observed.turn.endDamage);
    final.cells.forEach(c=>{assert.equal(c.el,observed.turn.res.board[c.r][c.c]);assert.equal(c.mp,observed.turn.res.magic[c.r][c.c]);});
    assert(final.scroll<=width);results.push({case:'recorded match then clear',width,length,reduced,chains:expected.length});
    writeFileSync(path.join(output,'replay-'+width+'-'+length+(reduced?'-reduced':'')+'.json'),JSON.stringify(observed,null,2));
  }
  await send('Emulation.setEmulatedMedia',{features:[]});

  touchInput=false;await send('Emulation.setTouchEmulationEnabled',{enabled:false});
  for(const width of [320,390,820,1440]) {
    await start(0,width);
    await js('document.querySelector("[data-testid=match3-board]").scrollIntoView({block:"center",behavior:"instant"})');
    await js('window.__falls=[];window.__watch=true;function sampleFall(){const b=document.querySelector("[data-testid=match3-board]");if(b?.dataset.refilling){const cells=[...b.querySelectorAll("[data-fall-from]")];window.__falls.push({busy:b.getAttribute("aria-busy"),disabled:document.querySelector("[data-testid=open-picker]").disabled,overflow:getComputedStyle(b).overflow,cells:cells.map(c=>({r:+c.dataset.r,from:+c.dataset.fallFrom,delay:parseFloat(getComputedStyle(c).animationDelay),animation:getComputedStyle(c).animationName,transform:getComputedStyle(c).transform,opacity:getComputedStyle(c).opacity}))})}if(window.__watch)requestAnimationFrame(sampleFall)}requestAnimationFrame(sampleFall)');
    const play=drag(findPath((await snap()).cells,3));
    await wait('document.querySelector("[data-testid=match3-board]")?.dataset.refilling === "true"');await sleep(120);await save('refill-moving-'+width);await play;
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
}catch(error){writeFileSync(path.join(output,'refill-result.json'),JSON.stringify({passed:false,results,errors,error:String(error)},null,2));console.error(error);process.exitCode=1}
finally{try{ws?.close()}catch{}try{browser.kill()}catch{}}
