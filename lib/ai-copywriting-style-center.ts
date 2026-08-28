import { buildAiActionGuidanceSnapshot } from './ai-action-guidance-center';
import { AI_CORE_JUDGEMENT_PRINCIPLE } from './ai-language-principle';

export { AI_CORE_JUDGEMENT_PRINCIPLE } from './ai-language-principle';

export const AI_COPYWRITING_STYLE_CENTER_VERSION = 'ai_copywriting_style_center_v2';

export type AiCopywritingTone = 'advisor' | 'clear' | 'direct' | 'actionable' | 'companion';

export type AiCopywritingRule = {
  id: string;
  title: string;
  rule: string;
};

export type AiCopywritingReplacement = {
  avoid: string;
  use: string;
  reason: string;
};

export type AiCopywritingAuditResult = {
  ok: boolean;
  violationCount: number;
  violations: Array<{ word: string; count: number }>;
};

export type AiBackendFrontendCopyInput = {
  moduleName: string;
  conclusion: string;
  confidenceScore?: number;
  evidence?: Array<string | null | undefined>;
  action?: string;
  caution?: string;
};

export type AiBackendFrontendCopyBlock = {
  eyebrow: string;
  headline: string;
  confidenceBadge: string;
  confidenceText: string;
  evidenceTitle: string;
  evidenceItems: string[];
  actionTitle: string;
  actionText: string;
  safetyText: string;
  frontendTone: 'high-confidence' | 'clear-confidence' | 'limited-data';
};

export const AI_COPYWRITING_POSITIONING = {
  role: '一位有判斷力、有方向感、能陪伴使用者成長的 易經顧問。',
  notRole: ['老師', '算命先生', '心靈雞湯'],
  coreValue: AI_CORE_JUDGEMENT_PRINCIPLE,
};

export const AI_COPYWRITING_FORBIDDEN_WORDS = [
  '可能',
  '也許',
  '或許',
  '大概',
  '應該',
  '建議可以',
  '建議你',
  '試試看',
  '傾向',
  '比較像',
  '疑似',
  '看起來',
  '可以試試',
  '看情況',
  '如果有空',
  '隨緣',
] as const;

export const AI_COPYWRITING_REPLACEMENTS: AiCopywritingReplacement[] = [
  { avoid: '可能', use: '易經卜卦判定', reason: '把不確定語氣改成清楚判斷。' },
  { avoid: '也許', use: '目前重點', reason: '把模糊推測改成當下方向。' },
  { avoid: '或許', use: '現在最重要', reason: '讓使用者知道優先順序。' },
  { avoid: '大概', use: '本週重點', reason: '把籠統描述改成週期任務。' },
  { avoid: '應該', use: '必須', reason: '把柔性期待改成明確要求。' },
  { avoid: '建議可以', use: '請優先', reason: '把軟性建議改成明確補強。' },
  { avoid: '建議你', use: '易經卜卦判定你', reason: '把個人意見語氣改成系統判定語氣。' },
  { avoid: '試試看', use: '立即開始做', reason: '把不確定的嘗試改成明確行動。' },
  { avoid: '傾向', use: '判定方向', reason: '把推測語氣改成判定語氣。' },
  { avoid: '比較像', use: '系統判定為', reason: '把相似描述改成明確分類。' },
  { avoid: '疑似', use: '系統判定', reason: '移除不確定判斷。' },
  { avoid: '看起來', use: '系統判定', reason: '移除觀感式描述。' },
  { avoid: '可以試試', use: '今天開始做', reason: '把建議改成行動。' },
  { avoid: '看情況', use: '先完成這一步', reason: '把等待改成可執行步驟。' },
  { avoid: '如果有空', use: '今天安排一段時間', reason: '把可做可不做改成具體安排。' },
  { avoid: '隨緣', use: '主動行動', reason: '把被動接受改成主動建立改變。' },
];

export const AI_COPYWRITING_RULES: AiCopywritingRule[] = [
  {
    id: 'clear_judgement',
    title: '清楚判定',
    rule: '每段 易經文案必須清楚指出目前最重要的方向，禁止模稜兩可。',
  },
  {
    id: 'one_action',
    title: '一定帶一個行動',
    rule: '每次 易經回覆必須帶出一個可執行行動，不能只有分析。',
  },
  {
    id: 'three_answers',
    title: '回答三件事',
    rule: '每段重點文案要回答：現在最重要是什麼、你應該做什麼、做了會產生什麼改變。',
  },
  {
    id: 'growth_change_only',
    title: '改變限定在成長層面',
    rule: '改變只描述行為、習慣、思考、節奏、執行力、專注力、人際互動。',
  },
  {
    id: 'no_outcome_guarantee',
    title: '禁止結果保證',
    rule: '不得保證發財、中獎、升官、疾病改善、桃花一定成功。',
  },
  {
    id: 'lifetime_companion',
    title: '分析一次，持續陪伴',
    rule: '分析只做一次，陪伴一直持續；每次登入都給一個方向、一個行動、一份力量。',
  },
];

export const AI_COPYWRITING_ACTION_CONTRACT = {
  now: '現在最重要是什麼',
  action: '你應該做什麼',
  change: '做了會產生什麼行為與節奏改變',
};

export const AI_BACKEND_FRONTEND_COPY_CONTRACT = {
  purpose: '後端輸出標準化，前端直接美化呈現。',
  voice: '快、狠、準、肯定、有感。',
  headlineRule: '標題直接給結論，不繞路，不重複，不使用模糊詞。',
  confidenceRule: '信心值代表資料完整度與模型一致性，不代表命運保證。',
  structure: ['易經卜卦判定標題', '信心值標示', '資料依據', '立即行動', '不保證結果聲明'],
  frontendFields: ['eyebrow', 'headline', 'confidenceBadge', 'confidenceText', 'evidenceItems', 'actionText', 'safetyText', 'frontendTone'],
} as const;

export function buildAiCopywritingInstruction(moduleName = '天地人和 易經平台') {
  return [
    `${moduleName} 必須使用天地人和 易經專屬語言風格。`,
    `易經定位：${AI_COPYWRITING_POSITIONING.role}`,
    AI_CORE_JUDGEMENT_PRINCIPLE,
    '易經的工作是判定缺口，不是保證結果。',
    '結論可以強烈，但必須根據資料完整度與模型一致性給出信心值。信心值不是命運保證。',
    '語氣：清楚、直接、有力量、有方向、有行動，全部使用肯定句、明確句、行動句。',
    '句式公式：先講破壞力判斷（點出現在最卡住的核心問題），再給出精準建設方向，語氣要快、狠、準、肯定、有感。',
    '全部使用「易經卜卦判定」「易經卜卦分析」「易經卜卦確認」開頭，行動指令用「易經卜卦指引立即執行」，不得使用模糊建議語氣。',
    `禁止模糊詞：${AI_COPYWRITING_FORBIDDEN_WORDS.join('、')}。`,
    '五元素輸出必須使用：易經卜卦判定 → 目前最缺 → 請立即補強 → 完成後再補 → 最後補。',
    '每次輸出必須回答四件事：目前判斷、現在最重要、下一步要做什麼、做了會改善哪一個方向。',
    '改變只能描述行為、習慣、思考、節奏、執行力、專注力、人際互動。',
    '不得保證發財、中獎、升官、疾病改善、桃花一定成功。',
  ].join('\n');
}

export function auditAiCopywriting(text: string): AiCopywritingAuditResult {
  const violations = AI_COPYWRITING_FORBIDDEN_WORDS
    .map((word) => {
      const count = text.split(word).length - 1;
      return { word, count };
    })
    .filter((item) => item.count > 0);

  const violationCount = violations.reduce((total, item) => total + item.count, 0);
  return {
    ok: violationCount === 0,
    violationCount,
    violations,
  };
}

export function enforceAiCopywritingTone(text?: string | null) {
  let output = String(text ?? '').trim();
  if (!output) return output;

  const specialReplacements: Array<[string, string]> = [
    ['可能性', '潛力'],
    ['不是沒有可能', '仍有可修正空間'],
    ['可能需要', '必須先'],
    ['可能產生', '會形成'],
    ['可能不一致', '目前不一致'],
    ['可能失衡', '目前失衡'],
  ];

  for (const [avoid, use] of specialReplacements) {
    output = output.split(avoid).join(use);
  }

  for (const replacement of AI_COPYWRITING_REPLACEMENTS) {
    output = output.split(replacement.avoid).join(replacement.use);
  }

  return output
    .replace(/\s+/g, ' ')
    .replace(/建議：/g, '請優先：')
    .replace(/提醒你/g, '易經卜卦判定')
    .trim();
}

export function uniqueAiCopywritingLines(items: Array<string | null | undefined>, limit?: number) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    const clean = enforceAiCopywritingTone(item);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    output.push(clean);
    if (limit && output.length >= limit) break;
  }

  return output;
}
function normalizeAiConfidenceScore(score?: number) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 72;
  return Math.min(99, Math.max(1, Math.round(score)));
}

function getAiFrontendTone(score: number): AiBackendFrontendCopyBlock['frontendTone'] {
  if (score >= 88) return 'high-confidence';
  if (score >= 65) return 'clear-confidence';
  return 'limited-data';
}

function getAiConfidenceBadge(score: number) {
  if (score >= 92) return `易經高信心判定｜${score}%`;
  if (score >= 80) return `易經明確判定｜${score}%`;
  if (score >= 65) return `易經可執行判定｜${score}%`;
  return `易經資料待補判定｜${score}%`;
}

export function buildBackendFrontendCopyBlock(input: AiBackendFrontendCopyInput): AiBackendFrontendCopyBlock {
  const confidenceScore = normalizeAiConfidenceScore(input.confidenceScore);
  const evidenceItems = uniqueAiCopywritingLines(input.evidence ?? [], 4);
  const moduleName = enforceAiCopywritingTone(input.moduleName) || '天地人和 易經';
  const conclusion = enforceAiCopywritingTone(input.conclusion) || '易經卜卦判定：目前最需要先建立清楚方向。';
  const actionText = enforceAiCopywritingTone(input.action) || '易經卜卦指引立即執行：先完成第一個可驗證行動，再回來更新結果。';
  const confidenceBadge = getAiConfidenceBadge(confidenceScore);

  return {
    eyebrow: `${moduleName}｜易經卜卦判定輸出`,
    headline: conclusion.startsWith('AI ') ? conclusion : `易經卜卦判定：${conclusion}`,
    confidenceBadge,
    confidenceText: `信心值 ${confidenceScore}% 代表資料完整度與模型一致性；這是判定強度，不是命運保證。`,
    evidenceTitle: '判定依據',
    evidenceItems: evidenceItems.length > 0 ? evidenceItems : ['易經卜卦判定依據：目前資料已足夠形成第一方向。'],
    actionTitle: '立即行動',
    actionText,
    safetyText: enforceAiCopywritingTone(input.caution) || '易經不預測你的命運；易經卜卦判定你目前最需要補強的方向。成果由使用者的行動創造。',
    frontendTone: getAiFrontendTone(confidenceScore),
  };
}

export const AI_BACKEND_FRONTEND_COPY_SAMPLE = buildBackendFrontendCopyBlock({
  moduleName: '易經五元素',
  conclusion: '目前最缺火元素。第一補強鎖定火元素。',
  confidenceScore: 91,
  evidence: ['五元素權重差距明確', '第一補強與第二補強差距已達可判定區間', '多模組交叉方向一致'],
  action: '易經卜卦指引立即執行：今天先補火元素，完成後再補風元素，最後回到地元素穩定。',
});
export function buildAiCopywritingStyleSnapshot() {
  const actionGuidance = buildAiActionGuidanceSnapshot();
  return {
    version: AI_COPYWRITING_STYLE_CENTER_VERSION,
    positioning: AI_COPYWRITING_POSITIONING,
    tone: ['advisor', 'clear', 'direct', 'actionable', 'companion'] as AiCopywritingTone[],
    forbiddenWords: [...AI_COPYWRITING_FORBIDDEN_WORDS],
    replacements: AI_COPYWRITING_REPLACEMENTS,
    rules: AI_COPYWRITING_RULES,
    actionContract: AI_COPYWRITING_ACTION_CONTRACT,
    backendFrontendCopyContract: AI_BACKEND_FRONTEND_COPY_CONTRACT,
    backendFrontendCopySample: AI_BACKEND_FRONTEND_COPY_SAMPLE,
    actionGuidance,
    instruction: buildAiCopywritingInstruction(),
  };
}
