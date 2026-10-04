/**
 * 鬼魅阿修羅 - 後端計算結果契約
 *
 * 設計原則：
 * - 後端只回傳計算結果（數據）
 * - 前端調用 lib/asura-wording.ts 生成話術
 * - 後端零話術，前端掌握阿修羅的口吻
 */

/** 五行元素 */
export type Element = '木' | '火' | '土' | '金' | '水';

/** 四柱資料（純計算結果）*/
export interface Pillar {
  name: '年' | '月' | '日' | '時';
  stem: string; // 天干：甲乙丙...
  branch: string; // 地支：子丑寅...
  element: Element;
  elementColor: string; // CSS color
}

/** 紫微宮位（純計算結果）*/
export interface ZiweiPalace {
  name: string; // 例：「命宮」
  mainStar: string; // 主星
  secondaryStars: string[]; // 輔星列表
}

/** 紫微排盤結果 */
export interface ZiweiChart {
  palaces: ZiweiPalace[];
}

/** 神煞項目（純ID + 位置）*/
export interface ShenShaItem {
  id: string; // 例：「tiandehe」→ 查詢 ASURA_WORDINGS['tiandehe']
  name: string; // 例：「天德合」
  category: '吉星' | '凶煞' | '中性';
  pillar: '年' | '月' | '日' | '時';
}

/** 易經卦象（純數據）*/
export interface IChingResult {
  hexagram: number; // 卦序：1-64
  name: string; // 卦名：例「乾」
}

/** 鬼魅阿修羅後端計算結果 */
export interface GhostAsuraCalculationResponse {
  // 使用者資訊
  user: {
    name: string;
    birthDate: string; // YYYY-MM-DD
    birthTime?: string; // HH:mm
    gender?: '男' | '女' | '其他';
  };

  // 八字命盤（純計算結果）
  bazi: {
    pillars: Pillar[]; // 四柱干支 + 五行
  };

  // 紫微斗數（純計算結果）
  ziwei: {
    chart: ZiweiChart; // 十二宮星盤
    verification: {
      status: 'VERIFIED' | 'MISMATCH'; // 四柱是否與八字一致
      message?: string; // 如不一致，說明差異
    };
  };

  // 特星神煞（純ID列表）
  shensha: {
    items: ShenShaItem[]; // 神煞ID + 位置（前端查詢話術庫）
    flowYear: {
      current: string; // 流年代碼（前端查詢話術）
      next?: string;
    };
  };

  // 易經卜卦（純數據）
  iching: {
    result: IChingResult; // 卦序 + 卦名
  };

  // 視覺配置
  visual: {
    themeColor: string; // CSS color: "#d4af37"
    accentColor: string; // CSS color: "#e63946"
    cardLayout: string; // 'vertical'
  };

  // 後設資訊
  meta: {
    timestamp: number;
    version: string;
    verified: boolean; // 四柱驗證是否通過
  };
}

/** 錯誤回應 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
