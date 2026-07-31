import {
  TAROT_HISTORY_STORAGE_KEY,
  type TarotOrientation,
  type TarotQuestionCategoryId,
  type TarotReading,
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

function isTarotReading(value: unknown): value is TarotReading {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<TarotReading>;
  return typeof item.id === 'string'
    && CATEGORY_VALUES.includes(item.category as TarotQuestionCategoryId)
    && typeof item.question === 'string'
    && item.question.trim().length > 0
    && typeof item.cardId === 'string'
    && ORIENTATION_VALUES.includes(item.orientation as TarotOrientation)
    && typeof item.createdAt === 'string'
    && !Number.isNaN(Date.parse(item.createdAt));
}

export function parseTarotHistory(raw: string | null): TarotReading[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTarotReading).slice(0, 20);
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
  const safeHistory = history.filter(isTarotReading).slice(0, 20);
  window.localStorage.setItem(TAROT_HISTORY_STORAGE_KEY, JSON.stringify(safeHistory));
}

export function prependTarotReading(reading: TarotReading, currentHistory: TarotReading[]): TarotReading[] {
  return [reading, ...currentHistory.filter((item) => item.id !== reading.id)].slice(0, 20);
}
