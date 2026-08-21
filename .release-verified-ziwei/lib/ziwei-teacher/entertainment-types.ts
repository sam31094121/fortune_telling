/**
 * 紫微娛樂模組（2026-08-22）
 *
 * 跟三位專業老師（STRUCTURE_MASTER/LIFE_MASTER/NARRATIVE_MASTER，見 ./types.ts）完全分開、
 * 各自獨立的 API 與型別：這裡是客戶可以另外切換的娛樂向老師（恐怖／鬼魅），允許在真實命盤
 * 星曜之外加入虛構的靈異劇情，不受專業老師「不得補故事假裝完整」的鐵律約束——因為這裡
 * 本來就標榜是娛樂創作，不是命理判讀。但每一份輸出都必須帶 disclaimer 欄位，前端固定顯示
 * 「娛樂虛構創作，非命理專業判讀」，避免使用者把這裡的內容誤認成真的命盤結論。
 */

export type EntertainmentTeacherId = 'HORROR' | 'GHOST';

export interface EntertainmentTeacherResult {
  teacherId: EntertainmentTeacherId;
  title: string;
  openingScene: string;
  narrative: string;
  chillingTwist: string;
  closingWhisper: string;
  /** 這段虛構故事借用了命盤中哪些星曜/宮位當靈感——透明度用途，不是命理證據 */
  inspiredBy: string[];
  disclaimer: string;
}
