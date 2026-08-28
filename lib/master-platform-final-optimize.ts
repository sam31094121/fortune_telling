export const MASTER_PLATFORM_FINAL_OPTIMIZE_VERSION = 'master_platform_final_optimize_v1';

export const MASTER_PLATFORM_MISSION = '分析一次，終身陪伴。';

export const MASTER_PLATFORM_POSITIONING = {
  not: ['命理網站', '一次性算命平台'],
  is: '易經一生陪伴平台',
  highestValue: '不是讓會員只知道自己的命，而是讓會員每次回來，都因為 易經的陪伴做出一個更好的決定。',
};

export const MASTER_PLATFORM_SYSTEMS = [
  { layer: 1, id: 'seven_analysis_cards', title: 'Seven independent analysis cards', rule: 'Each analysis module runs and saves independently without calling, overwriting, or duplicating another module.' },
  { layer: 2, id: 'growth_center', title: '易經個人成長中心', rule: '只做陪伴、提醒、鼓勵、成長，不重新算命。' },
  { layer: 3, id: 'integration_layer', title: '易經整合層', rule: '唯一工作是整理、整合、判斷；不得重新分析。' },
  { layer: 4, id: 'weekly_companion', title: '易經每週陪伴', rule: '每週只更新一次，每次只給會員最重要的一件事情。' },
  { layer: 5, id: 'platform_control_center', title: 'Platform Control Center', rule: '統一管理 易經、規則、API、Module、資料、版本與更新。' },
] as const;

export const MASTER_PLATFORM_SINGLE_SOURCE_RULES = [
  '一份資料',
  '一份分析',
  '一個 易經核心',
  '一個規則中心',
  '一個平台管理中心',
] as const;

export const MASTER_PLATFORM_FRONTEND_RESPONSIBILITIES = ['輸入', '互動', '動畫', '畫面', '顯示'] as const;
export const MASTER_PLATFORM_BACKEND_RESPONSIBILITIES = ['分析', 'AI', '會員', '整合', '陪伴'] as const;

export const MASTER_PLATFORM_WEEKLY_UPDATE_ITEMS = [
  '易經提醒',
  '補強元素',
  '能量色',
  '行動任務',
  '成功人士一句話',
] as const;

export const MASTER_PLATFORM_NEW_FEATURE_GATE = [
  '不打架',
  '不衝突',
  '不覆蓋',
  '不重複',
  '不影響舊功能',
] as const;

export const MASTER_PLATFORM_ACCEPTANCE_CHECKS = [
  '六張卡片保持獨立',
  '易經成長中心保持獨立',
  '易經整合層 保持獨立',
  'Platform Control Center 保持獨立',
  '前後端完全分工',
  '所有資料唯一',
  '所有 易經唯一',
  '所有規則唯一',
  '無任何功能衝突',
  '無任何功能打架',
  '無任何功能重複',
  '無任何資料覆蓋',
  '可長期維護',
  '可長期擴充',
] as const;

export function buildMasterPlatformFinalOptimizeSnapshot() {
  return {
    version: MASTER_PLATFORM_FINAL_OPTIMIZE_VERSION,
    mission: MASTER_PLATFORM_MISSION,
    positioning: MASTER_PLATFORM_POSITIONING,
    systems: MASTER_PLATFORM_SYSTEMS,
    singleSourceRules: MASTER_PLATFORM_SINGLE_SOURCE_RULES,
    frontendResponsibilities: MASTER_PLATFORM_FRONTEND_RESPONSIBILITIES,
    backendResponsibilities: MASTER_PLATFORM_BACKEND_RESPONSIBILITIES,
    weeklyUpdateItems: MASTER_PLATFORM_WEEKLY_UPDATE_ITEMS,
    newFeatureGate: MASTER_PLATFORM_NEW_FEATURE_GATE,
    acceptanceChecks: MASTER_PLATFORM_ACCEPTANCE_CHECKS,
    loginPrinciple: '會員不是來重新算命，而是重新獲得力量、重新獲得方向、重新開始今天。',
    finalPrinciple: '天地人和 易經平台永遠遵守：分析一次，終身陪伴。',
  };
}