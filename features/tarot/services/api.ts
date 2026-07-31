import type {
  TarotCard,
  TarotDeckCard,
  TarotIntegrationSignal,
  TarotInterpretationOutput,
  TarotQuestionCategoryId,
  TarotReading,
  TarotReadingScope,
} from '@/features/tarot/types';

export type TarotStatsSnapshot = {
  engineVersion: string;
  deckSize: number;
  deckIntegrity: {
    total: number;
    major: number;
    minor: number;
    complete: boolean;
  };
  totals: {
    shuffles: number;
    readings: number;
    selfReadings: number;
    otherReadings: number;
  };
  orientation: {
    upright: number;
    reversed: number;
  };
  categoryCounts: Partial<Record<TarotQuestionCategoryId, number>>;
  cardCounts: Record<string, number>;
  lastUpdatedAt?: string;
};

export type TarotShuffleApiResponse = {
  ok: true;
  engineVersion: string;
  sessionId: string;
  categoryId: TarotQuestionCategoryId;
  question: string;
  scope: TarotReadingScope;
  deckSize: number;
  visibleDeck: TarotDeckCard[];
  deckIntegrity: {
    total: number;
    major: number;
    minor: number;
    complete: boolean;
  };
  expiresAt: string;
};

export type TarotReadingApiResponse = {
  ok: true;
  engineVersion: string;
  reading: TarotReading;
  card: TarotCard;
  interpretation: TarotInterpretationOutput;
  integrationSignal: TarotIntegrationSignal;
  stats: TarotStatsSnapshot;
};

export type TarotInterpretApiResponse = {
  ok: true;
  engineVersion: string;
  reading: TarotReading;
  card: TarotCard;
  interpretation: TarotInterpretationOutput;
};

type ApiFailure = {
  ok: false;
  message?: string;
  code?: string;
};

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok || (payload && typeof payload === 'object' && (payload as ApiFailure).ok === false)) {
    throw new Error((payload as ApiFailure).message || fallbackMessage);
  }

  return payload as T;
}

export async function requestTarotShuffle(input: { categoryId: TarotQuestionCategoryId; question: string; scope: TarotReadingScope }): Promise<TarotShuffleApiResponse> {
  const response = await fetch('/api/tarot/shuffle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(input),
  });
  return parseJsonResponse<TarotShuffleApiResponse>(response, '塔羅洗牌後端暫時無法回應。');
}

export async function requestTarotReading(input: { sessionId: string; deckKey: string }): Promise<TarotReadingApiResponse> {
  const response = await fetch('/api/tarot/reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(input),
  });
  return parseJsonResponse<TarotReadingApiResponse>(response, '塔羅解讀後端暫時無法回應。');
}

export async function requestTarotStats(): Promise<TarotStatsSnapshot> {
  const response = await fetch('/api/tarot/stats', { cache: 'no-store' });
  const payload = await parseJsonResponse<{ ok: true; stats: TarotStatsSnapshot }>(response, '塔羅統計後端暫時無法回應。');
  return payload.stats;
}
export async function requestTarotInterpretation(input: { reading: TarotReading }): Promise<TarotInterpretApiResponse> {
  const response = await fetch('/api/tarot/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(input),
  });
  return parseJsonResponse<TarotInterpretApiResponse>(response, '塔羅重新解讀後端暫時無法回應。');
}