'use client';

import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import type { TarotCard, TarotDeckCard, TarotSpreadType } from '@/features/tarot/types';

const POSITION_LABELS: Record<TarotSpreadType, string[]> = {
  single: ['第一張'],
  three_card: ['第一張', '第二張', '第三張'],
};

type TarotCardSelectionProps = {
  deck: TarotDeckCard[];
  cardsById: Map<string, TarotCard>;
  spreadType: TarotSpreadType;
  requiredDrawCount: number;
  isGenerating?: boolean;
  onSelect: (deckCards: TarotDeckCard[]) => void;
  onShuffleAgain: () => void;
};

function buildFanStyle(index: number, count: number): CSSProperties {
  const midpoint = (count - 1) / 2;
  const offset = index - midpoint;
  const arc = Math.pow(Math.abs(offset), 1.42);
  const breath = index % 2 === 0 ? -0.08 : 0.08;
  const x = offset * 2.86;
  const mobileX = offset * 1.42;
  const y = 1.72 + arc * 0.16 + breath;
  const rotate = offset * 3.55;
  return {
    ['--tarot-fan-x' as string]: `${x}rem`,
    ['--tarot-fan-x-mobile' as string]: `${mobileX}rem`,
    ['--tarot-fan-y' as string]: `${y}rem`,
    ['--tarot-fan-rotate' as string]: `${rotate}deg`,
    ['--tarot-fan-intro-x' as string]: `${x * 0.35}rem`,
    ['--tarot-fan-intro-y' as string]: `${y - 1.15}rem`,
    ['--tarot-fan-intro-rotate' as string]: `${rotate * 0.38}deg`,
    ['--tarot-fan-settle-x' as string]: `${x * 1.02}rem`,
    ['--tarot-fan-settle-y' as string]: `${y + 0.1}rem`,
    ['--tarot-fan-settle-rotate' as string]: `${rotate * 1.04}deg`,
    ['--tarot-fan-z' as string]: index + 1,
    ['--tarot-fan-depth' as string]: `${Math.max(0, 7 - Math.abs(offset)) * 0.08}rem`,
    animationDelay: `${180 + index * 54}ms`,
  };
}

export default function TarotCardSelection({ deck, cardsById, spreadType, requiredDrawCount, isGenerating = false, onSelect, onShuffleAgain }: TarotCardSelectionProps) {
  const [selectedDeckKeys, setSelectedDeckKeys] = useState<string[]>([]);
  const visibleDeck = useMemo(() => deck.slice(0, 12), [deck]);
  const deckSignature = useMemo(() => visibleDeck.map((item) => item.deckKey).join('|'), [visibleDeck]);
  const selectedCards = useMemo(
    () => selectedDeckKeys.map((deckKey) => visibleDeck.find((item) => item.deckKey === deckKey)).filter((item): item is TarotDeckCard => Boolean(item)),
    [selectedDeckKeys, visibleDeck],
  );
  const isComplete = selectedCards.length === requiredDrawCount;
  const positionLabels = POSITION_LABELS[spreadType] ?? POSITION_LABELS.three_card;

  useEffect(() => {
    setSelectedDeckKeys([]);
  }, [deckSignature, requiredDrawCount, spreadType]);

  useEffect(() => {
    if (!isComplete) return undefined;
    const timer = window.setTimeout(() => onSelect(selectedCards), 980);
    return () => window.clearTimeout(timer);
  }, [isComplete, onSelect, selectedCards]);

  function handlePick(deckCard: TarotDeckCard) {
    if (isGenerating || isComplete || selectedDeckKeys.includes(deckCard.deckKey)) return;
    setSelectedDeckKeys((current) => [...current, deckCard.deckKey].slice(0, requiredDrawCount));
  }

  if (!visibleDeck.length) {
    return (
      <section className="fortune-card border-rose-300/25 bg-rose-950/20 p-5 sm:p-6">
        <p className="text-sm font-semibold leading-7 text-rose-100">牌堆尚未建立，請重新洗牌。</p>
        <button type="button" onClick={onShuffleAgain} className="mt-4 rounded-full border border-rose-200/35 bg-rose-300/12 px-5 py-3 text-sm font-black text-rose-100">
          重新洗牌
        </button>
      </section>
    );
  }

  return (
    <section className="fortune-card tarot-draw-selection border-violet-300/25 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-200">CHOOSE BY YOURSELF</p>
          <h2 className="mt-3 font-serif text-3xl font-black leading-tight text-violet-50">請親手選 3 張牌</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
            牌背已由完整 78 張洗牌結果展開。請依直覺點選，系統只記錄選牌順序並翻開牌面，本階段不進行解讀。
          </p>
        </div>
        <button
          type="button"
          onClick={onShuffleAgain}
          disabled={isGenerating || selectedDeckKeys.length > 0}
          className="shrink-0 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-[color:var(--text-sub)] transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          重新洗牌
        </button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {positionLabels.slice(0, requiredDrawCount).map((label, index) => {
          const deckCard = selectedCards[index];
          const card = deckCard ? cardsById.get(deckCard.cardId) : null;
          return (
            <div key={label} className={`tarot-position-slot ${deckCard ? 'tarot-position-slot--filled' : ''}`}>
              <span>{index + 1}</span>
              <div>
                <p>{label}</p>
                <strong>{card ? `${card.nameZh}｜${deckCard.orientation === 'upright' ? '正位' : '逆位'}` : '等待選牌'}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <div className="tarot-draw-fan mt-7" aria-label="塔羅牌背選擇區">
        <div className="tarot-draw-fan__glow" aria-hidden="true" />
        {visibleDeck.map((deckCard, index) => {
          const card = cardsById.get(deckCard.cardId);
          const selectedIndex = selectedDeckKeys.indexOf(deckCard.deckKey);
          const isSelected = selectedIndex >= 0;
          const isDimmed = isComplete && !isSelected;
          const positionLabel = isSelected ? positionLabels[selectedIndex] : '';
          return (
            <button
              key={deckCard.deckKey}
              type="button"
              aria-label={`選擇第 ${index + 1} 張牌`}
              onClick={() => handlePick(deckCard)}
              disabled={isGenerating || isComplete || isSelected}
              className={`tarot-fan-card ${isSelected ? 'tarot-fan-card--selected' : ''} ${isDimmed ? 'tarot-fan-card--dimmed' : ''}`}
              style={buildFanStyle(index, visibleDeck.length)}
            >
              <span className="tarot-fan-card__inner">
                <span className="tarot-fan-card__back" aria-hidden="true">
                  <span className="tarot-fan-card__sigil">T</span>
                </span>
                <span className="tarot-fan-card__front" aria-hidden={!isSelected}>
                  {card ? (
                    <img src={card.imageUrl} alt="" className={deckCard.orientation === 'reversed' ? 'rotate-180' : ''} />
                  ) : (
                    <span className="tarot-fan-card__missing">?</span>
                  )}
                  {positionLabel && <span className="tarot-fan-card__position">{positionLabel}</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-xs font-black leading-6 text-violet-100">
        已選 {selectedCards.length} / {requiredDrawCount}。{isComplete ? '三張牌已確認，正在翻開牌面。' : '請依序選滿三張牌。'}
      </p>
    </section>
  );
}