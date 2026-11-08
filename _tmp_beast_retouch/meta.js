const sharp=require('sharp');const fs=require('fs');
const list=process.argv.slice(2);
(async()=>{for(const f of list){try{const m=await sharp(f).metadata();console.log(f,m.width+'x'+m.height,m.hasAlpha?'alpha':'')}catch(e){console.log(f,'ERR',e.message)}}})();
