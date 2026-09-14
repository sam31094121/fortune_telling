/**
 * 戰鬥特效挑選器（EffectComposer）
 * ============================================================================
 *
 * 依合體結算（tier／元素／卡 id）從 BattleAssetRegistry 挑 4～8 個真實素材。
 * 規則層已在 fusion.ts 算完；這裡只挑「要播什麼」，不改勝負、不擲骰。
 * 缺類（ICE／PORTAL 等）誠實跳過，不造假補檔。
 */

import type { BeastElement } from './elements';
import type { FusionTier } from './fusion';
import {
  battleAssets,
  assetsInCategory,
  type BattleAsset,
  type BattleAssetCategory,
} from './battle-assets';

export const EFFECT_PICK_MIN = 4;
export const EFFECT_PICK_MAX = 8;

export type EffectComposeInput = {
  tier: FusionTier;
  /** 主動卡元素（玩家側為主） */
  element?: BeastElement | null;
  /** 合體雙方卡 id；有專屬衝鋒片才綁 */
  cardIds?: readonly string[];
  /** 手機／省流量：略過非 mobileSafe 與視訊 */
  mobile?: boolean;
  /** 減少動態：略過 SCREEN_SHAKE 與強度 ≥5 的預設 */
  reducedMotion?: boolean;
};

export type EffectComposeResult = {
  assets: BattleAsset[];
  categoriesUsed: BattleAssetCategory[];
  skippedEmpty: BattleAssetCategory[];
};

const TIER_PIPELINE: Record<FusionTier, readonly BattleAssetCategory[]> = {
  NONE: ['CARD_AURA', 'COLLISION', 'FLASH', 'AUDIO'],
  RESONANCE: ['ORB', 'ELEMENT', 'CHARGE', 'FLASH', 'AUDIO'],
  DUAL_UNSEAL: ['ORB', 'CHARGE', 'FUSION', 'COLLISION', 'ELEMENT', 'AUDIO', 'SHOCKWAVE'],
  TRUE_FUSION: ['FUSION', 'RAGE', 'CHARGE', 'COLLISION', 'SHOCKWAVE', 'PARTICLE', 'FLASH', 'AUDIO'],
  RAGE_ULTIMATE: [
    'RAGE',
    'ULTIMATE',
    'FUSION',
    'CHARGE',
    'COLLISION',
    'SHOCKWAVE',
    'FLASH',
    'PARTICLE',
    'FINISH',
    'LIGHTNING',
    'AUDIO',
    'BACKGROUND',
  ],
};

const ELEMENT_CATEGORY: Partial<Record<BeastElement, BattleAssetCategory>> = {
  WATER: 'ELEMENT',
  FIRE: 'FIRE',
  AIR: 'WIND',
  EARTH: 'EARTH',
  SPACE: 'LIGHTNING',
};

function intensityFloor(tier: FusionTier): number {
  switch (tier) {
    case 'RAGE_ULTIMATE':
      return 3;
    case 'TRUE_FUSION':
      return 2;
    case 'DUAL_UNSEAL':
      return 2;
    default:
      return 1;
  }
}

function prefer(a: BattleAsset, b: BattleAsset, input: EffectComposeInput): number {
  const aCard = input.cardIds?.includes(a.cardId ?? '') ? 1 : 0;
  const bCard = input.cardIds?.includes(b.cardId ?? '') ? 1 : 0;
  if (aCard !== bCard) return bCard - aCard;
  const el = input.element;
  const aEl = el && a.element === el ? 1 : 0;
  const bEl = el && b.element === el ? 1 : 0;
  if (aEl !== bEl) return bEl - aEl;
  if (a.intensity !== b.intensity) return b.intensity - a.intensity;
  return a.assetId.localeCompare(b.assetId);
}

function eligible(asset: BattleAsset, input: EffectComposeInput): boolean {
  if (input.mobile && !asset.mobileSafe) return false;
  if (input.mobile && (asset.type === 'WEBM' || asset.type === 'MP4')) return false;
  if (input.reducedMotion && asset.category === 'SCREEN_SHAKE') return false;
  if (input.reducedMotion && asset.intensity >= 5) return false;
  if (asset.intensity < intensityFloor(input.tier)) return false;
  if (asset.cardId && input.cardIds && !input.cardIds.includes(asset.cardId)) return false;
  return true;
}

/**
 * 從登記表挑 4～8 個要播的素材。空類跳過；不夠就從 COLLISION／FLASH／FINISH 補。
 */
export function composeBattleEffects(input: EffectComposeInput): EffectComposeResult {
  const pipeline = [...TIER_PIPELINE[input.tier]];
  if (input.element && ELEMENT_CATEGORY[input.element]) {
    const cat = ELEMENT_CATEGORY[input.element]!;
    if (!pipeline.includes(cat)) pipeline.splice(Math.min(2, pipeline.length), 0, cat);
  }

  const picked: BattleAsset[] = [];
  const used = new Set<string>();
  const categoriesUsed: BattleAssetCategory[] = [];
  const skippedEmpty: BattleAssetCategory[] = [];

  const takeOne = (category: BattleAssetCategory): boolean => {
    const pool = assetsInCategory(category)
      .filter((asset) => eligible(asset, input) && !used.has(asset.assetId))
      .sort((a, b) => prefer(a, b, input));
    if (pool.length === 0) {
      skippedEmpty.push(category);
      return false;
    }
    const choice = pool[0]!;
    used.add(choice.assetId);
    picked.push(choice);
    if (!categoriesUsed.includes(category)) categoriesUsed.push(category);
    return true;
  };

  for (const category of pipeline) {
    if (picked.length >= EFFECT_PICK_MAX) break;
    takeOne(category);
  }

  const fillers: BattleAssetCategory[] = ['COLLISION', 'FLASH', 'FINISH', 'PARTICLE', 'DEBRIS', 'BACKGROUND'];
  for (const category of fillers) {
    if (picked.length >= EFFECT_PICK_MIN) break;
    if (categoriesUsed.includes(category)) continue;
    takeOne(category);
  }

  if (picked.length < EFFECT_PICK_MIN) {
    const loose = battleAssets()
      .filter((asset) => !used.has(asset.assetId))
      .filter((asset) => {
        if (input.mobile && !asset.mobileSafe) return false;
        if (input.reducedMotion && asset.category === 'SCREEN_SHAKE') return false;
        if (asset.cardId && input.cardIds && !input.cardIds.includes(asset.cardId)) return false;
        return true;
      })
      .sort((a, b) => prefer(a, b, input));
    for (const asset of loose) {
      if (picked.length >= EFFECT_PICK_MIN) break;
      used.add(asset.assetId);
      picked.push(asset);
      if (!categoriesUsed.includes(asset.category)) categoriesUsed.push(asset.category);
    }
  }

  return {
    assets: picked.slice(0, EFFECT_PICK_MAX),
    categoriesUsed,
    skippedEmpty: [...new Set(skippedEmpty)],
  };
}

/** 只回 assetId，方便前端／時間軸消耗 */
export function composeBattleEffectIds(input: EffectComposeInput): string[] {
  return composeBattleEffects(input).assets.map((asset) => asset.assetId);
}
