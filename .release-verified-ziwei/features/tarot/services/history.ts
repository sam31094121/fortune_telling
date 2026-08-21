import {
  TAROT_HISTORY_STORAGE_KEY,
  type TarotOrientation,
  type TarotQuestionCategoryId,
  type TarotReading,
  type TarotReadingCard,
  type TarotReadingScope,
  type TarotSpreadType,
} from '@/features/tarot/types';

const CATEGORY_VALUES: TarotQuestionCategoryId[] = [
  'love',
  'career',
  'finance',
  'business',
  'family',
  'social',
  'study',
  'decision',
  'project',
  'obstacle',
  'growth',
  'near_future',
  'custom',
];
const ORIENTATION_VALUES: TarotOrientation[] = ['upright', 'reversed'];
const SCOPE_VALUES: TarotReadingScope[] = ['self', 'other'];
const SPREAD_VALUES: TarotSpreadType[] = ['single', 'three_card'];

function normalizeTarotReadingCard(value: unknown, index: number): TarotReadingCard | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<TarotReadingCard>;
  if (typeof item.cardId !== 'string') return null;
  if (!ORIENTATION_VALUES.includes(item.orientation as TarotOrientation)) return null;
  return {
    position: Number.isFinite(item.position) ? Number(item.position) : index,
    positionKey: item.positionKey ?? (index === 0 ? 'core' : index === 1 ? 'challenge' : 'action'),
    positionLabel: typeof item.positionLabel === 'string' && item.positionLabel ? item.positionLabel : index === 0 ? '核心指引' : index === 1 ? '阻礙' : '行動',
    cardId: item.cardId,
    orientation: item.orientation as TarotOrientation,
    deckOrder: Number.isFinite(item.deckOrder) ? Number(item.deckOrder) : index,
  };
}

function normalizeTarotReading(value: unknown): TarotReading | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<TarotReading>;
  if (typeof item.id !== 'string') return null;
  if (!CATEGORY_VALUES.includes(item.category as TarotQuestionCategoryId)) return null;
  if (typeof item.question !== 'string' || item.question.trim().length === 0) return null;
  if (typeof item.cardId !== 'string') return null;
  if (!ORIENTATION_VALUES.includes(item.orientation as TarotOrientation)) return null;
  if (typeof item.createdAt !== 'string' || Number.isNaN(Date.parse(item.createdAt))) return null;

  const cards = Array.isArray(item.cards)
    ? item.cards.map(normalizeTarotReadingCard).filter((card): card is TarotReadingCard => Boolean(card))
    : [];
  const spreadType = SPREAD_VALUES.includes(item.spreadType as TarotSpreadType)
    ? item.spreadType as TarotSpreadType
    : cards.length >= 3 ? 'three_card' : 'single';

  return {
    id: item.id,
    category: item.category as TarotQuestionCategoryId,
    question: item.question,
    cardId: item.cardId,
    orientation: item.orientation as TarotOrientation,
    scope: SCOPE_VALUES.includes(item.scope as TarotReadingScope) ? item.scope as TarotReadingScope : 'self',
    spreadType,
    cards: cards.length ? cards : undefined,
    integrationSignalId: typeof item.integrationSignalId === 'string' ? item.integrationSignalId : undefined,
    createdAt: item.createdAt,
  };
}

function isTarotReading(value: unknown): value is TarotReading {
  return normalizeTarotReading(value) !== null;
}

export function parseTarotHistory(raw: string | null): TarotReading[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTarotReading).filter((item): item is TarotReading => Boolean(item)).slice(0, 20);
  } catch {
    return [];
  }
}

export function loadTarotHistory(): TarotReading[] {
  if (typeof window === 'undefined') return [];
  return parseTarotHistory(window.localStorage.getItem(TAROT_HISTORY_STORAGE_KEY));
}

export function saveTarotHistory(history: TarotReading[]): void {
  if (typeof window === 'undefined') return;
  const safeHistory = history.map(normalizeTarotReading).filter((item): item is TarotReading => Boolean(item) && isTarotReading(item)).slice(0, 20);
  window.localStorage.setItem(TAROT_HISTORY_STORAGE_KEY, JSON.stringify(safeHistory));
}

export function prependTarotReading(reading: TarotReading, currentHistory: TarotReading[]): TarotReading[] {
  return [reading, ...currentHistory.filter((item) => item.id !== reading.id)].slice(0, 20);
}