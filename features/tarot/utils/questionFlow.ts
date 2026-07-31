import type { TarotQuestionCategoryId, TarotQuestionState } from '@/features/tarot/types';

export const initialTarotQuestionState: TarotQuestionState = {
  step: 'category',
  customQuestion: '',
};

export function validateTarotQuestion(value: string): { valid: boolean; message?: string } {
  const normalized = value.trim();

  if (!normalized) {
    return { valid: false, message: '請輸入你想釐清的問題。' };
  }

  if (normalized.length < 5) {
    return { valid: false, message: '請再多描述一點，至少輸入 5 個字。' };
  }

  if (normalized.length > 200) {
    return { valid: false, message: '問題最多為 200 個字。' };
  }

  const meaningfulContent = normalized.replace(/[\s\p{P}\p{S}]/gu, '');

  if (!meaningfulContent) {
    return { valid: false, message: '問題需要包含實際文字內容。' };
  }

  return { valid: true };
}

export function changeTarotCategory(state: TarotQuestionState, categoryId: TarotQuestionCategoryId): TarotQuestionState {
  return {
    ...state,
    step: 'question',
    categoryId,
    selectedSuggestedQuestion: undefined,
    customQuestion: '',
    finalQuestion: undefined,
    error: undefined,
  };
}

export function confirmTarotQuestion(state: TarotQuestionState): TarotQuestionState {
  const question = state.customQuestion.trim() || state.selectedSuggestedQuestion?.trim() || '';
  const validation = validateTarotQuestion(question);

  if (!validation.valid) {
    return {
      ...state,
      error: validation.message,
    };
  }

  return {
    ...state,
    step: 'ready_to_draw',
    finalQuestion: question,
    error: undefined,
  };
}
