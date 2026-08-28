import { BRANCHES, createBaziCore, type Element } from './bazi/engine';
import type { NameologyAnalysis } from './nameology-engine';
import type { Gender } from './types';

export function normalizeNameologyShichen(value: unknown): number | null {
  if (value === undefined || value === null || value === 'unknown') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 11) {
    throw new Error('出生時辰請選擇十二時辰之一，或選擇不知道。');
  }
  return value;
}

/** Structural comparison only; counts are not a useful-god diagnosis or a luck score. */
export function buildNameologyBaziCrossCheck(
  input: { name: string; birthDate: string; gender: Gender; shichen?: number | null },
  characters: Pick<NameologyAnalysis, 'characters'>['characters'],
) {
  const shichen = normalizeNameologyShichen(input.shichen);
  const core = createBaziCore({
    name: input.name, birthDate: input.birthDate, gender: input.gender,
    calendarType: 'SOLAR', timezone: 'Asia/Taipei',
    birthTimeKnown: shichen !== null,
    ...(shichen !== null ? { traditionalHour: BRANCHES[shichen] } : {}),
  });
  if (!core.verification.readyForInterpretation) throw new Error('八字資料未通過驗證，請核對出生資料。');
  const elements: Element[] = ['木', '火', '土', '金', '水'];
  const comparison = elements.map(element => ({
    element,
    nameCharacters: characters.filter(character => character.element === element).map(character => character.char),
    baziCount: core.fiveElements.rawCount[element],
  }));
  return {
    version: 'nameology-bazi-v1', chartMode: core.chartMode, timePrecision: core.timePrecision,
    shichen, timezone: 'Asia/Taipei', engine: core.engine,
    pillars: {
      year: core.pillars.year.ganZhi, month: core.pillars.month.ganZhi,
      day: core.pillars.day.ganZhi,
      hour: core.pillars.hour === 'UNKNOWN' ? null : core.pillars.hour.ganZhi,
    },
    dayMaster: core.dayMaster, comparison,
    summary: shichen === null
      ? '未提供出生時辰：已建立年月日三柱與姓名五行對照，時柱不推定。'
      : `已採用${BRANCHES[shichen]}時：建立完整四柱，將時柱納入姓名五行對照。`,
    limitation: '依臺灣標準時間與既有八字規則計算。這是姓名字義五行與命盤五行的結構對照，不以缺少某元素直接判定喜用神或改名吉凶；資料完整不代表預測保證更準。未知時辰及節氣、換日邊界須保留時間不確定性。',
  };
}

export type NameologyBaziCrossCheck = ReturnType<typeof buildNameologyBaziCrossCheck>;
