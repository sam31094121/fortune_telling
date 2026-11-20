/**
 * 四大神獸強化頁的固定結構（四象 → 七宿本體 → 幼子）與卡圖。
 * 固定資料：四象統七宿、每宿一張本體一張幼子；不含持有數、可否強化或加成。
 * 伺服器的 fourBeastsView 用同一份結構填數字；卡庫讀不到時，頁面照這份畫出層級與圖（數字顯示「–」）。
 */
import { GUARDIANS } from '../beast-guardians';
import { getCard, playableCards } from './registry';

export interface EnhanceStars { stars: number; toNext: number | null; fed: number }
export interface EnhanceNode {
  cardId: string; thumb: string; owned: number; bonus: string; ready: number; waiting: number;
  /** 伺服器挑的預設大卡副本（同卡型多張時取加成最高）；沒有持有＝null。 */
  copyId: string | null;
  stars: EnhanceStars | null; bonusPercent: string; atBonusCap: boolean;
}
export type EnhanceMansion = EnhanceNode & { mansionId: number; young: EnhanceNode };
export type EnhanceGuardian = EnhanceNode & { key: string; element: string; mansions: EnhanceMansion[] };

export const cardThumb = (cardId: string) => getCard(cardId)?.art.thumbnail ?? '';
export const emptyNode = (cardId: string): EnhanceNode => ({ cardId, thumb: cardThumb(cardId), owned: 0, bonus: '0', ready: 0, waiting: 0, copyId: null, stars: null, bonusPercent: '0', atBonusCap: false });

export function fourBeastsTree(node: (cardId: string) => EnhanceNode = emptyNode): EnhanceGuardian[] {
  const cards = playableCards();
  return GUARDIANS.map(g => ({ ...node(g.cardId), key: g.key, element: g.element,
    mansions: g.mansions.map(mansionId => {
      const adult = cards.find(c => c.form === 'ADULT' && c.mansionId === mansionId), young = cards.find(c => c.form === 'YOUNG' && c.mansionId === mansionId);
      return adult && young ? { ...node(adult.id), mansionId, young: node(young.id) } : null;
    }).filter((m): m is EnhanceMansion => m !== null) }));
}
