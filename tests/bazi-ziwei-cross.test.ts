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
import { castHexagram, castHexagramFromBirth } from '../lib/iching-engine';
import fsForPage from 'node:fs';
import pathForPage from 'node:path';
import { patternNameOf } from '../lib/iching-psychology';
import { assertThreeCoreConsistent, computeThreeCore, ICHING_RITUAL_STEPS } from '../lib/three-core-engine';

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

// ============================================================================
// 第三層：易經卜卦
//
// 三核心的順序是 八字命盤 → 紫微斗數 → 易經卜卦。易經是最後一層，
// 只負責「怎麼說」——它消費前兩層已凍結的證據，不新增規則、不改寫結論，
// 話術由這一層產出後交給前端顯示，前端不得自己編。
//
// 這一段守三件事：起卦決定性、可回查、以及同一模組共用同一顆卦。
// ============================================================================
for (const item of CASES) {
  // 決定性：同一生辰跑 50 次必須完全相同，否則客戶每次重整都換一個卦。
  const first = castHexagramFromBirth(item.iso, item.hourIndex);
  let stable = true;
  for (let i = 0; i < 50; i += 1) {
    const again = castHexagramFromBirth(item.iso, item.hourIndex);
    if (JSON.stringify(again) !== JSON.stringify(first)) { stable = false; break; }
  }
  check(`${item.note} ${item.iso}｜易經起卦 50 次決定性`, stable, true);

  // 可回查：seedText 必須帶出生辰與時辰，客戶才驗算得回來。
  check(
    `${item.note} ${item.iso}｜起卦依據可回查`,
    first.seedText,
    `梅花易數|${item.iso}|時辰${item.hourIndex + 1}`,
  );

  // 格局名必須由卦象推出，不得憑空生成。
  check(
    `${item.note} ${item.iso}｜格局名由卦象推出`,
    patternNameOf(first).endsWith('格') && patternNameOf(first).length >= 3,
    true,
  );
}

// 時辰會改變卦：不知道時辰與知道時辰不該得到同一卦，否則「補時辰解鎖卦象」就是假的。
{
  const withHour = castHexagramFromBirth('1990-05-20', 11);
  const otherHour = castHexagramFromBirth('1990-05-20', 2);
  check('時辰不同必須是不同的卦', withHour.kingWen === otherHour.kingWen, false);
}

// 不同生辰不得塌成同一卦（雜湊沒有退化）。
{
  const seen = new Set(CASES.map((item) => castHexagramFromBirth(item.iso, item.hourIndex).kingWen));
  check('六組生辰的卦象不得全部相同', seen.size > 1, true);
}

// ============================================================================
// 逐卡三合一：把同一套方法對準單一張卡
//
// 三合一不只是「跑一次全域檢查」，它要能對準任何一張卡，
// 驗那張卡自己的八字、紫微、易經是否與三個核心一致。
// 這裡以《桃花紅鸞心動》為第一張——它三層俱全，是最完整的樣本。
//
// 新增卡片時照抄這一段：把該卡的引擎接進來，逐層比對即可。
// ============================================================================
{
  // 紅鸞卡的四柱來自 API 端的 createBaziCore（app/api/red-luan-heartbeat/route.ts）。
  // 這裡直接以同一支核心引擎重算，確認紅鸞用的年支／日支沒有走樣。
  const core = createBaziCore({
    gender: 'female', birthDate: '1990-05-20', calendarType: 'SOLAR',
    birthTimeKnown: true, traditionalHour: '亥', timezone: 'Asia/Taipei',
  });
  check('紅鸞・年支取自核心引擎', core.pillars.year.earthlyBranch, '午');
  check('紅鸞・日支取自核心引擎', core.pillars.day.earthlyBranch, '酉');
  check('紅鸞・日柱對得上獨立錨點', core.pillars.day.ganZhi, anchorDayPillar('1990-05-20'));

  // 紅鸞的紫微夫妻宮必須與紫微卡同一顆盤。
  const ziwei = calculateZiweiSanFang({
    birthDate: '1990-05-20', birthTime: '21:30', gender: 'female',
    shichen: 11, isTimeConfirmed: true, longitude: null,
  });
  const fuQi = ziwei.allPalaces.find((palace) => /夫妻/.test(palace.name));
  check('紅鸞・夫妻宮與紫微卡同一顆盤（宮位地支）', fuQi?.branch, '辰');
  check('紅鸞・夫妻宮主星', fuQi?.majorStars, ['天同']);

  // 紅鸞的卦必須與全站易經層同一顆——同模組不得出現兩顆卦。
  const hex = castHexagramFromBirth('1990-05-20', 11);
  check('紅鸞・卦象與易經層一致', hex.hexagramName, '山火賁');
  check('紅鸞・格局名', patternNameOf(hex), '山鎮抱火格');
  check('紅鸞・起卦依據可回查', hex.seedText, '梅花易數|1990-05-20|時辰12');
}

// ============================================================================
// 逐卡三合一：《靈魂配對》
//
// 雙人卡，第一層要各自成立、第二層要逐人分開判定、第三層目前明確標示
// 「雙人起卦規則尚未選定，不生成卦象」——這是誠實的空缺，不是漏做。
// 這裡守的重點是：不得因為是雙人卡就把某一方的缺項用另一方補上。
// ============================================================================
{
  const A = createBaziCore({
    gender: 'female', birthDate: '1990-05-20', calendarType: 'SOLAR',
    birthTimeKnown: true, traditionalHour: '亥', timezone: 'Asia/Taipei',
  });
  const B = createBaziCore({
    gender: 'male', birthDate: '1988-11-03', calendarType: 'SOLAR',
    birthTimeKnown: true, traditionalHour: '辰', timezone: 'Asia/Taipei',
  });
  check('靈魂配對・A 日柱對得上獨立錨點', A.pillars.day.ganZhi, anchorDayPillar('1990-05-20'));
  check('靈魂配對・B 日柱對得上獨立錨點', B.pillars.day.ganZhi, anchorDayPillar('1988-11-03'));
  check('靈魂配對・A 年支日支', [A.pillars.year.earthlyBranch, A.pillars.day.earthlyBranch], ['午', '酉']);
  check('靈魂配對・B 年支日支', [B.pillars.year.earthlyBranch, B.pillars.day.earthlyBranch], ['辰', '戌']);

  // 兩人的紫微必須各自獨立成盤，不得互相沾染。
  const zA = calculateZiweiSanFang({
    birthDate: '1990-05-20', birthTime: '21:30', gender: 'female',
    shichen: 11, isTimeConfirmed: true, longitude: null,
  });
  const zB = calculateZiweiSanFang({
    birthDate: '1988-11-03', birthTime: '07:30', gender: 'male',
    shichen: 4, isTimeConfirmed: true, longitude: null,
  });
  check('靈魂配對・A 夫妻宮與紫微卡同一顆盤', zA.allPalaces.find((p) => /夫妻/.test(p.name))?.branch, '辰');
  /*
    「兩人未互相沾染」不能用命宮地支是否相同來判——十二宮只有十二個地支，
    兩張不同的盤命宮落在同一支是常見巧合（實測這兩位就同樣落在午，
    但四柱與命宮主星完全不同）。用整張盤的指紋比才可靠。
  */
  const fingerprint = (a: typeof zA) => JSON.stringify([
    a.bazi.year, a.bazi.month, a.bazi.day, a.bazi.hour,
    ...a.allPalaces.map((p) => `${p.name}:${p.branch}:${p.majorStars.join('/')}`),
  ]);
  check('靈魂配對・兩人是兩張不同的盤（未互相沾染）', fingerprint(zA) === fingerprint(zB), false);
  check('靈魂配對・A 四柱', [zA.bazi.year, zA.bazi.month, zA.bazi.day, zA.bazi.hour], ['庚午', '辛巳', '乙酉', '丁亥']);
  check('靈魂配對・B 四柱', [zB.bazi.year, zB.bazi.month, zB.bazi.day, zB.bazi.hour], ['戊辰', '壬戌', '壬戌', '甲辰']);

  // 逐人獨立：一方有時辰、一方沒有時，不得用有的那方替沒有的補。
  const bNoHour = createBaziCore({
    gender: 'male', birthDate: '1988-11-03', calendarType: 'SOLAR',
    birthTimeKnown: false, timezone: 'Asia/Taipei',
  });
  check('靈魂配對・無時辰方時柱必須是 UNKNOWN', bNoHour.pillars.hour, 'UNKNOWN');
  check('靈魂配對・無時辰方三柱照常成立',
    [bNoHour.pillars.year.ganZhi, bNoHour.pillars.month.ganZhi, bNoHour.pillars.day.ganZhi],
    [B.pillars.year.ganZhi, B.pillars.month.ganZhi, B.pillars.day.ganZhi]);
}

// ============================================================================
// 逐卡三合一：《姓名學》
//
// 這張卡只有第一層與第三層——第二層紫微本來就不在它的範圍內，這不是缺失。
// 特別之處在第三層：未知時辰時「不用生辰起卦」（避免補午時），改用姓名象徵起卦，
// 並在呈現層標明 method，前端也告訴客戶「沒有補造出生時辰」。
// 這裡守的是：兩種起卦法不得混為一談，也不得因為想給一顆卦就偷偷補時辰。
// ============================================================================
{
  const core = createBaziCore({
    gender: 'female', birthDate: '1990-05-20', calendarType: 'SOLAR',
    birthTimeKnown: true, traditionalHour: '亥', timezone: 'Asia/Taipei',
  });
  check('姓名學・四柱取自核心引擎',
    [core.pillars.year.ganZhi, core.pillars.month.ganZhi, core.pillars.day.ganZhi],
    ['庚午', '辛巳', '乙酉']);
  check('姓名學・日柱對得上獨立錨點', core.pillars.day.ganZhi, anchorDayPillar('1990-05-20'));

  // 有時辰：必須與紫微卡、紅鸞卡同一顆生辰卦
  const birthHex = castHexagramFromBirth('1990-05-20', 11);
  check('姓名學・有時辰時與全站同一顆生辰卦', birthHex.hexagramName, '山火賁');
  check('姓名學・生辰卦可回查', birthHex.seedText, '梅花易數|1990-05-20|時辰12');

  // 無時辰：不得用生辰起卦（那會被迫補時辰），必須另走姓名象徵起卦
  const noHourCore = createBaziCore({
    gender: 'female', birthDate: '1990-05-20', calendarType: 'SOLAR',
    birthTimeKnown: false, timezone: 'Asia/Taipei',
  });
  check('姓名學・無時辰時柱必須是 UNKNOWN', noHourCore.pillars.hour, 'UNKNOWN');
  check('姓名學・無時辰三柱照常成立',
    [noHourCore.pillars.year.ganZhi, noHourCore.pillars.month.ganZhi, noHourCore.pillars.day.ganZhi],
    ['庚午', '辛巳', '乙酉']);

  // 象徵起卦與生辰起卦必須是兩套：同一個人不得因為換了起卦法而拿到同一顆卦
  // （若相同，代表其中一條路徑偷偷補了時辰）
  const symbolicHex = castHexagram('王思妤', '1990-05-20', '姓名象徵參考');
  check('姓名學・象徵起卦與生辰起卦不得相同', symbolicHex.kingWen === birthHex.kingWen, false);
  check('姓名學・象徵起卦依據可回查', symbolicHex.seedText, '王思妤|1990-05-20|姓名象徵參考');

  // 前端必須告訴客戶「沒有補造出生時辰」
  const nameologyPage = fsForPage.readFileSync(pathForPage.join(process.cwd(), 'app/nameology/page.tsx'), 'utf8');
  check('姓名學・前端明示未補造時辰', nameologyPage.includes('沒有補造出生時辰'), true);
}

// ============================================================================
// 三合一運算核心（lib/three-core-engine.ts）
//
// 這支引擎是後端唯一的三核心入口，職責不只是算，更是「只准算一次、自己驗自己」。
// 這裡驗它的自檢真的有效——包括時辰未知時不代填、不硬排、不硬起卦。
// ============================================================================
{
  // 已知時辰：三層齊備，自檢必須全過
  const known = computeThreeCore({ birthDate: '1990-05-20', gender: 'female', hourBranchIndex: 11 });
  check('三合一引擎・已知時辰自檢通過', known.crossCheck.passed, true);
  check('三合一引擎・四柱', [known.bazi.year, known.bazi.month, known.bazi.day, known.bazi.hour], ['庚午', '辛巳', '乙酉', '丁亥']);
  check('三合一引擎・日主', `${known.bazi.dayMaster}${known.bazi.dayMasterElement}`, '乙木');
  check('三合一引擎・第二層可用', known.ziwei.status, 'READY');
  check('三合一引擎・第三層可用', known.iching.status, 'READY');
  check('三合一引擎・時辰已知不需補齊提示', known.unlockNote, null);
  if (known.ziwei.status === 'READY') {
    check(
      '三合一引擎・第二層四柱等於第一層',
      [known.ziwei.analysis.bazi.year, known.ziwei.analysis.bazi.month, known.ziwei.analysis.bazi.day],
      [known.bazi.year, known.bazi.month, known.bazi.day],
    );
  }
  if (known.iching.status === 'READY') {
    check('三合一引擎・卦象', known.iching.reading.hexagramName, '山火賁');
    check('三合一引擎・格局名', known.iching.patternName, '山鎮抱火格');
  }

  // 未知時辰：三柱照給，但不得代填、不得硬排、不得硬起卦
  const unknown = computeThreeCore({ birthDate: '1990-05-20', gender: 'female', hourBranchIndex: null });
  check('三合一引擎・未知時辰自檢通過', unknown.crossCheck.passed, true);
  check('三合一引擎・未知時辰仍給三柱', [unknown.bazi.year, unknown.bazi.month, unknown.bazi.day], ['庚午', '辛巳', '乙酉']);
  check('三合一引擎・未知時辰不代填時柱', unknown.bazi.hour, null);
  check('三合一引擎・未知時辰不硬排命宮', unknown.ziwei.status, 'UNAVAILABLE_BIRTH_TIME_REQUIRED');
  check('三合一引擎・未知時辰不硬起卦', unknown.iching.status, 'UNAVAILABLE_BIRTH_TIME_REQUIRED');
  // 命盤沒鎖定就沒有儀式，也就沒有卦——順序不可顛倒
  check('三合一引擎・命盤未鎖定時不得有卦', 'reading' in unknown.iching, false);
  check('三合一引擎・未知時辰四柱版五行為 null', unknown.bazi.elementBalanceFourPillar, null);
  check('三合一引擎・未知時辰帶補齊提示', typeof unknown.unlockNote === 'string' && unknown.unlockNote.length > 0, true);
  // 三柱五行與時辰無關，兩種情況必須相同
  check('三合一引擎・三柱五行不受時辰影響', unknown.bazi.elementBalanceThreePillar, known.bazi.elementBalanceThreePillar);

  // 正統鎖定案跑一次
  const locked = computeThreeCore({ birthDate: '1974-07-02', gender: 'female', hourBranchIndex: 2 });
  check('三合一引擎・正統鎖定四柱', [locked.bazi.year, locked.bazi.month, locked.bazi.day, locked.bazi.hour], ['甲寅', '庚午', '甲辰', '丙寅']);

  /*
    儀式關卡：八字命盤鎖定 → 過正統儀式 → 才成為易經。順序不可顛倒。
    直接驗「命盤沒鎖定時，儀式必須不成立」——這是關卡真正在守的那條線。
  */
  {
    const noHour = computeThreeCore({ birthDate: '1990-05-20', gender: 'female', hourBranchIndex: null });
    // 命盤未鎖定（時柱為 null）→ 不得有已完成的儀式，也不得有卦
    const ritualOfNoHour = 'ritual' in noHour.iching ? noHour.iching.ritual : null;
    check('儀式關卡・命盤未鎖定時儀式不得成立', ritualOfNoHour?.completed ?? false, false);
    check('儀式關卡・命盤未鎖定時不得有卦', 'reading' in noHour.iching, false);
    check('儀式關卡・命盤鎖定時儀式才成立',
      known.iching.status === 'READY' && known.iching.ritual.completed, true);
    // 儀式必須綁定命盤指紋：換一張命盤就是另一場儀式
    const other = computeThreeCore({ birthDate: '1988-11-03', gender: 'male', hourBranchIndex: 4 });
    const fpA = known.iching.status === 'READY' ? known.iching.ritual.chartFingerprint : '';
    const fpB = other.iching.status === 'READY' ? other.iching.ritual.chartFingerprint : '';
    check('儀式關卡・不同命盤不得共用同一場儀式', fpA === fpB, false);
    // 儀式五步各自綁一道正統驗證閘（曆法／四柱／十神／大運），不是齊頭式的布林
    if (known.iching.status === 'READY') {
      const ids = known.iching.ritual.steps.map((step) => step.id);
      check('儀式關卡・五步順序固定', ids, ['TEMPERATURE', 'STILLNESS', 'HEXAGRAM_FORMED', 'ONION', 'CONFIDANT']);
    }
  }

  // 反向驗證：三層打架時 assertThreeCoreConsistent 必須擋下
  const broken: typeof known = {
    ...known,
    crossCheck: {
      passed: false,
      checks: known.crossCheck.checks,
      failedReasons: ['第二層四柱必須等於第一層：不一致'],
    },
  };
  let blocked = false;
  try { assertThreeCoreConsistent(broken); } catch { blocked = true; }
  check('三合一引擎・三層打架時必須擋下', blocked, true);
  // 正常結果不得被誤擋
  let passedThrough = true;
  try { assertThreeCoreConsistent(known); } catch { passedThrough = false; }
  check('三合一引擎・正常結果不得誤擋', passedThrough, true);
}

console.log(`\n三核心交叉驗證（八字 → 紫微 → 易經）— PASS ${pass} / FAIL ${fail}`);
if (fail > 0) process.exit(1);
console.log('THREE_CORE_CROSS_CERTIFIED=true');
