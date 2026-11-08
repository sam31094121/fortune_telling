// New read-only trace script. Writes only to _tmp_asura_perf\traces-20261108 and decree png.
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const os = require('os');
const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p=>fs.existsSync(p));
const ROOT = __dirname; const OUT = path.join(ROOT,'traces-20261108-perf3'); fs.mkdirSync(OUT,{recursive:true});
const BASE = 'http://localhost:3010';
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
const CATS = 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,v8.execute,disabled-by-default-v8.cpu_profiler,blink.user_timing,loading,latencyInfo';
async function connect(port){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'asura-trace-'));
  const edge=spawn(EDGE,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--hide-scrollbars','about:blank'],{stdio:'ignore'});
  let target; for(let i=0;i<50&&!target;i++){await sleep(300);try{target=(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page')}catch{}}
  const ws=new WebSocket(target.webSocketDebuggerUrl); await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
  let id=0; const pending=new Map(); const listeners=[];
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)} else if(m.method){for(const l of listeners)l(m)}});
  const send=(method,params={})=>new Promise(r=>{const i=++id;pending.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
  const evalJs=async ex=>{const r=await send('Runtime.evaluate',{expression:ex,awaitPromise:true,returnByValue:true}); if(r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,400)); return r.result?.result?.value};
  const waitFor=async(ex,ms=90000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await evalJs(ex))return Date.now();await sleep(100)}throw new Error('timeout '+ex)};
  return {edge,ws,send,evalJs,waitFor,listeners};
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
async function trace(c,name,action){
  const events=[]; let done; const fin=new Promise(r=>done=r);
  const l=m=>{if(m.method==='Tracing.dataCollected')events.push(...m.params.value); if(m.method==='Tracing.tracingComplete')done()};
  c.listeners.push(l);
  await c.send('Tracing.start',{traceConfig:{includedCategories:CATS.split(',')},transferMode:'ReportEvents'});
  await sleep(300);
  await c.evalJs(`performance.mark('asura-action-start')`);
  const meta=await action();
  await c.evalJs(`performance.mark('asura-action-end')`);
  await c.send('Tracing.end'); await fin; c.listeners.splice(c.listeners.indexOf(l),1);
  fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify({traceEvents:events,metadata:{meta}}));
  // summary
  const tn={}; for(const e of events) if(e.ph==='M'&&e.name==='thread_name') tn[e.pid+':'+e.tid]=e.args.name;
  const marks=events.filter(e=>e.cat&&e.cat.includes('blink.user_timing')&&/asura-action-(start|end)/.test(e.name));
  const s=marks.find(e=>e.name==='asura-action-start'), en=[...marks].reverse().find(e=>e.name==='asura-action-end');
  let summary={name,meta,windowFound:!!(s&&en)};
  if(s&&en){
    const pid=s.pid, t0=s.ts, t1=en.ts;
    const mains=Object.entries(tn).filter(([k,v])=>v==='CrRendererMain'&&k.startsWith(pid+':')).map(([k])=>+k.split(':')[1]);
    const lts=events.filter(e=>e.pid===pid&&mains.includes(e.tid)&&e.ph==='X'&&(e.name==='RunTask'||e.name==='ThreadControllerImpl::RunTask')&&e.dur>50000&&e.ts>=t0&&e.ts<=t1)
      .map(e=>({startMsFromActionStart:+((e.ts-t0)/1000).toFixed(1),durationMs:+(e.dur/1000).toFixed(1)}));
    summary={...summary,windowMs:+((t1-t0)/1000).toFixed(1),longTaskCount:lts.length,longTaskMaxMs:lts.length?Math.max(...lts.map(x=>x.durationMs)):0,longTasks:lts,eventCount:events.length};
  }
  fs.writeFileSync(path.join(OUT,name+'.summary.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary));
  return summary;
}
async function setup(cpu){
  const c=await connect(9600+Math.floor(Math.random()*300));
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  if(cpu>1) await c.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  await c.send('Page.navigate',{url:BASE+'/ghost-asura'});
  await c.waitFor(`document.readyState==='complete' && !!document.querySelector('button')`); await sleep(1000);
  return c;
}
async function runCpu(cpu){
  const c=await setup(cpu); const all=[];
  try{
    const filled=await fillNoSubmit(c.evalJs);
    all.push(await trace(c,`open-390-cpu${cpu}`,async()=>{const clicked=await c.evalJs(SUBMIT); const t=Date.now(); await c.waitFor(DECREE_VISIBLE); const appearMs=Date.now()-t; await sleep(3000); return {filled,clicked,decreeAppearWallMs:appearMs};}));
    await sleep(1500);
    all.push(await trace(c,`peel-390-cpu${cpu}`,async()=>{const r=await c.evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(e=>/\u518d\u525d\u4e00\u5c64/.test(e.textContent||'')) || [...document.querySelectorAll('button')].find(e=>/\u525d\u4e00\u5c64|\u525d\u6d0b\u8525|\u5f80\u4e0b\u525d/.test(e.textContent||'')); if(!b) return {ok:false}; b.scrollIntoView({block:'center',behavior:'instant'}); b.click(); return {ok:true,text:(b.textContent||'').replace(/\\s+/g,' ').slice(0,40)}; })()`); await sleep(3000); return r;}));
    await sleep(1500);
    await c.evalJs(`(() => { const el=document.querySelector('[data-asura-timeline-decree]'); if(el) el.scrollIntoView({block:'start',behavior:'instant'}); return !!el; })()`); await sleep(800);
    all.push(await trace(c,`scroll-390-cpu${cpu}`,async()=>{const y0=await c.evalJs('window.scrollY'); const t=Date.now(); const r=await c.send('Input.synthesizeScrollGesture',{x:195,y:600,yDistance:-1800,speed:700,gestureSourceType:'touch',repeatCount:1}); const rem=3000-(Date.now()-t); if(rem>0) await sleep(rem); const y1=await c.evalJs('window.scrollY'); return {method:'Input.synthesizeScrollGesture touch',error:r.error||null,scrollY0:y0,scrollY1:y1};}));
  }catch(e){all.push({cpu,blocked:String(e.stack||e).slice(0,500)}); console.log('BLOCKED',cpu,String(e).slice(0,300));}
  finally{try{c.ws.close()}catch{} try{c.edge.kill()}catch{}}
  return all;
}
async function shot(){
  const c=await setup(1);
  try{
    await fillNoSubmit(c.evalJs); await c.evalJs(SUBMIT); await c.waitFor(DECREE_VISIBLE); await sleep(4000);
    await c.evalJs(`(() => { const el=document.querySelector('[data-asura-timeline-decree]'); el.scrollIntoView({block:'start',behavior:'instant'}); return true; })()`); await sleep(1500);
    const info=await c.evalJs(`(() => { const el=document.querySelector('[data-asura-timeline-decree]'); const r=el.getBoundingClientRect(); return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height,text:el.innerText,childCount:el.children.length}; })()`);
    fs.writeFileSync(path.join(OUT,'decree-390-perf3-text.json'),JSON.stringify(info,null,2),'utf8');
    const el=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:info.x,y:info.y,width:info.w,height:info.h,scale:1}});
    fs.writeFileSync(path.join(OUT,'decree-390-perf3-element.png'),Buffer.from(el.result.data,'base64'));
    const vp=await c.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(OUT,'decree-390-perf3-viewport.png'),Buffer.from(vp.result.data,'base64'));
    console.log('SHOT',JSON.stringify({h:info.h,childCount:info.childCount}));
  }finally{try{c.ws.close()}catch{} try{c.edge.kill()}catch{}}
}
(async()=>{
  const mode=process.argv[2]||'all';
  if(mode==='shot'||mode==='all') await shot();
  if(mode==='trace'||mode==='all'){ const r={cpu4:await runCpu(4),cpu6:await runCpu(6)}; fs.writeFileSync(path.join(OUT,'SUMMARY.json'),JSON.stringify(r,null,2)); }
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
