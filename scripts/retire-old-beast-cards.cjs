// One-time owner-authorized removal of legacy card art. No game rules changed.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const write = (p,s) => fs.writeFileSync(path.join(root,p),s);
const data = JSON.parse(read('data/star-beasts.json'));
const redirects = new Map();
for (const item of data.items) {
  const n=String(item.id).padStart(2,'0');
  redirects.set(item.image,`/beast-game/front/adult-${n}.v2.webp`);
  redirects.set(item.youngDivineImage,`/beast-game/front/young-${n}.v2.webp`);
  redirects.set(`/star-beasts/${item.season}/${n}-${item.slug}.png`,`/beast-game/front/adult-${n}.v2.webp`);
}
for(const g of ['qinglong','baihu','zhuque','xuanwu']) redirects.set(`/star-beasts/four-guardians/${g}.png`,`/beast-game/front/guardian-${g}.v2.webp`);
const legacyRoot=path.join(root,'public/star-beasts');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const oldFiles=walk(legacyRoot);
for(const file of oldFiles){
 const url='/'+path.relative(path.join(root,'public'),file).split(path.sep).join('/');
 if(!redirects.has(url)){
  const m=path.basename(file).match(/^(\d{2})-/);
  if(!m) throw Error('Unclassified legacy file: '+url);
  redirects.set(url,`/beast-game/front/${path.basename(file).includes('young')?'young':'adult'}-${m[1]}.v2.webp`);
 }
}
// Validate every replacement before changing or deleting anything.
for(const dest of redirects.values()) if(!fs.existsSync(path.join(root,'public',dest))) throw Error('Missing new art '+dest);
let count=0;
for(const name of fs.readdirSync(path.join(root,'cards/beasts'))){
 if(!name.endsWith('.ts'))continue;
 const p='cards/beasts/'+name;let s=read(p);
 const id=s.match(/id: '(beast_[^']+)'/);if(!id)continue;
 const suffix=id[1].startsWith('beast_g_')?'guardian-'+id[1].slice(8):(id[1].startsWith('beast_y')?'young-':'adult-')+id[1].slice(-2);
 s=s.replace(/high: '[^']*'/,`high: '/beast-game/front/${suffix}.v2.webp'`);write(p,s);count++;
}
if(count!==60)throw Error('Expected 60 cards, got '+count);
// Keep data layout and all non-art fields byte-for-byte unchanged.
let source=read('data/star-beasts.json');
for(const [old,dest] of redirects)source=source.split('"'+old+'"').join('"'+dest+'"');
write('data/star-beasts.json',source);
let gen=read('scripts/gen-beast-cards.mjs');
gen=gen.replace('high: `/star-beasts/four-guardians/${guardian.slug}.png`','high: `/beast-game/front/guardian-${guardian.slug}.v2.webp`');
write('scripts/gen-beast-cards.mjs',gen);
write('data/retired-beast-art.json',JSON.stringify([...redirects].map(([source,destination])=>({source,destination,permanent:false})),null,2)+'\n');
for(const file of oldFiles){
 if(!file.startsWith(legacyRoot+path.sep))throw Error('Outside approved legacy folder');
 fs.unlinkSync(file);
}
console.log(JSON.stringify({cards:count,removedFiles:oldFiles.length,retiredUrls:redirects.size}));
