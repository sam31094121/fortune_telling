import {
  PLATFORM_AI_CORE_POLICY,
  PLATFORM_ANALYSIS_MODULES,
  PLATFORM_CORE_PRINCIPLE,
  PLATFORM_FORBIDDEN_ANALYSIS_CALLS,
  PLATFORM_LAYER_RULES,
  PLATFORM_MASTER_PLAN_VERSION,
  buildSystemStabilitySnapshot,
} from './platform-stability-layer';
import { NUMBER_CORE_ENGINE_VERSION, analyzeNumberCore } from './number-core-engine';
import { auditAiCopywriting, buildAiCopywritingStyleSnapshot } from './ai-copywriting-style-center';
import { buildAiActionGuidanceSnapshot } from './ai-action-guidance-center';
import { buildAiFollowUpSystemSnapshot } from './ai-follow-up-system';
import { buildMasterPlatformFinalOptimizeSnapshot } from './master-platform-final-optimize';

export const PLATFORM_CONTROL_CENTER_VERSION = 'platform_control_center_v1';

export type ControlCenterSectionId =
  | 'module_registry'
  | 'rule_center'
  | 'ai_center'
  | 'copywriting_center'
  | 'growth_center'
  | 'follow_up_system'
  | 'feature_switch'
  | 'system_monitor';

export type ControlCenterStatus = 'ready' | 'review' | 'disabled' | 'testing';

export type ControlCenterSection = {
  id: ControlCenterSectionId;
  title: string;
  purpose: string;
  status: ControlCenterStatus;
  owner: string;
  lockedRule: string;
};

export type FeatureSwitchMode = 'on' | 'off' | 'test' | 'gray';

export type PlatformFeatureSwitch = {
  id: string;
  title: string;
  mode: FeatureSwitchMode;
  scope: string;
  rule: string;
};

export type PlatformMonitorItem = {
  id: string;
  title: string;
  status: ControlCenterStatus;
  target: string;
  detail: string;
};

const CONTROL_CENTER_SECTIONS: ControlCenterSection[] = [
  {
    id: 'module_registry',
    title: 'Module Registry',
    purpose: '統一管理六張命理卡片與未來新增模組。',
    status: 'ready',
    owner: 'Platform Control Center',
    lockedRule: '任何新模組必須先登記 Module ID、路徑、API 與資料責任，再進入平台。',
  },
  {
    id: 'rule_center',
    title: 'Rule Center',
    purpose: '統一管理命理規則、AI 規則、商業規則與禁止事項。',
    status: 'ready',
    owner: 'Platform Control Center',
    lockedRule: '規則只能集中維護，不得散落在各頁面造成互相衝突。',
  },
  {
    id: 'ai_center',
    title: 'AI Center',
    purpose: '統一管理 AI Core、Prompt、Model、Version 與禁止重算清單。',
    status: 'ready',
    owner: 'Single AI Core',
    lockedRule: '所有 AI 文字整理與陪伴內容必須走同一個 AI Core，不得每張卡片各自建立第二套 AI。',
  },
  {
    id: 'copywriting_center',
    title: 'AI 文案統一優化中心',
    purpose: '統一管理天地人和 AI 的語氣、禁止詞、行動規則與陪伴語言。',
    status: 'ready',
    owner: 'AI Copywriting Style Center',
    lockedRule: '所有 AI 文案必須清楚、直接、有方向、有行動，禁止模稜兩可。',
  },
  {
    id: 'growth_center',
    title: 'Growth Center',
    purpose: '統一管理每週提醒、每週任務、能量色、成功人士與更新週期。',
    status: 'ready',
    owner: 'AI Integration Layer',
    lockedRule: '成長中心只讀已完成分析結果，只做陪伴，不重新算命。',
  },
  {
    id: 'follow_up_system',
    title: 'AI Follow-Up System',
    purpose: '統一管理會員補強追蹤，只追蹤補強、任務與行動，不提供一般聊天。',
    status: 'ready',
    owner: 'AI Integration Layer',
    lockedRule: 'Follow-Up 只讀成長中心與整合層資料，不重新分析、不詢問私生活、不開放自由聊天。',
  },
  {
    id: 'feature_switch',
    title: 'Feature Switch',
    purpose: '統一管理功能開關、測試模式與灰度發布狀態。',
    status: 'ready',
    owner: 'System Stability Layer',
    lockedRule: '功能先登記再開啟，禁止直接改頁面硬上線。',
  },
  {
    id: 'system_monitor',
    title: 'System Monitor',
    purpose: '統一監控 API、AI、會員、資料庫、錯誤率、登入率與完成率。',
    status: 'ready',
    owner: 'Platform Control Center',
    lockedRule: '監控只讀狀態，不修改任何會員資料與命理結果。',
  },
];

const FEATURE_SWITCHES: PlatformFeatureSwitch[] = [
  {
    id: 'seven_analysis_cards',
    title: '六張命理卡片',
    mode: 'on',
    scope: '首頁與六個獨立分析入口',
    rule: '保持既有功能，不互相覆蓋。',
  },
  {
    id: 'ai_integration_layer',
    title: 'AI Integration Layer',
    mode: 'on',
    scope: '整合層',
    rule: '只讀六張卡片保存結果，不重新分析。',
  },
  {
    id: 'growth_center_weekly_companion',
    title: 'AI 每週陪伴',
    mode: 'on',
    scope: 'AI 個人成長中心',
    rule: '每週只給一個提醒、一個補強、一個能量色、一件任務、一句名言。',
  },
  {
    id: 'ai_follow_up_system',
    title: 'AI 補強追蹤系統',
    mode: 'on',
    scope: 'AI 個人成長中心',
    rule: '只追蹤本週補強是否持續，不聊天、不偏題、不重新分析。',
  },
  {
    id: 'platform_control_center',
    title: 'Platform Control Center',
    mode: 'on',
    scope: '內部管理中心',
    rule: '只做統一管理與狀態檢查，不提供會員前台入口。',
  },
  {
    id: 'future_gray_release',
    title: '未來功能灰度發布',
    mode: 'gray',
    scope: '新功能上線流程',
    rule: '新功能必須先登記、測試、灰度，再正式開啟。',
  },
];

const RULE_CENTER = [
  { id: 'one_analysis_lifetime_companion', title: '平台最高主軸', rule: PLATFORM_CORE_PRINCIPLE },
  { id: 'no_conflict', title: '禁止衝突', rule: '不得讓任何模組互相覆蓋、互相讀錯資料、互相重新分析。' },
  { id: 'single_source', title: '唯一資料來源', rule: '每位會員只有一份累積檔案，所有陪伴內容只讀取同一份保存結果。' },
  { id: 'single_ai_core', title: '唯一 AI Core', rule: PLATFORM_AI_CORE_POLICY.rule },
  { id: 'ai_copywriting_style', title: '唯一 AI 語言規範', rule: '所有 AI 文案共用 AI 文案統一優化中心，必須清楚、直接、有方向、有行動。' },
  { id: 'ai_action_guidance', title: '唯一 AI 行動引導規範', rule: '每一次 AI 分析完成後，必須回答目前判斷、現在最重要、下一步、改善方向。' },
  { id: 'ai_follow_up_system', title: '唯一 AI 補強追蹤規範', rule: 'Follow-Up 只能追蹤補強進度、行動任務與本週提醒，禁止一般聊天與私生活提問。' },
  { id: 'register_first', title: '先登記再加入', rule: '任何新增功能都必須先進入 Module Registry 與 Feature Switch。' },
];

const GROWTH_CONTROL = {
  version: 'growth_control_v1',
  cadence: 'weekly',
  weeklyItems: ['本週一句提醒', '本週第一補強元素', '本週唯一能量色', '本週一件行動任務', 'AI 補強追蹤', '本週一句成功人士公開名言'],
  monthlyItems: ['本月陪伴主題', '本月四週節奏'],
  rule: 'Growth Center 只能由 AI Integration Layer 提供資料，不得直接重新呼叫六張命理分析。',
};

const AI_CENTER = {
  version: 'single_ai_core_v1',
  policy: PLATFORM_AI_CORE_POLICY,
  modelStrategy: '由環境與 AI Core 統一管理，頁面不得各自指定第二套模型。',
  promptStrategy: '所有 Prompt 必須先登記用途、版本、禁止事項與輸出責任。',
  forbiddenAnalysisCalls: [...PLATFORM_FORBIDDEN_ANALYSIS_CALLS],
};

function buildMonitor(now: Date): PlatformMonitorItem[] {
  const numberProbe = analyzeNumberCore('1688');
  const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const hasAiConfig = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY);

  return [
    {
      id: 'api_routes',
      title: 'API 狀態',
      status: 'ready',
      target: '/api/*',
      detail: `Control Center 於 ${now.toISOString()} 完成狀態整理。`,
    },
    {
      id: 'number_core_engine',
      title: '數字核心引擎',
      status: numberProbe.ok ? 'ready' : 'review',
      target: NUMBER_CORE_ENGINE_VERSION,
      detail: numberProbe.ok ? '核心試算正常。' : '核心試算需要檢查。',
    },
    {
      id: 'ai_core_config',
      title: 'AI Core 設定',
      status: hasAiConfig ? 'ready' : 'review',
      target: 'AI Provider Env',
      detail: hasAiConfig ? '已偵測 AI Provider 環境設定。' : '目前未偵測 AI Provider key，部署前需要確認。',
    },
    {
      id: 'member_profile',
      title: '會員唯一檔案',
      status: 'testing',
      target: 'Member Profile Store',
      detail: '目前前端可用匿名檔案與本機記錄；正式會員資料庫串接後統一改由會員唯一檔案讀取。',
    },
    {
      id: 'database_config',
      title: '資料庫設定',
      status: hasSupabaseConfig ? 'ready' : 'testing',
      target: 'Database',
      detail: hasSupabaseConfig ? '已偵測資料庫環境設定。' : '目前以本地資料與前端暫存支援開發環境。',
    },
    {
      id: 'error_rate',
      title: '錯誤率監控',
      status: 'testing',
      target: 'System Stability Layer',
      detail: 'V1 先集中列出監控項目，後續可接入真實錯誤率與完成率資料。',
    },
  ];
}

export function buildPlatformControlCenter(now = new Date()) {
  const masterFinalOptimize = buildMasterPlatformFinalOptimizeSnapshot();
  const stability = buildSystemStabilitySnapshot();
  const copywritingCenter = buildAiCopywritingStyleSnapshot();
  const actionGuidance = buildAiActionGuidanceSnapshot();
  const followUpSystem = buildAiFollowUpSystemSnapshot();
  const copywritingAudit = auditAiCopywriting([
    copywritingCenter.positioning.role,
    copywritingCenter.positioning.coreValue,
    ...copywritingCenter.rules.map((rule) => rule.rule),
    ...copywritingCenter.replacements.map((item) => item.use),
  ].join('\\n'));
  const monitor = buildMonitor(now);
  const systemMonitor = [
    ...monitor,
    {
      id: 'ai_copywriting_style',
      title: 'AI 文案規範稽核',
      status: copywritingAudit.ok ? 'ready' as const : 'review' as const,
      target: copywritingCenter.version,
      detail: copywritingAudit.ok ? 'AI 文案中心規則通過禁止詞稽核。' : `偵測到 ${copywritingAudit.violationCount} 個禁止詞，需要調整。`,
    },
    {
      id: 'ai_action_guidance',
      title: 'AI 行動引導規範',
      status: actionGuidance.requiredSteps.length === 4 ? 'ready' as const : 'review' as const,
      target: actionGuidance.version,
      detail: actionGuidance.requiredSteps.length === 4 ? '已建立四步驟：目前判斷、現在最重要、下一步、改善方向。' : '行動引導步驟需要檢查。',
    },
    {
      id: 'ai_follow_up_system',
      title: 'AI 補強追蹤系統',
      status: followUpSystem.quickReplies.length === 2 ? 'ready' as const : 'review' as const,
      target: followUpSystem.version,
      detail: followUpSystem.quickReplies.length === 2 ? '已建立有持續/還沒有兩種追蹤回覆，禁止自由聊天。' : '補強追蹤回覆需要檢查。',
    },
  ];
  const sections = CONTROL_CENTER_SECTIONS.map((section) => ({
    ...section,
    status:
      section.id === 'copywriting_center' && !copywritingAudit.ok
        ? 'review' as const
        : section.id === 'system_monitor' && systemMonitor.some((item) => item.status === 'review')
          ? 'review' as const
          : section.status,
  }));
  const status = sections.every((item) => item.status === 'ready') && stability.status === 'ready' ? 'ready' as const : 'review' as const;

  return {
    success: true as const,
    data: {
      version: PLATFORM_CONTROL_CENTER_VERSION,
      masterPlanVersion: PLATFORM_MASTER_PLAN_VERSION,
      masterFinalOptimize,
      title: '天地人和 AI Platform Control Center',
      purpose: '統一管理、統一控制、統一設定，讓平台高穩定、高一致、高擴充。',
      principle: PLATFORM_CORE_PRINCIPLE,
      status,
      sections,
      moduleRegistry: PLATFORM_ANALYSIS_MODULES.map((module, index) => ({
        ...module,
        order: index + 1,
        enabled: true,
        featureMode: 'on' as FeatureSwitchMode,
        registrationRule: '先登記 Module ID、路徑、API、資料責任，再允許擴充。',
      })),
      ruleCenter: RULE_CENTER,
      aiCenter: AI_CENTER,
      copywritingCenter,
      copywritingAudit,
      actionGuidance,
      followUpSystem,
      growthCenter: GROWTH_CONTROL,
      featureSwitches: FEATURE_SWITCHES,
      systemMonitor,
      stabilityLayer: stability,
      governance: {
        singleManagementCenter: true,
        singleAiCore: true,
        singleRuleCenter: true,
        singleDataSource: true,
        addFeatureProcess: ['先登記', '檢查規則', '設定開關', '測試', '灰度發布', '正式啟用'],
        forbidden: ['不得直接修改六張卡片核心', '不得重新分析命理', '不得重複會員前台內容', '不得建立第二份資料來源'],
      },
      updatedAt: now.toISOString(),
    },
  };
}
