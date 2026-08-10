const { astro } = require('iztro');
const KEY = {'命宮':'MING','命':'MING','兄弟':'XIONG_DI','夫妻':'FU_QI','子女':'ZI_NV','財帛':'CAI_BO','疾厄':'JI_E','遷移':'QIAN_YI','僕役':'JIAO_YOU','交友':'JIAO_YOU','官祿':'GUAN_LU','事業':'GUAN_LU','田宅':'TIAN_ZHAI','福德':'FU_DE','父母':'FU_MU'};
const cases = [
  ['1974-6-28',3,'male'],['1990-8-16',3,'male'],['1985-1-1',23,'female'],['2000-2-29',12,'male'],
  ['1968-12-31',21,'female'],['1995-7-15',10,'female'],['1979-3-5',16,'male'],['2003-11-23',18,'female'],
  ['1988-5-9',6,'male'],['1992-10-2',14,'female'],['1960-4-18',2,'male'],['2010-9-30',20,'female'],
];
const h2i = h => (h===23||h===0)?0:h<3?1:h<5?2:h<7?3:h<9?4:h<11?5:h<13?6:h<15?7:h<17?8:h<19?9:h<21?10:11;
const out = cases.map(([d,hr,g]) => {
  const c = astro.bySolar(d, h2i(hr), g, true, 'zh-TW');
  const life = c.palaces.find(p => KEY[p.name.trim()] === 'MING');
  const pos = {};
  c.palaces.forEach(p => p.majorStars.forEach(s => { pos[s.name] = KEY[p.name.trim()]; }));
  return { birthDate:d, birthHour:hr, gender:g, lifePalaceBranch:c.earthlyBranchOfSoulPalace,
    lifePalaceStars: life.majorStars.map(s=>s.name), majorStarPositions: pos };
});
console.log(JSON.stringify(out));
