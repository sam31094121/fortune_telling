const { chromium } = require('../scripts/card-preview/node_modules/playwright-core');
const fs=require('fs'),path=require('path');
const C='_tmp_beast_retouch/candidates', OUT='_tmp_beast_retouch/site-check-11-20'; fs.mkdirSync(OUT,{recursive:true});
const TOUCHED=['young-11','young-12','young-13','young-16','young-20'];
const mapFile=u=>{const m=u.match(/\/beast-game\/(thumb|front)\/(young-\d\d)(\.v2(?:-480)?\.webp)/);if(!m||!TOUCHED.includes(m[2]))return null;return m[1]==='front'?path.join(C,m[2]+'.cand.webp'):path.join(C,'thumb',m[2]+m[3]);};
(async()=>{const b=await chromium.launch();const log=[];
for(const mode of ['old','new']) for(const W of [360,390,768]){
  const ctx=await b.newContext({viewport:{width:W,height:900},deviceScaleFactor:2});const p=await ctx.newPage();const served=[];const bad=[];
  p.on('response',r=>{if(/beast-game/.test(r.url())&&r.status()>=400)bad.push(r.status()+' '+r.url())});
  if(mode==='new') await p.route(/\/beast-game\/(thumb|front)\/young-(11|12|13|16|20)\./,async rt=>{const f=mapFile(rt.request().url());if(f){served.push(path.basename(f));await rt.fulfill({path:f,contentType:'image/webp'});}else await rt.continue();});
  await p.goto('http://localhost:3010/star-beasts',{waitUntil:'networkidle',timeout:60000});
  await p.getByRole('button',{name:/神獸幼子/}).first().click();await p.waitForTimeout(800);
  for(let i=0;i<20;i++){await p.mouse.wheel(0,900);await p.waitForTimeout(150);} await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(500);
  for(const id of ['11','12','13','14','15','16','17','18','19','20']){
    const img=p.locator(`img[src*="young-${id}."]`).first(); const btn=img.locator('xpath=ancestor::button[1]');
    if(!(await btn.count())){log.push(`${mode} ${W} y${id} NO-CARD`);continue;}
    await btn.scrollIntoViewIfNeeded();await p.waitForTimeout(400);
    const st=await img.evaluate(e=>({nat:e.naturalWidth,complete:e.complete,w:e.clientWidth,h:e.clientHeight,fit:getComputedStyle(e).objectFit}));
    const bb=await btn.boundingBox();
    if(['11','12','13','16','20'].includes(id)||W===390) await btn.screenshot({path:`${OUT}/${mode}-${W}-young-${id}.png`});
    log.push(`${mode} ${W} y${id} loaded=${st.complete&&st.nat>0} nat=${st.nat} img=${st.w}x${st.h} fit=${st.fit} card=${Math.round(bb.width)}x${Math.round(bb.height)}`);
    if(['11','12','13','16','20'].includes(id)){await btn.click();await p.waitForTimeout(900);const dlg=p.locator('[role=dialog], .fixed').last();
      await p.screenshot({path:`${OUT}/${mode}-${W}-young-${id}-detail.png`});
      const big=await p.$$eval(`img[src*="young-${id}."]`,els=>els.map(e=>({src:e.currentSrc.split('/').pop(),nat:e.naturalWidth,w:e.clientWidth,h:e.clientHeight})));log.push(`  detail imgs ${JSON.stringify(big)}`);
      await p.keyboard.press('Escape');const close=p.getByRole('button',{name:/關閉/}).first();if(await close.count()) await close.click().catch(()=>{});await p.waitForTimeout(500);}
  }
  await p.screenshot({path:`${OUT}/${mode}-${W}-grid-top.png`});
  log.push(`${mode} ${W} served=${[...new Set(served)].join(',')} http-errors=${bad.length}`);await ctx.close();}
fs.writeFileSync(`${OUT}/site-check.log`,log.join('\n'));console.log(log.join('\n'));await b.close();})();

