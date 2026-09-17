/**
 * 公信力話術（純文字常數，前端可直接顯示）
 * ============================================================================
 *
 * 業主定案（2026-09-16）：大數據、公信力、權威性的話術寫入技能檔案《易經》；
 * 後端運算、交叉比對，前端只負責視覺感官。
 *
 * 這支檔案只放「已核准可以說的話」與「不准說的話」，不做任何運算——前端匯入它不算自己編結論。
 * 需要依來源登記狀態動態組句的，一律走後端 lib/credibility-wording.ts（GET /api/credibility）。
 * 規格：docs/技能戰鬥檔案/易經/公信力話術.md；守門：npm run test:credibility-wording
 */

/** 口令《易經》先後順序：① 八字命盤 ② 紫微斗數命盤 ③ 易經心理學。 */
export const CORE_ORDER = ['八字', '紫微斗數', '易經'] as const;
export type CoreName = typeof CORE_ORDER[number];

/** 來源閘門狀態 → 客戶看得到的說法（不得比狀態說得更滿）。 */
export const STATUS_WORDING = {
  VERIFIED: '已通過交叉比對',
  CONFLICT: '各家來源說法不一，僅作傳統參考',
  PENDING_POOL: '仍在查證中，僅作自我反思參考',
} as const;

/** 已核准的公信力句子：每句都對得上來源登記或程式實際行為。 */
export const APPROVED_PHRASES = {
  /** 資料範圍：本站分數是固定規則，不是人群統計、不是準確率。 */
  dataScope: '本報告依你的生日、時辰與姓名，用固定規則在後端計算；同樣資料每次結果都一樣。這不是拿很多人的資料統計出來的排名，也不是準確率。',
  /** 心理學定位：權威辭典與研究資料庫只作名詞查證，不作診斷。 */
  psychologyScope: '心理學名詞只用來引導自我反思，名詞對照 APA 心理學辭典，並以 PubMed、APA PsycInfo 等研究資料庫查證；不做診斷，也不預測未來。',
  /** 三核心共同上限。 */
  traditionBoundary: '八字、紫微斗數、易經是傳統與文化詮釋，不是科學證實的預測。',
  /** 交叉比對：八字與紫微四柱逐字核對。 */
  crossCheck: '八字與紫微斗數的年、月、日、時四柱在後端逐字核對，一致才往下解讀。',
} as const;

/** 取代舊說法的前端文案（原句曾宣稱大數據或準確度，與後端實際行為不符）。 */
export const FRONTEND_COPY = {
  terminalTitle: '🧬 三核心 易經運算終端',
  nameHint: '🔮 姓名乃人和磁場之五格載體：後端依正體字典筆畫計算五格，再與生日、時辰交叉比對。',
  accuracyStep: {
    label: '資料完整度核對',
    ritualText: '正在核對資料是否完整、規則是否跑齊...',
    passedText: '資料完整度與規則核對完成',
  },
  longTermMilestone: '🏆 連續 12 週：你已經是長期夥伴，每週紀錄越完整，易經的回顧就越貼近你真實走過的路。',
} as const;

/**
 * 不准出現在前端的說法（原因寫清楚）。守門測試會掃 app／components。
 * 只列確定的誇大句型；「命理不做準確率宣稱」這類否定句不在此列。
 */
export const BANNED_CLAIMS: ReadonlyArray<{ phrase: string; reason: string }> = [
  { phrase: '大數據將', reason: '本站沒有人群大數據樣本（sampleSize 0、bigDataInsights 空），不得宣稱大數據運算' },
  { phrase: '大數據 易經運算', reason: '同上：運算是固定規則與三核心交叉，不是大數據' },
  { phrase: '聲波諧振', reason: '無任何來源支持的偽科學說法' },
  { phrase: '判定準確度', reason: '分數評的是資料完整度與規則覆蓋，不是預測準確度' },
  { phrase: '加深每週判定的精準度', reason: '沒有任何驗證顯示回訪會讓判定更準' },
  { phrase: '科學證實命', reason: '沒有對照研究支持命理預測力' },
  { phrase: '準確率高達', reason: '命理不做準確率宣稱' },
  { phrase: '我感覺到了', reason: '網站感應不到體溫、身體或環境（2026-09-17 業主批准）' },
  { phrase: '手心的溫度', reason: '同上：儀式不得聲稱隔著螢幕感應' },
];
