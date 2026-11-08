const { chromium } = require('../scripts/card-preview/node_modules/playwright-core');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const req=new Set();
p.on('request',r=>{const u=r.url();if(/beast-game\/(front|thumb)\/young/.test(u))req.add(u.replace('http://localhost:3010',''))});
await p.goto('http://localhost:3010/star-beasts',{waitUntil:'networkidle',timeout:60000});
await p.getByRole('button',{name:/神獸幼子/}).first().click(); await p.waitForTimeout(1500);
for(let i=0;i<25;i++){await p.mouse.wheel(0,1200);await p.waitForTimeout(200);} await p.waitForTimeout(1500);
console.log([...req].sort().join('\n'));
const info=await p.$$eval('img',els=>els.filter(e=>/young-(05|06|10)/.test(e.currentSrc)).map(e=>({src:e.currentSrc,w:e.clientWidth,h:e.clientHeight,nat:e.naturalWidth})));console.log(JSON.stringify(info));
await b.close();})();
