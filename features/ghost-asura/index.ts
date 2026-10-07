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
import { assertAsuraCoverage } from './skill';
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
export * from './extendName';
export * from './adapter';
export * from './translator';
export * from './narrative';
export * from './battle';
export * from './guard';

export function buildGhostAsuraReading(
  input: GhostAsuraAdapterInput
): GhostAsuraReading {
  const adapted = adaptVerifiedShenSha(input);
  const provenance = {
    verifiedRuleIds: adapted.records.filter(r => r.sourceStatus === 'VERIFIED' && !r.referenceMethod).map(r => r.ruleId),
    referenceRuleIds: adapted.records.filter(r => r.referenceMethod).map(r => r.ruleId),
    unverifiedRuleIds: adapted.records.filter(r => r.sourceStatus !== 'VERIFIED' && !r.referenceMethod).map(r => r.ruleId),
  };
  const hourPillar = input.result?.core?.pillars?.hour;

  // 提取四柱幹支（年月日時）
  const pillars = {
    year: input.result?.core?.pillars?.year?.ganZhi ?? '',
    month: input.result?.core?.pillars?.month?.ganZhi ?? '',
    day: input.result?.core?.pillars?.day?.ganZhi ?? '',
    hour: hourPillar && typeof hourPillar === 'object' ? hourPillar.ganZhi : '',
  };

  if (adapted.blockedReason) {
    const emptyGuard = guardCompleteness({
      backend: [],
      translated: [],
      displayed: [],
    });
    return {
      provenance,
      cardTitle: GHOST_ASURA_CARD_TITLE,
      resultBatchId: adapted.resultBatchId,
      motherVersion: adapted.motherVersion,
      namingVersion: GHOST_ASURA_NAMING_VERSION,
      translateVersion: GHOST_ASURA_TRANSLATE_VERSION,
      pillars,
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
        finalVerdict: GHOST_ASURA_UI.incompleteBanner,
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
          label: GHOST_ASURA_UI.pendingNeutralLabel,
          reason: adapted.blockedReason,
        },
      ],
    };
  }

  const translated = translateVerifiedRecords(adapted.records);
  const narratives = buildNarratives(translated);
  const narrativeById = new Map(narratives.map((row) => [row.resultId, row]));

  // 覺醒命中數必須等於已有完整話術的筆數；不相等直接丟 ASURA_COVERAGE_MISMATCH（附缺漏編號）。
  assertAsuraCoverage(
    translated.filter((item) => item.sealStatus === 'awakened').map((item) => item.resultId),
    narratives.filter((row) => row.sealStatus === 'awakened' && row.hasApprovedWording).map((row) => row.resultId),
  );

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

  // 僅後端未驗證（真缺項）進 pendingEntries；話術缺漏改欄位級提示，不進紅條名單
  const pendingEntries = translated
    .filter((item) => item.sealStatus === 'pending')
    .map((item) => ({
      resultId: item.resultId,
      label: item.displayName || GHOST_ASURA_UI.pendingNeutralLabel,
      reason: item.pendingReason ?? GHOST_ASURA_UI.pendingHint,
    }));

  return {
    provenance,
    cardTitle: GHOST_ASURA_CARD_TITLE,
    resultBatchId: adapted.resultBatchId,
    motherVersion: adapted.motherVersion,
    namingVersion: GHOST_ASURA_NAMING_VERSION,
    translateVersion: GHOST_ASURA_TRANSLATE_VERSION,
    pillars,
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
