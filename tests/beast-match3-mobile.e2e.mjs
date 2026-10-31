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
  const hp = (value, side) => value[side].reduce((s, c) => s + c.hp, 0);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: base + '/' });
  await wait(`document.querySelector('a[href="/star-beasts"]')`);
  await click('a[href="/star-beasts"]');
  await wait(`document.querySelector('a[href="/beast-game/match3-hard"]')`);
  await click('a[href="/beast-game/match3-hard"]');
  await wait(`document.querySelector('[data-testid="match3-player-choice"]')`);
  await click('[data-testid="play-self"]');
  await wait(`document.querySelector('[data-testid="open-picker"]')`);
  await click('[data-testid="open-picker"]');
  await wait(`document.querySelectorAll('[data-testid="pick-card"]').length===60`);
  for (const el of ['AIR','SPACE','WATER','FIRE','EARTH']) await click(`[data-testid="pick-card"][data-el="${el}"]`);
  await click('[data-testid="start-battle"]');
  await wait(`document.querySelectorAll('[data-testid="match3-board"] [data-r]').length>0`);
  const easyInitial = await snap(); let easyEnd = easyInitial; let easySteps = 0;
  while (easySteps < 30 && !(await js(`!!document.querySelector('[data-testid="match3-result"]')`))) {
    const current = await snap(); let route;
    for (const len of [5,4,3]) { try { route = findPath(current.cells, len, true); break; } catch {} }
    assert(route, 'Hard mode has no legal chain');
    await drag(route); easyEnd = await snap(); easySteps++;
  }
  assert(hp(easyEnd,'enemy') < hp(easyInitial,'enemy'), 'Hard attack failed');
  assert(hp(easyEnd,'ally') < hp(easyInitial,'ally'), 'Hard enemy counter failed');
  const easyResult = await js(`document.querySelector('[data-testid="match3-result"]')?.dataset.result || null`);
  await save('homepage-hard-battle');
  results.push({ status:'homepage hard input passed', steps:easySteps, result:easyResult });
  console.log(`PASS homepage -> star beasts -> battle -> hard, ${easySteps} turns, result=${easyResult}`);
  if (process.env.MATCH3_HOME_ONLY === '1') {
    writeFileSync(path.join(output,'homepage-result.json'),JSON.stringify({passed:true,results,errors,profile},null,2));
  } else {
  for (const wins of [0, 1, 2, 5, 6]) {
    await start(wins, 390);
    const initial = await snap();
    assert.equal(initial.cells.length, 49); assert(initial.scroll <= initial.width + 1, 'Mobile horizontal overflow');
    assert.equal(initial.enemy.length, wins < 2 ? 5 : 4);
    const battleFaces = await js(`[...document.querySelectorAll('[data-testid="match3-ally"]')].map(e=>({id:e.dataset.id,skill:e.querySelector('[class*="fv1SkillName"]')?.textContent,text:e.querySelector('[class*="fv1Text"]')?.textContent,attack:e.querySelector('[class*="fv1Dmg"]')?.textContent}))`);
    for (const c of battleFaces) assert(c.skill && c.text && c.attack, `Incomplete battle ally card ${c.id}`);
    assert(initial.enemy.every(c => wins === 0 ? /^beast_y/.test(c.id) : wins === 1 ? /^beast_a/.test(c.id) : /^beast_g_/.test(c.id)), 'Wrong progression enemy card pool');
    if (wins > 0) {
      await drag(findPath(initial.cells, 3));
      const after = await snap();
      assert.equal(hp(after, 'enemy'), hp(initial, 'enemy'), 'Below-threshold clear dealt damage');
      assert.equal(after.damage, 0); assert(hp(after, 'ally') < hp(initial, 'ally'), 'Below-threshold clear failed to trigger enemy attack');
      assert.notDeepEqual(after.cells, initial.cells, 'Below-threshold valid clear did not replace orbs');
    }
    const before = await snap();
    await drag(findPath(before.cells, Math.min(8, 3 + wins)));
    const after = await snap();
    assert(hp(after, 'enemy') < hp(before, 'enemy'), 'Threshold chain did not damage enemy');
    assert(after.damage > 0); assert(hp(after, 'ally') < hp(before, 'ally'), 'Enemy failed to counter after valid attack');
    await save(`phone-wins-${wins}`);
    results.push({ wins, width: 390, initialEnemy: initial.enemy, minChain: Math.min(8, 3 + wins), status: 'passed' });
    console.log(`PASS mobile wins=${wins}, minChain=${Math.min(8, 3 + wins)}`);
  }
  const five = results.find(r => r.wins === 5).initialEnemy, six = results.find(r => r.wins === 6).initialEnemy;
  for (const f of five) assert.equal(six.find(s => s.id === f.id).hp, Math.round(f.hp * 1.1), 'Post-eight-orb enemy HP did not increase 10%');
  let weighted = null;
  for (let attempt = 0; attempt < 8 && !weighted; attempt++) {
    await start(5,390);
    await drag(findPath((await snap()).cells,5));
    const before = await snap();
    assert(before.cells.some(c=>c.mp===5), 'Five physical orbs did not create numbered magic orb');
    let route;
    for (let length=3;length<8&&!route;length++) {
      try { route=findPath(before.cells,length,true,r=>r.some(c=>c.mp>0&&c.mp<7)&&r.every(c=>c.mp<7)&&r.reduce((n,c)=>n+(c.mp||1),0)>=8); } catch {}
    }
    if (!route) continue;
    const effective=route.reduce((n,c)=>n+(c.mp||1),0);
    await drag(route);
    const after=await snap();
    assert(hp(after,'enemy')<hp(before,'enemy'),'Weighted chain failed to damage stage-eight enemy');
    assert(after.cells.some(c=>c.mp>=7),'Weighted chain failed to generate shield');
    weighted={attempt:attempt+1,physical:route.length,effective,route,damage:after.damage,status:'weighted real drag passed'};
    await save('phone-weighted-magic');
  }
  assert(weighted,'Could not obtain a legal weighted magic path after eight real fresh boards');
  results.push(weighted); console.log(`PASS weighted physical=${weighted.physical}, effective=${weighted.effective}`);
  await start(1, 820);
  const tablet = await snap(); assert(tablet.scroll <= tablet.width + 1, 'Tablet overflow');
  await drag(findPath(tablet.cells, 4)); assert((await snap()).damage > 0);
  await save('tablet-battle');
  await start(0, 390); await click('[data-testid="open-picker"]');
  await wait(`document.querySelectorAll('[data-testid="pick-card"]').length===60`);
  const cards = await js(`[...document.querySelectorAll('[data-testid="pick-card"]')].map(e=>({id:e.dataset.id,face:!!e.querySelector('[data-frame="v1"]'),skill:e.querySelector('[class*="fv1SkillName"]')?.textContent,text:e.querySelector('[class*="fv1Text"]')?.textContent,attack:e.querySelector('[class*="fv1Dmg"]')?.textContent,faceRect:e.querySelector('[data-frame="v1"]')?.getBoundingClientRect().toJSON()}))`);
  assert.equal(cards.length, 60);
  for (const c of cards) { assert(c.face && c.skill && c.text && c.attack, `Incomplete card face ${c.id}`); assert(Math.abs(c.faceRect.width / c.faceRect.height - 63 / 88) < .02, `Wrong card aspect ${c.id}`); }
  assert(await js('document.documentElement.scrollWidth <= innerWidth+1'), 'Picker horizontal overflow');
  await save('phone-picker');
  assert.equal(errors.length, 0, errors.join('\n'));
  results.push({ width: 820, status: 'tablet passed' }, { cards: 60, status: 'picker passed' });
  writeFileSync(path.join(output, 'result.json'), JSON.stringify({ passed: true, results, errors, profile }, null, 2));
  console.log('PASS real Edge mouse drag mobile/tablet and 60 complete card faces');
  }
} catch (error) {
  writeFileSync(path.join(output, 'result.json'), JSON.stringify({ passed: false, results, errors, error: String(error), profile }, null, 2));
  console.error(error); process.exitCode = 1;
} finally { try { ws?.close(); } catch {} try { browser.kill(); } catch {} }
