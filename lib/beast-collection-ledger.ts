/** Pure inventory ledger. Battle outcomes come from the game API; this only moves owned copies. */
export interface CollectionEntry {
  id: string;
  cardId: string;
  at: string;
  source: 'GROWTH' | 'DUEL_WIN';
}
export interface CollectionHistoryItem {
  at: string;
  kind: 'WON' | 'FORFEITED' | 'RETURNED';
  cardId: string | null;
  note: string;
  remaining?: number;
}
export interface StakeOutcome {
  verdict: 'WON' | 'LOST' | 'RETURNED';
  gainedCardId: string | null;
  forfeitedCardId: string | null;
  message: string;
  stakes: { player: string; opponent: string };
}
export interface CollectionReceipt {
  matchId: string;
  verdict: StakeOutcome['verdict'];
  cardId: string | null;
  remaining: number;
  total: number;
}
export interface BeastCollection {
  cards: CollectionEntry[];
  history: CollectionHistoryItem[];
  /** Growth grants stay claimed even after the actual copy is lost. */
  granted?: string[];
  receipts?: Record<string, CollectionReceipt>;
  pending?: { id: string; cardId: string; entryId: string; at: string } | null;
  storageError?: string;
}

export function isBeastCardId(value: unknown): value is string {
  return typeof value === 'string' && (/^beast_[ay](0[1-9]|1[0-9]|2[0-8])$/.test(value)
    || /^beast_g_(qinglong|zhuque|baihu|xuanwu)$/.test(value));
}

/** Keep old won copies; give each one a stable instance ID. Never infer past losses. */
export function migrateCollection(value: unknown): BeastCollection {
  if (!value || typeof value !== 'object') throw new Error('收藏資料無法讀取，請先保留資料。');
  const old = value as BeastCollection;
  if (!Array.isArray(old.cards) || !Array.isArray(old.history)) throw new Error('收藏格式無法讀取，暫不開放押注。');
  if (old.cards.some((card) => !isBeastCardId(card?.cardId))) throw new Error('收藏中有無法辨識的卡，暫不開放押注。');
  return {
    cards: old.cards.map((card, index) => ({ ...card, id: card.id || `legacy:${index}:${card.cardId}`, source: card.source === 'GROWTH' ? 'GROWTH' : 'DUEL_WIN' })),
    history: old.history.slice(0, 60),
    granted: Array.isArray(old.granted) ? old.granted : [],
    receipts: old.receipts && typeof old.receipts === 'object' ? old.receipts : {},
    pending: old.pending ?? null,
  };
}

export function grantGrowthCards(current: BeastCollection, cardIds: string[], at: string): BeastCollection {
  const granted = new Set(current.granted ?? []);
  const cards = [...current.cards];
  for (const cardId of new Set(cardIds)) {
    if (!isBeastCardId(cardId) || granted.has(cardId)) continue;
    granted.add(cardId);
    cards.push({ id: `growth:${cardId}`, cardId, at, source: 'GROWTH' });
  }
  return { ...current, cards, granted: [...granted] };
}

export function reserveCard(current: BeastCollection, cardId: string, matchId: string, at: string): BeastCollection {
  if (current.pending) throw new Error('上一場尚待結算，請先處理上一場。');
  if (current.receipts?.[matchId]) throw new Error('這一場已經結算。');
  const card = current.cards.find((entry) => entry.cardId === cardId);
  if (!card) throw new Error('這張卡已不在你的成長收藏，請重新選擇。');
  return { ...current, pending: { id: matchId, cardId, entryId: card.id, at } };
}

export function settleCard(current: BeastCollection, matchId: string, outcome: StakeOutcome, at: string): {
  collection: BeastCollection; receipt: CollectionReceipt; duplicate: boolean;
} {
  const previous = current.receipts?.[matchId];
  if (previous) return { collection: current, receipt: previous, duplicate: true };
  const pending = current.pending;
  if (!pending || pending.id !== matchId || pending.cardId !== outcome.stakes?.player) throw new Error('押注紀錄不一致，暫停結算。');
  const index = current.cards.findIndex((card) => card.id === pending.entryId && card.cardId === pending.cardId);
  if (index < 0) throw new Error('押注卡不存在，沒有扣卡或發獎。');
  if (!isBeastCardId(outcome.stakes.opponent)
    || (outcome.verdict === 'WON' && (outcome.gainedCardId !== outcome.stakes.opponent || outcome.forfeitedCardId !== null))
    || (outcome.verdict === 'LOST' && (outcome.forfeitedCardId !== pending.cardId || outcome.gainedCardId !== null))
    || (outcome.verdict === 'RETURNED' && (outcome.gainedCardId !== null || outcome.forfeitedCardId !== null))
    || !['WON', 'LOST', 'RETURNED'].includes(outcome.verdict)) throw new Error('戰果資料不完整，暫停結算。');
  const cards = [...current.cards];
  if (outcome.verdict === 'WON') cards.unshift({ id: `duel:${matchId}`, cardId: outcome.gainedCardId!, at, source: 'DUEL_WIN' });
  if (outcome.verdict === 'LOST') cards.splice(index, 1);
  const cardId = outcome.gainedCardId ?? outcome.forfeitedCardId ?? pending.cardId;
  const receipt: CollectionReceipt = { matchId, verdict: outcome.verdict, cardId, remaining: cards.filter((card) => card.cardId === cardId).length, total: cards.length };
  const kind: CollectionHistoryItem['kind'] = outcome.verdict === 'WON' ? 'WON' : outcome.verdict === 'LOST' ? 'FORFEITED' : 'RETURNED';
  return {
    collection: { ...current, cards, pending: null, receipts: { ...current.receipts, [matchId]: receipt }, history: [{ at, kind, cardId, note: outcome.message, remaining: receipt.remaining }, ...current.history].slice(0, 60) },
    receipt, duplicate: false,
  };
}
