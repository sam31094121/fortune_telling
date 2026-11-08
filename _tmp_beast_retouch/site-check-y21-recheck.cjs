// site-check-y21-recheck.cjs — young-21 only: old (backup routed) vs new (live public); 360/390/1280; CPU 4x/6x perf; flicker frames.
const { chromium } = require('../scripts/card-preview/node_modules/playwright-core');
const fs=require('fs'),path=require('path');
const BK='_tmp_beast_retouch/_backup-retouch-20261108', OUT='_tmp_beast_retouch/site-check-recheck/y21'; fs.mkdirSync(OUT,{recursive:true});
const oldFile=u=>{const m=u.match(/\/beast-game\/(thumb|front)\/(young-21)(\.v2(?:-480)?\.webp)/);return m?path.join(BK,m[1],m[2]+m[3]):null;};
const contrastSrc='('+(()=>{const lum=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]};
  const bgOf=e=>{while(e){const s=getComputedStyle(e);const m=s.backgroundColor.match(/[\d.]+/g);if(m&&(m.length<4||+m[3]>0.6))return s.backgroundColor;e=e.parentElement}return 'rgb(0,0,0)'};
  return el=>{const out=[];el.querySelectorAll('*').forEach(n=>{if(n.childElementCount===0&&n.textContent.trim()&&n.offsetWidth){const c=getComputedStyle(n).color,b=bgOf(n);const L1=lum(c),L2=lum(b);out.push({t:n.textContent.trim().slice(0,10),ratio:+((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)).toFixed(2),c,b})}});return out}}).toString()+')()';
(async()=>{const b=await chromium.launch();const log=[],perf=[],flick=[];let contrast=null;
const open=async(p)=>{await p.goto('http://localhost:3010/star-beasts',{waitUntil:'networkidle',timeout:60000});await p.getByRole('button',{name:/神獸幼子/}).first().click();await p.waitForTimeout(800);};
const card=p=>p.locator('img[src*="young-21."]').first().locator('xpath=ancestor::button[1]');
const closeDlg=async p=>{await p.keyboard.press('Escape');const c=p.getByRole('button',{name:/關閉/}).first();if(await c.count()) await c.click().catch(()=>{});await p.waitForTimeout(400);};
for(const mode of ['old','new']) for(const W of [360,390,1280]){
  const ctx=await b.newContext({viewport:{width:W,height:900},deviceScaleFactor:2});const p=await ctx.newPage();const bad=[],served=[];
  p.on('response',r=>{if(/beast-game/.test(r.url())&&r.status()>=400)bad.push(r.url())});
  if(mode==='old') await p.route(/\/beast-game\/(thumb|front)\/young-21\./,async rt=>{const f=oldFile(rt.request().url());served.push(path.basename(f));await rt.fulfill({path:f,contentType:'image/webp'});});
  await open(p);
  const hOverflow=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  const btn=card(p);await btn.scrollIntoViewIfNeeded();await p.waitForTimeout(400);
  const img=p.locator('img[src*="young-21."]').first();
  const st=await img.evaluate(e=>({nat:e.naturalWidth,complete:e.complete,w:e.clientWidth,h:e.clientHeight,src:e.currentSrc.split('/').pop()}));
  await btn.screenshot({path:`${OUT}/y21-${mode}-${W}-card.png`});
  if(mode==='new'&&W===390) contrast=await btn.evaluate((el,src)=>eval(src)(el),contrastSrc);
  // flicker: frames while opening detail
  const fr=[];const t0=Date.now();await btn.click();
  for(let i=0;i<10;i++){fr.push(await p.screenshot({type:'png'}));}
  const dt=Date.now()-t0;
  fr.forEach((buf,i)=>fs.writeFileSync(`${OUT}/flick-${mode}-${W}-${String(i).padStart(2,'0')}.png`,buf));
  flick.push({mode,W,frames:fr.length,ms:dt});
  await p.waitForTimeout(600);await p.screenshot({path:`${OUT}/y21-${mode}-${W}-detail.png`});
  log.push(`${mode} ${W} loaded=${st.complete&&st.nat>0} src=${st.src} img=${st.w}x${st.h} hOverflow=${hOverflow} httpErr=${bad.length} served=${[...new Set(served)].join(',')}`);
  await closeDlg(p);
  if(W!==1280) for(const rate of [4,6]){
    const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
    await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(300);
    await p.evaluate(()=>{window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(e.duration))).observe({type:'longtask'});window.__fr=[];window.__run=true;let last=performance.now();const f=t=>{window.__fr.push(t-last);last=t;if(window.__run)requestAnimationFrame(f)};requestAnimationFrame(f);});
    for(let i=0;i<12;i++){await p.mouse.wheel(0,400);await p.waitForTimeout(120);}
    const c2=card(p);await c2.scrollIntoViewIfNeeded();await p.waitForTimeout(300);await c2.click();await p.waitForTimeout(1500);await closeDlg(p);
    const r=await p.evaluate(()=>{window.__run=false;const f=[...window.__fr].slice(1).sort((a,b)=>a-b);return {longTasks:window.__lt.length,over50:window.__lt.filter(d=>d>50).length,maxLT:Math.round(Math.max(0,...window.__lt)),frames:f.length,p95:+(f[Math.floor(f.length*0.95)]||0).toFixed(1),maxFrame:Math.round(f[f.length-1]||0)}});
    perf.push({mode,W,cpu:rate+'x',...r});await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  }
  await ctx.close();}
fs.writeFileSync(`${OUT}/log.txt`,log.join('\n'));fs.writeFileSync(`${OUT}/perf.json`,JSON.stringify(perf,null,1));fs.writeFileSync(`${OUT}/flicker.json`,JSON.stringify(flick,null,1));fs.writeFileSync(`${OUT}/contrast.json`,JSON.stringify(contrast,null,1));
console.log(log.join('\n'));console.log(JSON.stringify(perf));console.log(JSON.stringify(flick));await b.close();})();
