const { astro } = require('iztro');
const SH = ['子(23-01)','丑(01-03)','寅(03-05)','卯(05-07)','辰(07-09)','巳(09-11)','午(11-13)','未(13-15)','申(15-17)','酉(17-19)','戌(19-21)','亥(21-23)'];
console.log('林佩君 · 國曆 1979-09-02 · 女');
console.log('時辰       命宮地支  命宮主星');
console.log('----------------------------------------');
for (let ti = 0; ti < 12; ti++) {
  const c = astro.bySolar('1979-9-2', ti, 'female', true, 'zh-TW');
  const life = c.palaces.find(p => p.name.trim() === '命宮');
  console.log(SH[ti].padEnd(12), c.earthlyBranchOfSoulPalace.padEnd(8), life.majorStars.map(s=>s.name+'('+s.brightness+')').join('、') || '（無主星，借對宮）');
}
