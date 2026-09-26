import assert from 'node:assert/strict';
import { createBaziCore, computeShenSha, STEMS, BRANCHES, type Stem, type Branch } from '../lib/bazi/engine';

// 預期值取自三命通會卷三論天乙貴人、論驛馬，不由正式查表產生。
// 採《增訂命理探原》1937訂正本與1938再版本對讀的指定取法。
// 預期表值獨立維護，不從實作匯入；這些是規則組合，不是歷史命例。
const tianyi: Record<Stem, string> = {
  甲: '丑未', 乙: '子申', 丙: '酉亥', 丁: '酉亥', 戊: '丑未',
  己: '子申', 庚: '丑未', 辛: '寅午', 壬: '卯巳', 癸: '卯巳',
};
const yima: Record<Branch, Branch> = {
  子: '寅', 丑: '亥', 寅: '申', 卯: '巳', 辰: '寅', 巳: '亥',
  午: '申', 未: '巳', 申: '寅', 酉: '亥', 戌: '申', 亥: '巳',
};
const core = createBaziCore({ birthDate: '1990-01-01', gender: 'male', birthTimeKnown: true, birthTime: '11:30' });
// 《增訂命理探原》卷上63–64頁文昌、華蓋原頁。
const wenchang: Record<Stem, Branch> = {
  甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申',
  己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
};
const huagai: Record<Branch, Branch> = {
  子: '辰', 丑: '丑', 寅: '戌', 卯: '未', 辰: '辰', 巳: '丑',
  午: '戌', 未: '未', 申: '辰', 酉: '丑', 戌: '戌', 亥: '未',
};
let assertions = 0;
for (const stem of STEMS) for (const branch of BRANCHES) {
  const result = computeShenSha(stem, '子', '子', [{ ...core.pillars.month, earthlyBranch: branch }]);
  assert.equal(result.some(item => item.id === 'wenchang'), wenchang[stem] === branch, `文昌${stem}/${branch}`);
  assertions++;
}
for (const anchor of BRANCHES) for (const branch of BRANCHES) {
  const result = computeShenSha('甲', anchor, anchor, [{ ...core.pillars.month, earthlyBranch: branch }]);
  assert.equal(result.some(item => item.id === 'huagai'), huagai[anchor] === branch, `華蓋${anchor}/${branch}`);
  assertions++;
}
for (const stem of STEMS) for (const branch of BRANCHES) {
  const pillar = { ...core.pillars.month, earthlyBranch: branch };
  const result = computeShenSha(stem, '子', '子', [pillar]);
  assert.equal(result.some(item => item.id === 'tianyi'), tianyi[stem].includes(branch), `${stem}/${branch}`);
  assertions++;
}
for (const anchor of BRANCHES) for (const branch of BRANCHES) {
  const pillar = { ...core.pillars.month, earthlyBranch: branch };
  const result = computeShenSha('甲', anchor, anchor, [pillar]);
  assert.equal(result.some(item => item.id === 'yima'), yima[anchor] === branch, `${anchor}/${branch}`);
  assertions++;
}
// 《增訂命理探原》卷上64、65頁掃描：日支查年月時。
// 逐筆檢查日支來源，避免年支命中掩蓋日支漏算或自查問題。
for (const day of BRANCHES) {
  for (const key of ['year', 'month', 'day', 'hour'] as const) {
    const base = core.pillars[key];
    if (base === 'UNKNOWN') throw new Error('此固定測試命例必須有時柱');
    const horse = { ...base, earthlyBranch: key === 'day' ? day : yima[day] };
    const result = computeShenSha('甲', '子', day, [horse]);
    assert.equal(result.some(item => item.id === 'yima' && item.rule.startsWith('日支')), key !== 'day', `日支驛馬${day}/${key}`);
    assertions++;
    const canopy = { ...base, earthlyBranch: key === 'day' ? day : huagai[day] };
    const canopyResult = computeShenSha('甲', '子', day, [canopy]);
    assert.equal(canopyResult.some(item => item.id === 'huagai' && item.rule.startsWith('日支')), key !== 'day', `日支華蓋${day}/${key}`);
    assertions++;
  }
}
// 原書卷上71頁日主納音法；同日支換納音即有不同結果，不能只比三合表。
// 丙寅爐中火／甲寅大溪水；丙子澗下水／甲子海中金；
// 辛巳白蠟金／己巳大林木；己亥平地木／丁亥屋上土。
for (const [stem, day, bath, eligible] of [
  ['丙', '寅', '卯', true], ['甲', '寅', '卯', false],
  ['丙', '子', '酉', true], ['甲', '子', '酉', false],
  ['辛', '巳', '午', true], ['己', '巳', '午', false],
  ['己', '亥', '子', true], ['丁', '亥', '子', false],
] as const) {
  for (const key of ['year', 'month', 'day', 'hour'] as const) for (const branch of BRANCHES) {
    const base = core.pillars[key];
    if (base === 'UNKNOWN') throw new Error('測試需有時柱');
    const hits = computeShenSha(stem, '巳', day, [{ ...base, earthlyBranch: branch }]).filter(item => item.id === 'taohua');
    const expected = eligible && branch === bath && (key === 'month' || key === 'hour');
    assert.equal(hits.length > 0, expected, `咸池${stem}${day}/${key}${branch}`);
    for (const hit of hits) {
      assert.match(hit.rule, /納音.*查月時/);
      assert.equal(hit.source.printedPage, '71');
    }
    assertions++;
  }
}
// 年支自己的墓庫不可被混成已核對的日主華蓋。
assert.equal(computeShenSha('丙', '辰', '寅', [{ ...core.pillars.year, earthlyBranch: '辰' }]).some(item => item.id === 'huagai'), false);
assertions++;
for (const item of computeShenSha('丁', '巳', '亥', [{ ...core.pillars.month, earthlyBranch: '亥' }])) {
  assert.ok(item.source.sourceId && item.source.printedPage && item.source.url);
  assert.equal(item.ruleVersion, 'MINGLI_TANYUAN_SHENSHA_V5');
  assertions++;
}
console.log(`PASS ${assertions}: 五項指定取法表值、納音正反例、柱位與來源追蹤；非所有流派或歷史命例驗證`);
