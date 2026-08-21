'use client';

import { useEffect, useRef, useState } from 'react';
import TarotQuestionCategoryGrid from '@/features/tarot/components/TarotQuestionCategoryGrid';
import TarotQuestionConfirmation from '@/features/tarot/components/TarotQuestionConfirmation';
import TarotQuestionInputStep from '@/features/tarot/components/TarotQuestionInputStep';
import { tarotQuestionCategories } from '@/features/tarot/data/questionCategories';
import type { TarotReadingContext, TarotQuestionState } from '@/features/tarot/types';
import { changeTarotCategory, confirmTarotQuestion, initialTarotQuestionState } from '@/features/tarot/utils/questionFlow';

type TarotQuestionFlowProps = {
  initialState?: TarotQuestionState;
  onReady: (context: TarotReadingContext) => void;
};

function buildReadyKey(state: TarotQuestionState) {
  if (state.step !== 'ready_to_draw' || !state.categoryId || !state.finalQuestion) return '';
  return `${state.categoryId}:${state.finalQuestion}`;
}

export default function TarotQuestionFlow({ initialState, onReady }: TarotQuestionFlowProps) {
  const [state, setState] = useState<TarotQuestionState>(initialState ?? initialTarotQuestionState);
  const readyKeyRef = useRef('');
  const selectedCategory = tarotQuestionCategories.find((category) => category.id === state.categoryId);
  const activeQuestion = state.customQuestion.trim() || state.selectedSuggestedQuestion || '';

  useEffect(() => {
    const readyKey = buildReadyKey(state);
    if (!readyKey || readyKeyRef.current === readyKey || !state.categoryId || !state.finalQuestion) return;
    readyKeyRef.current = readyKey;
    onReady({ categoryId: state.categoryId, question: state.finalQuestion, scope: 'self' });
  }, [onReady, state]);

  if (state.step === 'category') {
    return (
      <TarotQuestionCategoryGrid
        categories={tarotQuestionCategories}
        selectedCategoryId={state.categoryId}
        onSelect={(categoryId) => setState((previous) => changeTarotCategory(previous, categoryId))}
      />
    );
  }

  if (state.step === 'question') {
    if (!selectedCategory) {
      return (
        <TarotQuestionCategoryGrid
          categories={tarotQuestionCategories}
          selectedCategoryId={state.categoryId}
          onSelect={(categoryId) => setState((previous) => changeTarotCategory(previous, categoryId))}
        />
      );
    }

    return (
      <TarotQuestionInputStep
        category={selectedCategory}
        state={state}
        onChange={setState}
      />
    );
  }

  if (state.step === 'confirm') {
    return (
      <TarotQuestionConfirmation
        categoryId={state.categoryId}
        question={activeQuestion}
        error={state.error}
        onBack={() => setState((previous) => ({ ...previous, step: 'question', error: undefined }))}
        onConfirm={() => setState((previous) => confirmTarotQuestion(previous))}
      />
    );
  }

  return null;
}