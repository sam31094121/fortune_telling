import { DIMENSION_KEYS, type DimensionAdjustments, type DimensionScores } from './types';
import { TRINITY_NORMALIZED_WEIGHTS } from './trinity-weights';

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function adjustedScores(base: DimensionScores, adjustments: DimensionAdjustments) {
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, clamp(base[key] + adjustments[key])]),
  ) as DimensionScores;
}

export function fuseFixedWeights(
  base: DimensionScores,
  bloodAdjustments: DimensionAdjustments,
  nameAdjustments: DimensionAdjustments,
): DimensionScores {
  const earth = adjustedScores(base, bloodAdjustments);
  const human = adjustedScores(base, nameAdjustments);
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [
      key,
      clamp(base[key] * TRINITY_NORMALIZED_WEIGHTS.sky
        + earth[key] * TRINITY_NORMALIZED_WEIGHTS.earth
        + human[key] * TRINITY_NORMALIZED_WEIGHTS.human),
    ]),
  ) as DimensionScores;
}

export function fusePreviewWeights(
  base: DimensionScores,
  bloodAdjustments: DimensionAdjustments,
): DimensionScores {
  const earth = adjustedScores(base, bloodAdjustments);
  const activeWeight = TRINITY_NORMALIZED_WEIGHTS.sky + TRINITY_NORMALIZED_WEIGHTS.earth;
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [
      key,
      clamp(
        (base[key] * TRINITY_NORMALIZED_WEIGHTS.sky
          + earth[key] * TRINITY_NORMALIZED_WEIGHTS.earth)
          / activeWeight,
      ),
    ]),
  ) as DimensionScores;
}

export function stableAggregateScore(scores: DimensionScores) {
  return clamp(DIMENSION_KEYS.reduce((total, key) => total + scores[key], 0) / DIMENSION_KEYS.length);
}
