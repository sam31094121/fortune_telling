/**
 * 寶珠端「匯入卡」帳本的資料結構（DESIGN.md v2-3；P0 只有結構與純函式，尚未接 localStorage 或畫面）。
 *
 * - 來源收藏帳本（tdh_beast_collection_v1）完全不改：這裡只接受呼叫端傳進來的 entry 清單（唯讀）。
 * - 只接「押卡贏來的卡」（source==='DUEL_WIN'）與「碎片兌換的卡」（id 以 shard: 開頭）；
 *   新手包 starter:、成長贈卡 growth:、任務領取 reward: 一律不接（待拍板 11 預設）。
 * - 唯一鍵 = "collection:" + 原始 entry id；同一筆重複匯入只算一次（冪等）。
 * - 來源卡之後不見了：還沒用的匯入卡作廢（VOID），已在寶珠端用掉的（USED）加成保留、不追回（待拍板 13 預設）。
 */
import { getCard } from '../registry';

export const IMPORT_LEDGER_KEY = 'match3-imported-cards-v1';
export const IMPORT_KEY_PREFIX = 'collection:';
export type ImportSource = 'DUEL_WIN' | 'SHARD';
export type ImportStatus = 'AVAILABLE' | 'USED' | 'VOID';
/** 與 lib/beast-collection-ledger.ts 的 CollectionEntry 相容的唯讀子集；不 import 它，避免綁住押卡帳本。 */
export interface CollectionEntryView { id: string; cardId: string; source: string }
export interface ImportedCardReceipt { key: string; sourceEntryId: string; cardId: string; source: ImportSource; status: ImportStatus; usedByOperationId?: string }
export interface ImportLedger { version: 1; receipts: ImportedCardReceipt[]; cursor: string[] }

export const emptyImportLedger = (): ImportLedger => ({ version: 1, receipts: [], cursor: [] });
export const importKeyFor = (entryId: string): string => IMPORT_KEY_PREFIX + entryId;

/** 只回傳可接的來源；其他（新手包、成長贈卡、任務領取、碎片本身）回傳 null。 */
export function classifyCollectionEntry(entry: CollectionEntryView): ImportSource | null {
  if (!entry || typeof entry.id !== 'string' || !entry.id || typeof entry.cardId !== 'string') return null;
  if (entry.id.startsWith('shard:')) return 'SHARD';
  if (entry.source === 'DUEL_WIN') return 'DUEL_WIN';
  return null;
}

/** 讀不懂就回 null（呼叫端只停用匯入，不能讓寶珠存檔讀不到）。 */
export function parseImportLedger(raw: string | null): ImportLedger | null {
  if (raw === null) return emptyImportLedger();
  try {
    const v = JSON.parse(raw) as ImportLedger;
    if (!v || v.version !== 1 || !Array.isArray(v.receipts) || !Array.isArray(v.cursor) || v.cursor.some(id => typeof id !== 'string')) return null;
    const keys = new Set<string>();
    for (const r of v.receipts) {
      if (!r || typeof r.sourceEntryId !== 'string' || r.key !== importKeyFor(r.sourceEntryId) || keys.has(r.key) || !getCard(r.cardId) || (r.source !== 'DUEL_WIN' && r.source !== 'SHARD') || !['AVAILABLE', 'USED', 'VOID'].includes(r.status) || (r.status === 'USED') !== (typeof r.usedByOperationId === 'string' && r.usedByOperationId.length > 0)) return null;
      keys.add(r.key);
    }
    return v;
  } catch { return null; }
}

/** 冪等匯入：已有的鍵跳過；游標記錄已處理的 entry id，只處理新增的。不改傳進來的 entries。 */
export function planCollectionImport(ledger: ImportLedger, entries: readonly CollectionEntryView[]): { ledger: ImportLedger; added: ImportedCardReceipt[] } {
  const seen = new Set(ledger.cursor), keys = new Set(ledger.receipts.map(r => r.key));
  const added: ImportedCardReceipt[] = [], cursor = [...ledger.cursor];
  for (const entry of entries) {
    if (!entry || typeof entry.id !== 'string' || seen.has(entry.id)) continue;
    seen.add(entry.id); cursor.push(entry.id);
    const source = classifyCollectionEntry(entry), key = importKeyFor(entry.id);
    if (!source || keys.has(key) || !getCard(entry.cardId)) continue;
    keys.add(key);
    added.push({ key, sourceEntryId: entry.id, cardId: entry.cardId, source, status: 'AVAILABLE' });
  }
  return { ledger: { version: 1, receipts: [...ledger.receipts, ...added], cursor }, added };
}

/** 單一使用權：來源 entry 不在了 → 還沒用的作廢；已用的保留。 */
export function reconcileImportedSources(ledger: ImportLedger, entries: readonly CollectionEntryView[]): ImportLedger {
  const alive = new Set(entries.map(e => e?.id));
  return { ...ledger, receipts: ledger.receipts.map(r => r.status === 'AVAILABLE' && !alive.has(r.sourceEntryId) ? { ...r, status: 'VOID' as const } : r) };
}

/** 寶珠端可當材料／隊伍的匯入卡（只算 AVAILABLE）。 */
export const availableImportedCards = (ledger: ImportLedger): ImportedCardReceipt[] => ledger.receipts.filter(r => r.status === 'AVAILABLE');
