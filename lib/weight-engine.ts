import { DIMENSION_KEYS, type DimensionAdjustments, type DimensionScores, type Gender } from './types';
import { TRINITY_NORMALIZED_WEIGHTS, clampPercentage } from './trinity-weights';

function clamp(value: number) {
  return clampPercentage(value);
}

export function fusePersonalityV5(
  birthScores: DimensionScores,
  bloodScores: DimensionScores,
  nameScores: DimensionScores,
  genderAdjustments: DimensionAdjustments,
): { rawPersonality: DimensionScores; finalScores: DimensionScores } {
  const rawPersonality = Object.fromEntries(
    DIMENSION_KEYS.map((key) => [
      key,
      clamp(
        birthScores[key] * TRINITY_NORMALIZED_WEIGHTS.sky
          + bloodScores[key] * TRINITY_NORMALIZED_WEIGHTS.earth
          + nameScores[key] * TRINITY_NORMALIZED_WEIGHTS.human,
      ),
    ]),
  ) as DimensionScores;

  const finalScores = Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, clamp(rawPersonality[key] + genderAdjustments[key])]),
  ) as DimensionScores;

  return { rawPersonality, finalScores };
}

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
          + bloodScores[key] * TRINITY_NORMALIZED_WEIGHTS.earth) / activeWeight,
      ),
    ]),
  ) as DimensionScores;
}

export function aggregatePersonalityScore(scores: DimensionScores): number {
  const total = DIMENSION_KEYS.reduce((sum, key) => sum + scores[key], 0);
  return clampPercentage(total / DIMENSION_KEYS.length);
}

export function subtractScores(next: DimensionScores, base: DimensionScores): DimensionAdjustments {
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, Math.round(next[key] - base[key])]),
  ) as DimensionAdjustments;
}

export function neutralAdjustments(): DimensionAdjustments {
  return Object.fromEntries(DIMENSION_KEYS.map((key) => [key, 0])) as DimensionAdjustments;
}

export function explainGender(gender: Gender) {
  return gender === 'male'
    ? '男性校正偏向提升外在決斷、行動推進與主導感。'
    : '女性校正偏向提升情緒感知、同理互動與細膩度。';
}
