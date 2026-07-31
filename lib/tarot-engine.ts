import { randomInt, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { TAROT_CARDS } from '@/features/tarot/data/cards';
import { generateTarotInterpretation } from '@/features/tarot/services/interpretation';
import {
  TAROT_CATEGORY_LABELS,
  type TarotCard,
  type TarotDeckCard,
  type TarotElementWeights,
  type TarotIntegrationSignal,
  type TarotInterpretationOutput,
  type TarotOrientation,
  type TarotQuestionCategoryId,
  type TarotReading,
  type TarotReadingScope,
} from '@/features/tarot/types';

export const TAROT_ENGINE_VERSION = 'tarot-system-v1.0.0';
const SESSION_TTL_MS = 20 * 60 * 1000;
const VISIBLE_DECK_COUNT = 15;
const STATS_FILE = path.join(process.cwd(), 'data', 'tarot-system-stats.json');
const SESSIONS_FILE = path.join(process.cwd(), 'data', 'tarot-active-sessions.json');

const CATEGORY_VALUES = Object.keys(TAROT_CATEGORY_LABELS) as TarotQuestionCategoryId[];
const SCOPE_VALUES: TarotReadingScope[] = ['self', 'other'];

type TarotSession = {
  id: string;
  categoryId: TarotQuestionCategoryId;
  question: string;
  scope: TarotReadingScope;
  deck: TarotDeckCard[];
  createdAt: string;
  expiresAt: number;
};

export type TarotShuffleRequest = {
  categoryId?: unknown;
  question?: unknown;
  scope?: unknown;
};

export type TarotShuffleResponse = {
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

export type TarotReadingRequest = {
  sessionId?: unknown;
  deckKey?: unknown;
};

export type TarotInterpretRequest = {
  reading?: unknown;
};

export type TarotReadingResponse = {
  ok: true;
  engineVersion: string;
  reading: TarotReading;
  card: TarotCard;
  interpretation: TarotInterpretationOutput;
  integrationSignal: TarotIntegrationSignal;
  stats: TarotStatsSnapshot;
};

export type TarotInterpretResponse = {
  ok: true;
  engineVersion: string;
  reading: TarotReading;
  card: TarotCard;
  interpretation: TarotInterpretationOutput;
};

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
  orientation: Record<TarotOrientation, number>;
  categoryCounts: Partial<Record<TarotQuestionCategoryId, number>>;
  cardCounts: Record<string, number>;
  lastUpdatedAt?: string;
};

type MutableStats = TarotStatsSnapshot;

const tarotSessions = new Map<string, TarotSession>();

async function readSessionStore(): Promise<Record<string, TarotSession>> {
  try {
    const raw = await readFile(SESSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, TarotSession>;
  } catch {
    return {};
  }
}

async function writeSessionStore(sessions: Record<string, TarotSession>): Promise<void> {
  await mkdir(path.dirname(SESSIONS_FILE), { recursive: true });
  await writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
}

async function cleanupPersistedSessions(): Promise<void> {
  const sessions = await readSessionStore();
  const now = Date.now();
  let changed = false;
  for (const [sessionId, session] of Object.entries(sessions)) {
    if (!session || session.expiresAt <= now) {
      delete sessions[sessionId];
      changed = true;
    }
  }
  if (changed) await writeSessionStore(sessions);
}

async function persistSession(session: TarotSession): Promise<void> {
  const sessions = await readSessionStore();
  sessions[session.id] = session;
  await writeSessionStore(sessions);
}

async function getStoredSession(sessionId: string): Promise<TarotSession | undefined> {
  const memorySession = tarotSessions.get(sessionId);
  if (memorySession) return memorySession;

  const sessions = await readSessionStore();
  return sessions[sessionId];
}

async function deleteStoredSession(sessionId: string): Promise<void> {
  tarotSessions.delete(sessionId);
  const sessions = await readSessionStore();
  if (sessions[sessionId]) {
    delete sessions[sessionId];
    await writeSessionStore(sessions);
  }
}

function deckIntegrity() {
  const major = TAROT_CARDS.filter((card) => card.arcana === 'major').length;
  const minor = TAROT_CARDS.filter((card) => card.arcana === 'minor').length;
  return {
    total: TAROT_CARDS.length,
    major,
    minor,
    complete: major === 22 && minor === 56 && TAROT_CARDS.length === 78,
  };
}

function emptyStats(): MutableStats {
  return {
    engineVersion: TAROT_ENGINE_VERSION,
    deckSize: TAROT_CARDS.length,
    deckIntegrity: deckIntegrity(),
    totals: {
      shuffles: 0,
      readings: 0,
      selfReadings: 0,
      otherReadings: 0,
    },
    orientation: {
      upright: 0,
      reversed: 0,
    },
    categoryCounts: {},
    cardCounts: {},
  };
}

async function readStats(): Promise<MutableStats> {
  try {
    const raw = await readFile(STATS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<MutableStats>;
    return {
      ...emptyStats(),
      ...parsed,
      engineVersion: TAROT_ENGINE_VERSION,
      deckSize: TAROT_CARDS.length,
      deckIntegrity: deckIntegrity(),
      totals: {
        ...emptyStats().totals,
        ...(parsed.totals ?? {}),
      },
      orientation: {
        upright: parsed.orientation?.upright ?? 0,
        reversed: parsed.orientation?.reversed ?? 0,
      },
      categoryCounts: parsed.categoryCounts ?? {},
      cardCounts: parsed.cardCounts ?? {},
    };
  } catch {
    return emptyStats();
  }
}

async function writeStats(stats: MutableStats): Promise<void> {
  await mkdir(path.dirname(STATS_FILE), { recursive: true });
  await writeFile(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
}

async function updateStats(mutator: (stats: MutableStats) => void): Promise<TarotStatsSnapshot> {
  const stats = await readStats();
  mutator(stats);
  stats.lastUpdatedAt = new Date().toISOString();
  await writeStats(stats);
  return stats;
}

function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, session] of tarotSessions.entries()) {
    if (session.expiresAt <= now) tarotSessions.delete(sessionId);
  }
}

function validateCategory(value: unknown): TarotQuestionCategoryId | null {
  return typeof value === 'string' && CATEGORY_VALUES.includes(value as TarotQuestionCategoryId)
    ? value as TarotQuestionCategoryId
    : null;
}

function validateScope(value: unknown): TarotReadingScope {
  return typeof value === 'string' && SCOPE_VALUES.includes(value as TarotReadingScope)
    ? value as TarotReadingScope
    : 'self';
}

function validateQuestion(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const question = value.trim();
  if (question.length < 4 || question.length > 160) return null;
  return question;
}

function createOrientation(): TarotOrientation {
  return randomInt(0, 2) === 0 ? 'upright' : 'reversed';
}

function createDeck(): TarotDeckCard[] {
  const deck = TAROT_CARDS.map((card, index) => ({
    deckKey: `${card.id}_${index}_${randomUUID()}`,
    cardId: card.id,
    orientation: createOrientation(),
    order: index,
  }));

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const targetIndex = randomInt(0, index + 1);
    [deck[index], deck[targetIndex]] = [deck[targetIndex], deck[index]];
  }

  return deck.map((card, order) => ({ ...card, order }));
}

function createInterpretation(reading: TarotReading, card: TarotCard): TarotInterpretationOutput {
  const keywords = reading.orientation === 'upright' ? card.uprightKeywords : card.reversedKeywords;
  const baseMeaning = reading.orientation === 'upright' ? card.uprightMeaning : card.reversedMeaning;
  return generateTarotInterpretation({
    category: reading.category,
    question: reading.question,
    cardName: card.nameZh,
    orientation: reading.orientation,
    keywords,
    baseMeaning,
    reflectionPrompt: card.reflectionPrompt,
    symbolism: card.symbolism,
    elementWeights: card.elementWeights,
  });
}

function orientationAdjustedWeights(weights: TarotElementWeights, orientation: TarotOrientation): TarotElementWeights {
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

function createIntegrationSignal(reading: TarotReading, card: TarotCard): TarotIntegrationSignal {
  return {
    id: randomUUID(),
    source: 'tarot',
    readingId: reading.id,
    scope: reading.scope,
    cardId: card.id,
    categoryId: reading.category,
    question: reading.question,
    orientation: reading.orientation,
    elementWeights: orientationAdjustedWeights(card.elementWeights, reading.orientation),
    symbolism: card.symbolism,
    canUpdateGrowthCenter: reading.scope === 'self',
    singleUseOnly: reading.scope === 'other',
    createdAt: new Date().toISOString(),
  };
}

export function getTarotDeckIntegrity() {
  return deckIntegrity();
}

export async function getTarotStats(): Promise<TarotStatsSnapshot> {
  return readStats();
}

export async function createTarotShuffle(body: TarotShuffleRequest): Promise<TarotShuffleResponse> {
  cleanupSessions();
  await cleanupPersistedSessions();

  const categoryId = validateCategory(body.categoryId);
  const question = validateQuestion(body.question);
  const scope = validateScope(body.scope);

  if (!categoryId) throw new Error('請選擇有效的塔羅問題分類。');
  if (!question) throw new Error('請輸入 4 到 160 字內的塔羅問題。');

  const integrity = deckIntegrity();
  if (!integrity.complete) throw new Error('塔羅牌庫尚未完整，必須確認 78 張牌後才能洗牌。');

  const deck = createDeck();
  const sessionId = randomUUID();
  const createdAt = new Date().toISOString();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const session: TarotSession = {
    id: sessionId,
    categoryId,
    question,
    scope,
    deck,
    createdAt,
    expiresAt,
  };

  tarotSessions.set(sessionId, session);
  await persistSession(session);

  await updateStats((stats) => {
    stats.totals.shuffles += 1;
  });

  return {
    ok: true,
    engineVersion: TAROT_ENGINE_VERSION,
    sessionId,
    categoryId,
    question,
    scope,
    deckSize: deck.length,
    visibleDeck: deck.slice(0, VISIBLE_DECK_COUNT),
    deckIntegrity: integrity,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

function normalizeReadingForInterpret(value: unknown): TarotReading | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<TarotReading>;
  const category = validateCategory(item.category);
  const scope = validateScope(item.scope);
  if (typeof item.id !== 'string' || !item.id) return null;
  if (!category) return null;
  if (typeof item.question !== 'string' || !validateQuestion(item.question)) return null;
  if (typeof item.cardId !== 'string' || !item.cardId) return null;
  if (item.orientation !== 'upright' && item.orientation !== 'reversed') return null;
  if (typeof item.createdAt !== 'string' || Number.isNaN(Date.parse(item.createdAt))) return null;

  return {
    id: item.id,
    category,
    question: item.question.trim(),
    cardId: item.cardId,
    orientation: item.orientation,
    scope,
    integrationSignalId: typeof item.integrationSignalId === 'string' ? item.integrationSignalId : undefined,
    createdAt: item.createdAt,
  };
}

export function createTarotInterpretation(body: TarotInterpretRequest): TarotInterpretResponse {
  const reading = normalizeReadingForInterpret(body.reading);
  if (!reading) throw new Error('缺少有效的塔羅解讀紀錄。');

  const card = TAROT_CARDS.find((item) => item.id === reading.cardId);
  if (!card) throw new Error('找不到這筆紀錄對應的牌面資料。');

  return {
    ok: true,
    engineVersion: TAROT_ENGINE_VERSION,
    reading,
    card,
    interpretation: createInterpretation(reading, card),
  };
}
export async function createTarotReading(body: TarotReadingRequest): Promise<TarotReadingResponse> {
  cleanupSessions();
  await cleanupPersistedSessions();

  if (typeof body.sessionId !== 'string' || !body.sessionId) throw new Error('缺少有效的塔羅洗牌場次。');
  if (typeof body.deckKey !== 'string' || !body.deckKey) throw new Error('請選擇一張有效牌背。');

  const session = await getStoredSession(body.sessionId);
  if (!session) throw new Error('這次洗牌場次已失效，請重新洗牌。');

  const deckCard = session.deck.find((card) => card.deckKey === body.deckKey);
  if (!deckCard) throw new Error('找不到你選擇的牌背，請重新洗牌。');

  const card = TAROT_CARDS.find((item) => item.id === deckCard.cardId);
  if (!card) throw new Error('這張牌的資料不存在，請重新洗牌。');

  const readingBase: TarotReading = {
    id: randomUUID(),
    category: session.categoryId,
    question: session.question,
    cardId: card.id,
    orientation: deckCard.orientation,
    scope: session.scope,
    createdAt: new Date().toISOString(),
  };
  const integrationSignal = createIntegrationSignal(readingBase, card);
  const reading: TarotReading = {
    ...readingBase,
    integrationSignalId: integrationSignal.id,
  };
  const interpretation = createInterpretation(reading, card);

  const stats = await updateStats((nextStats) => {
    nextStats.totals.readings += 1;
    if (reading.scope === 'self') nextStats.totals.selfReadings += 1;
    if (reading.scope === 'other') nextStats.totals.otherReadings += 1;
    nextStats.orientation[reading.orientation] += 1;
    nextStats.categoryCounts[reading.category] = (nextStats.categoryCounts[reading.category] ?? 0) + 1;
    nextStats.cardCounts[reading.cardId] = (nextStats.cardCounts[reading.cardId] ?? 0) + 1;
  });

  await deleteStoredSession(session.id);

  return {
    ok: true,
    engineVersion: TAROT_ENGINE_VERSION,
    reading,
    card,
    interpretation,
    integrationSignal,
    stats,
  };
}