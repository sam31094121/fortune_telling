import type { TarotCard, TarotOrientation } from '@/features/tarot/types';

export function cryptoRandomIndex(max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error('Invalid random range.');
  }

  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);

  return values[0] % max;
}

export function drawTarotCard(cards: TarotCard[]): { card: TarotCard; orientation: TarotOrientation } {
  if (!cards.length) {
    throw new Error('Tarot card data is empty.');
  }

  const cardIndex = cryptoRandomIndex(cards.length);
  const orientation: TarotOrientation = cryptoRandomIndex(2) === 0 ? 'upright' : 'reversed';

  return {
    card: cards[cardIndex],
    orientation,
  };
}

export function createTarotReadingId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `tarot_${Date.now().toString(36)}_${cryptoRandomIndex(1_000_000).toString(36)}`;
}
