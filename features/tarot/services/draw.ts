import type { TarotCard, TarotDeckCard, TarotOrientation } from '@/features/tarot/types';

export function cryptoRandomIndex(max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error('Invalid random range.');
  }

  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);

  return values[0] % max;
}

function getRandomOrientation(): TarotOrientation {
  return cryptoRandomIndex(2) === 0 ? 'upright' : 'reversed';
}

export function prepareTarotDeck(cards: TarotCard[]): TarotDeckCard[] {
  if (!cards.length) {
    throw new Error('Tarot card data is empty.');
  }

  const deck = cards.map((card, index) => ({
    deckKey: `${card.id}_${index}_${cryptoRandomIndex(1_000_000).toString(36)}`,
    cardId: card.id,
    orientation: getRandomOrientation(),
    order: index,
  }));

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const targetIndex = cryptoRandomIndex(index + 1);
    [deck[index], deck[targetIndex]] = [deck[targetIndex], deck[index]];
  }

  return deck.map((item, order) => ({ ...item, order }));
}

export function selectTarotCard(cards: TarotCard[], deck: TarotDeckCard[], deckKey: string): { card: TarotCard; orientation: TarotOrientation } {
  const deckCard = deck.find((item) => item.deckKey === deckKey);
  if (!deckCard) {
    throw new Error('找不到你選擇的牌背，請重新洗牌。');
  }

  const card = cards.find((item) => item.id === deckCard.cardId);
  if (!card) {
    throw new Error('這張牌的資料不存在，請重新洗牌。');
  }

  return {
    card,
    orientation: deckCard.orientation,
  };
}

export function createTarotReadingId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `tarot_${Date.now().toString(36)}_${cryptoRandomIndex(1_000_000).toString(36)}`;
}