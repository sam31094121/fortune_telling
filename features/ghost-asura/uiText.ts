/**
 * 鬼魅阿修羅 — 本卡專屬介面詞彙（附件 3 §七）
 */

import type { GhostAsuraPillarKey, GhostAsuraSealStatus } from './types';

export const GHOST_ASURA_CARD_TITLE = '鬼魅阿修羅';

export const GHOST_ASURA_UI = {
  cardTitle: GHOST_ASURA_CARD_TITLE,
  asuraPrint: '阿修羅印',
  natalAsura: '本命阿修羅',
  battleField: '命魂戰局',
  secretScroll: '阿修羅秘卷',
  printClash: '印記交鋒',
  sealAwakened: '印記覺醒',
  sealDormant: '印記沉眠',
  sealPending: '待校核',
  guardianPrint: '護命之印',
  tribulationPrint: '幽劫之印',
  neutralPrint: '界域之印',
  asuraBattle: '修羅戰局',
  asuraChain: '阿修羅連鎖',
  noReading: '此域暫無可用判讀',
  incompleteBanner: '解盤完整度未通過：編號或筆數不一致，請重試或回報。',
  pendingHint: '此印記尚待後端驗證，暫不提供正式解讀。',
  pendingBackendHint: '後端尚未完成命中驗證，此印維持待校核。',
  pendingNeutralLabel: '印記待校核',
  wordingGapHint: '此域暫無可用判讀',
} as const;

export const PILLAR_UI: Record<
  GhostAsuraPillarKey,
  { asura: string; traditional: string; label: string }
> = {
  year: { asura: '祖域', traditional: '年柱', label: '祖域（年柱）' },
  month: { asura: '命境', traditional: '月柱', label: '命境（月柱）' },
  day: { asura: '本魂', traditional: '日柱', label: '本魂（日柱）' },
  hour: { asura: '後界', traditional: '時柱', label: '後界（時柱）' },
};

const PILLAR_ALIAS: Record<string, GhostAsuraPillarKey> = {
  year: 'year',
  month: 'month',
  day: 'day',
  hour: 'hour',
  年: 'year',
  月: 'month',
  日: 'day',
  時: 'hour',
  年柱: 'year',
  月柱: 'month',
  日柱: 'day',
  時柱: 'hour',
};

export function normalizePillarKey(raw: string | undefined | null): GhostAsuraPillarKey | null {
  if (!raw) return null;
  return PILLAR_ALIAS[raw] ?? null;
}

export function formatPillarLabels(pillars: GhostAsuraPillarKey[]): string[] {
  return pillars.map((key) => PILLAR_UI[key].label);
}

export function sealStatusLabel(status: GhostAsuraSealStatus): string {
  if (status === 'awakened') return GHOST_ASURA_UI.sealAwakened;
  if (status === 'dormant') return GHOST_ASURA_UI.sealDormant;
  return GHOST_ASURA_UI.sealPending;
}
