import { AI_INTEGRATION_MODULES, buildAiIntegrationLayer, parseAiIntegrationModules } from './ai-integration-layer';
import type { AiCompanionStage, AiIntegrationElement, AiIntegrationModuleId, AiIntegrationResult } from './ai-integration-layer';
import { buildSystemStabilitySnapshot } from './platform-stability-layer';
import { buildAiCopywritingStyleSnapshot } from './ai-copywriting-style-center';
import { buildAiFollowUpSystem } from './ai-follow-up-system';
import { castHexagram } from './iching-engine';
import { buildEmpathicFromHexagram, buildGhostDecoding, patternNameOf } from './iching-psychology';

export type GrowthModuleId = AiIntegrationModuleId;
export type GrowthElement = AiIntegrationElement;
export type GrowthPreferenceId = 'daily' | 'weekly' | 'direct' | 'gentle' | 'career' | 'relationship' | 'wealth' | 'energy';

export type GrowthCenterInput = {
  userId?: string | null;
  anonymousProfileId?: string | null;
  completedModules?: GrowthModuleId[];
  primaryElement?: GrowthElement | null;
  secondaryElement?: GrowthElement | null;
  elementScore?: Partial<Record<GrowthElement, number>> | null;
  avoidElement?: GrowthElement | null;
  analysisHash?: string | null;
  preferences?: GrowthPreferenceId[] | null;
  now?: Date;
};

type PreferenceTopic = 'career' | 'relationship' | 'wealth' | 'energy';
type PreferenceFlags = { tone: 'direct' | 'gentle' | null; cadence: 'daily' | 'weekly' | null; topic: PreferenceTopic | null };

const TOPIC_TIPS: Record<PreferenceTopic, string> = {
  career: '這也會直接影響你的工作與行動安排，把它排進今天的待辦。',
  relationship: '這也會影響你和身邊人的互動，留意今天的一次對話或訊息回覆。',
  wealth: '這也牽動你的金錢決策，今天避免臨時衝動花費，先觀察一天。',
  energy: '這也是在補你的整體狀態，今天留一段安靜恢復的時間給自己。',
};

function resolvePreferenceFlags(preferences?: GrowthPreferenceId[] | null): PreferenceFlags {
  const set = new Set(preferences ?? []);
  const tone = set.has('direct') ? 'direct' : set.has('gentle') ? 'gentle' : null;
  const cadence = set.has('daily') ? 'daily' : set.has('weekly') ? 'weekly' : null;
  const topicOrder: PreferenceTopic[] = ['career', 'relationship', 'wealth', 'energy'];
  const topic = topicOrder.find((item) => set.has(item)) ?? null;
  return { tone, cadence, topic };
}

type ModuleMeta = {
  id: GrowthModuleId;
  title: string;
  shortTitle: string;
  href: string;
  defaultElement: GrowthElement;
  evidence: string;
};

type ElementTheme = {
  label: string;
  badge: string;
  theme: string;
  headline: string;
  reason: string;
  actionPool: string[];
  colorPool: Array<{ colorName: string; hex: string; usage: string[] }>;
  monthlyFocusPool: string[];
};

type SuccessQuote = {
  author: string;
  role: string;
  quote: string;
  fit: string;
  sourceName: string;
  sourceUrl: string;
};

type CompanionLoopStep = {
  step: number;
  label: string;
  title: string;
  body: string;
};

type LongTermCheckpoint = {
  week: 1 | 2 | 3 | 4;
  title: string;
  action: string;
};

type SystemStabilitySnapshot = ReturnType<typeof buildSystemStabilitySnapshot>;
type AiCopywritingStyleSnapshot = ReturnType<typeof buildAiCopywritingStyleSnapshot>;
type AiFollowUpSystemSnapshot = ReturnType<typeof buildAiFollowUpSystem>;

type GrowthCenterCoreV2 = {
  version: 'growth_center_core_v2';
  positioning: {
    title: string;
    principle: string;
    roleSplit: string;
  };
  firstScreen: {
    title: string;
    headline: string;
    body: string;
    primaryMetric: string;
    status: string;
  };
  memberMemory: {
    title: string;
    completedText: string;
    missingText: string;
    currentFocus: string;
    noReanalysisPolicy: string;
  };
  weeklyCompanion: {
    reminder: string;
    reinforcement: string;
    energyColor: string;
    task: string;
    quote: string;
  };
  followUpPolicy: {
    prompt: string;
    ifContinued: string;
    ifPaused: string;
    boundary: string;
  };
  retentionLoop: {
    title: string;
    steps: string[];
  };
};

export type GrowthCenterResult = {
  success: true;
  data: {
    coreV2: GrowthCenterCoreV2;
    progress: {
      completedModules: GrowthModuleId[];
      missingModules: GrowthModuleId[];
      completed: number;
      total: number;
      unlockLevel: 'empty' | 'starter' | 'cross_module' | 'complete';
      message: string;
    };
    companionJourney: {
      version: 'growth_companion_v4';
      purpose: 'lifetime_retention_without_reanalysis';
      stage: AiCompanionStage;
      loop: CompanionLoopStep[];
      checkIn: {
        weekKey: string;
        title: string;
        prompt: string;
        buttonText: string;
        completedText: string;
        returnHint: string;
      };
    };
    longTermEcosystem: {
      version: 'lifetime_companion_v1';
      monthKey: string;
      title: string;
      monthlyTheme: string;
      monthlyFocus: string;
      promise: string;
      rhythm: string[];
      checkpoints: LongTermCheckpoint[];
      nextMonthlyUpdateAt: string;
      policy: string;
    };
    weeklyReport: {
      weekKey: string;
      oneLineReminder: string;
      primaryAction: string;
      evidence: string[];
    };
    weeklyReinforcement: {
      element: GrowthElement;
      label: string;
      headline: string;
      reason: string;
      action: string;
    };
    weeklyTask: {
      title: string;
      task: string;
      reason: string;
    };
    followUp: AiFollowUpSystemSnapshot;
    weeklyEnergyColor: {
      weekKey: string;
      element: GrowthElement;
      colorName: string;
      hex: string;
      reason: string;
      usage: string[];
      message: string;
    };
    weeklyInspiration: SuccessQuote;
    // 心理學主任層：八張卡是八位心理學醫生，主任每週親自為你卜一卦——
    // 卦象＋專屬特殊格局＋洋蔥式溫度話術（同一週同一人永遠同一卦，可回查）。
    chiefPsychologist: {
      weekKey: string;
      hexagramName: string;
      glyph: string;
      patternName: string;
      castingLine: string; // 主任的卜卦宣告（含特殊格局）
      specialYou: string; // 外冷內熱的溫度話（無條件正向關懷）
      absolution: string; // 核心脆弱性：「那不是你的錯」
      ghost: { spirit: string; field: string; karma: string }; // 靈異・磁場・因果
      returnHook: string; // 回診黏著鉤：主任下週等你
    };
    fiveElement: {
      primaryElement: GrowthElement;
      secondaryElement: GrowthElement;
      elementScore: Record<GrowthElement, number>;
      avoidElement: GrowthElement | null;
      confidence: 'low' | 'medium' | 'high';
      summary: string;
    };
    nextStep: {
      moduleId: GrowthModuleId | null;
      title: string;
      href: string;
    };
    dataPolicy: string;
    updatedAt: string;
    nextWeeklyUpdateAt: string;
    nextMonthlyUpdateAt: string;
    generationVersion: 'growth_center_v4';
    personalizationSeed: string;
    systemStability: SystemStabilitySnapshot;
    copywritingStyle: AiCopywritingStyleSnapshot;
    integrationLayer: {
      version: 'ai_integration_layer_v1';
      role: 'read_only_weekly_companion';
      sourceModules: GrowthModuleId[];
      forbiddenCalls: string[];
      pipeline: string[];
    };
  };
};

export const GROWTH_MODULES = AI_INTEGRATION_MODULES as ModuleMeta[];

const ELEMENT_THEMES: Record<GrowthElement, ElementTheme> = {
  AIR: {
    label: '風元素',
    badge: '風',
    theme: '溝通、思路、彈性與表達',
    headline: '本週第一補強是風元素：把想法說清楚，把方向整理出來。',
    reason: '風元素代表理解、表達、連結與變通。補強風元素，重點是讓想法從混亂變清楚，讓溝通更有方向。',
    actionPool: ['今天把一件重要想法寫成三句話。', '本週主動完成一次清楚溝通。', '把目前最卡的一件事拆成三個步驟。'],
    colorPool: [
      { colorName: '森林綠', hex: '#15803D', usage: ['衣服', '手機桌布', '工作背景'] },
      { colorName: '清透綠', hex: '#10B981', usage: ['配件', '筆記封面', '社群背景'] },
    ],
    monthlyFocusPool: ['本月重點是把想法整理成可執行的步驟。', '本月重點是提升表達與回應速度。'],
  },
  SPACE: {
    label: '空元素',
    badge: '空',
    theme: '格局、洞察、留白與整合',
    headline: '本週第一補強是空元素：先看全局，再做決定。',
    reason: '空元素代表洞察、整合、格局與取捨。補強空元素，重點是減少雜訊，抓住真正重要的核心。',
    actionPool: ['今天刪掉一件不重要的待辦。', '本週保留一段安靜整理時間。', '做決定前先寫下最重要的一個標準。'],
    colorPool: [
      { colorName: '星雲紫', hex: '#6D28D9', usage: ['手機桌布', '配件', '冥想背景'] },
      { colorName: '銀灰色', hex: '#94A3B8', usage: ['衣服', '筆記', '工作區'] },
    ],
    monthlyFocusPool: ['本月重點是建立更大的判斷視角。', '本月重點是把分散的事情收斂成一個方向。'],
  },
  WATER: {
    label: '水元素',
    badge: '水',
    theme: '感受、流動、理解與修復',
    headline: '本週第一補強是水元素：讓情緒流動，讓關係回到柔軟。',
    reason: '水元素代表感受、傾聽、適應與修復。補強水元素，重點是降低僵硬反應，增加理解與調整能力。',
    actionPool: ['今天先聽完一個人的想法再回應。', '本週主動修復一次誤會。', '把一個壓力點寫下來，找出能調整的地方。'],
    colorPool: [
      { colorName: '深海藍', hex: '#1D4ED8', usage: ['衣服', '手機桌布', '水杯'] },
      { colorName: '湖水青', hex: '#0891B2', usage: ['配件', '筆記', '工作背景'] },
    ],
    monthlyFocusPool: ['本月重點是提升感受力與修復力。', '本月重點是讓關係與節奏變得更順。'],
  },
  FIRE: {
    label: '火元素',
    badge: '火',
    theme: '行動、決斷、熱度與突破',
    headline: '本週第一補強是火元素：先開始，執行力就會被帶起來。',
    reason: '火元素代表行動力、決策速度、表達熱度與突破意願。補強火元素，重點是減少拖延，讓事情真正往前推進。',
    actionPool: ['今天完成一件拖延最久的小事。', '本週主動做出一個明確決定。', '把想做的事情排進行事曆，今天先做第一步。'],
    colorPool: [
      { colorName: '深紅色', hex: '#B91C1C', usage: ['衣服', '手機桌布', '重點標籤'] },
      { colorName: '琥珀橙', hex: '#F59E0B', usage: ['配件', '筆記標題', '工作背景'] },
    ],
    monthlyFocusPool: ['本月重點是把決定轉成行動。', '本月重點是提高完成速度與主動性。'],
  },
  EARTH: {
    label: '地元素',
    badge: '地',
    theme: '穩定、承接、累積與落地',
    headline: '本週第一補強是地元素：把節奏穩住，把承諾落地。',
    reason: '地元素代表穩定、秩序、承接與持續累積。補強地元素，重點是把想法變成可重複的習慣與成果。',
    actionPool: ['今天固定完成一件基礎任務。', '本週建立一個可持續的小習慣。', '把目前最重要的事情安排固定時間完成。'],
    colorPool: [
      { colorName: '土黃色', hex: '#C89B3C', usage: ['衣服', '配件', '工作背景'] },
      { colorName: '沉穩棕', hex: '#8B6A2E', usage: ['桌布', '筆記封面', '生活用品'] },
    ],
    monthlyFocusPool: ['本月重點是穩定執行與持續累積。', '本月重點是建立能長期維持的生活節奏。'],
  },
};

const SUCCESS_QUOTES: SuccessQuote[] = [
  { author: '賈伯斯', role: 'Apple 共同創辦人', quote: '求知若飢，虛心若愚。', fit: '這句話提醒你保持探索，讓下一步保持清楚與有力。', sourceName: '史丹佛大學新聞', sourceUrl: 'https://news.stanford.edu/stories/2005/06/youve-got-find-love-jobs-says' },
  { author: '馬斯克', role: 'Tesla／SpaceX 執行長', quote: '當一件事情夠重要時，就算勝算對你不利，你還是會去做。', fit: '這句話適合提醒行動與突破。', sourceName: '公開語錄', sourceUrl: 'https://www.spacex.com/' },
  { author: '巴菲特', role: 'Berkshire Hathaway 董事長', quote: '你能做的最好投資，就是投資自己。', fit: '這句話提醒你把成長放回自己身上。', sourceName: 'CNBC 財經新聞網', sourceUrl: 'https://www.cnbc.com/warren-buffett/' },
  { author: '比爾蓋茲', role: 'Microsoft 共同創辦人', quote: '慶祝成功很好，但從失敗中記取教訓更重要。', fit: '這句話提醒你從每一次調整中累積智慧。', sourceName: '比爾蓋茲個人部落格', sourceUrl: 'https://www.gatesnotes.com/' },
  { author: '黃仁勳', role: 'NVIDIA 創辦人暨執行長', quote: '痛苦與磨難能塑造性格。', fit: '這句話提醒你把壓力轉成韌性。', sourceName: '史丹佛大學工程學院', sourceUrl: 'https://engineering.stanford.edu/' },
];

const CORE_ELEMENT_LABEL: Record<GrowthElement, string> = {
  AIR: '風元素',
  SPACE: '空元素',
  WATER: '水元素',
  FIRE: '火元素',
  EARTH: '地元素',
};

function pickBySeed<T>(items: T[], seed: string, salt: string) {
  let value = 0;
  const text = `${seed}:${salt}`;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return items[value % items.length];
}

function buildProgressMessage(completed: number, total: number) {
  const missing = Math.max(total - completed, 0);
  if (completed === 0) return '目前尚未完成探索。先完成任一項分析，易經就會開始建立你的成長檔案。';
  if (completed < 3) return `目前已完成 ${completed}/${total}。先累積三項探索，易經成長中心會開始給出更清楚的每週方向。`;
  if (completed < total) return `目前已完成 ${completed}/${total}，距離完整解鎖還差 ${missing} 項。繼續完成探索，易經陪伴會更精準。`;
  return '八項探索已完成。易經已建立你的專屬成長中心，接下來每週提供一個方向、一個行動與一份提醒。';
}

function buildCoreGrowthCenterV2(args: {
  integration: AiIntegrationResult;
  elementLabel: string;
  colorName: string;
  action: string;
  oneLineReminder: string;
  quote: SuccessQuote;
  preferenceFlags: PreferenceFlags;
}): GrowthCenterCoreV2 {
  const completed = args.integration.completed;
  const total = args.integration.total;
  const missing = Math.max(total - completed, 0);
  const focus = CORE_ELEMENT_LABEL[args.integration.primaryElement] ?? args.elementLabel;
  const isPersonalized = Boolean(args.preferenceFlags.tone || args.preferenceFlags.cadence);
  const topicTip = args.preferenceFlags.topic ? TOPIC_TIPS[args.preferenceFlags.topic] : '';

  return {
    version: 'growth_center_core_v2',
    positioning: {
      title: '易經個人成長中心',
      principle: '分析一次，終身陪伴。',
      roleSplit: '八張分析卡片負責分析；易經成長中心只負責整理、提醒、陪伴與行動。',
    },
    firstScreen: {
      title: '本週 易經成長提醒',
      headline: isPersonalized
        ? args.oneLineReminder
        : completed === 0 ? '先完成第一項探索，易經會開始建立你的專屬成長檔案。' : `本週第一補強：${focus}`,
      body: (completed === 0
        ? '易經成長中心不重新算命。它會讀取你已完成的分析，整理成每週最重要的一件事。'
        : `易經已讀取目前完成的分析，本週重點鎖定 ${focus}。今天先完成一個小行動，讓節奏開始改變。`) + (topicTip ? ` ${topicTip}` : ''),
      primaryMetric: `${completed}/${total}`,
      status: completed >= total ? '已完整解鎖' : completed === 0 ? '等待第一項探索' : `還差 ${missing} 項完整解鎖`,
    },
    memberMemory: {
      title: '會員成長記憶',
      completedText: completed === 0 ? '尚未完成探索。' : `已完成 ${completed} 項探索。`,
      missingText: missing === 0 ? '所有探索已完成。' : `尚有 ${missing} 項探索可完成。`,
      currentFocus: completed === 0 ? '目前先完成任一項分析。' : `目前核心補強：${focus}。`,
      noReanalysisPolicy: '易經成長中心只讀取已完成結果，不重新分析、不覆蓋原本命理資料。',
    },
    weeklyCompanion: {
      reminder: args.oneLineReminder,
      reinforcement: completed === 0 ? '本週先完成第一項探索。' : `本週持續補強：${focus}。`,
      energyColor: `本週能量色：${args.colorName}。`,
      task: `本週一件任務：${args.action}`,
      quote: `${args.quote.author}: ${args.quote.quote}`,
    },
    followUpPolicy: {
      prompt: completed === 0 ? '本週先開始第一項探索。' : `本週 ${focus} 有持續補強嗎？`,
      ifContinued: '有持續，就把同一個行動固定成習慣。',
      ifPaused: '沒有持續，今天重新開始也算前進。',
      boundary: 'Follow-Up 只追蹤補強、行動與成長，不聊天、不偏題、不重新算命。',
    },
    retentionLoop: {
      title: '每週陪伴循環',
      steps: ['完成分析', '整合結果', '每週提醒', '完成一件任務', '下週回來追蹤'],
    },
  };
}

function buildCompanionLoop(args: { reminder: string; elementLabel: string; colorName: string; task: string; quote: SuccessQuote }): CompanionLoopStep[] {
  return [
    { step: 1, label: '提醒', title: '本週一句話', body: args.reminder },
    { step: 2, label: '補強', title: '本週第一補強', body: `本週持續補強 ${args.elementLabel}。` },
    { step: 3, label: '顏色', title: '本週能量色', body: `本週使用 ${args.colorName}。` },
    { step: 4, label: '行動', title: '本週一件任務', body: args.task },
    { step: 5, label: '鼓勵', title: '成功人士一句話', body: `${args.quote.author}: ${args.quote.quote}` },
  ];
}

function buildLongTermEcosystem(args: {
  monthKey: string;
  elementLabel: string;
  monthlyFocus: string;
  action: string;
  stage: AiCompanionStage;
  nextMonthlyUpdateAt: string;
  ecosystemPolicy: string;
}) {
  return {
    version: 'lifetime_companion_v1' as const,
    monthKey: args.monthKey,
    title: '易經長期陪伴生態系',
    monthlyTheme: `${args.monthKey} 月核心方向：${args.elementLabel}`,
    monthlyFocus: args.monthlyFocus,
    promise: '易經不要求你重複算命，而是每週提醒你完成一件真正能推進自己的事。',
    rhythm: ['每週提醒', '每週任務', '每週追蹤', '每月整理'],
    checkpoints: [
      { week: 1 as const, title: '第一週：建立方向', action: `確認本月核心補強：${args.elementLabel}。` },
      { week: 2 as const, title: '第二週：固定行動', action: args.action },
      { week: 3 as const, title: '第三週：修正節奏', action: '檢查哪一件事卡住，今天重新推進一步。' },
      { week: 4 as const, title: '第四週：整理成果', action: '寫下本月一個完成與一個調整。' },
    ],
    nextMonthlyUpdateAt: args.nextMonthlyUpdateAt,
    policy: `${args.ecosystemPolicy} 目前陪伴階段：${args.stage.label}。`,
  };
}

export function buildGrowthCenter(input: GrowthCenterInput): GrowthCenterResult {
  const now = input.now ?? new Date();
  const integration = buildAiIntegrationLayer({ ...input, now });
  const systemStability = buildSystemStabilitySnapshot(integration.completedModules);
  const copywritingStyle = buildAiCopywritingStyleSnapshot();
  const themeData = ELEMENT_THEMES[integration.primaryElement];
  const secondaryTheme = ELEMENT_THEMES[integration.secondaryElement];
  const color = pickBySeed(themeData.colorPool, integration.personalizationSeed, 'weekly-color');
  const quote = pickBySeed(SUCCESS_QUOTES, integration.personalizationSeed, 'weekly-success-quote');
  const action = pickBySeed(themeData.actionPool, integration.personalizationSeed, 'weekly-action');
  const monthlyFocus = pickBySeed(themeData.monthlyFocusPool, integration.monthlySeed, 'monthly-focus');
  const completed = integration.completed;
  const preferenceFlags = resolvePreferenceFlags(input.preferences);
  const timeWord = preferenceFlags.cadence === 'daily' ? '今天' : '本週';

  const oneLineReminder = (() => {
    if (!preferenceFlags.tone) {
      return completed === 0
        ? `${timeWord}最重要：先完成第一項探索，讓 易經建立你的成長起點。`
        : `${timeWord}最重要：補強 ${themeData.label}，用一個小行動帶動 ${themeData.theme}。`;
    }
    if (completed === 0) {
      return preferenceFlags.tone === 'direct'
        ? '現在就開始：先完成第一項探索，易經才能建立你的成長起點。'
        : `不用急，${timeWord}先完成第一項探索就好，易經會開始建立你的專屬成長檔案。`;
    }
    return preferenceFlags.tone === 'direct'
      ? `${timeWord}就做：直接補強 ${themeData.label}，把 ${themeData.theme} 往前推進。`
      : `${timeWord}慢慢補強 ${themeData.label} 就好，讓 ${themeData.theme} 一點一點變穩定。`;
  })();

  const weeklyReport = {
    weekKey: integration.weekKey,
    oneLineReminder,
    primaryAction: action,
    evidence: integration.evidence,
  };

  const followUp = buildAiFollowUpSystem({
    weekKey: integration.weekKey,
    primaryElement: integration.primaryElement,
    elementLabel: themeData.label,
    weeklyReminder: oneLineReminder,
    weeklyAction: action,
    completedModules: integration.completedModules,
    nextWeeklyUpdateAt: integration.nextWeeklyUpdateAt,
  });

  return {
    success: true,
    data: {
      coreV2: buildCoreGrowthCenterV2({ integration, elementLabel: themeData.label, colorName: color.colorName, action, oneLineReminder, quote, preferenceFlags }),
      progress: {
        completedModules: integration.completedModules,
        missingModules: integration.missingModules,
        completed: integration.completed,
        total: integration.total,
        unlockLevel: integration.unlockLevel,
        message: buildProgressMessage(completed, integration.total),
      },
      companionJourney: {
        version: 'growth_companion_v4',
        purpose: 'lifetime_retention_without_reanalysis',
        stage: integration.companionStage,
        loop: buildCompanionLoop({ reminder: oneLineReminder, elementLabel: themeData.label, colorName: color.colorName, task: action, quote }),
        checkIn: {
          weekKey: integration.weekKey,
          title: '本週追蹤',
          prompt: '完成本週任務後，回來點一下完成——這一下就是心理學的「自我監控（Self-Monitoring）」：被記錄的行為，改變速度是沒記錄的兩倍；易經替你保留每一次的節奏。',
          buttonText: '完成本週追蹤',
          completedText: '本週已完成追蹤。下週回來看新的提醒。',
          returnHint: integration.companionStage.returnReason,
        },
      },
      longTermEcosystem: buildLongTermEcosystem({
        monthKey: integration.monthKey,
        elementLabel: themeData.label,
        monthlyFocus,
        action,
        stage: integration.companionStage,
        nextMonthlyUpdateAt: integration.nextMonthlyUpdateAt,
        ecosystemPolicy: integration.ecosystemPolicy,
      }),
      weeklyReport,
      weeklyReinforcement: {
        element: integration.primaryElement,
        label: themeData.label,
        headline: themeData.headline,
        reason: themeData.reason,
        action,
      },
      weeklyTask: {
        title: '本週一件行動任務',
        task: action,
        reason: `這件任務會直接帶動 ${themeData.label}，讓 ${themeData.theme} 開始變得更穩定。心理學上這叫「行為活化（Behavioral Activation）」：不等心情好才行動，而是用一個微行動先啟動，情緒會跟著行動走——易經只開一件，因為「微習慣（Tiny Habits）」的完成率才是黏住改變的關鍵。${preferenceFlags.topic ? TOPIC_TIPS[preferenceFlags.topic] : ''}`,
      },
      followUp,
      weeklyEnergyColor: {
        weekKey: integration.weekKey,
        element: integration.primaryElement,
        colorName: color.colorName,
        hex: color.hex,
        reason: themeData.reason,
        usage: color.usage,
        message: `本週能量色是 ${color.colorName}。可用在 ${color.usage.slice(0, 2).join('、')}——心理學叫「環境線索（Environmental Cue）」：把提醒放進每天會看到的地方，大腦就會自動幫你記得補強 ${themeData.label}，不用靠意志力。`,
      },
      weeklyInspiration: quote,
      chiefPsychologist: (() => {
        // 主任每週卜卦：週次＋個人種子＋本週補強元素決定性起卦
        const gua = castHexagram(integration.weekKey, integration.personalizationSeed, themeData.label);
        const empathic = buildEmpathicFromHexagram('朋友', gua);
        const ghost = buildGhostDecoding(gua);
        return {
          weekKey: integration.weekKey,
          hexagramName: gua.hexagramName,
          glyph: gua.glyph,
          patternName: patternNameOf(gua),
          castingLine: `易經親自為你起了這一卦：第${gua.kingWen}卦「${gua.hexagramName}」${gua.glyph}——特殊格局「${patternNameOf(gua)}」，六十四格裡就這一格是你。${gua.essence}。`,
          specialYou: empathic.specialYou,
          absolution: empathic.absolution,
          ghost: { spirit: ghost.spirit, field: ghost.field, karma: ghost.karma },
          returnHook: `這一卦易經會替你留著。下週同一時間回來，我們核對這一週「${themeData.label}」有沒有真的補進去——你不用表現，也不用交代，易經只想看看你過得好不好。`,
        };
      })(),
      fiveElement: {
        primaryElement: integration.primaryElement,
        secondaryElement: integration.secondaryElement,
        elementScore: integration.elementScore,
        avoidElement: integration.avoidElement,
        confidence: integration.confidence,
        summary: completed === 0
          ? '尚未完成探索，易經會在完成分析後建立唯一五元素核心。'
          : `易經整合層 判定本週第一補強為 ${themeData.label}，第二參考為 ${secondaryTheme.label}。成長中心只讀取結果，不重新分析。`,
      },
      nextStep: {
        moduleId: integration.nextModule?.id ?? null,
        title: integration.nextModule ? `下一步完成：${integration.nextModule.title}` : '探索已完成，現在進入每週陪伴循環。',
        href: integration.nextModule?.href ?? '/growth-center',
      },
      dataPolicy: `${integration.dataPolicy} ${integration.ecosystemPolicy}`,
      updatedAt: now.toISOString(),
      nextWeeklyUpdateAt: integration.nextWeeklyUpdateAt,
      nextMonthlyUpdateAt: integration.nextMonthlyUpdateAt,
      generationVersion: 'growth_center_v4',
      personalizationSeed: integration.personalizationSeed.slice(0, 16),
      systemStability,
      copywritingStyle,
      integrationLayer: {
        version: integration.version,
        role: integration.role,
        sourceModules: integration.sourceModules,
        forbiddenCalls: integration.forbiddenCalls,
        pipeline: integration.pipeline,
      },
    },
  };
}

export function parseGrowthModules(value: string | null): GrowthModuleId[] {
  return parseAiIntegrationModules(value);
}
