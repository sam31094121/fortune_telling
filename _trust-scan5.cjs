const fs = require('fs');
const path = require('path');
const root = 'C:/Users/DRAGON/Desktop/命理';
const page = fs.readFileSync(path.join(root,'app/page.tsx'),'utf8');
console.log('TarotEntryCard import', /TarotEntryCard/.test(page));
const i = page.indexOf('<TarotEntryCard');
console.log('usage', i, i>=0?page.slice(i, i+400):'none');
const j = page.indexOf('href="/insight"');
console.log('insight', j, j>=0?page.slice(j, j+500).replace(/\s+/g,' ').slice(0,400):'none');
const tarotPath = path.join(root,'components/tarot/TarotEntryCard.tsx');
const alt = path.join(root,'app/tarot/components/TarotEntryCard.tsx');
for (const p of [tarotPath, alt]) {
  console.log(p, fs.existsSync(p));
  if (fs.existsSync(p)) {
    const t = fs.readFileSync(p,'utf8');
    console.log(t.slice(0,800));
    console.log('---cta---');
    const c = t.indexOf('cta');
    console.log(t.slice(Math.max(0,t.indexOf('return')), Math.max(0,t.indexOf('return'))+1500).slice(0,1500));
  }
}
