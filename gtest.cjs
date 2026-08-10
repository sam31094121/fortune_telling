const { astro } = require('iztro');
try {
  const a = astro.bySolar('1990-8-16', 2, 'male', true, 'zh-TW');
  const life = a.palaces.find(p=>p.name.includes('命'));
  console.log("gender='male' OK | 命宮:", life.earthlyBranch, life.majorStars.map(s=>s.name).join(','));
} catch(e) { console.log("gender='male' FAILED:", e.message); }
const b = astro.bySolar('1990-8-16', 2, '男', true, 'zh-TW');
const lb = b.palaces.find(p=>p.name.includes('命'));
console.log("gender='男'  OK | 命宮:", lb.earthlyBranch, lb.majorStars.map(s=>s.name).join(','));
