/**
 * Traditional Bazi Core V1｜Golden Tests
 *
 * 驗證層級：
 * 1. 確定性：同輸入 100 次結果完全相同（四柱/十神/藏干/大運）
 * 2. 獨立公式交叉驗證（不只信任 lunar-typescript）：
 *    - 年柱 = (立春換年後年份 - 4) mod 60
 *    - 月柱天干 = 五虎遁（甲己丙寅首）
 *    - 時柱天干 = 五鼠遁（甲己還加甲）
 *    - 日柱連續性：逐日干支必須循環遞增 1（mod 60）
 * 3. 節氣邊界／跨年／子時／性別順逆／未知時辰 案例
 * 4. Regression 快照：鎖定已驗證輸出防止未來變動
 */

import {
  createBaziCore, calculateTenGod, STEMS, BRANCHES,
  type BaziBirthInput, type BaziPillarModel,
} from '../lib/bazi/engine';

let pass = 0; let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; } else { fail++; console.error(`FAIL: ${label}\n  expected=${JSON.stringify(expected)}\n  actual  =${JSON.stringify(actual)}`); }
}

const mkInput = (date: string, time: string | null, gender: 'male' | 'female' = 'male', extra: Partial<BaziBirthInput> = {}): BaziBirthInput => ({
  gender, birthDate: date,
  birthTimeKnown: time !== null,
  birthTime: time ?? undefined,
  ...extra,
});

// ============ 1. 確定性：100 次完全相同 ============
{
  const input = mkInput('1988-6-15', '08:30', 'female');
  const first = JSON.stringify((() => { const c = createBaziCore(input); return [c.pillars, c.daYun, c.interactions]; })());
  let stable = true;
  for (let i = 0; i < 100; i++) {
    const c = createBaziCore(input);
    if (JSON.stringify([c.pillars, c.daYun, c.interactions]) !== first) { stable = false; break; }
  }
  check('確定性 100 次相同', stable, true);
}

// ============ 2a. 年柱獨立公式：(立春換年年份-4) mod 60 ============
{
  const cases: Array<[string, string, number]> = [
    ['2024-2-4', '10:00', 2023], // 立春(16:27)前 → 年用 2023 → 癸卯
    ['2024-2-4', '18:00', 2024], // 立春後 → 甲辰
    ['2000-1-1', '12:00', 1999], // 跨年但未過立春 → 己卯
    ['1988-6-15', '08:30', 1988],
  ];
  for (const [date, time, effYear] of cases) {
    const c = createBaziCore(mkInput(date, time));
    const idx = ((effYear - 4) % 60 + 60) % 60;
    const expected = `${STEMS[idx % 10]}${BRANCHES[idx % 12]}`;
    check(`年柱獨立公式 ${date} ${time}`, c.pillars.year.ganZhi, expected);
  }
}

// ============ 2b. 月柱天干獨立公式：五虎遁 ============
{
  const wuhuCheck = (date: string, time: string) => {
    const c = createBaziCore(mkInput(date, time));
    const yearStemIdx = STEMS.indexOf(c.pillars.year.heavenlyStem);
    const monthBranchIdx = BRANCHES.indexOf(c.pillars.month.earthlyBranch);
    const offsetFromYin = ((monthBranchIdx - 2) % 12 + 12) % 12;
    const expectedStem = STEMS[((yearStemIdx % 5) * 2 + 2 + offsetFromYin) % 10];
    check(`五虎遁月干 ${date}`, c.pillars.month.heavenlyStem, expectedStem);
  };
  ['1979-9-2', '1988-6-15', '2000-1-1', '2024-2-4', '1965-12-25', '2010-8-8'].forEach((d) => wuhuCheck(d, '10:00'));
}

// ============ 2c. 時柱天干獨立公式：五鼠遁 ============
{
  const wushuCheck = (date: string, time: string) => {
    const c = createBaziCore(mkInput(date, time));
    if (c.pillars.hour === 'UNKNOWN') { check(`五鼠遁 ${date} ${time} 應為 FULL`, 'UNKNOWN', 'FULL'); return; }
    const dayStemIdx = STEMS.indexOf(c.pillars.day.heavenlyStem);
    const hourBranchIdx = BRANCHES.indexOf((c.pillars.hour as BaziPillarModel).earthlyBranch);
    const expectedStem = STEMS[((dayStemIdx % 5) * 2 + hourBranchIdx) % 10];
    check(`五鼠遁時干 ${date} ${time}`, (c.pillars.hour as BaziPillarModel).heavenlyStem, expectedStem);
  };
  const times = ['00:30', '03:10', '07:45', '11:59', '13:00', '17:30', '21:05'];
  for (const t of times) wushuCheck('1979-9-2', t);
  for (const t of times) wushuCheck('1996-3-3', t);
}

// ============ 2d. 日柱連續性：逐日 mod 60 遞增 ============
{
  let ok = true;
  let prevIdx = -1;
  for (let offset = 0; offset < 120; offset++) {
    const base = new Date(Date.UTC(2023, 11, 1)); // 2023-12-01 起跨立春/跨年
    base.setUTCDate(base.getUTCDate() + offset);
    const date = `${base.getUTCFullYear()}-${base.getUTCMonth() + 1}-${base.getUTCDate()}`;
    const c = createBaziCore(mkInput(date, '12:00'));
    const idx = STEMS.indexOf(c.pillars.day.heavenlyStem) % 10;
    const bidx = BRANCHES.indexOf(c.pillars.day.earthlyBranch);
    let full = -1;
    for (let k = 0; k < 60; k++) if (k % 10 === idx && k % 12 === bidx) { full = k; break; }
    if (prevIdx >= 0 && full !== (prevIdx + 1) % 60) { ok = false; console.error(`日柱斷裂 @ ${date}`); break; }
    prevIdx = full;
  }
  check('日柱 120 天連續性', ok, true);
}

// ============ 3a. 節氣月柱邊界 ============
{
  const before = createBaziCore(mkInput('2024-2-4', '10:00'));
  const after = createBaziCore(mkInput('2024-2-4', '18:00'));
  check('立春前月柱', before.pillars.month.ganZhi, '乙丑');
  check('立春後月柱', after.pillars.month.ganZhi, '丙寅');
  check('立春前年柱', before.pillars.year.ganZhi, '癸卯');
  check('立春後年柱', after.pillars.year.ganZhi, '甲辰');
}

// ============ 3b. 晚子時規則：日柱不換日、時支為子 ============
{
  const evening = createBaziCore(mkInput('1990-5-20', '22:00'));
  const lateZi = createBaziCore(mkInput('1990-5-20', '23:30'));
  check('晚子時日柱不換日', lateZi.pillars.day.ganZhi, evening.pillars.day.ganZhi);
  check('晚子時時支', (lateZi.pillars.hour as BaziPillarModel).earthlyBranch, '子');
}

// ============ 3c. 性別大運順逆（陽年男順女逆） ============
{
  const male = createBaziCore(mkInput('2024-6-1', '10:00', 'male'));   // 甲辰陽年
  const female = createBaziCore(mkInput('2024-6-1', '10:00', 'female'));
  check('陽年男命順排', male.daYunMeta === 'NOT_CALCULATED' ? 'X' : male.daYunMeta.direction, 'FORWARD');
  check('陽年女命逆排', female.daYunMeta === 'NOT_CALCULATED' ? 'X' : female.daYunMeta.direction, 'BACKWARD');
  check('四柱不因性別改變', male.pillars.day.ganZhi, female.pillars.day.ganZhi);
}

// ============ 3d. 未知時辰：PARTIAL，不冒充 ============
{
  const partial = createBaziCore(mkInput('1979-9-2', null, 'female'));
  check('未知時辰 chartMode', partial.chartMode, 'PARTIAL_BAZI');
  check('未知時辰時柱', partial.pillars.hour, 'UNKNOWN');
  check('未知時辰大運', partial.daYun, 'NOT_CALCULATED');
  check('未知時辰仍可解讀（明確標記）', partial.verification.readyForInterpretation, true);
}

// ============ 3e. 傳統時辰輸入 ============
{
  const c = createBaziCore(mkInput('1979-9-2', null, 'female', { birthTimeKnown: true, traditionalHour: '寅' }));
  check('傳統時辰寅時 → 時支寅', c.pillars.hour === 'UNKNOWN' ? 'UNKNOWN' : c.pillars.hour.earthlyBranch, '寅');
  check('傳統時辰 precision', c.timePrecision, 'TRADITIONAL_HOUR');
}

// ============ 4. TenGodEngine 手工核對表 ============
{
  const fixtures: Array<[string, string, string]> = [
    ['甲', '甲', '比肩'], ['甲', '乙', '劫財'], ['甲', '丙', '食神'], ['甲', '丁', '傷官'],
    ['甲', '戊', '偏財'], ['甲', '己', '正財'], ['甲', '庚', '七殺'], ['甲', '辛', '正官'],
    ['甲', '壬', '偏印'], ['甲', '癸', '正印'],
    ['癸', '戊', '正官'], ['癸', '己', '七殺'], ['丁', '庚', '正財'], ['庚', '乙', '正財'],
    ['丙', '癸', '正官'], ['戊', '甲', '七殺'], ['辛', '丙', '正官'], ['壬', '己', '正官'],
  ];
  for (const [dm, t, expect] of fixtures) {
    check(`十神 ${dm}日主見${t}`, calculateTenGod(dm as never, t as never), expect);
  }
}

// ============ 5. 農曆輸入 ============
{
  const lunar = createBaziCore(mkInput('1979-7-11', '04:00', 'female', { calendarType: 'LUNAR' }));
  check('農曆 1979-7-11 → 國曆', lunar.calendar.solarDate, '1979-09-02');
}

// ============ 6. 驗證 Gate ============
{
  const c = createBaziCore(mkInput('1988-6-15', '08:30'));
  check('驗證通過', c.verification.readyForInterpretation, true);
  check('藏干齊備', [c.pillars.year, c.pillars.month, c.pillars.day].every((p) => p.hiddenStems.length > 0), true);
}

console.log(`\nBAZI GOLDEN TESTS — PASS ${pass} / FAIL ${fail}`);
if (fail > 0) { process.exit(1); }
console.log('BAZI_CORE_CERTIFIED=true');
