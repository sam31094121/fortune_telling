/**
 * 鬼魅阿修羅 — 話術層
 *
 * 只使用已核可話術；資料不足明示不足。
 * 覺醒／沉眠文案分開；沉眠不得寫成「已開／已現」。
 */

import { resolveAsuraInterpretation } from './skill';
import type { GhostAsuraNarrativeItem, GhostAsuraTranslatedItem } from './types';
import { GHOST_ASURA_UI } from './uiText';
import { createAsuraCustomerCopy } from './customerCopy';

export const GHOST_ASURA_WORDING_VERSION = 'GHOST_ASURA_WORDING_2026_10_04_V2';

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
  const customerCopy = createAsuraCustomerCopy(items);
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

    // 話術一律以 asuraId（規則編號）向 Skill 母版查找，不再用顯示名稱當索引。
    // 找不到或不完整會丟 ASURA_SKILL_ENTRY_MISSING／ASURA_INTERPRETATION_INCOMPLETE，不再填佔位字。
    const resolved = resolveAsuraInterpretation(item.ruleId || item.resultId, { pillars: item.pillars });
    return {
      resultId: item.resultId,
      displayName: item.displayName,
      sealStatus: 'awakened',
      shortDeclaration: customerCopy(sanitizeCardCopy(resolved.meaningStrong)),
      coreMeaning: customerCopy(sanitizeCardCopy(resolved.meaning)),
      battleSignificance: customerCopy(sanitizeCardCopy(resolved.battleLine)),
      verdict: customerCopy(sanitizeCardCopy(resolved.advice)),
      wordingVersion: GHOST_ASURA_WORDING_VERSION,
      hasApprovedWording: true,
    };
  });
}
