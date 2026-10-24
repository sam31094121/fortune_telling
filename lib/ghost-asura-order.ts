/**
 * 鬼魅阿修羅 - 前後順序與公信力等級（單一來源，純常數與純函式，不做任何命盤運算）
 *
 * 業主定案（2026-10-24）：含金量＝話術背後資料的公信力；最有公信力的含金量，就是最有公信力的話術。
 * 規範：docs/技能戰鬥檔案/鬼魅阿修羅/話術含金量技能.md〈一〉〈二〉〈三〉；守門 test:ghost-asura-gold-wording。
 *
 * 三核心的先後順序只有一份，在 lib/credibility-phrases.ts 的 CORE_ORDER；本檔不另訂第二套，
 * 只把它放進完整鏈條，並由測試確認相對順序一致。
 */

import type { GateStatus } from './iching-source-gate';
import type { FourPillarGate } from './ghost-asura-gold-wording';

/** 資料鏈：由上往下，不得顛倒。method 對應鎖定的「五種方式」。 */
export const ASURA_CHAIN = [
  { id: 'INPUT', label: '填寫資料', method: null },
  { id: 'BAZI', label: '八字命盤', method: '八字命盤' },
  { id: 'ZIWEI_CROSS_CHECK', label: '紫微斗數＋四柱逐字核對', method: '紫微斗數命盤' },
  { id: 'NAMEOLOGY', label: '易經姓名學', method: '易經姓名學' },
  { id: 'DIVINATION', label: '易經卜卦', method: '易經卜卦' },
  { id: 'CREDIBILITY_GATE', label: '公信力閘（來源等級、交叉比對、核對結果）', method: null },
  { id: 'ASURA_VOICE', label: '阿修羅話術', method: '鬼滅阿修羅' },
  { id: 'DISPLAY', label: '前端只照印', method: null },
] as const;

export type AsuraChainId = (typeof ASURA_CHAIN)[number]['id'];

/** 攻心組句順序（實戰話術範例〈〇〉）：先抓住人，再亮出依據，最後給一個動作。 */
export const WORDING_COMPOSITION = [
  { id: 'OPENING', label: '開場：直指「你」，帶反差或懸念' },
  { id: 'FACT', label: '事實：說他資料裡真的有的，附出處與公信力' },
  { id: 'SEEING', label: '看見：這件事對他意味著什麼' },
  { id: 'ACTION', label: '動作：一個他能自己做的小動作' },
] as const;

/** 力道等級：由資料公信力決定，不由「話會不會有效」決定。 */
export type CredibilityTier = 'STRONG' | 'MEDIUM' | 'WEAK' | 'BLOCKED';

export interface TierInput {
  /** 第 3 步四柱核對結果 */
  fourPillars: FourPillarGate['status'];
  /** 客戶有沒有填出生時辰 */
  timeKnown: boolean;
  /** 該句所用事實對應的來源閘門狀態（由 lib/iching-source-gate 重算，不得手填） */
  claimStatus: GateStatus;
  /** 客戶是否在畫面上點了「確認無誤」（目前畫面尚無此按鈕，傳 false） */
  inputConfirmed: boolean;
}

/**
 * 強：核對通過＋來源 VERIFIED＋客戶確認，三項缺一不可 → 語氣最篤定（已、必、早），仍只對事實，不對結果。
 * 中：資料算得出來，但來源待核或客戶尚未確認 → 陳述事實，不加「必」。
 * 弱：沒填時辰，或來源互相衝突 → 只說已知範圍，明講暫排。
 * 擋：四柱核對沒過、紫微未定盤、出錯 → 不說（對應 pickGoldWording 的核對關）。
 */
export function credibilityTier(input: TierInput): CredibilityTier {
  if (input.fourPillars === 'MISMATCH' || input.fourPillars === 'ZIWEI_UNAVAILABLE' || input.fourPillars === 'ERROR') return 'BLOCKED';
  if (!input.timeKnown || input.claimStatus === 'CONFLICT') return 'WEAK';
  if (input.fourPillars === 'PASSED' && input.claimStatus === 'VERIFIED' && input.inputConfirmed) return 'STRONG';
  return 'MEDIUM';
}
