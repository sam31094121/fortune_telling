/**
 * 鬼魅阿修羅 — 伺服器端轉接層
 *
 * 只讀既有已驗證神煞 coverage／命中柱位／組合依據。
 * 不重算四柱、神煞、命中。
 */

import type { DualChartResult } from '@/lib/dual-chart';
import type {
  GhostAsuraPillarKey,
  GhostAsuraVerifiedCombo,
  GhostAsuraVerifiedRecord,
} from './types';
import { normalizePillarKey } from './uiText';

export const GHOST_ASURA_ADAPTER_VERSION = 'GHOST_ASURA_ADAPTER_2026_10_01_V1';

export interface GhostAsuraAdapterInput {
  /** dual-chart 完整結果；可傳精簡測試 fixture */
  result?: DualChartResult | null;
  /** 測試／合成用：直接餵 coverage 紀錄 */
  records?: GhostAsuraVerifiedRecord[];
  /** 測試／合成用：已驗證組合 */
  combos?: GhostAsuraVerifiedCombo[];
  /** 強制結果批次（測試舊批次覆寫用） */
  resultBatchId?: string;
}

export interface GhostAsuraAdapterOutput {
  records: GhostAsuraVerifiedRecord[];
  combos: GhostAsuraVerifiedCombo[];
  resultBatchId: string;
  motherVersion: string;
  adapterVersion: string;
  /** 來源異常：四柱未過／缺 coverage */
  blockedReason: string | null;
}

function mapPillars(raw: string[] | undefined): GhostAsuraPillarKey[] {
  if (!raw?.length) return [];
  const out: GhostAsuraPillarKey[] = [];
  for (const item of raw) {
    const key = normalizePillarKey(item);
    if (key && !out.includes(key)) out.push(key);
  }
  return out;
}

/**
 * 從 dual-chart specialStars.coverage 轉成唯一結果集。
 * MATCHED／NOT_MATCHED 皆保留；BLOCKED_* 保留但 matched=null（待校核）。
 */
export function adaptVerifiedShenSha(
  input: GhostAsuraAdapterInput
): GhostAsuraAdapterOutput {
  if (input.records) {
    const batch =
      input.resultBatchId ??
      input.records[0]?.resultBatchId ??
      'SYNTHETIC_BATCH';
    return {
      records: input.records.map((record) => ({
        ...record,
        resultBatchId: input.resultBatchId ?? record.resultBatchId,
      })),
      combos: input.combos ?? [],
      resultBatchId: batch,
      motherVersion: input.records[0]?.motherVersion ?? 'SYNTHETIC',
      adapterVersion: GHOST_ASURA_ADAPTER_VERSION,
      blockedReason: null,
    };
  }

  const result = input.result;
  if (!result?.specialStars) {
    return {
      records: [],
      combos: [],
      resultBatchId: input.resultBatchId ?? 'MISSING_RESULT',
      motherVersion: 'MISSING',
      adapterVersion: GHOST_ASURA_ADAPTER_VERSION,
      blockedReason: '缺少 dual-chart 結果，無法承接神煞。',
    };
  }

  const stars = result.specialStars as DualChartResult['specialStars'] & {
    coverage?: Array<{
      id: string;
      name: string;
      status: string;
      reason: string;
      matchedPillars: string[];
    }>;
    version?: string;
    iching?: {
      state?: string;
      combos?: Array<{
        id: string;
        title: string;
        members: string[];
        pillar: string | null;
        text: string;
      }>;
      items?: Array<{ id: string; name: string }>;
    };
  };

  const coverage = stars.coverage;
  if (!coverage) {
    return {
      records: [],
      combos: [],
      resultBatchId: input.resultBatchId ?? 'MISSING_COVERAGE',
      motherVersion: stars.version ?? 'UNKNOWN',
      adapterVersion: GHOST_ASURA_ADAPTER_VERSION,
      blockedReason: '後端 coverage 缺漏，停止正常解讀。',
    };
  }

  const motherVersion = stars.version ?? 'UNKNOWN';
  const resultBatchId =
    input.resultBatchId ??
    `${motherVersion}:${result.bazi?.input?.birthDate ?? 'unknown'}:${result.bazi?.input?.birthTime ?? 'unknown'}`;

  const nameToRuleId = new Map<string, string>();
  const records: GhostAsuraVerifiedRecord[] = coverage.map((row) => {
    nameToRuleId.set(row.name, row.id);
    const isMatched = row.status === 'MATCHED';
    const isNotMatched = row.status === 'NOT_MATCHED';
    return {
      resultId: row.id,
      ruleId: row.id,
      originalName: row.name,
      matched: isMatched ? true : isNotMatched ? false : null,
      pillars: isMatched ? mapPillars(row.matchedPillars) : [],
      resultBatchId,
      motherVersion,
      backendStatus: row.status,
      reason: row.reason,
      ruleVersion: motherVersion,
      source: 'dual-chart-coverage',
    };
  });

  const combos: GhostAsuraVerifiedCombo[] = [];
  if (stars.iching?.state === 'READY' && Array.isArray(stars.iching.combos)) {
    for (const combo of stars.iching.combos) {
      const memberRuleIds = combo.members
        .map((memberName) => nameToRuleId.get(memberName))
        .filter((id): id is string => Boolean(id));
      combos.push({
        comboId: combo.id,
        title: combo.title,
        memberRuleIds,
        memberNames: [...combo.members],
        pillar: combo.pillar,
        evidenceText: combo.text,
      });
    }
  }

  return {
    records,
    combos,
    resultBatchId,
    motherVersion,
    adapterVersion: GHOST_ASURA_ADAPTER_VERSION,
    blockedReason: null,
  };
}
