/**
 * 第一層紫微斗數核心測試。
 *
 * 這裡只驗證 deterministic 排盤資料，不測 AI 文案、不測塔羅牌。
 */

import {
  MAJOR_STARS,
  createZiweiAstrolabe,
  createZiweiCore,
  hourToTimeIndex,
  type ZiweiBirthInput,
} from '../lib/ziwei/engine';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string) {
  if (ok) passed += 1;
  else {
    failed += 1;
    failures.push('FAIL: ' + name + (detail ? ' -> ' + detail : ''));
  }
}

function starsOf(input: ZiweiBirthInput) {
  const core = createZiweiCore(input);
  return Object.fromEntries(core.majorStarPositions.map((item) => [item.star, item.palaceKey]));
}

const linPeiJun = createZiweiCore({
  calendarType: 'solar',
  date: '1979-9-2',
  gender: '女',
  timeIndex: 2,
});

check('林佩君 | 命宮干支', linPeiJun.lifePalace.heavenlyStem + linPeiJun.lifePalace.earthlyBranch === '庚午');
check('林佩君 | 命宮主星', linPeiJun.lifePalace.majorStars.join('、') === '破軍');
check('林佩君 | 破軍亮度', linPeiJun.lifePalace.majorStarDetails[0]?.brightness === '廟');
check('林佩君 | 身宮', `${linPeiJun.bodyPalace?.name}/${linPeiJun.bodyPalace?.heavenlyStem}${linPeiJun.bodyPalace?.earthlyBranch}` === '官祿宮/甲戌');
check('林佩君 | 遷移宮主星', linPeiJun.palaces.find((palace) => palace.key === 'QIAN_YI')?.majorStars.join('、') === '廉貞、天相');
check('林佩君 | 十二宮', linPeiJun.validation.palaceCount && linPeiJun.validation.missingPalaces.length === 0);
check('林佩君 | 十四主星', linPeiJun.validation.majorStarsComplete && linPeiJun.validation.noMajorStarDuplicate);
check('林佩君 | 三方四正本宮', linPeiJun.sanFangSiZheng.target.key === 'MING');
check('林佩君 | 三方四正財帛', linPeiJun.sanFangSiZheng.wealth.key === 'CAI_BO');
check('林佩君 | 三方四正官祿', linPeiJun.sanFangSiZheng.career.key === 'GUAN_LU');
check('林佩君 | 三方四正遷移', linPeiJun.sanFangSiZheng.opposite.key === 'QIAN_YI');
check('林佩君 | ZIWEI_CHART_CERTIFIED', linPeiJun.validation.passed);

const rawLin = createZiweiAstrolabe({
  calendarType: 'solar',
  date: '1979-9-2',
  gender: '女',
  timeIndex: 2,
});
check('iztro palaces[0] 是寅宮位置', rawLin.palaces[0]?.earthlyBranch === '寅');
check('iztro palaces[0] 不是命宮', rawLin.palaces[0]?.name !== '命宮');
check('iztro palace("命宮") 才是命宮', rawLin.palace('命宮' as any)?.name === '命宮');

check('hourToTimeIndex 00:00 = 早子時 0', hourToTimeIndex(0) === 0);
check('hourToTimeIndex 23:00 = 晚子時 12', hourToTimeIndex(23) === 12);
check('hourToTimeIndex 03:00 = 寅時 2', hourToTimeIndex(3) === 2);

const lateZi = createZiweiCore({
  calendarType: 'solar',
  date: '1985-1-1',
  gender: '女',
  timeIndex: 12,
});
check('晚子時 | 命宮仍需獨立排盤', lateZi.lifePalace.majorStars.join('、') === '巨門');
check('晚子時 | 不等於早子時命宮主星', lateZi.lifePalace.majorStars.join('、') !== createZiweiCore({
  calendarType: 'solar',
  date: '1985-1-1',
  gender: '女',
  timeIndex: 0,
}).lifePalace.majorStars.join('、'));

const solar = starsOf({ calendarType: 'solar', date: '2000-8-16', gender: '男', timeIndex: 2 });
const lunar = starsOf({ calendarType: 'lunar', date: '2000-7-17', gender: '男', timeIndex: 2, isLeapMonth: false });
for (const star of MAJOR_STARS) {
  check(`陽曆/農曆入口一致 | ${star}`, solar[star] === lunar[star], `solar ${solar[star]}, lunar ${lunar[star]}`);
}

for (const badTimeIndex of [-1, 13, 1.5]) {
  try {
    createZiweiCore({ calendarType: 'solar', date: '1979-9-2', gender: '女', timeIndex: badTimeIndex });
    check(`INVALID_ZIWEI_TIME_INDEX ${badTimeIndex}`, false);
  } catch (error) {
    check(`INVALID_ZIWEI_TIME_INDEX ${badTimeIndex}`, error instanceof Error && error.message === 'INVALID_ZIWEI_TIME_INDEX');
  }
}

console.log('\n第一層紫微核心測試');
console.log('PASS ' + passed + ' / FAIL ' + failed);
if (failures.length) {
  console.error('\n' + failures.join('\n'));
  process.exit(1);
}
console.log('ZIWEI_CORE_CERTIFIED=true');

