import type { BaziBirthInput, BaziProfessionalResult } from './bazi/engine';

/** Reuse is limited to the same exact Taiwan-standard solar input, not caller flags. */
export function assertReusableExactBaziCore(input: BaziBirthInput, core: BaziProfessionalResult): void {
  const sameDate = (a: string, b: string) => a.trim().split(/[-/]/).map(Number).join('-') === b.trim().split(/[-/]/).map(Number).join('-');
  const taipei = (value?: string) => !value || value === 'Asia/Taipei' || value === 'Asia/Taipei (UTC+8, STANDARD_TIME)';
  if ((input.calendarType ?? 'SOLAR') !== 'SOLAR' || (core.input.calendarType ?? 'SOLAR') !== 'SOLAR'
    || !input.birthTimeKnown || input.traditionalHour || !input.birthTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.birthTime)
    || core.timePrecision !== 'EXACT_TIME' || core.chartMode !== 'FULL_BAZI' || !core.verification.readyForInterpretation
    || core.pillars.hour === 'UNKNOWN' || !core.input.birthTimeKnown || core.input.traditionalHour
    || input.gender !== core.input.gender || !sameDate(input.birthDate, core.input.birthDate)
    || !sameDate(input.birthDate, core.calendar.solarDate) || input.birthTime !== core.input.birthTime
    || core.calendar.normalizedDateTime.slice(11, 16) !== input.birthTime
    || !taipei(input.timezone) || !taipei(core.input.timezone) || !taipei(core.calendar.timezone)) {
    throw new Error('命盤與本次出生資料不一致，暫不提供結果。');
  }
}
