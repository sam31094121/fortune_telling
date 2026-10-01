/**
 * 鬼魅阿修羅 — 話術層
 *
 * 只使用已核可話術；資料不足明示不足。
 * 覺醒／沉眠文案分開；沉眠不得寫成「已開／已現」。
 */

import { ASURA_WORDINGS_CORE } from '@/lib/ghost-asura-wordings-core';
import type { GhostAsuraNarrativeItem, GhostAsuraTranslatedItem } from './types';
import { GHOST_ASURA_UI } from './uiText';

export const GHOST_ASURA_WORDING_VERSION = 'GHOST_ASURA_WORDING_2026_10_01_V1';

/** 本卡範圍內誤字修正（禁止全域取代） */
function sanitizeCardCopy(text: string): string {
  return text
    .replaceAll('毀滅阿修羅', '鬼魅阿修羅')
    .replaceAll('鬼滅阿修羅', '鬼魅阿修羅');
}

function dormantFallback(displayName: string): {
  shortDeclaration: string;
  coreMeaning: string;
  battleSignificance: string;
  verdict: string;
} {
  return {
    shortDeclaration: `${displayName}沉眠。`,
    coreMeaning: '此印未醒，力量未現於本命戰場。沉眠不是消失，是尚未被點燃。',
    battleSignificance: '沉眠印不進入實際覺醒戰局。',
    verdict: '候機，不強求。',
  };
}

export function buildNarratives(
  items: GhostAsuraTranslatedItem[]
): GhostAsuraNarrativeItem[] {
  return items.map((item) => {
    if (item.sealStatus === 'pending') {
      return {
        resultId: item.resultId,
        displayName: item.displayName,
        sealStatus: 'pending',
        shortDeclaration: null,
        coreMeaning: null,
        battleSignificance: null,
        verdict: null,
        wordingVersion: null,
        hasApprovedWording: false,
        // 中性提示；禁止夾帶原始神煞名
        pendingReason: item.pendingReason ?? GHOST_ASURA_UI.pendingHint,
      };
    }

    if (item.sealStatus === 'dormant') {
      const copy = dormantFallback(item.displayName);
      return {
        resultId: item.resultId,
        displayName: item.displayName,
        sealStatus: 'dormant',
        shortDeclaration: copy.shortDeclaration,
        coreMeaning: copy.coreMeaning,
        battleSignificance: copy.battleSignificance,
        verdict: copy.verdict,
        wordingVersion: GHOST_ASURA_WORDING_VERSION,
        hasApprovedWording: true,
      };
    }

    const wording = ASURA_WORDINGS_CORE[item.displayName];
    if (!wording) {
      // 名稱已就緒、命中已驗證：維持覺醒；話術缺漏用欄位級提示，不打回待核可標題。
      return {
        resultId: item.resultId,
        displayName: item.displayName,
        sealStatus: 'awakened',
        shortDeclaration: GHOST_ASURA_UI.noReading,
        coreMeaning: GHOST_ASURA_UI.noReading,
        battleSignificance: GHOST_ASURA_UI.noReading,
        verdict: GHOST_ASURA_UI.noReading,
        wordingVersion: null,
        hasApprovedWording: false,
        pendingReason: GHOST_ASURA_UI.wordingGapHint,
      };
    }

    return {
      resultId: item.resultId,
      displayName: item.displayName,
      sealStatus: 'awakened',
      shortDeclaration: sanitizeCardCopy(wording.shortDeclaration),
      coreMeaning: sanitizeCardCopy(wording.coreWarning),
      battleSignificance: sanitizeCardCopy(wording.battleSignificance),
      verdict: sanitizeCardCopy(wording.verdict),
      wordingVersion: GHOST_ASURA_WORDING_VERSION,
      hasApprovedWording: true,
    };
  });
}
