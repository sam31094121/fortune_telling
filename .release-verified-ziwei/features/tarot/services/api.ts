import type {
  TarotCard,
  TarotCardBackResource,
  TarotCardResource,
  TarotDeckCard,
  TarotDrawOutputContract,
  TarotDrawResultItem,
  TarotDrawRhythm,
  TarotRevealSequenceItem,
  TarotShuffleSequenceItem,
  TarotSpreadSequenceItem,
  TarotEngineCrossCheck,
  TarotIntegrationSignal,
  TarotInterpretationOutput,
  TarotOrientation,
  TarotQuestionCategoryId,
  TarotReading,
  TarotReadingScope,
  TarotSpreadType,
  TarotSystemReadiness,
} from '@/features/tarot/types';

export type TarotStatsSnapshot = {
  engineVersion: string;
  title: '塔羅牌';
  deckSize: number;
  deckIntegrity: {
    total: number;
    major: number;
    minor: number;
    complete: boolean;
  };
  readiness: TarotSystemReadiness;
  totals: {
    shuffles: number;
    readings: number;
    selfReadings: number;
    otherReadings: number;
  };
  orientation: Record<TarotOrientation, number>;
  categoryCounts: Partial<Record<TarotQuestionCategoryId, number>>;
  cardCounts: Record<string, number>;
  lastUpdatedAt?: string;
};

export type TarotShuffleApiResponse = {
  ok: true;
  engineVersion: string;
  title: '塔羅牌';
  sessionId: string;
  categoryId: TarotQuestionCategoryId;
  question: string;
  scope: TarotReadingScope;
  spreadType: TarotSpreadType;
  requiredDrawCount: number;
  deckSize: number;
  visibleDeck: TarotDeckCard[];
  cardBack: TarotCardBackResource;
  shuffleSequence: TarotShuffleSequenceItem[];
  spreadSequence: TarotSpreadSequenceItem[];
  drawRhythm: TarotDrawRhythm;
  outputContract: TarotDrawOutputContract;
  deckIntegrity: {
    total: number;
    major: number;
    minor: number;
    complete: boolean;
  };
  readiness: TarotSystemReadiness;
  expiresAt: string;
};

export type TarotDeckCatalogApiResponse = {
  ok: true;
  engineVersion: string;
  title: string;
  deckSize: number;
  deckIntegrity: {
    total: number;
    major: number;
    minor: number;
    complete: boolean;
  };
  cardBack: TarotCardBackResource;
  cards: TarotCardResource[];
  outputContract: TarotDrawOutputContract;
};

export type TarotDrawOutputApiResponse = {
  ok: true;
  engineVersion: string;
  title: string;
  sessionId: string;
  scope: TarotReadingScope;
  spreadType: TarotSpreadType;
  requiredDrawCount: number;
  deckSize: number;
  selectedDeckKeys: string[];
  drawResults: TarotDrawResultItem[];
  revealSequence: TarotRevealSequenceItem[];
  drawRhythm: TarotDrawRhythm;
  outputContract: TarotDrawOutputContract;
  createdAt: string;
};

export type TarotReadingApiResponse = {
  ok: true;
  engineVersion: string;
  title: '塔羅牌';
  reading: TarotReading;
  card: TarotCard;
  cards: TarotCard[];
  interpretation: TarotInterpretationOutput;
  integrationSignal: TarotIntegrationSignal;
  crossCheck: TarotEngineCrossCheck;
  stats: TarotStatsSnapshot;
};

export type TarotInterpretApiResponse = {
  ok: true;
  engineVersion: string;
  title: '塔羅牌';
  reading: TarotReading;
  card: TarotCard;
  cards: TarotCard[];
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

export async function requestTarotShuffle(input: { categoryId: TarotQuestionCategoryId; question: string; scope: TarotReadingScope; spreadType: TarotSpreadType }): Promise<TarotShuffleApiResponse> {
  const response = await fetch('/api/tarot/shuffle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(input),
  });
  return parseJsonResponse<TarotShuffleApiResponse>(response, '塔羅牌洗牌引擎暫時無法啟動。');
}

export async function requestTarotReading(input: { sessionId: string; deckKey?: string; deckKeys?: string[] }): Promise<TarotReadingApiResponse> {
  const response = await fetch('/api/tarot/reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(input),
  });
  return parseJsonResponse<TarotReadingApiResponse>(response, '塔羅牌抽牌引擎暫時無法完成解讀。');
}

export async function requestTarotStats(): Promise<TarotStatsSnapshot> {
  const response = await fetch('/api/tarot/stats', { cache: 'no-store' });
  const payload = await parseJsonResponse<{ ok: true; stats: TarotStatsSnapshot }>(response, '塔羅牌統計引擎暫時無法讀取。');
  return payload.stats;
}

export async function requestTarotInterpretation(input: { reading: TarotReading }): Promise<TarotInterpretApiResponse> {
  const response = await fetch('/api/tarot/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(input),
  });
  return parseJsonResponse<TarotInterpretApiResponse>(response, '塔羅牌 AI 解讀暫時無法重新產生。');
}
export async function requestTarotDeckCatalog(): Promise<TarotDeckCatalogApiResponse> {
  const response = await fetch('/api/tarot/deck', { cache: 'no-store' });
  return parseJsonResponse<TarotDeckCatalogApiResponse>(response, '塔羅牌庫資料暫時無法讀取。');
}

export async function requestTarotDrawOutput(input: { sessionId: string; deckKeys: string[] }): Promise<TarotDrawOutputApiResponse> {
  const response = await fetch('/api/tarot/draw-output', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(input),
  });
  return parseJsonResponse<TarotDrawOutputApiResponse>(response, '塔羅抽牌輸出暫時無法建立。');
}
