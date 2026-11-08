import sharp from 'sharp'; import fs from 'fs';
const S='_tmp_beast_retouch/dual-gate/shots', O='_tmp_beast_retouch/dual-gate/compare'; fs.mkdirSync(O,{recursive:true});
const cards=[...Array(10)].map((_,i)=>'young-'+(11+i)).concat([...Array(10)].map((_,i)=>'adult-'+(13+i)));
const lab=(t,w)=>Buffer.from(`<svg width="${w}" height="30"><rect width="100%" height="100%" fill="#000"/><text x="6" y="21" font-family="Arial" font-size="16" fill="#fff">${t}</text></svg>`);
async function pair(a,b,out,t){const ma=await sharp(a).metadata(),mb=await sharp(b).metadata();const W=Math.max(ma.width,mb.width),H=Math.max(ma.height,mb.height);
 await sharp({create:{width:W*2+10,height:H+30,channels:3,background:'#222'}}).composite([{input:lab('OLD '+t,W),left:0,top:0},{input:lab('NEW '+t,W),left:W+10,top:0},{input:a,left:0,top:30},{input:b,left:W+10,top:30}]).png().toFile(out);}
for(const c of cards){ for(const W of [360,390,1280]){ const a=`${S}/old-${W}-${c}.png`,b=`${S}/new-${W}-${c}.png`; if(fs.existsSync(a)&&fs.existsSync(b)) await pair(a,b,`${O}/${c}-${W}.png`,`${c} @${W}`); else console.log('MISSING',c,W);
   const da=`${S}/old-${W}-${c}-detail.png`,db=`${S}/new-${W}-${c}-detail.png`; if(fs.existsSync(da)&&fs.existsSync(db)) await pair(da,db,`${O}/${c}-${W}-detail.png`,`${c} detail @${W}`);}}
console.log(fs.readdirSync(O).length);
