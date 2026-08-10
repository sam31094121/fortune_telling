const { ziwei } = require('@ziweijs/core');
const { astro } = require('iztro');
const d = new Date(1990, 7, 16, 4, 0, 0); // 1990-08-16 寅時(04:00)
const a = ziwei.bySolar({ name:'t', gender:'male', date:d, language:'zh-Hant', timezoneOffset:8 });
console.log('=== @ziweijs/core ===');
a.palaces.forEach(p => console.log(`${p.key} | ${p.name} | ${p.stem||''}${p.branch} | major=[${p.majorStars.map(s=>s.name).join(',')}]`));
const b = astro.astrolabeBySolarDate('1990-8-16', 2, '男', true, 'zh-TW');
console.log('=== iztro ===');
b.palaces.forEach(p => console.log(`${p.index} | ${p.name} | ${p.heavenlyStem}${p.earthlyBranch} | major=[${p.majorStars.map(s=>s.name).join(',')}]`));
