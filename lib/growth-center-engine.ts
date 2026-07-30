import { AI_INTEGRATION_MODULES, buildAiIntegrationLayer, parseAiIntegrationModules } from './ai-integration-layer';
import type { AiCompanionStage, AiIntegrationElement, AiIntegrationModuleId, AiIntegrationResult } from './ai-integration-layer';
import { buildSystemStabilitySnapshot } from './platform-stability-layer';
import { buildAiCopywritingStyleSnapshot } from './ai-copywriting-style-center';
import { buildAiFollowUpSystem } from './ai-follow-up-system';

export type GrowthModuleId = AiIntegrationModuleId;
export type GrowthElement = AiIntegrationElement;

export type GrowthCenterInput = {
  userId?: string | null;
  anonymousProfileId?: string | null;
  completedModules?: GrowthModuleId[];
  primaryElement?: GrowthElement | null;
  secondaryElement?: GrowthElement | null;
  avoidElement?: GrowthElement | null;
  analysisHash?: string | null;
  now?: Date;
};

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
  step: 1 | 2 | 3 | 4 | 5;
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
      total: 7;
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
    fiveElement: {
      primaryElement: GrowthElement;
      secondaryElement: GrowthElement;
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
  EARTH: {
    label: '地元素',
    badge: '地',
    theme: '穩定、累積、落地執行',
    headline: '本週一定要把想法落到實際行動，先穩住節奏，再累積成果。',
    reason: '地元素代表承接與穩定。當整合層判定地元素優先時，本週最重要的是把計畫變成可完成的小步驟。',
    actionPool: ['本週完成一件拖延最久、但可以在三十分鐘內開始的事情。', '本週固定一個時間整理資料、帳務或工作清單。', '本週把一個目標拆成三個小步驟，先完成第一步。'],
    colorPool: [
      { colorName: '暖土黃色', hex: '#C89B3C', usage: ['衣服配件', '手機桌布', '工作筆記'] },
      { colorName: '沉穩咖金', hex: '#8B6A2E', usage: ['手鍊搭配', '桌面背景', '隨身小物'] },
    ],
    monthlyFocusPool: ['把生活與工作重新整理成可長期維持的節奏。', '把重要目標落地成每週都能完成的一件事。'],
  },
  WATER: {
    label: '水元素',
    badge: '水',
    theme: '情緒流動、溝通、柔軟適應',
    headline: '本週一定要讓情緒與溝通順起來，先聽懂自己，再回應別人。',
    reason: '水元素代表流動與理解。當整合層判定水元素優先時，本週最需要補強的是表達、傾聽與情緒調節。',
    actionPool: ['本週主動和一位重要的人好好說一句真心話。', '本週每天留三分鐘寫下自己的情緒，不急著批判。', '本週遇到衝突時先停十秒，再用平穩語氣回應。'],
    colorPool: [
      { colorName: '深海藍', hex: '#1D4ED8', usage: ['手機桌布', '衣服配件', '聊天背景'] },
      { colorName: '清澈青藍', hex: '#0891B2', usage: ['桌面背景', '手鍊搭配', '筆記標籤'] },
    ],
    monthlyFocusPool: ['把情緒、溝通與人際關係調回順流。', '用更柔軟的方式處理壓力與關係。'],
  },
  FIRE: {
    label: '火元素',
    badge: '火',
    theme: '行動力、表達、突破',
    headline: '本週一定要把能量點燃，先做出一個明確行動。',
    reason: '火元素代表啟動與突破。當整合層判定火元素優先時，本週最重要的是不要停在想法，要讓行動被看見。',
    actionPool: ['本週主動完成一件一直想做、卻沒有開始的事情。', '本週選一天提早十分鐘開始工作或學習，建立啟動感。', '本週公開表達一次自己的想法，讓機會看見你。'],
    colorPool: [
      { colorName: '深紅色', hex: '#B91C1C', usage: ['衣服配件', '手機桌布', '行動提醒'] },
      { colorName: '琥珀橘', hex: '#F59E0B', usage: ['手鍊搭配', '筆記重點', '桌面背景'] },
    ],
    monthlyFocusPool: ['把想做的事真正啟動，讓行動連續發生。', '把表達力與決斷力拉回主場。'],
  },
  WIND: {
    label: '風元素',
    badge: '風',
    theme: '學習、創意、彈性調整',
    headline: '本週一定要打開新的理解，把卡住的事情換一個角度看。',
    reason: '風元素代表思考與變通。當整合層判定風元素優先時，本週最需要補強的是學習、彈性與創意表達。',
    actionPool: ['本週學一個小技巧，立刻用在正在處理的事情上。', '本週把一件卡住的事寫出三種替代做法。', '本週主動閱讀或觀看一份能提升自己的內容。'],
    colorPool: [
      { colorName: '森林綠', hex: '#15803D', usage: ['手機桌布', '衣服配件', '工作筆記'] },
      { colorName: '清新薄荷', hex: '#10B981', usage: ['桌面背景', '手鍊搭配', '生活小物'] },
    ],
    monthlyFocusPool: ['讓學習、創意與彈性成為新的回訪動力。', '用新的角度重新整理卡住的事情。'],
  },
  SPACE: {
    label: '空元素',
    badge: '空',
    theme: '格局、專注、清空雜訊',
    headline: '本週一定要把雜訊放下，留下真正重要的一件事。',
    reason: '空元素代表格局與留白。當整合層判定空元素優先時，本週最需要補強的是專注、取捨與內在空間。',
    actionPool: ['本週刪掉一件不必要的待辦，把時間留給真正重要的事。', '本週安排十五分鐘安靜時間，只整理腦中的優先順序。', '本週把手機通知整理一次，減少被打斷的次數。'],
    colorPool: [
      { colorName: '星夜紫', hex: '#6D28D9', usage: ['手機桌布', '手鍊搭配', '冥想背景'] },
      { colorName: '霧銀灰', hex: '#94A3B8', usage: ['桌面背景', '衣服配件', '工作空間'] },
    ],
    monthlyFocusPool: ['把注意力收回來，只留下真正重要的方向。', '透過留白與取捨，建立更清楚的生活秩序。'],
  },
};

const SUCCESS_QUOTES: SuccessQuote[] = [
  { author: '史蒂夫・賈伯斯', role: 'Apple 共同創辦人', quote: 'Stay hungry. Stay foolish.', fit: '提醒你保持渴望，也保留探索未知的勇氣。', sourceName: 'Stanford News', sourceUrl: 'https://news.stanford.edu/stories/2005/06/youve-got-find-love-jobs-says' },
  { author: '伊隆・馬斯克', role: 'Tesla / SpaceX CEO', quote: 'When something is important enough, you do it even if the odds are not in your favor.', fit: '提醒你真正重要的事情，值得用行動把它推進。', sourceName: 'Public interview quote', sourceUrl: 'https://www.spacex.com/' },
  { author: '華倫・巴菲特', role: 'Berkshire Hathaway 董事長', quote: 'The best investment you can make is in yourself.', fit: '提醒你本週最值得投入的，仍然是自己的能力與狀態。', sourceName: 'CNBC', sourceUrl: 'https://www.cnbc.com/warren-buffett/' },
  { author: '比爾・蓋茲', role: 'Microsoft 共同創辦人', quote: 'It is fine to celebrate success, but it is more important to heed the lessons of failure.', fit: '提醒你成功值得開心，但每次修正都會讓下一步更穩。', sourceName: 'Gates Notes', sourceUrl: 'https://www.gatesnotes.com/' },
  { author: '黃仁勳', role: 'NVIDIA 創辦人暨 CEO', quote: 'Pain and suffering build character.', fit: '提醒你壓力不是停止的理由，它也能變成成長的力量。', sourceName: 'Stanford Engineering', sourceUrl: 'https://engineering.stanford.edu/' },
  { author: '張忠謀', role: 'TSMC 創辦人', quote: 'Learning is local.', fit: '提醒你真正的學習來自持續留在現場累積。', sourceName: 'MIT News', sourceUrl: 'https://news.mit.edu/2023/morris-chang-describes-secrets-semiconductor-success-1025' },
  { author: '馬雲', role: 'Alibaba 創辦人', quote: 'Never give up.', fit: '提醒你本週先守住一件事，不急著放棄。', sourceName: 'BrainyQuote', sourceUrl: 'https://www.brainyquote.com/quotes/jack_ma_678619' },
  { author: '歐普拉・溫芙蕾', role: '媒體企業家', quote: 'The biggest adventure you can ever take is to live the life of your dreams.', fit: '提醒你長期陪伴的目的，是把夢想慢慢活出來。', sourceName: 'The Quotations Page', sourceUrl: 'https://www.quotationspage.com/quote/31137.html' },
  { author: '孔子', role: '思想家', quote: '學而不思則罔，思而不學則殆。', fit: '提醒你學習與思考一定要一起前進。', sourceName: 'Stanford Engineering', sourceUrl: 'https://engineering.stanford.edu/news/stanford-engineering-hero-morris-chang-honored-revolutionizing-chip-making' },
  { author: '約翰・亨尼西', role: 'Stanford 前校長', quote: 'There is a difference between success and impact.', fit: '提醒你長期價值不是只看成功，也要看留下的影響。', sourceName: 'Stanford Engineering', sourceUrl: 'https://engineering.stanford.edu/news/stanford-engineering-hero-morris-chang-honored-revolutionizing-chip-making' },
];


const CORE_ELEMENT_LABEL: Record<GrowthElement, string> = {
  EARTH: '地元素',
  WATER: '水元素',
  FIRE: '火元素',
  WIND: '風元素',
  SPACE: '空元素',
};

function buildCoreGrowthCenterV2(args: {
  integration: AiIntegrationResult;
  elementLabel: string;
  colorName: string;
  action: string;
  oneLineReminder: string;
  quote: SuccessQuote;
}) : GrowthCenterCoreV2 {
  const completed = args.integration.completed;
  const total = args.integration.total;
  const missingCount = Math.max(total - completed, 0);
  const primaryLabel = CORE_ELEMENT_LABEL[args.integration.primaryElement] ?? args.elementLabel;
  const status = completed >= total
    ? '專屬成長中心已完整解鎖'
    : completed === 0
      ? '尚未建立本人分析資料'
      : `已完成 ${completed}/${total}，還差 ${missingCount} 項探索`;

  return {
    version: 'growth_center_core_v2',
    positioning: {
      title: 'AI 個人成長中心',
      principle: '分析一次，終身陪伴。',
      roleSplit: '六張命理卡片負責分析；AI 個人成長中心只負責陪伴、提醒、追蹤與行動。',
    },
    firstScreen: {
      title: '本週 AI 陪伴核心',
      headline: completed === 0 ? '先完成第一項本人探索，AI 會開始建立你的成長檔案。' : `本週核心：持續補強 ${primaryLabel}。`,
      body: completed === 0
        ? '這裡不會重新算命。完成本人分析後，AI 會讀取已完成結果，整理成本週提醒、補強方向、能量色與一件行動任務。'
        : `AI 已讀取你的本人分析紀錄，本週只提醒最重要的一件事：把 ${primaryLabel} 的補強落實成行動。`,
      primaryMetric: `${completed}/${total}`,
      status,
    },
    memberMemory: {
      title: 'AI 記得你的成長檔案',
      completedText: completed === 0 ? '目前尚未完成本人探索。' : `目前已完成 ${completed} 項本人探索。`,
      missingText: missingCount === 0 ? '六項探索已完成，後續以陪伴與追蹤為主。' : `還有 ${missingCount} 項探索未完成。`,
      currentFocus: completed === 0 ? '目前先建立第一份本人資料。' : `目前第一補強：${primaryLabel}。`,
      noReanalysisPolicy: 'AI 個人成長中心只讀取既有本人分析，不重新排盤、不重新算命、不讀親朋好友資料。',
    },
    weeklyCompanion: {
      reminder: args.oneLineReminder,
      reinforcement: completed === 0 ? '本週第一補強：完成第一項本人探索。' : `本週第一補強：${primaryLabel}。`,
      energyColor: `本週唯一能量色：${args.colorName}。`,
      task: `本週唯一行動任務：${args.action}`,
      quote: `${args.quote.author}：${args.quote.quote}`,
    },
    followUpPolicy: {
      prompt: completed === 0 ? '本週開始建立自己的第一份分析了嗎？' : `本週 ${primaryLabel} 持續補強了嗎？`,
      ifContinued: '如果有，AI 會給你下一步，讓本週行動更穩。',
      ifPaused: '如果沒有，AI 只提醒你回到本週任務，不責備、不聊天。',
      boundary: 'Follow-Up 只追蹤會員自己的補強、成長與行動，不問家庭、不問生活、不問收入、不重新分析。',
    },
    retentionLoop: {
      title: '會員回訪習慣',
      steps: [
        '第一次：完成本人分析，建立專屬資料。',
        '之後登入：第一眼看 AI 個人成長中心。',
        '每週：只更新一個提醒、一個補強、一個能量色、一件任務、一句名言。',
        '長期：AI 追蹤補強進度，讓會員每週回來看方向。',
      ],
    },
  };
}
function pickBySeed<T>(items: T[], seed: string, salt: string) {
  let value = 0;
  const text = `${seed}:${salt}`;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return items[value % items.length];
}

function buildProgressMessage(completed: number) {
  if (completed === 0) return '目前尚未讀到六張卡片的完成紀錄，成長中心會先用本週固定節奏陪伴你。完成任一張卡片後，內容會立刻更個人化。';
  if (completed < 3) return `目前已讀取 ${completed} 張已完成卡片。整合層只做整理與陪伴，不會重新算命。`;
  if (completed < 6) return `目前已讀取 ${completed} 張已完成卡片，已可形成跨模組的每週陪伴內容。`;
  return '六張卡片都已完成，本週陪伴內容會以完整整合結果產生。';
}

function buildCompanionLoop(args: { reminder: string; elementLabel: string; colorName: string; task: string; quote: SuccessQuote }): CompanionLoopStep[] {
  return [
    { step: 1, label: '第一眼', title: '本週提醒', body: args.reminder },
    { step: 2, label: '第二眼', title: '本週第一補強', body: `本週唯一補強重點是${args.elementLabel}。` },
    { step: 3, label: '第三眼', title: '本週能量色', body: `本週唯一能量色是${args.colorName}。` },
    { step: 4, label: '第四眼', title: '本週一件任務', body: args.task },
    { step: 5, label: '第五眼', title: '成功人士一句話', body: `${args.quote.author}：${args.quote.quote}` },
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
    title: 'AI 長期陪伴生態系',
    monthlyTheme: `${args.monthKey} 長期陪伴主題：持續補強${args.elementLabel}`,
    monthlyFocus: args.monthlyFocus,
    promise: '本系統每週陪你完成一件小事，每月整理一個方向，長期累積成穩定的會員陪伴價值。',
    rhythm: ['每週回來看提醒', '確認本週唯一任務', '按下完成本週陪伴', '下週回來看新的陪伴方向'],
    checkpoints: [
      { week: 1 as const, title: '第一週：看見方向', action: `確認本月主軸是${args.elementLabel}。` },
      { week: 2 as const, title: '第二週：完成小事', action: args.action },
      { week: 3 as const, title: '第三週：穩住節奏', action: '回來檢查自己是否有持續前進。' },
      { week: 4 as const, title: '第四週：整理收穫', action: '記下一件本月最有感的改變。' },
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

  const oneLineReminder = completed === 0
    ? '本週先從一件小行動開始，讓平台陪你建立穩定回訪節奏。'
    : `本週第一補強是${themeData.label}，請把${themeData.theme}落到一件可完成的行動。`;

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
      coreV2: buildCoreGrowthCenterV2({
        integration,
        elementLabel: themeData.label,
        colorName: color.colorName,
        action,
        oneLineReminder,
        quote,
      }),
      progress: {
        completedModules: integration.completedModules,
        missingModules: integration.missingModules,
        completed: integration.completed,
        total: integration.total,
        unlockLevel: integration.unlockLevel,
        message: buildProgressMessage(completed),
      },
      companionJourney: {
        version: 'growth_companion_v4',
        purpose: 'lifetime_retention_without_reanalysis',
        stage: integration.companionStage,
        loop: buildCompanionLoop({ reminder: oneLineReminder, elementLabel: themeData.label, colorName: color.colorName, task: action, quote }),
        checkIn: {
          weekKey: integration.weekKey,
          title: '完成本週陪伴',
          prompt: '讀完本週提醒後，按下完成，系統會記住你本週已回來看過。',
          buttonText: '我已完成本週陪伴',
          completedText: '本週陪伴已完成，下週回來會看到新的提醒。',
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
        title: '只做這一件',
        task: action,
        reason: `這週只做一件事：它對應${themeData.label}，能讓${themeData.theme}真正落到行動。`,
      },
      followUp,
      weeklyEnergyColor: {
        weekKey: integration.weekKey,
        element: integration.primaryElement,
        colorName: color.colorName,
        hex: color.hex,
        reason: themeData.reason,
        usage: color.usage,
        message: `本週能量色是${color.colorName}。你可以用在${color.usage.slice(0, 2).join('、')}，提醒自己持續補強${themeData.label}。`,
      },
      weeklyInspiration: quote,
      fiveElement: {
        primaryElement: integration.primaryElement,
        secondaryElement: integration.secondaryElement,
        avoidElement: integration.avoidElement,
        confidence: integration.confidence,
        summary: completed === 0
          ? '成長中心目前只看到空資料，因此先用本週固定節奏產生陪伴提醒。完成任一張卡片後，內容會立刻更個人化。'
          : `依照 AI Integration Layer 讀取的已完成卡片狀態，本週第一補強是${themeData.label}，第二參考是${secondaryTheme.label}。本中心不重新算命，只把既有結果整理成每週可執行的提醒。`,
      },
      nextStep: {
        moduleId: integration.nextModule?.id ?? null,
        title: integration.nextModule ? `下一步可完成：${integration.nextModule.title}` : '六張卡片已完成，本週照著成長中心行動即可。',
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
