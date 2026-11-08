const { chromium } = require('../../scripts/card-preview/node_modules/playwright-core');
const fs=require('fs'),path=require('path');
const T='_tmp_beast_retouch', OUT=T+'/dual-gate/shots'; fs.mkdirSync(OUT,{recursive:true});
const Y=['11','12','13','14','15','16','17','18','19','20'].map(i=>'young-'+i), A=['13','14','15','16','17','18','19','20','21','22'].map(i=>'adult-'+i);
const YT=['young-11','young-12','young-13','young-16','young-20'], AT=['adult-18','adult-19','adult-20'];
function mapper(group,mode){ return u=>{const m=u.match(/\/beast-game\/(thumb|front)\/((?:young|adult)-\d\d)(\.v2(?:-480)?\.webp)/); if(!m) return null;
  if(group==='young'&&mode==='old'&&Y.includes(m[2])) return path.join(T,'_backup-retouch-20261108',m[1],m[2]+m[3]);
  if(group==='adult'&&mode==='new'&&AT.includes(m[2])) return m[1]==='front'?path.join(T,'candidates',m[2]+'.cand.webp'):path.join(T,'candidates','thumb',m[2]+m[3]);
  return null;};}
async function openTab(p,group){await p.goto('http://localhost:3010/star-beasts',{waitUntil:'networkidle',timeout:90000});
  await p.getByRole('button',{name:group==='young'?/神獸幼子/:/本體神獸/}).first().click();await p.waitForTimeout(800);
  for(let i=0;i<15;i++){await p.mouse.wheel(0,900);await p.waitForTimeout(120);} await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(400);}
(async()=>{const b=await chromium.launch();const log=[];
 for(const group of ['young','adult']) for(const mode of ['old','new']) for(const W of [360,390,1280]){
  const ctx=await b.newContext({viewport:{width:W,height:W>=1280?900:844},deviceScaleFactor:2});const p=await ctx.newPage();const served=[],bad=[];
  p.on('response',r=>{if(/beast-game/.test(r.url())&&r.status()>=400)bad.push(r.status()+' '+r.url())});
  const mf=mapper(group,mode); await p.route(/\/beast-game\/(thumb|front)\//,async rt=>{const f=mf(rt.request().url());if(f){served.push(path.basename(f));await rt.fulfill({path:f,contentType:'image/webp'});}else await rt.continue();});
  await openTab(p,group);
  const ov=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth}));
  for(const card of (group==='young'?Y:A)){
   const img=p.locator(`img[src*="${card}."]`).first(); const btn=img.locator('xpath=ancestor::button[1]');
   if(!(await btn.count())){log.push(`${group} ${mode} ${W} ${card} NO-CARD`);continue;}
   await btn.scrollIntoViewIfNeeded();await p.waitForTimeout(300);
   const st=await img.evaluate(e=>({nat:e.naturalWidth,ok:e.complete&&e.naturalWidth>0,w:e.clientWidth,h:e.clientHeight,fit:getComputedStyle(e).objectFit,src:e.currentSrc.split('/').pop()}));
   await btn.screenshot({path:`${OUT}/${mode}-${W}-${card}.png`});
   log.push(`${group} ${mode} ${W} ${card} ${JSON.stringify(st)}`);
   if((group==='young'?YT:AT).includes(card)){await btn.click();await p.waitForTimeout(900);await p.screenshot({path:`${OUT}/${mode}-${W}-${card}-detail.png`});
     await p.keyboard.press('Escape');const c=p.getByRole('button',{name:/關閉/}).first();if(await c.count())await c.click().catch(()=>{});await p.waitForTimeout(400);}
  }
  log.push(`${group} ${mode} ${W} overflowX=${ov.sw>ov.iw} (${ov.sw}/${ov.iw}) served=${[...new Set(served)].length}:${[...new Set(served)].join(',')} httpErr=${bad.length}`);await ctx.close();}
 // CPU-throttled smoothness, new state only
 for(const group of ['young','adult']) for(const W of [360,390]) for(const rate of [4,6]){
  const ctx=await b.newContext({viewport:{width:W,height:844},deviceScaleFactor:2});const p=await ctx.newPage();
  const mf=mapper(group,'new'); await p.route(/\/beast-game\/(thumb|front)\//,async rt=>{const f=mf(rt.request().url());if(f)await rt.fulfill({path:f,contentType:'image/webp'});else await rt.continue();});
  await openTab(p,group);
  const cdp=await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  await p.evaluate(()=>{window.__lt=[];window.__fr=[];new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt.push(e.duration)}).observe({type:'longtask'});let last=performance.now();const f=t=>{window.__fr.push(t-last);last=t;if(!window.__stop)requestAnimationFrame(f)};requestAnimationFrame(f);});
  const t0=Date.now();
  for(let i=0;i<12;i++){await p.mouse.wheel(0,500);await p.waitForTimeout(250);}
  const card=(group==='young'?'young-13':'adult-20'); const btn=p.locator(`img[src*="${card}."]`).first().locator('xpath=ancestor::button[1]');
  await btn.scrollIntoViewIfNeeded(); await btn.click(); await p.waitForTimeout(1500); await p.keyboard.press('Escape'); const c=p.getByRole('button',{name:/關閉/}).first();if(await c.count())await c.click().catch(()=>{}); await p.waitForTimeout(1000);
  const r=await p.evaluate(()=>{window.__stop=1;const f=window.__fr.slice(2).sort((a,b)=>a-b);const q=x=>f[Math.min(f.length-1,Math.floor(x*f.length))];return {frames:f.length,p50:+q(.5).toFixed(1),p95:+q(.95).toFixed(1),max:+f[f.length-1].toFixed(1),longTasks:window.__lt.length,longMax:+(Math.max(0,...window.__lt)).toFixed(0)}});
  log.push(`PERF ${group} ${W} cpu${rate}x ${JSON.stringify(r)} wall=${Date.now()-t0}ms`); await ctx.close();}
 fs.writeFileSync(T+'/dual-gate/site.log',log.join('\n'));console.log(log.join('\n'));await b.close();})();

