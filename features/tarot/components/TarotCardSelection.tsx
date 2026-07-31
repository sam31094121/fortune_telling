'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TarotCard, TarotDeckCard } from '@/features/tarot/types';

type TarotCardSelectionProps = {
  deck: TarotDeckCard[];
  cardsById: Map<string, TarotCard>;
  onSelect: (deckCard: TarotDeckCard) => void;
  onShuffleAgain: () => void;
};

export default function TarotCardSelection({ deck, cardsById, onSelect, onShuffleAgain }: TarotCardSelectionProps) {
  const [selectedDeckKey, setSelectedDeckKey] = useState<string | null>(null);
  const visibleDeck = useMemo(() => deck.slice(0, 15), [deck]);
  const selectedCard = selectedDeckKey ? visibleDeck.find((item) => item.deckKey === selectedDeckKey) : undefined;

  useEffect(() => {
    if (!selectedCard) return undefined;
    const timer = window.setTimeout(() => onSelect(selectedCard), 920);
    return () => window.clearTimeout(timer);
  }, [onSelect, selectedCard]);

  if (!visibleDeck.length) {
    return (
      <section className="fortune-card border-rose-300/25 bg-rose-950/20 p-5 sm:p-6">
        <p className="text-sm font-semibold leading-7 text-rose-100">牌序尚未建立，請重新洗牌。</p>
        <button type="button" onClick={onShuffleAgain} className="mt-4 rounded-full border border-rose-200/35 bg-rose-300/12 px-5 py-3 text-sm font-black text-rose-100">
          重新洗牌
        </button>
      </section>
    );
  }

  return (
    <section className="fortune-card border-violet-300/25 bg-violet-300/[0.05] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-200">CHOOSE BY YOURSELF</p>
          <h2 className="mt-3 font-serif text-3xl font-black text-violet-50">請親手選一張牌</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
            AI 不會代替你抽牌。後端已完成 78 張牌洗牌，畫面只攤開其中一組牌背，請依你的問題點選一張。
          </p>
        </div>
        <button
          type="button"
          onClick={onShuffleAgain}
          disabled={Boolean(selectedDeckKey)}
          className="shrink-0 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-[color:var(--text-sub)] transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          重新洗牌
        </button>
      </div>

      <div className="tarot-pick-spread mt-7" aria-label="塔羅牌背選擇區">
        {visibleDeck.map((deckCard, index) => {
          const card = cardsById.get(deckCard.cardId);
          const isSelected = selectedDeckKey === deckCard.deckKey;
          const isDimmed = Boolean(selectedDeckKey) && !isSelected;
          return (
            <button
              key={deckCard.deckKey}
              type="button"
              aria-label={`選擇第 ${index + 1} 張牌`}
              onClick={() => setSelectedDeckKey(deckCard.deckKey)}
              disabled={Boolean(selectedDeckKey)}
              className={`tarot-pick-card tarot-pick-card--${index % 7} ${isSelected ? 'tarot-pick-card--selected' : ''} ${isDimmed ? 'tarot-pick-card--dimmed' : ''}`}
              style={{ animationDelay: `${index * 34}ms` }}
            >
              <span className="tarot-pick-card__inner">
                <span className="tarot-pick-card__back" aria-hidden="true">
                  <span className="tarot-pick-card__sigil">T</span>
                </span>
                <span className="tarot-pick-card__front" aria-hidden={!isSelected}>
                  {card ? (
                    <img
                      src={card.imageUrl}
                      alt=""
                      className={deckCard.orientation === 'reversed' ? 'rotate-180' : ''}
                    />
                  ) : (
                    <span className="tarot-pick-card__missing">?</span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}