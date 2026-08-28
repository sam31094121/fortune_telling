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
import { castHexagram, formatHexagramLine } from '@/lib/iching-engine';
import { buildGhostDecoding } from '@/lib/iching-psychology';

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
  ['可能', '易經卜卦判定'],
  ['也許', '易經卜卦判定'],
  ['或許', '易經卜卦判定'],
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

// ── 逐張直答引擎：過去／現在／未來 ─────────────────────────────────────────
// 後端精準運算三層資料，前端只負責看圖說故事：
//   1. 問題語意解析：從使用者原句抽出問題類型（是否／該不該／何時／怎麼做／為什麼）
//      與「問題元素需求向量」（這句話真正在問哪種能量）。
//   2. 題卡交叉吻合度：問題需求向量 × 每張牌的元素權重，算出這張牌回應這個問題的
//      吻合度百分比——問題與卡片的精準核對就發生在這裡。
//   3. 機率為決定性計算（同一組牌＋同一句話永遠算出同一組數字）：正逆位為主軸、
//      題卡吻合度為副軸，讓每個數字都有可核對的依據。

type QuestionType = 'yesno' | 'choice' | 'timing' | 'howto' | 'why' | 'open';

const QUESTION_TYPE_RULES: Array<[RegExp, QuestionType]> = [
  [/是否|會不會|能不能|能否|可不可以|有沒有|嗎[?？]?$/, 'yesno'],
  [/該不該|要不要|還是|哪個|選/, 'choice'],
  [/什麼時候|何時|多久|幾時/, 'timing'],
  [/如何|怎麼|怎樣|方法/, 'howto'],
  [/為什麼|為何|原因/, 'why'],
];

// 問題關鍵字 → 元素需求：這句話問的是哪一種能量的事
const QUESTION_ELEMENT_HINTS: Array<[RegExp, Partial<TarotElementWeights>]> = [
  [/工作|任務|事業|職|升遷|案子|專案|交付|完成|進度|業績|老闆/, { EARTH: 3, FIRE: 2 }],
  [/錢|財|薪|投資|收入|債|買|賣|房/, { EARTH: 3, AIR: 1 }],
  [/感情|愛|喜歡|曖昧|告白|復合|分手|結婚|對象|另一半/, { WATER: 3, FIRE: 1 }],
  [/家人|家庭|爸|媽|父|母|小孩|孩子/, { WATER: 2, EARTH: 2 }],
  [/朋友|人際|同事|合作|夥伴|團隊/, { AIR: 2, WATER: 2 }],
  [/考試|學習|讀書|證照|面試|報告/, { AIR: 3, EARTH: 1 }],
  [/決定|選擇|抉擇|考慮|猶豫|方向/, { AIR: 3 }],
  [/健康|身體|睡|累|壓力|焦慮/, { EARTH: 2, SPACE: 2 }],
  [/放下|離開|結束|休息|安靜|整理/, { SPACE: 3 }],
  [/開始|行動|衝|挑戰|創業|突破/, { FIRE: 3 }],
];

type QuestionProfile = {
  type: QuestionType;
  demand: TarotElementWeights;
  topic: string; // 從原句抓到的主題詞，抓不到就退回類別視角
};

function analyzeQuestion(question: string, category: TarotInterpretationInput['category']): QuestionProfile {
  const type = QUESTION_TYPE_RULES.find(([re]) => re.test(question))?.[1] ?? 'open';
  const demand: TarotElementWeights = { ...EMPTY_WEIGHTS };
  let topic = '';
  for (const [re, hints] of QUESTION_ELEMENT_HINTS) {
    const match = question.match(re);
    if (!match) continue;
    if (!topic) topic = match[0];
    (Object.entries(hints) as Array<[TarotAiElement, number]>).forEach(([element, value]) => {
      demand[element] += value;
    });
  }
  // 句子沒有可辨識的主題詞時，用使用者選的類別視角補上需求
  const total = Object.values(demand).reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    demand.AIR += 2;
    demand.EARTH += 1;
    topic = CATEGORY_LENSES[category].split('、')[0];
  }
  return { type, demand, topic };
}

// 題卡吻合度：問題需求向量 × 牌的元素權重（餘弦相似度 → 0-100）
function cardQuestionFit(card: TarotInterpretationCardInput, demand: TarotElementWeights): number {
  const elements = Object.keys(EMPTY_WEIGHTS) as TarotAiElement[];
  let dot = 0;
  let cardNorm = 0;
  let demandNorm = 0;
  for (const element of elements) {
    const cardValue = card.elementWeights[element] ?? 0;
    const demandValue = demand[element] ?? 0;
    dot += cardValue * demandValue;
    cardNorm += cardValue * cardValue;
    demandNorm += demandValue * demandValue;
  }
  if (cardNorm === 0 || demandNorm === 0) return 50;
  const cosine = dot / (Math.sqrt(cardNorm) * Math.sqrt(demandNorm));
  return Math.round(Math.min(96, Math.max(12, cosine * 100)));
}

function cardFavorability(card: TarotInterpretationCardInput): number {
  const orientationBase = card.orientation === 'upright' ? 66 : 38;
  const weights = Object.values(card.elementWeights);
  const total = weights.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(...weights, 0);
  // 元素能量越集中（peak 佔比高），牌的訊號越明確；換算成 -8 ~ +12 的修正
  const focusRatio = total > 0 ? peak / total : 0.2;
  const focusAdjust = Math.round((focusRatio - 0.3) * 50);
  return Math.min(95, Math.max(5, orientationBase + Math.min(12, Math.max(-8, focusAdjust))));
}

function dominantElementLabel(card: TarotInterpretationCardInput): string {
  const entries = Object.entries(card.elementWeights) as Array<[TarotAiElement, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  return ELEMENT_LABELS[entries[0]?.[0] ?? 'AIR'];
}

function buildCardAnswers(question: string, category: TarotInterpretationInput['category'], cards: TarotInterpretationCardInput[]) {
  if (cards.length < 3) return { cardAnswers: undefined, successProbability: undefined, finalVerdict: undefined, questionFitMatrix: undefined };
  const profile = analyzeQuestion(question, category);
  const [past, present, future] = cards;

  // 每張牌的最終機率 ＝ 牌本身的順逆能量 70% ＋ 題卡吻合度 30%
  // 吻合度高＝這張牌就是在講你問的事，判定加權更重。
  const score = (card: TarotInterpretationCardInput) => {
    const fit = cardQuestionFit(card, profile.demand);
    const favorability = cardFavorability(card);
    return { fit, value: Math.min(95, Math.max(5, Math.round(favorability * 0.7 + (card.orientation === 'upright' ? fit : 100 - fit) * 0.3))) };
  };
  const pastResult = score(past);
  const presentResult = score(present);
  const futureResult = score(future);
  const pastScore = pastResult.value;
  const presentScore = presentResult.value;
  const futureScore = futureResult.value;
  // 最終達成機率：未來牌 55%、現在牌 30%、過去牌 15% 加權
  const successProbability = Math.round(futureScore * 0.55 + presentScore * 0.3 + pastScore * 0.15);

  const orientationWord = (card: TarotInterpretationCardInput) => (card.orientation === 'upright' ? '正位' : '逆位');
  const topicWord = profile.topic || '這件事';

  // 依問題類型收斂結論措辭：是否→會/不會；該不該→做/先停；何時→時機；怎麼做→方法；為什麼→原因
  const verdictWord = (() => {
    if (successProbability >= 60) {
      switch (profile.type) {
        case 'yesno': return '會';
        case 'choice': return '該做';
        case 'timing': return '時機已到';
        case 'howto': return '做得成';
        case 'why': return '原因已現';
        default: return '會成';
      }
    }
    switch (profile.type) {
      case 'yesno': return '不會';
      case 'choice': return '先停';
      case 'timing': return '時機未到';
      case 'howto': return '方法要改';
      case 'why': return '原因在你';
      default: return '不會成';
    }
  })();

  // 簡潔直答原則：每張牌只回答自己管的時間段，一到兩句講完，不重複問題原句、
  // 不塞運算術語（吻合度細節留在 analysisMatrix 後台）、三張之間零矛盾。
  const pastVerdict = pastScore >= 60
    ? `過去：你為「${topicWord}」的累積足夠。${past.keywords.slice(0, 2).join('、')}已經到位，今天不是僥倖。`
    : `過去：你為「${topicWord}」的累積不足。${past.keywords.slice(0, 2).join('、')}是缺口，造成今天的局面。`;

  const presentVerdict = presentScore >= 60
    ? `現在：成功機率 ${presentScore}%。${dominantElementLabel(present)}元素正旺，立刻推進。`
    : `現在：成功機率 ${presentScore}%。${dominantElementLabel(present)}元素失衡卡住你，先處理它。`;

  // 未來牌只講綜合結果，與最終判定同一個數字、同一個結論，保證零矛盾
  const futureVerdict = successProbability >= 60
    ? `未來：${verdictWord}。綜合達成機率 ${successProbability}%，照這個方向走。`
    : `未來：${verdictWord}。綜合達成機率 ${successProbability}%，先補最低分的那張牌。`;

  const cardAnswers = [
    {
      positionLabel: '過去',
      cardName: past.cardName,
      orientation: past.orientation,
      cardStory: `${past.cardName}${orientationWord(past)}的牌面精神：${past.baseMeaning}`,
      directAnswer: pastVerdict,
      probability: pastScore,
      probabilityLabel: '過去累積充足度',
    },
    {
      positionLabel: '現在',
      cardName: present.cardName,
      orientation: present.orientation,
      cardStory: `${present.cardName}${orientationWord(present)}的牌面精神：${present.baseMeaning}`,
      directAnswer: presentVerdict,
      probability: presentScore,
      probabilityLabel: '當下成功機率',
    },
    {
      positionLabel: '未來',
      cardName: future.cardName,
      orientation: future.orientation,
      cardStory: `${future.cardName}${orientationWord(future)}的牌面精神：${future.baseMeaning}`,
      directAnswer: futureVerdict,
      probability: futureScore,
      probabilityLabel: '最終達成機率',
    },
  ];

  // 易經起卦：以問題原句＋三張牌名決定性起卦，作為三張牌之外的第四道交叉印證
  const iching = castHexagram(question, cards.map((card) => card.cardName).join(','));
  const finalVerdict = `直答「${question}」：${verdictWord}。綜合達成機率 ${successProbability}%（過去 ${pastScore}・現在 ${presentScore}・未來 ${futureScore}）。易經同步起卦得「${iching.hexagramName}」印證此局。`;

  const questionFitMatrix = [
    `問題類型：${profile.type === 'yesno' ? '是否題' : profile.type === 'choice' ? '抉擇題' : profile.type === 'timing' ? '時機題' : profile.type === 'howto' ? '方法題' : profile.type === 'why' ? '原因題' : '開放題'}｜主題詞：${topicWord}`,
    `題卡吻合度：過去 ${pastResult.fit}%、現在 ${presentResult.fit}%、未來 ${futureResult.fit}%（問題需求向量 × 牌元素權重的餘弦核對）`,
    `${formatHexagramLine(iching)}｜${iching.judgment}`,
    iching.advice,
    // 鬼魅老師標準檔案輸出：靈異・磁場・因果（同一顆問題卦拆解，全站八卡標配）
    ...((): string[] => {
      const ghost = buildGhostDecoding(iching);
      return [ghost.spirit, ghost.field, ghost.karma];
    })(),
  ];

  return { cardAnswers, successProbability, finalVerdict, questionFitMatrix };
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
    ? `本次三張牌陣已完成：${cardDetails.map((item) => item.split('。')[0]).join('；')}。易經依牌位、正逆位、使用者問題與五元素權重交叉判定，不以單張牌取代整體結論。`
    : `本次一張牌核心判定已完成：${firstCard.cardName}${firstCard.orientation === 'upright' ? '正位' : '逆位'}鎖定本題主訊號。`;

  const elementDecision = `易經卜卦判定：目前最缺${primaryLabel}元素。請優先補強${primaryLabel}元素。完成後再補${secondaryLabel}元素，最後補${thirdLabel}元素。五元素總權重：${elementText}。第一與第二差距 ${gap} 分。`;
  const integrationSummary = `${spreadLabel}已產生 Integration Layer 訊號；塔羅提供人格權重、事件權重與象徵權重，不直接覆蓋會員核心五元素。${AI_CORE_JUDGEMENT_PRINCIPLE}`;
  const { cardAnswers, successProbability, finalVerdict, questionFitMatrix } = buildCardAnswers(question, input.category, drawnCards);
  if (questionFitMatrix) analysisMatrix.push(...questionFitMatrix);

  return {
    summary: finalVerdict ?? forceAssertiveText(`${firstCard.cardName}${firstCard.orientation === 'upright' ? '正位' : '逆位'}帶出的核心是「${firstCard.keywords.slice(0, 5).join('、')}」。${firstCard.baseMeaning} ${spreadSummary} ${elementDecision}`),
    questionConnection: forceAssertiveText(`以「${categoryLabel}」來看，你問的是「${question}」。後端判定本題核心落在${CATEGORY_LENSES[input.category]}；本次塔羅牌陣為${spreadLabel}。結論已鎖定：請優先補強${primaryLabel}元素，完成後再補${secondaryLabel}元素，最後補${thirdLabel}元素，再交由 Integration Layer 與姓名學、八字、紫微、西洋星座、血型等資料共同整合。`),
    reflectionQuestion: forceAssertiveText(`本次反思只問一件事：我今天要如何用${primaryLabel}元素完成第一個明確行動？${firstCard.reflectionPrompt}`),
    actionSuggestion: forceAssertiveText(ELEMENT_ACTIONS[primaryElement]),
    disclaimer: TAROT_FIXED_DISCLAIMER,
    spreadSummary: forceAssertiveText(spreadSummary),
    elementDecision: forceAssertiveText(elementDecision),
    integrationSummary: forceAssertiveText(integrationSummary),
    cardDetails: cardDetails.map(forceAssertiveText),
    analysisMatrix,
    // 逐張直答的文字本身已是斷定語氣，且內含使用者原句與正逆位牌義，
    // 不再套 forceAssertiveText，避免「可能性」被誤改成「易經卜卦判定性」這類破壞。
    cardAnswers,
    successProbability,
    finalVerdict,
  };
}