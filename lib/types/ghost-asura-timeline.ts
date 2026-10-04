/**
 * 鬼魅阿修羅 - 命運流年三時段卡片
 *
 * 結構：過去 → 現在 → 未來
 * 設計：後端計算 → 前端用阿修羅口吻呈現
 */

/** 單一時段卡片資料 */
export interface TimelineCard {
  period: 'past' | 'present' | 'future';
  periodName: string; // 「過去（去年）」、「現在（今年）」、「未來（明年）」

  // 計算結果（純數據，無話術）
  calculation: {
    yearGanZhi: string; // 年干支，如「癸卯」
    dominantElement: string; // 主導五行
    chiefStar: string; // 主星或神煞
    fortuneLevel: number; // 0-100 幸運指數
  };

  // 視覺配置
  visual: {
    themeColor: string; // 該時段的主色
    icon: string; // 😔 / 🔥 / ✨
    intensity: 'low' | 'medium' | 'high'; // 視覺強度
  };
}

/** 三時段統整卡片 */
export interface GhostAsuraTimelineResponse {
  user: {
    name: string;
    birthDate: string;
  };

  // 三張時段卡片
  timeline: {
    past: TimelineCard;
    present: TimelineCard;
    future: TimelineCard;
  };

  // 整體趨勢
  overallTrend: {
    trajectory: 'ascending' | 'descending' | 'cyclical'; // 上升/下降/循環
    keyTheme: string; // 例：「挑戰期」、「突破期」、「收穫期」
    actionHint: string; // 行動提示（由阿修羅話術庫提供）
  };

  // 後設
  meta: {
    timestamp: number;
    version: string;
  };
}
