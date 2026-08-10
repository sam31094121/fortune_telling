const { astro } = require('iztro');
// 晚子時(12) vs 早子時(0)：同一天 23:30 出生應算晚子時
const early = astro.bySolar('1985-1-1', 0, 'female', true, 'zh-TW');
const late  = astro.bySolar('1985-1-1', 12, 'female', true, 'zh-TW');
console.log('早子時(0) 命宮:', early.earthlyBranchOfSoulPalace, '| 農曆:', early.lunarDate);
console.log('晚子時(12) 命宮:', late.earthlyBranchOfSoulPalace, '| 農曆:', late.lunarDate);
// 農曆入口
const lunar = astro.byLunar('1979-7-11', 2, '女', false, true, 'zh-TW');
console.log('農曆 1979-7-11 寅時 女 → 陽曆:', lunar.solarDate, '| 命宮:', lunar.earthlyBranchOfSoulPalace, lunar.palaces.find(p=>p.name.trim()==='命宮').majorStars.map(s=>s.name).join('、'));
