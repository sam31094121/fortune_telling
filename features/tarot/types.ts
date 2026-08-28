export const TAROT_VISIBLE_DECK_COUNT = 12;

export type TarotQuestionCategoryId =
  | 'love'
  | 'career'
  | 'finance'
  | 'business'
  | 'family'
  | 'social'
  | 'study'
  | 'decision'
  | 'project'
  | 'obstacle'
  | 'growth'
  | 'near_future'
  | 'custom';

export type TarotQuestionCategory = {
  id: TarotQuestionCategoryId;
  title: string;
  description: string;
  suggestedQuestions: string[];
};

export type TarotQuestionState = {
  step: 'category' | 'question' | 'confirm' | 'ready_to_draw';
  categoryId?: TarotQuestionCategoryId;
  selectedSuggestedQuestion?: string;
  customQuestion: string;
  finalQuestion?: string;
  error?: string;
};

export type TarotReadingScope = 'self' | 'other';
export type TarotSpreadType = 'single' | 'three_card';

export type TarotReadingContext = {
  categoryId: TarotQuestionCategoryId;
  question: string;
  scope: TarotReadingScope;
};

export type TarotDirection = 'proceed' | 'prepare' | 'pause' | 'reconsider';

export type TarotGuidanceResult = {
  direction: TarotDirection;
  headline: string;
  reason: string;
  nextAction: string;
  caution?: string;
};

export type TarotOrientation = 'upright' | 'reversed';
export type TarotFlowStep = 'question' | 'ready_to_draw' | 'shuffling' | 'selecting_card' | 'result';
export type TarotArcana = 'major' | 'minor';
export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles';
export type TarotAiElement = 'AIR' | 'SPACE' | 'WATER' | 'FIRE' | 'EARTH';
export type TarotElementWeights = Record<TarotAiElement, number>;

export type TarotVisualKnowledge = {
  cardId: string;
  coreMeaning: string;
  uprightLogic: string;
  reversedLogic: string;
  dominantElement: TarotAiElement;
  symbolicElements: string[];
  coreAtmosphere: string;
  storyAxis: string;
  immutableCore: string[];
  creativeRules: string[];
  originalZones: string[];
  composition: {
    figure: string;
    scene: string;
    lighting: string;
    focalSymbol: string;
  };
  validation: {
    meaningConsistent: true;
    storyComplete: true;
    themeLocked: true;
    styleUnified: true;
    noDeckReproduction: true;
    readableWithoutName: true;
    checkpoints: string[];
  };
};

export type TarotCard = {
  id: string;
  number?: number;
  nameZh: string;
  nameEn: string;
  arcana: TarotArcana;
  suit?: TarotSuit;
  imageUrl: string;
  uprightKeywords: string[];
  reversedKeywords: string[];
  uprightMeaning: string;
  reversedMeaning: string;
  reflectionPrompt: string;
  symbolism: string;
  elementWeights: TarotElementWeights;
  visualKnowledge: TarotVisualKnowledge;
};

export type TarotDeckCard = {
  deckKey: string;
  cardId: string;
  orientation: TarotOrientation;
  order: number;
};

export type TarotCardResource = {
  id: string;
  number?: number;
  nameZh: string;
  nameEn: string;
  arcana: TarotArcana;
  suit?: TarotSuit;
  imageUrl: string;
  imageAlt: string;
  uprightKeywords: string[];
  reversedKeywords: string[];
  uprightMeaning: string;
  reversedMeaning: string;
  reflectionPrompt: string;
  symbolism: string;
  elementWeights: TarotElementWeights;
  visualKnowledge: TarotVisualKnowledge;
};

export type TarotCardBackResource = {
  styleId: string;
  imageUrl: string;
  imageAlt: string;
};

export type TarotShuffleSequenceItem = {
  deckKey: string;
  cardId: string;
  shuffleOrder: number;
  orientation: TarotOrientation;
};

export type TarotSpreadSequenceItem = TarotShuffleSequenceItem & {
  spreadOrder: number;
  displaySlot: number;
  back: TarotCardBackResource;
};

export type TarotDrawResultItem = TarotSpreadSequenceItem & {
  drawOrder: number;
  card: TarotCardResource;
};

export type TarotRevealSequenceItem = TarotDrawResultItem & {
  revealOrder: number;
  orientationLabel: '正位' | '逆位';
};

export type TarotDrawRhythm = {
  shuffleMs: number;
  shuffleSettleMs: number;
  spreadMs: number;
  spreadSettleMs: number;
  selectionFeedbackMs: number;
  revealStaggerMs: number;
  revealFlipMs: number;
  resultSettleMs: number;
};

export type TarotDrawOutputContract = {
  version: 'tarot_draw_output_v1';
  stage: 'deck' | 'shuffle' | 'draw';
  aiInterpretation: false;
  integrationLayerWrite: false;
  growthCenterWrite: false;
};

export type TarotReadingCard = {
  position: number;
  positionKey: 'core' | 'situation' | 'challenge' | 'action';
  positionLabel: string;
  cardId: string;
  orientation: TarotOrientation;
  deckOrder: number;
};

export type TarotReading = {
  id: string;
  category: TarotQuestionCategoryId;
  question: string;
  cardId: string;
  orientation: TarotOrientation;
  scope: TarotReadingScope;
  spreadType?: TarotSpreadType;
  cards?: TarotReadingCard[];
  integrationSignalId?: string;
  createdAt: string;
};

export type TarotElementPriority = Array<{
  element: TarotAiElement;
  label: string;
  weight: number;
}>;

export type TarotIntegrationSignal = {
  id: string;
  source: 'tarot';
  readingId: string;
  scope: TarotReadingScope;
  cardId: string;
  categoryId: TarotQuestionCategoryId;
  question: string;
  orientation: TarotOrientation;
  spreadType?: TarotSpreadType;
  cards?: TarotReadingCard[];
  elementWeights: TarotElementWeights;
  personalityWeights?: TarotElementWeights;
  eventWeights?: TarotElementWeights;
  elementPriority?: TarotElementPriority;
  symbolism: string;
  canUpdateGrowthCenter: boolean;
  singleUseOnly: boolean;
  createdAt: string;
};

export type TarotInterpretationCardInput = {
  positionLabel: string;
  cardName: string;
  orientation: TarotOrientation;
  keywords: string[];
  baseMeaning: string;
  reflectionPrompt: string;
  symbolism: string;
  elementWeights: TarotElementWeights;
};

export type TarotInterpretationInput = {
  category: TarotQuestionCategoryId;
  question: string;
  cardName: string;
  orientation: TarotOrientation;
  keywords: string[];
  baseMeaning: string;
  reflectionPrompt: string;
  symbolism: string;
  elementWeights: TarotElementWeights;
  spreadType?: TarotSpreadType;
  drawnCards?: TarotInterpretationCardInput[];
};

// 逐張直答：每張牌針對使用者輸入的問題給出明確判定與機率數據，不模稜兩可。
export type TarotCardAnswer = {
  positionLabel: string; // 過去／現在／未來
  cardName: string;
  orientation: 'upright' | 'reversed';
  cardStory: string; // 看圖說故事：牌面意境
  directAnswer: string; // 直接針對使用者的問題作答
  probability: number; // 0-100 的明確機率數據
  probabilityLabel: string; // 這個數字代表什麼（如「準備充足度」「當下成功機率」「最終達成機率」）
};

export type TarotInterpretationOutput = {
  summary: string;
  questionConnection: string;
  reflectionQuestion: string;
  actionSuggestion: string;
  disclaimer: string;
  spreadSummary?: string;
  elementDecision?: string;
  integrationSummary?: string;
  cardDetails?: string[];
  analysisMatrix?: string[];
  cardAnswers?: TarotCardAnswer[]; // 三張牌逐張直答（過去／現在／未來）
  successProbability?: number; // 綜合三張牌後的最終達成機率
  finalVerdict?: string; // 一句話直接回答使用者的問題
};

export type TarotReadinessItem = {
  id: string;
  title: string;
  complete: boolean;
  detail: string;
};

export type TarotSystemReadiness = {
  title: '塔羅牌';
  productionReady: boolean;
  deckStyleId: string;
  checklist: TarotReadinessItem[];
  blockedReasons: string[];
};

export type TarotEngineCrossCheck = {
  spreadType: TarotSpreadType;
  drawCount: number;
  selectedDeckOrders: number[];
  orientationMix: Record<TarotOrientation, number>;
  positionMap: Array<{
    positionLabel: string;
    cardId: string;
    orientation: TarotOrientation;
    deckOrder: number;
  }>;
  elementPriority: TarotElementPriority;
  writePolicy: 'growth_center_update' | 'single_use_only';
};

export type TarotState = {
  step: TarotFlowStep;
  category?: TarotQuestionCategoryId;
  question: string;
  reading?: TarotReading;
  isGenerating: boolean;
  error?: string;
};

export const TAROT_HISTORY_STORAGE_KEY = 'tarot_reading_history_v1';
export const TAROT_INTEGRATION_STORAGE_KEY = 'tarot_integration_events_v1';

export const EMPTY_TAROT_ELEMENT_WEIGHTS: TarotElementWeights = {
  AIR: 0,
  SPACE: 0,
  WATER: 0,
  FIRE: 0,
  EARTH: 0,
};

export const TAROT_CATEGORY_LABELS: Record<TarotQuestionCategoryId, string> = {
  love: '感情與關係',
  career: '工作與職涯',
  finance: '財務與金錢',
  business: '事業與創業',
  family: '家庭與親情',
  social: '人際與合作',
  study: '學習與進修',
  decision: '抉擇與方向',
  project: '計畫與作品',
  obstacle: '阻礙突破',
  growth: '自我成長',
  near_future: '近期走向',
  custom: '自訂問題',
};

export const TAROT_SPREAD_LABELS: Record<TarotSpreadType, string> = {
  single: '一張牌核心判定',
  three_card: '三張牌交叉判定',
};

export const TAROT_FIXED_DISCLAIMER = '塔羅牌不預測命運，也不保證人生結果。易經只根據你親手抽出的牌、正逆位、牌陣與問題，明確判定當下最需要補強的方向；成果由使用者自己創造。';