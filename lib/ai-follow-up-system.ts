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
  '家庭隱私',
  '收入狀況',
  '孩子與伴侶細節',
  '生活八卦',
  '健康診斷',
  '重新算命',
  '重新排盤',
  '與本週補強無關的聊天',
] as const;

export function buildAiFollowUpSystem(input: AiFollowUpInput): AiFollowUpSystem {
  return {
    version: AI_FOLLOW_UP_SYSTEM_VERSION,
    purpose: '追蹤會員本週補強進度，增加長期陪伴與回訪，不新增命理分析。',
    highestPrinciple: '易經只追蹤補強、任務與行動，不聊天、不偏題、不重新分析。',
    sourcePolicy: '所有追蹤內容只讀取 易經 Integration Layer 已整理的結果。',
    scopePolicy: `本週只圍繞 ${input.elementLabel}、本週任務與會員自己的補強進度。`,
    forbiddenTopics: [...AI_FOLLOW_UP_FORBIDDEN_TOPICS],
    weekKey: input.weekKey,
    primaryElement: input.primaryElement,
    elementLabel: input.elementLabel,
    prompt: `這一週，你有持續補強 ${input.elementLabel} 嗎？`,
    quickReplies: [
      { id: 'continued', label: '有持續', meaning: '會員本週有依照提醒完成補強行動。' },
      { id: 'paused', label: '還沒有', meaning: '會員本週尚未開始或中斷補強行動。' },
    ],
    replyWhenContinued: {
      title: '很好，請持續。',
      message: `你已經開始補強 ${input.elementLabel}，現在要把它固定成穩定節奏。`,
      nextStep: `下一步：把「${input.weeklyAction}」固定成今天的一個小動作。`,
      improvement: '這會改善你的執行節奏、專注力與持續感。',
    },
    replyWhenPaused: {
      title: '今天開始也不晚。',
      message: `目前仍建議持續補強 ${input.elementLabel}，先不用想太多，今天先做第一步。`,
      nextStep: `今天先做：「${input.weeklyAction}」。`,
      improvement: '這會幫你重新找回方向，降低拖延，讓行動重新開始。',
    },
    boundary: 'Follow-Up 只處理會員自己的補強進度、本週任務與行動提醒；不詢問私人生活，不重新分析命理。',
    metrics: ['weekly_follow_up_viewed', 'weekly_follow_up_answered', 'weekly_task_continued', 'weekly_task_paused'],
  };
}

export function buildAiFollowUpSystemSnapshot() {
  return buildAiFollowUpSystem({
    weekKey: 'sample-week',
    primaryElement: 'FIRE',
    elementLabel: '火元素',
    weeklyReminder: '本週重點是開始行動。',
    weeklyAction: '完成一件拖延最久的小事。',
    completedModules: [],
    nextWeeklyUpdateAt: 'next-week',
  });
}
