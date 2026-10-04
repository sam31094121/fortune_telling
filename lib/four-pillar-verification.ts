/**
 * Shared, dependency-free comparison of already-calculated pillars.
 * Extracted unchanged from three-in-one.ts so chart consumers do not load its
 * optional star-beast integration. This does not calculate or alter pillars.
 */
export interface FourPillars {
  year: string;
  month: string;
  day: string;
  hour: string;
}

export interface FourPillarDifference {
  pillar: keyof FourPillars;
  bazi: string;
  ziwei: string;
}

export interface FourPillarVerification {
  passed: boolean;
  differences: FourPillarDifference[];
}

const PILLAR_FIELDS: Array<keyof FourPillars> = ['year', 'month', 'day', 'hour'];

/** 四柱名稱的中文，異常報告要給人看的。 */
export const PILLAR_LABELS: Record<keyof FourPillars, string> = {
  year: '年柱',
  month: '月柱',
  day: '日柱',
  hour: '時柱',
};

export function verifyFourPillars(bazi: FourPillars, ziwei: FourPillars): FourPillarVerification {
  const differences = PILLAR_FIELDS
    .filter((field) => bazi[field] !== ziwei[field])
    .map((field) => ({ pillar: field, bazi: bazi[field], ziwei: ziwei[field] }));

  return { passed: differences.length === 0, differences };
}
