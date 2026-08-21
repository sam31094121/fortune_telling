import type { CardId, CardQualityReport } from './types';

export const CARD_QUEUE: CardId[] = [
  'CARD_01',
  'CARD_02',
  'CARD_03',
  'CARD_04',
  'CARD_05',
  'CARD_06',
  'CARD_07',
  'CARD_08',
  'CARD_09',
];

export function canReviewCard(targetCard: CardId, reports: Partial<Record<CardId, CardQualityReport>>): boolean {
  const targetIndex = CARD_QUEUE.indexOf(targetCard);
  if (targetIndex < 0) return false;
  if (targetIndex === 0) return true;
  const previousReport = reports[CARD_QUEUE[targetIndex - 1]];
  return Boolean(previousReport && previousReport.tier === 'SIGNATURE' && previousReport.allowNextCard);
}