const { astro } = require('iztro');
const cases = [
  ['1974-6-28', 2, '男'],   // 用戶提到的案例 寅時
  ['1990-8-16', 2, '男'],
  ['1985-1-1', 0, '女'],    // 子時
  ['2000-2-29', 6, '男'],   // 閏年 午時
  ['1968-12-31', 11, '女'], // 亥時 跨年末
  ['1995-7-15', 5, '女'],   // 巳時
  ['1979-3-5', 8, '男'],    // 申時
  ['2003-11-23', 9, '女'],  // 酉時
  ['1988-5-9', 3, '男'],    // 卯時
  ['1992-10-2', 7, '女'],   // 未時
  ['1960-4-18', 1, '男'],   // 丑時
  ['2010-9-30', 10, '女'],  // 戌時
];
const out = cases.map(([d, ti, g]) => {
  const c = astro.astrolabeBySolarDate(d, ti, g, true, 'zh-TW');
  const norm = (n) => ({'命宮':'命宮','兄弟':'兄弟宮','夫妻':'夫妻宮','子女':'子女宮','財帛':'財帛宮','疾厄':'疾厄宮','遷移':'遷移宮','僕役':'交友宮','交友':'交友宮','官祿':'官祿宮','田宅':'田宅宮','福德':'福德宮','父母':'父母宮'}[n] || n);
  const life = c.palaces.find(p => norm(p.name) === '命宮');
  const positions = {};
  c.palaces.forEach(p => p.majorStars.forEach(s => { positions[s.name] = norm(p.name); }));
  return { birthDate: d, timeIndex: ti, gender: g === '男' ? 'male' : 'female',
    lifePalaceBranch: c.earthlyBranchOfSoulPalace,
    lifePalaceStars: life.majorStars.map(s => s.name),
    majorStarPositions: positions };
});
console.log(JSON.stringify(out, null, 2));
