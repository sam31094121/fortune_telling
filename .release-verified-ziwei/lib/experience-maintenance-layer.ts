import type { FineDiningExperienceModule } from './fine-dining-experience-engine';

export type ExperienceQualityLevel = 'LEVEL_1_STANDARD' | 'LEVEL_2_REFINED' | 'LEVEL_3_SIGNATURE';

export type ExperienceMaintenanceCardReport = {
  module: FineDiningExperienceModule;
  level: ExperienceQualityLevel;
  checks: {
    unifiedServiceFlow: boolean;
    threeLayerResult: boolean;
    semanticDedup: boolean;
    mobileFirstScreen: boolean;
    noInfiniteLoading: boolean;
    selfOtherIsolated: boolean;
  };
  nextAction: string;
};

export const EXPERIENCE_MAINTENANCE_MODULES: FineDiningExperienceModule[] = [
  'number',
  'ziwei',
  'bazi',
  'zodiac',
  'soul_match',
  'music',
  'nameology',
  'tarot',
  'growth',
];

export function evaluateExperienceMaintenanceReport(report: Omit<ExperienceMaintenanceCardReport, 'level' | 'nextAction'>): ExperienceMaintenanceCardReport {
  const passed = Object.values(report.checks).filter(Boolean).length;
  const total = Object.values(report.checks).length;
  const level: ExperienceQualityLevel = passed === total
    ? 'LEVEL_3_SIGNATURE'
    : passed >= total - 1
      ? 'LEVEL_2_REFINED'
      : 'LEVEL_1_STANDARD';

  return {
    ...report,
    level,
    nextAction: level === 'LEVEL_3_SIGNATURE'
      ? '本卡可進入下一張逐卡驗收。'
      : '先修復未通過項目，再重新驗收本卡。',
  };
}