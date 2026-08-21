'use client';

type TarotSuggestedQuestionListProps = {
  questions: string[];
  selectedQuestion?: string;
  onSelect: (question: string) => void;
  onCustom: () => void;
};

export default function TarotSuggestedQuestionList({ questions, selectedQuestion, onSelect, onCustom }: TarotSuggestedQuestionListProps) {
  if (!questions.length) return null;

  return (
    <div className="mt-5">
      <h3 className="text-sm font-black text-[color:var(--text-main)]">你想釐清哪一個問題？</h3>
      <div className="mt-3 grid gap-3">
        {questions.map((question) => {
          const selected = selectedQuestion === question;
          return (
            <button
              key={question}
              type="button"
              onClick={() => onSelect(question)}
              className={`flex min-h-[64px] items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold leading-6 transition active:scale-[0.99] ${selected ? 'border-amber-200/60 bg-amber-300/16 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.14)]' : 'border-white/10 bg-white/[0.04] text-[color:var(--text-sub)] hover:border-white/20'}`}
              aria-pressed={selected}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${selected ? 'border-amber-100 bg-amber-200 text-slate-950' : 'border-white/15 bg-black/20 text-[color:var(--text-muted)]'}`} aria-hidden="true">
                {selected ? '✓' : ''}
              </span>
              <span>{question}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onCustom}
        className="mt-4 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-[color:var(--text-sub)] transition hover:border-sky-200/35 hover:text-sky-100"
      >
        自己輸入問題
      </button>
    </div>
  );
}
