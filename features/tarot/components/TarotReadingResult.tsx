'use client';

import TarotCardReveal from '@/features/tarot/components/TarotCardReveal';
import type { TarotCard, TarotDeckCard } from '@/features/tarot/types';

type TarotReadingResultProps = {
  cards: TarotCard[];
  selectedDeckCards: TarotDeckCard[];
  deckSize?: number;
  sessionId?: string;
  error?: string;
  onReset: () => void;
};

const ORDER_LABELS = ['第一張', '第二張', '第三張'];

export default function TarotReadingResult({ cards, selectedDeckCards, deckSize = 78, sessionId, error, onReset }: TarotReadingResultProps) {
  return (
    <section className="space-y-5">
      <div className="fortune-card tarot-draw-result border-cyan-300/25 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">REVEALED CARDS</p>
            <h1 className="mt-3 font-serif text-4xl font-black leading-tight text-cyan-50 sm:text-5xl">三張牌面已翻開</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
              本階段只輸出洗牌體驗、選牌順序與牌面展示。不進行 AI 解讀、不產生補強建議、不更新個人成長中心。
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 rounded-full border border-cyan-200/30 bg-cyan-300/12 px-5 py-3 text-xs font-black text-cyan-100 transition hover:border-cyan-100/60 hover:bg-cyan-300/18"
          >
            重新洗牌
          </button>
        </div>

        {error && (
          <p className="mt-5 rounded-2xl border border-rose-300/30 bg-rose-950/25 px-4 py-3 text-sm font-bold leading-7 text-rose-100">
            {error}
          </p>
        )}

        <div className="tarot-reveal-gallery mt-7">
          {cards.map((card, index) => {
            const deckCard = selectedDeckCards[index];
            return (
              <article key={`${card.id}-${deckCard?.deckKey ?? index}`} className="tarot-reveal-panel">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full border border-amber-200/35 bg-amber-300/12 px-3 py-1 text-xs font-black text-amber-100">
                    {ORDER_LABELS[index] ?? `第 ${index + 1} 張`}
                  </span>
                  <span className="text-xs font-black text-[color:var(--text-sub)]">
                    牌序 {deckCard ? deckCard.order + 1 : index + 1}
                  </span>
                </div>
                <TarotCardReveal card={card} orientation={deckCard?.orientation ?? 'upright'} compact={cards.length > 1} />
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
                  <p className="text-sm font-black text-cyan-50">{card.nameZh}</p>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--text-sub)]">{card.nameEn}</p>
                  <p className="mt-3 text-xs font-black text-violet-100">{deckCard?.orientation === 'reversed' ? '逆位' : '正位'}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="tarot-draw-output-note">
            <span>{deckSize}</span>
            <p>洗牌來源牌數</p>
          </div>
          <div className="tarot-draw-output-note">
            <span>{selectedDeckCards.length}</span>
            <p>使用者選牌數</p>
          </div>
          <div className="tarot-draw-output-note">
            <span>{sessionId ? '已記錄' : '未建立'}</span>
            <p>本次洗牌序號</p>
          </div>
        </div>
      </div>
    </section>
  );
}
