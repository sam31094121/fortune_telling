import {
  TAROT_CATEGORY_LABELS,
  TAROT_FIXED_DISCLAIMER,
  TAROT_SPREAD_LABELS,
  type TarotAiElement,
  type TarotElementWeights,
  type TarotInterpretationCardInput,
  type TarotInterpretationInput,
  type TarotInterpretationOutput,
} from '@/features/tarot/types';
import { AI_CORE_JUDGEMENT_PRINCIPLE } from '@/lib/ai-language-principle';

const CATEGORY_LENSES: Record<TarotInterpretationInput['category'], string> = {
  love: '感情互動、期待、界線與真實需要',
  career: '職涯節奏、責任承擔、下一步位置',
  finance: '金錢流向、風險控制、資源配置',
  business: '策略推進、合作結構、可執行成果',
  family: '家庭責任、情緒照顧、角色界線',
  social: '人際互動、信任程度、合作秩序',
  study: '學習節奏、專注狀態、能力累積',
  decision: '選擇核心、代價排序、行動窗口',
  project: '計畫推進、阻力來源、交付順序',
  obstacle: '卡住原因、需要拆解的壓力點',
  growth: '自我整理、內在秩序、補強方向',
  near_future: '近期節奏、可控行動、需要避開的消耗',
  custom: '使用者自訂主題、當下焦點、可執行下一步',
};

const ELEMENT_LABELS: Record<TarotAiElement, string> = {
  AIR: '風',
  SPACE: '空',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};

const ELEMENT_ACTIONS: Record<TarotAiElement, string> = {
  AIR: '第一補強：風元素。今天先把問題拆成三句話：事實、選項、下一步。完成後只做一個清楚決定。',
  SPACE: '第一補強：空元素。今天先停止多餘反應，保留一段安靜時間，把真正重要的訊號留下。',
  WATER: '第一補強：水元素。今天先整理情緒流向，說出真實需要，並把不需要承接的情緒放下。',
  FIRE: '第一補強：火元素。今天先啟動行動，選一件能在 30 分鐘內完成的事，直接推進。',
  EARTH: '第一補強：地元素。今天先落地執行，把任務排進時間表，完成一個可檢查的實際成果。',
};

const EMPTY_WEIGHTS: TarotElementWeights = {
  AIR: 0,
  SPACE: 0,
  WATER: 0,
  FIRE: 0,
  EARTH: 0,
};

const FORBIDDEN_TO_ASSERTIVE: Array<[string, string]> = [
  ['可能', 'AI 判定'],
  ['也許', 'AI 判定'],
  ['或許', 'AI 判定'],
  ['建議可以', '請直接'],
  ['傾向', '判定為'],
  ['比較像', '判定為'],
  ['疑似', '判定為'],
  ['看起來', '判定為'],
  ['大概', '已判定'],
];

function forceAssertiveText(text: string): string {
  return FORBIDDEN_TO_ASSERTIVE.reduce((current, [from, to]) => current.replaceAll(from, to), text);
}

function getDrawnCards(input: TarotInterpretationInput): TarotInterpretationCardInput[] {
  if (input.drawnCards?.length) return input.drawnCards;
  return [{
    positionLabel: '核心',
    cardName: input.cardName,
    orientation: input.orientation,
    keywords: input.keywords,
    baseMeaning: input.baseMeaning,
    reflectionPrompt: input.reflectionPrompt,
    symbolism: input.symbolism,
    elementWeights: input.elementWeights,
  }];
}

function combineWeights(cards: TarotInterpretationCardInput[]): TarotElementWeights {
  return cards.reduce((acc, card, index) => {
    const weightMultiplier = index === 0 ? 1.12 : index === cards.length - 1 ? 1.08 : 1;
    (Object.keys(acc) as TarotAiElement[]).forEach((element) => {
      acc[element] += Math.round((card.elementWeights[element] ?? 0) * weightMultiplier);
    });
    return acc;
  }, { ...EMPTY_WEIGHTS });
}

function getElementEntries(weights: TarotElementWeights) {
  return (Object.entries(weights) as Array<[TarotAiElement, number]>).sort((a, b) => b[1] - a[1]);
}

function buildCardDetails(cards: TarotInterpretationCardInput[]) {
  return cards.map((card) => {
    const orientationLabel = card.orientation === 'upright' ? '正位' : '逆位';
    const keywordText = card.keywords.slice(0, 4).join('、');
    return `${card.positionLabel}：${card.cardName}${orientationLabel}，關鍵字：${keywordText}。${card.baseMeaning}`;
  });
}

function buildAnalysisMatrix(cards: TarotInterpretationCardInput[], weights: TarotElementWeights) {
  const elementText = getElementEntries(weights).map(([element, weight]) => `${ELEMENT_LABELS[element]} ${weight}`).join(' / ');
  return [
    `牌數：${cards.length} 張`,
    `正逆位：${cards.map((card) => `${card.positionLabel}${card.orientation === 'upright' ? '正位' : '逆位'}`).join('、')}`,
    `五元素權重：${elementText}`,
    `象徵交叉：${cards.map((card) => `${card.positionLabel}-${card.symbolism}`).join('；')}`,
  ];
}

export function generateTarotInterpretation(input: TarotInterpretationInput): TarotInterpretationOutput {
  const categoryLabel = TAROT_CATEGORY_LABELS[input.category];
  const question = input.question.trim();
  const drawnCards = getDrawnCards(input);
  const spreadType = input.spreadType ?? (drawnCards.length >= 3 ? 'three_card' : 'single');
  const combinedWeights = combineWeights(drawnCards);
  const elementEntries = getElementEntries(combinedWeights);
  const [primaryElement, primaryWeight] = elementEntries[0];
  const [secondaryElement, secondaryWeight] = elementEntries[1] ?? elementEntries[0];
  const [thirdElement] = elementEntries[2] ?? elementEntries[1] ?? elementEntries[0];
  const primaryLabel = ELEMENT_LABELS[primaryElement];
  const secondaryLabel = ELEMENT_LABELS[secondaryElement];
  const thirdLabel = ELEMENT_LABELS[thirdElement];
  const elementText = elementEntries.map(([element, weight]) => `${ELEMENT_LABELS[element]}${weight}`).join('、');
  const gap = Math.max(0, primaryWeight - secondaryWeight);
  const cardDetails = buildCardDetails(drawnCards);
  const analysisMatrix = buildAnalysisMatrix(drawnCards, combinedWeights);
  const firstCard = drawnCards[0];
  const spreadLabel = TAROT_SPREAD_LABELS[spreadType];

  if (!question) throw new Error('缺少塔羅問題，無法產生解讀。');

  const spreadSummary = spreadType === 'three_card'
    ? `本次三張牌陣已完成：${cardDetails.map((item) => item.split('。')[0]).join('；')}。AI 依牌位、正逆位、使用者問題與五元素權重交叉判定，不以單張牌取代整體結論。`
    : `本次一張牌核心判定已完成：${firstCard.cardName}${firstCard.orientation === 'upright' ? '正位' : '逆位'}鎖定本題主訊號。`;

  const elementDecision = `AI 判定：目前最缺${primaryLabel}元素。請優先補強${primaryLabel}元素。完成後再補${secondaryLabel}元素，最後補${thirdLabel}元素。五元素總權重：${elementText}。第一與第二差距 ${gap} 分。`;
  const integrationSummary = `${spreadLabel}已產生 Integration Layer 訊號；塔羅提供人格權重、事件權重與象徵權重，不直接覆蓋會員核心五元素。${AI_CORE_JUDGEMENT_PRINCIPLE}`;

  return {
    summary: forceAssertiveText(`${firstCard.cardName}${firstCard.orientation === 'upright' ? '正位' : '逆位'}帶出的核心是「${firstCard.keywords.slice(0, 5).join('、')}」。${firstCard.baseMeaning} ${spreadSummary} ${elementDecision}`),
    questionConnection: forceAssertiveText(`以「${categoryLabel}」來看，你問的是「${question}」。後端判定本題核心落在${CATEGORY_LENSES[input.category]}；本次塔羅牌陣為${spreadLabel}。結論已鎖定：請優先補強${primaryLabel}元素，完成後再補${secondaryLabel}元素，最後補${thirdLabel}元素，再交由 Integration Layer 與姓名學、八字、紫微、西洋星座、血型等資料共同整合。`),
    reflectionQuestion: forceAssertiveText(`本次反思只問一件事：我今天要如何用${primaryLabel}元素完成第一個明確行動？${firstCard.reflectionPrompt}`),
    actionSuggestion: forceAssertiveText(ELEMENT_ACTIONS[primaryElement]),
    disclaimer: TAROT_FIXED_DISCLAIMER,
    spreadSummary: forceAssertiveText(spreadSummary),
    elementDecision: forceAssertiveText(elementDecision),
    integrationSummary: forceAssertiveText(integrationSummary),
    cardDetails: cardDetails.map(forceAssertiveText),
    analysisMatrix,
  };
}