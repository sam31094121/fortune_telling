import {
  TAROT_CATEGORY_LABELS,
  TAROT_FIXED_DISCLAIMER,
  type TarotAiElement,
  type TarotInterpretationInput,
  type TarotInterpretationOutput,
} from '@/features/tarot/types';

const CATEGORY_LENSES: Record<TarotInterpretationInput['category'], string> = {
  love: '感情互動、期待、界線與真實需要',
  career: '工作角色定位、機會排序與可控行動',
  finance: '資源配置、風險承擔與現實安排',
  business: '合作條件、信任基礎與推進節奏',
  family: '家庭責任、親情界線與溝通方式',
  social: '人際互動、信任感與彼此界線',
  study: '學習策略、準備方式與專注配置',
  decision: '選項代價、風險排序與內在優先順序',
  project: '計畫條件、阻礙來源與推進時機',
  obstacle: '卡住原因與現在必須調整的位置',
  growth: '自我模式、習慣慣性與必須練習的能力',
  near_future: '近期趨勢、能量分配與下一步方向',
  custom: '你提出的具體情境與真正要釐清的核心',
};

const ELEMENT_LABELS: Record<TarotAiElement, string> = {
  AIR: '風',
  SPACE: '空',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};

const ELEMENT_ACTIONS: Record<TarotAiElement, string> = {
  AIR: '本次先補風元素：把想法整理成路線，今天完成一個能持續 7 天的小規劃。',
  SPACE: '本次先補空元素：把標準、界線與決定寫清楚，今天立刻定下一條不可退讓的執行規則。',
  WATER: '本次先補水元素：先觀察再回應，今天把情緒、事實、猜測分成三欄寫下來。',
  FIRE: '本次先補火元素：停止拖延，今天完成一個能被看見的小行動，讓表達與推進重新啟動。',
  EARTH: '本次先補地元素：先穩住節奏，今天完成一件基礎任務，讓承諾落到真實日常。',
};

function getElementEntries(input: TarotInterpretationInput) {
  return (Object.entries(input.elementWeights) as Array<[TarotAiElement, number]>)
    .sort((a, b) => b[1] - a[1]);
}

export function generateTarotInterpretation(input: TarotInterpretationInput): TarotInterpretationOutput {
  const categoryLabel = TAROT_CATEGORY_LABELS[input.category];
  const orientationLabel = input.orientation === 'upright' ? '正位' : '逆位';
  const keywordText = input.keywords.slice(0, 5).join('、');
  const question = input.question.trim();
  const elementEntries = getElementEntries(input);
  const [primaryElement, primaryWeight] = elementEntries[0];
  const [, secondaryWeight] = elementEntries[1] ?? elementEntries[0];
  const primaryLabel = ELEMENT_LABELS[primaryElement];
  const elementText = elementEntries
    .map(([element, weight]) => `${ELEMENT_LABELS[element]}${weight}`)
    .join('、');
  const gap = Math.max(0, primaryWeight - secondaryWeight);
  const lockedElementLine = `AI 五元素判定：本次第一補強鎖定${primaryLabel}元素，權重 ${primaryWeight} 分，高於第二順位 ${gap} 分；本次先補${primaryLabel}，不分散補其他元素。`;

  if (!question) {
    throw new Error('缺少塔羅問題，無法產生解讀。');
  }

  return {
    summary: `${input.cardName}${orientationLabel}帶出的核心是「${keywordText}」。${input.baseMeaning} ${input.symbolism} ${lockedElementLine}`,
    questionConnection: `以「${categoryLabel}」來看，你問的是「${question}」。後端判定本題核心落在${CATEGORY_LENSES[input.category]}；本次塔羅元素權重為 ${elementText}。結論已鎖定：先補${primaryLabel}元素，再交由 Integration Layer 與姓名學、八字、紫微、西洋星座、血型共同整合。`,
    reflectionQuestion: `本次反思只問一件事：我今天要如何用${primaryLabel}元素完成第一個明確行動？${input.reflectionPrompt}`,
    actionSuggestion: ELEMENT_ACTIONS[primaryElement],
    disclaimer: TAROT_FIXED_DISCLAIMER,
  };
}