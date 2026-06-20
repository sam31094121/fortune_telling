/**
 * 命理引擎：五行、天干、生肖
 * 作為天模型的深層宇宙框架，補充星座與生日層
 */

import type { PersonalityMatrix } from './personality-matrix-engine';

// ─── 天干 ────────────────────────────────────────────────────────────
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
type HeavenlyStem = typeof HEAVENLY_STEMS[number];

// 天干 → 五行
const STEM_TO_WUXING: Record<HeavenlyStem, WuxingElement> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

// 年份 → 天干（1924 年 = 甲子年，4年偏移）
export function getHeavenlyStem(year: number): HeavenlyStem {
  const idx = ((year - 4) % 10 + 10) % 10;
  return HEAVENLY_STEMS[idx];
}

// ─── 五行 ────────────────────────────────────────────────────────────
export type WuxingElement = '木' | '火' | '土' | '金' | '水';

export interface WuxingProfile {
  element: WuxingElement;
  stem: HeavenlyStem;
  color: string;
  musicKey: string;
  moodKeywords: string[];
  lyricKeywords: string[];
  description: string;
}

export const WUXING_PROFILES: Record<WuxingElement, WuxingProfile> = {
  '木': {
    element: '木',
    stem: '甲',
    color: '#4ade80',
    musicKey: 'E major',         // 明亮上升感，象徵生長
    moodKeywords: ['fresh', 'hopeful', 'growing', 'vibrant'],
    lyricKeywords: ['生長', '希望', '破土', '前行', '新芽'],
    description: '木屬之人，充滿生命力與向上的驅動力。音樂帶著清新的生長感，如春風破土。',
  },
  '火': {
    element: '火',
    stem: '丙',
    color: '#f97316',
    musicKey: 'A major',         // 溫暖有力，情感豐沛
    moodKeywords: ['passionate', 'bright', 'intense', 'expressive'],
    lyricKeywords: ['燃燒', '熱情', '光芒', '照耀', '激情'],
    description: '火屬之人，熱情外放，感染力強。音樂如烈火，充滿能量與表達欲。',
  },
  '土': {
    element: '土',
    stem: '戊',
    color: '#ca8a04',
    musicKey: 'C major',         // 穩定中心，大地的厚重
    moodKeywords: ['grounded', 'warm', 'nurturing', 'steady'],
    lyricKeywords: ['根基', '守護', '厚德', '承載', '歸處'],
    description: '土屬之人，沉穩包容，是旁人的依靠。音樂厚實溫暖，有大地般的承載力。',
  },
  '金': {
    element: '金',
    stem: '庚',
    color: '#e2e8f0',
    musicKey: 'D minor',         // 清冽精準，帶有收斂之氣
    moodKeywords: ['clear', 'precise', 'refined', 'structured'],
    lyricKeywords: ['純粹', '清醒', '鋒利', '決斷', '秩序'],
    description: '金屬之人，意志清晰，追求完美。音樂如金屬般精準，有俐落的審美張力。',
  },
  '水': {
    element: '水',
    stem: '壬',
    color: '#38bdf8',
    musicKey: 'B minor',         // 深邃流動，暗藏玄機
    moodKeywords: ['deep', 'fluid', 'mysterious', 'introspective'],
    lyricKeywords: ['流動', '深淵', '智慧', '隱藏', '輪迴'],
    description: '水屬之人，深思善謀，適應力極強。音樂如深水，表面平靜卻暗流洶湧。',
  },
};

// 五行對人格矩陣的加成（作用在天模型層）
export const WUXING_PERSONALITY_ADJUST: Record<WuxingElement, Partial<PersonalityMatrix>> = {
  '木': { creativity: 8, risk: 5, social: 4, leadership: 3, security: -2 },
  '火': { emotion: 9, leadership: 7, social: 6, creativity: 5, logic: -3 },
  '土': { security: 9, attachment: 7, logic: 4, emotion: 3, risk: -4 },
  '金': { logic: 9, leadership: 5, security: 5, creativity: -2, risk: -3 },
  '水': { creativity: 8, emotion: 7, logic: 6, risk: 4, social: -2 },
};

// 月份五行（以節氣為準，簡化版）
const MONTH_WUXING: Record<number, WuxingElement> = {
  1: '木', 2: '木',      // 寅卯：春木
  3: '火', 4: '火',      // 辰巳：初夏火
  5: '土', 6: '土',      // 午未：夏土
  7: '金', 8: '金',      // 申酉：秋金
  9: '水', 10: '水',     // 戌亥：深秋水
  11: '木', 12: '木',    // 子丑：冬末木萌
};

export function getYearWuxing(year: number): WuxingElement {
  const stem = getHeavenlyStem(year);
  return STEM_TO_WUXING[stem];
}

export function getMonthWuxing(month: number): WuxingElement {
  return MONTH_WUXING[month] ?? '土';
}

// 年月五行融合（年主，月輔）
export function getFusedWuxing(
  yearWuxing: WuxingElement,
  monthWuxing: WuxingElement,
): WuxingElement {
  // 同五行則強化，不同取年主
  return yearWuxing === monthWuxing ? yearWuxing : yearWuxing;
}

// ─── 生肖 ────────────────────────────────────────────────────────────
export type ChineseZodiacAnimal =
  | '鼠' | '牛' | '虎' | '兔' | '龍' | '蛇'
  | '馬' | '羊' | '猴' | '雞' | '狗' | '豬';

export interface ZodiacAnimalProfile {
  animal: ChineseZodiacAnimal;
  wuxing: WuxingElement;
  musicGenreTendency: string;
  personalityBoost: Partial<PersonalityMatrix>;
  trait: string;
  musicTrait: string;
}

export const ZODIAC_ANIMAL_PROFILES: Record<ChineseZodiacAnimal, ZodiacAnimalProfile> = {
  '鼠': {
    animal: '鼠', wuxing: '水',
    musicGenreTendency: 'jazz, soul',
    personalityBoost: { logic: 8, social: 6, creativity: 6, leadership: 4 },
    trait: '機敏好學，隨機應變，洞察人心',
    musicTrait: '喜歡有層次感、即興性強的音樂',
  },
  '牛': {
    animal: '牛', wuxing: '土',
    musicGenreTendency: 'classical, country',
    personalityBoost: { security: 10, logic: 7, leadership: 6, attachment: 5 },
    trait: '踏實耐力，意志堅定，值得信賴',
    musicTrait: '偏好結構穩定、旋律厚重的音樂',
  },
  '虎': {
    animal: '虎', wuxing: '木',
    musicGenreTendency: 'rock, hip-hop',
    personalityBoost: { leadership: 10, risk: 9, emotion: 6, creativity: 5 },
    trait: '勇猛果決，天生王者，不畏挑戰',
    musicTrait: '需要能量強勁、節奏明確的音樂',
  },
  '兔': {
    animal: '兔', wuxing: '木',
    musicGenreTendency: 'indie folk, ambient',
    personalityBoost: { creativity: 9, attachment: 8, emotion: 7, security: 5 },
    trait: '溫柔細膩，審美出眾，善解人意',
    musicTrait: '被溫柔、細膩、有意境的音樂吸引',
  },
  '龍': {
    animal: '龍', wuxing: '土',
    musicGenreTendency: 'cinematic, epic',
    personalityBoost: { leadership: 10, creativity: 8, social: 7, risk: 6 },
    trait: '氣勢磅礴，充滿魅力，命格非凡',
    musicTrait: '偏好有史詩感、宏大編排的音樂',
  },
  '蛇': {
    animal: '蛇', wuxing: '火',
    musicGenreTendency: 'R&B, dark pop',
    personalityBoost: { logic: 9, creativity: 8, emotion: 7, security: 5 },
    trait: '深謀遠慮，神秘魅力，直覺精準',
    musicTrait: '被有深度、性感、神秘感的音樂吸引',
  },
  '馬': {
    animal: '馬', wuxing: '火',
    musicGenreTendency: 'pop, dance',
    personalityBoost: { social: 9, risk: 8, leadership: 6, creativity: 5 },
    trait: '活潑奔放，追求自由，行動力強',
    musicTrait: '喜歡節奏感強、讓人想動起來的音樂',
  },
  '羊': {
    animal: '羊', wuxing: '土',
    musicGenreTendency: 'new age, acoustic',
    personalityBoost: { creativity: 9, attachment: 9, emotion: 7, security: 5 },
    trait: '溫柔善良，富有藝術天賦，內心豐富',
    musicTrait: '對有溫度、有情感層次的音樂極度敏感',
  },
  '猴': {
    animal: '猴', wuxing: '金',
    musicGenreTendency: 'funk, experimental',
    personalityBoost: { creativity: 9, social: 9, logic: 7, risk: 6 },
    trait: '聰慧靈活，才思敏捷，適應力極強',
    musicTrait: '喜歡出乎意料、充滿玩心的音樂',
  },
  '雞': {
    animal: '雞', wuxing: '金',
    musicGenreTendency: 'classical, musical',
    personalityBoost: { logic: 9, leadership: 7, security: 7, social: 5 },
    trait: '條理分明，盡善盡美，敏銳觀察',
    musicTrait: '重視音樂的精準性與技術性',
  },
  '狗': {
    animal: '狗', wuxing: '土',
    musicGenreTendency: 'folk, blues',
    personalityBoost: { attachment: 10, security: 8, logic: 6, social: 5 },
    trait: '忠誠義氣，正義感強，值得依賴',
    musicTrait: '被真實、有靈魂、有情感的音樂打動',
  },
  '豬': {
    animal: '豬', wuxing: '水',
    musicGenreTendency: 'soul, love songs',
    personalityBoost: { emotion: 9, attachment: 8, social: 7, creativity: 6 },
    trait: '純樸善良，慷慨大方，內心富足',
    musicTrait: '天生對溫暖、真摯的情感音樂有共鳴',
  },
};

const ZODIAC_SEQUENCE: ChineseZodiacAnimal[] = [
  '鼠', '牛', '虎', '兔', '龍', '蛇',
  '馬', '羊', '猴', '雞', '狗', '豬',
];

export function getChineseZodiac(year: number): ChineseZodiacAnimal {
  // 1900 = 庚子年 = 鼠
  const idx = ((year - 1900) % 12 + 12) % 12;
  return ZODIAC_SEQUENCE[idx];
}

// ─── 主函數 ────────────────────────────────────────────────────────────
export interface DestinyProfile {
  heavenlyStem: HeavenlyStem;
  yearWuxing: WuxingElement;
  monthWuxing: WuxingElement;
  dominantWuxing: WuxingElement;
  wuxingProfile: WuxingProfile;
  chineseZodiac: ChineseZodiacAnimal;
  zodiacProfile: ZodiacAnimalProfile;
  personalityAdjust: Partial<PersonalityMatrix>;
}

export function computeDestinyProfile(birthDate: string): DestinyProfile {
  const [yearStr, monthStr] = birthDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const heavenlyStem = getHeavenlyStem(year);
  const yearWuxing = getYearWuxing(year);
  const monthWuxing = getMonthWuxing(month);
  const dominantWuxing = getFusedWuxing(yearWuxing, monthWuxing);
  const wuxingProfile = WUXING_PROFILES[dominantWuxing];
  const chineseZodiac = getChineseZodiac(year);
  const zodiacProfile = ZODIAC_ANIMAL_PROFILES[chineseZodiac];

  // 融合五行 + 生肖的人格調整
  const wuxingAdj = WUXING_PERSONALITY_ADJUST[dominantWuxing];
  const zodiacAdj = zodiacProfile.personalityBoost;

  const personalityAdjust: Partial<PersonalityMatrix> = {};
  const keys: (keyof PersonalityMatrix)[] = [
    'emotion', 'logic', 'social', 'leadership', 'security', 'creativity', 'risk', 'attachment',
  ];
  for (const key of keys) {
    const w = (wuxingAdj[key] ?? 0) * 0.6; // 五行60%
    const z = (zodiacAdj[key] ?? 0) * 0.4;  // 生肖40%
    const total = w + z;
    if (total !== 0) personalityAdjust[key] = Math.round(total);
  }

  return {
    heavenlyStem,
    yearWuxing,
    monthWuxing,
    dominantWuxing,
    wuxingProfile,
    chineseZodiac,
    zodiacProfile,
    personalityAdjust,
  };
}
