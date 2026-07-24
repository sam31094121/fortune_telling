import { SolarTime } from 'tyme4ts';

export interface LunarInput {
  rocYear: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
}

export interface LunarResolved {
  solarDate: string;
  gregorianYear: number;
}

export interface LunarParts extends LunarInput {
  gregorianYear: number;
}

export type CalendarInputMode = 'solar' | 'lunar';

export interface NormalizedCalendarResult {
  mode: CalendarInputMode;
  solarDate: string;
  solar: {
    gregorianYear: number;
    rocYear: number;
    month: number;
    day: number;
  };
  lunar: LunarParts;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function createNoonDate(gregorianYear: number, month: number, day: number) {
  return new Date(gregorianYear, month - 1, day, 12, 0, 0);
}

function isValidSolarDateParts(gregorianYear: number, month: number, day: number) {
  const date = createNoonDate(gregorianYear, month, day);
  return (
    !Number.isNaN(date.getTime())
    && date.getFullYear() === gregorianYear
    && date.getMonth() === month - 1
    && date.getDate() === day
  );
}

function solarToLunarPartsByCore(gregorianYear: number, month: number, day: number): LunarParts | null {
  try {
    const lunarHour = SolarTime.fromYmdHms(gregorianYear, month, day, 12, 0, 0).getLunarHour();
    const lunarDay = lunarHour.getLunarDay();
    const lunarMonth = lunarDay.getLunarMonth();
    const lunarYear = lunarMonth.getLunarYear();
    const lunarGregorianYear = lunarYear.getYear();
    const lunarMonthNumber = Math.abs(lunarMonth.getMonth());
    const lunarDayNumber = lunarDay.getDay();

    if (!lunarGregorianYear || !lunarMonthNumber || !lunarDayNumber) return null;

    return {
      gregorianYear: lunarGregorianYear,
      rocYear: lunarGregorianYear - 1911,
      month: lunarMonthNumber,
      day: lunarDayNumber,
      isLeapMonth: lunarMonth.isLeap(),
    };
  } catch {
    return null;
  }
}

export function resolveRocSolarDate(rocYear: number, month: number, day: number) {
  const gregorianYear = rocYear + 1911;
  if (rocYear <= 0 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (!isValidSolarDateParts(gregorianYear, month, day)) return null;
  return toIsoDate(createNoonDate(gregorianYear, month, day));
}

export function solarToLunarParts(solarDate: string): LunarParts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(solarDate)) return null;
  const [solarYear, solarMonth, solarDay] = solarDate.split('-').map(Number);
  if (!isValidSolarDateParts(solarYear, solarMonth, solarDay)) return null;
  return solarToLunarPartsByCore(solarYear, solarMonth, solarDay);
}

export function lunarToSolar(input: LunarInput): LunarResolved | null {
  const gregorianYear = input.rocYear + 1911;
  if (input.rocYear <= 0 || input.month < 1 || input.month > 12 || input.day < 1 || input.day > 30) return null;

  const start = new Date(gregorianYear, 0, 1, 12, 0, 0);
  const end = new Date(gregorianYear + 1, 2, 1, 12, 0, 0);

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const lunar = solarToLunarParts(toIsoDate(cursor));
    if (
      lunar?.gregorianYear === gregorianYear
      && lunar.month === input.month
      && lunar.day === input.day
      && Boolean(lunar.isLeapMonth) === Boolean(input.isLeapMonth)
    ) {
      return { solarDate: toIsoDate(cursor), gregorianYear: cursor.getFullYear() };
    }
  }

  return null;
}

export function normalizeCalendarInput(mode: CalendarInputMode, input: LunarInput): NormalizedCalendarResult | null {
  if (mode === 'solar') {
    const solarDate = resolveRocSolarDate(input.rocYear, input.month, input.day);
    if (!solarDate) return null;
    const lunar = solarToLunarParts(solarDate);
    if (!lunar) return null;
    return {
      mode,
      solarDate,
      solar: {
        gregorianYear: input.rocYear + 1911,
        rocYear: input.rocYear,
        month: input.month,
        day: input.day,
      },
      lunar,
    };
  }

  const resolvedSolar = lunarToSolar(input);
  if (!resolvedSolar) return null;
  const lunar = solarToLunarParts(resolvedSolar.solarDate);
  if (!lunar) return null;
  return {
    mode,
    solarDate: resolvedSolar.solarDate,
    solar: {
      gregorianYear: resolvedSolar.gregorianYear,
      rocYear: resolvedSolar.gregorianYear - 1911,
      month: Number(resolvedSolar.solarDate.slice(5, 7)),
      day: Number(resolvedSolar.solarDate.slice(8, 10)),
    },
    lunar,
  };
}