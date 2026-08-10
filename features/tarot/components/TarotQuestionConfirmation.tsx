'use client';

import { tarotQuestionCategories } from '@/features/tarot/data/questionCategories';
import { TAROT_CATEGORY_LABELS, type TarotQuestionCategoryId } from '@/features/tarot/types';

type TarotQuestionConfirmationProps = {
  categoryId?: TarotQuestionCategoryId;
  question: string;
  error?: string;
  onBack: () => void;
  onConfirm: () => void;
};

export default function TarotQuestionConfirmation({ categoryId, question, error, onBack, onConfirm }: TarotQuestionConfirmationProps) {
  const category = tarotQuestionCategories.find((item) => item.id === categoryId);
  return (
    <section className="fortune-card border-amber-300/25 bg-amber-300/[0.055] p-5 sm:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">STEP 3</p>
      <h2 className="mt-3 font-serif text-3xl font-black text-amber-50">確認本次問題</h2>
      <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
        塔羅將以這個問題作為本次牌面解讀的核心。
      </p>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/22 p-4">
        <p className="text-xs font-black text-amber-100">問題分類</p>
        <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">{categoryId ? TAROT_CATEGORY_LABELS[categoryId] : '未選擇'}</p>
        {category?.description && <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{category.description}</p>}
        <p className="mt-4 text-xs font-black text-amber-100">本次問題</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-base font-semibold leading-8 text-[color:var(--text-main)]">{question || '尚未選擇或輸入問題'}</p>
      </div>
      {error && <p className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-950/25 px-4 py-3 text-sm font-semibold text-rose-100">{error}</p>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-[color:var(--text-sub)] transition hover:border-white/20"
        >
          返回修改
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-full border border-amber-200/50 bg-amber-300 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(251,191,36,0.2)] transition active:scale-[0.99]"
        >
          確認問題，開始抽牌
        </button>
      </div>
    </section>
  );
}
