// site-check-recheck.cjs — dual-skill recheck (360/390/1280, CPU 4x/6x long tasks, contrast). Copy of site-check.cjs, rewritten; originals untouched.
const { chromium } = require('../scripts/card-preview/node_modules/playwright-core');
const fs=require('fs'),path=require('path');
const C='_tmp_beast_retouch/candidates', OUT='_tmp_beast_retouch/site-check-recheck'; fs.mkdirSync(OUT,{recursive:true});
const SETS=[{tab:/神獸幼子/,prefix:'young',ids:['01','02','03','04','05','06','07','08','09','10','21'],route:[]},
            {tab:/成獸|本體|覺醒/,prefix:'adult',ids:['03','04','05','06','07','08','09','10','11','12'],route:['adult-03','adult-09','adult-10']}];
const mapFile=(u,route)=>{const m=u.match(/\/beast-game\/(thumb|front)\/((?:young|adult)-\d\d)(\.v2(?:-480)?\.webp)/);if(!m||!route.includes(m[2]))return null;return m[1]==='front'?path.join(C,m[2]+'.cand.webp'):path.join(C,'thumb',m[2]+m[3]);};
const contrastJs=()=>{const lum=c=>{const v=c.match(/\d+(\.\d+)?/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]};
  const bgOf=e=>{while(e){const s=getComputedStyle(e);const m=s.backgroundColor.match(/[\d.]+/g);if(m&&(m.length<4||+m[3]>0.6))return s.backgroundColor;e=e.parentElement}return 'rgb(0,0,0)'};
  return el=>{const out=[];el.querySelectorAll('*').forEach(n=>{if(n.childElementCount===0&&n.textContent.trim()&&n.offsetWidth){const c=getComputedStyle(n).color,b=bgOf(n);const L1=lum(c),L2=lum(b);out.push({t:n.textContent.trim().slice(0,8),ratio:+((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)).toFixed(2),c,b})}});return out}};
(async()=>{const b=await chromium.launch();const log=[];const perf=[];const contrast={};
for(const S of SETS) for(const mode of (S.route.length?['old','new']:['live'])) for(const W of [360,390,1280]){
  const ctx=await b.newContext({viewport:{width:W,height:900},deviceScaleFactor:2});const p=await ctx.newPage();const served=[];const bad=[];
  p.on('response',r=>{if(/beast-game/.test(r.url())&&r.status()>=400)bad.push(r.status()+' '+r.url())});
  if(mode==='new') await p.route(/\/beast-game\/(thumb|front)\/adult-(03|09|10)\./,async rt=>{const f=mapFile(rt.request().url(),S.route);if(f){served.push(path.basename(f));await rt.fulfill({path:f,contentType:'image/webp'});}else await rt.continue();});
  await p.goto('http://localhost:3010/star-beasts',{waitUntil:'networkidle',timeout:60000});
  const tabBtn=p.getByRole('button',{name:S.tab}).first(); if(await tabBtn.count()){await tabBtn.click();} await p.waitForTimeout(800);
  for(let i=0;i<20;i++){await p.mouse.wheel(0,900);await p.waitForTimeout(120);} await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(500);
  const hOverflow=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  for(const id of S.ids){
    const img=p.locator(`img[src*="${S.prefix}-${id}."]`).first(); const btn=img.locator('xpath=ancestor::button[1]');
    if(!(await btn.count())){log.push(`${S.prefix} ${mode} ${W} ${id} NO-CARD`);continue;}
    await btn.scrollIntoViewIfNeeded();await p.waitForTimeout(300);
    const st=await img.evaluate(e=>({nat:e.naturalWidth,complete:e.complete,w:e.clientWidth,h:e.clientHeight,src:e.currentSrc.split('/').pop()}));
    const bb=await btn.boundingBox();
    await btn.screenshot({path:`${OUT}/${S.prefix}-${id}-${mode}-${W}.png`});
    if(W===390&&!contrast[S.prefix+'-'+id]) contrast[S.prefix+'-'+id]=await btn.evaluate((el,src)=>eval(src)(el),'('+contrastJs.toString()+')()');
    await btn.click();await p.waitForTimeout(900);
    await p.screenshot({path:`${OUT}/${S.prefix}-${id}-${mode}-${W}-detail.png`});
    log.push(`${S.prefix} ${mode} ${W} ${id} loaded=${st.complete&&st.nat>0} src=${st.src} img=${st.w}x${st.h} card=${Math.round(bb.width)}x${Math.round(bb.height)} hOverflow=${hOverflow}`);
    await p.keyboard.press('Escape');const close=p.getByRole('button',{name:/關閉/}).first();if(await close.count()) await close.click().catch(()=>{});await p.waitForTimeout(400);
  }
  log.push(`${S.prefix} ${mode} ${W} served=${[...new Set(served)].join(',')} http-errors=${bad.length}`);
  // CPU-throttled smoothness at mobile widths
  if(W!==1280) for(const rate of [4,6]){
    const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
    await p.evaluate(()=>{window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(e.duration))).observe({type:'longtask',buffered:false});window.__fr=[];let last=performance.now();const f=t=>{window.__fr.push(t-last);last=t;if(window.__fr.length<2000)requestAnimationFrame(f)};requestAnimationFrame(f);});
    await p.evaluate(()=>window.scrollTo(0,0));for(let i=0;i<15;i++){await p.mouse.wheel(0,500);await p.waitForTimeout(100);}
    const first=p.locator(`img[src*="${S.prefix}-${S.ids[0]}."]`).first().locator('xpath=ancestor::button[1]');await first.scrollIntoViewIfNeeded();await first.click();await p.waitForTimeout(1200);
    await p.keyboard.press('Escape');const close=p.getByRole('button',{name:/關閉/}).first();if(await close.count()) await close.click().catch(()=>{});await p.waitForTimeout(500);
    const r=await p.evaluate(()=>{const f=[...window.__fr].sort((a,b)=>a-b);return {longTasks:window.__lt.length,over50:window.__lt.filter(d=>d>50).length,maxLT:Math.round(Math.max(0,...window.__lt)),frames:f.length,p95:+(f[Math.floor(f.length*0.95)]||0).toFixed(1),maxFrame:Math.round(f[f.length-1]||0)}});
    perf.push({set:S.prefix,mode,W,cpu:rate+'x',...r});await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  }
  await ctx.close();}
fs.writeFileSync(`${OUT}/site-check.log`,log.join('\n'));fs.writeFileSync(`${OUT}/perf.json`,JSON.stringify(perf,null,1));fs.writeFileSync(`${OUT}/contrast.json`,JSON.stringify(contrast,null,1));
console.log(log.filter(l=>!/loaded=true/.test(l)||/hOverflow=[1-9]/.test(l)).join('\n'));console.log('cards ok:',log.filter(l=>/loaded=true/.test(l)).length);console.log(JSON.stringify(perf));await b.close();})();
