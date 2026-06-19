interface ZodiacRange {
  name: string;
  endMonth: number;
  endDay: number;
}

const ZODIAC_TABLE: ZodiacRange[] = [
  { name: '摩羯座', endMonth: 1, endDay: 19 },
  { name: '水瓶座', endMonth: 2, endDay: 18 },
  { name: '雙魚座', endMonth: 3, endDay: 20 },
  { name: '牡羊座', endMonth: 4, endDay: 19 },
  { name: '金牛座', endMonth: 5, endDay: 20 },
  { name: '雙子座', endMonth: 6, endDay: 21 },
  { name: '巨蟹座', endMonth: 7, endDay: 22 },
  { name: '獅子座', endMonth: 8, endDay: 22 },
  { name: '處女座', endMonth: 9, endDay: 22 },
  { name: '天秤座', endMonth: 10, endDay: 23 },
  { name: '天蠍座', endMonth: 11, endDay: 22 },
  { name: '射手座', endMonth: 12, endDay: 21 },
  { name: '摩羯座', endMonth: 12, endDay: 31 },
];

export function getZodiacSign(birthday: string): string {
  if (!birthday) return '';

  const parts = birthday.split('-');
  if (parts.length !== 3) return '';

  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return '';
  }

  for (const zodiac of ZODIAC_TABLE) {
    if (month < zodiac.endMonth || (month === zodiac.endMonth && day <= zodiac.endDay)) {
      return zodiac.name;
    }
  }

  return '摩羯座';
}
