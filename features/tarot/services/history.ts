import {
  TAROT_HISTORY_STORAGE_KEY,
  type TarotOrientation,
  type TarotQuestionCategoryId,
  type TarotReading,
  type TarotReadingScope,
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

function normalizeTarotReading(value: unknown): TarotReading | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<TarotReading>;
  if (typeof item.id !== 'string') return null;
  if (!CATEGORY_VALUES.includes(item.category as TarotQuestionCategoryId)) return null;
  if (typeof item.question !== 'string' || item.question.trim().length === 0) return null;
  if (typeof item.cardId !== 'string') return null;
  if (!ORIENTATION_VALUES.includes(item.orientation as TarotOrientation)) return null;
  if (typeof item.createdAt !== 'string' || Number.isNaN(Date.parse(item.createdAt))) return null;

  return {
    id: item.id,
    category: item.category as TarotQuestionCategoryId,
    question: item.question,
    cardId: item.cardId,
    orientation: item.orientation as TarotOrientation,
    scope: SCOPE_VALUES.includes(item.scope as TarotReadingScope) ? item.scope as TarotReadingScope : 'self',
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