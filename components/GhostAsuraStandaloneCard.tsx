/**
 * 鬼魅阿修羅獨立卡片 — 轉接至正式解盤接線（080-14）
 *
 * 保留元件路徑相容；實際資料流走 features/ghost-asura。
 */

'use client';

import type { DualChartResult } from '@/lib/dual-chart';
import {
  buildGhostAsuraReading,
  type GhostAsuraReading,
  type GhostAsuraVerifiedRecord,
} from '@/features/ghost-asura';
import { GhostAsuraCard } from '@/features/ghost-asura/components/GhostAsuraCard';
import type { ShenShaRaw } from '@/lib/ghost-asura-complete';

interface GhostAsuraStandaloneCardProps {
  /** 正式路徑：dual-chart 完整結果 */
  result?: DualChartResult;
  /** 已組好的 reading（測試／上層預先建） */
  reading?: GhostAsuraReading;
  /**
   * 相容舊呼叫：僅命中列的精簡陣列。
   * 缺少未命中 coverage 時無法代表全量；正式路徑請改傳 result。
   */
  shenShaData?: ShenShaRaw[];
  resultBatchId?: string;
}

function recordsFromLegacyShenSha(
  shenShaData: ShenShaRaw[],
  resultBatchId: string
): GhostAsuraVerifiedRecord[] {
  return shenShaData.map((item) => {
    const pillar =
      item.hitPillar === 'year' ||
      item.hitPillar === 'month' ||
      item.hitPillar === 'day' ||
      item.hitPillar === 'hour'
        ? item.hitPillar
        : item.category === 'year' ||
            item.category === 'month' ||
            item.category === 'day' ||
            item.category === 'hour'
          ? item.category
          : undefined;

    return {
      resultId: item.id,
      ruleId: item.id,
      originalName: item.originalName,
      matched: item.matched,
      pillars: pillar ? [pillar] : [],
      source: item.source,
      ruleVersion: item.ruleVersion,
      resultBatchId,
      motherVersion: item.ruleVersion ?? 'LEGACY_SHENSHA_RAW',
      backendStatus: item.matched ? 'MATCHED' : 'NOT_MATCHED',
    };
  });
}

export function GhostAsuraStandaloneCard({
  result,
  reading: readingProp,
  shenShaData,
  resultBatchId = 'LEGACY_STANDALONE_BATCH',
}: GhostAsuraStandaloneCardProps) {
  const reading =
    readingProp ??
    (result
      ? buildGhostAsuraReading({ result })
      : shenShaData?.length
        ? buildGhostAsuraReading({
            records: recordsFromLegacyShenSha(shenShaData, resultBatchId),
            resultBatchId,
          })
        : null);

  if (!reading || reading.items.length === 0) {
    return null;
  }

  return <GhostAsuraCard reading={reading} />;
}

export default GhostAsuraStandaloneCard;
