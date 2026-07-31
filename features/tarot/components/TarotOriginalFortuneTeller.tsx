'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TarotCard, TarotDeckCard } from '@/features/tarot/types';

type TarotOriginalFortuneTellerProps = {
  deck: TarotDeckCard[];
  cardsById: Map<string, TarotCard>;
  question: string;
  onReset: () => void;
  onComplete?: (deckCards: TarotDeckCard[]) => void;
};

type DrawnPosition = 'past' | 'present' | 'future';

type DrawnCard = {
  card: TarotCard;
  deckCard: TarotDeckCard;
  position: DrawnPosition;
};

const SOURCE_BASE = '/tarot/freecodecamp-js-fortune-teller';
const CARD_BACK_URL = `${SOURCE_BASE}/assets/img/cards/card-back_275x480.png`;
const AUDIO = {
  dealAll: `${SOURCE_BASE}/assets/media/audio/dealAllCards.mp3`,
  shuffleOut: `${SOURCE_BASE}/assets/media/audio/shuffleCardOut.mp3`,
  shuffleIn: `${SOURCE_BASE}/assets/media/audio/shuffleCardIn.mp3`,
  slide: `${SOURCE_BASE}/assets/media/audio/slideCard.mp3`,
  deal: `${SOURCE_BASE}/assets/media/audio/dealCard.mp3`,
  flip: `${SOURCE_BASE}/assets/media/audio/flipCard.mp3`,
  chime1: `${SOURCE_BASE}/assets/media/audio/chime1.mp3`,
  chime2: `${SOURCE_BASE}/assets/media/audio/chime2.mp3`,
  chime3: `${SOURCE_BASE}/assets/media/audio/chime3.mp3`,
  swoosh: `${SOURCE_BASE}/assets/media/audio/swoosh.mp3`,
  piano: `${SOURCE_BASE}/assets/media/audio/piano.mp3`,
} as const;

const POSITIONS: Array<{ id: DrawnPosition; label: string }> = [
  { id: 'past', label: '過去' },
  { id: 'present', label: '現在' },
  { id: 'future', label: '未來' },
];

const CHIME_SELECTOR: Record<DrawnPosition, string> = {
  past: '.cards__chime1-sfx',
  present: '.cards__chime2-sfx',
  future: '.cards__chime3-sfx',
};

function playAudio(root: HTMLElement | null, selector: string, options?: { loop?: boolean; volume?: number }) {
  const audio = root?.querySelector<HTMLAudioElement>(selector);
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  audio.loop = Boolean(options?.loop);
  audio.volume = options?.volume ?? 1;
  void audio.play().catch(() => undefined);
}

function stopAllAudio(root: HTMLElement | null) {
  root?.querySelectorAll<HTMLAudioElement>('audio').forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
  });
}

function uniqueRandomIndices(max: number) {
  const chosen = new Set<number>();
  while (chosen.size < 3) chosen.add(Math.floor(Math.random() * max));
  return Array.from(chosen) as [number, number, number];
}

export default function TarotOriginalFortuneTeller({
  deck,
  cardsById,
  question,
  onReset,
  onComplete,
}: TarotOriginalFortuneTellerProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const stackOrderRef = useRef<number[]>(Array.from({ length: 78 }, (_, index) => index));
  const shuffleSequenceRef = useRef(0);

  const [deckDealt, setDeckDealt] = useState(false);
  const [controlsReady, setControlsReady] = useState(false);
  const [shuffleTick, setShuffleTick] = useState(0);
  const [drawStarted, setDrawStarted] = useState(false);
  const [cardsFaded, setCardsFaded] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [dealtPositions, setDealtPositions] = useState<Set<DrawnPosition>>(() => new Set());
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealed, setRevealed] = useState<Set<DrawnPosition>>(() => new Set());
  const [activePosition, setActivePosition] = useState<DrawnPosition>('past');
  const [drawAnimationReady, setDrawAnimationReady] = useState(false);
  const [readReady, setReadReady] = useState(false);
  const [finished, setFinished] = useState(false);

  const orderedDeck = useMemo(
    () => deck.map((deckCard) => ({ ...deckCard, orientation: 'upright' as const })),
    [deck],
  );

  const drawnByPosition = useMemo(() => {
    return new Map(drawnCards.map((drawnCard) => [drawnCard.position, drawnCard] as const));
  }, [drawnCards]);
  const hasRevealedCards = revealed.size > 0;

  useEffect(() => {
    setDeckDealt(true);
    playAudio(rootRef.current, '.cards__deal-all-sfx');
    const controlsTimer = window.setTimeout(() => setControlsReady(true), 2540);
    timersRef.current.push(controlsTimer);

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
      stopAllAudio(rootRef.current);
    };
  }, []);

  const runSingleShuffle = useCallback(() => {
    setShuffleTick((value) => value + 1);

    const frontCardIndex = stackOrderRef.current.pop();
    if (frontCardIndex === undefined) return;
    stackOrderRef.current.unshift(frontCardIndex);
    shuffleSequenceRef.current += 1;
    const activeZIndex = 200 + shuffleSequenceRef.current;

    stackOrderRef.current.forEach((cardIndex, stackIndex) => {
      const card = rootRef.current?.querySelector<HTMLElement>(`.card[data-card-index="${cardIndex}"]`);
      if (!card) return;
      if (card.classList.contains('card--actively-shuffling')) return;
      card.style.zIndex = String(stackIndex + 1);
    });

    const frontCard = rootRef.current?.querySelector<HTMLElement>(`.card[data-card-index="${frontCardIndex}"]`);
    if (!frontCard) return;

    frontCard.classList.add('card--actively-shuffling');
    frontCard.style.transitionDelay = '0ms';
    frontCard.style.zIndex = String(activeZIndex);
    frontCard.style.transform = 'translate(calc(-50% + 25px), -160%)';
    playAudio(rootRef.current, '.cards__shuffle-out-sfx');

    const timer = window.setTimeout(() => {
      frontCard.style.transform = 'translate(-50%, -50%)';
      frontCard.style.zIndex = '1';
      frontCard.classList.remove('card--actively-shuffling');
      playAudio(rootRef.current, '.cards__shuffle-in-sfx');
    }, 500);
    timersRef.current.push(timer);
  }, []);

  const handleShuffle = useCallback(() => {
    runSingleShuffle();
  }, [runSingleShuffle]);

  const revealCard = useCallback((position: DrawnPosition) => {
    setRevealed((current) => {
      if (current.has(position)) return current;
      const next = new Set(current);
      next.add(position);
      return next;
    });

    playAudio(rootRef.current, '.cards__flip-sfx');
    const chimeTimer = window.setTimeout(() => playAudio(rootRef.current, CHIME_SELECTOR[position]), 360);
    timersRef.current.push(chimeTimer);

    if (position === 'past') setActivePosition('present');
    if (position === 'present') setActivePosition('future');
    if (position === 'future') {
      setFinished(true);
      playAudio(rootRef.current, '.reveal__piano-sfx', { loop: true, volume: 0.34 });
      onComplete?.(drawnCards.map((drawnCard) => drawnCard.deckCard));
    }
  }, [drawnCards, onComplete]);

  const handleDraw = useCallback(() => {
    if (orderedDeck.length < 3) return;

    const [pastIndex, presentIndex, futureIndex] = uniqueRandomIndices(orderedDeck.length);
    const selected: DrawnCard[] = [];
    [
      { position: 'past' as const, deckCard: orderedDeck[pastIndex] },
      { position: 'present' as const, deckCard: orderedDeck[presentIndex] },
      { position: 'future' as const, deckCard: orderedDeck[futureIndex] },
    ].forEach(({ position, deckCard }) => {
      const card = cardsById.get(deckCard.cardId);
      if (card) selected.push({ position, deckCard, card });
    });

    if (selected.length !== 3) return;

    setDrawnCards(selected);
    setRevealed(new Set());
    setActivePosition('past');
    setControlsReady(false);
    setDrawStarted(true);
    setCardsFaded(false);
    setShowReveal(false);
    setDealtPositions(new Set());
    setDrawAnimationReady(false);
    setReadReady(false);
    setFinished(false);
    playAudio(rootRef.current, '.cards__slide-sfx');

    const fadeTimer = window.setTimeout(() => setCardsFaded(true), 1000);
    const revealTimer = window.setTimeout(() => setShowReveal(true), 2000);
    const futureTimer = window.setTimeout(() => {
      setDealtPositions((current) => new Set(current).add('future'));
      playAudio(rootRef.current, '.cards__deal-sfx');
    }, 2500);
    const presentTimer = window.setTimeout(() => {
      setDealtPositions((current) => new Set(current).add('present'));
      playAudio(rootRef.current, '.cards__deal-sfx');
    }, 3000);
    const pastTimer = window.setTimeout(() => {
      setDealtPositions((current) => new Set(current).add('past'));
      playAudio(rootRef.current, '.cards__deal-sfx');
    }, 3500);
    const spreadTimer = window.setTimeout(() => {
      setDrawAnimationReady(true);
      playAudio(rootRef.current, '.cards__slide-sfx');
    }, 4500);
    const readyTimer = window.setTimeout(() => setReadReady(true), 5500);
    timersRef.current.push(fadeTimer, revealTimer, futureTimer, presentTimer, pastTimer, spreadTimer, readyTimer);
  }, [cardsById, orderedDeck]);

  const handleNext = useCallback(() => {
    playAudio(rootRef.current, '.cards__swoosh-sfx');
    revealCard(activePosition);
  }, [activePosition, revealCard]);

  return (
    <section
      ref={rootRef}
      className={`tarot-original-shell ${drawStarted ? 'tarot-original-shell--drawing' : ''} ${cardsFaded ? 'tarot-original-shell--cards-faded' : ''} ${showReveal ? 'tarot-original-shell--revealing' : ''} ${drawAnimationReady ? 'tarot-original-shell--draw-ready' : ''} ${hasRevealedCards ? 'tarot-original-shell--has-revealed' : ''}`}
      aria-label="tarot fortune teller"
    >
      <audio className="cards__deal-all-sfx" src={AUDIO.dealAll} preload="auto" />
      <audio className="cards__shuffle-out-sfx" src={AUDIO.shuffleOut} preload="auto" />
      <audio className="cards__shuffle-in-sfx" src={AUDIO.shuffleIn} preload="auto" />
      <audio className="cards__slide-sfx" src={AUDIO.slide} preload="auto" />
      <audio className="cards__deal-sfx" src={AUDIO.deal} preload="auto" />
      <audio className="cards__flip-sfx" src={AUDIO.flip} preload="auto" />
      <audio className="cards__chime1-sfx" src={AUDIO.chime1} preload="auto" />
      <audio className="cards__chime2-sfx" src={AUDIO.chime2} preload="auto" />
      <audio className="cards__chime3-sfx" src={AUDIO.chime3} preload="auto" />
      <audio className="cards__swoosh-sfx" src={AUDIO.swoosh} preload="auto" />
      <audio className="reveal__piano-sfx" src={AUDIO.piano} preload="auto" />

      <div className="tarot-original-status">
        <p>THREE CARD DRAW</p>
        <h1>塔羅三張牌</h1>
        <span>{question}</span>
      </div>

      <section className={`cards ${deckDealt ? 'cards--dealt' : ''}`} data-shuffle={shuffleTick}>
        {Array.from({ length: 78 }, (_, index) => (
          <div
            key={index}
            data-card-index={index}
            className={`card ${index % 2 === 0 ? 'card--left-source' : 'card--right-source'}`}
            style={{
              ['--deal-delay' as string]: `${index * 20}ms`,
              zIndex: index + 1,
            }}
          />
        ))}
        <div className={`cards__buttons ${controlsReady ? '' : 'hidden'}`}>
          <button type="button" className="cards__button cards__shuffle" onClick={handleShuffle}>洗牌</button>
          <button type="button" className="cards__button cards__reveal" onClick={handleDraw}>抽牌</button>
        </div>
      </section>

      {showReveal && drawnCards.length > 0 && (
        <section className={`reveal ${finished ? 'reveal--finished' : ''}`}>
          <div className="reveal__title">
            <p className="reveal__time">{POSITIONS.find((position) => position.id === activePosition)?.label}</p>
            <p className="reveal__name">
              {finished ? '三張牌已完成' : revealed.has(activePosition) ? drawnByPosition.get(activePosition)?.card.nameZh : '請翻開這張牌'}
            </p>
          </div>

          <div className="reveal__spread">
            {POSITIONS.map((position) => {
              const drawnCard = drawnByPosition.get(position.id);
              const isRevealed = revealed.has(position.id);
              const isDealt = dealtPositions.has(position.id);
              const isActive = readReady && activePosition === position.id && !isRevealed && !finished;
              if (!drawnCard) return null;
              return (
                <button
                  key={position.id}
                  type="button"
                  className={`reveal__three-cards reveal__${position.id} ${isDealt ? 'reveal__three-cards--dealt' : ''} ${isRevealed ? 'reveal__three-cards--open' : ''} ${isActive ? 'reveal__three-cards--active' : ''}`}
                  onClick={() => {
                    if (isActive) revealCard(position.id);
                  }}
                >
                  <span className="reveal__position">{position.label}</span>
                  <span className="reveal__card-stage">
                    <span className="reveal__card-back" style={{ backgroundImage: `url(${CARD_BACK_URL})` }} />
                    <span className="reveal__card-front" style={{ backgroundImage: `url(${drawnCard.card.imageUrl})` }} />
                  </span>
                  <span className="reveal__card-name">{isRevealed ? drawnCard.card.nameZh : '尚未翻開'}</span>
                </button>
              );
            })}
          </div>

          <div className="reveal__interpretation">
            {POSITIONS.map((position) => {
              const drawnCard = drawnByPosition.get(position.id);
              if (!drawnCard || !revealed.has(position.id)) return null;
              return (
                <article key={position.id} className="reveal__meaning-card">
                  <p className="reveal__meaning-position">{position.label}</p>
                  <h2>{drawnCard.card.nameZh}</h2>
                  <p>{drawnCard.card.uprightMeaning}</p>
                  <div className="reveal__keywords">
                    {drawnCard.card.uprightKeywords.slice(0, 4).map((keyword) => (
                      <span key={keyword}>{keyword}</span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="reveal__actions">
            {!finished && readReady && (
              <button type="button" className="reveal__button" onClick={handleNext}>
                {activePosition === 'future' ? '翻開最後一張' : '下一張'}
              </button>
            )}
            <button type="button" className="reveal__restart" onClick={onReset}>
              重新開始
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
