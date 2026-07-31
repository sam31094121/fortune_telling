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

export type TarotReadingContext = {
  categoryId: TarotQuestionCategoryId;
  question: string;
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
export type TarotFlowStep = 'question' | 'ready_to_draw' | 'shuffling' | 'result';
export type TarotArcana = 'major' | 'minor';
export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles';

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
};

export type TarotReading = {
  id: string;
  category: TarotQuestionCategoryId;
  question: string;
  cardId: string;
  orientation: TarotOrientation;
  createdAt: string;
};

export type TarotInterpretationInput = {
  category: TarotQuestionCategoryId;
  question: string;
  cardName: string;
  orientation: TarotOrientation;
  keywords: string[];
  baseMeaning: string;
  reflectionPrompt: string;
};

export type TarotInterpretationOutput = {
  summary: string;
  questionConnection: string;
  reflectionQuestion: string;
  actionSuggestion: string;
  disclaimer: string;
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

export const TAROT_CATEGORY_LABELS: Record<TarotQuestionCategoryId, string> = {
  love: '感情與關係',
  career: '工作與事業',
  finance: '金錢與財務',
  business: '創業與合作',
  family: '家庭與親情',
  social: '朋友與人際',
  study: '學習與考試',
  decision: '選擇與決定',
  project: '計畫能否推進',
  obstacle: '當下阻礙',
  growth: '個人成長',
  near_future: '未來一段時間的方向',
  custom: '我有自己的問題',
};

export const TAROT_FIXED_DISCLAIMER = '塔羅內容用於自我探索與思考整理，不代表確定的未來或專業意見。';
