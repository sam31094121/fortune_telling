const fs = require('fs');
const page = fs.readFileSync('app/page.tsx', 'utf8');
// Extract region around quest/receipt/sticky/taiji
const q = page.indexOf('第三段：手機首屏');
console.log(page.slice(q - 80, q + 1200));
console.log('---SHOW MORE---');
const sm = page.match(/const \[showMoreFeatures[\s\S]{0,120}/);
console.log(sm && sm[0]);
// LINE in quest
const quest = fs.readFileSync('components/TodayDirectionQuest.tsx', 'utf8');
let i = 0;
while ((i = quest.toLowerCase().indexOf('line', i)) !== -1) {
  console.log('line@', i, JSON.stringify(quest.slice(Math.max(0,i-30), i+50)));
  i += 4;
}
