// Read-only acceptance helper (perf3). Writes only to _tmp_asura_perf\accept-20261108-perf3. Does not edit project files.
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const os = require('os');
const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p=>fs.existsSync(p));
const ROOT = __dirname; const OUT = path.join(ROOT,'accept-20261108-perf3'); fs.mkdirSync(OUT,{recursive:true});
const BASE = process.env.ASURA_BASE_URL || 'http://localhost:3010';
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
async function connect(port){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'asura-accept-'));
  const edge=spawn(EDGE,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--hide-scrollbars','about:blank'],{stdio:'ignore'});
  let target; for(let i=0;i<50&&!target;i++){await sleep(300);try{target=(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page')}catch{}}
  const ws=new WebSocket(target.webSocketDebuggerUrl); await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
  let id=0; const pending=new Map(); const listeners=[];
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)} else if(m.method){for(const l of listeners)l(m)}});
  const send=(method,params={})=>new Promise(r=>{const i=++id;pending.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
  const evalJs=async ex=>{const r=await send('Runtime.evaluate',{expression:ex,awaitPromise:true,returnByValue:true}); if(r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,400)); return r.result?.result?.value};
  const waitFor=async(ex,ms=90000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await evalJs(ex))return Date.now();await sleep(50)}throw new Error('timeout '+ex)};
  const log={console:[],exceptions:[],logEntries:[],httpErrors:[],docStatus:[]};
  listeners.push(m=>{
    if(m.method==='Runtime.consoleAPICalled'&&['error','warning','assert'].includes(m.params.type)) log.console.push({type:m.params.type,text:(m.params.args||[]).map(a=>a.value!==undefined?String(a.value):(a.description||'')).join(' ').slice(0,500)});
    if(m.method==='Runtime.exceptionThrown') log.exceptions.push(JSON.stringify(m.params.exceptionDetails).slice(0,600));
    if(m.method==='Log.entryAdded'&&['error','warning'].includes(m.params.entry.level)) log.logEntries.push({level:m.params.entry.level,source:m.params.entry.source,text:String(m.params.entry.text).slice(0,300),url:m.params.entry.url});
    if(m.method==='Network.responseReceived'){const r=m.params.response; if(m.params.type==='Document') log.docStatus.push({url:r.url,status:r.status}); if(r.status>=400) log.httpErrors.push({url:r.url,status:r.status,type:m.params.type});}
    if(m.method==='Network.loadingFailed'&&!m.params.canceled) log.httpErrors.push({failed:m.params.errorText,type:m.params.type,requestId:m.params.requestId});
  });
  return {edge,ws,send,evalJs,waitFor,listeners,log};
}
const clickBtn=(test)=>`(() => { const el=[...document.querySelectorAll('button')].find(e=>${test}); if(el) el.click(); return !!el; })()`;
async function fillNoSubmit(evalJs){
  await evalJs(clickBtn(`(e.textContent||'').trim().startsWith('\u6211\u81ea\u5df1')`)); await sleep(300);
  await evalJs(`(() => { const labels=['\u6c11\u570b\u5e74','\u6708\u4efd','\u65e5\u671f']; const values=['63','6','28']; for (let i=0;i<3;i++){ const el=document.querySelector('main[data-page="ghost-asura"] [data-field="birthDate"] input[aria-label="'+labels[i]+'"]'); if(!el) continue; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,values[i]); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.blur(); } return true; })()`); await sleep(600);
  await evalJs(clickBtn(`(e.textContent||'').trim().startsWith('\u7537\u6027')`)); await sleep(250);
  await evalJs(clickBtn(`(e.textContent||'').includes('\u6211\u77e5\u9053\u51fa\u751f\u6642\u8fb0')`)); await sleep(700);
  const ok=await evalJs(`(() => { const el=[...document.querySelectorAll('button')].filter(e=>/^\\s*\u9149\u6642/.test((e.textContent||'').trim())).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0]; if(el){el.click(); return true;} return false; })()`); await sleep(500);
  return ok;
}
const SUBMIT=clickBtn(`(e.textContent||'').includes('\u958b\u555f\u547d\u9b42\u6230\u5c40')`);
const DECREE_VISIBLE=`(() => { const el=document.querySelector('[data-asura-timeline-decree]'); return !!el && el.getBoundingClientRect().height>40; })()`;
const HYDRATION_RE=/hydrat|did not match|Minified React error #(418|419|421|422|423|425)|server rendered|Text content does not match/i;

// In-page sampler: waits for result card, samples particle canvas at fixed offsets; optional scrollBy(300) at +150ms.
const SAMPLER=(scrollMid)=>`(() => { window.__asuraSamples=[]; const offs=[120,250,400,600,800,1050,1150,1300,1600,2200]; const t00=performance.now();
 function sample(label){ const main=document.querySelector('main[data-page="ghost-asura"]'); const cv=main&&[...main.children].find(e=>e.tagName==='CANVAS'); if(!cv) return {label,noCanvas:true};
  const cr=cv.getBoundingClientRect(); const ctx=cv.getContext('2d'); let d; try{ d=ctx.getImageData(0,0,cv.width,cv.height).data; }catch(e){ return {label,err:String(e)} }
  const ids=[...document.querySelectorAll('[data-asura-id]')].map(e=>{const r=e.getBoundingClientRect(); return {l:r.left-cr.left,t:r.top-cr.top,r:r.right-cr.left,b:r.bottom-cr.top,id:e.getAttribute('data-asura-id')};}).filter(r=>r.r>r.l&&r.b>r.t);
  let u=null; for(const r of ids){ if(!u) u={...r}; else {u.l=Math.min(u.l,r.l);u.t=Math.min(u.t,r.t);u.r=Math.max(u.r,r.r);u.b=Math.max(u.b,r.b);} }
  const W=cv.width,H=cv.height; let n=0,near=0,inU=0,sx=0,sy=0,minX=1e9,minY=1e9,maxX=-1,maxY=-1; const M=60;
  for(let y=0;y<H;y+=2){ for(let x=0;x<W;x+=2){ const a=d[(y*W+x)*4+3]; if(a>40){ n++; sx+=x; sy+=y; if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y;
    if(u&&x>=u.l-M&&x<=u.r+M&&y>=u.t-M&&y<=u.b+M) inU++;
    for(const r of ids){ if(x>=r.l-M&&x<=r.r+M&&y>=r.t-M&&y<=r.b+M){near++;break;} } } } }
  return {label,tMs:Math.round(performance.now()-window.__asuraT0),scrollY:Math.round(scrollY),canvas:{w:W,h:H,topInViewport:Math.round(cr.top)},asuraIdCount:ids.length,idsUnion:u&&{l:Math.round(u.l),t:Math.round(u.t),r:Math.round(u.r),b:Math.round(u.b)},painted:n,nearGlowEl:near,inCardUnion60:inU,centroid:n?{x:Math.round(sx/n),y:Math.round(sy/n)}:null,bbox:n?{l:minX,t:minY,r:maxX,b:maxY}:null,viewportInCanvas:{top:Math.round(-cr.top),bottom:Math.round(-cr.top+innerHeight)}}; }
 const poll=()=>{ const el=document.querySelector('[data-asura-timeline-decree]'); if(el&&el.getBoundingClientRect().height>40){ window.__asuraT0=performance.now(); window.__asuraFoundAfterMs=Math.round(window.__asuraT0-t00);
    ${scrollMid?"setTimeout(()=>{ window.__asuraScrollBefore=scrollY; window.scrollBy({top:300,behavior:'instant'}); window.__asuraScrollAfter=scrollY; window.__asuraScrollAt=Math.round(performance.now()-window.__asuraT0); },150);":""}
    for(const o of offs) setTimeout(()=>window.__asuraSamples.push(sample('+'+o)),o); return; } requestAnimationFrame(poll); }; poll(); return true; })()`;

async function setupPage(c,cpu){
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable'); await c.send('Network.enable');
  await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  if(cpu>1) await c.send('Emulation.setCPUThrottlingRate',{rate:cpu});
}
async function shot(c,file){ const s=await c.send('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(path.join(OUT,file),Buffer.from(s.result.data,'base64')); return file; }

async function asuraRun(name,scrollMid){
  const c=await connect(9300+Math.floor(Math.random()*250)); const res={name,scrollMid};
  try{
    await setupPage(c,1);
    await c.send('Page.navigate',{url:BASE+'/ghost-asura'});
    await c.waitFor(`document.readyState==='complete' && !!document.querySelector('button')`); await sleep(1500);
    res.buildId=await c.evalJs(`(()=>{try{return window.__NEXT_DATA__?.buildId||[...document.querySelectorAll('script[src]')].map(s=>s.src).find(s=>/_buildManifest/.test(s))||null}catch(e){return null}})()`);
    res.filled=await fillNoSubmit(c.evalJs);
    await c.evalJs(SAMPLER(scrollMid));
    res.submitted=await c.evalJs(SUBMIT);
    await c.waitFor(DECREE_VISIBLE,60000); const tVis=Date.now();
    if(scrollMid){ await sleep(Math.max(0,450-(Date.now()-tVis))); res.shotGlow=await shot(c,`${name}-glow-after-scroll300-450ms.png`); }
    else { await sleep(Math.max(0,400-(Date.now()-tVis))); res.shotGlow=await shot(c,`${name}-glow-400ms.png`); }
    await sleep(Math.max(0,1150-(Date.now()-tVis))); res.shotShock=await shot(c,`${name}-shockwave-1150ms.png`);
    await sleep(2500);
    res.samples=await c.evalJs('window.__asuraSamples'); res.foundAfterMs=await c.evalJs('window.__asuraFoundAfterMs');
    if(scrollMid) res.scroll=await c.evalJs('({before:window.__asuraScrollBefore,after:window.__asuraScrollAfter,atMs:window.__asuraScrollAt})');
    await sleep(1500);
    res.decree=await c.evalJs(`(() => { const el=document.querySelector('[data-asura-timeline-decree]'); if(!el) return null; const t=el.innerText; const heads=['\u3010\u6230\u610f\u958b\u5834\u3011','\u3010\u6c99\u76e4\u76f4\u65b7\u3011','\u3010\u6230\u8853\u865f\u4ee4\u3011','\u3010\u4fee\u7f85\u6230\u4ee4\u3011']; const idx=heads.map(h=>t.indexOf(h)); const sec1=idx[0]>=0? t.slice(idx[0], idx[1]>idx[0]?idx[1]:undefined):''; return {len:t.length,headsFound:heads.map((h,i)=>({h,at:idx[i]})),inOrder:idx.every((v,i)=>v>=0&&(i===0||v>idx[i-1])),sec1HasJinRiCai:sec1.includes('\u4eca\u65e5\u624d'),sec1:sec1.slice(0,120)}; })()`);
    await c.evalJs(`(() => { const el=document.querySelector('[data-asura-timeline-decree]'); el.scrollIntoView({block:'start',behavior:'instant'}); return true; })()`); await sleep(800);
    res.shotDecree=await shot(c,`${name}-decree-viewport.png`);
    await sleep(500);
  }catch(e){ res.blocked=String(e.stack||e).slice(0,600); }
  finally{ res.log=c.log; res.hydrationErrors=[...c.log.console.map(x=>x.text),...c.log.exceptions,...c.log.logEntries.map(x=>x.text)].filter(t=>HYDRATION_RE.test(t)); try{c.ws.close()}catch{} try{c.edge.kill()}catch{} }
  return res;
}

const PAGES=(process.env.ACCEPT_PAGES||'/,/trust,/dual-chart,/single-shensha,/ghost-asura,/beast-game/battlefield').split(',');
const CLS_REC=`(()=>{ window.__cls=[]; const rec=()=>{ window.__cls.push({t:Math.round(performance.now()),c:document.body?document.body.className:null}); }; const start=()=>{ rec(); new MutationObserver(rec).observe(document.body,{attributes:true,attributeFilter:['class']}); }; if(document.body) start(); else document.addEventListener('DOMContentLoaded',start); })()`;
const GUARD=['app-scrolling','app-touching','app-stress-mode','app-lite-effects','app-mobile-device','app-small-screen','app-reduced-motion','app-low-power-device','app-social-browser','app-page-hidden'];
const pick=s=>(s||'').split(/\s+/).filter(x=>x.startsWith('app-'));
async function crossPage(cpu){
  const out=[];
  for(const p of PAGES){
    const c=await connect(9600+Math.floor(Math.random()*300)); const r={page:p,cpu};
    try{
      await setupPage(c,cpu);
      await c.send('Page.addScriptToEvaluateOnNewDocument',{source:CLS_REC});
      await c.send('Page.navigate',{url:BASE+p});
      await c.waitFor(`document.readyState==='complete'`,90000); await sleep(2500);
      r.before=pick(await c.evalJs('document.body.className'));
      r.scrollMax=await c.evalJs('document.documentElement.scrollHeight-innerHeight');
      const tS=await c.evalJs('performance.now()');
      for(let k=0;k<8;k++){ await c.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:195,y:500,deltaX:0,deltaY:200}); await sleep(120); }
      r.during=pick(await c.evalJs('document.body.className')); const tE=await c.evalJs('performance.now()');
      r.scrollY=await c.evalJs('scrollY');
      await sleep(6000);
      r.after6s=pick(await c.evalJs('document.body.className'));
      const log=await c.evalJs('window.__cls||[]');
      const seen={}; for(const e of log){ for(const k of pick(e.c)) { seen[k]=seen[k]||{firstOnMs:e.t}; } }
      // on/off transitions per guard class
      const trans={}; for(const k of ['app-scrolling','app-stress-mode','app-lite-effects','app-touching']){ let prev=false; const ev=[]; for(const e of log){ const on=pick(e.c).includes(k); if(on!==prev){ ev.push((on?'+':'-')+e.t); prev=on; } } trans[k]=ev.slice(0,20); }
      r.scrollWindowMs={start:Math.round(tS),end:Math.round(tE)};
      r.transitions=trans; r.classMutationCount=log.length;
      r.scrollingSeenDuring=r.during.includes('app-scrolling')||trans['app-scrolling'].some(x=>x.startsWith('+')&&+x.slice(1)>=tS-50);
      r.scrollingClearedAfter=!r.after6s.includes('app-scrolling');
      r.stressClearedAfter=!r.after6s.includes('app-stress-mode');
      r.shot=await shot(c,`page${p.replace(/\//g,'_')||'_root'}-cpu${cpu}-after.png`);
      r.docStatus=c.log.docStatus;
    }catch(e){ r.blocked=String(e.stack||e).slice(0,600); }
    finally{ r.consoleErrors=c.log.console.filter(x=>x.type==='error'); r.consoleWarnings=c.log.console.filter(x=>x.type!=='error'); r.exceptions=c.log.exceptions; r.logErrors=c.log.logEntries.filter(x=>x.level==='error'); r.httpErrors=c.log.httpErrors; try{c.ws.close()}catch{} try{c.edge.kill()}catch{} }
    console.log(JSON.stringify({page:p,cpu,doc:r.docStatus,before:r.before,during:r.during,after6s:r.after6s,trans:r.transitions,cErr:r.consoleErrors&&r.consoleErrors.length,exc:r.exceptions&&r.exceptions.length,http:r.httpErrors&&r.httpErrors.length,blocked:r.blocked}));
    out.push(r);
  }
  return out;
}
(async()=>{
  const mode=process.argv[2]||'all'; const rep={base:BASE,startedAt:new Date().toISOString()};
  if(mode==='asura'||mode==='all'){ rep.asuraStatic=await asuraRun('asura-390-static',false); rep.asuraScroll=await asuraRun('asura-390-scrollmid',true); fs.writeFileSync(path.join(OUT,'asura-hydration-glow.json'),JSON.stringify({asuraStatic:rep.asuraStatic,asuraScroll:rep.asuraScroll},null,2)); console.log('ASURA done'); }
  if(mode==='warnprobe'){ rep.cross1=await crossPage(1); fs.writeFileSync(path.join(OUT,'warnprobe.json'),JSON.stringify(rep.cross1,null,2)); }
  if(mode==='cross'||mode==='all'){ rep.cross1=await crossPage(1); rep.cross4=await crossPage(4); fs.writeFileSync(path.join(OUT,'cross-page-guard.json'),JSON.stringify({cross1:rep.cross1,cross4:rep.cross4},null,2)); }
  rep.finishedAt=new Date().toISOString(); fs.writeFileSync(path.join(OUT,'report-'+mode+'.json'),JSON.stringify(rep,null,2)); console.log('DONE');
})().catch(e=>{console.error(e);process.exit(1)});
