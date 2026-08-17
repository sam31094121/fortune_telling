import { solarToLunarParts } from './lunar-calendar';

/**
 * 民俗「稱骨／幾兩重」換算表。
 *
 * 以農曆年、月、日與十二時辰各自對應的「錢」相加；10 錢為 1 兩。
 * 這是可重算的傳統命理計量規則，不是統計模型或科學效度分數。
 */
const YEAR_WEIGHTS_QIAN = [
  12, 9, 6, 7, 12, 5, 9, 8, 7, 8,
  15, 9, 16, 8, 8, 19, 12, 6, 8, 7,
  5, 15, 6, 16, 15, 7, 9, 12, 10, 7,
  15, 6, 5, 14, 14, 9, 7, 7, 9, 12,
  8, 7, 13, 5, 14, 5, 9, 17, 5, 7,
  12, 8, 8, 6, 19, 6, 8, 16, 10, 6,
] as const;

const MONTH_WEIGHTS_QIAN = [6, 7, 18, 9, 5, 16, 9, 15, 18, 8, 9, 5] as const;
const DAY_WEIGHTS_QIAN = [5, 10, 8, 15, 16, 15, 8, 16, 8, 16, 9, 17, 8, 17, 10, 8, 9, 18, 5, 15, 10, 9, 8, 9, 15, 18, 7, 8, 16, 6] as const;
const HOUR_WEIGHTS_QIAN = [16, 6, 7, 10, 9, 16, 10, 8, 8, 9, 6, 6] as const;
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export const BONE_WEIGHT_RULE_VERSION = '通行稱骨對照表 v1.0（農曆年・月・日・時四項加總）';

export interface BoneWeightResult {
  totalQian: number;
  liang: number;
  qian: number;
  display: string;
  lunarDateLabel: string;
  components: Array<{ label: string; value: string; qian: number }>;
  isHourEstimated: boolean;
}

function sexagenaryIndex(year: number) {
  return ((year - 4) % 60 + 60) % 60;
}

function formatQian(qian: number) {
  return `${Math.floor(qian / 10)}兩${qian % 10}錢`;
}

export function calculateBoneWeight(birthDate?: string, shichen?: number | 'unknown' | null): BoneWeightResult | null {
  if (!birthDate) return null;
  const lunar = solarToLunarParts(birthDate);
  if (!lunar || lunar.month < 1 || lunar.day < 1 || lunar.day > 30) return null;

  const hourIndex = typeof shichen === 'number' && shichen >= 0 && shichen < 12 ? shichen : 6;
  const ganzhiIndex = sexagenaryIndex(lunar.gregorianYear);
  const yearQian = YEAR_WEIGHTS_QIAN[ganzhiIndex];
  const monthQian = MONTH_WEIGHTS_QIAN[lunar.month - 1];
  const dayQian = DAY_WEIGHTS_QIAN[lunar.day - 1];
  const hourQian = HOUR_WEIGHTS_QIAN[hourIndex];
  const totalQian = yearQian + monthQian + dayQian + hourQian;
  const liang = Math.floor(totalQian / 10);
  const qian = totalQian % 10;
  const hourLabel = ['子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時', '未時', '申時', '酉時', '戌時', '亥時'][hourIndex];

  return {
    totalQian,
    liang,
    qian,
    display: `${liang}兩${qian}錢`,
    lunarDateLabel: `農曆 ${lunar.rocYear} 年 ${lunar.isLeapMonth ? '閏' : ''}${lunar.month} 月 ${lunar.day} 日`,
    components: [
      { label: '年', value: `${HEAVENLY_STEMS[ganzhiIndex % 10]}${EARTHLY_BRANCHES[ganzhiIndex % 12]}年`, qian: yearQian },
      { label: '月', value: `${lunar.isLeapMonth ? '閏' : ''}${lunar.month}月`, qian: monthQian },
      { label: '日', value: `${lunar.day}日`, qian: dayQian },
      { label: '時', value: hourLabel, qian: hourQian },
    ],
    isHourEstimated: typeof shichen !== 'number',
  };
}

export { formatQian };
