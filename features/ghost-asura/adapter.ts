/**
 * 鬼魅阿修羅 — 伺服器端轉接層
 *
 * 只讀既有神煞 coverage／命中柱位／組合依據，保留原始來源核定狀態。
 * 不重算四柱、神煞、命中。
 */

import type { DualChartResult } from '@/lib/dual-chart';
import type {
  GhostAsuraPillarKey,
  GhostAsuraVerifiedCombo,
  GhostAsuraVerifiedRecord,
} from './types';
import { normalizePillarKey } from './uiText';
import { ASURA_SOURCE_CONTRACT } from './sourceContract';

export const GHOST_ASURA_ADAPTER_VERSION = 'GHOST_ASURA_ADAPTER_2026_10_04_V2';

export interface GhostAsuraAdapterInput {
  /** dual-chart 完整結果；必須符合已登記的來源契約 */
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
  if (!Array.isArray(coverage) || coverage.some(row => !row ||
      typeof row.id !== 'string' || !row.id.trim() ||
      !Array.isArray(row.matchedPillars) ||
      row.matchedPillars.some(pillar => typeof pillar !== 'string'))) {
    return {
      records: [],
      combos: [],
      resultBatchId: input.resultBatchId ?? 'MISSING_COVERAGE',
      motherVersion: stars.version ?? 'UNKNOWN',
      adapterVersion: GHOST_ASURA_ADAPTER_VERSION,
      blockedReason: '後端 coverage 缺漏或格式不完整，停止正常解讀。',
    };
  }

  const motherVersion = stars.version ?? 'UNKNOWN';
  const resultBatchId =
    input.resultBatchId ??
    `${motherVersion}:${result.bazi?.input?.birthDate ?? 'unknown'}:${result.bazi?.input?.birthTime ?? 'unknown'}`;

  // Validate before normalizing: unknown pillar keys must not be silently dropped.
  // No source approval is inferred here; this is a transport/compatibility check.
  const issues: string[] = [];
  if (motherVersion !== ASURA_SOURCE_CONTRACT.version) issues.push('未登記的來源版本');
  const ids = coverage.map(row => row.id);
  if (new Set(ids).size !== ids.length) issues.push('後端規則編號重複');
  if (ASURA_SOURCE_CONTRACT.ruleIds.some(id => !ids.includes(id)) ||
      ids.some(id => !(ASURA_SOURCE_CONTRACT.ruleIds as readonly string[]).includes(id))) {
    issues.push('來源版本與規則清單不一致');
  }
  if (!result.core?.verification?.readyForInterpretation ||
      !result.core?.pillars?.hour || typeof result.core.pillars.hour !== 'object') {
    issues.push('四柱驗證或時辰資料不完整');
  }
  for (const row of coverage) {
    if (row.status === 'MATCHED' && (!row.matchedPillars?.length ||
        row.matchedPillars.some(pillar => !normalizePillarKey(pillar)))) {
      issues.push(`命中柱位缺漏或無法辨識：${row.id}`);
    }
    if (row.status === 'NOT_MATCHED' && row.matchedPillars?.length) {
      issues.push(`未命中狀態與柱位矛盾：${row.id}`);
    }
  }
  if (issues.length) return {
    records: [], combos: [], resultBatchId, motherVersion,
    adapterVersion: GHOST_ASURA_ADAPTER_VERSION, blockedReason: issues.join('；'),
  };

  const nameToRuleId = new Map<string, string>();
  const records: GhostAsuraVerifiedRecord[] = coverage.map((row) => {
    const rawName = typeof row.name === 'string' ? row.name.trim() : '';
    // 缺名保留後端編號完整度；稽核層用中性佔位，轉譯層再穩定延伸
    const originalName = rawName || `未知神煞`;
    if (rawName) nameToRuleId.set(rawName, row.id);
    nameToRuleId.set(row.id, row.id);
    const isMatched = row.status === 'MATCHED';
    const isNotMatched = row.status === 'NOT_MATCHED';
    return {
      resultId: row.id,
      ruleId: row.id,
      originalName,
      matched: isMatched ? true : isNotMatched ? false : null,
      pillars: isMatched ? mapPillars(row.matchedPillars) : [],
      resultBatchId,
      motherVersion,
      backendStatus: row.status,
      reason: row.reason,
      ruleVersion: motherVersion,
      source: 'dual-chart-coverage',
      sourceStatus: stars.rules?.[row.id]?.status ?? 'UNKNOWN',
      referenceMethod: stars.rules?.[row.id]?.referenceMethod === true,
    };
  });

  const combos: GhostAsuraVerifiedCombo[] = [];
  if (stars.iching?.state === 'READY' && Array.isArray(stars.iching.combos)) {
    for (const combo of stars.iching.combos) {
      if (!combo || !Array.isArray(combo.members) || combo.members.length < 2 ||
          combo.members.some(member => typeof member !== 'string')) return {
        records: [], combos: [], resultBatchId, motherVersion,
        adapterVersion: GHOST_ASURA_ADAPTER_VERSION, blockedReason: '組合資料格式不完整。',
      };
      const memberRuleIds = combo.members.map((memberName) => nameToRuleId.get(memberName));
      // Do not silently shorten a source combination or invent an unknown member.
      if (memberRuleIds.some(id => !id)) return {
        records: [], combos: [], resultBatchId, motherVersion,
        adapterVersion: GHOST_ASURA_ADAPTER_VERSION, blockedReason: `組合成員缺少對應編號：${combo.id}`,
      };
      combos.push({
        comboId: combo.id,
        title: combo.title,
        memberRuleIds: memberRuleIds as string[],
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
