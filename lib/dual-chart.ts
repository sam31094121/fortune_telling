import { createBaziCore, calculateTenGod, HIDDEN_STEM_DICTIONARY, STEM_YINYANG, type Stem, type Branch } from './bazi/engine';
import { Solar } from 'lunar-typescript';
import { createZiweiCore, createZiweiAstrolabe, hourToTimeIndex } from './ziwei/engine';
import { analyzeBazi } from './bazi-engine';
import { attachBaziProfessionalCoreV5, type BaziRuntimeInput } from './bazi-professional-result-v5';

export function calculateDualChart(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('請填寫出生資料。');
  const input = body as Record<string, unknown>;
  if (input.calendarType !== 'solar' || input.timezone !== 'Asia/Taipei') throw new Error('基礎版僅支援國曆及台灣標準時間（UTC+8）。');
  if (input.gender !== 'male' && input.gender !== 'female') throw new Error('請選擇排盤性別。');
  if (typeof input.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) throw new Error('請填寫完整國曆出生日期。');
  const [y, m, d] = input.birthDate.split('-').map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  if (y < 1901 || check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d || input.birthDate > today) throw new Error('請輸入 1901 年起至今天的有效出生日期。');
  if (input.timeUnknown === true || input.birthHourBranch === 'unknown' || input.birthHourBranch === 'pending' || typeof input.birthTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.birthTime)) throw new Error('請補齊出生時辰，才能排出完整八字與紫微命盤。');
  const bazi = createBaziCore({ birthDate: input.birthDate, birthTime: input.birthTime, birthTimeKnown: true, gender: input.gender, calendarType: 'SOLAR', timezone: 'Asia/Taipei (UTC+8, STANDARD_TIME)' });
  const ziwei = createZiweiCore({ date: input.birthDate, calendarType: 'solar', gender: input.gender === 'male' ? '男' : '女', timeIndex: hourToTimeIndex(Number(input.birthTime.slice(0, 2))) });
  if (!ziwei.validation.passed || !bazi.verification.pillarsVerified || !bazi.verification.calendarVerified) throw new Error('命盤結構驗證未通過，請重新核對出生資料。');
  const runtimeInput: BaziRuntimeInput = { name: typeof input.name === 'string' ? input.name.slice(0, 60) : '', gender: input.gender, birthDate: input.birthDate, birthTime: input.birthTime, country: '台灣', city: '台北', calendarType: 'solar' };
  const professional = attachBaziProfessionalCoreV5(analyzeBazi(runtimeInput), runtimeInput);
  const raw = createZiweiAstrolabe(ziwei.birthInput);
  const periods = raw.palaces.map(palace => ({ branch: String(palace.earthlyBranch), range: palace.decadal?.range ?? [], stage: String(palace.changsheng12 ?? ''), ages: [...palace.ages], boshi: String(palace.boshi12), suiqian: String(palace.suiqian12), jiangqian: String(palace.jiangqian12) }));
  // Read the existing calendar library at mid-year, after Li Chun. No new annual algorithm.
  const startYear = Number(today.slice(0, 4));
  const annual = Array.from({ length: 15 }, (_, index) => {
    const year = startYear + index;
    const lunar = Solar.fromYmd(year, 7, 1).getLunar();
    const stem = lunar.getYearGanByLiChun() as Stem;
    const branch = lunar.getYearZhiByLiChun() as Branch;
    return { year, age: year - y + 1, ganzhi: lunar.getYearInGanZhiByLiChun(), stemGod: calculateTenGod(bazi.dayMaster.stem, stem), branchGod: calculateTenGod(bazi.dayMaster.stem, HIDDEN_STEM_DICTIONARY[branch].primary) };
  });
  const ziweiProfile = { polarity: STEM_YINYANG[raw.chineseDate[0] as Stem] ?? '', zodiac: raw.zodiac };
  return { bazi: { input: professional.input, professionalChart: professional.professionalChart, luckCycles: professional.luckCycles }, core: bazi, annual, ziwei, periods, ziweiProfile };
}
export type DualChartResult = ReturnType<typeof calculateDualChart>;
