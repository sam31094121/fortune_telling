export type PlatformAnalysisModuleId = 'nameology' | 'ziwei' | 'number' | 'soul_match' | 'music' | 'bazi';

export type PlatformLayerId = 'analysis' | 'integration' | 'growth_center' | 'weekly_companion' | 'system_stability';

export type PlatformAnalysisModule = {
  id: PlatformAnalysisModuleId;
  title: string;
  shortTitle: string;
  href: string;
  apiHint: string;
  role: 'independent_analysis_source';
  canAnalyze: true;
  canFeedIntegrationLayer: true;
  integrationRule: string;
};

export type PlatformStabilityCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export const PLATFORM_MASTER_PLAN_VERSION = 'tiandiren_master_plan_v1';
export const PLATFORM_CORE_PRINCIPLE = '分析一次，終身陪伴。';

export const PLATFORM_ANALYSIS_MODULES: PlatformAnalysisModule[] = [
  {
    id: 'nameology',
    title: 'AI 姓名學',
    shortTitle: '姓名學',
    href: '/nameology',
    apiHint: '/api/nameology-analyze',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: '只保存姓名學完成狀態與元素方向，不讓成長中心重新分析姓名。',
  },
  {
    id: 'ziwei',
    title: 'AI 紫微斗數',
    shortTitle: '紫微',
    href: '/insight',
    apiHint: '/api/insight-analyze',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: '只保存紫微斗數完成狀態與元素方向，不讓成長中心重新排盤。',
  },
  {
    id: 'number',
    title: 'AI 數字論吉凶',
    shortTitle: '數字',
    href: '/numerology',
    apiHint: '/api/number/analyze',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: '只保存數字論吉凶完成狀態與元素方向，不讓成長中心重新計算數字。',
  },
  {
    id: 'soul_match',
    title: 'AI 靈魂配對',
    shortTitle: '配對',
    href: '/match',
    apiHint: '/api/match-generate',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: '只保存靈魂配對完成狀態與元素方向，不讓成長中心重新分析雙人配對。',
  },
  {
    id: 'music',
    title: 'AI 生成音樂',
    shortTitle: '音樂',
    href: '/music',
    apiHint: '/api/music-generate',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: '只保存生命音樂完成狀態與元素方向，不讓成長中心重新生成歌曲。',
  },
  {
    id: 'bazi',
    title: 'AI 八字命盤',
    shortTitle: '八字',
    href: '/bazi',
    apiHint: '/api/analysis/jobs',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: '只保存八字命盤完成狀態與元素方向，不讓成長中心重新排八字。',
  },
];

export const PLATFORM_LAYER_RULES: Array<{ id: PlatformLayerId; title: string; rule: string }> = [
  { id: 'analysis', title: '第一層：六張命理分析', rule: '六張卡片各自獨立分析、獨立保存、互不覆蓋。' },
  { id: 'integration', title: '第二層：AI Integration Layer', rule: '只讀取已完成分析結果，不重新分析、不重新排盤。' },
  { id: 'growth_center', title: '第三層：AI 個人成長中心', rule: '只整理成陪伴、提醒、鼓勵、成長，不重複命理內容。' },
  { id: 'weekly_companion', title: '第四層：AI 每週陪伴', rule: '每週只給一件任務、一個能量色、一句提醒、一句名言。' },
  { id: 'system_stability', title: '第五層：System Stability Layer', rule: '所有新增內容先通過不衝突、不打架、不重複、不覆蓋檢查。' },
];

export const PLATFORM_FORBIDDEN_ANALYSIS_CALLS = [
  'nameology-engine',
  'ziwei-calculator',
  'bazi-engine',
  'number-core-engine',
  'match-generate',
  'music-generate',
] as const;

export const PLATFORM_AI_CORE_POLICY = {
  id: 'single_ai_core_policy',
  title: '同一個 AI Core',
  rule: 'AI Core 統一負責整理、等待、錯誤處理與陪伴文字；六張卡片的命理運算保持各自獨立。',
};

export function getPlatformModuleIds() {
  return PLATFORM_ANALYSIS_MODULES.map((item) => item.id);
}

export function validatePlatformStability(completedModules: PlatformAnalysisModuleId[] = []): PlatformStabilityCheck[] {
  const known = new Set(getPlatformModuleIds());
  const uniqueCompleted = Array.from(new Set(completedModules));
  const hasUnknownModule = uniqueCompleted.some((moduleId) => !known.has(moduleId));

  return [
    {
      id: 'six_modules_registered',
      label: '六張卡片註冊完整',
      ok: PLATFORM_ANALYSIS_MODULES.length === 6,
      detail: `目前註冊 ${PLATFORM_ANALYSIS_MODULES.length} 張分析卡片。`,
    },
    {
      id: 'completed_modules_known',
      label: '完成狀態只接受已知卡片',
      ok: !hasUnknownModule,
      detail: hasUnknownModule ? '偵測到未知卡片 ID，整合層會忽略它。' : '完成狀態都屬於六張卡片。',
    },
    {
      id: 'integration_read_only',
      label: 'Integration Layer 只讀取',
      ok: true,
      detail: '成長中心只接收完成狀態與元素方向，不呼叫命理引擎。',
    },
    {
      id: 'weekly_single_focus',
      label: '每週只保留一個重點',
      ok: true,
      detail: '每週只有一個補強元素、一個能量色、一件任務、一句名言。',
    },
    {
      id: 'no_analysis_reentry',
      label: '禁止回頭重新算命',
      ok: PLATFORM_FORBIDDEN_ANALYSIS_CALLS.length === 6,
      detail: `已列入 ${PLATFORM_FORBIDDEN_ANALYSIS_CALLS.length} 個禁止呼叫的命理分析入口。`,
    },
  ];
}

export function buildSystemStabilitySnapshot(completedModules: PlatformAnalysisModuleId[] = []) {
  const checks = validatePlatformStability(completedModules);
  return {
    version: PLATFORM_MASTER_PLAN_VERSION,
    principle: PLATFORM_CORE_PRINCIPLE,
    status: checks.every((item) => item.ok) ? 'ready' as const : 'review' as const,
    layers: PLATFORM_LAYER_RULES,
    aiCorePolicy: PLATFORM_AI_CORE_POLICY,
    modules: PLATFORM_ANALYSIS_MODULES,
    checks,
  };
}