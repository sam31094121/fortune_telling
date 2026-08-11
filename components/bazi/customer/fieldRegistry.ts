/**
 * BAZI_PROFESSIONAL_FIELD_REGISTRY｜System Lock V2 §19
 *
 * 只描述「後端專業欄位要在哪一層顯示、由哪個元件負責」。
 * 禁止任何命理計算。Coverage Test 據此檢查 Render Path 是否存在，
 * 後端新增專業欄位而前端未支援時，測試必須提醒，禁止靜默遺漏。
 *
 * accessor：元件原始碼中必須出現的資料存取字串（Render Path 證明）。
 */

export interface BaziFieldRegistryEntry {
  required: boolean;
  level: number[];
  accessor: string;
  components: string[];
}

export const BAZI_PROFESSIONAL_FIELD_REGISTRY: Record<string, BaziFieldRegistryEntry> = {
  // A｜出生基本資料
  birthInput: { required: true, level: [1, 3], accessor: 'birthSummary', components: ['BaziHeroCard.tsx'] },
  calendar: { required: true, level: [3], accessor: 'pc.calendar', components: ['ProfessionalBaziTable.tsx'] },
  timezone: { required: true, level: [3], accessor: 'result.timezone', components: ['ProfessionalBaziTable.tsx'] },
  dataCompleteness: { required: true, level: [1, 3], accessor: 'hourUnknown', components: ['FourPillarsCard.tsx', 'ProfessionalBaziTable.tsx'] },
  // B｜四柱
  pillars: { required: true, level: [1, 3], accessor: 'pillars', components: ['FourPillarsCard.tsx', 'ProfessionalBaziTable.tsx'] },
  dayMaster: { required: true, level: [1, 2, 3], accessor: 'dayMaster', components: ['BaziHeroCard.tsx', 'TeacherSummary.tsx', 'ProfessionalBaziTable.tsx'] },
  // C｜四柱專業結構
  hiddenStems: { required: true, level: [3], accessor: 'hiddenStemStructure', components: ['ProfessionalBaziTable.tsx'] },
  tenGodsPerPillar: { required: true, level: [3], accessor: 'pc.tenGods', components: ['ProfessionalBaziTable.tsx'] },
  tenGodDistribution: { required: true, level: [2, 3], accessor: 'tenGodDistribution', components: ['TenGodSection.tsx', 'ProfessionalBaziTable.tsx'] },
  pillarDetails: { required: true, level: [3], accessor: 'pillarDetails', components: ['ProfessionalBaziTable.tsx'] },
  // D｜五行
  elementStatistics: { required: true, level: [1, 3], accessor: 'elementStatistics', components: ['adapter.ts', 'ProfessionalBaziTable.tsx'] },
  elementCounts: { required: true, level: [3], accessor: 'elementCounts', components: ['ProfessionalBaziTable.tsx'] },
  fiveElementOrbit: { required: true, level: [1], accessor: 'fiveElementOrbit', components: ['adapter.ts', 'BaziHeroCard.tsx'] },
  fiveElementOrbitFixedOrder: { required: true, level: [1], accessor: 'ORBIT_POSITIONS', components: ['FiveElementOrbit.tsx'] },
  fiveElementTenGodMapStatus: { required: true, level: [1], accessor: 'tenGodLabels', components: ['adapter.ts', 'FiveElementOrbit.tsx'] },
  // E｜命局專業判定
  strengthAnalysis: { required: true, level: [3], accessor: 'strengthAnalysis', components: ['ProfessionalBaziTable.tsx'] },
  strengthFactors: { required: true, level: [2, 3], accessor: 'strengthFactors', components: ['TeacherSummary.tsx', 'ProfessionalBaziTable.tsx'] },
  gods: { required: true, level: [2, 3], accessor: 'gods', components: ['TeacherSummary.tsx', 'ProfessionalBaziTable.tsx'] },
  structurePattern: { required: true, level: [2, 3], accessor: 'structurePattern', components: ['TeacherSummary.tsx', 'ProfessionalBaziTable.tsx'] },
  structureFocus: { required: true, level: [1, 3], accessor: 'structureFocus', components: ['adapter.ts', 'ProfessionalBaziTable.tsx'] },
  unavailableTraditionalFields: { required: true, level: [3], accessor: 'unavailableProfessionalFields', components: ['ProfessionalBaziTable.tsx'] },
  solarTerm: { required: true, level: [1, 3], accessor: 'solarTerm', components: ['BaziCalculationProgress.tsx', 'ProfessionalBaziTable.tsx'] },
  kongWang: { required: true, level: [1, 3], accessor: 'kongWang', components: ['BaziCalculationProgress.tsx', 'ProfessionalBaziTable.tsx'] },
  twelveStages: { required: true, level: [1, 3], accessor: 'twelveStages', components: ['BaziCalculationProgress.tsx', 'ProfessionalBaziTable.tsx'] },
  stemBranchInteractions: { required: true, level: [1, 3], accessor: 'interactions', components: ['BaziCalculationProgress.tsx', 'ProfessionalBaziTable.tsx'] },
  shenSha: { required: true, level: [1, 3], accessor: 'shenSha', components: ['BaziCalculationProgress.tsx', 'ProfessionalBaziTable.tsx'] },
  mingGong: { required: true, level: [1, 3], accessor: 'mingGong', components: ['BaziCalculationProgress.tsx', 'ProfessionalBaziTable.tsx'] },
  taiYuan: { required: true, level: [1, 3], accessor: 'taiYuan', components: ['BaziCalculationProgress.tsx', 'ProfessionalBaziTable.tsx'] },
  taiXi: { required: true, level: [1, 3], accessor: 'taiXi', components: ['BaziCalculationProgress.tsx', 'ProfessionalBaziTable.tsx'] },
  // H｜大運
  daYun: { required: true, level: [2, 3], accessor: 'luckCycles', components: ['adapter.ts', 'ProfessionalBaziTable.tsx'] },
  // I｜流年
  annualLuck: { required: true, level: [2, 3], accessor: 'annualFortunes', components: ['adapter.ts', 'ProfessionalBaziTable.tsx'] },
  // AI 解讀層（Interpretation，不是 Calculation）
  aiDeepAnalysis: { required: true, level: [2], accessor: 'aiDeepAnalysis', components: ['adapter.ts'] },
  aiLogicTrace: { required: true, level: [3], accessor: 'logicTrace', components: ['ProfessionalBaziTable.tsx'] },
  aiElementPriority: { required: true, level: [3], accessor: 'elementPriority', components: ['ProfessionalBaziTable.tsx'] },
  aiReinforcementPlan: { required: true, level: [2], accessor: 'reinforcement', components: ['TeacherSummary.tsx'] },
  // V3｜基本資料完整欄位 + 未提供欄位明確標示 + AI 白話 + 推導明細
  basicInfoFull: { required: true, level: [3], accessor: 'result.input?.name', components: ['ProfessionalBaziTable.tsx'] },
  missingFieldsExplicit: { required: true, level: [3], accessor: '命局摘要', components: ['ProfessionalBaziTable.tsx'] },
  aiReading: { required: true, level: [3], accessor: 'aiReading', components: ['ProfessionalBaziTable.tsx'] },
  detailFlow: { required: true, level: [3], accessor: 'result.detail', components: ['ProfessionalBaziTable.tsx'] },
  // 驗證與版本
  engineVersion: { required: true, level: [3], accessor: 'engineVersion', components: ['ProfessionalBaziTable.tsx'] },
  dataFlow: { required: true, level: [3], accessor: 'dataFlow', components: ['ProfessionalBaziTable.tsx'] },
  pipelineState: { required: true, level: [1, 3], accessor: 'pipelineState', components: ['adapter.ts', 'BaziCalculationProgress.tsx'] },
  calculationId: { required: true, level: [1, 3], accessor: 'calculationId', components: ['adapter.ts', 'ProfessionalBaziTable.tsx', 'BaziCalculationProgress.tsx'] },
  birthInputFingerprint: { required: true, level: [1, 3], accessor: 'birthInputFingerprint', components: ['adapter.ts', 'ProfessionalBaziTable.tsx', 'BaziCalculationProgress.tsx'] },
  professionalResultId: { required: true, level: [1, 3], accessor: 'professionalResultId', components: ['adapter.ts', 'ProfessionalBaziTable.tsx', 'BaziCalculationProgress.tsx'] },
  verification: { required: true, level: [3], accessor: 'verification', components: ['BaziCalculationProgress.tsx', 'ProfessionalBaziTable.tsx'] },
  professionalCompletenessGate: { required: true, level: [1, 3], accessor: 'validateBaziProfessionalCompleteness', components: ['BaziCalculationProgress.tsx'] },
  professionalCompletenessResult: { required: true, level: [3], accessor: 'professionalCompleteness', components: ['ProfessionalBaziTable.tsx'] },
  mappingMissingTrace: { required: true, level: [1, 3], accessor: 'MAPPING_MISSING', components: ['BaziCalculationProgress.tsx'] },
  fieldTrace: { required: true, level: [1, 3], accessor: 'BaziFieldTrace', components: ['BaziCalculationProgress.tsx'] },
  finalGateCompleteness: { required: true, level: [1, 3], accessor: 'professional completeness failed', components: ['BaziCalculationProgress.tsx'] },
};
