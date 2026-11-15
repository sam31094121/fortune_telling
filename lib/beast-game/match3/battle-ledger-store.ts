/**
 * AUDIT-2 X1–X3｜戰局紀錄的儲存接口（只在伺服端使用）。
 *
 * 為什麼要有這層：A6 的「最新序號」原本存在單一伺服器行程的記憶體。Vercel 這類多執行個體環境裡，
 * 同一位玩家的請求會落在不同執行個體，記憶體不共用 → 正常玩家被判作廢或被擋，舊收據也能在別台重放。
 *
 * 安全預設（這一輪的做法）：
 * ‧ 內建只有「記憶體儲存」（kind: 'memory'），它**不是**共用儲存。
 * ‧ 正式環境（NODE_ENV=production）只有在「已註冊共用儲存＋已設定 ≥32 字元 M3_BATTLE_SECRET」時才啟用戰局紀錄；
 *   否則 battleLedgerReadiness() 回 ok:false，API 回 503 code 'unavailable'，前端自動改走一般模式並照實提示。
 * ‧ 唯一例外：自架、確定只有一個伺服器行程時，可以明確宣告 M3_BATTLE_SINGLE_INSTANCE=1（仍須設金鑰）；
 *   偵測到 Vercel（環境變數 VERCEL）時這個宣告無效。
 * ‧ 開發環境（NODE_ENV 不是 production，例如 next dev、node 測試）允許記憶體儲存，方便本機測試。
 *
 * 共用儲存要做的事（尚未選資料庫，不自己決定；設計見 docs/merge-opt/DESIGN-shared-ledger.md）：
 * 實作 BattleLedgerStore，kind 設為 'shared'，在伺服端啟動時呼叫 setBattleLedgerStore()。
 * put() 必須是原子的「比對後寫入」：只有目前紀錄的 seq 與 status 等於 expect 時才寫入（expect=null 代表必須不存在）。
 */
import type { BattleCore, BattleMeta } from './battle-resume';

export type BattleEntryStatus = 'open' | 'settled' | 'closed';
/** 同一個 actionId 的重送（例如回應在路上遺失）直接回這份結果，不重算、不前進序號（AUDIT-2 H4）。 */
export interface BattleLastAction { requestKey: string; fromSeq: number; response: unknown }
export interface BattleLedgerEntry {
  meta: BattleMeta; core: BattleCore; seq: number; token: string; device: string;
  startAt: number; lastAt: number; status: BattleEntryStatus; last?: BattleLastAction;
}
export interface BattleLedgerStore {
  /** 'shared'＝所有伺服器執行個體看到同一份紀錄（資料庫／Redis）；'memory'＝只在這個行程。 */
  readonly kind: 'memory' | 'shared';
  get(battleId: string): Promise<BattleLedgerEntry | undefined>;
  /** 原子比對後寫入。成功回 true；有人搶先寫入（seq 或 status 不同）回 false。 */
  put(entry: BattleLedgerEntry, expect: { seq: number; status: BattleEntryStatus } | null): Promise<boolean>;
  /** 測試用：清空。 */
  clear?(): Promise<void>;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** 記憶體儲存：只適用開發環境或明確宣告的單一行程。超過上限時先清已結束（結算／關閉）的，再清最久沒動的（AUDIT-2 L2）。 */
export function createMemoryBattleLedgerStore(opts: { max: number; ttlMs: number }): BattleLedgerStore & { size(): number } {
  const map = new Map<string, BattleLedgerEntry>();
  const prune = (now: number) => {
    for (const [id, e] of map) if (now - e.lastAt > opts.ttlMs) map.delete(id);
    if (map.size <= opts.max) return;
    for (const [id, e] of map) { if (map.size <= opts.max) return; if (e.status !== 'open') map.delete(id); }
    const open = [...map.entries()].sort((a, b) => a[1].lastAt - b[1].lastAt);
    for (const [id] of open) { if (map.size <= opts.max) return; map.delete(id); }
  };
  return {
    kind: 'memory',
    size: () => map.size,
    async get(id) { const e = map.get(id); return e ? clone(e) : undefined; },
    async put(entry, expect) {
      // 同步完成比對與寫入（中間沒有 await），在單一 Node 行程內是原子的。
      const cur = map.get(entry.meta.battleId);
      if (expect === null ? !!cur : (!cur || cur.seq !== expect.seq || cur.status !== expect.status)) return false;
      map.set(entry.meta.battleId, clone(entry));
      prune(entry.lastAt);
      return true;
    },
    async clear() { map.clear(); },
  };
}

export type BattleLedgerReadiness =
  | { ok: true; store: BattleLedgerStore; mode: 'shared' | 'dev-memory' | 'single-instance' }
  | { ok: false; reason: 'no-secret' | 'no-shared-store' | 'vercel-memory' };

type G = typeof globalThis & { __m3BattleStore?: BattleLedgerStore };
const g = globalThis as G;
let fallback: (BattleLedgerStore & { size(): number }) | undefined;

/** 伺服端啟動時註冊共用儲存（例如未來的 Supabase／Upstash 轉接器）。傳 undefined 會清除。 */
export function setBattleLedgerStore(store: BattleLedgerStore | undefined) { g.__m3BattleStore = store; }
export function memoryBattleLedgerStore(opts: { max: number; ttlMs: number }) { return (fallback ??= createMemoryBattleLedgerStore(opts)); }

export const secretConfigured = (env: Record<string, string | undefined> = process.env) => typeof env.M3_BATTLE_SECRET === 'string' && env.M3_BATTLE_SECRET.length >= 32;

/** 目前能不能安全地啟用戰局紀錄。不會自己選資料庫；不符合條件就照實回原因。 */
export function battleLedgerReadiness(opts: { max: number; ttlMs: number }, env: Record<string, string | undefined> = process.env): BattleLedgerReadiness {
  const registered = g.__m3BattleStore;
  const production = env.NODE_ENV === 'production';
  if (registered?.kind === 'shared') return secretConfigured(env) || !production ? { ok: true, store: registered, mode: 'shared' } : { ok: false, reason: 'no-secret' };
  if (!production) return { ok: true, store: registered ?? memoryBattleLedgerStore(opts), mode: 'dev-memory' };
  if (env.M3_BATTLE_SINGLE_INSTANCE === '1') {
    if (env.VERCEL) return { ok: false, reason: 'vercel-memory' };
    if (!secretConfigured(env)) return { ok: false, reason: 'no-secret' };
    return { ok: true, store: registered ?? memoryBattleLedgerStore(opts), mode: 'single-instance' };
  }
  return { ok: false, reason: 'no-shared-store' };
}
