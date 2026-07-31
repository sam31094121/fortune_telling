'use client';

import TarotCardReveal from '@/features/tarot/components/TarotCardReveal';
import {
  TAROT_CATEGORY_LABELS,
  type TarotCard,
  type TarotInterpretationOutput,
  type TarotOrientation,
  type TarotQuestionCategoryId,
} from '@/features/tarot/types';

type TarotReadingResultProps = {
  category: TarotQuestionCategoryId;
  question: string;
  card: TarotCard;
  orientation: TarotOrientation;
  interpretation: TarotInterpretationOutput;
  error?: string;
  onRegenerate: () => void;
  onReset: () => void;
};

export default function TarotReadingResult({ category, question, card, orientation, interpretation, error, onRegenerate, onReset }: TarotReadingResultProps) {
  const keywords = orientation === 'upright' ? card.uprightKeywords : card.reversedKeywords;
  const baseMeaning = orientation === 'upright' ? card.uprightMeaning : card.reversedMeaning;

  return (
    <section className="space-y-5">
      <div className="fortune-card border-sky-300/25 bg-sky-300/[0.05] p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
          <TarotCardReveal card={card} orientation={orientation} />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">TAROT READING</p>
            <h1 className="mt-3 font-serif text-4xl font-black leading-tight text-sky-50 sm:text-5xl">{card.nameZh}</h1>
            <p className="mt-2 text-lg font-bold text-[color:var(--text-sub)]">{card.nameEn}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-amber-200/35 bg-amber-300/12 px-3 py-1 text-xs font-black text-amber-100">
                {orientation === 'upright' ? '正位' : '逆位'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-[color:var(--text-sub)]">
                {TAROT_CATEGORY_LABELS[category]}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-[color:var(--text-sub)]">
                {card.arcana === 'major' ? '大阿爾克那' : '小阿爾克那'}
              </span>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black text-sky-100">你的問題</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-7 text-[color:var(--text-main)]">{question}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {keywords.slice(0, 5).map((keyword) => (
                <span key={keyword} className="rounded-full border border-sky-200/20 bg-sky-300/10 px-3 py-1 text-xs font-black text-sky-100">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300/25 bg-rose-950/25 p-4 text-sm font-semibold leading-7 text-rose-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="fortune-card p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-200">牌面訊息</p>
          <h2 className="mt-3 font-serif text-2xl font-black text-amber-50">基本象徵</h2>
          <p className="mt-4 text-sm font-semibold leading-8 text-[color:var(--text-sub)]">{baseMeaning}</p>
          <p className="mt-4 rounded-2xl border border-amber-200/15 bg-amber-300/8 p-4 text-sm font-semibold leading-8 text-[color:var(--text-main)]">{interpretation.summary}</p>
        </article>
        <article className="fortune-card p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">對應你的問題</p>
          <h2 className="mt-3 font-serif text-2xl font-black text-sky-50">本次解讀</h2>
          <p className="mt-4 text-sm font-semibold leading-8 text-[color:var(--text-sub)]">{interpretation.questionConnection}</p>
        </article>
        <article className="fortune-card p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-200">可以先思考</p>
          <h2 className="mt-3 font-serif text-2xl font-black text-violet-50">反思問題</h2>
          <p className="mt-4 text-sm font-semibold leading-8 text-[color:var(--text-main)]">{interpretation.reflectionQuestion}</p>
        </article>
        <article className="fortune-card p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">下一步建議</p>
          <h2 className="mt-3 font-serif text-2xl font-black text-emerald-50">低風險行動</h2>
          <p className="mt-4 text-sm font-semibold leading-8 text-[color:var(--text-main)]">{interpretation.actionSuggestion}</p>
        </article>
      </div>

      <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">
        {interpretation.disclaimer}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onRegenerate} className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-[color:var(--text-sub)] transition hover:border-white/20">
          重新產生解讀
        </button>
        <button type="button" onClick={onReset} className="flex-1 rounded-full border border-sky-200/50 bg-sky-300 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(56,189,248,0.2)] transition active:scale-[0.99]">
          重新抽牌
        </button>
      </div>
    </section>
  );
}
