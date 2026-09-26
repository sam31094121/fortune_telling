import assert from 'node:assert/strict';
import { createBaziCore, computeShenSha, STEMS, BRANCHES, type Stem, type Branch } from '../lib/bazi/engine';

// 預期值取自三命通會卷三論天乙貴人、論驛馬，不由正式查表產生。
// 僅測表值；年／日取法、柱位範圍、原刻本校勘仍待核實。
const tianyi: Record<Stem, string> = {
  甲: '丑未', 乙: '子申', 丙: '酉亥', 丁: '酉亥', 戊: '丑未',
  己: '子申', 庚: '丑未', 辛: '寅午', 壬: '卯巳', 癸: '卯巳',
};
const yima: Record<Branch, Branch> = {
  子: '寅', 丑: '亥', 寅: '申', 卯: '巳', 辰: '寅', 巳: '亥',
  午: '申', 未: '巳', 申: '寅', 酉: '亥', 戌: '申', 亥: '巳',
};
const core = createBaziCore({ birthDate: '1990-01-01', gender: 'male', birthTimeKnown: true, birthTime: '11:30' });
// 《命理探源》卷三「文昌」「華蓋」電子轉錄；原版影像仍待校勘。
// 此處只核對表值，不以測試通過取代來源放行。
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
// 古今圖書集成 Volume 470 p.80 明列卯年見寅午戌月日時、酉年見申子辰月日時。
// 本引擎目前只用年／日錨點，因此驗證日支反查年支，不假稱已實作月／時錨點。
for (const [year, days] of [['卯', ['寅', '午', '戌']], ['酉', ['申', '子', '辰']]] as const) {
  for (const day of days) {
    const yearPillar = { ...core.pillars.year, earthlyBranch: year };
    const matches = computeShenSha('甲', year, day, [yearPillar]).filter(item => item.id === 'taohua');
    assert.equal(matches.length, 1, `${year}年/${day}日：不可漏掉倒插桃花`);
    assert.match(matches[0].rule, /日支.*倒插桃花/);
    assert.equal(matches[0].evidence, `YEAR 支${year}`);
    assertions++;
  }
}
assert.equal(computeShenSha('甲', '卯', '亥', [{ ...core.pillars.year, earthlyBranch: '卯' }]).some(item => item.id === 'taohua'), false);
assertions++;
console.log(`PASS ${assertions}: 天乙文昌驛馬華蓋表值及倒插桃花回歸；不代表五項神煞完整來源已通過`);
