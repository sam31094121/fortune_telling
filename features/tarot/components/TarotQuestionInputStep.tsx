'use client';

import TarotCustomQuestionInput from '@/features/tarot/components/TarotCustomQuestionInput';
import TarotSuggestedQuestionList from '@/features/tarot/components/TarotSuggestedQuestionList';
import type { TarotQuestionCategory, TarotQuestionState } from '@/features/tarot/types';
import { validateTarotQuestion } from '@/features/tarot/utils/questionFlow';

type TarotQuestionInputStepProps = {
  category: TarotQuestionCategory;
  state: TarotQuestionState;
  onChange: (state: TarotQuestionState) => void;
};

export default function TarotQuestionInputStep({ category, state, onChange }: TarotQuestionInputStepProps) {
  const isCustom = category.id === 'custom' || state.selectedSuggestedQuestion === undefined;
  const questionForNext = state.customQuestion.trim() || state.selectedSuggestedQuestion || '';

  function goConfirm() {
    const validation = validateTarotQuestion(questionForNext);
    if (!validation.valid) {
      onChange({ ...state, error: validation.message });
      return;
    }
    onChange({ ...state, step: 'confirm', error: undefined });
  }

  return (
    <section className="fortune-card border-sky-300/25 bg-sky-300/[0.055] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">STEP 2</p>
          <h2 className="mt-3 font-serif text-3xl font-black text-sky-50">{category.title}</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{category.description}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...state, step: 'category', error: undefined })}
          className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[color:var(--text-sub)] transition hover:border-white/20"
        >
          返回分類
        </button>
      </div>

      {category.suggestedQuestions.length > 0 && (
        <TarotSuggestedQuestionList
          questions={category.suggestedQuestions}
          selectedQuestion={state.selectedSuggestedQuestion}
          onSelect={(question) => onChange({ ...state, selectedSuggestedQuestion: question, customQuestion: '', error: undefined })}
          onCustom={() => onChange({ ...state, selectedSuggestedQuestion: undefined, error: undefined })}
        />
      )}

      {isCustom && (
        <TarotCustomQuestionInput
          value={state.customQuestion}
          error={state.error}
          onChange={(value) => onChange({ ...state, customQuestion: value, selectedSuggestedQuestion: undefined, error: undefined })}
        />
      )}

      {!isCustom && state.error && <p className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-950/25 px-4 py-3 text-sm font-semibold text-rose-100">{state.error}</p>}

      <button
        type="button"
        onClick={goConfirm}
        className="mt-6 w-full rounded-full border border-sky-200/50 bg-sky-300 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(56,189,248,0.2)] transition active:scale-[0.99]"
      >
        前往確認問題
      </button>
    </section>
  );
}
