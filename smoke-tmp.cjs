const { astro } = require('iztro');
// 寅時 = timeIndex 2
const chart = astro.astrolabeBySolarDate('1990-8-16', 2, '男', true, 'zh-TW');
console.log('solarDate:', chart.solarDate, '| time:', chart.time, '| gender:', chart.gender);
console.log('命宮地支:', chart.earthlyBranchOfSoulPalace, '| 身宮地支:', chart.earthlyBranchOfBodyPalace);
console.log('命主:', chart.soul, '| 身主:', chart.body, '| 五行局:', chart.fiveElementsClass);
console.log('--- 十二宮 ---');
chart.palaces.forEach(p => {
  console.log(`${p.index} | ${p.name} | ${p.heavenlyStem}${p.earthlyBranch} | body=${p.isBodyPalace} | major=[${p.majorStars.map(s=>s.name+'('+(s.brightness||'')+')').join(',')}]`);
});
const sur = chart.surroundedPalaces('命宮');
console.log('--- 三方四正(命宮) ---');
console.log('target:', sur.target?.name, '| opposite:', sur.opposite?.name, '| wealth:', sur.wealth?.name, '| career:', sur.career?.name);
