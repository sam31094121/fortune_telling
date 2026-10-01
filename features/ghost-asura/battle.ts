/**
 * 鬼魅阿修羅 — 戰局層
 *
 * 四層解盤：單印由外層處理；雙印／連鎖只接已驗證組合；
 * 命魂戰局有依據才填，否則「此域暫無可用判讀」。
 * 禁止自行推導誰剋誰、誰吞誰、強弱分數。
 */

import type {
  GhostAsuraBattleField,
  GhostAsuraChain,
  GhostAsuraDualClash,
  GhostAsuraTranslatedItem,
  GhostAsuraVerifiedCombo,
} from './types';
import { GHOST_ASURA_UI, normalizePillarKey, PILLAR_UI } from './uiText';

const NO = GHOST_ASURA_UI.noReading;

function displayOf(
  items: GhostAsuraTranslatedItem[],
  ruleIdOrName: string
): string | null {
  const hit = items.find(
    (item) =>
      item.ruleId === ruleIdOrName ||
      item.originalName === ruleIdOrName ||
      item.displayName === ruleIdOrName
  );
  if (!hit || hit.sealStatus !== 'awakened' || !hit.displayName) return null;
  return hit.displayName;
}

function comboMemberDisplays(
  combo: GhostAsuraVerifiedCombo,
  items: GhostAsuraTranslatedItem[]
): string[] {
  const fromIds = combo.memberRuleIds
    .map((id) => displayOf(items, id))
    .filter((name): name is string => Boolean(name));
  if (fromIds.length >= 2) return [...new Set(fromIds)];

  const fromNames = combo.memberNames
    .map((name) => displayOf(items, name))
    .filter((name): name is string => Boolean(name));
  return [...new Set(fromNames)];
}

function pillarLabelOf(pillar: string | null): string | null {
  if (!pillar) return null;
  // 可能是「年柱、月柱」合併字串
  const parts = pillar.split('、').map((part) => part.trim());
  const labels = parts
    .map((part) => {
      const key = normalizePillarKey(part);
      return key ? PILLAR_UI[key].label : part;
    })
    .filter(Boolean);
  return labels.length ? labels.join('、') : pillar;
}

/** 第二層：雙印交鋒 — 僅已驗證組合且至少兩枚覺醒印 */
export function buildDualClashes(
  items: GhostAsuraTranslatedItem[],
  combos: GhostAsuraVerifiedCombo[]
): GhostAsuraDualClash[] {
  const out: GhostAsuraDualClash[] = [];
  for (const combo of combos) {
    const members = comboMemberDisplays(combo, items);
    if (members.length < 2) continue;
    if (members.length > 2) continue; // 三印以上走連鎖
    out.push({
      comboId: combo.comboId,
      title: combo.title,
      memberDisplayNames: members,
      pillarLabel: pillarLabelOf(combo.pillar),
      evidenceText: combo.evidenceText,
    });
  }
  return out;
}

/** 第三層：阿修羅連鎖 — 三印以上且有核可組合依據 */
export function buildChains(
  items: GhostAsuraTranslatedItem[],
  combos: GhostAsuraVerifiedCombo[]
): GhostAsuraChain[] {
  const out: GhostAsuraChain[] = [];
  for (const combo of combos) {
    const members = comboMemberDisplays(combo, items);
    if (members.length < 3) continue;
    out.push({
      comboId: combo.comboId,
      title: combo.title,
      memberDisplayNames: members,
      evidenceText: combo.evidenceText,
    });
  }
  return out;
}

function firstAwakenedByFamily(
  items: GhostAsuraTranslatedItem[],
  families: string[]
): string {
  const hit = items.find(
    (item) =>
      item.sealStatus === 'awakened' &&
      item.displayName &&
      item.family &&
      families.includes(item.family)
  );
  return hit?.displayName ?? NO;
}

/**
 * 第四層：命魂戰局
 * 以登錄表 family 做呈現分欄（不是新命理算法／強弱計分）。
 * 無覺醒印的欄位寫「此域暫無可用判讀」。
 */
export function buildBattleField(
  items: GhostAsuraTranslatedItem[],
  combos: GhostAsuraVerifiedCombo[]
): GhostAsuraBattleField {
  const awakened = items.filter(
    (item) => item.sealStatus === 'awakened' && item.displayName
  );

  if (awakened.length === 0) {
    return {
      mainSoul: NO,
      mainGuardian: NO,
      mainTribulation: NO,
      mainShadow: NO,
      charmPower: NO,
      authorityPower: NO,
      treasurePower: NO,
      movementPower: NO,
      breakthrough: NO,
      finalVerdict: NO,
    };
  }

  const mainSoul = awakened[0]?.displayName ?? NO;
  const mainGuardian = firstAwakenedByFamily(items, ['DIVINE_PROTECTION']);
  const mainTribulation = firstAwakenedByFamily(items, [
    'TRIBULATION',
    'RUPTURE',
  ]);
  const mainShadow = firstAwakenedByFamily(items, ['SHADOW', 'ISOLATION']);
  const charmPower = firstAwakenedByFamily(items, ['CHARM']);
  const authorityPower = firstAwakenedByFamily(items, ['POWER', 'BLADE']);
  const treasurePower = firstAwakenedByFamily(items, ['TREASURE']);
  const movementPower = firstAwakenedByFamily(items, [
    'MOVEMENT',
    'TRANSFORMATION',
  ]);

  const primaryCombo = combos.find((combo) => {
    const members = comboMemberDisplays(combo, items);
    return members.length >= 2;
  });

  const breakthrough = primaryCombo
    ? `依核可組合「${primaryCombo.title}」布防：先守判斷，再找破口。`
    : mainTribulation !== NO
      ? `先辨「${mainTribulation}」再布防。`
      : mainSoul !== NO
        ? `以「${mainSoul}」為座標，先守住判斷。`
        : NO;

  const finalVerdict = primaryCombo
    ? primaryCombo.evidenceText
    : awakened.length === 1
      ? `單印覺醒：${mainSoul}。組合依據不足，不另造戰局宣判。`
      : `覺醒 ${awakened.length} 印；尚無可用組合依據，戰局宣判暫緩。`;

  return {
    mainSoul,
    mainGuardian,
    mainTribulation,
    mainShadow,
    charmPower,
    authorityPower,
    treasurePower,
    movementPower,
    breakthrough,
    finalVerdict,
  };
}
