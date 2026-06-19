export const TRINITY_DISPLAY_WEIGHTS = {
  sky: 35,
  earth: 35,
  human: 30,
} as const;

export const TRINITY_PROGRESS = {
  sky: TRINITY_DISPLAY_WEIGHTS.sky,
  earth: TRINITY_DISPLAY_WEIGHTS.sky + TRINITY_DISPLAY_WEIGHTS.earth,
  human: 100,
} as const;

export function normalizeWeights<T extends Record<string, number>>(weights: T): T {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    throw new Error('權重總和必須大於 0。');
  }

  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / total]),
  ) as T;
}

export const TRINITY_NORMALIZED_WEIGHTS = normalizeWeights({
  ...TRINITY_DISPLAY_WEIGHTS,
});

export function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function averageScore(values: number[]) {
  if (!values.length) return 0;
  return clampPercentage(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function fuseTrinityStages(skyScore: number, earthScore: number, humanScore: number) {
  const weights = TRINITY_NORMALIZED_WEIGHTS;

  return clampPercentage(
    skyScore * weights.sky
      + earthScore * weights.earth
      + humanScore * weights.human,
  );
}
