'use client';

import { tarotQuestionCategories } from '@/features/tarot/data/questionCategories';
import type { TarotQuestionCategoryId } from '@/features/tarot/types';

type TarotQuestionFormProps = {
  category: TarotQuestionCategoryId;
  question: string;
  error?: string;
  onCategoryChange: (category: TarotQuestionCategoryId) => void;
  onQuestionChange: (question: string) => void;
  onSubmit: () => void;
};

export default function TarotQuestionForm({ category, question, error, onCategoryChange, onQuestionChange, onSubmit }: TarotQuestionFormProps) {
  return (
    <section className="fortune-card border-sky-300/25 bg-sky-300/[0.055] p-5 sm:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">STEP 1</p>
      <h2 className="mt-3 font-serif text-3xl font-black text-sky-50">選擇主題與問題</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {tarotQuestionCategories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onCategoryChange(item.id)}
            className={`min-h-[88px] rounded-2xl border p-4 text-left transition active:scale-[0.99] ${category === item.id ? 'border-sky-200/55 bg-sky-300/18 text-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.18)]' : 'border-white/10 bg-white/[0.04] text-[color:var(--text-sub)] hover:border-white/20'}`}
            aria-pressed={category === item.id}
          >
            <span className="block text-sm font-black">{item.title}</span>
            <span className="mt-2 block text-xs font-semibold leading-5 opacity-85">{item.description}</span>
          </button>
        ))}
      </div>

      <label className="mt-6 block" htmlFor="tarot-question">
        <span className="text-sm font-black text-[color:var(--text-main)]">你現在最想釐清的是什麼？</span>
        <textarea
          id="tarot-question"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value.slice(0, 200))}
          placeholder="請描述一件目前真正困擾你，或需要決定方向的事情。"
          maxLength={200}
          rows={5}
          className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base leading-7 text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-sky-200/55 focus:bg-black/35"
        />
      </label>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-[color:var(--text-muted)]">
        <span>最少 5 個字，建議描述具體情境。</span>
        <span>{question.trim().length}/200</span>
      </div>
      {error && <p className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-950/25 px-4 py-3 text-sm font-semibold text-rose-100">{error}</p>}
      <button
        type="button"
        onClick={onSubmit}
        className="mt-6 w-full rounded-full border border-sky-200/50 bg-sky-300 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(56,189,248,0.2)] transition active:scale-[0.99]"
      >
        確認問題
      </button>
    </section>
  );
}
