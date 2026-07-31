import {
  TAROT_INTEGRATION_STORAGE_KEY,
  type TarotAiElement,
  type TarotCard,
  type TarotElementWeights,
  type TarotIntegrationSignal,
  type TarotReading,
} from '@/features/tarot/types';
import { cryptoRandomIndex } from '@/features/tarot/services/draw';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import type { GrowthElement } from '@/lib/growth-center-engine';

function createSignalId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `tarot_signal_${Date.now().toString(36)}_${cryptoRandomIndex(1_000_000).toString(36)}`;
}

function orientationAdjustedWeights(weights: TarotElementWeights, orientation: TarotReading['orientation']): TarotElementWeights {
  if (orientation === 'upright') return { ...weights };

  const adjusted: TarotElementWeights = { ...weights };
  const strongest = (Object.keys(adjusted) as Array<keyof TarotElementWeights>)
    .reduce((current, element) => adjusted[element] > adjusted[current] ? element : current, 'SPACE');
  const shift = Math.min(8, adjusted[strongest]);

  adjusted[strongest] -= shift;
  adjusted.SPACE += Math.ceil(shift / 2);
  adjusted.WATER += Math.floor(shift / 2);

  return adjusted;
}

function getPrimaryGrowthElement(weights: TarotElementWeights): GrowthElement {
  return (Object.entries(weights) as Array<[TarotAiElement, number]>)
    .sort((a, b) => b[1] - a[1])[0][0] as GrowthElement;
}

export function createTarotIntegrationSignal(reading: TarotReading, card: TarotCard): TarotIntegrationSignal {
  const elementWeights = orientationAdjustedWeights(card.elementWeights, reading.orientation);
  return {
    id: createSignalId(),
    source: 'tarot',
    readingId: reading.id,
    scope: reading.scope,
    cardId: card.id,
    categoryId: reading.category,
    question: reading.question,
    orientation: reading.orientation,
    elementWeights,
    personalityWeights: elementWeights,
    eventWeights: elementWeights,
    elementPriority: (Object.entries(elementWeights) as Array<[TarotAiElement, number]>)
      .map(([element, weight]) => ({ element, label: element, weight }))
      .sort((a, b) => b.weight - a.weight),
    symbolism: card.symbolism,
    canUpdateGrowthCenter: reading.scope === 'self',
    singleUseOnly: reading.scope === 'other',
    createdAt: new Date().toISOString(),
  };
}

export function recordTarotIntegrationSignal(signal: TarotIntegrationSignal): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(TAROT_INTEGRATION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    const current = Array.isArray(parsed) ? parsed.filter((item): item is TarotIntegrationSignal => {
      if (!item || typeof item !== 'object') return false;
      const signalItem = item as Partial<TarotIntegrationSignal>;
      return signalItem.source === 'tarot' && typeof signalItem.id === 'string' && typeof signalItem.readingId === 'string';
    }) : [];
    window.localStorage.setItem(TAROT_INTEGRATION_STORAGE_KEY, JSON.stringify([signal, ...current].slice(0, 30)));
  } catch {
    window.localStorage.setItem(TAROT_INTEGRATION_STORAGE_KEY, JSON.stringify([signal]));
  }

  if (signal.canUpdateGrowthCenter) {
    markGrowthModuleCompleted('tarot', getPrimaryGrowthElement(signal.elementWeights));
  }
}