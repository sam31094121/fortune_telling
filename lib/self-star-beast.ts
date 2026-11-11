import { Lunar } from 'lunar-typescript';
import { runThreeInOne } from './three-in-one';

export type FourGuardianName = '青龍' | '朱雀' | '白虎' | '玄武';
/** 業主 2026-11-12：只從四大神獸（青龍、朱雀、白虎、玄武）四選一，不再配二十八宿本體神獸。 */
const GUARDIAN_BY_ELEMENT: Record<string, { guardian: FourGuardianName; direction: string }> = {
  木: { guardian: '青龍', direction: '東方' }, 火: { guardian: '朱雀', direction: '南方' },
  金: { guardian: '白虎', direction: '西方' }, 水: { guardian: '玄武', direction: '北方' },
};
const STEM_ELEMENT: Record<string, string> = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
// 日主屬土時四象沒有對應的一隻：依「出生月份的季節」寄旺四季（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。
const SEASON_ELEMENT_BY_MONTH_BRANCH: Record<string, string> = { 寅: '木', 卯: '木', 辰: '木', 巳: '火', 午: '火', 未: '火', 申: '金', 酉: '金', 戌: '金', 亥: '水', 子: '水', 丑: '水' };

/** 純函式：八字日柱＋月柱 → 四大神獸之一。每個人一定拿到四隻中的一隻。 */
export function pickFourGuardian(dayPillar: string, monthPillar: string) {
  const dayElement = STEM_ELEMENT[dayPillar[0]];
  if (!dayElement) throw new Error('命盤核對未通過，請確認出生資料。');
  const viaSeason = dayElement === '土';
  const element = viaSeason ? SEASON_ELEMENT_BY_MONTH_BRANCH[monthPillar[1]] : dayElement;
  const picked = element ? GUARDIAN_BY_ELEMENT[element] : undefined;
  if (!picked) throw new Error('命盤核對未通過，請確認出生資料。');
  const reason = viaSeason
    ? `日主屬土，依出生月份的季節歸屬${picked.direction}${picked.guardian}`
    : `日主屬${dayElement}，對應${picked.direction}${picked.guardian}`;
  return { guardian: picked.guardian, element, dayElement, reason };
}

export type SelfStarBeastInput = {
  birthDate?: string;
  gender?: string;
  calendarType?: string;
  birthTime?: string;
  birthHourBranch?: string;
  timeUnknown?: boolean;
};
const HOUR_KEYS = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'];

/** 由八字日柱／月柱（唯一來源 lib/bazi/engine.ts）決定，不是隨機抽。 */
export async function findSelfStarBeast(input: SelfStarBeastInput) {
  if (!input || typeof input !== 'object' || !['male', 'female'].includes(input.gender ?? '')) {
    throw new Error('請補上出生日期與性別。');
  }
  if (input.timeUnknown !== undefined && typeof input.timeUnknown !== 'boolean') throw new Error('請確認時辰是否已知。');
  if (typeof input.birthDate !== 'string' || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(input.birthDate)) {
    throw new Error('請補上有效的出生日期。');
  }
  if (input.calendarType && !['solar', 'lunar'].includes(input.calendarType)) throw new Error('請確認國曆或農曆。');
  const [year, month, day] = input.birthDate.split('-').map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) throw new Error('請確認出生日期。');
  let solarDate = input.birthDate;
  if (input.calendarType === 'lunar') {
    try { solarDate = Lunar.fromYmd(year, month, day).getSolar().toYmd(); }
    catch { throw new Error('請確認農曆日期。'); }
  } else {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new Error('請確認出生日期。');
    }
  }
  const unknown = input.timeUnknown === true || input.birthHourBranch === 'unknown';
  const branch = unknown ? -1 : HOUR_KEYS.indexOf(input.birthHourBranch ?? '');
  const birthTime = unknown || branch >= 0 ? null : input.birthTime || null;
  if (birthTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) throw new Error('請確認出生時間，或選不知道。');
  if (!unknown && input.birthHourBranch && input.birthHourBranch !== 'pending' && branch < 0) throw new Error('請重新選擇出生時辰。');
  if (!unknown && input.birthHourBranch === 'pending') throw new Error('請選擇時辰，或選不知道。');
  const result = await runThreeInOne({
    birthDate: solarDate,
    gender: input.gender as 'male' | 'female',
    birthTime,
    hourBranchIndex: branch < 0 ? null : branch,
  });
  if (result.status !== 'PASSED' && result.status !== 'TIME_UNKNOWN') {
    throw new Error('命盤核對未通過，請確認出生資料。');
  }
  const picked = pickFourGuardian(result.result.bazi.day, result.result.bazi.month);
  return {
    guardian: picked.guardian,
    element: picked.element,
    reason: picked.reason,
    timeUnknown: result.status === 'TIME_UNKNOWN',
    method: '八字日主五行對應四大神獸',
  };
}
