import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { TAROT_CARDS } from '@/features/tarot/data/cards';
import { TAROT_CARD_BACK_ALT, TAROT_CARD_BACK_URL, TAROT_DECK_STYLE_ID } from '@/features/tarot/constants/cardBack';
import { generateTarotInterpretation } from '@/features/tarot/services/interpretation';
import {
  TAROT_CATEGORY_LABELS,
  TAROT_VISIBLE_DECK_COUNT,
  type TarotAiElement,
  type TarotCard,
  type TarotCardBackResource,
  type TarotCardResource,
  type TarotDeckCard,
  type TarotDrawOutputContract,
  type TarotDrawResultItem,
  type TarotDrawRhythm,
  type TarotRevealSequenceItem,
  type TarotShuffleSequenceItem,
  type TarotSpreadSequenceItem,
  type TarotElementPriority,
  type TarotElementWeights,
  type TarotEngineCrossCheck,
  type TarotIntegrationSignal,
  type TarotInterpretationCardInput,
  type TarotInterpretationOutput,
  type TarotOrientation,
  type TarotQuestionCategoryId,
  type TarotReading,
  type TarotReadingCard,
  type TarotReadingScope,
  type TarotSpreadType,
  type TarotSystemReadiness,
} from '@/features/tarot/types';

export const TAROT_ENGINE_VERSION = 'tarot-system-v1.2.0';
export const TAROT_PUBLIC_TITLE = '塔羅牌';
const SESSION_TTL_MS = 20 * 60 * 1000;
const VISIBLE_DECK_COUNT = TAROT_VISIBLE_DECK_COUNT;
const TAROT_CARD_BACK_RESOURCE: TarotCardBackResource = {
  styleId: TAROT_DECK_STYLE_ID,
  imageAlt: TAROT_CARD_BACK_ALT,
  imageUrl: TAROT_CARD_BACK_URL,
};
const TAROT_DRAW_RHYTHM: TarotDrawRhythm = {
  shuffleMs: 3600,
  shuffleSettleMs: 460,
  spreadMs: 760,
  spreadSettleMs: 420,
  selectionFeedbackMs: 220,
  revealStaggerMs: 420,
  revealFlipMs: 720,
  resultSettleMs: 520,
};

const CATEGORY_VALUES = Object.keys(TAROT_CATEGORY_LABELS) as TarotQuestionCategoryId[];
const SCOPE_VALUES: TarotReadingScope[] = ['self', 'other'];
const SPREAD_VALUES: TarotSpreadType[] = ['single', 'three_card'];
const ELEMENT_ORDER: TarotAiElement[] = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'];
const ELEMENT_LABELS: Record<TarotAiElement, string> = {
  AIR: '風',
  SPACE: '空',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};
const SPREAD_CARD_COUNT: Record<TarotSpreadType, number> = {
  single: 1,
  three_card: 3,
};
const SPREAD_POSITIONS: Record<TarotSpreadType, Array<Pick<TarotReadingCard, 'positionKey' | 'positionLabel'>>> = {
  single: [{ positionKey: 'core', positionLabel: '核心' }],
  three_card: [
    { positionKey: 'situation', positionLabel: '現況' },
    { positionKey: 'challenge', positionLabel: '阻礙' },
    { positionKey: 'action', positionLabel: '行動' },
  ],
};
const CATEGORY_EVENT_MULTIPLIER: Partial<Record<TarotQuestionCategoryId, Partial<Record<TarotAiElement, number>>>> = {
  love: { WATER: 1.18, AIR: 1.05 },
  career: { FIRE: 1.15, EARTH: 1.08 },
  finance: { EARTH: 1.18, AIR: 1.05 },
  business: { FIRE: 1.16, AIR: 1.08, EARTH: 1.06 },
  family: { WATER: 1.14, EARTH: 1.1 },
  social: { AIR: 1.12, WATER: 1.08 },
  study: { AIR: 1.16, SPACE: 1.08 },
  decision: { AIR: 1.12, FIRE: 1.08 },
  project: { FIRE: 1.12, EARTH: 1.1 },
  obstacle: { SPACE: 1.14, FIRE: 1.06 },
  growth: { SPACE: 1.16, WATER: 1.08 },
  near_future: { FIRE: 1.08, SPACE: 1.08 },
};

type TarotSession = {
  id: string;
  categoryId: TarotQuestionCategoryId;
  question: string;
  scope: TarotReadingScope;
  spreadType: TarotSpreadType;
  deck: TarotDeckCard[];
  createdAt: string;
  expiresAt: number;
};

export type TarotShuffleRequest = {
  categoryId?: unknown;
  question?: unknown;
  scope?: unknown;
  spreadType?: unknown;
};

export type TarotShuffleResponse = {
  ok: true;
  engineVersion: string;
  title: typeof TAROT_PUBLIC_TITLE;
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

export type TarotReadingRequest = {
  sessionId?: unknown;
  deckKey?: unknown;
  deckKeys?: unknown;
};

export type TarotDrawOutputRequest = TarotReadingRequest;

export type TarotDeckCatalogResponse = {
  ok: true;
  engineVersion: string;
  title: typeof TAROT_PUBLIC_TITLE;
  deckSize: number;
  deckIntegrity: ReturnType<typeof deckIntegrity>;
  cardBack: TarotCardBackResource;
  cards: TarotCardResource[];
  outputContract: TarotDrawOutputContract;
};

export type TarotDrawOutputResponse = {
  ok: true;
  engineVersion: string;
  title: typeof TAROT_PUBLIC_TITLE;
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

export type TarotInterpretRequest = {
  reading?: unknown;
};

export type TarotReadingResponse = {
  ok: true;
  engineVersion: string;
  title: typeof TAROT_PUBLIC_TITLE;
  reading: TarotReading;
  card: TarotCard;
  cards: TarotCard[];
  interpretation: TarotInterpretationOutput;
  integrationSignal: TarotIntegrationSignal;
  crossCheck: TarotEngineCrossCheck;
  stats: TarotStatsSnapshot;
};

export type TarotInterpretResponse = {
  ok: true;
  engineVersion: string;
  title: typeof TAROT_PUBLIC_TITLE;
  reading: TarotReading;
  card: TarotCard;
  cards: TarotCard[];
  interpretation: TarotInterpretationOutput;
};

export type TarotStatsSnapshot = {
  engineVersion: string;
  title: typeof TAROT_PUBLIC_TITLE;
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

type MutableStats = TarotStatsSnapshot;

const tarotRuntimeStore = ((globalThis as typeof globalThis & { __tarotRuntimeStore?: { sessions: Map<string, TarotSession> } }).__tarotRuntimeStore ??= {
  sessions: new Map<string, TarotSession>(),
});
const tarotSessions = tarotRuntimeStore.sessions;

// Vercel serverless functions do not share memory across instances, so a shuffle handled by one
// instance can be invisible to the draw-output/reading call that lands on another instance a few
// hundred ms later — the in-memory Map above then misses and users see a false "session expired"
// error. To make every instance able to answer regardless of which one handled the shuffle, the
// session id returned to the client is a self-contained, HMAC-signed token: any instance can
// verify and rebuild the session from the token alone, with the Map kept only as a same-instance
// fast path. This mirrors the inline-execution fix already applied to /api/analysis/jobs.
const TAROT_SESSION_SECRET = process.env.TAROT_SESSION_SECRET || process.env.JWT_SECRET || 'tarot-stateless-session-v1';

function encodeSessionToken(session: TarotSession): string {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  const signature = createHmac('sha256', TAROT_SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function decodeSessionToken(token: string): TarotSession | null {
  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex <= 0) return null;
  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = createHmac('sha256', TAROT_SESSION_SECRET).update(payload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TarotSession;
    if (!session || typeof session.id !== 'string' || !Array.isArray(session.deck) || typeof session.expiresAt !== 'number') return null;
    return session;
  } catch {
    return null;
  }
}

async function cleanupPersistedSessions(): Promise<void> {
  cleanupSessions();
}

/** Stores the session for same-instance reuse and returns the portable, signed session token. */
async function persistSession(session: TarotSession): Promise<string> {
  const token = encodeSessionToken(session);
  tarotSessions.set(token, session);
  return token;
}

async function getStoredSession(sessionToken: string): Promise<TarotSession | undefined> {
  const cached = tarotSessions.get(sessionToken);
  if (cached) return cached.expiresAt > Date.now() ? cached : undefined;

  const decoded = decodeSessionToken(sessionToken);
  if (!decoded || decoded.expiresAt <= Date.now()) return undefined;
  tarotSessions.set(sessionToken, decoded);
  return decoded;
}

async function deleteStoredSession(sessionToken: string): Promise<void> {
  tarotSessions.delete(sessionToken);
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

function hasCompleteElementWeights(card: TarotCard) {
  return ELEMENT_ORDER.every((element) => typeof card.elementWeights[element] === 'number' && Number.isFinite(card.elementWeights[element]));
}

function hasCompleteVisualKnowledge(card: TarotCard) {
  const knowledge = card.visualKnowledge;
  return Boolean(knowledge)
    && knowledge.cardId === card.id
    && Boolean(knowledge.coreMeaning)
    && Boolean(knowledge.uprightLogic)
    && Boolean(knowledge.reversedLogic)
    && knowledge.symbolicElements.length > 0
    && knowledge.immutableCore.length > 0
    && knowledge.creativeRules.length > 0
    && knowledge.originalZones.length > 0
    && Boolean(knowledge.composition.figure)
    && Boolean(knowledge.composition.scene)
    && Boolean(knowledge.composition.lighting)
    && Boolean(knowledge.composition.focalSymbol)
    && knowledge.validation.meaningConsistent
    && knowledge.validation.storyComplete
    && knowledge.validation.themeLocked
    && knowledge.validation.styleUnified
    && knowledge.validation.noDeckReproduction
    && knowledge.validation.readableWithoutName
    && knowledge.validation.checkpoints.length > 0;
}

function cardDataComplete() {
  return TAROT_CARDS.every((card) => (
    Boolean(card.id)
    && Boolean(card.nameZh)
    && Boolean(card.nameEn)
    && Boolean(card.imageUrl)
    && Boolean(card.uprightMeaning)
    && Boolean(card.reversedMeaning)
    && card.uprightKeywords.length > 0
    && card.reversedKeywords.length > 0
    && Boolean(card.symbolism)
    && hasCompleteElementWeights(card)
    && hasCompleteVisualKnowledge(card)
  ));
}

function createDrawOutputContract(stage: TarotDrawOutputContract['stage']): TarotDrawOutputContract {
  return {
    version: 'tarot_draw_output_v1',
    stage,
    aiInterpretation: false,
    integrationLayerWrite: false,
    growthCenterWrite: false,
  };
}

function getDrawRhythm(): TarotDrawRhythm {
  return { ...TAROT_DRAW_RHYTHM };
}

function toCardResource(card: TarotCard): TarotCardResource {
  return {
    id: card.id,
    number: card.number,
    nameZh: card.nameZh,
    nameEn: card.nameEn,
    arcana: card.arcana,
    suit: card.suit,
    imageUrl: card.imageUrl,
    imageAlt: `${card.nameZh} ${card.nameEn} 牌面`,
    uprightKeywords: [...card.uprightKeywords],
    reversedKeywords: [...card.reversedKeywords],
    uprightMeaning: card.uprightMeaning,
    reversedMeaning: card.reversedMeaning,
    reflectionPrompt: card.reflectionPrompt,
    symbolism: card.symbolism,
    elementWeights: { ...card.elementWeights },
    visualKnowledge: card.visualKnowledge,
  };
}

function createShuffleSequence(deck: TarotDeckCard[]): TarotShuffleSequenceItem[] {
  return deck.map((deckCard) => ({
    deckKey: deckCard.deckKey,
    cardId: deckCard.cardId,
    shuffleOrder: deckCard.order,
    orientation: deckCard.orientation,
  }));
}

function createSpreadSequence(deck: TarotDeckCard[]): TarotSpreadSequenceItem[] {
  return deck.slice(0, VISIBLE_DECK_COUNT).map((deckCard, index) => ({
    deckKey: deckCard.deckKey,
    cardId: deckCard.cardId,
    shuffleOrder: deckCard.order,
    spreadOrder: index,
    displaySlot: index + 1,
    orientation: deckCard.orientation,
    back: { ...TAROT_CARD_BACK_RESOURCE },
  }));
}

function createDrawResults(selectedDeckCards: TarotDeckCard[]): TarotDrawResultItem[] {
  return selectedDeckCards.map((deckCard, index) => {
    const card = TAROT_CARDS.find((item) => item.id === deckCard.cardId);
    if (!card) throw new Error('塔羅牌庫資料不完整，抽牌結果無法對應牌面。');
    return {
      deckKey: deckCard.deckKey,
      cardId: deckCard.cardId,
      shuffleOrder: deckCard.order,
      spreadOrder: deckCard.order,
      displaySlot: deckCard.order + 1,
      drawOrder: index,
      orientation: deckCard.orientation,
      back: { ...TAROT_CARD_BACK_RESOURCE },
      card: toCardResource(card),
    };
  });
}

function createRevealSequence(drawResults: TarotDrawResultItem[]): TarotRevealSequenceItem[] {
  return drawResults.map((result, index) => ({
    ...result,
    revealOrder: index,
    orientationLabel: result.orientation === 'upright' ? '正位' : '逆位',
  }));
}

function buildTarotReadiness(): TarotSystemReadiness {
  const integrity = deckIntegrity();
  const uniqueIds = new Set(TAROT_CARDS.map((card) => card.id));
  const unifiedArt = TAROT_CARDS.every((card) => card.imageUrl.startsWith('/tarot/freecodecamp-js-fortune-teller/assets/img/cards/') && card.imageUrl.endsWith('.png'));
  const checklist = [
    { id: 'deck_78', title: '78 張完整牌庫', complete: integrity.complete && uniqueIds.size === 78, detail: `${integrity.total} 張；大阿爾克那 ${integrity.major}；小阿爾克那 ${integrity.minor}` },
    { id: 'card_meaning', title: '每張牌含正位／逆位／象徵／關鍵字', complete: cardDataComplete(), detail: '每張牌均具備牌義、正逆位解釋、象徵與五元素權重。' },
    { id: 'unified_art', title: '同一套牌面風格', complete: unifiedArt, detail: '牌面統一使用 Rider-Waite Smith CC0 PNG 素材。' },
    { id: 'shuffle', title: 'Fisher-Yates 真洗牌', complete: true, detail: '後端使用 crypto randomInt 搭配 Fisher-Yates，每次重新排列 78 張。' },
    { id: 'user_draw', title: '使用者親手抽牌', complete: true, detail: '後端只提供牌背牌序與 session，AI 不代替使用者選牌。' },
    { id: 'orientation', title: '正逆位同步判定', complete: true, detail: '每張牌入牌堆時即以後端亂數決定正位或逆位。' },
    { id: 'spread', title: '一張牌與三張牌牌陣', complete: true, detail: '支援核心判定與現況／阻礙／行動三張牌交叉判定。' },
    { id: 'ai_interpretation', title: 'AI 交叉解讀', complete: true, detail: '解讀根據問題、類別、牌陣、牌位、正逆位與五元素權重產生。' },
    { id: 'route_isolation', title: '塔羅獨立路由與獨立 API', complete: true, detail: '頁面固定由 /tarot 進入，後端固定使用 /api/tarot/shuffle、/api/tarot/reading、/api/tarot/interpret，不走共用分析入口。' },
    { id: 'integration_layer', title: 'Integration Layer 分流', complete: true, detail: '塔羅只輸出整合訊號；自己可更新成長中心，親友只做單次分析。' },
    { id: 'five_elements', title: '五元素人格／事件權重', complete: true, detail: '塔羅提供人格權重、事件權重與總權重，最終由 Integration Layer 統一判定。' },
  ];
  const blockedReasons = checklist.filter((item) => !item.complete).map((item) => item.title);
  return {
    title: TAROT_PUBLIC_TITLE,
    productionReady: blockedReasons.length === 0,
    deckStyleId: TAROT_DECK_STYLE_ID,
    checklist,
    blockedReasons,
  };
}

function emptyStats(): MutableStats {
  return {
    engineVersion: TAROT_ENGINE_VERSION,
    title: TAROT_PUBLIC_TITLE,
    deckSize: TAROT_CARDS.length,
    deckIntegrity: deckIntegrity(),
    readiness: buildTarotReadiness(),
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

const tarotStatsStore = (globalThis as typeof globalThis & { __tarotStatsStore?: MutableStats }).__tarotStatsStore ??= emptyStats();

async function readStats(): Promise<MutableStats> {
  return {
    ...tarotStatsStore,
    engineVersion: TAROT_ENGINE_VERSION,
    title: TAROT_PUBLIC_TITLE,
    deckSize: TAROT_CARDS.length,
    deckIntegrity: deckIntegrity(),
    readiness: buildTarotReadiness(),
  };
}

async function writeStats(stats: MutableStats): Promise<void> {
  (globalThis as typeof globalThis & { __tarotStatsStore?: MutableStats }).__tarotStatsStore = stats;
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

function validateSpreadType(value: unknown): TarotSpreadType {
  return typeof value === 'string' && SPREAD_VALUES.includes(value as TarotSpreadType)
    ? value as TarotSpreadType
    : 'single';
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

function zeroWeights(): TarotElementWeights {
  return { AIR: 0, SPACE: 0, WATER: 0, FIRE: 0, EARTH: 0 };
}

function orientationAdjustedWeights(weights: TarotElementWeights, orientation: TarotOrientation): TarotElementWeights {
  if (orientation === 'upright') return { ...weights };

  const adjusted: TarotElementWeights = { ...weights };
  const strongest = ELEMENT_ORDER.reduce((current, element) => adjusted[element] > adjusted[current] ? element : current, 'SPACE');
  const shift = Math.min(8, adjusted[strongest]);

  adjusted[strongest] -= shift;
  adjusted.SPACE += Math.ceil(shift / 2);
  adjusted.WATER += Math.floor(shift / 2);

  return adjusted;
}

function applyWeightMultiplier(weights: TarotElementWeights, multiplier: number): TarotElementWeights {
  return Object.fromEntries(ELEMENT_ORDER.map((element) => [element, Math.round(weights[element] * multiplier)])) as TarotElementWeights;
}

function combineReadingWeights(readingCards: TarotReadingCard[], cards: TarotCard[]): TarotElementWeights {
  const combined = zeroWeights();
  readingCards.forEach((readingCard, index) => {
    const card = cards[index];
    if (!card) return;
    const adjusted = orientationAdjustedWeights(card.elementWeights, readingCard.orientation);
    const positionMultiplier = readingCard.positionKey === 'core' ? 1.12 : readingCard.positionKey === 'action' ? 1.08 : 1;
    ELEMENT_ORDER.forEach((element) => {
      combined[element] += Math.round((adjusted[element] ?? 0) * positionMultiplier);
    });
  });
  return combined;
}

function buildPersonalityWeights(readingCards: TarotReadingCard[], cards: TarotCard[]): TarotElementWeights {
  const combined = zeroWeights();
  readingCards.forEach((readingCard, index) => {
    const card = cards[index];
    if (!card) return;
    const base = orientationAdjustedWeights(card.elementWeights, readingCard.orientation);
    const arcanaMultiplier = card.arcana === 'major' ? 1.28 : 0.92;
    const positionMultiplier = readingCard.positionKey === 'challenge' ? 1.08 : 1;
    ELEMENT_ORDER.forEach((element) => {
      combined[element] += Math.round(base[element] * arcanaMultiplier * positionMultiplier);
    });
  });
  return combined;
}

function buildEventWeights(category: TarotQuestionCategoryId, readingCards: TarotReadingCard[], cards: TarotCard[]): TarotElementWeights {
  const combined = zeroWeights();
  const categoryMultiplier = CATEGORY_EVENT_MULTIPLIER[category] ?? {};
  readingCards.forEach((readingCard, index) => {
    const card = cards[index];
    if (!card) return;
    const base = orientationAdjustedWeights(card.elementWeights, readingCard.orientation);
    const arcanaMultiplier = card.arcana === 'minor' ? 1.16 : 0.96;
    const positionMultiplier = readingCard.positionKey === 'action' ? 1.18 : readingCard.positionKey === 'situation' ? 1.06 : 1;
    ELEMENT_ORDER.forEach((element) => {
      combined[element] += Math.round(base[element] * arcanaMultiplier * positionMultiplier * (categoryMultiplier[element] ?? 1));
    });
  });
  return combined;
}

function buildElementPriority(weights: TarotElementWeights): TarotElementPriority {
  return ELEMENT_ORDER
    .map((element) => ({ element, label: ELEMENT_LABELS[element], weight: weights[element] }))
    .sort((a, b) => b.weight - a.weight);
}

function createInterpretation(reading: TarotReading, cards: TarotCard[]): TarotInterpretationOutput {
  const readingCards = getReadingCards(reading);
  const primaryCard = cards[0];
  const primaryReadingCard = readingCards[0];
  const keywords = primaryReadingCard.orientation === 'upright' ? primaryCard.uprightKeywords : primaryCard.reversedKeywords;
  const baseMeaning = primaryReadingCard.orientation === 'upright' ? primaryCard.uprightMeaning : primaryCard.reversedMeaning;
  const drawnCards: TarotInterpretationCardInput[] = readingCards.map((readingCard, index) => {
    const card = cards[index];
    const cardKeywords = readingCard.orientation === 'upright' ? card.uprightKeywords : card.reversedKeywords;
    return {
      positionLabel: readingCard.positionLabel,
      cardName: card.nameZh,
      orientation: readingCard.orientation,
      keywords: cardKeywords,
      baseMeaning: readingCard.orientation === 'upright' ? card.uprightMeaning : card.reversedMeaning,
      reflectionPrompt: card.reflectionPrompt,
      symbolism: card.symbolism,
      elementWeights: orientationAdjustedWeights(card.elementWeights, readingCard.orientation),
    };
  });

  return generateTarotInterpretation({
    category: reading.category,
    question: reading.question,
    cardName: primaryCard.nameZh,
    orientation: primaryReadingCard.orientation,
    keywords,
    baseMeaning,
    reflectionPrompt: primaryCard.reflectionPrompt,
    symbolism: primaryCard.symbolism,
    elementWeights: combineReadingWeights(readingCards, cards),
    spreadType: reading.spreadType ?? 'single',
    drawnCards,
  });
}

function getReadingCards(reading: TarotReading): TarotReadingCard[] {
  if (reading.cards?.length) return reading.cards;
  return [{
    position: 0,
    positionKey: 'core',
    positionLabel: '核心',
    cardId: reading.cardId,
    orientation: reading.orientation,
    deckOrder: 0,
  }];
}

function createIntegrationSignal(reading: TarotReading, cards: TarotCard[]): TarotIntegrationSignal {
  const readingCards = getReadingCards(reading);
  const elementWeights = combineReadingWeights(readingCards, cards);
  const personalityWeights = buildPersonalityWeights(readingCards, cards);
  const eventWeights = buildEventWeights(reading.category, readingCards, cards);
  return {
    id: randomUUID(),
    source: 'tarot',
    readingId: reading.id,
    scope: reading.scope,
    cardId: reading.cardId,
    categoryId: reading.category,
    question: reading.question,
    orientation: reading.orientation,
    spreadType: reading.spreadType ?? 'single',
    cards: readingCards,
    elementWeights,
    personalityWeights,
    eventWeights,
    elementPriority: buildElementPriority(elementWeights),
    symbolism: cards.map((card, index) => `${readingCards[index]?.positionLabel ?? '牌位'}：${card.symbolism}`).join('\n'),
    canUpdateGrowthCenter: reading.scope === 'self',
    singleUseOnly: reading.scope === 'other',
    createdAt: new Date().toISOString(),
  };
}

function createCrossCheck(reading: TarotReading, readingCards: TarotReadingCard[], integrationSignal: TarotIntegrationSignal): TarotEngineCrossCheck {
  return {
    spreadType: reading.spreadType ?? 'single',
    drawCount: readingCards.length,
    selectedDeckOrders: readingCards.map((card) => card.deckOrder),
    orientationMix: {
      upright: readingCards.filter((card) => card.orientation === 'upright').length,
      reversed: readingCards.filter((card) => card.orientation === 'reversed').length,
    },
    positionMap: readingCards.map((card) => ({
      positionLabel: card.positionLabel,
      cardId: card.cardId,
      orientation: card.orientation,
      deckOrder: card.deckOrder,
    })),
    elementPriority: integrationSignal.elementPriority ?? buildElementPriority(integrationSignal.elementWeights),
    writePolicy: reading.scope === 'self' ? 'growth_center_update' : 'single_use_only',
  };
}

export function getTarotDeckIntegrity() {
  return deckIntegrity();
}

export function getTarotReadiness() {
  return buildTarotReadiness();
}

export function getTarotDeckCatalog(): TarotDeckCatalogResponse {
  return {
    ok: true,
    engineVersion: TAROT_ENGINE_VERSION,
    title: TAROT_PUBLIC_TITLE,
    deckSize: TAROT_CARDS.length,
    deckIntegrity: deckIntegrity(),
    cardBack: { ...TAROT_CARD_BACK_RESOURCE },
    cards: TAROT_CARDS.map(toCardResource),
    outputContract: createDrawOutputContract('deck'),
  };
}

export async function getTarotStats(): Promise<TarotStatsSnapshot> {
  return readStats();
}

export async function createTarotShuffle(body: TarotShuffleRequest): Promise<TarotShuffleResponse> {
  cleanupSessions();
  await cleanupPersistedSessions();

  const readiness = buildTarotReadiness();
  if (!readiness.productionReady) {
    throw new Error(`塔羅牌後端尚未完成：${readiness.blockedReasons.join('、')}`);
  }

  const categoryId = validateCategory(body.categoryId);
  const question = validateQuestion(body.question);
  const scope = validateScope(body.scope);
  const spreadType = validateSpreadType(body.spreadType);

  if (!categoryId) throw new Error('請選擇塔羅問題分類。');
  if (!question) throw new Error('請輸入 4 到 160 字內的塔羅問題。');

  const integrity = deckIntegrity();
  if (!integrity.complete) throw new Error('塔羅牌庫尚未完整，必須具備 78 張牌。');

  const deck = createDeck();
  const sessionId = randomUUID();
  const createdAt = new Date().toISOString();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const session: TarotSession = {
    id: sessionId,
    categoryId,
    question,
    scope,
    spreadType,
    deck,
    createdAt,
    expiresAt,
  };

  const sessionToken = await persistSession(session);

  await updateStats((stats) => {
    stats.totals.shuffles += 1;
  });

  return {
    ok: true,
    engineVersion: TAROT_ENGINE_VERSION,
    title: TAROT_PUBLIC_TITLE,
    sessionId: sessionToken,
    categoryId,
    question,
    scope,
    spreadType,
    requiredDrawCount: SPREAD_CARD_COUNT[spreadType],
    deckSize: deck.length,
    visibleDeck: deck.slice(0, VISIBLE_DECK_COUNT),
    cardBack: { ...TAROT_CARD_BACK_RESOURCE },
    shuffleSequence: createShuffleSequence(deck),
    spreadSequence: createSpreadSequence(deck),
    drawRhythm: getDrawRhythm(),
    outputContract: createDrawOutputContract('shuffle'),
    deckIntegrity: integrity,
    readiness,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

function normalizeReadingCard(value: unknown, index: number): TarotReadingCard | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<TarotReadingCard>;
  if (typeof item.cardId !== 'string' || !item.cardId) return null;
  if (item.orientation !== 'upright' && item.orientation !== 'reversed') return null;
  const position = Number.isFinite(item.position) ? Number(item.position) : index;
  const fallback = SPREAD_POSITIONS.three_card[position] ?? SPREAD_POSITIONS.single[0];
  return {
    position,
    positionKey: item.positionKey ?? fallback.positionKey,
    positionLabel: typeof item.positionLabel === 'string' && item.positionLabel ? item.positionLabel : fallback.positionLabel,
    cardId: item.cardId,
    orientation: item.orientation,
    deckOrder: Number.isFinite(item.deckOrder) ? Number(item.deckOrder) : index,
  };
}

function normalizeReadingForInterpret(value: unknown): TarotReading | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<TarotReading>;
  const category = validateCategory(item.category);
  const scope = validateScope(item.scope);
  const spreadType = validateSpreadType(item.spreadType);
  if (typeof item.id !== 'string' || !item.id) return null;
  if (!category) return null;
  if (typeof item.question !== 'string' || !validateQuestion(item.question)) return null;
  if (typeof item.cardId !== 'string' || !item.cardId) return null;
  if (item.orientation !== 'upright' && item.orientation !== 'reversed') return null;
  if (typeof item.createdAt !== 'string' || Number.isNaN(Date.parse(item.createdAt))) return null;

  const normalizedCards = Array.isArray(item.cards)
    ? item.cards.map((card, index) => normalizeReadingCard(card, index)).filter((card): card is TarotReadingCard => Boolean(card))
    : [];

  return {
    id: item.id,
    category,
    question: item.question.trim(),
    cardId: item.cardId,
    orientation: item.orientation,
    scope,
    spreadType: normalizedCards.length >= 3 ? 'three_card' : spreadType,
    cards: normalizedCards.length ? normalizedCards : undefined,
    integrationSignalId: typeof item.integrationSignalId === 'string' ? item.integrationSignalId : undefined,
    createdAt: item.createdAt,
  };
}

export function createTarotInterpretation(body: TarotInterpretRequest): TarotInterpretResponse {
  const reading = normalizeReadingForInterpret(body.reading);
  if (!reading) throw new Error('缺少有效塔羅抽牌資料。');

  const readingCards = getReadingCards(reading);
  const cards = readingCards.map((readingCard) => TAROT_CARDS.find((item) => item.id === readingCard.cardId));
  if (cards.some((card) => !card)) throw new Error('牌面資料不存在，請重新抽牌。');
  const safeCards = cards as TarotCard[];

  return {
    ok: true,
    engineVersion: TAROT_ENGINE_VERSION,
    title: TAROT_PUBLIC_TITLE,
    reading,
    card: safeCards[0],
    cards: safeCards,
    interpretation: createInterpretation(reading, safeCards),
  };
}

function normalizeDeckKeys(body: TarotReadingRequest, expectedCount: number): string[] {
  const rawKeys = Array.isArray(body.deckKeys)
    ? body.deckKeys
    : typeof body.deckKey === 'string'
      ? [body.deckKey]
      : [];
  const deckKeys = rawKeys.filter((key): key is string => typeof key === 'string' && key.length > 0);
  const uniqueKeys = Array.from(new Set(deckKeys));
  if (uniqueKeys.length !== expectedCount) {
    throw new Error(`本牌陣必須由使用者親手選出 ${expectedCount} 張牌。`);
  }
  return uniqueKeys;
}

export async function createTarotDrawOutput(body: TarotDrawOutputRequest): Promise<TarotDrawOutputResponse> {
  cleanupSessions();
  await cleanupPersistedSessions();

  if (typeof body.sessionId !== 'string' || !body.sessionId) throw new Error('缺少塔羅洗牌 session。');

  const session = await getStoredSession(body.sessionId);
  if (!session) throw new Error('塔羅洗牌 session 已失效，請重新洗牌。');

  const spreadType = session.spreadType ?? 'single';
  const expectedCount = SPREAD_CARD_COUNT[spreadType];
  const deckKeys = normalizeDeckKeys(body, expectedCount);
  const visibleDeckKeys = new Set(session.deck.slice(0, VISIBLE_DECK_COUNT).map((deckCard) => deckCard.deckKey));
  const selectedDeckCards = deckKeys.map((deckKey) => {
    const deckCard = session.deck.find((card) => card.deckKey === deckKey);
    if (!deckCard) throw new Error('選牌資料不在本次洗牌 session 內。');
    if (!visibleDeckKeys.has(deckKey)) throw new Error('選牌必須來自本次展開的牌背。');
    return deckCard;
  });

  const drawResults = createDrawResults(selectedDeckCards);

  return {
    ok: true,
    engineVersion: TAROT_ENGINE_VERSION,
    title: TAROT_PUBLIC_TITLE,
    sessionId: session.id,
    scope: session.scope,
    spreadType,
    requiredDrawCount: expectedCount,
    deckSize: session.deck.length,
    selectedDeckKeys: deckKeys,
    drawResults,
    revealSequence: createRevealSequence(drawResults),
    drawRhythm: getDrawRhythm(),
    outputContract: createDrawOutputContract('draw'),
    createdAt: new Date().toISOString(),
  };
}

export async function createTarotReading(body: TarotReadingRequest): Promise<TarotReadingResponse> {
  cleanupSessions();
  await cleanupPersistedSessions();

  if (typeof body.sessionId !== 'string' || !body.sessionId) throw new Error('缺少塔羅洗牌 session。');

  const session = await getStoredSession(body.sessionId);
  if (!session) throw new Error('洗牌已過期，請重新洗牌。');

  const spreadType = session.spreadType ?? 'single';
  const expectedCount = SPREAD_CARD_COUNT[spreadType];
  const deckKeys = normalizeDeckKeys(body, expectedCount);
  const positions = SPREAD_POSITIONS[spreadType];
  const selectedDeckCards = deckKeys.map((deckKey) => {
    const deckCard = session.deck.find((card) => card.deckKey === deckKey);
    if (!deckCard) throw new Error('選到的牌不屬於本次洗牌，請重新洗牌。');
    return deckCard;
  });

  const cards = selectedDeckCards.map((deckCard) => {
    const card = TAROT_CARDS.find((item) => item.id === deckCard.cardId);
    if (!card) throw new Error('牌面資料缺失，請重新洗牌。');
    return card;
  });

  const readingCards: TarotReadingCard[] = selectedDeckCards.map((deckCard, index) => ({
    position: index,
    positionKey: positions[index].positionKey,
    positionLabel: positions[index].positionLabel,
    cardId: deckCard.cardId,
    orientation: deckCard.orientation,
    deckOrder: deckCard.order,
  }));

  const readingBase: TarotReading = {
    id: randomUUID(),
    category: session.categoryId,
    question: session.question,
    cardId: readingCards[0].cardId,
    orientation: readingCards[0].orientation,
    scope: session.scope,
    spreadType,
    cards: readingCards,
    createdAt: new Date().toISOString(),
  };
  const integrationSignal = createIntegrationSignal(readingBase, cards);
  const reading: TarotReading = {
    ...readingBase,
    integrationSignalId: integrationSignal.id,
  };
  const interpretation = createInterpretation(reading, cards);
  const crossCheck = createCrossCheck(reading, readingCards, integrationSignal);

  const stats = await updateStats((nextStats) => {
    nextStats.totals.readings += 1;
    if (reading.scope === 'self') nextStats.totals.selfReadings += 1;
    if (reading.scope === 'other') nextStats.totals.otherReadings += 1;
    readingCards.forEach((readingCard) => {
      nextStats.orientation[readingCard.orientation] += 1;
      nextStats.cardCounts[readingCard.cardId] = (nextStats.cardCounts[readingCard.cardId] ?? 0) + 1;
    });
    nextStats.categoryCounts[reading.category] = (nextStats.categoryCounts[reading.category] ?? 0) + 1;
  });

  await deleteStoredSession(body.sessionId as string);

  return {
    ok: true,
    engineVersion: TAROT_ENGINE_VERSION,
    title: TAROT_PUBLIC_TITLE,
    reading,
    card: cards[0],
    cards,
    interpretation,
    integrationSignal,
    crossCheck,
    stats,
  };
}
