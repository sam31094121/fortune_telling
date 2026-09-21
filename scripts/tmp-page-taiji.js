const fs=require('fs');
const page=fs.readFileSync('app/page.tsx','utf8');
for (const n of ['TaijiStandaloneCard','UnifiedTaijiCore','TaijiSystem','TaijiWebGL']) {
  const re=new RegExp(n,'g');
  const m=[...page.matchAll(re)];
  console.log(n, m.length);
}
const i=page.indexOf('TaijiStandaloneCard');
console.log(page.slice(Math.max(0,i-200), i+400));
