import type { AiIntegrationElement, AiIntegrationModuleId } from './ai-integration-layer';

export const AI_FOLLOW_UP_SYSTEM_VERSION = 'ai_follow_up_system_v2';

export type AiFollowUpAnswer = 'continued' | 'paused';

export type AiFollowUpInput = {
  weekKey: string;
  primaryElement: AiIntegrationElement;
  elementLabel: string;
  weeklyReminder: string;
  weeklyAction: string;
  completedModules: AiIntegrationModuleId[];
  nextWeeklyUpdateAt: string;
};

export type AiFollowUpSystem = {
  version: typeof AI_FOLLOW_UP_SYSTEM_VERSION;
  purpose: string;
  highestPrinciple: string;
  sourcePolicy: string;
  scopePolicy: string;
  forbiddenTopics: string[];
  weekKey: string;
  primaryElement: AiIntegrationElement;
  elementLabel: string;
  prompt: string;
  quickReplies: Array<{
    id: AiFollowUpAnswer;
    label: string;
    meaning: string;
  }>;
  replyWhenContinued: {
    title: string;
    message: string;
    nextStep: string;
    improvement: string;
  };
  replyWhenPaused: {
    title: string;
    message: string;
    nextStep: string;
    improvement: string;
  };
  boundary: string;
  metrics: string[];
};

export const AI_FOLLOW_UP_FORBIDDEN_TOPICS = [
  '家庭狀況',
  '工作收入',
  '孩子與伴侶',
  '一般閒聊',
  '八卦話題',
  '重新算命',
  '重新排盤',
  '與補強行動無關的問題',
] as const;

export function buildAiFollowUpSystem(input: AiFollowUpInput): AiFollowUpSystem {
  return {
    version: AI_FOLLOW_UP_SYSTEM_VERSION,
    purpose: '追蹤會員自己的補強進度，提升長期陪伴與回訪率。',
    highestPrinciple: 'AI 只陪會員完成補強、成長與行動，不聊天、不重新分析。',
    sourcePolicy: '全部資料只讀取 AI Integration Layer 已整合的會員本人分析結果。',
    scopePolicy: `本週只追蹤 ${input.elementLabel}、本週任務與會員自己的補強進度。`,
    forbiddenTopics: [...AI_FOLLOW_UP_FORBIDDEN_TOPICS],
    weekKey: input.weekKey,
    primaryElement: input.primaryElement,
    elementLabel: input.elementLabel,
    prompt: `本週 ${input.elementLabel} 持續補強了嗎？`,
    quickReplies: [
      { id: 'continued', label: '有持續', meaning: '會員本週有依照補強方向行動。' },
      { id: 'paused', label: '還沒有', meaning: '會員本週尚未開始或中斷補強行動。' },
    ],
    replyWhenContinued: {
      title: '很好，請持續。',
      message: `你已經開始補強 ${input.elementLabel}，這代表本週方向有被執行。`,
      nextStep: `下一步：把「${input.weeklyAction}」固定成今天的一個小動作。`,
      improvement: '這會讓行動節奏更穩，執行力與自我提醒更清楚。',
    },
    replyWhenPaused: {
      title: '今天開始也不晚。',
      message: `目前仍建議持續補強 ${input.elementLabel}，先不用補很多，先完成一個動作。`,
      nextStep: `今天先做：「${input.weeklyAction}」。`,
      improvement: '這會讓拖延感降低，讓本週重新回到明確方向。',
    },
    boundary: 'Follow-Up 只追蹤會員自己的補強、成長與行動，不詢問家庭、生活、工作，也不重新算命。',
    metrics: ['weekly_follow_up_viewed', 'weekly_follow_up_answered', 'weekly_task_continued', 'weekly_task_paused'],
  };
}

export function buildAiFollowUpSystemSnapshot() {
  return buildAiFollowUpSystem({
    weekKey: 'sample-week',
    primaryElement: 'FIRE',
    elementLabel: '火元素',
    weeklyReminder: '本週重點：先行動，再調整。',
    weeklyAction: '今天完成一件拖延最久的小事。',
    completedModules: [],
    nextWeeklyUpdateAt: 'next-week',
  });
}