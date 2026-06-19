import { DIMENSION_KEYS, type DimensionAdjustments, type DimensionScores, type Gender } from './types';
import { TRINITY_NORMALIZED_WEIGHTS, clampPercentage } from './trinity-weights';

/**
 * 限制分數在 0-100 範圍內
 */
function clamp(value: number) {
  return clampPercentage(value);
}

/**
 * 天地人 V5.0 人格融合引擎
 * 
 * 融合公式：
 * 人格原始分數 = 天模型(生日) × 35% + 地模型(血型) × 35% + 人模型(姓名) × 30%
 * 最終人格 = 人格原始分數 + 性別校正值
 */
export function fusePersonalityV5(
  birthScores: DimensionScores,
  bloodScores: DimensionScores,
  nameScores: DimensionScores,
  genderAdjustments: DimensionAdjustments,
): {
  rawPersonality: DimensionScores;
  finalScores: DimensionScores;
} {
  // 第一步：根據權重融合生日、血型、姓名三個模型
  const rawPersonality: DimensionScores = Object.fromEntries(
    DIMENSION_KEYS.map((key) => [
      key,
      clamp(
        birthScores[key] * TRINITY_NORMALIZED_WEIGHTS.sky
        + bloodScores[key] * TRINITY_NORMALIZED_WEIGHTS.earth
        + nameScores[key] * TRINITY_NORMALIZED_WEIGHTS.human
      ),
    ]),
  ) as DimensionScores;

  // 第二步：應用性別校正（改變表現方式，不改變本質）
  const finalScores: DimensionScores = Object.fromEntries(
    DIMENSION_KEYS.map((key) => [
      key,
      clamp(rawPersonality[key] + genderAdjustments[key]),
    ]),
  ) as DimensionScores;

  return { rawPersonality, finalScores };
}

/**
 * 預覽融合（天 + 地，沒有人）
 * 用於免費預覽階段 (70% 完成)
 */
export function fusePreviewPersonalityV5(
  birthScores: DimensionScores,
  bloodScores: DimensionScores,
): DimensionScores {
  const activeWeight = TRINITY_NORMALIZED_WEIGHTS.sky + TRINITY_NORMALIZED_WEIGHTS.earth;
  
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [
      key,
      clamp(
        (birthScores[key] * TRINITY_NORMALIZED_WEIGHTS.sky
          + bloodScores[key] * TRINITY_NORMALIZED_WEIGHTS.earth)
        / activeWeight
      ),
    ]),
  ) as DimensionScores;
}

/**
 * 計算整體人格分數（12 維平均）
 */
export function aggregatePersonalityScore(scores: DimensionScores): number {
  const total = DIMENSION_KEYS.reduce((sum, key) => sum + scores[key], 0);
  return clampPercentage(total / DIMENSION_KEYS.length);
}
