// READ-ONLY layout diagnosis for /ghost-asura card open. Toggles ONLY inside headless Edge (CSSOM/injected style/init script). Writes only to this folder.
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const os = require('os'); const zlib=require('zlib');
const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p=>fs.existsSync(p));
const OUT = __dirname; const BASE = process.env.ASURA_BASE_URL || 'http://localhost:3010';
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
const CATS = 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.stack,blink.user_timing,v8.execute,loading';
async function connect(port){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'asura-diag-'));
  const edge=spawn(EDGE,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--hide-scrollbars','about:blank'],{stdio:'ignore'});
  let target; for(let i=0;i<60&&!target;i++){await sleep(300);try{target=(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page')}catch{}}
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
  return await evalJs(`(() => { const el=[...document.querySelectorAll('button')].filter(e=>/^\\s*\u9149\u6642/.test((e.textContent||'').trim())).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0]; if(el){el.click(); return true;} return false; })()`);
}
const SUBMIT=clickBtn(`(e.textContent||'').includes('\u958b\u555f\u547d\u9b42\u6230\u5c40')`);
const DECREE_VISIBLE=`(() => { const el=document.querySelector('[data-asura-timeline-decree]'); return !!el && el.getBoundingClientRect().height>40; })()`;
// Geometry-read instrumentation (counts + self time of forced reads), installed before page scripts.
const GEO_INIT=`(() => { const st={calls:{},ms:{}}; window.__asuraGeo=st; window.__asuraGeoOn=false;
 const wrapM=(proto,name)=>{ const o=proto[name]; if(!o) return; proto[name]=function(...a){ if(!window.__asuraGeoOn) return o.apply(this,a); const t=performance.now(); const r=o.apply(this,a); const d=performance.now()-t; const k=name; st.calls[k]=(st.calls[k]||0)+1; st.ms[k]=(st.ms[k]||0)+d; return r; }; };
 const wrapG=(proto,name)=>{ const desc=Object.getOwnPropertyDescriptor(proto,name); if(!desc||!desc.get) return; Object.defineProperty(proto,name,{configurable:true,enumerable:desc.enumerable,get(){ if(!window.__asuraGeoOn) return desc.get.call(this); const t=performance.now(); const r=desc.get.call(this); const d=performance.now()-t; st.calls[name]=(st.calls[name]||0)+1; st.ms[name]=(st.ms[name]||0)+d; return r; }}); };
 wrapM(Element.prototype,'getBoundingClientRect'); wrapM(Element.prototype,'getClientRects'); wrapM(Element.prototype,'scrollIntoView'); wrapM(window,'getComputedStyle');
 for(const n of ['offsetHeight','offsetWidth','offsetTop','offsetLeft']) wrapG(HTMLElement.prototype,n);
 for(const n of ['clientHeight','clientWidth','scrollHeight','scrollWidth','scrollTop']) wrapG(Element.prototype,n);
})()`;
const FONT_INIT=`(() => { window.__asuraFontEvents=[]; document.fonts && document.fonts.addEventListener('loadingdone',e=>window.__asuraFontEvents.push({t:performance.now(),n:e.fontfaces.map(f=>f.family+' '+f.status)})); })()`;
// Variants: css injected before SUBMIT (style tag), or js run before SUBMIT.
const V={
  A:{},
  P_text:{prewarm:'text'},
  P_font:{prewarm:'font'},
  P_textOther:{prewarm:'other'},
  F_fontsReady:{js:`(async()=>{ await document.fonts.ready; const fs=[...document.fonts].filter(f=>/Asura/.test(f.family)); await Promise.all(fs.map(f=>f.load().catch(()=>null))); return fs.map(f=>f.family+':'+f.status); })()`},
  S_sysFont:{css:`main[data-page="ghost-asura"] *{font-family:"Microsoft JhengHei",sans-serif !important}`},
  T_noWrapBalance:{css:`main[data-page="ghost-asura"] *{text-wrap:wrap !important}`},
  L_noLetterSpacing:{css:`main[data-page="ghost-asura"] *{letter-spacing:normal !important;word-spacing:normal !important}`},
  K_contain:{css:`main[data-page="ghost-asura"] section, main[data-page="ghost-asura"] li, main[data-page="ghost-asura"] details, main[data-page="ghost-asura"] article{contain:layout style !important}`},
  I_noInterp:{css:`main[data-page="ghost-asura"] *{interpolate-size:numeric-only !important; transition:none !important}`},
  G_flatGrid:{css:`main[data-page="ghost-asura"] [data-asura-timeline-decree] ~ *, main[data-page="ghost-asura"] *{grid-template-columns:none !important;grid-template-rows:none !important;grid-template-areas:none !important;grid-auto-flow:row !important}`},
  X_noFx:{css:`main[data-page="ghost-asura"] *, main[data-page="ghost-asura"] *::before, main[data-page="ghost-asura"] *::after{filter:none !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;mask:none !important;-webkit-mask:none !important;box-shadow:none !important;text-shadow:none !important}`},
  W_noShaping:{css:`main[data-page="ghost-asura"] *{text-rendering:optimizeSpeed !important;font-feature-settings:normal !important;font-kerning:none !important;font-variant-ligatures:none !important;hyphens:manual !important;line-break:auto !important;word-break:normal !important;overflow-wrap:normal !important}`},
  N_noDetailsAnim:{css:`main[data-page="ghost-asura"] details::details-content{transition:none !important;content-visibility:visible !important} main[data-page="ghost-asura"] *{animation:none !important}`},
};
// Hide-based attribution (diagnostic only; changes geometry): set by env HIDE=selector
async function run(variant,cpu,runIdx,hide){
  const tag=`${variant}${hide?'-hide'+hide.name:''}${process.env.WARM==='1'?'-warm':''}-cpu${cpu}-r${runIdx}`;
  const c=await connect(9300+Math.floor(Math.random()*600)); const res={tag,variant,cpu,runIdx};
  try{
    await c.send('Page.enable'); await c.send('Runtime.enable');
    await c.send('Page.addScriptToEvaluateOnNewDocument',{source:GEO_INIT});
    await c.send('Page.addScriptToEvaluateOnNewDocument',{source:FONT_INIT});
    await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
    await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    if(cpu>1) await c.send('Emulation.setCPUThrottlingRate',{rate:cpu});
    await c.send('Page.navigate',{url:BASE+'/ghost-asura'});
    await c.waitFor(`document.readyState==='complete' && !!document.querySelector('button')`); await sleep(1000);
    res.buildId=await c.evalJs(`(window.__NEXT_DATA__&&window.__NEXT_DATA__.buildId)||(document.querySelector('script[src*="/_next/static/"]')||{}).src||null`);
    res.filled=await fillNoSubmit(c.evalJs); await sleep(500);
    if(process.env.WARM==='1'){ await c.evalJs(SUBMIT); await c.waitFor(DECREE_VISIBLE); await sleep(2500); await c.send('Page.reload',{}); await sleep(500); await c.waitFor(`document.readyState==='complete' && !!document.querySelector('button')`); await sleep(1000); res.filled=await fillNoSubmit(c.evalJs); await sleep(500); res.warm=true; }
    const v=V[variant]||{};
    if(v.css) await c.evalJs(`(() => { const s=document.createElement('style'); s.id='diag'; s.textContent=${JSON.stringify(v.css)}; document.head.appendChild(s); return true; })()`);
    if(v.js) res.pre=await c.evalJs(v.js);
    if(v.prewarm){ let txt=''; const card=fs.existsSync(path.join(OUT,'PROBE-text.txt'))?fs.readFileSync(path.join(OUT,'PROBE-text.txt'),'utf8'):'';
      if(v.prewarm==='text') txt=card; else if(v.prewarm==='font') txt='\u4e00\u662f\u5728\u4e0d\u4e86\u6709\u548c\u4eba\u9019\u4e2d';
      else { const set=new Set(card); let o=''; for(let cp=0x4e00; o.length<set.size && cp<0x9fff; cp++){ const ch=String.fromCharCode(cp); if(!set.has(ch)) o+=ch; } txt=o.repeat(Math.max(1,Math.round(card.length/Math.max(1,o.length)))); }
      res.prewarm=await c.evalJs(`(() => { const d=document.createElement('div'); d.setAttribute('aria-hidden','true'); d.style.cssText='position:absolute;left:0;top:0;width:350px;visibility:hidden;pointer-events:none;font-family:"Microsoft JhengHei","PingFang TC","Noto Sans TC",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:15px;line-height:1.7;letter-spacing:.6px;white-space:pre-wrap'; d.textContent=${JSON.stringify(txt)}; document.body.appendChild(d); const t=performance.now(); const h=d.offsetHeight; const ms=performance.now()-t; d.remove(); return {chars:${JSON.stringify(txt)}.length,h,ms:+ms.toFixed(1)}; })()`); }
    if(hide) await c.evalJs(`(() => { const s=document.createElement('style'); s.id='diagHide'; s.textContent=${JSON.stringify(hide.sel+'{display:none !important}')}; document.head.appendChild(s); return true; })()`);
    await sleep(600);
    res.fontsBefore=await c.evalJs(`[...document.fonts].map(f=>f.family+'|'+f.status+'|'+f.display)`);
    // trace
    const events=[]; let done; const fin=new Promise(r=>done=r);
    const l=m=>{if(m.method==='Tracing.dataCollected')events.push(...m.params.value); if(m.method==='Tracing.tracingComplete')done()};
    c.listeners.push(l);
    await c.send('Tracing.start',{traceConfig:{includedCategories:CATS.split(',')},transferMode:'ReportEvents'});
    await sleep(300);
    await c.evalJs(`(window.__asuraGeoOn=true, window.__asuraFontEvents=[], performance.mark('asura-action-start'), true)`);
    await c.evalJs(SUBMIT); const t=Date.now(); await c.waitFor(DECREE_VISIBLE); res.decreeWallMs=Date.now()-t;
    await sleep(3000);
    await c.evalJs(`(performance.mark('asura-action-end'), window.__asuraGeoOn=false, true)`);
    await c.send('Tracing.end'); await fin;
    res.geo=await c.evalJs(`JSON.parse(JSON.stringify(window.__asuraGeo))`);
    res.fontEvents=await c.evalJs(`window.__asuraFontEvents`);
    if(process.env.SAVE_TRACE==='1') fs.writeFileSync(path.join(OUT,tag+'-open.json.gz'),zlib.gzipSync(JSON.stringify({traceEvents:events})));
    // analysis
    const tn={}; for(const e of events) if(e.ph==='M'&&e.name==='thread_name') tn[e.pid+':'+e.tid]=e.args.name;
    const s=events.find(e=>e.name==='asura-action-start'), en=[...events].reverse().find(e=>e.name==='asura-action-end');
    const pid=s.pid,t0=s.ts,t1=en.ts;
    const mains=Object.entries(tn).filter(([k,v])=>v==='CrRendererMain'&&k.startsWith(pid+':')).map(([k])=>+k.split(':')[1]);
    const onMain=e=>e.pid===pid&&mains.includes(e.tid)&&e.ts>=t0&&e.ts<=t1;
    const lts=events.filter(e=>onMain(e)&&e.ph==='X'&&(e.name==='RunTask'||e.name==='ThreadControllerImpl::RunTask')&&e.dur>50000).map(e=>({at:+((e.ts-t0)/1000).toFixed(1),ms:+(e.dur/1000).toFixed(1)}));
    const lay=events.filter(e=>onMain(e)&&e.ph==='X'&&e.name==='Layout');
    const rec=events.filter(e=>onMain(e)&&e.ph==='X'&&(e.name==='UpdateLayoutTree'||e.name==='RecalculateStyles'));
    const ec=e=>(e.args&&(e.args.elementCount??e.args.beginData?.elementCount??e.args.endData?.elementCount))??null;
    const bigLay=lay.slice().sort((a,b)=>b.dur-a.dur).slice(0,3).map(e=>({ms:+(e.dur/1000).toFixed(1),at:+((e.ts-t0)/1000).toFixed(1),dirty:e.args?.beginData?.dirtyObjects,total:e.args?.beginData?.totalObjects,partial:e.args?.beginData?.partialLayout,forced:!!(e.args?.beginData?.stackTrace),stack:(e.args?.beginData?.stackTrace||[]).slice(0,4).map(f=>f.functionName+'@'+(f.url||'').split('/').pop()+':'+f.lineNumber)}));
    const forced=lay.filter(e=>e.args?.beginData?.stackTrace);
    const fns=events.filter(e=>onMain(e)&&e.ph==='X'&&(e.name==='FunctionCall'||e.name==='EvaluateScript'||e.name==='v8.callFunction'));
    const sum=a=>+(a.reduce((x,e)=>x+e.dur,0)/1000).toFixed(1);
    // fonts
    const fontEv=events.filter(e=>onMain(e)&&/Font|font/.test(e.name)&&e.ph==='X').reduce((m,e)=>{m[e.name]=(m[e.name]||0)+e.dur/1000;return m},{});
    const invFonts=events.filter(e=>e.pid===pid&&e.ts>=t0&&e.ts<=t1&&(e.args?.data?.reason||'').includes('ont')).length;
    const paint=events.filter(e=>onMain(e)&&e.ph==='X'&&(e.name==='Paint'||e.name==='PrePaint'||e.name==='Layerize'||e.name==='UpdateLayer'));
    const kids=['Layout','UpdateLayoutTree','Paint','PrePaint','Layerize','FunctionCall','EvaluateScript','v8.callFunction','HitTest','ParseHTML','MinorGC','MajorGC','V8.GC_SCAVENGER','FireAnimationFrame','TimerFire','EventDispatch','UpdateLayer','Commit','IntersectionObserverController::computeIntersections','ScrollLayer'];
    const ltDetail=events.filter(e=>onMain(e)&&e.ph==='X'&&(e.name==='RunTask'||e.name==='ThreadControllerImpl::RunTask')&&e.dur>50000).map(t=>{ const inside=events.filter(e=>e.pid===t.pid&&e.tid===t.tid&&e.ph==='X'&&e.ts>=t.ts&&e.ts+e.dur<=t.ts+t.dur&&kids.includes(e.name)); const m={}; for(const e of inside) m[e.name]=+(((m[e.name]||0)+e.dur/1000)).toFixed(1); return {at:+((t.ts-t0)/1000).toFixed(1),ms:+(t.dur/1000).toFixed(1),parts:m}; });
    res.ltDetail=ltDetail;
    Object.assign(res,{windowMs:+((t1-t0)/1000).toFixed(1),longTasks:lts,ltMax:lts.length?Math.max(...lts.map(x=>x.ms)):0,
      layout:{count:lay.length,totalMs:sum(lay),maxMs:lay.length?+(Math.max(...lay.map(e=>e.dur))/1000).toFixed(1):0,top:bigLay,forcedCount:forced.length,forcedMs:sum(forced)},
      recalc:{count:rec.length,totalMs:sum(rec),maxMs:rec.length?+(Math.max(...rec.map(e=>e.dur))/1000).toFixed(1):0,maxEl:Math.max(0,...rec.map(ec).filter(x=>x!=null))},
      scriptMs:sum(fns),paintMs:sum(paint),fontEventMs:fontEv,fontInvalidations:invFonts});
  }catch(e){ res.blocked=String(e.stack||e).slice(0,600); }
  finally{ try{c.ws.close()}catch{} try{c.edge.kill()}catch{} }
  fs.writeFileSync(path.join(OUT,res.tag+'.run.json'),JSON.stringify(res,null,2));
  console.log(JSON.stringify({tag:res.tag,lt:res.ltMax,lay:res.layout&&[res.layout.totalMs,res.layout.maxMs,res.layout.top&&res.layout.top[0]&&res.layout.top[0].total],rec:res.recalc&&[res.recalc.totalMs,res.recalc.maxEl],script:res.scriptMs,forced:res.layout&&[res.layout.forcedCount,res.layout.forcedMs],blocked:res.blocked}));
  return res;
}
// DOM probe after open
const PROBE=`(() => {
 const main=document.querySelector('main[data-page="ghost-asura"]'); const dec=document.querySelector('[data-asura-timeline-decree]');
 let card=dec; while(card && card!==main && !(/GhostAsuraCard_card|GhostAsuraCard_root/.test(card.className||''))) card=card.parentElement; if(!card||card===main) card=main;
 const all=[...card.querySelectorAll('*')]; const r={cardClass:String(card.className).slice(0,120),cardTag:card.tagName,cardNodes:all.length,mainNodes:main.querySelectorAll('*').length,docNodes:document.querySelectorAll('*').length,textNodes:0,textChars:0,cjkChars:0};
 const tw=document.createTreeWalker(card,NodeFilter.SHOW_TEXT); let n; while(n=tw.nextNode()){ const t=n.nodeValue.trim(); if(!t) continue; r.textNodes++; r.textChars+=t.length; r.cjkChars+=(t.match(/[\\u3400-\\u9fff\\uf900-\\ufaff]/g)||[]).length; }
 let maxDepth=0,maxLayoutDepth=0; const disp={},tw2={},ls={},ff={},cv={},ct={},fx={filter:0,backdrop:0,mask:0},prefix={};
 const depth=(el)=>{let d=0,ld=0,x=el;while(x&&x!==card){d++; const s=getComputedStyle(x).display; if(/grid|flex/.test(s)) ld++; x=x.parentElement;} return [d,ld];};
 for(const el of all){ const s=getComputedStyle(el); disp[s.display]=(disp[s.display]||0)+1; const w=s.textWrapStyle||s.textWrap; if(w&&w!=='auto'&&w!=='wrap') tw2[w]=(tw2[w]||0)+1; if(s.letterSpacing!=='normal') ls[s.letterSpacing]=(ls[s.letterSpacing]||0)+1; ff[s.fontFamily]=(ff[s.fontFamily]||0)+1; if(s.contentVisibility!=='visible') cv[s.contentVisibility]=(cv[s.contentVisibility]||0)+1; if(s.contain!=='none') ct[s.contain]=(ct[s.contain]||0)+1; if(s.filter!=='none') fx.filter++; if((s.backdropFilter||s.webkitBackdropFilter||'none')!=='none') fx.backdrop++; if((s.maskImage||s.webkitMaskImage||'none')!=='none') fx.mask++;
   const [d,ld]=depth(el); if(d>maxDepth) maxDepth=d; if(ld>maxLayoutDepth) maxLayoutDepth=ld;
   for(const c of el.classList){ const p=c.replace(/__[A-Za-z0-9_-]{5,}$/,''); prefix[p]=(prefix[p]||0)+1; } }
 const imgs=[...card.querySelectorAll('img')]; r.imgs=imgs.length; r.imgsNoDims=imgs.filter(i=>!i.getAttribute('width')||!i.getAttribute('height')).length; r.svgs=card.querySelectorAll('svg').length; r.details=card.querySelectorAll('details').length;
 r.maxDepth=maxDepth; r.maxGridFlexNesting=maxLayoutDepth; r.display=disp; r.textWrap=tw2; r.letterSpacing=ls; r.fontFamily=ff; r.contentVisibility=cv; r.contain=ct; r.fx=fx;
 r.topClasses=Object.entries(prefix).sort((a,b)=>b[1]-a[1]).slice(0,40);
 r.fonts=[...document.fonts].map(f=>({family:f.family,status:f.status,display:f.display,unicodeRange:f.unicodeRange.slice(0,40)}));
 r.preloads=[...document.querySelectorAll('link[rel=preload][as=font]')].map(l=>l.href.split('/').pop());
 r.sections=[...card.children].map(ch=>({tag:ch.tagName,cls:String(ch.className).slice(0,80),nodes:ch.querySelectorAll('*').length,h:Math.round(ch.getBoundingClientRect().height)}));
 r.text=card.innerText; return r; })()`;
module.exports={run,V,connect,fillNoSubmit,SUBMIT,DECREE_VISIBLE,PROBE,sleep,GEO_INIT};
if(require.main===module){(async()=>{
  const mode=process.argv[2]||'probe';
  if(mode==='probe'){ const c=await connect(9950); try{ await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true}); await c.send('Page.navigate',{url:BASE+'/ghost-asura'}); await c.waitFor(`document.readyState==='complete' && !!document.querySelector('button')`); await sleep(1000); await fillNoSubmit(c.evalJs); await sleep(500); await c.evalJs(SUBMIT); await c.waitFor(DECREE_VISIBLE); await sleep(3000); const p=await c.evalJs(PROBE); fs.writeFileSync(path.join(OUT,'PROBE-text.txt'),p.text); delete p.text; fs.writeFileSync(path.join(OUT,'PROBE-dom.json'),JSON.stringify(p,null,2)); console.log(JSON.stringify(p).slice(0,6000)); } finally{ c.ws.close(); c.edge.kill(); } return; }
  const variants=(process.argv[3]||'A').split(','); const cpus=(process.argv[4]||'4').split(',').map(Number); const runs=+(process.argv[5]||3);
  const hides=process.env.HIDES?JSON.parse(process.env.HIDES):[null];
  for(let r=1;r<=runs;r++) for(const cpu of cpus) for(const v of variants) for(const h of hides) await run(v,cpu,r,h);
  console.log('DONE');
})().catch(e=>{console.error(e);process.exit(1)});}
