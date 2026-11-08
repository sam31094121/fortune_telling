const d=require('./diag-layout.cjs'); const fs=require('fs'); const path=require('path');
(async()=>{ const c=await d.connect(9960); try{ await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
 await c.send('Page.navigate',{url:'http://localhost:3010/ghost-asura'}); await c.waitFor(`document.readyState==='complete' && !!document.querySelector('button')`); await d.sleep(1000); await d.fillNoSubmit(c.evalJs); await d.sleep(500); await c.evalJs(d.SUBMIT); await c.waitFor(d.DECREE_VISIBLE); await d.sleep(3000);
 const r=await c.evalJs(`(() => { const card=document.querySelector('[class*="GhostAsuraCard_card"]'); const all=[card,...card.querySelectorAll('*')]; const combos={}, sizes={}, weights={}; let svgEls=card.querySelectorAll('svg *').length;
  for(const el of all){ const s=getComputedStyle(el); const k=s.fontFamily.split(',')[0]+'|'+s.fontSize+'|'+s.fontWeight+'|'+s.fontStyle; combos[k]=(combos[k]||0)+1; sizes[s.fontSize]=1; weights[s.fontWeight]=1; }
  const kids=[...card.children].map(ch=>({cls:String(ch.className).replace(/__\\w+/g,'').slice(0,90),nodes:ch.querySelectorAll('*').length,chars:(ch.innerText||'').length,h:Math.round(ch.getBoundingClientRect().height)}));
  const big=[...card.querySelectorAll('*')].filter(e=>e.children.length>3).map(e=>({cls:String(e.className).replace(/__\\w+/g,'').slice(0,60),nodes:e.querySelectorAll('*').length,chars:(e.innerText||'').length})).sort((a,b)=>b.nodes-a.nodes).slice(0,25);
  return {comboCount:Object.keys(combos).length,combos,sizeCount:Object.keys(sizes).length,weights:Object.keys(weights),svgEls,kids,big}; })()`);
 fs.writeFileSync(path.join(__dirname,'PROBE-fonts-sections.json'),JSON.stringify(r,null,2)); console.log(JSON.stringify(r));
 } finally { c.ws.close(); c.edge.kill(); } })();
