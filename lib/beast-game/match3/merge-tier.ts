/** PLAN-v2：跨層級天花板、四象分組、共鳴格每格加成（數字見 merge-balance.ts，皆為【待平衡暫定值】）。 */
import { getCard, playableCards } from '../registry';
import { CARD_FACE_STATS } from '../card-face-stats';
import { MERGE_BALANCE, feedChainEnabled } from './merge-balance';

export type FourSymbol = 'QINGLONG' | 'XUANWU' | 'BAIHU' | 'ZHUQUE';
export const FOUR_SYMBOLS: readonly FourSymbol[] = ['QINGLONG', 'XUANWU', 'BAIHU', 'ZHUQUE'];
/** 四象分組（不用元素分組）：mansionId 1–7 青龍、8–14 玄武、15–21 白虎、22–28 朱雀。 */
export function fourSymbolOf(cardId: string): FourSymbol | null {
  const m = getCard(cardId)?.mansionId;
  return typeof m === 'number' && m >= 1 && m <= 28 ? FOUR_SYMBOLS[Math.floor((m - 1) / 7)] : null;
}
/** 同方位的四大神獸：從卡片登錄依 mansionId 找（不寫死卡號）。 */
export const guardianOfSymbol = (s: FourSymbol): string | undefined => playableCards().find(c => c.form === 'GUARDIAN' && fourSymbolOf(c.id) === s)?.id;

const face = (cardId: string): number => CARD_FACE_STATS[cardId]?.attack ?? 0;
/** 舊規則：卡面 ×50%（捨去）。存檔驗證一律沿用這條，舊存檔才讀得回來。 */
export const legacyAttackCap = (cardId: string): number => Math.floor(face(cardId) * MERGE_BALANCE.attackCapRatio);

/**
 * 跨層級攻擊天花板（開關開啟時）：
 * ‧ 四大神獸：卡面 ×50%（例：朱雀 88→132）。
 * ‧ 成獸：強化後攻擊不得超過同方位四大神獸的卡面原值（例：朱雀方位 ≤88）；也不超過自己卡面 ×50%。
 *   卡面本來就高於同方位四象的成獸（虛日鼠 82＞玄武 77、觜火猴 77＞白虎 68）上限為 0：不改卡面，但不能再往上強化。
 * ‧ 幼子：卡面 ×50%（幼子不能當強化目標，這裡只為完整）。
 */
export function tierAttackCap(cardId: string, enabled: boolean = feedChainEnabled()): number {
  const legacy = legacyAttackCap(cardId);
  if (!enabled) return legacy;
  const card = getCard(cardId);
  if (card?.form !== 'ADULT') return legacy;
  const symbol = fourSymbolOf(cardId);
  const guardian = symbol && guardianOfSymbol(symbol);
  if (!guardian) return legacy;
  return Math.max(0, Math.min(legacy, face(guardian) - face(cardId)));
}

/** 共鳴格每格加成（捨去、至少 +1）。 */
export const resonanceSlotBonus = (cardId: string): number => Math.max(1, Math.floor(face(cardId) * MERGE_BALANCE.resonanceRatio));

