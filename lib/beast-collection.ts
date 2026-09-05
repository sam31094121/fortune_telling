'use client';

import { deriveUnlockedMansions, gameCardIdsForMansion } from './beast-growth-rewards';
import { grantGrowthCards, migrateCollection, reserveCard, settleCard, type BeastCollection, type CollectionReceipt, type StakeOutcome } from './beast-collection-ledger';
export type { BeastCollection, CollectionEntry, CollectionHistoryItem, CollectionReceipt } from './beast-collection-ledger';

const COLLECTION_KEY = 'tdh_beast_collection_v1';
const JOURNAL_KEY = 'tdh_beast_duel_pending_v1';
export const COLLECTION_UPDATED = 'tdh-beast-collection-updated';
export const COLLECTION_STORAGE_NOTICE = '收藏保存在此瀏覽器；換手機或清除網站資料不會保留。';
const LOCK = 'tdh-beast-collection';
const EMPTY: BeastCollection = { cards: [], history: [], granted: [], receipts: {} };
const now = () => new Date().toISOString();

function readJson(key: string, fallback: unknown): unknown {
  const value = window.localStorage.getItem(key);
  return value ? JSON.parse(value) : fallback;
}

function readStrict(): BeastCollection {
  const current = migrateCollection(readJson(COLLECTION_KEY, EMPTY));
  const earned = deriveUnlockedMansions(
    readJson('tdh_growth_completed_modules_v1', []),
    readJson('tdh_growth_checkin_history_v4', {}),
  ).flatMap(gameCardIdsForMansion);
  return grantGrowthCards(current, earned, now());
}

/** Reading never writes or overwrites corrupt storage. Mutations run under one cross-tab lock. */
export function readCollection(): BeastCollection {
  if (typeof window === 'undefined') return EMPTY;
  try { return readStrict(); } catch {
    return { ...EMPTY, storageError: '收藏資料暫時無法讀取，請勿清除網站資料。' };
  }
}

function write(collection: BeastCollection): void {
  window.localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
  window.dispatchEvent(new Event(COLLECTION_UPDATED));
}

export function subscribeCollection(refresh: () => void): () => void {
  const events = ['storage', 'focus', COLLECTION_UPDATED, 'tdh-growth-progress-updated'];
  events.forEach((event) => window.addEventListener(event, refresh));
  return () => events.forEach((event) => window.removeEventListener(event, refresh));
}

async function exclusive<T>(action: () => Promise<T> | T): Promise<T> {
  // Without a cross-tab lock we cannot promise that two pages won't stake the same copy.
  if (!navigator.locks) throw new Error('這個瀏覽器暫不支援安全押注，請改用新版瀏覽器。');
  return navigator.locks.request(LOCK, { ifAvailable: true }, async (lock) => {
    if (!lock) throw new Error('另一個分頁正在處理這場對戰，請稍後再試。');
    return action();
  });
}

type AwardResult = { ok: boolean; isReplay?: boolean; stake?: StakeOutcome; error?: string };
export type Settlement = { saved: boolean; receipt: CollectionReceipt | null; matchId: string; error?: string };

/** Caller must hold the lock. Receipts persist independently of trimmed visible history. */
function applyStakeOutcome(matchId: string, outcome: StakeOutcome): Settlement {
  try {
    const result = settleCard(readStrict(), matchId, outcome, now());
    if (!result.duplicate) write(result.collection);
    try { window.localStorage.removeItem(JOURNAL_KEY); } catch { /* Receipt makes recovery idempotent. */ }
    return { saved: true, receipt: result.receipt, matchId };
  } catch (error) {
    return { saved: false, receipt: null, matchId, error: error instanceof Error ? error.message : '收藏尚未保存，請重試。' };
  }
}

/** Reserve a real copy before requesting; settle the API result before playing animations. */
export async function runOwnedDuel<T extends AwardResult>(cardId: string, play: () => Promise<T>): Promise<{ result: T; settlement: Settlement }> {
  return exclusive(async () => {
    const matchId = crypto.randomUUID();
    write(reserveCard(readStrict(), cardId, matchId, now()));
    let result: T;
    try {
      result = await play();
      if (!result.ok || !result.stake || result.isReplay) throw new Error(result.error ?? '這場沒有有效戰果，押注卡未扣除。');
    } catch (error) {
      const current = readStrict();
      if (current.pending?.id === matchId) write({ ...current, pending: null });
      throw error;
    }
    // Recover after reload/crash between receiving the outcome and storing the collection.
    try { window.localStorage.setItem(JOURNAL_KEY, JSON.stringify({ matchId, result })); } catch { /* Try the atomic ledger write; failures remain pending. */ }
    return { result, settlement: applyStakeOutcome(matchId, result.stake!) };
  });
}

export async function retryStakeSettlement(matchId: string, outcome: StakeOutcome): Promise<Settlement> {
  return exclusive(() => applyStakeOutcome(matchId, outcome));
}

/** An interrupted request without a received outcome never confiscates a customer's card. */
export async function recoverPendingDuel<T extends AwardResult>(): Promise<{ result?: T; settlement?: Settlement; interrupted?: boolean }> {
  return exclusive(() => {
    const current = readStrict();
    const journal = readJson(JOURNAL_KEY, null) as { matchId: string; result: T } | null;
    if (journal?.result?.stake) {
      return { result: journal.result, settlement: applyStakeOutcome(journal.matchId, journal.result.stake) };
    }
    if (current.pending) {
      write({ ...current, pending: null });
      return { interrupted: true };
    }
    return {};
  });
}

export function countByCard(collection: BeastCollection): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of collection.cards) counts.set(entry.cardId, (counts.get(entry.cardId) ?? 0) + 1);
  return counts;
}

export async function clearCollection(): Promise<void> {
  await exclusive(() => {
    const current = readStrict();
    if (current.pending) throw new Error('請先完成上一場結算。');
    write({ ...current, cards: [], history: [] });
  });
}
