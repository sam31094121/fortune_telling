// 流年單一神煞：男命逆、女命順（業主定案 2026-11-26）。兩張紙本命盤當標準答案。
import assert from 'node:assert/strict';
import { calculateDualChart } from '../lib/dual-chart';

const names = (birthDate: string, birthTime: string, gender: 'male' | 'female') => {
  const r = calculateDualChart({ birthDate, birthTime, gender, calendarType: 'solar', timezone: 'Asia/Taipei' });
  return r.annual.map(a => `${a.year}${a.annualShenSha?.name ?? '無'}`);
};

// 紙本一：1974-06-28 18:00 男（甲寅年）流年 2026–2034（2026 白虎、2027 龍德、2028 歲破、2029 死符、2030 五鬼、2031 太陰、2032 喪門、2033 太陽、2034 太歲）
const male = names('1974-06-28', '18:00', 'male');
assert.deepEqual(male.slice(0, 9), ['2026白虎', '2027龍德', '2028歲破', '2029死符', '2030五鬼', '2031太陰', '2032喪門', '2033太陽', '2034太歲'], 'paper 1974 male');

// 紙本二：1987-08-12 08:00 女（丁卯年）流年 2026–2029（太陰、五鬼、小耗＝本站死符、歲破）
const female = names('1987-08-12', '08:00', 'female');
assert.deepEqual(female.slice(0, 4), ['2026太陰', '2027五鬼', '2028死符', '2029歲破'], 'paper 1987 female');
assert.equal(female[9], '2035太歲', '2035 乙卯年＝本命年支 → 太歲');

console.log('annual shensha paper golden: ok');

// 農曆閏月要寫繁體「閏」，不得出現簡體「闰」（1987-08-12 ＝ 農曆閏六月十八）。
{
  const r = calculateDualChart({ birthDate: '1987-08-12', birthTime: '08:00', gender: 'female', calendarType: 'solar', timezone: 'Asia/Taipei' });
  const lunarDate = (r.bazi.professionalChart as { calendar?: { lunarDate?: string } }).calendar?.lunarDate ?? '';
  assert.ok(lunarDate.includes('閏六月') && !lunarDate.includes('闰'), `lunar date shows 閏: ${lunarDate}`);
  console.log('lunar leap month traditional char: ok');
}

// 旺衰、格局、喜用忌（本派固定取法：同黨占比法、透干取格；2026-11-26）。紙本 1987-08-12 08:00 女：身弱、正官格、喜用水金、忌火土。
{
  const r = calculateDualChart({ birthDate: '1987-08-12', birthTime: '08:00', gender: 'female', calendarType: 'solar', timezone: 'Asia/Taipei' });
  const pc = r.bazi.professionalChart as any;
  assert.equal(pc.strengthAnalysis.verdict, '偏弱', '1987 female: 身弱');
  assert.equal(pc.structurePattern.primaryPattern, '正官格', '1987 female: 月令申藏戊透月干→正官格');
  assert.deepEqual([pc.gods.joyGod, pc.gods.usefulGod], ['水', '金'], '1987 female: 喜用水金');
  assert.equal(pc.gods.avoidGod, '火', '1987 female: 忌神含火（紙本火土，本站五神定義另列仇神木、閒神土）');
  // 紙本一：1974-06-28 18:00 男——偏弱、正官格（既有參考：喜金、用土、忌木）
  const m = calculateDualChart({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' });
  const mp = m.bazi.professionalChart as any;
  assert.deepEqual([mp.strengthAnalysis.verdict, mp.structurePattern.primaryPattern, mp.gods.joyGod, mp.gods.usefulGod, mp.gods.avoidGod], ['偏弱', '正官格', '金', '土', '木'], '1974 male paper');
  console.log('strength / pattern / gods vs paper: ok');
}
