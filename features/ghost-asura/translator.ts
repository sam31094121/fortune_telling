/**
 * 鬼魅阿修羅 — 轉譯層
 *
 * 逐項轉譯，不運算神煞。未核可名稱 → 待校核（不回退原始名、不隨機命名）。
 */

import { lookupApprovedName, GHOST_ASURA_NAMING_VERSION } from './registry';
import type { GhostAsuraTranslatedItem, GhostAsuraVerifiedRecord } from './types';
import { formatPillarLabels } from './uiText';

export const GHOST_ASURA_TRANSLATE_VERSION = 'GHOST_ASURA_TRANSLATE_2026_10_01_V1';

export function translateVerifiedRecords(
  records: GhostAsuraVerifiedRecord[]
): GhostAsuraTranslatedItem[] {
  return records.map((record) => {
    // 後端未完成判定 → 待校核
    if (record.matched === null) {
      return {
        resultId: record.resultId,
        ruleId: record.ruleId,
        originalName: record.originalName,
        displayName: null,
        matched: null,
        sealStatus: 'pending',
        pillars: record.pillars,
        pillarLabels: formatPillarLabels(record.pillars),
        family: null,
        namingApproved: false,
        namingVersion: null,
        resultBatchId: record.resultBatchId,
        pendingReason: `後端狀態 ${record.backendStatus}：尚未完成命中驗證`,
      };
    }

    const approved = lookupApprovedName({
      ruleId: record.ruleId,
      originalName: record.originalName,
    });

    if (!approved) {
      return {
        resultId: record.resultId,
        ruleId: record.ruleId,
        originalName: record.originalName,
        displayName: null,
        matched: record.matched,
        sealStatus: 'pending',
        pillars: record.pillars,
        pillarLabels: formatPillarLabels(record.pillars),
        family: null,
        namingApproved: false,
        namingVersion: null,
        resultBatchId: record.resultBatchId,
        pendingReason: `固定名稱未核可：${record.originalName}（ruleId=${record.ruleId}）`,
      };
    }

    return {
      resultId: record.resultId,
      ruleId: record.ruleId,
      originalName: record.originalName,
      displayName: approved.displayName,
      matched: record.matched,
      sealStatus: record.matched ? 'awakened' : 'dormant',
      pillars: record.pillars,
      pillarLabels: formatPillarLabels(record.pillars),
      family: approved.family,
      namingApproved: true,
      namingVersion: approved.namingVersion || GHOST_ASURA_NAMING_VERSION,
      resultBatchId: record.resultBatchId,
    };
  });
}
