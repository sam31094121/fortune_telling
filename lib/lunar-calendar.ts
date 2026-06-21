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

const MONTH_MAP: Record<string, number> = {
  正月: 1,
  一月: 1,
  二月: 2,
  三月: 3,
  四月: 4,
  五月: 5,
  六月: 6,
  七月: 7,
  八月: 8,
  九月: 9,
  十月: 10,
  冬月: 11,
  十一月: 11,
  臘月: 12,
  十二月: 12,
};

const lunarFormatter = new Intl.DateTimeFormat('zh-Hant-TW-u-ca-chinese', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getPartValue(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find((part) => String(part.type) === type)?.value ?? '';
}

function normalizeMonth(rawMonth: string) {
  const isLeapMonth = rawMonth.includes('閏');
  const monthKey = rawMonth.replace('閏', '');
  const month = MONTH_MAP[monthKey];

  return {
    month,
    isLeapMonth,
  };
}

export function solarToLunarParts(solarDate: string): LunarParts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(solarDate)) return null;

  const date = new Date(`${solarDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const [solarYear, solarMonth, solarDay] = solarDate.split('-').map(Number);
  if (
    date.getFullYear() !== solarYear
    || date.getMonth() !== solarMonth - 1
    || date.getDate() !== solarDay
  ) return null;

  const parts = lunarFormatter.formatToParts(date);
  const relatedYear = Number(getPartValue(parts, 'relatedYear') || NaN);
  const rawMonth = getPartValue(parts, 'month');
  const day = Number(getPartValue(parts, 'day') || NaN);
  const { month, isLeapMonth } = normalizeMonth(rawMonth);

  if (!relatedYear || !month || !day) return null;

  return {
    gregorianYear: relatedYear,
    rocYear: relatedYear - 1911,
    month,
    day,
    isLeapMonth,
  };
}

export function lunarToSolar(input: LunarInput): LunarResolved | null {
  const gregorianYear = input.rocYear + 1911;

  if (input.rocYear <= 0 || input.month < 1 || input.month > 12 || input.day < 1 || input.day > 30) {
    return null;
  }

  const start = new Date(gregorianYear, 0, 1);
  const end = new Date(gregorianYear + 1, 2, 1);

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const parts = lunarFormatter.formatToParts(cursor);
    const relatedYear = Number(getPartValue(parts, 'relatedYear') || NaN);
    const rawMonth = getPartValue(parts, 'month');
    const day = Number(getPartValue(parts, 'day') || NaN);
    const { month, isLeapMonth } = normalizeMonth(rawMonth);

    if (
      relatedYear === gregorianYear &&
      month === input.month &&
      day === input.day &&
      Boolean(isLeapMonth) === Boolean(input.isLeapMonth)
    ) {
      return {
        solarDate: toIsoDate(cursor),
        gregorianYear,
      };
    }
  }

  return null;
}
