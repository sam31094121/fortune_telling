// 星座計算：由生日推算十二星座
// 前端即時顯示、後端組 prompt 時都會用到，集中在此處維護單一來源

/** 星座資料：名稱 + 該星座的「結束日」邊界 */
interface ZodiacRange {
  name: string;
  // 此星座的最後一天（含）：[month, day]
  endMonth: number;
  endDay: number;
}

// 依日期由早到晚排列。摩羯座橫跨年末年初，故出現在頭尾兩處。
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

/**
 * 由生日字串（YYYY-MM-DD）回傳星座名稱。
 * 解析失敗時回傳空字串，呼叫端可據此判斷輸入是否有效。
 */
export function getZodiacSign(birthday: string): string {
  if (!birthday) return '';

  const parts = birthday.split('-');
  if (parts.length !== 3) return '';

  const month = Number(parts[1]);
  const day = Number(parts[2]);

  // 防禦：非數字或超出合理範圍直接視為無效
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

  // 找出第一個「日期 <= 該星座結束邊界」的星座
  for (const zodiac of ZODIAC_TABLE) {
    if (
      month < zodiac.endMonth ||
      (month === zodiac.endMonth && day <= zodiac.endDay)
    ) {
      return zodiac.name;
    }
  }

  return '摩羯座'; // 理論上不會走到，保底回傳
}
