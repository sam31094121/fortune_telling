const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const paths=require('../data/retired-beast-art.json');
let cards=0;
for(const file of fs.readdirSync('cards/beasts').filter(f=>f.endsWith('.ts'))){
 const p='cards/beasts/'+file,s=fs.readFileSync(p,'utf8');
 if(!/id: 'beast_/.test(s))continue;
 cards++;
 const high=s.match(/high: '([^']+)'/)[1];
 assert.match(high,/^\/beast-game\/front\/(adult-\d\d|young-\d\d|guardian-\w+)\.v2\.webp$/);
 assert.ok(fs.existsSync('public'+high),high);
 const before=cp.execFileSync('git',['show','HEAD:'+p],{encoding:'utf8'});
 assert.equal(s.replace(/high: '[^']*'/,"high: ''"),before.replace(/high: '[^']*'/,"high: ''"),'Only high art may change: '+p);
}
assert.equal(cards,60);
for(const r of paths){assert.equal(fs.existsSync('public'+r.source),false,r.source);assert.ok(fs.existsSync('public'+r.destination));}
const previous=JSON.parse(cp.execFileSync('git',['show','HEAD:data/star-beasts.json'],{encoding:'utf8'}));
const current=require('../data/star-beasts.json');
for(const dataset of [previous,current])for(const item of dataset.items){delete item.image;delete item.youngDivineImage;}
assert.deepEqual(current,previous,'No non-art data changes');
console.log(`PASS ${cards} current cards, ${paths.length} retired URLs, all non-art card/data values unchanged`);
