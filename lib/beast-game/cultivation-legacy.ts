import 'server-only';
import { parseShardLedger, type ShardLedger } from '../beast-collection-ledger';
import { validateTreasureBook, type TreasureBook } from './match3/treasures';
import type { CultivationSnapshot } from './cultivation-transaction';

/**
 * 共同卡庫上線初期（2026-11-15 00:03–08:16 建立的帳本）沒有存碎片、首戰禮與寶器，
 * 另有只存在舊進度鍵（match3-hard-progress-self-v1）的勝場沒被帶上去。
 * 這裡是「只補一次、只補伺服器從沒存過的欄位」的純函式；不改任何玩法或數值公式。
 */
/** 舊進度認領上限：舊進度鍵只記勝場數，沒有獎卡收據；超過此數視為異常值不收。 */
export const LEGACY_MAX_WINS = 200;
export const LEGACY_CLAIM_ID = 'legacy-claim:orb';
export const LEGACY_BACKFILL_ID = 'legacy-backfill:v1';

export function legacyWinsValue(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > LEGACY_MAX_WINS) throw new Error(`舊進度勝場需為 1 到 ${LEGACY_MAX_WINS} 的整數。`);
  return value as number;
}

/**
 * 一次性的舊進度認領：只適用於「勝場 0、沒有任何寶珠獎卡收據、沒認領過、沒有進行中戰局」的帳本。
 * 只把勝場（關卡）往上補到舊值，不補發任何獎卡、寶器或碎片，所以無法拿來刷獎勵。
 */
export function applyLegacyClaim(current: CultivationSnapshot, wins: unknown): CultivationSnapshot {
  const value = legacyWinsValue(wins);
  const ledger = current.orbLedger ?? { wins: 0, rewards: [], receipts: [] };
  if (current.creditedIds?.includes(LEGACY_CLAIM_ID)) throw new Error('這個卡庫已經認領過一次舊進度。');
  if (ledger.wins !== 0 || ledger.rewards.length || ledger.receipts.length) throw new Error('共同卡庫已有寶珠闖關紀錄，不能再用舊進度覆蓋。');
  if (current.pendingBattle) throw new Error('請先結束進行中的戰鬥，再認領舊進度。');
  return { ...current, orbLedger: { wins: value, rewards: [], receipts: [] }, creditedIds: [...(current.creditedIds ?? []), LEGACY_CLAIM_ID, `${LEGACY_CLAIM_ID}:${value}`] };
}

/** 碎片帳本合理性：剩餘不超過累計；收據未滿 200 筆時累計必須等於收據加總（帳本從 0 開始逐筆入帳）。 */
export function plausibleShardLedger(value: unknown): ShardLedger | null {
  let ledger: ShardLedger;
  try { ledger = parseShardLedger(value); } catch { return null; }
  if (ledger.shards > ledger.totalEarned || ledger.bestStreak < ledger.streak) return null;
  const receipts = Object.values(ledger.receipts);
  if (receipts.length < 200) {
    const sum = receipts.reduce((total, r) => total + (Number.isSafeInteger(r?.gained) && r.gained >= 0 ? r.gained : Number.NaN), 0);
    if (sum !== ledger.totalEarned) return null;
  }
  return ledger;
}

/** 寶器合理性：每個寶器至少對應一筆收據（取得與使用都會留收據）。 */
export function plausibleTreasureBook(value: unknown): TreasureBook | null {
  let book: TreasureBook;
  try { book = validateTreasureBook(value); } catch { return null; }
  const total = Object.values(book.counts).reduce((a, b) => a + b, 0) + Object.values(book.variants ?? {}).reduce((a, b) => a + b, 0);
  return total <= book.receipts.length ? book : null;
}

/**
 * 同步不讓本機變少：伺服器從沒存過的碎片／首戰禮，接受本機值一次並寫回伺服器；
 * 本機也沒有時把欄位設成空值，關閉之後再補的窗口（只補一次）。
 */
export function backfillLegacyCollection(current: CultivationSnapshot, collection: unknown): CultivationSnapshot {
  if (current.creditedIds?.includes(LEGACY_BACKFILL_ID)) return current;
  const local = (collection && typeof collection === 'object' ? collection : {}) as { shards?: unknown; starterPack?: unknown };
  const next: CultivationSnapshot = { ...current, creditedIds: [...(current.creditedIds ?? []), LEGACY_BACKFILL_ID] };
  if (current.shards === undefined) {
    const shards = local.shards === undefined ? null : plausibleShardLedger(local.shards);
    if (shards) next.shards = shards;
  }
  // 首戰禮收據只代表「已經領過」，補上只會擋掉重複領卡，不會多發卡。
  if (current.starterPack === undefined && typeof local.starterPack === 'string' && local.starterPack.length > 0 && local.starterPack.length <= 200) next.starterPack = local.starterPack;
  return next;
}

/** 伺服器從沒存過寶器時，接受本機寶器一次（通過合理性檢查）；本機也沒有就設為空，之後以伺服器為準。 */
export function adoptLegacyTreasures(current: CultivationSnapshot, local: unknown, empty: TreasureBook): CultivationSnapshot {
  if (current.orbTreasures !== undefined) return current;
  return { ...current, orbTreasures: plausibleTreasureBook(local) ?? empty };
}

/** 伺服器帳本勝場未滿 8 時，本機殘留的「已用重選主角」不可能成立；改為未使用，避免整個讀取失敗。 */
export function normalizeHeroChoice<T extends { wins: number; heroChoiceUsed: boolean; heroId: string | null }>(p: T): T {
  return p.heroChoiceUsed && (p.wins < 8 || !p.heroId) ? { ...p, heroChoiceUsed: false } : p;
}

/** 本機寶珠存檔和共同卡庫紀錄對不起來：帶代碼回給畫面，讓客戶自己選，不用看不懂的錯誤。 */
export class CampaignConflict extends Error {
  readonly code = 'ORB_MISMATCH';
  constructor(readonly serverWins: number) { super(`這個瀏覽器的寶珠存檔和共同卡庫的紀錄（已過 ${serverWins} 關）對不起來。`); }
}
