/**
 * 鬼魅阿修羅 — 正式解盤接線入口
 *
 * 資料流：
 * coverage → adapter → registry → translator → narrative → battle → guard → 前端只讀
 */

import {
  adaptVerifiedShenSha,
  type GhostAsuraAdapterInput,
} from './adapter';
import { buildBattleField, buildChains, buildDualClashes } from './battle';
import { guardCompleteness } from './guard';
import { buildNarratives } from './narrative';
import { GHOST_ASURA_NAMING_VERSION } from './registry';
import {
  GHOST_ASURA_TRANSLATE_VERSION,
  translateVerifiedRecords,
} from './translator';
import type { GhostAsuraDisplayItem, GhostAsuraReading } from './types';
import {
  GHOST_ASURA_CARD_TITLE,
  GHOST_ASURA_UI,
  sealStatusLabel,
} from './uiText';

export * from './types';
export * from './uiText';
export * from './registry';
export * from './adapter';
export * from './translator';
export * from './narrative';
export * from './battle';
export * from './guard';

export function buildGhostAsuraReading(
  input: GhostAsuraAdapterInput
): GhostAsuraReading {
  const adapted = adaptVerifiedShenSha(input);

  if (adapted.blockedReason) {
    const emptyGuard = guardCompleteness({
      backend: [],
      translated: [],
      displayed: [],
    });
    return {
      cardTitle: GHOST_ASURA_CARD_TITLE,
      resultBatchId: adapted.resultBatchId,
      motherVersion: adapted.motherVersion,
      namingVersion: GHOST_ASURA_NAMING_VERSION,
      translateVersion: GHOST_ASURA_TRANSLATE_VERSION,
      items: [],
      dualClashes: [],
      chains: [],
      battleField: {
        mainSoul: GHOST_ASURA_UI.noReading,
        mainGuardian: GHOST_ASURA_UI.noReading,
        mainTribulation: GHOST_ASURA_UI.noReading,
        mainShadow: GHOST_ASURA_UI.noReading,
        charmPower: GHOST_ASURA_UI.noReading,
        authorityPower: GHOST_ASURA_UI.noReading,
        treasurePower: GHOST_ASURA_UI.noReading,
        movementPower: GHOST_ASURA_UI.noReading,
        breakthrough: GHOST_ASURA_UI.noReading,
        finalVerdict: adapted.blockedReason,
      },
      guard: {
        ...emptyGuard,
        status: 'FAILED',
        message: adapted.blockedReason,
        details: [adapted.blockedReason],
      },
      awakenedCount: 0,
      dormantCount: 0,
      pendingCount: 0,
      pendingEntries: [
        {
          resultId: 'ADAPTER_BLOCKED',
          originalName: '—',
          reason: adapted.blockedReason,
        },
      ],
    };
  }

  const translated = translateVerifiedRecords(adapted.records);
  const narratives = buildNarratives(translated);
  const narrativeById = new Map(narratives.map((row) => [row.resultId, row]));

  const items: GhostAsuraDisplayItem[] = translated.map((item) => {
    const narrative = narrativeById.get(item.resultId);
    return {
      resultId: item.resultId,
      displayName: item.displayName,
      sealStatus: item.sealStatus,
      sealLabel: sealStatusLabel(item.sealStatus),
      pillarLabels: item.pillarLabels,
      shortDeclaration: narrative?.shortDeclaration ?? null,
      coreMeaning: narrative?.coreMeaning ?? null,
      battleSignificance: narrative?.battleSignificance ?? null,
      verdict: narrative?.verdict ?? null,
      pendingReason: narrative?.pendingReason ?? item.pendingReason,
    };
  });

  const dualClashes = buildDualClashes(translated, adapted.combos);
  const chains = buildChains(translated, adapted.combos);
  const battleField = buildBattleField(translated, adapted.combos);

  const guard = guardCompleteness({
    backend: adapted.records,
    translated,
    displayed: items,
    expectedBatchId: adapted.resultBatchId,
  });

  const pendingEntries = [
    ...translated
      .filter((item) => item.sealStatus === 'pending')
      .map((item) => ({
        resultId: item.resultId,
        originalName: item.originalName,
        reason: item.pendingReason ?? GHOST_ASURA_UI.pendingHint,
      })),
    ...narratives
      .filter((row) => row.pendingReason && row.sealStatus !== 'pending')
      .map((row) => {
        const source = translated.find((item) => item.resultId === row.resultId);
        return {
          resultId: row.resultId,
          originalName: source?.originalName ?? row.displayName ?? row.resultId,
          reason: row.pendingReason ?? GHOST_ASURA_UI.pendingHint,
        };
      }),
  ];

  // 話術缺漏也視為正式完成未過
  if (narratives.some((row) => row.pendingReason && !row.hasApprovedWording && row.sealStatus === 'awakened')) {
    if (guard.status === 'PASSED') {
      guard.status = 'FAILED';
      guard.message = 'GHOST_ASURA_INCOMPLETE: 話術缺漏';
    }
    guard.details.push('覺醒印存在話術未核可條目');
  }

  return {
    cardTitle: GHOST_ASURA_CARD_TITLE,
    resultBatchId: adapted.resultBatchId,
    motherVersion: adapted.motherVersion,
    namingVersion: GHOST_ASURA_NAMING_VERSION,
    translateVersion: GHOST_ASURA_TRANSLATE_VERSION,
    items,
    dualClashes,
    chains,
    battleField,
    guard,
    awakenedCount: items.filter((item) => item.sealStatus === 'awakened').length,
    dormantCount: items.filter((item) => item.sealStatus === 'dormant').length,
    pendingCount: items.filter((item) => item.sealStatus === 'pending').length,
    pendingEntries,
  };
}
