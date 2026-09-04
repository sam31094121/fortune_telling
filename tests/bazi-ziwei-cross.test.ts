/**
 * 八字命盤 × 紫微斗數｜四柱交叉驗證
 *
 * 架構鐵律：八字命盤為核心，紫微斗數為第二輪，一切以八字命盤為主。
 * 四柱唯一來源是 lib/bazi/engine.ts，任何卡片都不得自己再算一套。
 *
 * 為什麼需要這支測試（2026-09-04）：
 * lib/ziwei-sanfang-engine.ts 曾用 tyme4ts 的 LunarHour.fromYmdHms() 自行重算八字，
 * 而該 API 吃的是農曆、程式卻餵國曆——1990-05-20 被當成農曆五月二十（＝國曆 6/12），
 * 整整差 23 天，日柱算成戊申（正確為乙酉）、日主變成戊土（正確為乙木），
 * 整段流年生剋關係相反。
 *
 * 最致命的是：同一份回應裡 meta.dayPillar 是對的、ziweiSanFang.bazi.day 是錯的，
 * 兩邊各自內部一致，所以各自的測試都過——因為從來沒有人把它們放在一起比對。
 * 客戶只要拿八字卡與紫微卡對照一次就會發現。
 *
 * 這支測試就是那個「放在一起比對」的人。
 */

import { createBaziCore, BRANCHES, type Branch } from '../lib/bazi/engine';
import { calculateZiweiSanFang } from '../lib/ziwei-sanfang-engine';
import { computeShichenProfile } from '../lib/shichen-engine';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    pass += 1;
  } else {
    fail += 1;
    console.error(`FAIL: ${label}\n  expected=${JSON.stringify(expected)}\n  actual  =${JSON.stringify(actual)}`);
  }
}

// ---- 獨立錨點：專業命理師客訴後鎖定的 1974-07-02 = 甲辰（tests/bazi-core.test.ts）----
// 只用「日柱逐日遞增 mod 60」推算，不經過任何命理引擎。
const STEMS = '甲乙丙丁戊己庚辛壬癸'.split('');
const BR = '子丑寅卯辰巳午未申酉戌亥'.split('');
const ganzhiOf = (n: number) => STEMS[((n % 10) + 10) % 10] + BR[((n % 12) + 12) % 12];
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const anchorDayPillar = (iso: string) => ganzhiOf(40 + daysBetween('1974-07-02', iso));

type Case = {
  iso: string;
  /** 時辰地支索引（0=子 … 11=亥） */
  hourIndex: number;
  clock: string;
  gender: 'male' | 'female';
  note: string;
};

const CASES: Case[] = [
  { iso: '1974-07-02', hourIndex: 2, clock: '03:30', gender: 'female', note: '客訴鎖定案・小暑前' },
  { iso: '1974-07-08', hourIndex: 2, clock: '03:30', gender: 'female', note: '節氣邊界・小暑後' },
  { iso: '1990-05-20', hourIndex: 11, clock: '21:30', gender: 'female', note: '曾因餵錯曆法而算錯的案例' },
  { iso: '1985-01-01', hourIndex: 0, clock: '23:30', gender: 'female', note: '晚子時＋跨年' },
  { iso: '2000-02-29', hourIndex: 6, clock: '12:30', gender: 'male', note: '閏年 2/29' },
  { iso: '1968-12-31', hourIndex: 11, clock: '21:30', gender: 'female', note: '跨年邊界' },
];

for (const item of CASES) {
  const branch = BRANCHES[item.hourIndex] as Branch;

  // 核心：八字命盤（唯一權威）
  const core = createBaziCore({
    gender: item.gender,
    birthDate: item.iso,
    calendarType: 'SOLAR',
    birthTimeKnown: true,
    traditionalHour: branch,
    timezone: 'Asia/Taipei',
  });
  const corePillars = [
    core.pillars.year.ganZhi,
    core.pillars.month.ganZhi,
    core.pillars.day.ganZhi,
    core.pillars.hour === 'UNKNOWN' ? '' : core.pillars.hour.ganZhi,
  ];

  // 第二輪：紫微斗數
  const ziwei = calculateZiweiSanFang({
    birthDate: item.iso,
    birthTime: item.clock,
    gender: item.gender,
    shichen: item.hourIndex,
    isTimeConfirmed: true,
    longitude: null,
  });
  const ziweiPillars = [ziwei.bazi.year, ziwei.bazi.month, ziwei.bazi.day, ziwei.bazi.hour];

  check(`${item.note} ${item.iso}｜兩張卡四柱一致`, ziweiPillars, corePillars);
  check(`${item.note} ${item.iso}｜日柱對得上獨立錨點`, ziwei.bazi.day, anchorDayPillar(item.iso));

  // 同一份回應內部不得自相矛盾：meta.dayPillar 來自 shichen-engine，另一套實作。
  const shichen = computeShichenProfile({ birthDate: item.iso, shichenBranchIndex: item.hourIndex });
  check(`${item.note} ${item.iso}｜meta.dayPillar 與紫微四柱不矛盾`, shichen.dayPillar, ziwei.bazi.day);
}

// ---- 正統鎖定值：專業命理師客訴案，四柱逐一釘死 ----
{
  const c = createBaziCore({
    gender: 'female', birthDate: '1974-07-02', calendarType: 'SOLAR',
    birthTimeKnown: true, traditionalHour: '寅', timezone: 'Asia/Taipei',
  });
  const z = calculateZiweiSanFang({
    birthDate: '1974-07-02', birthTime: '03:30', gender: 'female',
    shichen: 2, isTimeConfirmed: true, longitude: null,
  });
  const 正統 = ['甲寅', '庚午', '甲辰', '丙寅'];
  check('正統鎖定・八字卡四柱', [c.pillars.year.ganZhi, c.pillars.month.ganZhi, c.pillars.day.ganZhi, (c.pillars.hour as { ganZhi: string }).ganZhi], 正統);
  check('正統鎖定・紫微卡四柱', [z.bazi.year, z.bazi.month, z.bazi.day, z.bazi.hour], 正統);
  check('正統鎖定・日主', z.bazi.dayMaster, '甲木');
}

console.log(`\nBAZI × ZIWEI 四柱交叉驗證 — PASS ${pass} / FAIL ${fail}`);
if (fail > 0) process.exit(1);
console.log('BAZI_ZIWEI_CROSS_CERTIFIED=true');
