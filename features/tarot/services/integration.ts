import {
  TAROT_INTEGRATION_STORAGE_KEY,
  type TarotAiElement,
  type TarotElementWeights,
  type TarotIntegrationSignal,
} from '@/features/tarot/types';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import type { GrowthElement } from '@/lib/growth-center-engine';

function getPrimaryGrowthElement(weights: TarotElementWeights): GrowthElement {
  return (Object.entries(weights) as Array<[TarotAiElement, number]>)
    .sort((a, b) => b[1] - a[1])[0][0] as GrowthElement;
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
