export type PlatformAnalysisModuleId = 'nameology' | 'ziwei' | 'number' | 'soul_match' | 'music' | 'bazi' | 'zodiac' | 'tarot';

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
export const PLATFORM_CORE_PRINCIPLE = 'Analyze once, companion for life';

export const PLATFORM_ANALYSIS_MODULES: PlatformAnalysisModule[] = [
  {
    id: 'nameology',
    title: 'AI Nameology',
    shortTitle: 'Nameology',
    href: '/nameology',
    apiHint: '/api/nameology-analyze',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: 'Save only completion state and element direction. Growth Center must not re-analyze names.',
  },
  {
    id: 'ziwei',
    title: 'AI Ziwei',
    shortTitle: 'Ziwei',
    href: '/insight',
    apiHint: '/api/insight-analyze',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: 'Save only completion state and element direction. Growth Center must not re-run Ziwei.',
  },
  {
    id: 'number',
    title: 'AI Number Fortune',
    shortTitle: 'Number',
    href: '/numerology',
    apiHint: '/api/number/analyze',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: 'Save only completion state and element direction. Growth Center must not re-calculate numbers.',
  },
  {
    id: 'soul_match',
    title: 'AI Soul Match',
    shortTitle: 'Match',
    href: '/match',
    apiHint: '/api/match-generate',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: 'Save only completion state and relationship direction. Growth Center must not re-analyze matching.',
  },
  {
    id: 'music',
    title: 'AI Music',
    shortTitle: 'Music',
    href: '/music',
    apiHint: '/api/music-generate',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: 'Save only completion state and rhythm direction. Growth Center must not regenerate music.',
  },
  {
    id: 'bazi',
    title: 'AI Bazi Chart',
    shortTitle: 'Bazi',
    href: '/bazi',
    apiHint: '/api/analysis/jobs',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: 'Save only completion state and chart direction. Growth Center must not re-run Bazi.',
  },
  {
    id: 'zodiac',
    title: 'AI Western Zodiac',
    shortTitle: 'Zodiac',
    href: '/zodiac',
    apiHint: '/api/analysis/jobs',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: 'Save only completion state, zodiac sign, and weekly reminder. Growth Center must not re-run zodiac analysis.',
  },
  {
    id: 'tarot',
    title: 'AI Tarot Card',
    shortTitle: 'Tarot',
    href: '/tarot',
    apiHint: '/api/tarot/reading',
    role: 'independent_analysis_source',
    canAnalyze: true,
    canFeedIntegrationLayer: true,
    integrationRule: 'Save only tarot completion state and element signal. Growth Center must not auto-draw cards or overwrite core member elements.',
  },
];

export const PLATFORM_LAYER_RULES: Array<{ id: PlatformLayerId; title: string; rule: string }> = [
  { id: 'analysis', title: 'Layer 1: eight independent analysis cards', rule: 'Eight cards analyze and save independently without overwriting each other.' },
  { id: 'integration', title: 'Layer 2: AI Integration Layer', rule: 'Read completed analysis results only. Do not re-analyze or re-calculate.' },
  { id: 'growth_center', title: 'Layer 3: AI Growth Center', rule: 'Convert saved signals into companionship, reminders, encouragement, and action.' },
  { id: 'weekly_companion', title: 'Layer 4: AI Weekly Companion', rule: 'Keep one task, one color, one reminder, and one quote per week.' },
  { id: 'system_stability', title: 'Layer 5: System Stability Layer', rule: 'Every new module must pass no conflict, no duplicate, and no overwrite checks.' },
];

export const PLATFORM_FORBIDDEN_ANALYSIS_CALLS = [
  'nameology-engine',
  'ziwei-calculator',
  'bazi-engine',
  'number-core-engine',
  'match-generate',
  'music-generate',
  'zodiac-engine',
  'tarot-engine',
] as const;

export const PLATFORM_AI_CORE_POLICY = {
  id: 'single_ai_core_policy',
  title: 'Single AI Core',
  rule: 'AI Core coordinates copy, loading, errors, and companionship text. The eight analysis cards keep their engines independent.',
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
      id: 'eight_modules_registered',
      label: 'Eight analysis cards registered',
      ok: PLATFORM_ANALYSIS_MODULES.length === 8,
      detail: 'Registered analysis cards: ' + PLATFORM_ANALYSIS_MODULES.length + '.',
    },
    {
      id: 'completed_modules_known',
      label: 'Completed modules are known',
      ok: !hasUnknownModule,
      detail: hasUnknownModule ? 'Unknown module ID detected. Integration Layer ignores it.' : 'Completed states belong to registered cards only.',
    },
    {
      id: 'integration_read_only',
      label: 'Integration Layer is read-only',
      ok: true,
      detail: 'Growth Center receives completion state and element direction only. It does not call analysis engines.',
    },
    {
      id: 'weekly_single_focus',
      label: 'Weekly companion keeps one focus',
      ok: true,
      detail: 'Each week keeps one element, one color, one task, and one quote.',
    },
    {
      id: 'no_analysis_reentry',
      label: 'Analysis re-entry is blocked',
      ok: PLATFORM_FORBIDDEN_ANALYSIS_CALLS.length === 8,
      detail: 'Forbidden analysis entry points: ' + PLATFORM_FORBIDDEN_ANALYSIS_CALLS.length + '.',
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
