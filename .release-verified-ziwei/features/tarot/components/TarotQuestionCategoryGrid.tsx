'use client';

import TarotQuestionCategoryCard from '@/features/tarot/components/TarotQuestionCategoryCard';
import type { TarotQuestionCategory, TarotQuestionCategoryId } from '@/features/tarot/types';

type TarotQuestionCategoryGridProps = {
  categories: TarotQuestionCategory[];
  selectedCategoryId?: TarotQuestionCategoryId;
  onSelect: (categoryId: TarotQuestionCategoryId) => void;
};

export default function TarotQuestionCategoryGrid({ categories, selectedCategoryId, onSelect }: TarotQuestionCategoryGridProps) {
  return (
    <section className="fortune-card border-sky-300/25 bg-sky-300/[0.055] p-5 sm:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">STEP 1</p>
      <h2 className="mt-3 font-serif text-3xl font-black text-sky-50">選擇問題方向</h2>
      <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
        先選一個最接近的方向。塔羅會以這個方向和你確認的問題作為本次解讀核心。
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="list" aria-label="塔羅問題方向">
        {categories.map((category) => (
          <div key={category.id} role="listitem">
            <TarotQuestionCategoryCard
              category={category}
              selected={selectedCategoryId === category.id}
              onSelect={() => onSelect(category.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
