/**
 * 鬼魅阿修羅 - 流年運算引擎
 *
 * 職責：
 * - 計算過去/現在/未來三個時段的命理數據
 * - 基於十天干十二地支的五行特性
 * - 產出幸運指數和主導能量
 * - 純計算，不產話術
 */

import { TimelineCard, GhostAsuraTimelineResponse } from './types/ghost-asura-timeline';

/** 天干五行對應 */
const STEM_ELEMENTS: Record<string, string> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
};

/** 地支五行對應 */
const BRANCH_ELEMENTS: Record<string, string> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
};

/** 十天干循環 */
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 十二地支循環 */
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 五行生克關係 */
const ELEMENT_FORTUNE: Record<string, Record<string, number>> = {
  木: { 木: 70, 火: 85, 土: 40, 金: 25, 水: 65 },
  火: { 木: 80, 火: 75, 土: 60, 金: 30, 水: 35 },
  土: { 木: 45, 火: 70, 土: 70, 金: 65, 水: 50 },
  金: { 木: 25, 火: 35, 土: 70, 金: 75, 水: 85 },
  水: { 木: 75, 火: 40, 土: 50, 金: 85, 水: 70 },
};

/** 主星對應（簡化版本，實際應更詳細） */
const CHIEF_STARS: Record<string, string> = {
  甲: '貴人',
  乙: '柔和',
  丙: '熱情',
  丁: '細膩',
  戊: '務實',
  己: '靈活',
  庚: '剛正',
  辛: '優雅',
  壬: '聰慧',
  癸: '沉靜',
};

/**
 * 獲取年干支（簡化版本）
 * 實際應用應該使用真實的農曆計算
 */
function getYearGanZhi(year: number): { stem: string; branch: string } {
  // 簡化算法：基於西元年份推算
  const stemIndex = (year - 4) % 10; // 西元 4 年是甲子年
  const branchIndex = (year - 4) % 12;

  return {
    stem: STEMS[stemIndex],
    branch: BRANCHES[branchIndex],
  };
}

/**
 * 計算元素的幸運指數（0-100）
 */
function calculateFortuneLevel(
  dayMasterElement: string,
  yearElement: string
): number {
  const baseScore = ELEMENT_FORTUNE[dayMasterElement]?.[yearElement] ?? 50;
  // 添加隨機波動（±10%）
  const variation = Math.random() * 20 - 10;
  return Math.max(0, Math.min(100, Math.round(baseScore + variation)));
}

/**
 * 計算單一時段的卡片數據
 */
function calculateTimelinePeriod(
  period: 'past' | 'present' | 'future',
  userBirthDate: string,
  userDayMasterElement: string
): TimelineCard {
  // 計算時段年份
  const birthYear = parseInt(userBirthDate.split('-')[0]);
  const currentYear = new Date().getFullYear();
  let targetYear = currentYear;

  if (period === 'past') {
    targetYear = currentYear - 1;
  } else if (period === 'future') {
    targetYear = currentYear + 1;
  }

  // 獲取年干支
  const { stem, branch } = getYearGanZhi(targetYear);
  const yearGanZhi = `${stem}${branch}`;

  // 計算五行
  const stemElement = STEM_ELEMENTS[stem] || '土';
  const branchElement = BRANCH_ELEMENTS[branch] || '水';
  const dominantElement = stemElement; // 主要以天干為主

  // 計算幸運指數
  const fortuneLevel = calculateFortuneLevel(userDayMasterElement, dominantElement);

  // 獲取主星
  const chiefStar = CHIEF_STARS[stem] || '神秘';

  // 視覺配置
  let themeColor = '#d4af37'; // 預設金色
  let icon = '🔥';
  let intensity: 'low' | 'medium' | 'high' = 'medium';

  if (period === 'past') {
    if (fortuneLevel > 70) {
      themeColor = '#52c41a'; // 綠色：過去的成長
      icon = '📜';
    } else if (fortuneLevel < 40) {
      themeColor = '#faad14'; // 橙色：過去的挑戰
      icon = '😔';
    } else {
      icon = '📜';
    }
    intensity = fortuneLevel > 70 ? 'high' : fortuneLevel > 40 ? 'medium' : 'low';
  } else if (period === 'present') {
    themeColor = '#e63946'; // 紅色：現在的戰鬥
    icon = '🔥';
    intensity = fortuneLevel > 60 ? 'high' : 'medium';
  } else if (period === 'future') {
    if (fortuneLevel > 70) {
      themeColor = '#ffd700'; // 金色：未來的機遇
      icon = '✨';
    } else {
      themeColor = '#d4af37';
      icon = '🌟';
    }
    intensity = fortuneLevel > 70 ? 'high' : 'medium';
  }

  return {
    period,
    periodName:
      period === 'past'
        ? `過去（${targetYear}年）`
        : period === 'present'
          ? `現在（${targetYear}年）`
          : `未來（${targetYear}年）`,
    calculation: {
      yearGanZhi,
      dominantElement,
      chiefStar,
      fortuneLevel,
    },
    visual: {
      themeColor,
      icon,
      intensity,
    },
  };
}

/**
 * 計算整體趨勢
 */
function calculateOverallTrend(
  pastFortune: number,
  presentFortune: number,
  futureFortune: number
): {
  trajectory: 'ascending' | 'descending' | 'cyclical';
  keyTheme: string;
  actionHint: string;
} {
  // 計算趨勢
  const pastToPresent = presentFortune - pastFortune;
  const presentToFuture = futureFortune - presentFortune;

  let trajectory: 'ascending' | 'descending' | 'cyclical';
  let keyTheme: string;
  let actionHint: string;

  if (pastToPresent > 10 && presentToFuture > 10) {
    // 持續上升
    trajectory = 'ascending';
    keyTheme = '突破期';
    actionHint = '抓住機遇，不要猶豫。每一次行動都在為未來鋪路。';
  } else if (pastToPresent < -10 && presentToFuture < -10) {
    // 持續下降
    trajectory = 'descending';
    keyTheme = '沉澱期';
    actionHint = '下降不是失敗，而是為下一次起跳做準備。用這段時間看清自己想要什麼。';
  } else {
    // 循環或波動
    trajectory = 'cyclical';
    keyTheme = '轉化期';
    actionHint = '在反覆中看清真相，在循環中找到突破的那一刻。';
  }

  return {
    trajectory,
    keyTheme,
    actionHint,
  };
}

/**
 * 主函式：計算完整的三時段流年數據
 */
export async function calculateGhostAsuraTimeline(
  userName: string,
  birthDate: string,
  dayMasterElement: string = '木' // 預設五行
): Promise<GhostAsuraTimelineResponse> {
  // 計算三個時段
  const pastCard = calculateTimelinePeriod('past', birthDate, dayMasterElement);
  const presentCard = calculateTimelinePeriod('present', birthDate, dayMasterElement);
  const futureCard = calculateTimelinePeriod('future', birthDate, dayMasterElement);

  // 計算整體趨勢
  const overallTrend = calculateOverallTrend(
    pastCard.calculation.fortuneLevel,
    presentCard.calculation.fortuneLevel,
    futureCard.calculation.fortuneLevel
  );

  return {
    user: {
      name: userName,
      birthDate,
    },

    timeline: {
      past: pastCard,
      present: presentCard,
      future: futureCard,
    },

    overallTrend,

    meta: {
      timestamp: Date.now(),
      version: '1.0.0',
    },
  };
}

/**
 * 輔助函式：根據八字推算日主五行
 * 實際應該使用真實的八字計算
 */
export function inferDayMasterElement(day: string): string {
  // 簡化版本：根據日干推算
  if (['甲', '乙'].includes(day)) return '木';
  if (['丙', '丁'].includes(day)) return '火';
  if (['戊', '己'].includes(day)) return '土';
  if (['庚', '辛'].includes(day)) return '金';
  if (['壬', '癸'].includes(day)) return '水';
  return '土'; // 預設
}
