/**
 * 第一層｜紫微斗數排盤核心 回歸測試（唯一入口 createZiweiCore）
 *
 * 鎖定：命宮 + 十二宮 + 十四主星 + 三方四正。
 * 只要有一顆主星錯宮，測試直接 FAIL。
 * 含客戶實證盤（林佩君 1979-9-2 寅時 女：命宮庚午破軍、遷移廉貞天相）— reference test，非 hard-code。
 *
 * 執行：npm run test:ziwei
 */

import {
  createZiweiCore,
  hourToTimeIndex,
  MAJOR_STARS,
  type ZiweiPalaceKey,
} from '../lib/ziwei/engine';

type Fixture = {
  birthDate: string;
  birthHour: number;
  gender: 'male' | 'female';
  lifePalaceBranch: string;
  lifePalaceStars: string[];
  majorStarPositions: Record<string, ZiweiPalaceKey>;
};

const FIXTURES: Fixture[] = [
  {"birthDate":"1979-9-2","birthHour":3,"gender":"female","lifePalaceBranch":"午","lifePalaceStars":["破軍"],"majorStarPositions":{"七殺":"CAI_BO","天同":"ZI_NV","武曲":"FU_QI","太陽":"XIONG_DI","破軍":"MING","天機":"FU_MU","紫微":"FU_DE","天府":"FU_DE","太陰":"TIAN_ZHAI","貪狼":"GUAN_LU","巨門":"JIAO_YOU","廉貞":"QIAN_YI","天相":"QIAN_YI","天梁":"JI_E"}},
  {"birthDate":"1974-6-28","birthHour":3,"gender":"male","lifePalaceBranch":"辰","lifePalaceStars":["紫微","天相"],"majorStarPositions":{"貪狼":"FU_QI","天機":"XIONG_DI","巨門":"XIONG_DI","紫微":"MING","天相":"MING","天梁":"FU_MU","七殺":"FU_DE","廉貞":"GUAN_LU","破軍":"QIAN_YI","天同":"JI_E","武曲":"CAI_BO","天府":"CAI_BO","太陽":"ZI_NV","太陰":"ZI_NV"}},
  {"birthDate":"1990-8-16","birthHour":3,"gender":"male","lifePalaceBranch":"巳","lifePalaceStars":["天同"],"majorStarPositions":{"廉貞":"ZI_NV","破軍":"XIONG_DI","天同":"MING","武曲":"FU_MU","天府":"FU_MU","太陽":"FU_DE","太陰":"FU_DE","貪狼":"TIAN_ZHAI","天機":"GUAN_LU","巨門":"GUAN_LU","紫微":"JIAO_YOU","天相":"JIAO_YOU","天梁":"QIAN_YI","七殺":"JI_E"}},
  {"birthDate":"1985-1-1","birthHour":23,"gender":"female","lifePalaceBranch":"子","lifePalaceStars":["巨門"],"majorStarPositions":{"紫微":"JI_E","天機":"QIAN_YI","太陽":"GUAN_LU","武曲":"TIAN_ZHAI","天同":"FU_DE","廉貞":"XIONG_DI","天府":"ZI_NV","太陰":"FU_QI","貪狼":"XIONG_DI","巨門":"MING","天相":"FU_MU","天梁":"FU_DE","七殺":"TIAN_ZHAI","破軍":"JI_E"}},
  {"birthDate":"2000-2-29","birthHour":12,"gender":"male","lifePalaceBranch":"申","lifePalaceStars":["天同","天梁"],"majorStarPositions":{"天府":"JI_E","太陰":"CAI_BO","廉貞":"ZI_NV","貪狼":"ZI_NV","巨門":"FU_QI","天相":"XIONG_DI","天同":"MING","天梁":"MING","武曲":"FU_MU","七殺":"FU_MU","太陽":"FU_DE","天機":"GUAN_LU","紫微":"JIAO_YOU","破軍":"JIAO_YOU"}},
  {"birthDate":"1968-12-31","birthHour":21,"gender":"female","lifePalaceBranch":"丑","lifePalaceStars":["太陽","太陰"],"majorStarPositions":{"貪狼":"FU_MU","天機":"FU_DE","巨門":"FU_DE","紫微":"TIAN_ZHAI","天相":"TIAN_ZHAI","天梁":"GUAN_LU","七殺":"JIAO_YOU","廉貞":"JI_E","破軍":"ZI_NV","天同":"FU_QI","武曲":"XIONG_DI","天府":"XIONG_DI","太陽":"MING","太陰":"MING"}},
  {"birthDate":"1995-7-15","birthHour":10,"gender":"female","lifePalaceBranch":"寅","lifePalaceStars":["天同","天梁"],"majorStarPositions":{"天同":"MING","天梁":"MING","武曲":"FU_MU","七殺":"FU_MU","太陽":"FU_DE","天機":"GUAN_LU","紫微":"JIAO_YOU","破軍":"JIAO_YOU","天府":"JI_E","太陰":"CAI_BO","廉貞":"ZI_NV","貪狼":"ZI_NV","巨門":"FU_QI","天相":"XIONG_DI"}},
  {"birthDate":"1979-3-5","birthHour":16,"gender":"male","lifePalaceBranch":"未","lifePalaceStars":["天同","巨門"],"majorStarPositions":{"破軍":"JI_E","廉貞":"ZI_NV","天府":"ZI_NV","太陰":"FU_QI","貪狼":"XIONG_DI","天同":"MING","巨門":"MING","武曲":"FU_MU","天相":"FU_MU","太陽":"FU_DE","天梁":"FU_DE","七殺":"TIAN_ZHAI","天機":"GUAN_LU","紫微":"JIAO_YOU"}},
  {"birthDate":"2003-11-23","birthHour":18,"gender":"female","lifePalaceBranch":"寅","lifePalaceStars":["貪狼"],"majorStarPositions":{"貪狼":"MING","天機":"FU_MU","巨門":"FU_MU","紫微":"FU_DE","天相":"FU_DE","天梁":"TIAN_ZHAI","七殺":"GUAN_LU","廉貞":"QIAN_YI","破軍":"CAI_BO","天同":"ZI_NV","武曲":"FU_QI","天府":"FU_QI","太陽":"XIONG_DI","太陰":"XIONG_DI"}},
  {"birthDate":"1988-5-9","birthHour":6,"gender":"male","lifePalaceBranch":"丑","lifePalaceStars":["天相"],"majorStarPositions":{"天同":"FU_MU","天梁":"FU_MU","武曲":"FU_DE","七殺":"FU_DE","太陽":"TIAN_ZHAI","天機":"JIAO_YOU","紫微":"QIAN_YI","破軍":"QIAN_YI","天府":"CAI_BO","太陰":"ZI_NV","廉貞":"FU_QI","貪狼":"FU_QI","巨門":"XIONG_DI","天相":"MING"}},
  {"birthDate":"1992-10-2","birthHour":14,"gender":"female","lifePalaceBranch":"卯","lifePalaceStars":["太陰"],"majorStarPositions":{"紫微":"XIONG_DI","天府":"XIONG_DI","太陰":"MING","貪狼":"FU_MU","巨門":"FU_DE","廉貞":"TIAN_ZHAI","天相":"TIAN_ZHAI","天梁":"GUAN_LU","七殺":"JIAO_YOU","天同":"QIAN_YI","武曲":"JI_E","太陽":"CAI_BO","破軍":"ZI_NV","天機":"FU_QI"}},
  {"birthDate":"1960-4-18","birthHour":2,"gender":"male","lifePalaceBranch":"卯","lifePalaceStars":["天同"],"majorStarPositions":{"七殺":"XIONG_DI","天同":"MING","武曲":"FU_MU","太陽":"FU_DE","破軍":"TIAN_ZHAI","天機":"GUAN_LU","紫微":"JIAO_YOU","天府":"JIAO_YOU","太陰":"QIAN_YI","貪狼":"JI_E","巨門":"CAI_BO","廉貞":"ZI_NV","天相":"ZI_NV","天梁":"FU_QI"}},
  {"birthDate":"2010-9-30","birthHour":20,"gender":"female","lifePalaceBranch":"亥","lifePalaceStars":["巨門"],"majorStarPositions":{"七殺":"TIAN_ZHAI","天同":"GUAN_LU","武曲":"JIAO_YOU","太陽":"QIAN_YI","破軍":"JI_E","天機":"CAI_BO","紫微":"ZI_NV","天府":"ZI_NV","太陰":"FU_QI","貪狼":"XIONG_DI","巨門":"MING","廉貞":"FU_MU","天相":"FU_MU","天梁":"FU_DE"}},
];

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string) {
  if (ok) passed += 1;
  else { failed += 1; failures.push('FAIL: ' + name + (detail ? ' -> ' + detail : '')); }
}

// 1) 時辰轉換：0=早子、12=晚子，禁止把小時數直接當 index
const HOUR_CASES: Array<[number, number]> = [
  [0,0],[23,12],[1,1],[2,1],[3,2],[4,2],[5,3],[7,4],[9,5],[11,6],[13,7],[15,8],[17,9],[19,10],[21,11],[22,11],
];
for (const [h, expected] of HOUR_CASES) {
  check('hourToTimeIndex(' + h + ')', hourToTimeIndex(h) === expected, 'got ' + hourToTimeIndex(h));
}

// 2) 命盤回歸
for (const fx of FIXTURES) {
  const label = fx.birthDate + ' ' + String(fx.birthHour).padStart(2,'0') + '時 ' + fx.gender;
  const core = createZiweiCore({
    calendarType: 'solar',
    date: fx.birthDate,
    gender: fx.gender === 'male' ? '男' : '女',
    timeIndex: hourToTimeIndex(fx.birthHour),
  });

  // 命宮：依宮名查找（引擎內部已禁 palaces[0] 假設）
  check(label + ' | 命宮 key', core.lifePalace.key === 'MING');
  check(label + ' | 命宮地支', core.lifePalace.earthlyBranch === fx.lifePalaceBranch,
    'got ' + core.lifePalace.earthlyBranch + ', expected ' + fx.lifePalaceBranch);

  // 命宮主星
  check(label + ' | 命宮主星', JSON.stringify(core.lifePalace.majorStars) === JSON.stringify(fx.lifePalaceStars),
    'got [' + core.lifePalace.majorStars.join(',') + '], expected [' + fx.lifePalaceStars.join(',') + ']');

  // 十二宮完整
  check(label + ' | 十二宮完整', core.validation.palaceCount && core.validation.missingPalaces.length === 0,
    core.validation.missingPalaces.join(','));

  // 十四主星定位（一顆錯宮即 FAIL）
  const actual: Record<string, string> = {};
  core.majorStarPositions.forEach((p) => { actual[p.star] = p.palaceKey; });
  for (const star of MAJOR_STARS) {
    check(label + ' | ' + star, actual[star] === fx.majorStarPositions[star],
      'got ' + actual[star] + ', expected ' + fx.majorStarPositions[star]);
  }

  // 驗證器
  check(label + ' | validation.passed', core.validation.passed);

  // 三方四正建立在命宮上（library surroundedPalaces API）
  check(label + ' | 三方四正本宮', core.sanFangSiZheng.target.key === 'MING');
  check(label + ' | 三方四正對宮', core.sanFangSiZheng.opposite.key === 'QIAN_YI');
  check(label + ' | 三方四正財帛', core.sanFangSiZheng.wealth.key === 'CAI_BO');
  check(label + ' | 三方四正官祿', core.sanFangSiZheng.career.key === 'GUAN_LU');
}

// 3) 農曆入口交叉驗證：農曆 1979-7-11 寅時 女 → 陽曆 1979-9-2 → 命宮午破軍
{
  const lunar = createZiweiCore({ calendarType: 'lunar', date: '1979-7-11', gender: '女', timeIndex: 2 });
  check('農曆入口 | 轉陽曆', lunar.raw.solarDate.replace(/-0/g,'-') === '1979-9-2', 'got ' + lunar.raw.solarDate);
  check('農曆入口 | 命宮地支', lunar.lifePalace.earthlyBranch === '午');
  check('農曆入口 | 命宮主星', JSON.stringify(lunar.lifePalace.majorStars) === JSON.stringify(['破軍']));
}

console.log('\n紫微排盤回歸測試：' + FIXTURES.length + ' 組命盤 + 農曆交叉驗證');
console.log('PASS ' + passed + ' / FAIL ' + failed);
if (failures.length) { console.error('\n' + failures.slice(0,40).join('\n')); process.exit(1); }
console.log('ZIWEI_REGRESSION_CERTIFIED=true');
