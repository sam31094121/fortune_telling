/**
 * 鬼魅阿修羅 — 轉譯層
 *
 * 逐項轉譯，不運算神煞。
 * 已核可 → 固定名；未登錄但後端已驗證 → 穩定延伸名。
 * 禁止回退原始名到使用者主標題；禁止 Math.random。
 */

import {
  collectApprovedDisplayNames,
  GHOST_ASURA_NAMING_VERSION,
  resolveDisplayName,
} from './registry';
import type { GhostAsuraTranslatedItem, GhostAsuraVerifiedRecord } from './types';
import { formatPillarLabels, GHOST_ASURA_UI } from './uiText';

export const GHOST_ASURA_TRANSLATE_VERSION = 'GHOST_ASURA_TRANSLATE_2026_10_04_V4';

function isBlankOriginalName(name: string): boolean {
  const trimmed = (name || '').trim();
  return !trimmed || trimmed === '未知神煞' || trimmed === '—' || trimmed === '-';
}

export function translateVerifiedRecords(
  records: GhostAsuraVerifiedRecord[]
): GhostAsuraTranslatedItem[] {
  const usedNames = collectApprovedDisplayNames();

  return records.map((record) => {
    const resolved = resolveDisplayName(
      {
        ruleId: record.ruleId,
        originalName: isBlankOriginalName(record.originalName)
          ? ''
          : record.originalName,
      },
      usedNames
    );

    // 後端未完成判定 → 待校核（仍給安全 displayName，不外洩原始名）
    if (record.matched === null) {
      return {
        resultId: record.resultId,
        ruleId: record.ruleId,
        originalName: record.originalName,
        displayName: resolved.displayName,
        matched: null,
        sealStatus: 'pending',
        pillars: record.pillars,
        pillarLabels: formatPillarLabels(record.pillars),
        family: resolved.family,
        namingApproved: false,
        namingVersion: resolved.namingVersion,
        namingSource: resolved.namingSource,
        resultBatchId: record.resultBatchId,
        pendingReason: GHOST_ASURA_UI.pendingBackendHint,
      };
    }

    return {
      resultId: record.resultId,
      ruleId: record.ruleId,
      originalName: record.originalName,
      displayName: resolved.displayName,
      matched: record.matched,
      sealStatus: record.matched ? 'awakened' : 'dormant',
      pillars: record.pillars,
      pillarLabels: formatPillarLabels(record.pillars),
      family: resolved.family,
      namingApproved: resolved.namingApproved,
      namingVersion: resolved.namingVersion || GHOST_ASURA_NAMING_VERSION,
      namingSource: resolved.namingSource,
      resultBatchId: record.resultBatchId,
    };
  });
}
