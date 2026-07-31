'use client';

import type { TarotQuestionCategory } from '@/features/tarot/types';

type TarotQuestionCategoryCardProps = {
  category: TarotQuestionCategory;
  selected: boolean;
  onSelect: () => void;
};

export default function TarotQuestionCategoryCard({ category, selected, onSelect }: TarotQuestionCategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-[112px] w-full items-start gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${selected ? 'border-sky-200/60 bg-sky-300/18 text-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.18)]' : 'border-white/10 bg-white/[0.04] text-[color:var(--text-sub)] hover:border-white/20 hover:bg-white/[0.06]'}`}
      aria-pressed={selected}
    >
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black ${selected ? 'border-sky-100 bg-sky-200 text-slate-950' : 'border-white/15 bg-black/20 text-[color:var(--text-muted)]'}`} aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-[color:var(--text-main)]">{category.title}</span>
        <span className="mt-2 line-clamp-2 block text-xs font-semibold leading-5 text-[color:var(--text-sub)]">{category.description}</span>
      </span>
    </button>
  );
}
