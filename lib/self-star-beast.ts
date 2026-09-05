import { Lunar } from 'lunar-typescript';
import { runThreeInOne } from './three-in-one';
import { deriveBaziPillarBeast } from './bazi-four-pillar-beasts';

export type SelfStarBeastInput = {
  birthDate?: string;
  gender?: string;
  calendarType?: string;
  birthTime?: string;
  birthHourBranch?: string;
  timeUnknown?: boolean;
};
const HOUR_KEYS = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'];

/** Uses the existing verified day-pillar collection mapping, never a random draw. */
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
  const dayPillar = result.result.bazi.day;
  const link = deriveBaziPillarBeast({ key: 'day', label: '日柱', stem: dayPillar[0], branch: dayPillar[1] });
  return {
    beastId: link.beast.id,
    productElement: link.productElement,
    evidence: link.evidence,
    timeUnknown: result.status === 'TIME_UNKNOWN',
    method: '八字日柱收藏對應',
  };
}
