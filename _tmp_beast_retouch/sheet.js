const sharp=require('sharp');
async function sheet(files,cw,ch,cols,out){const rows=Math.ceil(files.length/cols);const comps=[];
for(let i=0;i<files.length;i++){const b=await sharp(files[i]).resize(cw,ch,{fit:'contain',background:'#808080'}).png().toBuffer();comps.push({input:b,left:(i%cols)*cw,top:Math.floor(i/cols)*ch});}
await sharp({create:{width:cols*cw,height:rows*ch,channels:3,background:'#808080'}}).composite(comps).png().toFile(out);}
(async()=>{const f='public/beast-game/front/';const n=[...Array(10)].map((_,i)=>f+'young-'+String(i+1).padStart(2,'0')+'.v2.webp');
await sheet(['baihu','qinglong','zhuque','xuanwu'].map(g=>f+'guardian-'+g+'.v2.webp').concat(n),480,360,4,'_tmp_beast_retouch/sheet-v2.png');
const w='.claude/worktrees/laughing-proskuriakova-25bbfe/public/star-beasts/';const s=['spring/01-jiao-mu-jiao','spring/02-kang-jin-long','spring/03-di-tu-he','spring/04-fang-ri-tu','spring/05-xin-yue-hu','spring/06-wei-huo-hu','spring/07-ji-shui-bao','winter/08-dou-mu-xie','winter/09-niu-jin-niu','winter/10-nu-tu-fu'].map(x=>w+x+'-young-divine.png');
await sheet(s,285,497,5,'_tmp_beast_retouch/sheet-src.png');})();
