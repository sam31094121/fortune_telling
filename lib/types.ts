// 全專案共用的型別定義

/** 血型四種選項 */
export type BloodType = 'A' | 'B' | 'AB' | 'O';

/** 單一使用者的輸入資料 */
export interface PersonInput {
  name: string;
  bloodType: BloodType;
  birthday: string; // ISO 格式 YYYY-MM-DD
}

/** 前端送往 /api/analyze 的請求 body */
export interface AnalyzeRequest {
  personA: PersonInput;
  personB: PersonInput;
}

/** AI 回傳的單項評分（個性、愛情、溝通、未來各一） */
export interface SubScore {
  score: number; // 0–100
  description: string;
}

/** AI 完整分析結果（也是 /api/analyze 的成功回應） */
export interface AnalysisResult {
  overall_score: number; // 0–100
  personality: SubScore;
  love: SubScore;
  communication: SubScore;
  future: SubScore;
  summary: string;
}

/** API 錯誤回應的統一格式 */
export interface ApiError {
  error: string;
}
