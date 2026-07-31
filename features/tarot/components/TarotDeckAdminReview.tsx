'use client';

import { useMemo, useState } from 'react';
import type { TarotArcana, TarotCard, TarotSuit } from '@/features/tarot/types';

type TarotDeckAdminReviewProps = {
  cards: TarotCard[];
  onClose: () => void;
};

type ReviewGroupId = 'all' | TarotArcana | TarotSuit;

const GROUPS: Array<{ id: ReviewGroupId; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'major', label: '大牌' },
  { id: 'wands', label: '權杖' },
  { id: 'cups', label: '聖杯' },
  { id: 'swords', label: '寶劍' },
  { id: 'pentacles', label: '錢幣' },
];

function groupMatches(card: TarotCard, groupId: ReviewGroupId) {
  if (groupId === 'all') return true;
  if (groupId === 'major') return card.arcana === 'major';
  if (groupId === 'minor') return card.arcana === 'minor';
  return card.suit === groupId;
}

export default function TarotDeckAdminReview({ cards, onClose }: TarotDeckAdminReviewProps) {
  const [activeGroup, setActiveGroup] = useState<ReviewGroupId>('all');
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id ?? '');
  const [showBack, setShowBack] = useState(false);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  const filteredCards = useMemo(
    () => cards.filter((card) => groupMatches(card, activeGroup)),
    [activeGroup, cards],
  );
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0];

  function recordImageFailure(cardId: string) {
    setFailedImages((current) => current.includes(cardId) ? current : [...current, cardId]);
  }

  return (
    <section className="fortune-card tarot-admin-review border-amber-200/30 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">CARD REVIEW</p>
          <h1 className="mt-3 font-serif text-3xl font-black leading-tight text-amber-50 sm:text-4xl">塔羅牌驗牌模式</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
            用小縮圖快速檢查 78 張 PNG 是否正確載入；點任何牌可以在左側預覽。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
        >
          回到抽牌
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="tarot-draw-output-note">
          <span>{cards.length}</span>
          <p>總牌數</p>
        </div>
        <div className="tarot-draw-output-note">
          <span>{filteredCards.length}</span>
          <p>目前分組</p>
        </div>
        <div className="tarot-draw-output-note">
          <span>{failedImages.length}</span>
          <p>載入失敗</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActiveGroup(group.id)}
            className={`rounded-full border px-4 py-2 text-xs font-black transition ${
              activeGroup === group.id
                ? 'border-amber-200/60 bg-amber-300/16 text-amber-50'
                : 'border-white/10 bg-white/5 text-[color:var(--text-sub)] hover:border-white/20 hover:text-white'
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {selectedCard && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="tarot-admin-preview">
            <button
              type="button"
              onClick={() => setShowBack((value) => !value)}
              className="tarot-admin-preview__card"
              aria-label={`查看 ${selectedCard.nameZh}`}
            >
              <img
                src={showBack ? '/tarot/freecodecamp-js-fortune-teller/assets/img/cards/card-back_275x480.png' : selectedCard.imageUrl}
                alt={showBack ? '塔羅牌背' : `${selectedCard.nameZh} ${selectedCard.nameEn}`}
                onError={() => recordImageFailure(selectedCard.id)}
              />
            </button>
            <p className="mt-4 text-sm font-black text-cyan-50">{selectedCard.nameZh}</p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-sub)]">{selectedCard.nameEn}</p>
            <p className="mt-2 break-all text-xs font-semibold text-[color:var(--text-muted)]">{selectedCard.id}</p>
            <button
              type="button"
              onClick={() => setShowBack((value) => !value)}
              className="mt-4 w-full rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-50 transition hover:bg-cyan-300/18"
            >
              {showBack ? '看牌面' : '看牌背'}
            </button>
          </aside>

          <div className="tarot-admin-card-grid">
            {filteredCards.map((card) => {
              const failed = failedImages.includes(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    setSelectedCardId(card.id);
                    setShowBack(false);
                  }}
                  className={`tarot-admin-card-tile ${selectedCard.id === card.id ? 'tarot-admin-card-tile--active' : ''} ${failed ? 'tarot-admin-card-tile--failed' : ''}`}
                >
                  <span className="tarot-admin-card-tile__image">
                    <img
                      src={card.imageUrl}
                      alt={`${card.nameZh} ${card.nameEn}`}
                      loading="lazy"
                      onError={() => recordImageFailure(card.id)}
                    />
                  </span>
                  <span className="tarot-admin-card-tile__name">{card.nameZh}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
