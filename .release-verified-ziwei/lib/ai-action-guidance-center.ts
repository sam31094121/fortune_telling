import { AI_CORE_JUDGEMENT_PRINCIPLE } from './ai-language-principle';

export const AI_ACTION_GUIDANCE_VERSION = 'ai_action_guidance_v1';

export type AiActionGuidanceStepId = 'judgement' | 'priority' | 'next_action' | 'improvement_direction';

export type AiActionGuidanceStep = {
  id: AiActionGuidanceStepId;
  title: string;
  question: string;
  outputRule: string;
};

export const AI_ACTION_GUIDANCE_STEPS: AiActionGuidanceStep[] = [
  {
    id: 'judgement',
    title: '目前判斷',
    question: 'AI 目前判定了什麼？',
    outputRule: '直接說出第一判斷，例如：AI 判定：目前最缺火元素。請優先補強火元素。',
  },
  {
    id: 'priority',
    title: '現在最重要',
    question: '現在最重要的一件事是什麼？',
    outputRule: '只給一個重點，不同時丟出多個方向。',
  },
  {
    id: 'next_action',
    title: '下一步要做什麼',
    question: '會員今天開始要做什麼？',
    outputRule: '給出今天就能開始的一個行動，例如：主動完成一件拖延最久的事情。',
  },
  {
    id: 'improvement_direction',
    title: '改善方向',
    question: '做了之後會改善哪一個方向？',
    outputRule: '只能描述行動力、決策速度、執行效率、習慣、節奏、專注力、人際互動等成長方向。',
  },
];

export const AI_ACTION_GUIDANCE_FORBIDDEN = [
  '不能只給答案，必須給下一步。',
  '不得使用可能、也許、或許、建議可以、傾向、比較像、疑似、看起來、大概、看情況等模糊詞。',
  '不得保證發財、中獎、升官、疾病改善、桃花一定成功。',
  '不得一開始就推產品；必須先說原因，再說行動，最後才推薦五元素補強方案。',
  '成功人士名言只能放最後，用來增加力量，不得取代 AI 分析。',
] as const;

export const AI_ACTION_GUIDANCE_PRODUCT_ORDER = [
  '先說原因',
  '再說行動',
  '最後推薦五元素補強方案',
] as const;

export const AI_ACTION_GUIDANCE_COPY_EXAMPLES = {
  elementJudgement: 'AI 判定：目前最缺火元素。請優先補強火元素。完成後再補風元素，最後補地元素。',
  priority: '現在最重要：先讓行動發生。',
  nextAction: '今天開始：主動完成一件拖延最久的事情。',
  improvement: '這個行動會改善你的行動力、決策速度與執行效率。',
};

export function buildAiActionGuidanceInstruction(moduleName = '天地人和 AI') {
  return [
    `${moduleName} 每一次分析完成後，必須提供 AI 行動引導。`,
    '輸出必須包含四件事：目前判斷、現在最重要、下一步要做什麼、做了會改善哪一個方向。',
    '每次只告訴會員現在最重要的一件事情。',
    '語氣必須直接、清楚、有力量、有方向。',
    '不能使用模稜兩可文字，不能保證不存在的結果。',
    AI_CORE_JUDGEMENT_PRINCIPLE,
    '產品只能在原因與行動之後出現，成功人士名言只能放在最後。',
  ].join('\n');
}

export function buildAiActionGuidanceSnapshot() {
  return {
    version: AI_ACTION_GUIDANCE_VERSION,
    purpose: '讓使用者離開平台前，一定知道今天開始要做什麼。',
    highestPrinciple: AI_CORE_JUDGEMENT_PRINCIPLE,
    requiredSteps: AI_ACTION_GUIDANCE_STEPS,
    forbidden: [...AI_ACTION_GUIDANCE_FORBIDDEN],
    productOrder: [...AI_ACTION_GUIDANCE_PRODUCT_ORDER],
    examples: AI_ACTION_GUIDANCE_COPY_EXAMPLES,
    instruction: buildAiActionGuidanceInstruction(),
  };
}
