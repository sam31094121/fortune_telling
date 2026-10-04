/**
 * 鬼魅阿修羅 - 後端資料契約
 *
 * 設計原則：
 * - 後端算好所有數據、話術、排版
 * - 前端只接收 + 顯示（零邏輯、零運算）
 * - 所有中文句子由後端產出，前端禁止修改
 */

/** 四柱資料 */
export interface Pillar {
  name: '年' | '月' | '日' | '時';
  stem: string; // 天干：甲乙丙丁...
  branch: string; // 地支：子丑寅卯...
  element: '木' | '火' | '土' | '金' | '水';
  elementColor: string; // CSS color
}

/** 神煞卡片（單一神煞） */
export interface ShenShaItem {
  id: string;
  name: string; // 例：「外桃花」
  category: '吉星' | '凶煞' | '中性';
  pillar: string; // 例：「年柱」
  description: string; // 後端產出的話術（已排版、含義項）
  psychology: {
    shell: string; // 表層意義
    heart: string; // 內層意義
    gift: string; // 禮物／轉化
  };
  source?: string; // 來源標記（如有的話）
}

/** 易經卜卦結果 */
export interface IChingResult {
  hexagram: number; // 卦序：1-64
  name: string; // 卦名：例「乾」
  judgment: string; // 後端產出的爻位解讀
  guidance: string; // 後端產出的人生建議
  psychology: string; // 易經心理學解讀
}

/** 紫微斗數命盤 */
export interface ZiweiChart {
  palaces: Array<{
    name: string; // 例「命宮」「財帛宮」
    mainStar: string; // 主星
    secondaryStars: string[]; // 輔助星
    yearlyInfluence: string; // 流年影響（後端產出）
  }>;
  analysis: string; // 後端產出的紫微整體解讀
}

/** 鬼魅阿修羅卡片 - 主要回應結構 */
export interface GhostAsuraCardResponse {
  // 使用者基本資訊
  user: {
    name: string;
    birthDate: string; // YYYY-MM-DD
    birthTime?: string; // HH:mm
    gender?: '男' | '女' | '其他';
  };

  // 四柱資料
  bazi: {
    pillars: Pillar[];
    analysis: string; // 後端產出：八字整體解讀
  };

  // 紫微斗數
  ziwei: {
    chart: ZiweiChart;
    verification: {
      status: 'VERIFIED' | 'MISMATCH'; // 四柱是否與八字一致
      message?: string; // 如不一致，說明差異
    };
  };

  // 特星神煞
  shensha: {
    items: ShenShaItem[];
    flowYear: {
      current: string; // 今年流年神煞說明（後端產出）
      next?: string; // 明年流年神煞說明
    };
    combo: string; // 後端產出：整盤神煞組合解讀
  };

  // 易經卜卦
  iching: {
    result: IChingResult;
    shenShaConnection: string; // 後端產出：神煞與卦象的連結說明
  };

  // 阿修羅老師解盤
  teacherReading: {
    opening: string; // 開場白（後端產出）
    mainInsight: string; // 核心洞見（後端產出）
    lifeGuidance: string; // 人生指引（後端產出）
    closing: string; // 收尾寄語（後端產出）
  };

  // 視覺配置（後端決定顏色、排版）
  visual: {
    themeColor: string; // 主色調（CSS color）
    accentColor: string; // 輔助色
    cardLayout: 'vertical' | 'horizontal' | 'grid'; // 卡片佈局類型
  };

  // 後設資訊
  meta: {
    timestamp: number;
    version: string;
    verified: boolean; // 是否通過所有驗證
  };
}

/** 簡化版本（僅四柱 + 八字） */
export interface GhostAsuraBaziOnly {
  user: {
    name: string;
    birthDate: string;
    birthTime?: string;
  };
  bazi: {
    pillars: Pillar[];
    analysis: string;
  };
  meta: {
    timestamp: number;
    version: string;
  };
}

/** API 錯誤回應 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
