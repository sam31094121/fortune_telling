interface ZodiacRange {
  nameZh: string;
  nameEn: string;
  endMonth: number;
  endDay: number;
}

const ZODIAC_TABLE: ZodiacRange[] = [
  { nameZh: '摩羯座', nameEn: 'Capricorn', endMonth: 1, endDay: 19 },
  { nameZh: '水瓶座', nameEn: 'Aquarius', endMonth: 2, endDay: 18 },
  { nameZh: '雙魚座', nameEn: 'Pisces', endMonth: 3, endDay: 20 },
  { nameZh: '牡羊座', nameEn: 'Aries', endMonth: 4, endDay: 19 },
  { nameZh: '金牛座', nameEn: 'Taurus', endMonth: 5, endDay: 20 },
  { nameZh: '雙子座', nameEn: 'Gemini', endMonth: 6, endDay: 20 },
  { nameZh: '巨蟹座', nameEn: 'Cancer', endMonth: 7, endDay: 22 },
  { nameZh: '獅子座', nameEn: 'Leo', endMonth: 8, endDay: 22 },
  { nameZh: '處女座', nameEn: 'Virgo', endMonth: 9, endDay: 22 },
  { nameZh: '天秤座', nameEn: 'Libra', endMonth: 10, endDay: 23 },
  { nameZh: '天蠍座', nameEn: 'Scorpio', endMonth: 11, endDay: 22 },
  { nameZh: '射手座', nameEn: 'Sagittarius', endMonth: 12, endDay: 21 },
  { nameZh: '摩羯座', nameEn: 'Capricorn', endMonth: 12, endDay: 31 },
];

function getZodiacEntry(birthday: string) {
  if (!birthday) return null;

  const parts = birthday.split('-');
  if (parts.length !== 3) return null;

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
    return null;
  }

  return (
    ZODIAC_TABLE.find(
      (zodiac) => month < zodiac.endMonth || (month === zodiac.endMonth && day <= zodiac.endDay),
    ) ?? ZODIAC_TABLE[0]
  );
}

export function getZodiacSign(birthday: string): string {
  return getZodiacEntry(birthday)?.nameZh ?? '';
}

export function getZodiacEnglishName(birthday: string): string {
  return getZodiacEntry(birthday)?.nameEn ?? 'Aries';
}
