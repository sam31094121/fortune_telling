// perf4 A/B diagnostic. Read-only for the project: CSS rules are changed ONLY inside the headless test browser (CSSOM), never on disk.
// Writes only to _tmp_asura_perf\traces-20261108-perf4ab. Based on trace-asura-20261108.cjs + trace-scroll-v3-20261108.cjs (same fill/open/peel/wheel-scroll steps).
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const os = require('os'); const zlib=require('zlib');
const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p=>fs.existsSync(p));
const ROOT = __dirname; const OUT = path.join(ROOT,'traces-20261108-perf4ab'); fs.mkdirSync(OUT,{recursive:true});
const BASE = 'http://localhost:3010';
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
const CATS = 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,v8.execute,disabled-by-default-v8.cpu_profiler,blink.user_timing,loading,latencyInfo';
async function connect(port){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'asura-ab-'));
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
const PEEL=`(() => { const b=[...document.querySelectorAll('button')].find(e=>/\u518d\u525d\u4e00\u5c64/.test(e.textContent||'')) || [...document.querySelectorAll('button')].find(e=>/\u525d\u4e00\u5c64|\u525d\u6d0b\u8525|\u5f80\u4e0b\u525d/.test(e.textContent||'')); if(!b) return {ok:false}; b.scrollIntoView({block:'center',behavior:'instant'}); b.click(); return {ok:true}; })()`;
// Variant patterns applied per top-level sub-selector (rule rewritten via selectorText; rule deleted if no sub-selector left).
const VARIANTS={A:null, B:String.raw`body:not\(:has\(`, C:String.raw`(?:body|html):(?:not\(:)?has\(`};
const STRIP=(pat)=>`(() => { const re=new RegExp(${JSON.stringify(pat)}); const st={sheets:0,blocked:0,rulesDeleted:0,rulesRewritten:0,partsRemoved:0,remainingMatch:0};
 const split=s=>{const out=[];let d=0,cur='';for(const ch of s){ if(ch==='('||ch==='[')d++; else if(ch===')'||ch===']')d--; if(ch===','&&d===0){out.push(cur);cur='';} else cur+=ch;} out.push(cur); return out.map(x=>x.trim()).filter(Boolean); };
 const walk=(list)=>{ for(let i=list.cssRules.length-1;i>=0;i--){ const r=list.cssRules[i];
   if(r.cssRules && !(r instanceof CSSStyleRule)) { walk(r); continue; }
   if(r instanceof CSSStyleRule){ if(r.cssRules&&r.cssRules.length) walk(r); const sel=r.selectorText; if(!re.test(sel)) continue; const parts=split(sel); const keep=parts.filter(p=>!re.test(p)); st.partsRemoved+=parts.length-keep.length;
     if(!keep.length){ list.deleteRule(i); st.rulesDeleted++; } else { r.selectorText=keep.join(', '); st.rulesRewritten++; } } } };
 for(const s of document.styleSheets){ try{ s.cssRules; }catch(e){ st.blocked++; continue; } st.sheets++; walk(s); }
 const count=(list)=>{ for(const r of list.cssRules){ if(r instanceof CSSStyleRule && re.test(r.selectorText)) st.remainingMatch++; if(r.cssRules) count(r);} };
 for(const s of document.styleSheets){ try{ count(s);}catch(e){} }
 return st; })()`;
const HASCOUNT=`(() => { let b=0,n=0,h=0; const walk=l=>{ for(const r of l.cssRules){ if(r instanceof CSSStyleRule){ const s=r.selectorText; if(/body:not\\(:has\\(/.test(s)) n++; if(/body:has\\(/.test(s)) b++; if(/html:has\\(/.test(s)) h++; } if(r.cssRules) walk(r);} }; for(const s of document.styleSheets){ try{walk(s)}catch(e){} } return {rulesWithBodyHas:b,rulesWithBodyNotHas:n,rulesWithHtmlHas:h}; })()`;
async function trace(c,tag,name,action,pre,post){
  const events=[]; let done; const fin=new Promise(r=>done=r);
  const l=m=>{if(m.method==='Tracing.dataCollected')events.push(...m.params.value); if(m.method==='Tracing.tracingComplete')done()};
  c.listeners.push(l);
  await c.send('Tracing.start',{traceConfig:{includedCategories:CATS.split(',')},transferMode:'ReportEvents'});
  await sleep(300);
  const preV=pre?await pre():null;
  await c.evalJs(`performance.mark('asura-action-start')`);
  let meta=await action(preV);
  await c.evalJs(`performance.mark('asura-action-end')`);
  if(post) meta=await post(preV,meta);
  await c.send('Tracing.end'); await fin; c.listeners.splice(c.listeners.indexOf(l),1);
  fs.writeFileSync(path.join(OUT,tag+'-'+name+'.json.gz'),zlib.gzipSync(JSON.stringify({traceEvents:events,metadata:{meta}})));
  const tn={}; for(const e of events) if(e.ph==='M'&&e.name==='thread_name') tn[e.pid+':'+e.tid]=e.args.name;
  const marks=events.filter(e=>e.cat&&e.cat.includes('blink.user_timing')&&/asura-action-(start|end)/.test(e.name));
  const s=marks.find(e=>e.name==='asura-action-start'), en=[...marks].reverse().find(e=>e.name==='asura-action-end');
  let summary={tag,name,meta,windowFound:!!(s&&en)};
  if(s&&en){
    const pid=s.pid, t0=s.ts, t1=en.ts;
    const mains=Object.entries(tn).filter(([k,v])=>v==='CrRendererMain'&&k.startsWith(pid+':')).map(([k])=>+k.split(':')[1]);
    const onMain=e=>e.pid===pid&&mains.includes(e.tid)&&e.ts>=t0&&e.ts<=t1;
    const lts=events.filter(e=>onMain(e)&&e.ph==='X'&&(e.name==='RunTask'||e.name==='ThreadControllerImpl::RunTask')&&e.dur>50000)
      .map(e=>({startMsFromActionStart:+((e.ts-t0)/1000).toFixed(1),durationMs:+(e.dur/1000).toFixed(1)}));
    // style recalc: UpdateLayoutTree (X) with args.elementCount; fall back to RecalculateStyles / B-E pairs not handled
    const rec=events.filter(e=>onMain(e)&&e.ph==='X'&&(e.name==='UpdateLayoutTree'||e.name==='RecalculateStyles'));
    const ec=e=>(e.args&&(e.args.elementCount??(e.args.data&&e.args.data.elementCount)??(e.args.endData&&e.args.endData.elementCount)))??null;
    const big=rec.slice().sort((a,b)=>b.dur-a.dur)[0];
    const maxEl=rec.filter(e=>ec(e)!=null).sort((a,b)=>ec(b)-ec(a))[0];
    const lay=events.filter(e=>onMain(e)&&e.ph==='X'&&e.name==='Layout');
    summary={...summary,windowMs:+((t1-t0)/1000).toFixed(1),longTaskCount:lts.length,longTaskMaxMs:lts.length?Math.max(...lts.map(x=>x.durationMs)):0,longTasks:lts,
      styleRecalc:{count:rec.length,totalMs:+(rec.reduce((a,e)=>a+e.dur,0)/1000).toFixed(1),biggest:big?{ms:+(big.dur/1000).toFixed(1),elementCount:ec(big)}:null,maxElementCount:maxEl?{elementCount:ec(maxEl),ms:+(maxEl.dur/1000).toFixed(1)}:null},
      layout:{count:lay.length,totalMs:+(lay.reduce((a,e)=>a+e.dur,0)/1000).toFixed(1),maxMs:lay.length?+(Math.max(...lay.map(e=>e.dur))/1000).toFixed(1):0},
      eventCount:events.length};
  }
  fs.writeFileSync(path.join(OUT,tag+'-'+name+'.summary.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({tag,name,lt:summary.longTaskCount,max:summary.longTaskMaxMs,rec:summary.styleRecalc}));
  return summary;
}
async function runOne(variant,cpu,run){
  const tag=`${variant}-cpu${cpu}-r${run}`;
  const c=await connect(9300+Math.floor(Math.random()*500)); const res={tag,variant,cpu,run,scenarios:{}};
  try{
    await c.send('Page.enable'); await c.send('Runtime.enable');
    await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
    await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    if(cpu>1) await c.send('Emulation.setCPUThrottlingRate',{rate:cpu});
    await c.send('Page.navigate',{url:BASE+'/ghost-asura'});
    await c.waitFor(`document.readyState==='complete' && !!document.querySelector('button')`); await sleep(1000);
    res.buildId=await c.evalJs(`(window.__NEXT_DATA__&&window.__NEXT_DATA__.buildId)||null`);
    res.hasBefore=await c.evalJs(HASCOUNT);
    if(VARIANTS[variant]) res.strip=await c.evalJs(STRIP(VARIANTS[variant]));
    res.hasAfter=await c.evalJs(HASCOUNT);
    await sleep(800);
    const filled=await fillNoSubmit(c.evalJs);
    res.scenarios.open=await trace(c,tag,'open',async()=>{const clicked=await c.evalJs(SUBMIT); const t=Date.now(); await c.waitFor(DECREE_VISIBLE); const appearMs=Date.now()-t; await sleep(3000); return {filled,clicked,decreeAppearWallMs:appearMs};});
    await sleep(1500);
    res.scenarios.peel=await trace(c,tag,'peel',async()=>{const r=await c.evalJs(PEEL); await sleep(3000); return r;});
    await sleep(1500);
    await c.evalJs(`(() => { const el=document.querySelector('[data-asura-age-timeline]')||document.querySelector('[data-asura-timeline-decree]'); if(el) el.scrollIntoView({block:'start',behavior:'instant'}); return !!el; })()`); await sleep(800);
    res.scenarios.scroll=await trace(c,tag,'scroll-v3',async()=>{const y0=await c.evalJs('scrollY'); const t=Date.now(); for(let k=0;k<12;k++){ await c.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:195,y:500,deltaX:0,deltaY:120}); await sleep(230);} const rem=3000-(Date.now()-t); if(rem>0) await sleep(rem); return {y0};},
      null, async(_,m)=>{await sleep(300); const y1=await c.evalJs('scrollY'); return {...m,y1,deltaY:y1-m.y0};});
    if(run===1) { const s=await c.send('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(path.join(OUT,tag+'-after-scroll.png'),Buffer.from(s.result.data,'base64')); }
  }catch(e){ res.blocked=String(e.stack||e).slice(0,600); console.log('BLOCKED',tag,res.blocked); }
  finally{ try{c.ws.close()}catch{} try{c.edge.kill()}catch{} }
  fs.writeFileSync(path.join(OUT,tag+'.run.json'),JSON.stringify(res,null,2));
  return res;
}
const med=a=>{const s=a.filter(x=>x!=null).sort((x,y)=>x-y); if(!s.length) return null; const m=Math.floor(s.length/2); return s.length%2?s[m]:+((s[m-1]+s[m])/2).toFixed(1);};
(async()=>{
  const variants=(process.argv[2]||'A,B,C').split(','); const cpus=(process.argv[3]||'4,6').split(',').map(Number); const runs=+(process.argv[4]||3);
  const all=[];
  // interleave variants per run to spread machine-noise drift evenly
  for(let run=1;run<=runs;run++) for(const cpu of cpus) for(const v of variants){ console.log('RUN',v,cpu,run,new Date().toISOString()); all.push(await runOne(v,cpu,run)); }
  const table=[];
  for(const v of variants) for(const cpu of cpus) for(const sc of ['open','peel','scroll']){
    const rs=all.filter(r=>r.variant===v&&r.cpu===cpu).map(r=>r.scenarios[sc]).filter(Boolean);
    table.push({variant:v,cpu,scenario:sc,n:rs.length,
      longTaskMaxMs:rs.map(r=>r.longTaskMaxMs),medianLongTaskMaxMs:med(rs.map(r=>r.longTaskMaxMs)),
      longTaskCount:rs.map(r=>r.longTaskCount),medianLongTaskCount:med(rs.map(r=>r.longTaskCount)),
      recalcTotalMs:rs.map(r=>r.styleRecalc&&r.styleRecalc.totalMs),medianRecalcTotalMs:med(rs.map(r=>r.styleRecalc&&r.styleRecalc.totalMs)),
      biggestRecalc:rs.map(r=>r.styleRecalc&&r.styleRecalc.biggest),maxElementCount:rs.map(r=>r.styleRecalc&&r.styleRecalc.maxElementCount&&r.styleRecalc.maxElementCount.elementCount),
      layoutTotalMs:rs.map(r=>r.layout&&r.layout.totalMs),
      anyRunAllUnder50:rs.some(r=>r.longTaskCount===0), allRunsUnder50:rs.length>0&&rs.every(r=>r.longTaskCount===0)});
  }
  const rep={base:BASE,generatedAt:new Date().toISOString(),note:'CSSOM-only runtime removal inside headless Edge; no files changed. B/C are NOT visually equivalent.',variants:VARIANTS,
    strip:all.map(r=>({tag:r.tag,buildId:r.buildId,hasBefore:r.hasBefore,strip:r.strip,hasAfter:r.hasAfter,blocked:r.blocked})),table};
  fs.writeFileSync(path.join(OUT,'SUMMARY-perf4ab.json'),JSON.stringify(rep,null,2));
  console.log('DONE');
})().catch(e=>{console.error(e);process.exit(1)});
