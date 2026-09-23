/**
 * 變身引擎：依注入累積 + 門檻推進階級。
 * 變身同時更換：appearanceId + stats + skillIds（非僅攻擊加成）。
 */

import type { BattleConfig, CardStats } from '../config/battle-config.js';

/** 單一變身形態資料（資料驅動，禁止 per-card 程式分支） */
export interface TransformForm {
  tier: number;
  appearanceId: string;
  stats: CardStats;
  skillIds: string[];
}

export interface TransformCheckInput {
  /** 當前階級（0 = 基礎形態） */
  currentTier: number;
  /** 累積注入點 */
  injectPoints: number;
  /** 該卡所有形態（含 tier 0 基礎） */
  forms: TransformForm[];
}

export interface TransformCheckResult {
  didTransform: boolean;
  /** 推進後階級 */
  newTier: number;
  /** 若變身：新外觀 / 數值 / 技能（三者一併更換） */
  appearanceId: string;
  stats: CardStats;
  skillIds: string[];
}

/**
 * 依累積注入點與 config.tierThresholds 決定是否晉升。
 * 可一次跨多階（若累積足夠）。
 */
export function checkAndApplyTransform(
  input: TransformCheckInput,
  config: BattleConfig,
): TransformCheckResult {
  const thresholds = config.transform.tierThresholds;
  const formByTier = new Map(input.forms.map((f) => [f.tier, f]));

  let tier = input.currentTier;
  // 嘗試推進到更高階級
  for (let next = tier + 1; next < thresholds.length; next++) {
    const need = thresholds[next];
    if (need === undefined) break;
    if (input.injectPoints >= need && formByTier.has(next)) {
      tier = next;
    } else {
      break;
    }
  }

  const form = formByTier.get(tier);
  if (!form) {
    // 資料缺漏：維持現狀（取 current 或 forms[0]）
    const fallback = formByTier.get(input.currentTier) ?? input.forms[0];
    if (!fallback) {
      throw new Error('[transformation-engine] forms 不可為空');
    }
    return {
      didTransform: false,
      newTier: input.currentTier,
      appearanceId: fallback.appearanceId,
      stats: { ...fallback.stats },
      skillIds: [...fallback.skillIds],
    };
  }

  return {
    didTransform: tier !== input.currentTier,
    newTier: tier,
    appearanceId: form.appearanceId,
    stats: { ...form.stats },
    skillIds: [...form.skillIds],
  };
}
